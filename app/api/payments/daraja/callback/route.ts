import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { parseDarajaCallback, isStkParsed } from '@/lib/daraja'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    console.log('Daraja callback received', { body })

    if (!body) return NextResponse.json({ error: 'Empty body' }, { status: 400 })

    // parse the common stkCallback shape
    const parsed = parseDarajaCallback(body)
    console.log('Parsed Daraja callback:', parsed)

    // Create a service-role supabase client to update payments and wallets
    const cookieStore = await cookies()
    const service = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: (_: any) => {} } as any }
    )

    // If this is an STK callback
    if (isStkParsed(parsed)) {
      const r = parsed as any
      const resultCode = Number(r.resultCode)
      const callbackMeta = r.metadata

      // Find the payment record that references this checkoutRequestID or merchantRequestID if present
      const checkoutId = r.raw?.CheckoutRequestID || null
      const merchantId = r.raw?.MerchantRequestID || null

      let paymentQuery = service.from('payments').select('*')
      if (checkoutId) paymentQuery = paymentQuery.eq('external_reference', checkoutId)
      else if (merchantId) paymentQuery = paymentQuery.eq('external_reference', merchantId)
      else {
        // No reference provided; optionally clients should include an invoice id in AccountReference and we can match
        console.warn('Daraja callback missing a matching external reference to payments')
      }

      const { data: payments, error: payErr } = await paymentQuery.limit(1).maybeSingle()
      if (payErr) console.error('Error querying payments for daraja callback:', payErr)

      if (!payments) {
        console.warn('No payment row found matching daraja callback reference', { checkoutId, merchantId })
      }

      if (resultCode === 0) {
        // Successful payment
        // Update payment status to completed and store raw callback
        if (payments?.id) {
          await service.from('payments').update({ payment_status: 'completed', processed_at: new Date().toISOString(), raw_callback: body }).eq('id', payments.id)

          // If payment type is wallet_topup, credit user's wallet
          if (payments.transaction_type === 'wallet_topup') {
            const userId = payments.user_id
            const amount = Number(payments.amount_original || 0)
            // Safely increase wallet balance
            const { data: wallet } = await service.from('user_wallets').select('balance, total_paid').eq('user_id', userId).maybeSingle()
            if (wallet) {
              const newBalance = Number(wallet.balance || 0) + amount
              const newTotalPaid = Number(wallet.total_paid || 0) + amount
              await service.from('user_wallets').update({ balance: newBalance, total_paid: newTotalPaid, updated_at: new Date().toISOString() }).eq('user_id', userId)
            } else {
              // Create wallet if missing
              await service.from('user_wallets').insert([{ user_id: payments.user_id, balance: amount, total_paid: amount, total_earned: 0 }])
            }
          }

          // Additional business rules could be added here: e.g., if this payment was a job_approval_fee that was initiated as external, take further actions.
        }

        return NextResponse.json({ success: true })
      }

      // Non-zero result code = failure/ cancellation
      if (payments?.id) {
        await service.from('payments').update({ payment_status: 'failed', processed_at: new Date().toISOString(), raw_callback: body }).eq('id', payments.id)
      }

      return NextResponse.json({ success: false, resultCode: r.resultCode })
    }

    // If we get here, unrecognized callback
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error handling daraja callback:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
