"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Star, MapPin, Clock, Phone, Mail, Calendar } from "lucide-react"
import BackButton from "@/components/BackButton"

import { supabase } from "@/lib/supabaseClient"
import { TierBadge } from "@/components/TierBadge"

export default function ProviderPage() {
  const params = useParams()
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const providerId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : ""
  const serviceId = searchParams ? searchParams.get("service") : ""

  const [provider, setProvider] = useState<any>(null)
  const [service, setService] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bookingDate, setBookingDate] = useState("")
  const [description, setDescription] = useState("")
  const [selectedService, setSelectedService] = useState(serviceId || "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [lastBookingResponse, setLastBookingResponse] = useState<any>(null)

  useEffect(() => {
    const fetchProviderAndService = async () => {
      try {
        // Fetch provider profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", providerId)
          .single()
        if (profileError) throw profileError

        // Fetch provider's services
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("*")
          .eq("provider_id", providerId)
        if (servicesError) throw servicesError

        // Infer service status using recent bookings to avoid showing stale 'pending' state
        try {
          const svcIds = (servicesData || []).map((s: any) => s.id).filter(Boolean)
          let mergedServices = servicesData || []
          if (svcIds.length) {
            const { data: bookingsData } = await supabase
              .from('bookings')
              .select('service_id, status, booking_date')
              .in('service_id', svcIds)
              .order('booking_date', { ascending: false })

            const bookingsByService: Record<string, any[]> = {}
            ;(bookingsData || []).forEach((b: any) => {
              bookingsByService[b.service_id] = bookingsByService[b.service_id] || []
              bookingsByService[b.service_id].push(b)
            })

            mergedServices = (servicesData || []).map((svc: any) => {
              const bs = bookingsByService[svc.id] || []
              if (!bs.length) return svc
              const hasApproved = bs.some((b: any) => b.status === 'approved')
              const hasCompleted = bs.some((b: any) => b.status === 'completed')
              if (hasApproved && !hasCompleted) return { ...svc, status: 'closed' }
              if (bs[0] && bs[0].status === 'completed') return { ...svc, status: 'open' }
              return svc
            })
          }

          setProvider({ ...profileData, services: mergedServices || [] })

          // If serviceId is present, pick the merged service
          if (serviceId) {
            const foundService = (mergedServices || []).find((s: any) => s.id === serviceId)
            setService(foundService || null)
            setSelectedService(serviceId)
          }
        } catch (e) {
          console.warn('[provider] could not infer service status from bookings', e)
          setProvider({ ...profileData, services: servicesData || [] })
          if (serviceId) {
            const foundService = (servicesData || []).find((s: any) => s.id === serviceId)
            setService(foundService || null)
            setSelectedService(serviceId)
          }
        }
      } catch (err) {
        console.error("Error fetching provider/service:", err)
        setError("Failed to load provider or service data")
      } finally {
        setLoading(false)
      }
    }
    if (providerId) fetchProviderAndService()
  }, [providerId, serviceId])

  const handleBooking = async () => {
    if (!bookingDate || !selectedService || !description) {
      setError("Please fill in all fields")
      return
    }

    // Validate selected service belongs to provider
    const svc = (provider?.services || []).find((s: any) => s.id === selectedService)
    if (!svc) {
      setError("Selected service not found for this provider")
      return
    }

    // Disallow booking dates in the past (basic client-side check)
    const picked = new Date(bookingDate)
    const now = new Date()
    now.setHours(0,0,0,0)
    if (picked < now) {
      setError("Please select a present or future date for booking")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        setError("Please login to book a service")
        return
      }

      // Check profile completion before allowing booking
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone, location')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setError("Unable to verify profile. Please try again.")
        setSubmitting(false)
        return
      }

      if (!profile.full_name?.trim() || !profile.email?.trim() || !profile.phone?.trim() || !profile.location?.trim()) {
        setError("Please complete your profile (Name, Email, Phone, Location) before booking a service.")
        setSubmitting(false)
        return
      }

      // Insert booking and request the inserted row back with .select().single()
      const res = await supabase
        .from("bookings")
        .insert([
          {
            service_id: selectedService,
            client_id: user.id,
            booking_date: bookingDate,
            notes: description,
            status: "pending"
          }
        ])
        .select()
        .single()

      // Save response for debugging / visibility
      setLastBookingResponse(res)
      console.debug("Supabase insert response:", res)

      // Handle error in response (robust handling)
      const bookingError = res?.error || null
      if (bookingError) {
        const msg = bookingError.message || JSON.stringify(bookingError)
        setError(`Booking failed: ${msg}`)
        return
      }

      // If no error but no data either, surface that fact
      if (!res?.data) {
        setError("Booking failed: No booking data returned.")
        return
      }
      setError("");
      setBookingDate("");
      setDescription("");
      setSelectedService("");
      alert("Booking successful");
    } catch (err) {
      // Attempt to stringify error objects including non-enumerable props
      let printable: string
      try {
        // Prefer using own property names to reveal nested details
        printable = typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
      } catch (e) {
        printable = String(err)
      }
      console.error("Error creating booking:", err)
      console.error("Stringified booking error:\n", printable)
      setError("Failed to create booking. See console for details.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading provider details...</p>
      </div>
    )
  }
  if (!provider) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BackButton label="Back to Services" />
          <Card className="p-8 text-center">
            <p className="text-foreground text-lg">{error || "Provider not found"}</p>
          </Card>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <BackButton label="Back to Services" className="mb-4" />
        </div>
      </header>
      {/* Provider Details */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2">
            <Card className="p-8 mb-8">
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden">
                  {provider.avatar_url ? (
                    <img src={provider.avatar_url} alt={provider.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl text-primary">{provider.full_name[0]}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold text-foreground">{provider.full_name}</h1>
                    <TierBadge tier={(provider.profile_tier || "basic") as "basic" | "pro" | "verified" | "trusted" | "elite"} size="md" />
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    {provider.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        <span className="text-foreground">{provider.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {provider.bio && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-foreground mb-2">About</h3>
                  <p className="text-muted-foreground">{provider.bio}</p>
                </div>
              )}
              <div className="space-y-3">
                {provider.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary" />
                    <span className="text-foreground">{provider.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <span className="text-foreground">{provider.email}</span>
                </div>
              </div>
            </Card>
            {/* Service Details */}
            {service ? (
              <Card className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">{service.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-medium">KES {service.price.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{service.duration}</p>
                  </div>
                </div>
                <p className="text-muted-foreground">{service.description}</p>
              </Card>
            ) : (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Available Services</h2>
                {provider.services.map((service: any) => (
                  <Card key={service.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                        <p className="text-sm text-muted-foreground">{service.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-primary font-medium">KES {service.price.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{service.duration}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground">{service.description}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
          {/* Booking Card */}
          <div>
            <Card className="p-8 md:sticky md:top-20">
              <h2 className="text-2xl font-bold text-foreground mb-2">Book Service</h2>
              {service && (
                <p className="text-muted-foreground mb-6">KES {service.price.toLocaleString()}</p>
              )}
              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Select Service</label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="">Select a service</option>
                    {provider.services.map((service: any) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - KES {service.price.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Preferred Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Service Description</label>
                  <textarea
                    placeholder="Describe what you need help with..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                    rows={4}
                  />
                </div>
                <Button onClick={handleBooking} className="w-full" size="lg" disabled={submitting}>
                  <Calendar className="w-4 h-4 mr-2" />
                  {submitting ? "Booking..." : "Book Now"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  You'll receive a confirmation via email
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
