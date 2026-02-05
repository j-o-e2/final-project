"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Calendar, MapPin, User, ArrowLeft, Clock } from "lucide-react"
import useUserProfile from "@/app/hooks/useUserprofile"
import JobChat from "@/components/ui/job-chat"

interface Service {
  id: string
  name: string
  description?: string
  price: number
  provider_id: string
  profiles?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

interface Booking {
  id: string
  service_id: string
  client_id: string
  booking_date: string
  status: string
  notes?: string
  services?: Service
  created_at: string
}

export default function BookingsPage() {
  const router = useRouter()
  const { profile } = useUserProfile()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedChat, setExpandedChat] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id) return

    const fetchBookings = async () => {
      try {
        const res = await fetch(`/api/bookings?client_id=${profile.id}`)
        if (!res.ok) throw new Error("Failed to fetch bookings")
        const data = await res.json()
        setBookings(data || [])
      } catch (err) {
        console.error("Error fetching bookings:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [profile?.id])

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower === "confirmed" || statusLower === "approved") {
      return "bg-green-100 text-green-800"
    } else if (statusLower === "completed") {
      return "bg-blue-100 text-blue-800"
    } else if (statusLower === "cancelled") {
      return "bg-red-100 text-red-800"
    }
    return "bg-yellow-100 text-yellow-800"
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString("en-KE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return ""
    }
  }

  const shouldShowChat = (booking: Booking) => {
    return booking.status && !["completed", "cancelled"].includes(booking.status.toLowerCase())
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-foreground">My Bookings</h1>
        </div>
      </header>

      {/* Bookings List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading bookings...</p>
          </Card>
        ) : bookings.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No bookings yet</p>
            <Link href="/services">
              <Button>Browse Services</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-4">
                        {booking.services?.name || "Service"}
                      </h3>
                      <div className="space-y-2 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{booking.services?.profiles?.full_name || "Unknown Provider"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(booking.booking_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(booking.booking_date)}</span>
                        </div>
                        {booking.notes && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{booking.notes}</span>
                          </div>
                        )}
                      </div>
                      {booking.services?.price && (
                        <p className="text-lg font-semibold text-primary mt-4">
                          KES {booking.services.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Chat Section */}
                {shouldShowChat(booking) && booking.services?.profiles?.id && profile?.id && (
                  <div>
                    {expandedChat === booking.id ? (
                      <div className="space-y-4">
                        <JobChat
                          bookingId={booking.id}
                          recipientId={booking.services.profiles.id}
                          recipientName={booking.services.profiles.full_name}
                          currentUserId={profile.id}
                          context="booking"
                        />
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setExpandedChat(null)}
                        >
                          Collapse Chat
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setExpandedChat(booking.id)}
                      >
                        Message Service Provider
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
