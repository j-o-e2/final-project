"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, X } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface JobPayload {
  client_id: string
  title: string
  description: string
  category: string
  required_skills: string[]
  budget: number
  budget_type: 'fixed' | 'hourly'
  location: string
  duration: string
  status: 'open' | 'in-progress' | 'completed' | 'closed'
}

const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting",
  "Cleaning",
  "Landscaping",
  "HVAC",
  "Roofing",
  "Masonry",
  "Welding",
  "Other",
]

const COMMON_SKILLS = [
  "Plumbing",
  "Electrical Work",
  "Carpentry",
  "Painting",
  "Tile Work",
  "Drywall",
  "Flooring",
  "Roofing",
  "HVAC",
  "Welding",
  "Masonry",
  "Landscaping",
  "Cleaning",
  "Handyman",
  "Problem Solving",
]

export default function PostJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState("")
  const [customDuration, setCustomDuration] = useState("")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    budget: "",
    budgetType: "fixed", // This will be transformed to budget_type when sending to DB
    location: "",
    duration: "one-time"
  })

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("You must be logged in to post a job")
        router.push("/login")
        return
      }

      // Check profile completion
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone, location')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setError("Unable to verify profile. Please try again.")
        setLoading(false)
        return
      }

      // Validate profile has all required fields
      if (!profile.full_name?.trim() || !profile.email?.trim() || !profile.phone?.trim() || !profile.location?.trim()) {
        setError("Please complete your profile (Name, Email, Phone, Location) before posting a job.")
        setLoading(false)
        return
      }

        // Validate required fields
        if (!formData.title?.trim() || !formData.description?.trim() || !formData.category || !formData.location?.trim()) {
          setError("Please fill in all required fields")
          return
        }
      
        // Validate budget
        const budget = parseFloat(formData.budget)
        if (isNaN(budget) || budget <= 0) {
          setError("Please enter a valid budget amount greater than 0")
        return
      }

        // If custom duration selected, ensure customDuration provided
        if (formData.duration === 'custom' && !customDuration.trim()) {
          setError('Please provide a custom timeline for the job')
          setLoading(false)
          return
        }

      const jobPayload: Record<string, any> = {
        client_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        required_skills: selectedSkills,
        budget: budget,
        budget_type: formData.budgetType === 'hourly' ? 'hourly' : 'fixed', // Only 'fixed' or 'hourly' allowed
        location: formData.location.trim(),
        duration: formData.duration === 'custom' ? (customDuration || formData.duration) : formData.duration,
        status: "open"
        // Let the database handle created_at with its DEFAULT NOW()
      }

      // Use a robust insert helper that retries when the DB check constraint for budget_type fails.
      async function insertWithBudgetFallback(payload: Record<string, any>) {
        // First attempt
        const res1 = await supabase.from("jobs").insert([payload]).select().single()
        if (!res1.error) return { data: res1.data, error: null }
        const e1 = res1.error
        const msg1 = String(e1?.message || e1)

        // If DB complains about budget_type check constraint, retry without sending budget_type so DB default applies
        if ((e1?.code === "23514" || msg1.includes("jobs_budget_type_check")) ) {
          console.warn("jobs insert failed due to budget_type check. Retrying without budget_type.")
          const fallback = { ...payload }
          // Remove only the problematic `budget_type` and preserve `required_skills`
          delete fallback.budget_type
          const res2 = await supabase.from("jobs").insert([fallback]).select().single()
          if (!res2.error) return { data: res2.data, error: null }
          return { data: null, error: res2.error }
        }

        // If schema mismatch (missing column names) try swapping poster_id/client_id
        if (e1?.code === "PGRST204" || msg1.includes("column")) {
          const fallback = { ...payload }
          if (msg1.includes("poster_id") && fallback.poster_id) {
            fallback.client_id = fallback.poster_id
            delete fallback.poster_id
          } else if (msg1.includes("client_id") && fallback.client_id) {
            fallback.poster_id = fallback.client_id
            delete fallback.client_id
          }
          // try removing required_skills if indicated
          if (String(e1.message || "").includes("required_skills")) {
            delete fallback.required_skills
          }
          const res3 = await supabase.from("jobs").insert([fallback]).select().single()
          if (!res3.error) return { data: res3.data, error: null }
          const e3 = res3.error
          // If still failing due to budget_type check, attempt one more without budget_type
          const msg3 = String(e3?.message || e3)
          if ((e3?.code === "23514" || msg3.includes("jobs_budget_type_check"))) {
            const fallback2 = { ...fallback }
            delete fallback2.budget_type
            delete fallback2.required_skills
            const res4 = await supabase.from("jobs").insert([fallback2]).select().single()
            if (!res4.error) return { data: res4.data, error: null }
            return { data: null, error: res4.error }
          }

          return { data: null, error: e3 }
        }

        return { data: null, error: e1 }
      }

      const { data: created, error: finalError } = await insertWithBudgetFallback(jobPayload)
      if (finalError) {
        console.error("Final job insert failed:", makePrintable(finalError), finalError)
        setError(makePrintable(finalError))
        return
      }

      // Notify user of success and redirect to jobs list
      alert("Job posted successfully!")
      router.push("/jobs")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post job")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Post a New Job</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Job Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Fix leaking kitchen faucet"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Job Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the job in detail..."
                rows={5}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-card text-foreground">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Required Skills */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">Required Skills</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {COMMON_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSkills.includes(skill)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              {selectedSkills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedSkills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1"
                    >
                      <span className="text-sm text-primary">{skill}</span>
                      <button
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className="text-primary hover:text-primary/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Custom Skill Input */}
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && customSkill.trim()) {
                      e.preventDefault()
                      if (!selectedSkills.includes(customSkill.trim())) {
                        setSelectedSkills([...selectedSkills, customSkill.trim()])
                        setCustomSkill("")
                      }
                    }
                  }}
                  placeholder="Add custom skill (press Enter)"
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
                      setSelectedSkills([...selectedSkills, customSkill.trim()])
                      setCustomSkill("")
                    }
                  }}
                  className="bg-primary hover:bg-primary/90"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Budget */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Budget</label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Budget Type</label>
                <select
                  name="budgetType"
                  value={formData.budgetType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="fixed" className="bg-card text-foreground">Fixed Price</option>
                  <option value="hourly" className="bg-card text-foreground">Hourly Rate</option>
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Nairobi, Kayole"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Job Duration</label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="one-time" className="bg-card text-foreground">One-time</option>
                <option value="short-term" className="bg-card text-foreground">Short-term (1-3 months)</option>
                <option value="long-term" className="bg-card text-foreground">Long-term (3+ months)</option>
                <option value="custom" className="bg-card text-foreground">Custom timeline</option>
              </select>
              {formData.duration === 'custom' ? (
                <div className="mt-3">
                  <input
                    type="text"
                    name="customDuration"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    placeholder="e.g., 2 weeks, approx. 6 months"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Provide a free-text timeline to help applicants understand the schedule.</p>
                </div>
              ) : null}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
                {loading ? "Posting..." : "Post Job"}
              </Button>
              <Link href="/jobs" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
