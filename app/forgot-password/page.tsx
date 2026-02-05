"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Mail, ArrowLeft, Lock } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [mode, setMode] = useState<"options" | "email" | "direct">("options")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  // Check if user is already logged in
  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(!!data?.session)
    }
    checkSession()
  }, [])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to send reset email")
        setLoading(false)
        return
      }

      setSuccess(true)
      setEmail("")
      console.log("[v0] Password reset email sent:", data)
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("[v0] Forgot password error:", err)
      setLoading(false)
    }
  }

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

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
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setPassword("")
      setConfirm("")
      setTimeout(() => {
        setMode("options")
      }, 2000)
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("[v0] Direct password change error:", err)
      setLoading(false)
    }
  }

  const handleSubmit = mode === "email" ? handleEmailSubmit : handleDirectSubmit

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/login" className="flex items-center gap-2 text-primary hover:text-primary/80 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <Card className="p-8">
          {/* MODE: OPTIONS */}
          {mode === "options" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Reset Password</h1>
                <p className="text-muted-foreground">Choose how you'd like to reset your password</p>
              </div>

              <div className="space-y-4">
                {/* Email Reset Option */}
                <button
                  onClick={() => {
                    setMode("email")
                    setError("")
                    setSuccess(false)
                  }}
                  className="w-full p-4 border-2 border-primary/20 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <Mail className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold text-foreground">Send Reset Link</h3>
                      <p className="text-sm text-muted-foreground">We'll send you an email with a password reset link</p>
                    </div>
                  </div>
                </button>

                {/* Direct Password Change Option (if logged in) */}
                {isLoggedIn && (
                  <button
                    onClick={() => {
                      setMode("direct")
                      setError("")
                      setSuccess(false)
                    }}
                    className="w-full p-4 border-2 border-primary/20 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="flex items-start gap-3">
                      <Lock className="w-6 h-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold text-foreground">Change Password Now</h3>
                        <p className="text-sm text-muted-foreground">Set a new password immediately</p>
                      </div>
                    </div>
                  </button>
                )}

                {!isLoggedIn && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 You can also change your password directly if you're logged in
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  Remember your password?{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* MODE: EMAIL RESET */}
          {mode === "email" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Reset Password</h1>
                <p className="text-muted-foreground">Enter your email address and we'll send you a password reset link</p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Password reset email sent successfully! Check your email for the reset link.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>

              <button
                onClick={() => {
                  setMode("options")
                  setError("")
                  setEmail("")
                }}
                className="w-full mt-4 text-primary hover:text-primary/80 text-sm font-medium"
              >
                ← Back to options
              </button>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  Remember your password?{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* MODE: DIRECT PASSWORD CHANGE */}
          {mode === "direct" && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Change Password</h1>
                <p className="text-muted-foreground">Set a new password for your account</p>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Password changed successfully!
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading || success}>
                  {loading ? "Updating..." : "Change Password"}
                </Button>
              </form>

              <button
                onClick={() => {
                  setMode("options")
                  setError("")
                  setPassword("")
                  setConfirm("")
                }}
                className="w-full mt-4 text-primary hover:text-primary/80 text-sm font-medium"
                disabled={loading}
              >
                ← Back to options
              </button>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground">
                  Don't want to change it?{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
