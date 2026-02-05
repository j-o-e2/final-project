"use client"

import React, { useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Props {
  userId: string
  currentUrl?: string | null
  onUpload?: (url: string) => void
  disabled?: boolean
}

export default function AvatarUploader({ userId, currentUrl, onUpload, disabled }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const uploadFile = async (file: File) => {
    setLoading(true)
    setError(null)
    if (disabled) {
      setError('Uploader disabled: profile not ready')
      setLoading(false)
      return
    }
    if (!userId) {
      setError('User ID not available')
      setLoading(false)
      return
    }
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const newUrl = publicUrlData.publicUrl

      // update profiles table using authenticated user id (guard against mismatched IDs)
      console.log('Avatar uploaded to storage, public url:', newUrl)
      const { data: sessionData } = await supabase.auth.getUser()
      const currentUserId = sessionData?.user?.id || userId

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newUrl })
        .eq('id', currentUserId)

      if (updateError) {
        console.warn('Profile update blocked, attempting server-side upsert fallback', updateError)

        // If RLS blocks the client update, fallback to server-side upsert that uses the service role
        try {
          const res = await fetch('/api/profile/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentUserId, avatar_url: newUrl }),
          })

          if (!res.ok) {
            const text = await res.text()
            throw new Error(`Server upsert failed: ${res.status} ${text}`)
          }
        } catch (fallbackErr: any) {
          throw fallbackErr
        }
      }

      onUpload?.(newUrl)
    } catch (err: any) {
      setError(err?.message || String(err))
      console.error('Avatar upload error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (disabled) return
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    await uploadFile(file)
  }

  const startCamera = async () => {
    if (disabled) {
      setError('Uploader disabled: profile not ready')
      return
    }
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setShowCamera(true)
    } catch (err: any) {
      setError(err?.message || 'Could not access camera')
    }
  }

  const stopCamera = () => {
    setShowCamera(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  const capturePhoto = async () => {
    if (disabled) return
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current || document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.9))
    if (!blob) {
      setError('Could not capture photo')
      return
    }

    const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' })
    await uploadFile(file)
    stopCamera()
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center gap-3">
        <Input type="file" accept="image/*" onChange={handleFileChange} disabled={disabled || loading} />
        <Button onClick={startCamera} disabled={disabled || showCamera || loading}>Take selfie</Button>
        {currentUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="Current avatar" className="w-16 h-16 rounded-full object-cover" />
        )}
      </div>

      {showCamera && (
        <div className="flex flex-col items-center gap-2">
          <video ref={videoRef} autoPlay playsInline className="w-72 h-72 bg-black rounded-md" />
          <div className="flex gap-2">
            <Button onClick={capturePhoto}>Capture</Button>
            <Button variant="outline" onClick={stopCamera}>Close</Button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {loading && <p>Uploading...</p>}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}
