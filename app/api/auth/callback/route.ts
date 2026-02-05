import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")
    const access_token = requestUrl.searchParams.get("access_token")
    const refresh_token = requestUrl.searchParams.get("refresh_token")
    const error = requestUrl.searchParams.get("error")
    const error_description = requestUrl.searchParams.get("error_description")

    console.log('[v0] auth/callback:', { 
      code: !!code,
      access_token: !!access_token,
      refresh_token: !!refresh_token,
      error, 
      error_description,
      requestUrl: requestUrl.toString()
    })

    // If there's an error from Supabase, redirect to error page
    if (error || error_description) {
      const errorMsg = error_description || error || "Unknown error"
      console.error('[v0] auth/callback error from Supabase:', errorMsg)
      return NextResponse.redirect(
        new URL(
          `/signup-success?error=${encodeURIComponent(errorMsg)}`,
          requestUrl.origin,
        ),
      )
    }

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
              // Handle cookie setting errors silently
            }
          },
        },
      },
    )

    // Flow 1: Handle direct token flow (Supabase email templates send access_token + refresh_token)
    if (access_token && refresh_token) {
      console.log('[v0] auth/callback: handling direct token flow (from email confirmation)')
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      })

      if (sessionError) {
        console.error('[v0] auth/callback setSession error:', sessionError.message, sessionError)
        const redirectUrl = `/signup-success?error=${encodeURIComponent(sessionError.message)}&expired=true&timestamp=${Date.now()}`
        return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin))
      }

      // Attempt to create a profiles row using the service role so RLS doesn't block.
      try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.warn('[v0] No SUPABASE_SERVICE_ROLE_KEY; skipping profile creation')
        } else {
          const { data: userData } = await supabase.auth.getUser();
          const user = userData?.user;
          if (user) {
            const { createClient } = await import('@supabase/supabase-js')
            const serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

            const meta: any = user.user_metadata || {}
            const profileRow = {
              id: user.id,
              email: user.email,
              full_name: meta.full_name || meta.name || null,
              phone: meta.phone || null,
              role: meta.role || 'client',
              profile_tier: (meta.profile_tier as any) || 'basic',
              badge_verified: (meta.badge_verified as any) || false,
              created_at: new Date().toISOString(),
            }

            // Use upsert to avoid duplicate-key errors if trigger already created a profile
            const { error: profileErr } = await serviceClient.from('profiles').upsert([profileRow], { onConflict: 'id' })
            if (profileErr) console.error('[v0] Failed to upsert profile on callback (token flow):', profileErr)
            else console.log('[v0] Profile upserted on callback (token flow) for', user.email)
          }
        }
      } catch (e) {
        console.error('[v0] Error creating profile in callback (token flow):', e)
      }

      console.log('[v0] auth/callback: session set successfully via token flow')
      return NextResponse.redirect(new URL("/signup-success?verified=true", requestUrl.origin))
    }

    // Flow 2: Handle PKCE code flow
    if (code) {
      console.log('[v0] auth/callback: attempting to exchange code for session (PKCE flow)')
      const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[v0] auth/callback exchangeCodeForSession error:', exchangeError.message, exchangeError)
        const errorMsg = exchangeError.message?.toLowerCase() || ''
        const isExpired = errorMsg.includes('expired') || 
                          errorMsg.includes('invalid') || 
                          errorMsg.includes('used') ||
                          errorMsg.includes('invalid_grant')
        
        const errorDetails = {
          message: exchangeError.message,
          isExpired,
          timestamp: new Date().toISOString(),
          code: exchangeError.name || 'unknown'
        }
        
        console.error('[v0] auth/callback exchange error details:', errorDetails)
        
        const redirectUrl = `/signup-success?error=${encodeURIComponent(exchangeError.message)}&expired=${isExpired ? 'true' : 'false'}&timestamp=${Date.now()}`
        return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin))
      }

      console.log('[v0] auth/callback: session exchanged successfully for user:', data?.user?.email)
      // After exchanging code for session, attempt to create profile using service role
      try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.warn('[v0] No SUPABASE_SERVICE_ROLE_KEY; skipping profile creation')
        } else if (data?.user) {
          const { createClient } = await import('@supabase/supabase-js')
          const serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
          const user = data.user
          const meta: any = user.user_metadata || {}
          const profileRow = {
            id: user.id,
            email: user.email,
            full_name: meta.full_name || meta.name || null,
            phone: meta.phone || null,
            role: meta.role || 'client',
            profile_tier: (meta.profile_tier as any) || 'basic',
            badge_verified: (meta.badge_verified as any) || false,
            created_at: new Date().toISOString(),
          }

          const { error: profileErr } = await serviceClient.from('profiles').upsert([profileRow], { onConflict: 'id' })
          if (profileErr) console.error('[v0] Failed to upsert profile on callback (code flow):', profileErr)
          else console.log('[v0] Profile upserted on callback (code flow) for', user.email)
        }
      } catch (e) {
        console.error('[v0] Error creating profile in callback (code flow):', e)
      }

      return NextResponse.redirect(new URL("/signup-success?verified=true", requestUrl.origin))
    }

    // No valid auth params provided
    console.warn('[v0] auth/callback: no code or tokens provided')
    return NextResponse.redirect(new URL("/signup-success", requestUrl.origin))
  } catch (err: any) {
    console.error("[v0] auth/callback error:", err?.message, err)
    return NextResponse.redirect(
      new URL(
        `/signup-success?error=${encodeURIComponent("An unexpected error occurred: " + (err?.message || "Unknown"))}`,
        new URL(request.url).origin,
      ),
    )
  }
}
