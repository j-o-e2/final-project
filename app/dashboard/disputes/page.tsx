"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ChevronRight, MessageSquare, FileText } from "lucide-react"

interface Dispute {
  id: string
  title: string
  category: string
  severity: string
  status: string
  disputed_amount: number
  respondent_id: string
  respondent: { full_name: string }
  created_at: string
  communications?: any[]
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

export default function DisputesDashboardPage() {
  const router = useRouter()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [userSession, setUserSession] = useState<any | null>(null)

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push("/login")
          return
        }

        setUserSession(session.user)

        // Fetch disputes where user is complainant or respondent
        const { data, error } = await supabase
          .from("disputes")
          .select(
            `
            *,
            respondent:respondent_id(full_name)
          `
          )
          .or(`complainant_id.eq.${session.user.id},respondent_id.eq.${session.user.id}`)
          .order("created_at", { ascending: false })

        if (error) throw error

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

  const filteredDisputes = 
    filterStatus === "all" 
      ? disputes 
      : disputes.filter(d => d.status === filterStatus)

  const statuses = [
    { value: "all", label: "All Disputes", count: disputes.length },
    { value: "open", label: "Open", count: disputes.filter(d => d.status === "open").length },
    { value: "assigned", label: "Assigned", count: disputes.filter(d => d.status === "assigned").length },
    { value: "under_review", label: "Under Review", count: disputes.filter(d => d.status === "under_review").length },
    { value: "resolved", label: "Resolved", count: disputes.filter(d => d.status === "resolved").length },
    { value: "closed", label: "Closed", count: disputes.filter(d => d.status === "closed").length },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading disputes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Disputes</h1>
          <p className="text-gray-600 mt-1">Track and manage your disputes</p>
        </div>
        <Button onClick={() => router.push("/disputes")} className="bg-blue-600 hover:bg-blue-700">
          File New Dispute
        </Button>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        </Card>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === s.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s.label} ({s.count})
          </button>
        ))}
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {filteredDisputes.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No disputes yet</h3>
            <p className="text-gray-600 mt-2">You haven't filed any disputes</p>
            <Button 
              onClick={() => router.push("/disputes")} 
              className="mt-4 bg-blue-600 hover:bg-blue-700"
            >
              File Your First Dispute
            </Button>
          </Card>
        ) : (
          filteredDisputes.map(dispute => (
            <Card 
              key={dispute.id}
              className={`p-6 cursor-pointer transition hover:shadow-lg ${statusColors[dispute.status]}`}
              onClick={() => router.push(`/dashboard/disputes/${dispute.id}`)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{dispute.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeColors[dispute.status]}`}>
                      {dispute.status.replace("_", " ").charAt(0).toUpperCase() + dispute.status.slice(1).replace("_", " ")}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${severityColors[dispute.severity]}`}>
                      {dispute.severity.charAt(0).toUpperCase() + dispute.severity.slice(1)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{dispute.category.replace("_", " ").toUpperCase()}</p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-700">
                      <strong>Amount:</strong> KES {dispute.disputed_amount.toLocaleString()}
                    </span>
                    <span className="text-gray-700">
                      <strong>Against:</strong> {dispute.respondent?.full_name}
                    </span>
                    <span className="text-gray-500">
                      Filed {new Date(dispute.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-400 ml-4" />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
