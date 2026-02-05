"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Star, MapPin, Search } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { TierBadge } from "@/components/TierBadge"

interface Service {
  id: string
  name: string
  category: string
  price: number
  duration: string
  description: string
  provider_id: string
  created_at: string
  image?: string
  rating?: number
  reviews?: number
  location?: string
  profiles: {
    full_name: string
    avatar_url: string | null
    location: string
    profile_tier?: string
  }
}

export default function ServicesPage() {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [categories, setCategories] = useState<string[]>(["All"])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchServices = async () => {
      try {
        let data: any = null
        let error: any = null
        try {
          const res = await supabase
            .from('services')
            .select(`
              *,
              profiles:provider_id (
                full_name,
                avatar_url,
                location,
                profile_tier
              )
            `)
            .order('created_at', { ascending: false })
          data = res.data
          error = res.error
        } catch (e: any) {
          error = e
        }

        if (error) {
          console.warn('[services] initial read failed, retrying:', error)
          await new Promise((r) => setTimeout(r, 300))
          try {
            const res2 = await supabase
              .from('services')
              .select(`*, profiles:provider_id ( full_name, avatar_url, location, profile_tier )`)
              .order('created_at', { ascending: false })
            data = res2.data
            error = res2.error
          } catch (e: any) {
            error = e
          }
        }

        if (error) {
          // fallback to server-side endpoint
          try {
            const resp = await fetch('/api/debug/services', { credentials: 'include' })
            if (resp.ok) {
              const body = await resp.json()
              data = body?.data || []
            } else {
              console.error('[services] server-side services fallback failed:', await resp.text())
              data = []
            }
          } catch (e) {
            console.error('[services] all fallbacks failed:', e)
            data = []
          }
        }

        setServices(data || [])

        // Try to infer service status from recent bookings in case the
        // `services.status` column is stale or wasn't updated (helps when
        // RLS or transient errors prevented persisting status changes).
        try {
          const svcIds = (data || []).map((s: any) => s.id).filter(Boolean)
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

            const merged = (data || []).map((svc: any) => {
              const bs = bookingsByService[svc.id] || []
              if (!bs.length) return svc
              // If there's any approved booking that is not completed, consider service closed/booked
              const hasApproved = bs.some((b: any) => b.status === 'approved')
              const hasCompleted = bs.some((b: any) => b.status === 'completed')
              if (hasApproved && !hasCompleted) {
                return { ...svc, status: 'closed' }
              }
              // If most recent booking is completed, leave the service open
              if (bs[0] && bs[0].status === 'completed') {
                return { ...svc, status: 'open' }
              }
              return svc
            })

            setServices(merged)
          }
        } catch (e) {
          console.warn('[services] could not infer service status from bookings', e)
        }

        // Extract unique categories and add "All" at the beginning
        const uniqueCategories = Array.from(new Set((data || []).map((service: Service) => service.category)))
        setCategories(["All", ...uniqueCategories])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()

    // Subscribe to real-time updates
    const servicesSubscription = supabase
      .channel('services-changes')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'services'
        }, 
        async (payload) => {
          // Fetch the complete service data including profile information
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { data: newService } = await supabase
              .from('services')
              .select(`
                *,
                profiles:provider_id (
                  full_name,
                  avatar_url,
                  location,
                  profile_tier
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (newService) {
              if (payload.eventType === 'INSERT') {
                setServices(current => [newService, ...current])
              } else {
                setServices(current => 
                  current.map(service => 
                    service.id === newService.id ? newService : service
                  )
                )
              }
            }
          } else if (payload.eventType === 'DELETE') {
            setServices(current => 
              current.filter(service => service.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    // Also subscribe to profile updates so avatar/name changes reflect in listings
    const profilesSubscription = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload: any) => {
        const updatedProfile = payload.new
        if (!updatedProfile) return
        setServices(current =>
          current.map(s =>
            s.provider_id === updatedProfile.id
              ? { ...s, profiles: { ...(s.profiles || {}), full_name: updatedProfile.full_name, avatar_url: updatedProfile.avatar_url, location: updatedProfile.location } }
              : s
          )
        )
      })
      .subscribe()

    return () => {
      servicesSubscription.unsubscribe()
      profilesSubscription.unsubscribe()
    }
  }, [])

  const filteredServices = services.filter((service: Service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.category.toLowerCase().includes(search.toLowerCase()) ||
      service.profiles.full_name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !selectedCategory || selectedCategory === "All" || service.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">L</span>
            </div>
            <span className="font-bold text-xl text-white">LocalFix Kenya</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/bookings">
              <Button variant="ghost" className="text-white hover:text-white/80">My Bookings</Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" className="text-white hover:text-white/80">Profile</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <section className="bg-secondary/50 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white mb-6">Find Service Providers</h1>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or service..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Results */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {categories.map((category, index) => (
            <Button
              key={`${category}-${index}`}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-white/80">Loading services...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.length === 0 ? (
              <div className="col-span-full text-center text-white/80">
                No services found matching your criteria.
              </div>
            ) : (
              filteredServices.map((service) => (
                <Card key={service.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-card/50 backdrop-blur-sm border-0">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden">
                        {service.profiles.avatar_url ? (
                          <img
                            src={service.profiles.avatar_url}
                            alt={service.profiles.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl text-primary">{service.profiles.full_name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white/80">{service.profiles.full_name}</p>
                          <TierBadge tier={(service.profiles.profile_tier || "basic") as "basic" | "pro" | "verified" | "trusted" | "elite"} size="sm" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-white/80">{service.description}</p>
                      <p className="text-sm font-medium text-white/80">{service.category}</p>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-white/60" />
                        <span className="text-sm text-white/80">{service.profiles.location}</span>
                      </div>
                      <p className="text-primary font-medium">KES {service.price.toLocaleString()}</p>
                      <p className="text-sm text-white/60">{service.duration}</p>
                    </div>

                    <Link href={`/provider/${service.provider_id}`}>
                      <Button className="w-full">View & Book</Button>
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  )
}
