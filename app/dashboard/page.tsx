"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const redirectToDashboard = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        // Fetch user profile to get role
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) {
          console.error("Failed to fetch user profile:", profileError)

          // First attempt: try a local client-side fallback using the freshest auth user
          try {
            const {
              data: { user: freshUser },
            } = await supabase.auth.getUser()

            if (freshUser) {
              const { data: fallbackProfile, error: fallbackError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", freshUser.id)
                .maybeSingle()

              if (!fallbackError && fallbackProfile) {
                const role = fallbackProfile.role || "worker"
                if (role === "client") router.push("/dashboard/client")
                else if (role === "admin") router.push("/dashboard/admin")
                else router.push("/dashboard/worker")
                return
              }
            }
          } catch (e) {
            console.warn("Profile fallback attempt failed:", e)
          }

          // Second attempt: call server-side fallback which uses the service role key
          try {
            const resp = await fetch("/api/admin/profile")
            if (resp.ok) {
              const body = await resp.json()
              const role = body?.data?.role || "worker"
              if (role === "client") router.push("/dashboard/client")
              else if (role === "admin") router.push("/dashboard/admin")
              else router.push("/dashboard/worker")
              return
            } else {
              console.warn('[v0] server-side profile fallback failed', await resp.text())
            }
          } catch (e) {
            console.warn('[v0] server-side profile fallback error', e)
          }

          // If we reach here the profile couldn't be read. Show a clear message
          // so the operator can run the supplied migration to fix RLS policies.
          setError("Failed to fetch user profile. Please run the profiles RLS fix migration on the DB.")
          return
        }

        // Redirect based on role
        const role = profile?.role || "worker"
        if (role === "client") {
          router.push("/dashboard/client")
        } else if (role === "admin") {
          router.push("/dashboard/admin")
        } else {
          router.push("/dashboard/worker")
        }
      } catch (err) {
        console.error("[v0] Dashboard redirect error:", err)
        setError("An error occurred")
      } finally {
        setLoading(false)
      }
    }

    redirectToDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return null
}
