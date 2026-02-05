"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import DisputeForm from "@/components/DisputeForm"
import { Card } from "@/components/ui/card"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function FileDissolutePage() {
  const router = useRouter()
  const [jobId, setJobId] = useState<string>("")
  const [bookingId, setBookingId] = useState<string>("")
  const [respondentId, setRespondentId] = useState<string>("")
  const [respondentName, setRespondentName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [userSession, setUserSession] = useState<any | null>(null)

  useEffect(() => {
    // Get current user session
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push("/login")
          return
        }

        setUserSession(session.user)

        // Get URL params to determine which job/booking
        const params = new URLSearchParams(window.location.search)
        const jobIdParam = params.get("job_id") || ""
        const bookingIdParam = params.get("booking_id") || ""
        const respondentIdParam = params.get("respondent_id") || ""

        setJobId(jobIdParam)
        setBookingId(bookingIdParam)
        setRespondentId(respondentIdParam)

        // Fetch respondent name
        if (respondentIdParam) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", respondentIdParam)
            .single()

          if (profile) {
            setRespondentName(profile.full_name)
          }
        }

        setLoading(false)
      } catch (err) {
        setError("Failed to load page")
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="p-8 w-full max-w-md">
          <p className="text-center text-gray-600">Loading...</p>
        </Card>
      </div>
    )
  }

  if (!userSession) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">File a Dispute</h1>
          <p className="text-gray-600 mt-2">
            Report an issue with a transaction or service
          </p>
        </div>

        {error && (
          <Card className="p-4 bg-red-50 border-red-200 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Info Box */}
        <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Before you file a dispute:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Try to resolve the issue directly with the other party first</li>
            <li>Gather any evidence (messages, photos, receipts)</li>
            <li>Be clear and specific about what happened</li>
            <li>Our team will review and may request additional information</li>
          </ul>
        </Card>

        {/* Dispute Form */}
        <DisputeForm
          jobId={jobId}
          bookingId={bookingId}
          respondentId={respondentId}
          respondentName={respondentName}
        />
      </div>
    </div>
  )
}
