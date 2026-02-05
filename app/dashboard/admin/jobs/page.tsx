"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Eye, Trash2 } from "lucide-react"

interface Job {
  id: string
  title: string
  client_name: string
  location?: string
  status: string
  budget: number
  applications_count: number
  created_at: string
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [locations, setLocations] = useState<string[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  // Ensure we know whether the current user is admin immediately (so UI doesn't
  // show non-admin restrictions before the first manual refresh).
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { user } = {} as any } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
        if (!user) return
        const { data: profile } = await supabase
          .from('profiles')
          .select('location, role')
          .eq('id', user.id)
          .maybeSingle()
        if (!mounted) return
        if (profile) {
          if (profile.role === 'admin') setIsAdmin(true)
          if (profile.location) setLocationFilter(prev => prev === 'all' ? profile.location : prev)
        }
      } catch (e) {
        console.warn('[admin/jobs] profile detection failed on mount', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    // Do not auto-fetch jobs. Wait for explicit user action (Refresh)
    setLoading(false)
  }, [])

  // Extracted fetchJobs so it can be called on demand (Refresh button)
  async function fetchJobs() {
    try {
      setLoading(true)
      setError(null)

      // fetch current user's profile to detect role/location
      try {
        const { data: { user } = {} as any } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("location, role")
            .eq("id", user.id)
            .maybeSingle()

          if (profile) {
            if (profile.role === "admin") setIsAdmin(true)
            if (profile.location) setLocationFilter(prev => prev === "all" ? profile.location : prev)
          }
        }
      } catch (e) {
        console.warn('[admin/jobs] profile fetch failed', e)
      }

      const res = await fetch("/api/admin/jobs", { credentials: 'include' })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Failed to fetch jobs: ${res.status}`)
      }
      const data = await res.json()
      setJobs(data)
      const distinct = Array.from(new Set((data || []).map((j: any) => j.location).filter(Boolean)))
      setLocations(distinct)
    } catch (err: any) {
      console.error('[admin/jobs] fetchJobs error', err)
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || job.status === statusFilter
    const matchesLocation = locationFilter === "all" || !locationFilter ? true : (job.location === locationFilter)

    // If user is not admin, restrict to open jobs only and to their location
    if (!isAdmin) {
      if (job.status !== "open") return false
      if (locationFilter && locationFilter !== "all" && job.location !== locationFilter) return false
    }

    return matchesSearch && matchesStatus && matchesLocation
  })

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return
    try {
      console.log(`[Admin] Deleting job ${jobId}`)
      const res = await fetch(`/api/admin/jobs/${jobId}`, { method: "DELETE", credentials: 'include' })
      const responseData = await res.json()
      console.log(`[Admin] Response:`, responseData, `Status: ${res.status}`)
      
      if (!res.ok) {
        throw new Error(responseData?.error || `Failed to delete job (${res.status})`)
      }
      
      setJobs(jobs.filter(j => j.id !== jobId))
      alert("Job deleted successfully!")
    } catch (err: any) {
      console.error(`[Admin] Error deleting job:`, err)
      alert(`Error: ${err.message}`)
    }
  }

  if (loading) return <div className="p-6">Loading jobs...</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Jobs Management</h1>
        <p className="text-muted-foreground">View and moderate job listings</p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded border border-border bg-background"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 rounded border border-border bg-background"
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <div className="text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-3">
              <div>{filteredJobs.length} jobs</div>
              <Button size="sm" onClick={() => fetchJobs()} disabled={loading} className="px-3">
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      {/* Notice for restricted users */}
      {!isAdmin && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          You can view only <strong>open</strong> jobs in your location ({locationFilter === 'all' ? 'your location' : locationFilter}). Other jobs are restricted.
        </div>
      )}

      <Card className="overflow-hidden">
        {/* Mobile: card list */}
        <div className="md:hidden p-2 space-y-3">
          {filteredJobs.map(job => (
            <div key={job.id} className="p-3 bg-card border border-border rounded">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{job.title}</h3>
                  <p className="text-xs text-muted-foreground">{job.client_name} • {job.location || '—'}</p>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    job.status === "open" ? "bg-green-100 text-green-700" :
                    job.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                    job.status === "completed" ? "bg-gray-100 text-gray-700" :
                    "bg-red-100 text-red-700"
                  }`}>{job.status}</div>
                  <div className="text-sm font-semibold mt-2">KES {job.budget.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {(!isAdmin && job.status !== "open") ? (
                  <Button size="sm" variant="outline" className="gap-1 opacity-50 cursor-not-allowed" title="Only open jobs are viewable">
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                ) : (
                  <Link href={`/dashboard/admin/jobs/${job.id}`}>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                  </Link>
                )}
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={() => handleDeleteJob(job.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop/table view */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Job Title</th>
                <th className="px-6 py-3 text-left font-medium">Client</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Budget</th>
                <th className="px-6 py-3 text-left font-medium">Applications</th>
                <th className="px-6 py-3 text-left font-medium">Posted</th>
                <th className="px-6 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredJobs.map(job => (
                <tr key={job.id} className="hover:bg-muted/50 transition">
                  <td className="px-6 py-4 font-medium">{job.title}</td>
                  <td className="px-6 py-4">{job.client_name} {job.location ? `• ${job.location}` : ''}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      job.status === "open" ? "bg-green-100 text-green-700" :
                      job.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                      job.status === "completed" ? "bg-gray-100 text-gray-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold">KES {job.budget.toLocaleString()}</td>
                  <td className="px-6 py-4">{job.applications_count}</td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">{new Date(job.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {(!isAdmin && job.status !== "open") ? (
                        <Button size="sm" variant="outline" className="gap-1 opacity-50 cursor-not-allowed" title="Only open jobs are viewable">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      ) : (
                        <Link href={`/dashboard/admin/jobs/${job.id}`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </Link>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={() => handleDeleteJob(job.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
