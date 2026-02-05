// app/api/payments/charge-job-approval/route.ts
// Called when a job application is approved (status changed to 'accepted')
// Charges 10% of job budget from the client

import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createPaymentRecord, canAffordFee, deductFeeFromWallet } from '@/lib/payment-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { jobId, clientId } = body;

    console.log('[DEBUG charge-job-approval] Request body:', { jobId, clientId });

    if (!jobId || !clientId) {
      return NextResponse.json({ error: 'jobId and clientId are required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, budget, poster_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', { jobId, jobError });
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const jobBudget = parseFloat(String(job.budget));
    const feeAmount = parseFloat((jobBudget * 0.1).toFixed(2)); // 10% fee

    console.log('[DEBUG charge-job-approval] Job budget and fee:', { jobBudget, feeAmount });

    // Check if client can afford the fee
    const canAfford = await canAffordFee(clientId, feeAmount);
    if (!canAfford) {
      console.warn('Client cannot afford fee:', { clientId, feeAmount });
      return NextResponse.json(
        { error: 'Insufficient balance to approve job', required: feeAmount },
        { status: 402 }
      );
    }

    // Create payment record
    const paymentResult = await createPaymentRecord(
      clientId,
      'job_approval_fee',
      jobBudget,
      {
        fee_percentage: 10,
        related_job_id: jobId,
        notes: `Job approval fee for job ${jobId}`
      }
    );

    if (!paymentResult.success) {
      console.error('Failed to create payment record:', paymentResult.error);
      return NextResponse.json({ error: 'Failed to create payment record', details: paymentResult.error }, { status: 500 });
    }

    // Deduct fee from client's wallet
    const deductResult = await deductFeeFromWallet(clientId, feeAmount);
    if (!deductResult.success) {
      console.error('Failed to deduct fee:', deductResult.error);
      return NextResponse.json({ error: 'Failed to process fee deduction', details: deductResult.error }, { status: 500 });
    }

    console.log('[DEBUG charge-job-approval] Fee successfully deducted:', { clientId, feeAmount, paymentId: paymentResult.paymentId });

    // If an applicationId was provided, reveal client contact for that application
    const applicationId = (body as any)?.applicationId || null;
    try {
      if (applicationId) {
        const { data: updatedApp, error: appError } = await supabase
          .from('job_applications')
          .update({ client_contact_revealed: true, updated_at: new Date().toISOString() })
          .eq('id', applicationId)
          .select()
          .single();

        if (appError) {
          console.warn('Failed to set client_contact_revealed on application:', appError);
        } else {
          console.log('Marked application client_contact_revealed = true', { applicationId });
        }
      }
    } catch (e) {
      console.warn('Exception while marking application reveal flag:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Job approval fee deducted successfully',
      paymentId: paymentResult.paymentId,
      feeDeducted: feeAmount
    });
  } catch (err) {
    console.error('Unexpected error in charge-job-approval:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}
