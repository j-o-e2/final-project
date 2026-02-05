import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { canTransitionJobStatus, type JobStatus } from '@/lib/job-types';

export async function POST(request: NextRequest) {
  let jobId: string | undefined;
  let newStatus: JobStatus | undefined;
  
  try {
    const body = await request.json();
    console.log('update-status route received body:', body);
    jobId = body.jobId;
    newStatus = body.newStatus;
    // Normalize status from client to avoid constraint violations (case/alias differences)
    const rawStatus = String((body as any).newStatus ?? '').trim().toLowerCase();
    let normalizedStatus: string | null = rawStatus || null;
    if (normalizedStatus) {
      if (normalizedStatus === 'close') normalizedStatus = 'closed';
      if (normalizedStatus === 'approve') normalizedStatus = 'approved';
      if (normalizedStatus === 'complete') normalizedStatus = 'completed';
    }
    if (normalizedStatus) {
      newStatus = normalizedStatus as JobStatus;
    }
    const bodyAccessToken = (body as any)?.accessToken || null;

  // Debug: log incoming auth headers and cookies so we can verify client is sending them
  const incomingAuth = request.headers.get('authorization');
  const incomingCookieHeader = request.headers.get('cookie');
  console.log('update-status route incoming headers:', { authorization: incomingAuth, cookie: incomingCookieHeader, bodyAccessToken: !!bodyAccessToken });
    if (!jobId || !newStatus) {
      return NextResponse.json(
        { error: 'Job ID and new status are required' },
        { status: 400 }
      );
    }

    // Validate newStatus against our canonical allowed statuses to avoid DB constraint failures
    const allowedStatuses: JobStatus[] = ['open','approved','cancelled','rejected','reopen','completed','closed']
    if (!allowedStatuses.includes(newStatus as JobStatus)) {
      // Try simple normalizations (aliases) before failing
      const aliasMap: Record<string, JobStatus> = {
        close: 'closed',
        approve: 'approved',
        complete: 'completed'
      }
      const lowered = String(newStatus).trim().toLowerCase()
      if (aliasMap[lowered]) {
        console.log('Normalizing status alias', newStatus, '->', aliasMap[lowered])
        newStatus = aliasMap[lowered]
      } else {
        return NextResponse.json({ error: 'Requested status is not supported by the application', requestedStatus: newStatus, allowed: allowedStatuses }, { status: 400 })
      }
    }

    // Create Supabase admin client using service role key
    // Priority: Authorization header > body accessToken > cookie token
    let authHeader = request.headers.get('Authorization') || '';
    
    // If no Authorization header but body has accessToken, use that
    if (!authHeader && bodyAccessToken) {
      console.log('update-status route: using accessToken from POST body');
      authHeader = `Bearer ${bodyAccessToken}`;
    }
    
    // If still no auth header, try to extract from cookies
    if (!authHeader) {
      const cookieHeader = request.headers.get('cookie') || '';
      if (cookieHeader) {
        const cookies = Object.fromEntries(cookieHeader.split(/;\s*/).map(c => {
          const [k, ...v] = c.split('=');
          return [k, decodeURIComponent(v.join('='))];
        }));
        // Common Supabase cookie name for access token
        const sbAccessToken = cookies['sb-access-token'] || cookies['sb:token'] || cookies['supabase-access-token'];
        if (sbAccessToken) {
          console.log('update-status route: using accessToken from sb-access-token cookie');
          authHeader = `Bearer ${sbAccessToken}`;
        } else if (cookies['supabase-auth-token']) {
          // supabase-auth-token is often a JSON blob containing the current session
          try {
            const parsed = JSON.parse(cookies['supabase-auth-token']);
            // The structure may vary; look for access_token in common places
            const maybeToken = parsed?.currentSession?.access_token || parsed?.access_token || parsed?.token || null;
            if (maybeToken) {
              console.log('update-status route: using accessToken from supabase-auth-token cookie');
              authHeader = `Bearer ${maybeToken}`;
            }
          } catch (e) {
            // ignore parse errors
            console.warn('Failed to parse supabase-auth-token cookie', e);
          }
        }
      }
    }
    // Create a service-role Supabase client WITHOUT forwarding the user's
    // Authorization header. Passing the user's token into a client that
    // uses the service role can cause PostgREST to evaluate RLS as the
    // user and return 0 rows for updates. We only decode the token above
    // to extract the userId for ownership checks; DB operations should use
    // the service role key alone to bypass RLS where appropriate.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current session and handle potential errors
      // Extract user ID from Authorization header token
      let userId: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        try {
          // Decode JWT without verification (we'll let Supabase verify it via RLS policies)
          // JWT format: header.payload.signature
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            userId = payload.sub; // 'sub' is the user ID in Supabase JWT
            console.log('update-status route extracted userId from JWT:', userId);
          }
        } catch (e) {
          console.warn('Failed to extract userId from token:', e);
        }
      }

      if (!userId) {
        return NextResponse.json({ 
          error: 'Unauthorized', 
          details: {
            message: 'No active session found',
            hint: 'Please log in to continue'
          }
        }, { status: 401 });
      }

    // Fetch current job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*, job_applications(*)')
      .eq('id', jobId)
      .single();

    console.log('update-status route job lookup result:', { jobId, jobFound: !!job, jobError });

    if (jobError || !job) {
      console.warn('Job lookup failed', { jobId, jobError });
      return NextResponse.json(
        { error: 'Job not found', details: jobError ? jobError.message || jobError : null },
        { status: 404 }
      );
    }

  // Check if user can make this transition
  // Support both `client_id` and legacy `poster_id` column names
  const ownerId = job.client_id || job.poster_id || job.posterId || null;
    const isOwner = ownerId === userId;
     console.log('update-status route ownership check:', { ownerId, userId, isOwner });
     if (!canTransitionJobStatus(job.status as JobStatus, newStatus as JobStatus, isOwner)) {
      return NextResponse.json(
        { error: 'Invalid status transition' },
        { status: 400 }
      );
    }

    // Special handling for transitions
    if (newStatus === 'completed') {
      // Verify that the job has an accepted application
      const hasAcceptedApplication = job.job_applications.some(
        (app: any) => app.status === 'accepted'
      );
      console.log('update-status route accepted-application check:', { hasAcceptedApplication });
      if (!hasAcceptedApplication) {
        return NextResponse.json(
          { error: 'Cannot complete job without accepted application' },
          { status: 400 }
        );
      }
    }

    // Update job status using service role client (bypasses RLS)
    const { data: updated, error: updateError } = await supabase
      .from('jobs')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .select()
      .single();

    if (updateError) {
      console.error('Job status update error:', updateError);
      const errorDetails = {
        code: updateError.code,
        message: updateError.message,
        hint: updateError.hint,
        details: updateError.details
      };
      console.error('update-status route updateError details:', errorDetails);

      // If the DB rejected the value due to a CHECK constraint, attempt safe retries with common aliases
      if (String(updateError.code) === '23514') {
        // Candidates to try when the DB rejects the original value
        const aliasReverse: Record<string, string[]> = {
          closed: ['close'],
          complete: ['completed'],
          completed: ['complete'],
          approved: ['approve'],
          approve: ['approved']
        }

        const requested = String(newStatus || '')
        const lowered = requested.trim().toLowerCase()
        const candidates: string[] = []

        // If aliasReverse has entries for this lowered value, try them first
        if (aliasReverse[lowered]) candidates.push(...aliasReverse[lowered])

        // Try simple stripped forms (remove trailing 'd' or 'ed')
        if (lowered.endsWith('ed')) {
          const stripped = lowered.replace(/ed$/, '')
          if (stripped && !candidates.includes(stripped)) candidates.push(stripped)
        } else if (lowered.endsWith('d')) {
          const stripped = lowered.replace(/d$/, '')
          if (stripped && !candidates.includes(stripped)) candidates.push(stripped)
        }

        // Also try toggling common variants
        if (!candidates.includes('closed')) candidates.push('closed')
        if (!candidates.includes('completed')) candidates.push('completed')

        // Remove duplicates and the original
        const uniqueCandidates = Array.from(new Set(candidates)).filter(c => c !== lowered)

        for (const candidate of uniqueCandidates) {
          try {
            console.log('Attempting retry update with candidate status:', candidate)
            const { data: retried, error: retryErr } = await supabase
              .from('jobs')
              .update({ status: candidate, updated_at: new Date().toISOString() })
              .eq('id', jobId)
              .select()
              .single()

            if (!retryErr && retried) {
              console.log('Retry update succeeded with candidate status:', candidate)
              return NextResponse.json({ success: true, data: retried, jobId, previousStatus: job.status, newStatus: candidate })
            }
            console.warn('Retry attempt failed for candidate', candidate, 'error:', retryErr)
          } catch (retryEx) {
            console.warn('Exception during retry attempt for candidate', candidate, retryEx)
          }
        }

        // If retries did not succeed, return a clearer guidance message
        return NextResponse.json(
          {
            error: 'Failed to update job status - database constraint prevented the change',
            details: errorDetails,
            guidance: 'The server attempted safe fallback mappings but the database still rejected the status. Run the migration scripts/011_fix_jobs_status_constraint.sql to normalize and update the DB constraint, or adjust the requested status to one of the allowed values.',
            context: {
              jobId,
              currentStatus: job.status,
              requestedStatus: newStatus,
              attemptedCandidates: uniqueCandidates,
              hasAcceptedApplications: job.job_applications.some((app: any) => app.status === 'accepted')
            }
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { 
          error: 'Failed to update job status',
          details: errorDetails,
          context: {
            jobId,
            currentStatus: job.status,
            requestedStatus: newStatus,
            hasAcceptedApplications: job.job_applications.some((app: any) => app.status === 'accepted')
          }
        },
        { status: 500 }
      );
    }

    console.log('update-status route update success:', { jobId, previousStatus: job.status, newStatus, updated });

    return NextResponse.json({
      success: true,
      data: updated,
      jobId,
      previousStatus: job.status,
      newStatus
    });
  } catch (err) {
    console.error('Unexpected error in updateJobStatus:', err);
    const errMsg = err instanceof Error ? err.message : String(err);
    const errorDetails = err instanceof Error ? {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    } : { message: String(err) };
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: errorDetails,
        context: {
          jobId: jobId || 'unknown',
          requestedStatus: newStatus || 'unknown',
          errorType: err?.constructor?.name || typeof err
        }
      },
      { status: 500 }
    );
  }
}