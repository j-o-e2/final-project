import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Review type used across the app
export interface Review {
  id: string
  job_id?: string | null
  booking_id?: string | null
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment?: string | null
  created_at: string
  reviewer?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  reviewee?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

/**
 * Fetch reviews from Supabase (client-side). Returns [] on error.
 */
export async function fetchReviews(params: { jobId?: string; bookingId?: string; userId?: string }): Promise<Review[]> {
  try {
    const supabase = createClientComponentClient()

    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviewer_id ( id, full_name, avatar_url ),
        reviewee:profiles!reviewee_id ( id, full_name, avatar_url )
      `)
      .order('created_at', { ascending: false })

    if (params.jobId) query = query.eq('job_id', params.jobId)
    if (params.bookingId) query = query.eq('booking_id', params.bookingId)
    if (params.userId) query = query.or(`reviewer_id.eq.${params.userId},reviewee_id.eq.${params.userId}`)

    const { data, error } = await query

    if (error) {
      console.error('fetchReviews supabase error:', error)
      return []
    }

    return (data || []) as Review[]
  } catch (err) {
    console.error('fetchReviews unexpected error:', err)
    return []
  }
}

/**
 * Submit a review as the currently authenticated user. Returns the created review or null.
 */
export async function submitReview(params: {
  revieweeId: string
  jobId?: string
  bookingId?: string
  rating: number
  comment?: string
}): Promise<Review | null> {
  try {
    const supabase = createClientComponentClient()

    // basic validation
    if (!params.revieweeId) {
      console.error('submitReview: missing revieweeId')
      return null
    }
    if (typeof params.rating !== 'number' || params.rating < 1 || params.rating > 5) {
      console.error('submitReview: rating must be 1-5')
      return null
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('submitReview auth error:', userError)
      return null
    }
    if (!user) {
      console.error('submitReview: no authenticated user')
      return null
    }

    // Prevent duplicates by checking existing review
    const dupMatch: Record<string, any> = { reviewer_id: user.id, reviewee_id: params.revieweeId }
    if (params.jobId) dupMatch.job_id = params.jobId
    if (params.bookingId) dupMatch.booking_id = params.bookingId

    const { data: existing } = await supabase.from('reviews').select('id').match(dupMatch).single()
    if (existing) {
      console.warn('submitReview: duplicate review detected')
      return null
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert([
        {
          reviewer_id: user.id,
          reviewee_id: params.revieweeId,
          job_id: params.jobId || null,
          booking_id: params.bookingId || null,
          rating: params.rating,
          comment: params.comment || null,
        },
      ])
      .select(`
        *,
        reviewer:profiles!reviewer_id ( id, full_name, avatar_url ),
        reviewee:profiles!reviewee_id ( id, full_name, avatar_url )
      `)
      .single()

    if (error) {
      console.error('submitReview supabase insert error:', error)
      return null
    }

    return (data as Review) || null
  } catch (err) {
    console.error('submitReview unexpected error:', err)
    return null
  }
}

/**
 * Send a phone OTP via Supabase Auth (SMS).
 * Returns { success: true } on success or { success: false, error }
 */
export async function sendPhoneOtp(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClientComponentClient()

    if (!phone) return { success: false, error: 'Phone is required' }

    const { data, error } = await supabase.auth.signInWithOtp({ phone })

    if (error) {
      console.error('sendPhoneOtp error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('sendPhoneOtp unexpected error:', err)
    return { success: false, error: err?.message || String(err) }
  }
}

/**
 * Verify a phone OTP and mark the current user's profile as phone_verified = true.
 * Expects the phone string and the token entered by the user.
 */
export async function verifyPhoneOtp(phone: string, token: string): Promise<{ success: boolean; error?: string }>{
  try {
    if (!phone || !token) return { success: false, error: 'Phone and token are required' }

    // Call the server endpoint to verify and update profile
    const res = await fetch('/api/auth/verify-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, token }),
    })

    if (!res.ok) {
      const error = await res.json()
      console.error('verifyPhoneOtp error:', error)
      return { success: false, error: error.error || 'Failed to verify phone' }
    }

    return { success: true }
  } catch (err: any) {
    console.error('verifyPhoneOtp unexpected error:', err)
    return { success: false, error: err?.message || String(err) }
  }
}
