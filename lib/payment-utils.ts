// lib/payment-utils.ts - Helper functions for payment operations

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface PaymentRecord {
  user_id: string;
  transaction_type: 'job_approval_fee' | 'service_posting_fee' | 'refund';
  related_job_id?: string | null;
  related_service_id?: string | null;
  related_booking_id?: string | null;
  amount_original: number;
  fee_percentage?: number;
  payment_status?: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: string;
  notes?: string;
}

// Calculate 10% fee on an amount
export const calculateFee = (amount: number, feePercentage: number = 10): number => {
  return parseFloat(((amount * feePercentage) / 100).toFixed(2));
};

// Record a pending external payment (e.g., MPesa STK push) so we can match callbacks
export const recordExternalPaymentPending = async (
  userId: string,
  transactionType: PaymentRecord['transaction_type'],
  amountOriginal: number,
  options?: Partial<PaymentRecord> & { external_reference?: string }
): Promise<{ success: boolean; paymentId?: string; error?: string }> => {
  try {
    const feePercentage = options?.fee_percentage || 0
    const feeAmount = calculateFee(amountOriginal, feePercentage)

    const { data, error } = await supabase
      .from('payments')
      .insert([{
        user_id: userId,
        transaction_type: transactionType,
        amount_original: amountOriginal,
        fee_percentage: feePercentage || null,
        fee_amount: feeAmount,
        payment_status: 'pending',
        payment_method: 'mpesa_stk',
        related_job_id: options?.related_job_id || null,
        related_service_id: options?.related_service_id || null,
        related_booking_id: options?.related_booking_id || null,
        external_reference: options?.external_reference || null,
        notes: options?.notes || null
      }])
      .select()
      .single()

    if (error) {
      console.error('Failed to create external payment record:', error)
      return { success: false, error: error.message }
    }

    return { success: true, paymentId: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Error creating external payment record:', message)
    return { success: false, error: message }
  }
}

// Create a payment record for a fee
export const createPaymentRecord = async (
  userId: string,
  transactionType: PaymentRecord['transaction_type'],
  amountOriginal: number,
  options?: Partial<PaymentRecord>
): Promise<{ success: boolean; paymentId?: string; error?: string }> => {
  try {
    const feePercentage = options?.fee_percentage || 10;
    const feeAmount = calculateFee(amountOriginal, feePercentage);

    const { data, error } = await supabase
      .from('payments')
      .insert([{
        user_id: userId,
        transaction_type: transactionType,
        amount_original: amountOriginal,
        fee_percentage: feePercentage,
        fee_amount: feeAmount,
        payment_status: 'pending',
        related_job_id: options?.related_job_id || null,
        related_service_id: options?.related_service_id || null,
        related_booking_id: options?.related_booking_id || null,
        payment_method: options?.payment_method || 'wallet',
        notes: options?.notes || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Failed to create payment record:', error);
      return { success: false, error: error.message };
    }

    return { success: true, paymentId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error creating payment record:', message);
    return { success: false, error: message };
  }
};

// Update payment status (e.g., pending -> completed)
export const updatePaymentStatus = async (
  paymentId: string,
  status: 'completed' | 'failed' | 'refunded'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('payments')
      .update({ payment_status: status, updated_at: new Date().toISOString(), processed_at: new Date().toISOString() })
      .eq('id', paymentId);

    if (error) {
      console.error('Failed to update payment status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error updating payment status:', message);
    return { success: false, error: message };
  }
};

// Get user's wallet or create one
export const getOrCreateUserWallet = async (userId: string): Promise<{ success: boolean; balance?: number; error?: string }> => {
  try {
    // Try to get existing wallet
    const { data: wallet, error: getError } = await supabase
      .from('user_wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (getError) {
      console.error('Error fetching wallet:', getError);
      return { success: false, error: getError.message };
    }

    if (wallet) {
      return { success: true, balance: wallet.balance };
    }

    // Create new wallet if doesn't exist
    const { data: newWallet, error: createError } = await supabase
      .from('user_wallets')
      .insert([{ user_id: userId, balance: 0, total_paid: 0, total_earned: 0 }])
      .select('balance')
      .single();

    if (createError) {
      console.error('Error creating wallet:', createError);
      return { success: false, error: createError.message };
    }

    return { success: true, balance: newWallet?.balance || 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error in getOrCreateUserWallet:', message);
    return { success: false, error: message };
  }
};

// Check if user can afford a fee (has sufficient wallet balance)
export const canAffordFee = async (userId: string, feeAmount: number): Promise<boolean> => {
  const result = await getOrCreateUserWallet(userId);
  if (!result.success || result.balance === undefined) return false;
  return result.balance >= feeAmount;
};

// Deduct fee from user's wallet
export const deductFeeFromWallet = async (userId: string, feeAmount: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('user_wallets')
      .update({
        balance: supabase.rpc === undefined ? 0 : (undefined as any), // Use RPC or manual update
        total_paid: supabase.rpc === undefined ? 0 : (undefined as any),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    // Better approach: use raw SQL or a function. For now, fetch and update
    const { data: wallet } = await supabase
      .from('user_wallets')
      .select('balance, total_paid')
      .eq('user_id', userId)
      .single();

    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }
    const newBalance = wallet.balance - feeAmount;
    if (newBalance < 0) {
      return { success: false, error: 'Insufficient balance' };
    }

    const { error: updateError } = await supabase
      .from('user_wallets')
      .update({
        balance: newBalance,
        total_paid: wallet.total_paid + feeAmount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error deducting fee:', message);
    return { success: false, error: message };
  }
};
