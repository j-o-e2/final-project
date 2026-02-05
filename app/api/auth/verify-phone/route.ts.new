import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { phone, email, token } = await request.json()

    if ((!phone && !email) || !token) {
      return NextResponse.json(
        { error: 'Email or phone and token are required' },
        { status: 400 }
      )
    }

    // Get authenticated user
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
              // Ignore
            }
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the OTP using service role client
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    )
    // Determine flow: email verification or phone OTP
    let verifyResult: any = { error: null, data: null }
    if (email) {
      // Email verification (signup confirmation)
      verifyResult = await (serviceClient.auth as any).verifyOtp({
        email,
        token,
        type: 'signup',
      })
    } else {
      // Phone OTP
      verifyResult = await (serviceClient.auth as any).verifyOtp({
        phone,
        token,
        type: 'sms',
      })
    }
    if (verifyResult.error) {
      console.error('Verification error:', verifyResult.error)
      return NextResponse.json(
        { error: verifyResult.error.message },
        { status: 400 }
      )
    }

    // Mark the appropriate profile flag as verified using service role client (bypasses RLS)
    const updatePayload: Record<string, any> = {}
    if (email) updatePayload.email_verified = true
    if (phone) updatePayload.phone_verified = true

    const { error: updateError } = await serviceClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Return success
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error in verify-phone:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const phone = url.searchParams.get('phone')
    const email = url.searchParams.get('email')
    const token = url.searchParams.get('token')

    if ((!phone && !email) || !token) {
      return NextResponse.json(
        { error: 'Email or phone and token are required' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    )


    // Verify the OTP and obtain the user (verifyOtp may sign the user in)
    let verifyResult: any = { data: null, error: null }
    if (email) {
      verifyResult = await (serviceClient.auth as any).verifyOtp({
        email,
        token,
        type: 'signup',
      })
    } else {
      verifyResult = await (serviceClient.auth as any).verifyOtp({
        phone,
        token,
        type: 'sms',
      })
    }

    if (verifyResult.error) {
      console.error('Verification (link) error:', verifyResult.error)
      const failureUrl = new URL('/signup?verified=false', request.url)
      return NextResponse.redirect(failureUrl)
    }

    const userId = verifyResult?.data?.user?.id
    if (!userId) {
      console.error('Verification succeeded but no user returned')
      const failureUrl = new URL('/signup?verified=false', request.url)
      return NextResponse.redirect(failureUrl)
    }

    // Mark phone as verified using service role client (bypasses RLS)
    const updatePayload: Record<string, any> = {}
    if (email) updatePayload.email_verified = true
    if (phone) updatePayload.phone_verified = true

    const { error: updateError } = await serviceClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)

    if (updateError) {
      console.error('Profile update error (link):', updateError)
      const failureUrl = new URL('/signup?verified=false', request.url)
      return NextResponse.redirect(failureUrl)
    }

    // Redirect to a success page (adjust path as needed)
    const successUrl = new URL('/signup-success', request.url)
    return NextResponse.redirect(successUrl)
  } catch (err) {
    console.error('Unexpected error in verify-phone GET:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
