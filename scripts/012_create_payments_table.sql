-- Create payments table to track all fees and transactions
-- Fees: 10% on job approvals, 10% on service postings

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'job_approval_fee', 'service_posting_fee', 'refund', etc.
  related_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  related_service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  related_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount_original NUMERIC NOT NULL, -- Original amount (job budget, service price)
  fee_percentage NUMERIC NOT NULL DEFAULT 10, -- Fee percentage (typically 10)
  fee_amount NUMERIC NOT NULL, -- Calculated fee (amount_original * fee_percentage / 100)
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT, -- 'mpesa', 'card', 'wallet', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_type ON payments(transaction_type);
CREATE INDEX IF NOT EXISTS idx_payments_related_job_id ON payments(related_job_id);
CREATE INDEX IF NOT EXISTS idx_payments_related_service_id ON payments(related_service_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments table
-- Users can view their own payments
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Only service-role can insert/update payments (prevent direct user manipulation)
CREATE POLICY "Only service role can manage payments" ON payments
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Only service role can update payments" ON payments
  FOR UPDATE USING (false);

-- Add a wallet/balance table to track user account balances (optional but useful)
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);

ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_wallets
CREATE POLICY "Users can view their own wallet" ON user_wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only service role can update wallets" ON user_wallets
  FOR UPDATE USING (false);
