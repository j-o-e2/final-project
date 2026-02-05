"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, User, Mail, Phone, MapPin } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import AvatarUploader from "@/components/ui/avatar-uploader"
import EditProfileModal from "@/components/EditProfileModal"
import { uploadAndSaveAvatar } from "@/lib/avatarUpload"
import { TierCard } from "@/components/TierBadge"

interface Profile {
  id?: string
  full_name: string
  email: string
  phone: string
  location: string
  avatar_url?: string | null
  profile_tier?: string
  badge_verified?: boolean
  avg_rating?: number
  total_reviews?: number
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile>({
    full_name: "John Doe",
    email: "john@example.com",
    phone: "+254 712 345 678",
    location: "Nairobi",
    avatar_url: null,
  })

  const [editing, setEditing] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    // If the page is opened with ?edit=1 or ?edit=true, open edit mode
    try {
      const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const editParam = sp?.get("edit")
      if (editParam === "1" || editParam === "true") {
        setEditing(true)
      }
    } catch (e) {
      // ignore in environments where navigation isn't available
    }

    async function loadProfile() {
      setLoading(true)
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!user) throw new Error("You must be logged in to view your profile.")

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single<Profile>()

        if (profileError) throw profileError
        if (profileData) setProfile(profileData)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    })
  }

  const handleSave = async () => {
    try {
      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update(profile)
        .eq("id", profile.id)
        .select()
        .single()

      if (updateError) throw updateError
      if (updated) setProfile(updated)
      alert("Profile updated successfully!")
      setEditing(false)
    } catch (err: any) {
      alert("Error updating profile: " + err.message)
    }
  }

  // Avatar upload is handled by the AvatarUploader component below.

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        alert('Error deleting account: ' + (data.error || 'Unknown error'))
        setDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      // Redirect to home after successful deletion
      alert('Your account has been permanently deleted.')
      window.location.href = '/'
    } catch (err: any) {
      alert('Error deleting account: ' + err.message)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Quick direct upload handler (uses lib/avatarUpload helper)
  async function handleQuickFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadAndSaveAvatar(file)
    if (!result.success) {
      console.error(result.error)
      alert('Avatar upload failed: ' + (result.error || 'Unknown'))
      return
    }

    // Refresh profile after upload
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData) setProfile(profileData)
    } catch (err) {
      // ignore
    }
  }

  if (loading) return <p>Loading profile...</p>
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        </div>
      </header>

      {/* Profile */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary/50 shadow-md">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary flex items-center justify-center">
                  <User className="w-12 h-12 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{profile.full_name}</h2>
              <p className="text-muted-foreground">Member since 2024</p>
            </div>
            <div className="ml-4 flex flex-col items-start gap-2">
              <button
                onClick={() => setEditModalOpen(true)}
                className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-primary-foreground font-medium"
              >
                Edit Profile
              </button>
              {!profile.id && (
                <p className="text-xs text-muted-foreground mt-1">Profile editing available after profile loads</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
              <Input type="text" name="full_name" value={profile.full_name} onChange={handleChange} disabled={!editing} />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  disabled={!editing}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  disabled={!editing}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  name="location"
                  value={profile.location}
                  onChange={handleChange}
                  disabled={!editing}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              {editing ? (
                <>
                  <Button onClick={handleSave} className="flex-1">
                    Save Changes
                  </Button>
                  <Button onClick={() => setEditing(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setEditing(true)} className="flex-1">
                    Edit Profile
                  </Button>
                  <Button onClick={() => setShowDeleteConfirm(true)} variant="destructive" className="flex-1">
                    Delete Account
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
        <EditProfileModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          profile={profile}
          onSave={(updated) => setProfile(updated)}
        />

        {/* Tier Card Section */}
        {profile.profile_tier && (
          <div className="mt-8">
            <TierCard
              tier={profile.profile_tier as "basic" | "verified" | "trusted" | "elite" | "pro"}
              avgRating={profile.avg_rating || 0}
              totalReviews={profile.total_reviews || 0}
              badgeVerified={profile.badge_verified || false}
              fullName={profile.full_name}
              email={profile.email}
            />
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-md mx-4 border-destructive/50">
              <h2 className="text-2xl font-bold text-destructive mb-2">⚠️ Delete Account Permanently</h2>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
                <p className="text-foreground font-semibold mb-2">This action is IRREVERSIBLE!</p>
                <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                  <li>Your account will be permanently deleted</li>
                  <li>All your data will be erased</li>
                  <li>You cannot recover this account</li>
                  <li>This cannot be undone</li>
                </ul>
              </div>
              <p className="text-muted-foreground text-sm mb-6">
                Are you absolutely sure you want to proceed? Type your email to confirm deletion.
              </p>
              <div className="mb-6">
                <Input
                  type="text"
                  placeholder={`Type your email to confirm`}
                  disabled={deleting}
                  className="w-full"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  variant="destructive"
                  className="flex-1"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </section>
    </div>
  )
}
