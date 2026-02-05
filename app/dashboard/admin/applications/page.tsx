"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, CheckCircle, XCircle } from "lucide-react"

interface Application {
  id: string
  job_title: string
  applicant_name: string
  status: string
  applied_at: string
  message: string
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/admin/applications")
        if (!res.ok) throw new Error("Failed to fetch applications")
        const data = await res.json()
        setApplications(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchApplications()
  }, [])

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.job_title.toLowerCase().includes(search.toLowerCase()) || app.applicant_name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || app.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleUpdateApplicationStatus = async (appId: string, newStatus: string) => {
    try {
      console.log(`[Admin] Updating application ${appId} to ${newStatus}`)
      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })
      const responseData = await res.json()
      console.log(`[Admin] Response:`, responseData, `Status: ${res.status}`)
      
      if (!res.ok) {
        throw new Error(responseData?.error || `Failed to update application (${res.status})`)
      }
      
      setApplications(applications.map(a => 
        a.id === appId ? { ...a, status: newStatus } : a
      ))
      alert("Application status updated successfully!")
    } catch (err: any) {
      console.error(`[Admin] Error updating application:`, err)
      alert(`Error: ${err.message}`)
    }
  }

  if (loading) return <div className="p-6">Loading applications...</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job Applications</h1>
        <p className="text-muted-foreground">Review and manage job applications</p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search applications..."
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
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <div className="text-sm text-muted-foreground pt-2">
            {filteredApplications.length} applications
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Job</th>
                <th className="px-6 py-3 text-left font-medium">Applicant</th>
                <th className="px-6 py-3 text-left font-medium">Message</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Applied</th>
                <th className="px-6 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredApplications.map(app => (
                <tr key={app.id} className="hover:bg-muted/50 transition">
                  <td className="px-6 py-4 font-medium">{app.job_title}</td>
                  <td className="px-6 py-4">{app.applicant_name}</td>
                  <td className="px-6 py-4 text-muted-foreground text-xs line-clamp-2">{app.message}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      app.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      app.status === "accepted" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(app.applied_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-green-600 hover:bg-green-100"
                        disabled={app.status !== "pending"}
                        onClick={() => handleUpdateApplicationStatus(app.id, "accepted")}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-red-600 hover:bg-red-100"
                        disabled={app.status !== "pending"}
                        onClick={() => handleUpdateApplicationStatus(app.id, "rejected")}
                      >
                        <XCircle className="w-4 h-4" />
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
