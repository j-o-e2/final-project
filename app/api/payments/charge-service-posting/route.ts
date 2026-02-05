// app/api/payments/charge-service-posting/route.ts
// Called when a worker posts a new service
// Charges 10% of service price from the worker

import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createPaymentRecord, canAffordFee, deductFeeFromWallet } from '@/lib/payment-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { serviceId, workerId, servicePrice } = body;

    console.log('[DEBUG charge-service-posting] Request body:', { serviceId, workerId, servicePrice });

    if (!serviceId || !workerId || !servicePrice) {
      return NextResponse.json({ error: 'serviceId, workerId, and servicePrice are required' }, { status: 400 });
    }

    const price = parseFloat(String(servicePrice));
    const feeAmount = parseFloat((price * 0.1).toFixed(2)); // 10% fee

    console.log('[DEBUG charge-service-posting] Service price and fee:', { price, feeAmount });

    // Check if worker can afford the fee
    const canAfford = await canAffordFee(workerId, feeAmount);
    if (!canAfford) {
      console.warn('Worker cannot afford service posting fee:', { workerId, feeAmount });
      return NextResponse.json(
        { error: 'Insufficient balance to post service', required: feeAmount },
        { status: 402 }
      );
    }

    // Create payment record
    const paymentResult = await createPaymentRecord(
      workerId,
      'service_posting_fee',
      price,
      {
        fee_percentage: 10,
        related_service_id: serviceId,
        notes: `Service posting fee for service ${serviceId}`
      }
    );

    if (!paymentResult.success) {
      console.error('Failed to create payment record:', paymentResult.error);
      return NextResponse.json({ error: 'Failed to create payment record', details: paymentResult.error }, { status: 500 });
    }

    // Deduct fee from worker's wallet
    const deductResult = await deductFeeFromWallet(workerId, feeAmount);
    if (!deductResult.success) {
      console.error('Failed to deduct fee:', deductResult.error);
      return NextResponse.json({ error: 'Failed to process fee deduction', details: deductResult.error }, { status: 500 });
    }

    console.log('[DEBUG charge-service-posting] Fee successfully deducted:', { workerId, feeAmount, paymentId: paymentResult.paymentId });

    return NextResponse.json({
      success: true,
      message: 'Service posting fee deducted successfully',
      paymentId: paymentResult.paymentId,
      feeDeducted: feeAmount
    });
  } catch (err) {
    console.error('Unexpected error in charge-service-posting:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}
