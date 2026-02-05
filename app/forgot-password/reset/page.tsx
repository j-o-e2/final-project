"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Lock, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [hasTokenInUrl, setHasTokenInUrl] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!password) {
      setError("Please enter a new password")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      // Try client-side update if we already have a session (set from URL tokens)
      try {
        const sess = await supabase.auth.getSession()
        const hasSession = !!sess?.data?.session?.access_token
        if (hasSession) {
          const { error: clientErr } = await supabase.auth.updateUser({ password })
          if (clientErr) throw clientErr
          setSuccess(true)
          setTimeout(() => router.push("/login"), 1400)
          return
        }
      } catch (clientUpdateErr) {
        // fallthrough to server API
        console.warn('[v0] Client-side password update failed, falling back to server API', clientUpdateErr)
      }

      // Fallback: call server route which will use cookies/session if present
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Failed to reset password")
        setLoading(false)
        return
      }

      setSuccess(true)
      // small delay then redirect to login
      setTimeout(() => router.push("/login"), 1400)
    } catch (err) {
      console.error("Reset password error:", err)
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  useEffect(() => {
    // Parse both search params and hash fragment (Supabase may put tokens in the hash)
    const params: Record<string, string> = {}
    try {
      const search = new URLSearchParams(window.location.search)
      search.forEach((v, k) => (params[k] = v))

      if (window.location.hash && window.location.hash.startsWith("#")) {
        const hash = new URLSearchParams(window.location.hash.substring(1))
        hash.forEach((v, k) => (params[k] = v))
      }
    } catch (err) {
      console.warn('Could not parse URL params for reset page', err)
    }

    async function trySetSession() {
      if (params.access_token) {
        setHasTokenInUrl(true)
        setLoading(true)
        const { data, error } = await supabase.auth.setSession({
          access_token: params.access_token || "",
          refresh_token: params.refresh_token || "",
        })
        setLoading(false)
        if (error) {
          console.error('[v0] reset setSession error:', error.message, error)
          setError(`${error.message} (Token may have expired. Try requesting a new reset link.)`)
          return
        }
        // session set in client; server routes that rely on cookies should now work
      }
  }

    trySetSession()
  }, [])

  return (
    <div className="relative w-full min-h-screen bg-background text-foreground overflow-hidden">
      <div className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex items-center justify-center">
          <div className="w-full max-w-lg">
            <div className="bg-gradient-to-br from-primary via-primary/80 to-accent rounded-3xl p-8 md:p-12 text-primary-foreground shadow-2xl border border-primary/20">
              <div className="mb-6">
                <Link href="/login" className="flex items-center gap-2 text-primary-foreground hover:text-primary/80 mb-4">
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </Link>

                <h1 className="text-3xl md:text-4xl font-bold mb-2">Set a new password</h1>
                <p className="text-sm text-primary-foreground/90">Enter your new password to finish resetting your account.</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">{error}</div>
              )}

              {success ? (
                <div className="mb-4 p-4 bg-white/10 border border-white/20 rounded-lg text-white text-sm">
                  Password updated — redirecting to login...
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-foreground mb-2">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-primary-foreground/80" />
                    <Input
                      type="password"
                      placeholder="New password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      disabled={loading || success}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-foreground mb-2">Confirm password</label>
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    disabled={loading || success}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading || success}>
                  {loading ? "Updating..." : "Reset Password"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-primary-foreground/80">If this page shows a 404 or the reset link didn't work, open the reset link in the same browser and tab where you requested the reset.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
