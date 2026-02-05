"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle, ArrowLeft } from "lucide-react"
import BackButton from "@/components/BackButton"
import { supabase } from "@/lib/supabaseClient"

export default function SignupSuccessPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const [resendEmail, setResendEmail] = useState("")
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)

  async function resendVerificationEmail(email: string) {
    setResendMessage(null)
    if (!email) {
      setResendMessage("Please enter an email address.")
      return
    }

    try {
      setResendLoading(true)
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      
      const data = await res.json()
      setResendLoading(false)

      if (!res.ok) {
        setResendMessage(`Error: ${data.error || "Failed to send verification email"}`)
        console.error('Resend verification error', data)
        return
      }

      setResendMessage('✓ Verification link sent! Check your inbox and spam folder (valid for 24 hours).')
      setResendEmail("")
    } catch (err) {
      setResendLoading(false)
      setResendMessage('Unexpected error sending verification email')
      console.error('Unexpected resend error', err)
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
      
      console.log('[v0] Parsed URL params:', { 
        hasAccessToken: !!params.access_token,
        hasRefreshToken: !!params.refresh_token,
        hasError: !!params.error_description,
        errorMsg: params.error_description || params.error
      })
    } catch (err) {
      console.warn('Could not parse URL params', err)
    }

    async function handleVerification() {
      // If Supabase placed access/refresh tokens in the URL, set the session
      if (params.access_token) {
        setLoading(true)
        console.log('[v0] Attempting to set session with access token')
        
        const { data, error } = await supabase.auth.setSession({
          access_token: params.access_token || "",
          refresh_token: params.refresh_token || "",
        })

        setLoading(false)
        
        if (error) {
          console.error('[v0] Verification setSession error:', error.message, error)
          setError(`${error.message} (Token may have expired. Try resending the verification email.)`)
          return
        }

        console.log('[v0] Session set successfully - user verified')
        // Successful session set; user is verified and logged in
        setVerified(true)
        return
      }

      // If there's an error param from the redirect, surface it
      if (params.error_description || params.error) {
        const errorMsg = params.error_description || params.error
        console.warn('[v0] Error from redirect:', errorMsg)
        setError(errorMsg)
      } else if (!params.access_token && !params.error) {
        // No token and no error - user just landed on the page without clicking a link
        console.log('[v0] No token in URL - user landed on signup-success without email link')
      }
    }

    handleVerification()
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <Card className="p-8 text-center">
          <div className="mb-6 flex justify-center">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">Account Created!</h1>

          {loading ? (
            <p className="text-muted-foreground mb-6">Verifying your account...</p>
          ) : error ? (
            <>
              <p className="text-destructive mb-4">Verification Issue: {error}</p>
              <p className="text-muted-foreground text-sm mb-6">
                This usually happens when:
              </p>
              <ul className="text-muted-foreground text-sm mb-6 list-disc list-inside space-y-1">
                <li>The verification link has expired (request a new one below)</li>
                <li>The link was already used to verify</li>
                <li>There's a mismatch in site URL configuration</li>
              </ul>
              <p className="text-muted-foreground text-xs mb-4 p-2 bg-blue-900/20 border border-blue-700/30 rounded">
                ℹ️ <strong>Important:</strong> Verification links expire after 24 hours. If you received yours before that time, please try again. You may also use the "Resend" option below to get a fresh link.
              </p>
              <p className="text-muted-foreground text-xs mb-4 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded">
                💡 <strong>Admin Config:</strong> In Supabase Dashboard → Authentication → Providers → Email, verify "OTP Expiration" is set to 86400 seconds (24 hours)
              </p>
              <p className="text-muted-foreground mb-6"><strong>Next steps:</strong> Request a new verification email below:</p>
              <div className="mt-4">
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 rounded-md border px-3 py-2 bg-background text-foreground"
                  />
                  <button
                    className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    onClick={() => resendVerificationEmail(resendEmail)}
                    disabled={resendLoading}
                  >
                    {resendLoading ? 'Sending...' : 'Resend'}
                  </button>
                </div>
                {resendMessage && (
                  <p className={`text-sm mt-2 ${resendMessage.includes('Failed') ? 'text-destructive' : 'text-green-600'}`}>
                    {resendMessage}
                  </p>
                )}
              </div>
            </>
          ) : verified ? (
            <>
              <p className="text-muted-foreground mb-6">Your email is verified and you're signed in. You can continue to the dashboard.</p>
              <div className="space-y-3">
                <Link href="/dashboard" className="block">
                  <Button className="w-full">Go to Dashboard</Button>
                </Link>
                <Link href="/" className="block">
                  <Button variant="outline" className="w-full bg-transparent">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
                <p className="text-muted-foreground mb-6">Success: account created.</p>

                <div className="space-y-3">
                  <Link href="/" className="block">
                    <Button variant="outline" className="w-full bg-transparent">
                      Back Home
                    </Button>
                  </Link>
                  <Link href="/login" className="block">
                    <Button className="w-full">Login</Button>
                  </Link>
                </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
