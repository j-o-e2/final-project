"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LogOut, Plus, User } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import EditProfileModal from "@/components/EditProfileModal"

interface Job {
  id: string
  title: string
  location: string
  budget: number
  duration: string
  status: string
  created_at: string
}

interface UserProfile {
  id: string
  full_name: string
  email?: string
  role?: string
  avatar_url?: string | null
}

export default function ForemanDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [myJobs, setMyJobs] = useState<Job[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [editProfileOpen, setEditProfileOpen] = useState(false)

  const makePrintable = (err: any) => {
    if (!err) return "Unknown error"
    if (typeof err === "string") return err
    if (err?.message) return err.message
    try {
      const names = Object.getOwnPropertyNames(err)
      const data: Record<string, any> = {}
      names.forEach((n) => (data[n] = err[n]))
      return JSON.stringify(data)
    } catch (e) {
      return String(err)
    }
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push("/login")
          return
        }

        // 2. Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) {
          // If there was an error from Supabase, log details and send user to login
          console.error("Error fetching profile:", makePrintable(profileError), profileError)
          setLoading(false)
          router.push("/login")
          return
        }

        if (!profileData) {
          // No profile record found for this authenticated user.
          // Redirect them to the profile page to complete account setup.
          console.warn("No profile record found for user", user.id)
          setLoading(false)
          router.push("/profile")
          return
        }

        // 3. Check role
        if (profileData.role !== "client") {
          router.push("/dashboard") // redirect if not client
          return
        }

        setProfile(profileData)

  // 4. Fetch jobs posted by this client / poster. Try poster_id first (newer schema),
  // then fall back to client_id if poster_id isn't available or returns no results.
        let jobsData: any = null
        const isMissingColumn = (err: any, colName: string) => {
          if (!err) return false
          const msg = String(err.message || err).toLowerCase()
          if (err?.code === "PGRST204") return msg.includes(colName.toLowerCase())
          // Also handle SQL errors like: "column jobs.poster_id does not exist"
          return msg.includes(colName.toLowerCase()) && msg.includes("does not exist")
        }

        try {
          const res = await supabase
            .from("jobs")
            .select("*")
            .eq("poster_id", user.id)
            .order("created_at", { ascending: false })

          if (res.error) {
            // If poster_id column doesn't exist in this DB schema, fallback to client_id for jobs query.
            if (isMissingColumn(res.error, "poster_id")) {
              console.warn("Schema mismatch: 'poster_id' not present. Falling back to 'client_id' for jobs query.")
              const fallbackRes = await supabase
                .from("jobs")
                .select("*")
                .eq("client_id", user.id)
                .order("created_at", { ascending: false })

              if (fallbackRes.error) {
                console.error("Error fetching jobs with client_id:", makePrintable(fallbackRes.error), fallbackRes.error)
                jobsData = []
              } else {
                jobsData = fallbackRes.data || []
              }
            } else {
              console.error("Error fetching jobs by poster_id:", makePrintable(res.error), res.error)
              jobsData = []
            }
          } else {
            // poster_id query succeeded. If it returned no jobs, try client_id too (some DBs use that column).
            jobsData = res.data || []
            if ((jobsData || []).length === 0) {
              const alt = await supabase
                .from("jobs")
                .select("*")
                .eq("client_id", user.id)
                .order("created_at", { ascending: false })

              if (!alt.error && (alt.data || []).length > 0) {
                jobsData = alt.data || []
              }
            }
          }
        } catch (e) {
          console.error("Unexpected error fetching jobs:", makePrintable(e), e)
          jobsData = []
        }

        setMyJobs(jobsData || [])

        // 5. Fetch recent worker profiles (exclude current user)
        try {
          const { data: usersData, error: usersError } = await supabase
            .from("profiles")
            .select("id, full_name, email, role, avatar_url")
            .neq("id", user.id)
            .order("created_at", { ascending: false })
            .limit(10)

          if (usersError) {
            console.error("Error fetching users:", makePrintable(usersError), usersError)
          } else {
            setUsers(usersData || [])
          }
        } catch (e) {
          console.error("Error fetching users:", makePrintable(e), e)
        }
      } catch (err) {
        console.error("Dashboard fetch error:", makePrintable(err), err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleCloseJob = async (jobId: string) => {
    try {
      // Use server-side API (which validates ownership and uses server session)
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      })

      const payload = await res.json()
      if (!res.ok) {
        console.error("Failed to close job (server):", payload)
        return
      }

      // Update local state only after server confirmed success
      setMyJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status: "closed" } : job)))
    } catch (err) {
      console.error("Error closing job:", makePrintable(err), err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome, {profile?.full_name || "Foreman"}</h1>
            <p className="text-muted-foreground text-sm">Ready to post a new job?</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/jobs/post">
              <Button className="bg-primary hover:bg-primary/90 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Post Job
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setEditProfileOpen(true)}
              className="flex items-center gap-2 bg-transparent"
            >
              <User className="w-4 h-4" />
              Edit Profile
            </Button>
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 bg-transparent">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Jobs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">My Jobs</h2>
        <div className="space-y-4">
          {myJobs.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">You haven't posted any jobs yet</p>
              <Link href="/jobs/post">
                <Button className="bg-primary hover:bg-primary/90">Post Your First Job</Button>
              </Link>
            </Card>
          ) : (
            myJobs.map((job) => (
              <Card key={job.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      job.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Budget</p>
                    <p className="font-bold text-primary">KES {job.budget.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Duration</p>
                    <p className="font-semibold text-foreground">{job.duration}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Location</p>
                    <p className="font-semibold text-foreground">{job.location}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/jobs/${job.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                  {job.status === "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCloseJob(job.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Close Job
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Workers / Users */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-foreground mb-4">Workers</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {users.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">No users to show</p>
              </Card>
            ) : (
              users.map((u) => (
                <Card key={u.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm text-muted-foreground">{u.full_name?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.role || "worker"}</p>
                      {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                    </div>
                    <div>
                      <Link href={`/provider/${u.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        profile={profile}
        onSave={(updatedProfile) => {
          setProfile(updatedProfile)
        }}
      />
    </div>
  )
}
