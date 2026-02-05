"use client"

import { useState, useRef } from "react"
import { useRouter } from 'next/navigation'
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { X, Upload, ChevronRight, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Avatar from '@/components/Avatar'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: any
  onSave: (updatedProfile: any) => void
  backButtonClass?: string
}

// Tier progression requirements
const TIER_PROGRESSION = {
  basic: {
    name: "Basic",
    icon: "🔷",
    requirements: [
      { text: "Complete 5 successful jobs/bookings", completed: false },
      { text: "Receive at least 1 positive review", completed: false },
      { text: "Maintain 4.0+ star rating", completed: false },
    ],
    nextTier: "verified",
    nextTierName: "Verified"
  },
  verified: {
    name: "Verified",
    icon: "🔶",
    requirements: [
      { text: "Complete 15+ successful jobs/bookings", completed: false },
      { text: "Maintain 4.2+ star rating", completed: false },
      { text: "Respond to inquiries within 24 hours", completed: false },
    ],
    nextTier: "trusted",
    nextTierName: "Trusted"
  },
  trusted: {
    name: "Trusted",
    icon: "🟠",
    requirements: [
      { text: "Complete 25+ successful jobs/bookings", completed: false },
      { text: "Maintain 4.5+ star rating", completed: false },
      { text: "Demonstrate excellence and expertise", completed: false },
    ],
    nextTier: "elite",
    nextTierName: "Elite"
  },
  elite: {
    name: "Elite",
    icon: "⭐",
    requirements: [
      { text: "Complete 50+ successful jobs/bookings", completed: false },
      { text: "Maintain 4.7+ star rating", completed: false },
      { text: "Build strong client relationships and reputation", completed: false },
    ],
    nextTier: "pro",
    nextTierName: "Pro"
  },
  pro: {
    name: "Pro",
    icon: "💎",
    requirements: [
      { text: "Achieve Elite tier status", completed: false },
      { text: "Subscribe to Pro membership (paid tier)", completed: false },
    ],
    nextTier: null,
    nextTierName: null
  }
}

