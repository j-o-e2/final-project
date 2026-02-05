"use client"

import React, { useEffect, useState } from 'react'
import { TierBadge } from './TierBadge'

interface AvatarProps {
  src?: string | null
  alt?: string
  size?: number
  tier?: 'basic' | 'verified' | 'trusted' | 'elite' | 'pro'
  className?: string
  showBadge?: boolean
}

export default function Avatar({ src, alt = 'avatar', size = 48, tier = 'basic', className = '', showBadge = true }: AvatarProps) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src || undefined)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setCurrentSrc(src || undefined)
    setErrored(false)
  }, [src])

  const handleError = async () => {
    if (!src || errored) return
    setErrored(true)

    try {
      // Try to extract file path if this is a Supabase public URL
      const encoded = encodeURIComponent(src)
      const resp = await fetch(`/api/debug/avatar-url?url=${encoded}`, { credentials: 'include' })
      if (resp.ok) {
        const body = await resp.json()
        if (body?.signedUrl) {
          setCurrentSrc(body.signedUrl)
          setErrored(false)
          return
        }
      }
    } catch (e) {
      // ignore
    }

    // final fallback: clear src so UI will show initials
    setCurrentSrc(undefined)
  }

  const initials = alt?.split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase() || '?'

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full overflow-hidden bg-muted ${className}`} style={{ width: size, height: size }}>
      {currentSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentSrc} alt={alt} className="w-full h-full object-cover" onError={handleError} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground font-semibold">{initials}</div>
      )}
      {showBadge && (
        <div style={{ position: 'absolute', right: -6, bottom: -6 }}>
          <TierBadge tier={tier} size="sm" showLabel={false} className="scale-75" />
        </div>
      )}
    </div>
  )
}
