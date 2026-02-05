"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AdminDashboardDebug() {
  const router = useRouter()
  const [state, setState] = useState<{
    step: string
    user: any
    session: any
    profile: any
    stats: any
    error: string | null
  }>({
    step: "initializing",
    user: null,
    session: null,
    profile: null,
    stats: null,
    error: null,
  })

  useEffect(() => {
    const debug = async () => {
      try {
        setState((s) => ({ ...s, step: "getting user", error: null }))
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError) {
          setState((s) => ({ ...s, error: `Auth error: ${userError.message}` }))
          return
        }

        if (!user) {
          setState((s) => ({ ...s, error: "Not logged in" }))
          setTimeout(() => router.push("/login"), 2000)
          return
        }

        setState((s) => ({ ...s, user, step: "getting session" }))

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setState((s) => ({ ...s, error: `Session error: ${sessionError?.message || "No session"}` }))
          return
        }

        setState((s) => ({ ...s, session, step: "fetching profile" }))

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError) {
          setState((s) => ({ ...s, error: `Profile fetch error: ${profileError.message}` }))
          return
        }

        if (!profile) {
          setState((s) => ({ ...s, error: "Profile not found" }))
          return
        }

        setState((s) => ({ ...s, profile, step: "checking admin role" }))

        if (profile.role !== "admin") {
          setState((s) => ({ ...s, error: `Not admin. Your role is: ${profile.role}` }))
          return
        }

        setState((s) => ({ ...s, step: "fetching stats" }))

        const statsRes = await fetch("/api/admin/stats", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        const statsData = await statsRes.json()

        if (!statsRes.ok) {
          setState((s) => ({ ...s, error: `Stats API error: ${statsData.error}` }))
          return
        }

        setState((s) => ({ ...s, stats: statsData, step: "complete" }))
      } catch (err: any) {
        setState((s) => ({ ...s, error: `Error: ${err.message}` }))
      }
    }

    debug()
  }, [router])

  const isLoading = state.step !== "complete" && !state.error
  const isError = !!state.error
  const isSuccess = state.step === "complete" && !state.error

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Card className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Admin Dashboard - Debug View</h1>

        {/* Status indicator */}
        <div className={`p-4 rounded-lg ${isLoading ? "bg-blue-50 border border-blue-200" : isError ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
          <p className="font-semibold">
            {isLoading ? "🔄 " : isError ? "❌ " : "✅ "}
            {state.step}
          </p>
          {isLoading && <p className="text-sm text-blue-700 mt-1">Please wait...</p>}
          {isError && <p className="text-sm text-red-700 mt-1">{state.error}</p>}
          {isSuccess && <p className="text-sm text-green-700 mt-1">All checks passed!</p>}
        </div>

        {/* Details */}
        <div className="space-y-3">
          {state.user && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="font-semibold text-sm">User</p>
              <p className="text-xs text-gray-600 mt-1">Email: {state.user.email}</p>
              <p className="text-xs text-gray-600">ID: {state.user.id}</p>
            </div>
          )}

          {state.profile && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="font-semibold text-sm">Profile</p>
              <p className="text-xs text-gray-600 mt-1">Role: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{state.profile.role}</span></p>
              <p className="text-xs text-gray-600">Name: {state.profile.full_name || "—"}</p>
            </div>
          )}

          {state.stats && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="font-semibold text-sm">Stats</p>
              <pre className="text-xs text-gray-600 mt-1 bg-white p-2 rounded border border-gray-300 overflow-auto">
                {JSON.stringify(state.stats, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {isError && (
            <>
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
              <Button onClick={() => router.push("/debug/role")} variant="outline">
                Check/Set Admin Role
              </Button>
            </>
          )}
          {isSuccess && (
            <Button onClick={() => router.push("/dashboard/admin")} className="w-full">
              Go to Real Admin Dashboard
            </Button>
          )}
          <Button onClick={() => router.push("/debug")} variant="outline">
            Back to Debug
          </Button>
        </div>
      </Card>
    </div>
  )
}
