import { createClient } from './supabaseClient.js'

// Example helper to upload an avatar to Supabase Storage and save its public URL to the user's profile.
// Usage (client-side):
// const result = await uploadAndSaveAvatar(file)
// returns { success: true } or { success: false, error }

export async function uploadAndSaveAvatar(file: File) {
  try {
    const supabase = createClient()

    // Ensure user is authenticated
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) {
      return { success: false, error: 'Not authenticated' }
    }

    const userId = userData.user.id
    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || 'png'
    const path = `avatars/${userId}/${userId}-${timestamp}.${ext}`

    // Upload to 'avatars' bucket. Make sure you create this bucket in Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = publicUrlData.publicUrl

    // Save to profile via server-side route
    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: publicUrl }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { success: false, error: body.error || 'Failed to save avatar URL' }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
