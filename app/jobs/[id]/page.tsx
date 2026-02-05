"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, AlertCircle, MessageCircle, MapPin } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import JobChat from "@/components/ui/job-chat"
import { TierBadge } from "@/components/TierBadge"

interface Job {
  id: string
  title: string
  description: string
  category: string
  required_skills: string[]
  budget: number
  budget_type: string
  poster_id?: string
  location: string
  duration: string
  status: string
  created_at: string
  client_id: string
  profiles?: {
    full_name: string
    avatar_url: string
    profile_tier?: string
  }
}

interface Application {
  id: string
  status: string
  cover_letter: string
  proposed_rate: number
  client_contact_revealed?: boolean
}

export default function JobDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userApplication, setUserApplication] = useState<Application | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [applicationData, setApplicationData] = useState({
    coverLetter: "",
    proposedRate: "",
  })
  const [skillsConfirmed, setSkillsConfirmed] = useState(false)

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

  // Retry helper for PostgREST schema-cache transient errors (PGRST204)
  // Accepts a function that may return a Promise or a Supabase PostgREST builder
  // (which is thenable). Returns the resolved result (usually { data, error }).
  async function attemptWithSchemaRetry<T = any>(fn: () => any, retries = 3, delayMs = 1000): Promise<T> {
    let lastErr: any = null
    for (let i = 0; i < retries; i++) {
      try {
        const maybe = fn()
        // If the result is thenable, await it; otherwise return it directly
        const result = maybe && typeof (maybe as any).then === "function" ? await maybe : maybe
        return result as T
      } catch (e) {
        lastErr = e
        const msg = String((e && ((e as any).message || e)) || "").toLowerCase()
        const isSchemaMissing = (e && (e as any).code === "PGRST204") || (msg.includes("could not find") && msg.includes("job_applications")) || msg.includes("schema cache")
        if (!isSchemaMissing) throw e
        // transient schema-cache error — wait and retry
        console.warn(`Transient schema-cache error detected (attempt ${i + 1}/${retries}), retrying in ${delayMs}ms:`, msg)
        await new Promise((res) => setTimeout(res, delayMs))
      }
    }
    throw lastErr
  }

  useEffect(() => {
    fetchJobDetails()
    fetchCurrentUser()
  }, [jobId])

  useEffect(() => {
    if (user && job) {
      checkUserApplication()
    }
  }, [user, job])

  // Auto-open chat when application becomes accepted
  useEffect(() => {
    if (userApplication && userApplication.status === 'accepted') {
      setShowChat(true)
    }
  }, [userApplication])

  const fetchJobDetails = async () => {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(jobId)) {
        setError("Invalid job ID")
        setLoading(false)
        return
      }

  const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).limit(1).maybeSingle()

  if (error) throw error

      // Fetch poster/client profile (some DBs use `poster_id`, others `client_id`).
      if (data) {
        const ownerId = data.poster_id ?? data.client_id
        try {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, avatar_url, email, phone, location, profile_tier")
            .eq("id", ownerId)
            .maybeSingle()

          data.profiles = profileData || { full_name: "Anonymous", avatar_url: null, email: null, phone: null, location: null, profile_tier: "basic" }
        } catch (e) {
          console.error("Error fetching poster profile:", e)
          data.profiles = { full_name: "Anonymous", avatar_url: null, email: null, phone: null, location: null, profile_tier: "basic" }
        }
      }

      // Defensive normalization: ensure shapes are consistent for the UI.
      // Some runtime environments or transient schema mismatches may return
      // `required_skills` as null/undefined or `budget_type` with unexpected
      // casing/whitespace. Normalize so the UI displays correctly.
      if (data) {
        // Normalize required_skills into a JS array regardless of how it's stored in Postgres
        const normalizeSkills = (val: any): string[] => {
          if (!val && val !== 0) return []
          if (Array.isArray(val)) return val.map((v) => String(v))
          if (typeof val === 'string') {
            const s = val.trim()
            if (!s || s === '[]' || s === '{}' ) return []
            // Try JSON parse for strings like '["Plumbing","Electrical"]'
            try {
              const parsed = JSON.parse(s)
              if (Array.isArray(parsed)) return parsed.map((v) => String(v))
            } catch (e) {
              // not JSON — fall through to comma-split
            }
            // Comma separated fallback: "Plumbing,Electrical"
            return s.split(',').map((p) => p.trim()).filter(Boolean)
          }
          // If it's jsonb/object-like (some drivers return objects), try to coerce
          try {
            if (typeof val === 'object') {
              // If it's a Postgres array proxy (e.g. already array-like), map to strings
              if (Array.isArray((val as any).value)) return (val as any).value.map((v: any) => String(v))
              // If it's a plain object where keys are indices
              const vals = Object.values(val).filter((v) => v !== null && v !== undefined)
              if (vals.length > 0) return vals.map((v) => String(v))
            }
          } catch (e) {
            // ignore and fallback to empty
          }
          return []
        }

        data.required_skills = normalizeSkills(data.required_skills)

        // Helpful debug: warn when required_skills is empty so we can track
        // down schema or RLS issues that may hide this column in some envs.
        if (Array.isArray(data.required_skills) && data.required_skills.length === 0) {
          console.warn(`Job ${data.id} has empty required_skills`)
        }

        // Normalize budget_type to either 'fixed' or 'hourly'. If missing/invalid,
        // prefer the DB default 'fixed' for a deterministic UI.
        const rawType = String(data.budget_type ?? "").trim().toLowerCase()
        data.budget_type = rawType === "hourly" ? "hourly" : "fixed"

        // Ensure budget is a number so `toLocaleString` calls don't throw.
        if (data.budget == null || Number.isNaN(Number(data.budget))) {
          data.budget = 0
        } else {
          data.budget = Number(data.budget)
        }
      }

      setJob(data)
    } catch (err) {
      console.error("Error fetching job:", err)
      setError("Job not found")
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    } catch (err) {
      console.error("Error fetching user:", err)
    }
  }

  const checkUserApplication = async () => {
    try {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", jobId)
        .eq("provider_id", user.id)
          .maybeSingle()
      if (error && error.code !== "PGRST116") {
  // If the job_applications table is not available in the runtime schema cache
  // (PostgREST PGRST204) or Postgres reports the table missing, treat as "no job_applications"
        // rather than surfacing a noisy error to the user.
        const msg = String(error.message || error).toLowerCase()
        if (error?.code === "PGRST204" && msg.includes("job_applications")) {
          console.warn("Schema cache: 'job_applications' table not found. Skipping application check.")
          setUserApplication(null)
          return
        }

        // Also handle SQL-style messages: "Could not find the table 'public.job_applications' in the schema cache"
        if (msg.includes("job_applications") && (msg.includes("could not find") || msg.includes("does not exist"))) {
          console.warn("Schema/table missing for job_applications; skipping application check.")
          setUserApplication(null)
          return
        }

        // Other unexpected errors -- log a readable message and bail
        console.error("Error checking application:", makePrintable(error), error)
        return
      }

      if (data) setUserApplication(data)
    } catch (err) {
      console.error("Error checking application:", makePrintable(err), err)
    }
  }

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      if (!user) {
        router.push("/login")
        return
      }

      if (!applicationData.coverLetter || !applicationData.proposedRate) {
        setError("Please fill in all fields")
        return
      }

      // Check profile completion before allowing application
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email, phone, location')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          setError("Unable to verify profile. Please try again.")
          setSubmitting(false)
          return
        }

        if (!profile.full_name?.trim() || !profile.email?.trim() || !profile.phone?.trim() || !profile.location?.trim()) {
          setError("Please complete your profile (Name, Email, Phone, Location) before applying for jobs.")
          setSubmitting(false)
          return
        }
      } catch (err) {
        console.error("Profile check error:", err)
        setError("Error checking profile. Please try again.")
        setSubmitting(false)
        return
      }

      // If the job lists required_skills, ensure the applicant confirmed they have them
      if (job && Array.isArray(job.required_skills) && job.required_skills.length > 0 && !skillsConfirmed) {
        setError("Please confirm you have the required skills before applying.")
        setSubmitting(false)
        return
      }

      // Ensure the authenticated user has a profile row (avoids FK violation on insert)
      try {
        const profileRes = (await attemptWithSchemaRetry(() =>
          supabase.from("profiles").select("id").eq("id", user.id).maybeSingle(),
        )) as any
        const { data: profileRow, error: profileError } = profileRes || {}
        if (profileError) {
          console.warn("Error checking profile existence:", profileError)
        }
        if (!profileRow) {
          setError("Please complete your profile before applying for jobs")
          setSubmitting(false)
          return
        }
      } catch (e) {
        console.warn("Profile existence check failed:", e)
        const printable = makePrintable(e)
        // If this is a persistent schema error, surface an actionable message
        if (String(printable).toLowerCase().includes("job_applications") || String(printable).toLowerCase().includes("schema cache")) {
          setError("Server schema error: the job_applications table is not available. Please run the database migrations or refresh your Supabase schema cache and try again.")
          setSubmitting(false)
          return
        }
      }

      // Attempt insert with retries for transient schema-cache errors
      const insertResult = (await attemptWithSchemaRetry(() =>
        supabase.from("job_applications").insert([
          {
            job_id: jobId,
            provider_id: user.id,
            cover_letter: applicationData.coverLetter,
            proposed_rate: Number.parseFloat(applicationData.proposedRate),
            status: "pending",
          },
        ]),
      )) as any

      if (insertResult?.error) throw insertResult.error

      setApplicationData({ coverLetter: "", proposedRate: "" })
      setShowApplicationForm(false)
      await checkUserApplication()
      // Refresh job details after applying in case the backend mutated or
      // the runtime schema returned a partial row (helps when required_skills
      // appears blank in some environments).
      try {
        await fetchJobDetails()
      } catch (e) {
        console.warn('Failed to refresh job details after application:', e)
      }
    } catch (err) {
      // Handle PostgREST schema-cache errors specially (table missing in runtime)
  const rawMsg = String((err && ((err as any).message || err)) || "").toLowerCase()
  if ((err && ((err as any).code === "PGRST204")) || (rawMsg.includes("job_applications") && (rawMsg.includes("could not find") || rawMsg.includes("does not exist")))) {
        console.warn("Schema/table missing for job_applications during insert:", rawMsg)
        setError(
          "Server schema error: the job_applications table is not available. Please run the database migrations (scripts/003_create_jobs_tables.sql) or refresh your Supabase schema cache and try again.",
        )
        return
      }

      // Make Supabase/Postgres errors readable for debugging and provide
      // friendly messages for common cases (unique constraint, permission/RLS).
      const printable = makePrintable(err)
      console.error("Error submitting application:", printable)

      const lower = String(printable).toLowerCase()
      if (lower.includes("duplicate") || lower.includes("unique")) {
        setError("You have already applied to this job")
      } else if (lower.includes("permission") || lower.includes("policy") || lower.includes("forbidden") || lower.includes("not authenticated") || lower.includes("auth")) {
        setError("Permission denied. Please sign in and try again.")
      } else if (lower.includes("foreign key") || lower.includes("violates foreign key")) {
        setError("Submission failed: your user profile may be missing in the database. Please ensure your profile exists before applying.")
      } else {
        // Show the printable error to aid debugging; fall back to generic message.
        setError(String(printable) || "Failed to submit application")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading job details...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                router.back()
              }
            }}
            onClick={() => router.back()}
            className="inline-block"
          >
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Jobs
            </Button>
          </div>
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-foreground text-lg">{error || "Job not found"}</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center gap-4">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                router.back()
              }
            }}
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Job Details</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Job Details */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-3xl font-bold text-foreground mb-2">{job.title}</h2>
                <p className="text-muted-foreground">{job.category}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Budget</p>
                  <p className="text-2xl font-bold text-primary">KES {job.budget.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{job.budget_type === "fixed" ? "Fixed" : "Hourly"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Duration</p>
                  <p className="text-lg font-semibold text-foreground capitalize">{job.duration}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Location</p>
                  <p className="text-lg font-semibold text-foreground">{job.location}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Description</h3>
                <p className="text-foreground whitespace-pre-wrap">{job.description}</p>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {(job.required_skills || []).map((skill) => (
                  <span key={skill} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Posted by</h3>
              {/* Show poster contact details to the job owner or to accepted workers (auto-reveal via RLS) */}
              {(() => {
                const ownerId = job.poster_id ?? job.client_id
                const isOwner = user?.id && ownerId === user.id
                const isAcceptedWorker = userApplication && userApplication.status === 'accepted'

                if (isOwner || isAcceptedWorker) {
                  return (
                    <Link href={`/profile/${ownerId}`}>
                      <div className="space-y-3 hover:bg-muted/50 rounded p-3 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                          {job.profiles?.avatar_url && (
                            <img
                              src={job.profiles.avatar_url || "/placeholder.svg"}
                              alt={job.profiles.full_name}
                              className="w-12 h-12 rounded-full bg-secondary object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-foreground">{job.profiles?.full_name || "Anonymous"}</p>
                              <TierBadge tier={(job.profiles?.profile_tier || "basic") as "basic" | "pro" | "verified" | "trusted" | "elite"} size="sm" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Posted {new Date(job.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {job.profiles?.email && (
                          <div className="pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-1">Email</p>
                            <p className="text-foreground">{job.profiles.email}</p>
                          </div>
                        )}
                        {job.profiles?.phone && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Phone</p>
                            <p className="text-foreground">{job.profiles.phone}</p>
                          </div>
                        )}
                        {job.profiles?.location && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Location</p>
                            <p className="text-foreground flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {job.profiles.location}
                            </p>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                }

                return (
                  <div className="p-4 bg-muted/10 rounded">
                    <p className="text-sm text-foreground">Client details are hidden</p>
                    <p className="text-xs text-muted-foreground">You will be able to view the client's contact information if your application is accepted.</p>
                  </div>
                )
              })()}
            </Card>
          </div>

          {/* Application Section */}
          <div>
            {(showChat || (userApplication && userApplication.status === 'accepted')) ? (
              <JobChat
                jobId={jobId}
                jobApplicationId={userApplication?.id}
                recipientId={job?.client_id || job?.poster_id || ''}
                recipientName={job?.profiles?.full_name || 'Client'}
                currentUserId={user?.id || ''}
              />
            ) : (
              <Card className="p-6 md:sticky md:top-8">
                {userApplication ? (
                  <div>
                    <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm font-medium text-primary">
                        Application Status: <span className="capitalize">{userApplication.status}</span>
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Your Proposed Rate</p>
                        <p className="text-lg font-semibold text-foreground">
                          KES {userApplication.proposed_rate?.toLocaleString() || "N/A"}
                        </p>
                      </div>
                      {userApplication.cover_letter && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Your Cover Letter</p>
                          <p className="text-sm text-foreground line-clamp-3">{userApplication.cover_letter}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <Button onClick={() => setShowChat(true)} className="w-full bg-primary hover:bg-primary/90">
                        Start Chat
                      </Button>
                    </div>
                  </div>
                ) : (
                <>
                  {!showApplicationForm ? (
                    <Button
                      onClick={() => setShowApplicationForm(true)}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      Apply for This Job
                    </Button>
                  ) : (
                    <form onSubmit={handleApplicationSubmit} className="space-y-4">
                      {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                          {error}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Cover Letter</label>
                        <textarea
                          value={applicationData.coverLetter}
                          onChange={(e) =>
                            setApplicationData((prev) => ({
                              ...prev,
                              coverLetter: e.target.value,
                            }))
                          }
                          placeholder="Tell the job poster why you're a great fit..."
                          rows={4}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Proposed Rate (KES)</label>
                        <input
                          type="number"
                          value={applicationData.proposedRate}
                          onChange={(e) =>
                            setApplicationData((prev) => ({
                              ...prev,
                              proposedRate: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      </div>

                      <div className="space-y-3">
                        {/* Show required skills inside the application form so applicants can review them before applying */}
                        {(job.required_skills || []).length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-foreground mb-2">Required Skills</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {(job.required_skills || []).map((skill) => (
                                <span key={skill} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                  {skill}
                                </span>
                              ))}
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={skillsConfirmed} onChange={(e) => setSkillsConfirmed(e.target.checked)} />
                              <span>I confirm I have the required skills for this job</span>
                            </label>
                          </div>
                        )}

                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button type="submit" disabled={submitting} className="w-full sm:flex-1 bg-primary hover:bg-primary/90">
                                {submitting ? "Submitting..." : "Submit"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowApplicationForm(false)}
                                className="w-full sm:flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                      </div>
                    </form>
                  )}
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}