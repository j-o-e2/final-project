"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface DisputeFormProps {
  jobId?: string
  bookingId?: string
  respondentId: string
  respondentName: string
}

export default function DisputeForm({ jobId, bookingId, respondentId, respondentName }: DisputeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "quality_of_work",
    severity: "medium",
    disputed_amount: "",
    priority: "5",
  })

  const categories = [
    { value: "quality_of_work", label: "Quality of Work" },
    { value: "payment", label: "Payment Issue" },
    { value: "deadline", label: "Deadline/Schedule" },
    { value: "communication", label: "Communication" },
    { value: "safety", label: "Safety/Conduct" },
    { value: "other", label: "Other" },
  ]

  const severities = [
    { value: "low", label: "Low - Minor issue" },
    { value: "medium", label: "Medium - Notable issue" },
    { value: "high", label: "High - Significant impact" },
    { value: "critical", label: "Critical - Severe issue" },
  ]

  const priorities = [
    { value: "1", label: "1 - Very Low" },
    { value: "2", label: "2 - Low" },
    { value: "3", label: "3 - Low-Medium" },
    { value: "4", label: "4 - Medium" },
    { value: "5", label: "5 - Medium (Default)" },
    { value: "6", label: "6 - Medium-High" },
    { value: "7", label: "7 - High" },
    { value: "8", label: "8 - Very High" },
    { value: "9", label: "9 - Urgent" },
    { value: "10", label: "10 - Critical" },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Validate form
      if (!formData.title.trim()) {
        setError("Please enter a dispute title")
        setLoading(false)
        return
      }

      if (!formData.description.trim()) {
        setError("Please enter a detailed description")
        setLoading(false)
        return
      }

      if (!formData.disputed_amount || parseFloat(formData.disputed_amount) <= 0) {
        setError("Please enter a valid disputed amount")
        setLoading(false)
        return
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError("Please login to file a dispute")
        setLoading(false)
        return
      }

      // Get user profile to validate
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        setError("Unable to verify your profile")
        setLoading(false)
        return
      }

      // Create dispute - NO REFUND FIELD
      const { data: dispute, error: insertError } = await supabase
        .from("disputes")
        .insert([
          {
            job_id: jobId || null,
            booking_id: bookingId || null,
            complainant_id: user.id,
            respondent_id: respondentId,
            title: formData.title,
            description: formData.description,
            category: formData.category,
            severity: formData.severity,
            disputed_amount: parseFloat(formData.disputed_amount),
            currency: "KES",
            status: "open",
            priority: parseInt(formData.priority),
          }
        ])
        .select()
        .single()

      if (insertError) {
        console.error("Dispute creation error:", insertError)
        setError("Failed to file dispute: " + insertError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setFormData({
        title: "",
        description: "",
        category: "quality_of_work",
        severity: "medium",
        disputed_amount: "",
        priority: "5",
      })

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/disputes/${dispute.id}`)
      }, 2000)

    } catch (err: any) {
      console.error("Error filing dispute:", err)
      setError(err.message || "An error occurred while filing the dispute")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Dispute Filed</h2>
            <p className="text-muted-foreground mb-4">
              Your dispute has been successfully filed. An admin will review it shortly.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your dispute details...
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-foreground">File a Dispute</h1>
          <p className="text-muted-foreground mt-2">Report an issue with this transaction</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8">
          {/* Respondent Info */}
          <div className="mb-8 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Dispute with:</p>
            <p className="text-lg font-semibold text-foreground">{respondentName}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Dispute Title *
              </label>
              <Input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Incomplete work, Non-payment, Poor quality"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Brief summary of the issue</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Detailed Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide detailed information about the dispute. Include what was agreed upon and what went wrong."
                rows={5}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">Be as detailed as possible to help with resolution</p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Dispute Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Severity Level *
              </label>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {severities.map(sev => (
                  <option key={sev.value} value={sev.value}>
                    {sev.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">How serious is this issue?</p>
            </div>

            {/* Disputed Amount */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Disputed Amount (KES) *
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-border rounded-l-lg text-foreground">
                  KES
                </span>
                <Input
                  type="number"
                  name="disputed_amount"
                  value={formData.disputed_amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Amount in dispute</p>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Priority Level (Optional)
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {priorities.map(pri => (
                  <option key={pri.value} value={pri.value}>
                    {pri.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">How urgent is this dispute?</p>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> After you file this dispute, an admin will review it and assign a mediator. 
                You'll be able to add evidence, communicate with the other party, and negotiate a resolution.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Filing Dispute..." : "File Dispute"}
              </Button>
            </div>
          </form>
        </Card>

        {/* FAQ Section */}
        <Card className="p-8 mt-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Dispute FAQs</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">What happens after I file a dispute?</h3>
              <p className="text-muted-foreground text-sm">
                An admin will review your dispute within 24 hours and assign a mediator. You'll receive an email notification.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Can I add evidence later?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! After filing, you can upload photos, documents, invoices, and other evidence to support your case.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">How long does resolution take?</h3>
              <p className="text-muted-foreground text-sm">
                Most disputes are resolved within 5-7 days. Complex cases may take longer. You'll be updated throughout the process.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">What if I disagree with the decision?</h3>
              <p className="text-muted-foreground text-sm">
                You can file an appeal within 5 days of the resolution. An independent admin will review the appeal.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">Is there a fee for filing a dispute?</h3>
              <p className="text-muted-foreground text-sm">
                No, dispute filing is completely free. We want to ensure fair resolution for all parties.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
