export type JobStatus = 'open' | 'approved' | 'cancelled' | 'rejected' | 'reopen' | 'completed' | 'closed';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';
export type BookingStatus = 'pending' | 'approved' | 'completed' | 'cancelled' | 'rejected';

export interface Job {
  id: string
  title: string
  location: string
  budget: number
  duration: string
  category: string
  client_id?: string
  status: JobStatus
}

export interface JobApplication {
  id: string
  job_id: string
  provider_id: string
  proposed_rate: number
  status: ApplicationStatus
  jobs?: Job
  created_at?: string
}

// Helper functions for status transitions
export const canMarkJobCompleted = (jobStatus: JobStatus, applicationStatus: ApplicationStatus): boolean => {
  return jobStatus === 'open' && applicationStatus === 'accepted';
};

export const canMarkJobApproved = (jobStatus: JobStatus): boolean => {
  return jobStatus === 'open';
};

export const canReviewJob = (jobStatus: JobStatus, applicationStatus: ApplicationStatus): boolean => {
  return jobStatus === 'completed' && applicationStatus === 'accepted';
};

export const getJobStatusColor = (status: JobStatus): { bg: string; text: string } => {
  switch (status) {
    case 'open':
      return { bg: 'bg-green-500/20', text: 'text-green-400' };
    case 'approved':
      return { bg: 'bg-blue-500/20', text: 'text-blue-400' };
    case 'rejected':
      return { bg: 'bg-red-500/20', text: 'text-red-400' };
    case 'completed':
      return { bg: 'bg-purple-500/20', text: 'text-purple-400' };
    case 'closed':
      return { bg: 'bg-gray-500/20', text: 'text-gray-400' };
    case 'cancelled':
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-400' };
    case 'reopen':
      return { bg: 'bg-cyan-500/20', text: 'text-cyan-400' };
    default:
      return { bg: 'bg-gray-500/20', text: 'text-gray-400' };
  }
};

// Status flow utilities
export const getNextJobStatus = (currentStatus: JobStatus): JobStatus | null => {
  switch (currentStatus) {
    case 'open':
      return 'approved'; // When approved
    case 'approved':
      return 'completed'; // When marked complete
    case 'closed':
      return 'reopen'; // Can reopen
    default:
      return null; // No next status for completed/rejected/cancelled
  }
};

export const canTransitionJobStatus = (
  from: JobStatus,
  to: JobStatus,
  isOwner: boolean = false
): boolean => {
  // Specific rules for job status transitions
  if (from === 'open') {
    // Allow marking a job completed directly from 'open' when appropriate (e.g. worker marks complete after accepted application)
    return ['approved', 'completed', 'closed', 'cancelled', 'rejected'].includes(to);
  }
  if (from === 'approved') {
    return ['completed', 'cancelled', 'rejected'].includes(to);
  }
  if (from === 'completed') {
    return false; // No transitions from completed
  }
  if (from === 'closed' && isOwner) {
    return ['reopen', 'open'].includes(to); // Can reopen or go back to open
  }
  if (from === 'cancelled') {
    return false; // No transitions from cancelled
  }
  if (from === 'rejected') {
    return false; // No transitions from rejected
  }
  if (from === 'reopen') {
    return ['open', 'approved', 'completed'].includes(to);
  }
  return false;
};