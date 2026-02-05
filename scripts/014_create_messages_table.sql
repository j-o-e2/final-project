-- 014_create_messages_table.sql
-- Create messages table for chat between client and worker/provider
-- Supports both job-based and booking-based conversations

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  job_application_id UUID REFERENCES job_applications(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure at least one context is provided (job or booking)
  CHECK (
    (job_id IS NOT NULL AND job_application_id IS NOT NULL) OR 
    (booking_id IS NOT NULL)
  )
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON messages(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_job_application_id ON messages(job_application_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages table
-- Users can view messages if they are sender, recipient, or involved in the job/booking
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR
    -- For job messages: client (who posted job) or worker (who applied)
    (
      job_id IS NOT NULL AND (
        auth.uid() IN (SELECT client_id FROM jobs WHERE id = job_id) OR
        auth.uid() IN (SELECT provider_id FROM job_applications WHERE id = job_application_id)
      )
    ) OR
    -- For booking messages: client or service provider
    (
      booking_id IS NOT NULL AND (
        auth.uid() IN (SELECT client_id FROM bookings WHERE id = booking_id) OR
        auth.uid() IN (SELECT provider_id FROM services WHERE id IN (
          SELECT service_id FROM bookings WHERE id = booking_id
        ))
      )
    )
  );

-- Users can insert messages if they are the sender and involved in the context
CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      -- For job messages
      (
        job_id IS NOT NULL AND job_application_id IS NOT NULL AND (
          auth.uid() IN (SELECT client_id FROM jobs WHERE id = job_id) OR
          auth.uid() IN (SELECT provider_id FROM job_applications WHERE id = job_application_id)
        )
      ) OR
      -- For booking messages
      (
        booking_id IS NOT NULL AND (
          auth.uid() IN (SELECT client_id FROM bookings WHERE id = booking_id) OR
          auth.uid() IN (SELECT provider_id FROM services WHERE id IN (
            SELECT service_id FROM bookings WHERE id = booking_id
          ))
        )
      )
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);
