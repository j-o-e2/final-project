-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  required_skills TEXT[] NOT NULL,
  budget NUMERIC NOT NULL,
  budget_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' or 'hourly'
  location TEXT NOT NULL,
  duration TEXT, -- 'one-time', 'short-term', 'long-term'
  -- Allowed statuses: open (default), approved, cancelled, rejected, reopen, completed, closed
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved','cancelled','rejected','reopen','completed','closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cover_letter TEXT,
  proposed_rate NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'withdrawn'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, provider_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_poster_id ON jobs(poster_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_provider_id ON job_applications(provider_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);

-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs table
CREATE POLICY "Anyone can view open jobs" ON jobs
  FOR SELECT USING (status = 'open' OR auth.uid() = poster_id);

CREATE POLICY "Users can create jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = poster_id);

CREATE POLICY "Job posters can update their jobs" ON jobs
  FOR UPDATE USING (auth.uid() = poster_id);

CREATE POLICY "Job posters can delete their jobs" ON jobs
  FOR DELETE USING (auth.uid() = poster_id);

-- RLS Policies for job_applications table
CREATE POLICY "Users can view their own job_applications" ON job_applications
  FOR SELECT USING (auth.uid() = provider_id OR auth.uid() IN (
    SELECT poster_id FROM jobs WHERE id = job_id
  ));

CREATE POLICY "Providers can apply for jobs" ON job_applications
  FOR INSERT WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update their job_applications" ON job_applications
  FOR UPDATE USING (auth.uid() = provider_id);

CREATE POLICY "Providers can delete their job_applications" ON job_applications
  FOR DELETE USING (auth.uid() = provider_id);
