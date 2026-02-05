"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ChevronRight, TrendingUp } from "lucide-react"

interface Dispute {
  id: string
  title: string
  category: string
  severity: string
  status: string
  disputed_amount: number
  complainant: { id: string; full_name: string }
  respondent: { id: string; full_name: string }
  assigned_admin_id: string | null
  created_at: string
  priority: number
}

const statusColors: Record<string, string> = {
  open: "bg-blue-50 border-blue-200",
  assigned: "bg-yellow-50 border-yellow-200",
  under_review: "bg-purple-50 border-purple-200",
  resolved: "bg-green-50 border-green-200",
  closed: "bg-gray-50 border-gray-200",
}

const statusBadgeColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  assigned: "bg-yellow-100 text-yellow-800",
  under_review: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
}

const severityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
}

export default function AdminDisputesPage() {
  const router = useRouter()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filterStatus, setFilterStatus] = useState("open")
  const [filterSeverity, setFilterSeverity] = useState("all")
  const [userSession, setUserSession] = useState<any | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push("/login")
          return
        }

        setUserSession(session.user)

        // Check if user is admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()

        if (profile?.role !== "admin") {
          setError("You do not have permission to access this page")
          setIsAdmin(false)
          setLoading(false)
          return
        }

        setIsAdmin(true)

        // Fetch all disputes
        const { data, error: fetchError } = await supabase
          .from("disputes")
          .select(
            `
            *,
            complainant:complainant_id(id, full_name),
            respondent:respondent_id(id, full_name)
          `
          )
          .order("created_at", { ascending: false })

        if (fetchError) throw fetchError

        setDisputes(data || [])
        setLoading(false)
      } catch (err) {
        console.error("Error fetching disputes:", err)
        setError("Failed to load disputes")
        setLoading(false)
      }
    }

    fetchDisputes()
  }, [router])

  const filteredDisputes = disputes.filter(d => {
    const statusMatch = filterStatus === "all" || d.status === filterStatus
    const severityMatch = filterSeverity === "all" || d.severity === filterSeverity
    return statusMatch && severityMatch
  })

  // Calculate stats
  const stats = {
    total: disputes.length,
    open: disputes.filter(d => d.status === "open").length,
    unassigned: disputes.filter(d => !d.assigned_admin_id).length,
    critical: disputes.filter(d => d.severity === "critical").length,
    totalAmount: disputes.reduce((sum, d) => sum + d.disputed_amount, 0),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading disputes...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-6 sm:p-8 lg:p-10 max-w-4xl mx-auto">
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-red-900">Access Denied</h3>
              <p className="text-red-800 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dispute Management</h1>
        <p className="text-gray-600 mt-1">Review and manage all marketplace disputes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
          <div className="text-sm text-blue-800">Total Disputes</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="text-3xl font-bold text-red-900">{stats.open}</div>
          <div className="text-sm text-red-800">Open Disputes</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="text-3xl font-bold text-yellow-900">{stats.unassigned}</div>
          <div className="text-sm text-yellow-800">Unassigned</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="text-3xl font-bold text-orange-900">{stats.critical}</div>
          <div className="text-sm text-orange-800">Critical Issues</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="text-lg font-bold text-green-900">KES {(stats.totalAmount / 1000).toFixed(0)}K</div>
          <div className="text-sm text-green-800">Total Amount</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="under_review">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
          >
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="space-y-4">
        {filteredDisputes.length === 0 ? (
          <Card className="p-12 text-center">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No disputes found</h3>
            <p className="text-gray-600 mt-2">There are no disputes matching your filters</p>
          </Card>
        ) : (
          filteredDisputes.map(dispute => (
            <Card 
              key={dispute.id}
              className={`p-6 cursor-pointer transition hover:shadow-lg ${statusColors[dispute.status]}`}
              onClick={() => router.push(`/admin/disputes/${dispute.id}`)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{dispute.title}</h3>
                    {dispute.priority >= 7 && (
                      <span className="text-red-600 font-bold">⚠️ HIGH PRIORITY</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeColors[dispute.status]}`}>
                      {dispute.status.replace("_", " ")}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${severityColors[dispute.severity]}`}>
                      {dispute.severity}
                    </span>
                    {!dispute.assigned_admin_id && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">Unassigned</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Complainant:</span>
                      <p className="font-medium text-gray-900">{dispute.complainant?.full_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Respondent:</span>
                      <p className="font-medium text-gray-900">{dispute.respondent?.full_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Amount:</span>
                      <p className="font-medium text-gray-900">KES {dispute.disputed_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Filed:</span>
                      <p className="font-medium text-gray-900">{new Date(dispute.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
