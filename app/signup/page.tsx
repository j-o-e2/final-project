"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Mail, Lock, User, Phone, Briefcase, MapPin } from "lucide-react"
import BackButton from "@/components/BackButton"

interface FormData {
  name: string
  email: string
  phone: string
  location: string
  password: string
  confirmPassword: string
  role: "worker" | "client"
}

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    location: "",
    password: "",
    confirmPassword: "",
    role: "worker",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "phone") {
      // Strip non-digits and limit to 10 characters (numeric-only phone)
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10)
      setFormData(prev => ({ ...prev, phone: digitsOnly }))
      return
    }

    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRoleChange = (role: "worker" | "client") => {
    setFormData(prev => ({ ...prev, role }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!agreedToTerms) {
      setError("Please accept the Terms & Conditions to continue")
      return
    }

    // Validate phone: must be exactly 10 digits (no letters)
    if (!/^[0-9]{10}$/.test(formData.phone)) {
      setError("Phone number must be 10 digits (e.g. 0712345678)")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.name,
          phone: formData.phone,
          location: formData.location,
          role: formData.role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Signup failed")
        setLoading(false)
        return
      }

      console.log("[v0] Signup successful:", data)
      // After creating profile on signup, send user to signup-success.
      // They should be able to post immediately if session exists; otherwise
      // signup-success will guide next steps (verify email or sign in).
      router.push("/signup-success")
    } catch (err) {
      console.error("[v0] Signup error:", err)
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <BackButton label="Back to home" />
        </div>

        <Card className="p-8 bg-card/50 backdrop-blur-sm border-0">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-muted-foreground mb-6">Join LocalFix Kenya today</p>

          {error && (
            <div className="mb-6 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                {["worker", "client"].map(roleOption => (
                  <button
                    key={roleOption}
                    type="button"
                    onClick={() => handleRoleChange(roleOption as "worker" | "client")}
                    className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                      formData.role === roleOption
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {roleOption === "worker" ? <User className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                    <span className="text-sm font-medium capitalize">{roleOption}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <InputField
              label="Full Name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              icon={<User className="w-5 h-5 text-muted-foreground" />}
            />

            {/* Email */}
            <InputField
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              icon={<Mail className="w-5 h-5 text-muted-foreground" />}
            />

            {/* Phone */}
            <InputField
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="07xxxxxx"
              value={formData.phone}
              onChange={handleChange}
              icon={<Phone className="w-5 h-5 text-muted-foreground" />}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]{10}", maxLength: 10 }}
            />

            {/* Location */}
            <InputField
              label="Location / County"
              name="location"
              type="text"
              placeholder="e.g., Meru, Nairobi, Kisumu"
              value={formData.location}
              onChange={handleChange}
              icon={<MapPin className="w-5 h-5 text-muted-foreground" />}
            />

            {/* Password */}
            <InputField
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              icon={<Lock className="w-5 h-5 text-muted-foreground" />}
            />

            {/* Confirm Password */}
            <InputField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              icon={<Lock className="w-5 h-5 text-muted-foreground" />}
            />

            <div className="flex items-start gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-primary focus:ring-primary"
                />
                <span>
                  I agree to the <Link href="/terms" className="text-primary hover:text-primary/80 font-medium">Terms &amp; Conditions</Link>
                </span>
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}

// Reusable InputField component
interface InputFieldProps {
  label: string
  name: string
  type: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  icon?: React.ReactNode
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}

function InputField({ label, name, type, placeholder, value, onChange, icon, inputProps }: InputFieldProps) {
  const mergedClass = `${icon ? "pl-10" : ""} ${inputProps?.className ?? ""}`.trim()

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-3">{icon}</div>}
        <Input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...inputProps}
          className={mergedClass}
          required
        />
      </div>
    </div>
  )
}
