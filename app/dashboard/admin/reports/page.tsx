"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Download, Eye, Trash2, Search } from "lucide-react"

interface Report {
  id: string
  type: string
  reporter_id: string
  reporter_name: string
  target_id: string
  target_name: string
  reason: string
  description: string
  status: string
  created_at: string
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/admin/reports")
        if (!res.ok) throw new Error("Failed to fetch reports")
        const data = await res.json()
        setReports(data)
      } catch (err: any) {
        setError(err.message)
        console.error("Error fetching reports:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  const filteredReports = reports.filter(report => {
    const matchesSearch =
      report.target_name.toLowerCase().includes(search.toLowerCase()) ||
      report.reason.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || report.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleResolve = async (reportId: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      })
      if (res.ok) {
        setReports(reports.map(r => r.id === reportId ? { ...r, status: "resolved" } : r))
      }
    } catch (err) {
      console.error("Error resolving report:", err)
    }
  }

  const handleDelete = async (reportId: string) => {
    if (confirm("Delete this report?")) {
      try {
        const res = await fetch(`/api/admin/reports/${reportId}`, { method: "DELETE" })
        if (res.ok) {
          setReports(reports.filter(r => r.id !== reportId))
        }
      } catch (err) {
        console.error("Error deleting report:", err)
      }
    }
  }

  if (loading) return <div className="p-6">Loading reports...</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports & Complaints</h1>
        <p className="text-muted-foreground">Manage user reports and platform issues</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
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
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
          <div className="text-sm text-muted-foreground pt-2">
            {filteredReports.length} reports
          </div>
        </div>
      </Card>

      {/* Reports Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Reported User</th>
                <th className="px-6 py-3 text-left font-medium">Reason</th>
                <th className="px-6 py-3 text-left font-medium">Type</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Date</th>
                <th className="px-6 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredReports.map(report => (
                <tr key={report.id} className="hover:bg-muted/50 transition">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{report.target_name}</p>
                      <p className="text-xs text-muted-foreground">By: {report.reporter_name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{report.reason}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{report.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      {report.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        report.status === "resolved"
                          ? "bg-green-100 text-green-700"
                          : report.status === "investigating"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolve(report.id)}
                        className="p-1 hover:bg-green-100 rounded transition"
                        title="Mark resolved"
                      >
                        <Eye className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="p-1 hover:bg-red-100 rounded transition"
                        title="Delete report"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredReports.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No reports found matching your filters
          </div>
        )}
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Reports
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Open Reports</p>
              <p className="text-2xl font-bold">{reports.filter(r => r.status === "open").length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Investigating</p>
              <p className="text-2xl font-bold">{reports.filter(r => r.status === "investigating").length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Resolved</p>
              <p className="text-2xl font-bold">{reports.filter(r => r.status === "resolved").length}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
