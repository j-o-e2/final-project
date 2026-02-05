import type { JobStatus } from './job-types';
import { supabase } from './supabaseClient';

/**
 * Updates a job's status via the server endpoint
 */
interface JobStatusResponse {
  success: boolean;
  error?: string;
  details?: any;
  data?: any;
  isAuthError?: boolean;
  hint?: string;
}

export async function updateJobStatus(
  jobId: string,
  newStatus: JobStatus
): Promise<JobStatusResponse> {
  try {
    // Try to include an Authorization header using the client's current access token
    let authHeader: string | undefined = undefined;
    let accessToken: string | undefined = undefined;

    // 1) Preferred: use supabase SDK to get current session
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = (session as any)?.access_token || (session as any)?.accessToken || null;
      if (token) {
        authHeader = `Bearer ${token}`;
        accessToken = token;
      }
    } catch (e) {
      console.warn('Could not read client session via supabase.auth.getSession()', e);
    }

    // 2) Fallbacks: try common localStorage keys where Supabase stores session data
    if (!accessToken && typeof window !== 'undefined') {
      try {
        const candidates = [
          'supabase.auth.token',
          'supabase.auth.session',
          'supabase.auth',
          'supabase-session',
          'sb:token',
          'sb-access-token',
          'supabase-auth-token'
        ];
        for (const key of candidates) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            const maybeToken = parsed?.currentSession?.access_token || parsed?.access_token || parsed?.accessToken || parsed?.accessToken?.token || null;
            if (maybeToken) {
              accessToken = maybeToken;
              authHeader = `Bearer ${accessToken}`;
              break;
            }
          } catch (e) {
            // if not JSON, it might be the raw token string
            if (raw && raw.length > 10) {
              accessToken = raw;
              authHeader = `Bearer ${accessToken}`;
              break;
            }
          }
        }
      } catch (e) {
        // ignore localStorage errors
        console.warn('Error reading localStorage fallbacks for supabase token', e);
      }
    }

    const res = await fetch('/api/jobs/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ 
        jobId, 
        newStatus,
        ...(accessToken ? { accessToken } : {}), // Include token in body as fallback
      }),
      credentials: 'include', // Send session cookies with request
    });

    if (!res.ok) {
      // Read response as text first
      const rawText = await res.text();

      // Try to parse as JSON if possible
      let errorBody: any = null;
      try {
        errorBody = JSON.parse(rawText);
      } catch (e) {
        errorBody = null;
      }

      // Build diagnostic info
      const diagnostic: Record<string, any> = {};
      try {
        diagnostic.status = res.status;
        diagnostic.statusText = res.statusText;
        diagnostic.headers = Object.fromEntries(res.headers.entries());
        diagnostic.rawText = rawText;
        diagnostic.parsedBody = errorBody;
      } catch (e) {
        diagnostic.error = e instanceof Error ? e.message : String(e);
      }

      // Log diagnostic info
      try {
        console.error('updateJobStatus error:', JSON.stringify(diagnostic, null, 2));
      } catch (e) {
        console.error('updateJobStatus error (failed to stringify):', e, diagnostic);
      }

      // Extract error message
      let rawMessage = errorBody?.details?.message ||
                       errorBody?.error ||
                       errorBody?.message ||
                       `Failed to update job status (HTTP ${res.status})`;

      // Friendly error mappings
      const normalized = (rawMessage || '').toString();
      let friendly = normalized;
      if (/cannot complete job without accepted application/i.test(normalized)) {
        friendly = 'Cannot complete job: Accept an application first.';
      } else if (/invalid status transition/i.test(normalized)) {
        friendly = 'Invalid status transition for this job.';
      } else if (/unauthorized|authentication failed|no active session/i.test(normalized)) {
        friendly = 'Authentication required. Please log in again.';
      }

      const isAuthError = res.status === 401 || /unauthor/i.test(normalized) || /session/i.test(normalized);

      return {
        success: false,
        error: friendly || rawMessage,
        details: errorBody?.details || diagnostic,
        data: errorBody,
        isAuthError,
      };
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    return { success: true, data };
  } catch (err: any) {
    console.error('updateJobStatus unexpected error:', err);
    return { success: false, error: err?.message || String(err) };
  }
}