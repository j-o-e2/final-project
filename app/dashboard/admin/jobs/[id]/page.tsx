"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function JobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/admin/jobs/${jobId}`, { credentials: 'include' })
        if (!res.ok) throw new Error("Failed to fetch job")
        const data = await res.json()
        setJob(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (jobId) fetchJob()
  }, [jobId])

  if (loading) return <div className="p-6">Loading job details...</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>
  if (!job) return <div className="p-6 text-muted-foreground">Job not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">{job.title}</h1>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Client</p>
            <p className="font-semibold">{job.client_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-semibold capitalize">{job.status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Budget</p>
            <p className="font-semibold">KES {job.budget?.toLocaleString() || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-semibold">{job.duration || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-semibold">{job.location || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Posted</p>
            <p className="font-semibold">{new Date(job.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Description</p>
          <p className="text-sm leading-relaxed">{job.description || 'No description provided'}</p>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Applications: {job.applications_count || 0}</p>
        </div>
      </Card>

      <div className="flex gap-2">
        <Link href="/dashboard/admin/jobs">
          <Button variant="outline">Back to Jobs</Button>
        </Link>
      </div>
    </div>
  )
}