export default function EditProfileModal({ isOpen, onClose, profile, onSave, backButtonClass }: EditProfileModalProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    location: profile?.location || "",
    avatar_url: profile?.avatar_url || "",
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>(profile?.avatar_url || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null

    try {
      const fileExtension = avatarFile.name.split('.').pop()
      const fileName = `${userId}/avatar.${fileExtension}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName)

      const publicUrl = data?.publicUrl

      // Verify the public URL is reachable. If not, request a signed URL from the server.
      if (publicUrl) {
        try {
          const head = await fetch(publicUrl, { method: 'HEAD' })
          if (head.ok) {
            return publicUrl
          }
        } catch (e) {
          // HEAD failed (CORS/private bucket); fall through to signed URL
        }
      }

      // Request a short-lived signed URL from our server endpoint as a fallback
      try {
        const resp = await fetch(`/api/debug/avatar-url?file=${encodeURIComponent(fileName)}`, { credentials: 'include' })
        if (resp.ok) {
          const body = await resp.json()
          if (body?.signedUrl) return body.signedUrl
        }
      } catch (e) {
        // ignore and return publicUrl if present
      }

      return publicUrl || null
    } catch (err: any) {
      console.error("Avatar upload error:", err)
      throw new Error("Failed to upload avatar: " + (err.message || "Unknown error"))
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError("")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // First, prepare the data to update
      const updateData = { ...formData }

      // If avatar file exists, upload it first
      if (avatarFile) {
        try {
          const avatarUrl = await uploadAvatar(user.id)
          if (avatarUrl) {
            updateData.avatar_url = avatarUrl
          }
        } catch (avatarErr) {
          console.error("Avatar upload failed:", avatarErr)
          // Continue with profile update even if avatar fails
          setError("Profile updated but avatar upload failed. Try again.")
        }
      }

      // Update profile with new data
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      onSave(data)
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
      console.error("Profile update error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const currentTier = (profile?.profile_tier || 'basic') as keyof typeof TIER_PROGRESSION
  const tierData = TIER_PROGRESSION[currentTier]
  const isProfileComplete = formData.full_name?.trim() && formData.phone?.trim() && formData.location?.trim() && avatarPreview

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 sm:p-6">
      <Card className="w-full max-w-lg p-4 sm:p-6 relative my-4 mx-2 sm:my-8 sm:mx-0 max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <button
            onClick={() => {
              try {
                if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
                  router.back()
                } else {
                  onClose()
                }
              } catch (err) {
                onClose()
              }
            }}
            aria-label="Go back"
            className={`${backButtonClass ?? 'text-muted-foreground hover:text-foreground'} flex items-center gap-2`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Back</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label="Close edit profile"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Left side: Profile Edit Form */}
          <div className="space-y-4 overflow-x-hidden">
            {/* Avatar Upload Section */}
            <div className="flex flex-col items-center gap-4 pb-4 border-b w-full">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-muted overflow-hidden border-2 border-dashed border-muted-foreground/30 flex-shrink-0">
                <Avatar
                  src={avatarPreview}
                  alt={formData.full_name || 'Avatar preview'}
                  size={96}
                  tier={(profile?.profile_tier as any) || 'basic'}
                  showBadge={false}
                />
                {!avatarPreview && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-center flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs sm:text-sm"
                >
                  Choose Photo
                </Button>
                {avatarPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAvatarPreview("")
                      setAvatarFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                    className="text-xs sm:text-sm"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                aria-label="Upload profile photo"
                className="block w-full text-xs sm:text-sm text-foreground file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground cursor-pointer"
              />
              {avatarFile && (
                <p className="text-xs text-muted-foreground mt-2 text-center break-words">Selected: {avatarFile.name}</p>
              )}
              <p className="text-xs text-muted-foreground text-center">JPG, PNG or GIF (max 5MB)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <Input
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <Input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Your location"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Right side: Tier Progression Guide - Now visible on all screens */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/20 rounded-lg p-4 sm:p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">{tierData.icon}</span>
              Your Tier: {tierData.name}
            </h3>

            {/* Current Tier Info */}
            <div className="bg-primary/20 border border-primary/30 rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">
                {tierData.name === "Pro" 
                  ? "🏆 Congratulations! You've reached the Pro tier!"
                  : `Upgrade to ${tierData.nextTierName} by completing these requirements:`}
              </p>
            </div>

            {/* Requirements List with Progress */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Requirements to upgrade</p>
              {tierData.requirements.map((req, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded bg-background/40">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-muted-foreground">•</span>
                  </div>
                  <p className="text-sm text-foreground">{req.text}</p>
                </div>
              ))}
            </div>

            {/* Tier Progression Visual */}
            <div className="border-t border-primary/20 pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Tier Progression Path</p>
              <div className="space-y-2">
                {Object.entries(TIER_PROGRESSION).map(([tier, data], idx) => (
                  <div key={tier} className="flex items-center gap-3 p-2 rounded transition-colors hover:bg-background/40">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold ${
                      tier === currentTier 
                        ? 'bg-primary text-primary-foreground border-2 border-primary'
                        : ['basic', 'verified', 'trusted', 'elite'].includes(tier) && Object.keys(TIER_PROGRESSION).indexOf(tier) < Object.keys(TIER_PROGRESSION).indexOf(currentTier)
                        ? 'bg-green-500/30 border border-green-500/50 text-green-600'
                        : 'bg-muted/30 border border-muted/50 text-muted-foreground'
                    }`}>
                      {tier === currentTier ? '⊙' : data.icon[0]}
                    </div>
                    <span className={`text-sm flex-1 font-medium ${tier === currentTier ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {data.name}
                    </span>
                    {tier === currentTier && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded font-semibold">CURRENT</span>}
                    {['basic', 'verified', 'trusted', 'elite'].includes(tier) && Object.keys(TIER_PROGRESSION).indexOf(tier) < Object.keys(TIER_PROGRESSION).indexOf(currentTier) && (
                      <span className="text-xs text-green-500 font-semibold">✓ ACHIEVED</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Completion Helper */}
            {(currentTier === 'basic' || currentTier === 'verified') && (
              <div className="pt-4 border-t border-primary/20">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Profile Completion Status</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded bg-background/40">
                    <div className={`w-4 h-4 rounded-full ${formData.full_name?.trim() ? 'bg-green-500' : 'bg-red-500/30'}`}></div>
                    <span className="text-sm text-foreground">Full Name</span>
                    {formData.full_name?.trim() && <span className="text-xs text-green-500 ml-auto">✓</span>}
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-background/40">
                    <div className={`w-4 h-4 rounded-full ${formData.phone?.trim() ? 'bg-green-500' : 'bg-red-500/30'}`}></div>
                    <span className="text-sm text-foreground">Phone Number</span>
                    {formData.phone?.trim() && <span className="text-xs text-green-500 ml-auto">✓</span>}
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-background/40">
                    <div className={`w-4 h-4 rounded-full ${formData.location?.trim() ? 'bg-green-500' : 'bg-red-500/30'}`}></div>
                    <span className="text-sm text-foreground">Location</span>
                    {formData.location?.trim() && <span className="text-xs text-green-500 ml-auto">✓</span>}
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-background/40">
                    <div className={`w-4 h-4 rounded-full ${avatarPreview ? 'bg-green-500' : 'bg-red-500/30'}`}></div>
                    <span className="text-sm text-foreground">Profile Photo</span>
                    {avatarPreview && <span className="text-xs text-green-500 ml-auto">✓</span>}
                  </div>
                  <div className="mt-3 p-2 rounded bg-primary/10 border border-primary/20">
                    <p className="text-xs text-foreground text-center font-medium">
                      {isProfileComplete ? '✓ Profile Complete!' : `${[formData.full_name?.trim(), formData.phone?.trim(), formData.location?.trim(), avatarPreview].filter(Boolean).length}/4 fields filled`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
