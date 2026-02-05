import { createServerClient } from "@supabase/ssr"
import { createPaymentRecord, canAffordFee, deductFeeFromWallet } from '@/lib/payment-utils'
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === "function") params = await params
    const id = params?.id
    const cookieStore = await cookies()
    // Pass Next's cookie store directly (cast to any) so the expected
    // cookie methods shape matches the supabase helper's types.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: cookieStore as any },
    )

    // Service-role client for server-side reads/writes (bypass RLS for these checks)
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: (_cookies: any) => {} } as any }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Parse body early so we can use accessToken fallback if cookies are missing
    const body = await request.json().catch(() => ({}))

    let authUser = user || null
    // Fallback: if no session-based user, try to extract from Authorization header (Bearer token)
    if (!authUser) {
      const incomingAuth = request.headers.get('authorization') || ''
      let token = incomingAuth.startsWith('Bearer ') ? incomingAuth.substring(7) : null
      // Fallback: client may send accessToken in request body
      if (!token && (body as any)?.accessToken) token = (body as any).accessToken
      if (token) {
        try {
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
            if (payload?.sub) {
              authUser = { id: payload.sub } as any
              console.log('PATCH /api/job-applications/: extracted user from token', (authUser as any).id)
            }
          }
        } catch (e) {
          console.warn('Failed to decode token in job-application PATCH fallback:', e)
        }
      }
    }

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

  // body already parsed above

    // Verify application ownership or job ownership (defensive)
    const { data: application, error: fetchError } = await serviceClient
      .from("job_applications")
      .select("provider_id, job_id")
      .eq("id", id)
      .limit(1)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    // Check if user is the provider or the job poster
    let isAuthorized = application.provider_id === authUser.id

    if (!isAuthorized) {
      const { data: job, error: jobError } = await serviceClient
        .from("jobs")
        .select("client_id")
        .eq("id", application.job_id)
        .limit(1)
        .maybeSingle()

      if (jobError) throw jobError

      isAuthorized = job?.client_id === authUser.id
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // First verify the application exists and get its current status using the service client
    const { data : currentApp, error: checkError } = await serviceClient
      .from("job_applications")
      .select("status")
      .eq("id", id)
      .single()

    if (checkError) {
      console.error("Error checking current application:", checkError)
      return NextResponse.json({ 
        error: "Failed to verify application status",
        details: checkError.message
      }, { status: 500 })
    }

    if (!currentApp) {
      return NextResponse.json({ 
        error: "Application no longer exists",
        details: "The application may have been deleted"
      }, { status: 404 })
    }

    if (currentApp.status === 'accepted') {
      return NextResponse.json({ 
        error: "Application already accepted",
        details: "This application has already been approved"
      }, { status: 400 })
    }

    // Validate requested status if present and only allow permitted columns
    const allowedStatuses = ["pending", "accepted", "rejected", "withdrawn"]
    if ((body as any)?.status !== undefined && !allowedStatuses.includes((body as any).status)) {
      return NextResponse.json({ error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` }, { status: 400 })
    }

    // Strip any client-only fields (like accessToken) and only allow permitted columns
    const allowed = ["status"]
    const updatePayload: Record<string, any> = {}
    for (const k of allowed) {
      if ((body as any)?.[k] !== undefined) updatePayload[k] = (body as any)[k]
    }
    updatePayload.updated_at = new Date().toISOString()

    console.log('PATCH /api/job-applications/: updating', { id, authUser: authUser?.id, updatePayload })

    const { data, error } = await serviceClient
      .from("job_applications")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      console.error("Error updating application:", error)
      return NextResponse.json({ 
        error: "Failed to update application",
        details: error.message
      }, { status: 500 })
    }

    if (!data) {
      console.error('Update returned no data for application', { id })
      return NextResponse.json({ 
        error: "Update failed",
        details: "No data returned after update"
      }, { status: 500 })
    }

    console.log('Updated application:', { id, data })

    // If the application was just accepted, attempt to charge the client a 10% approval fee
    const newStatus = updatePayload.status
    if (newStatus === 'accepted') {
      try {
        // Find job to get budget and client id
        const { data: jobRow, error: jobFetchErr } = await serviceClient
          .from('jobs')
          .select('id, budget, client_id, poster_id')
          .eq('id', data.job_id)
          .limit(1)
          .maybeSingle()

        if (jobFetchErr || !jobRow) {
          console.warn('Could not fetch job for payment charging:', jobFetchErr)
        } else {
          const clientId = jobRow.client_id || jobRow.poster_id
          if (!clientId) {
            console.warn('No client id found on job row; cannot charge approval fee')
          } else {
            const jobBudget = parseFloat(String(jobRow.budget || 0))
            const feeAmount = parseFloat((jobBudget * 0.1).toFixed(2))

            // Ensure client can afford fee
            const canAfford = await canAffordFee(clientId, feeAmount)
            if (!canAfford) {
              // revert application status to previous state and return error
              await serviceClient.from('job_applications').update({ status: 'pending' }).eq('id', id)
              return NextResponse.json({ error: 'Client has insufficient balance to pay approval fee', required: feeAmount }, { status: 402 })
            }

            // Create payment record
            const paymentResult = await createPaymentRecord(clientId, 'job_approval_fee', jobBudget, { fee_percentage: 10, related_job_id: jobRow.id, notes: `Approval fee for job ${jobRow.id}` })
            if (!paymentResult.success) {
              console.error('Failed to create payment record during acceptance flow:', paymentResult.error)
              // revert
              await serviceClient.from('job_applications').update({ status: 'pending' }).eq('id', id)
              return NextResponse.json({ error: 'Failed to create payment record', details: paymentResult.error }, { status: 500 })
            }

            // Deduct fee
            const deductResult = await deductFeeFromWallet(clientId, feeAmount)
            if (!deductResult.success) {
              console.error('Failed to deduct fee during acceptance flow:', deductResult.error)
              // revert
              await serviceClient.from('job_applications').update({ status: 'pending' }).eq('id', id)
              return NextResponse.json({ error: 'Failed to process fee deduction', details: deductResult.error }, { status: 500 })
            }

            // Mark application reveal flag so the worker can see client details
            await serviceClient.from('job_applications').update({ client_contact_revealed: true }).eq('id', id)
          }
        }
      } catch (e) {
        console.error('Error while processing approval payment flow:', e)
      }
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error updating application:", error)
    return NextResponse.json({ 
      error: "Failed to update application", 
      details: error?.message || "Unknown error"
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === "function") params = await params
    const id = params?.id
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // Handle cookie setting errors
            }
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify application ownership: allow provider OR the job poster to archive
    const { data: application, error: fetchError } = await supabase
      .from("job_applications")
      .select("provider_id, job_id")
      .eq("id", id)
      .limit(1)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    let isAuthorized = application.provider_id === user.id
    if (!isAuthorized) {
      // Check if the requesting user is the job poster
      const { data: jobRow, error: jobErr } = await supabase
        .from('jobs')
        .select('client_id')
        .eq('id', application.job_id)
        .limit(1)
        .maybeSingle()

      if (jobErr) throw jobErr
      isAuthorized = jobRow?.client_id === user.id
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Soft-archive the application (keep reviews intact)
    const { data: archivedApp, error: archiveErr } = await supabase
      .from('job_applications')
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (archiveErr) {
      console.error('Error archiving application:', archiveErr)
      return NextResponse.json({ error: 'Failed to archive application', details: archiveErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, archived: archivedApp })
  } catch (error) {
    console.error("Error deleting application:", error)
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 })
  }
}
