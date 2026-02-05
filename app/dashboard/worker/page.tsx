"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import ReviewModal from "@/components/ui/review-modal"
import { Card } from "@/components/ui/card"
import { LogOut, MapPin, Bell, User, Plus, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import JobChat from "@/components/ui/job-chat"
import ConfirmModal from '@/components/ui/confirm-modal'
import EditProfileModal from "@/components/EditProfileModal"
import { updateJobStatus } from '@/lib/job-utils'
import { canTransitionJobStatus, getJobStatusColor, type JobStatus } from '@/lib/job-types'
// Input component removed as "Available Jobs" feed is no longer shown here
import { TierBadge } from "@/components/TierBadge"


interface Job {
  id: string
  title: string
  location: string
  budget: number
  duration: string
  category: string
  client_id?: string
  profiles?: {
    full_name: string
    avatar_url?: string | null
    profile_tier?: string
  }
  status: string  // Make status required
}

interface Application {
  id: string
  job_id: string
  status: string
  proposed_rate: number
  jobs?: Job
  client_contact_revealed?: boolean
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  client_id?: string
  booking_id?: string
  job_id?: string
  profiles: {
    full_name: string
    avatar_url: string | null
  }
}

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: string
  provider_id: string
  location?: string
  status?: string
}

interface Booking {
  id: string
  service_id: string
  booking_date: string
  status: string
  notes?: string
  client_id: string
  profiles: {
    full_name: string
    avatar_url: string | null
    email: string
    phone?: string
    location?: string
    profile_tier?: string
  }
  services: {
    name: string
    price: number
    duration: string
  }
}

export default function WorkerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  // Removed available jobs state (feed removed from worker dashboard)
    // Removed available jobs list (worker no longer sees global available jobs here)
  const [job_applications, setJob_applications] = useState<Application[]>([])
  const [workerServices, setWorkerServices] = useState<Service[]>([])
  // Small "Find Jobs" feed for workers to discover and apply to recent open jobs
  const [availableJobs, setAvailableJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceBookings, setServiceBookings] = useState<Booking[]>([])
  const [recentClientBookings, setRecentClientBookings] = useState<Booking[]>([])
  const [workerReviews, setWorkerReviews] = useState<Review[]>([])
  const [serviceBookingsLoading, setServiceBookingsLoading] = useState(() => new Set<string>())
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewContext, setReviewContext] = useState<{
    type: 'booking' | 'job'
    id: string
    client_id?: string
  } | null>(null)
  const [openChatAppId, setOpenChatAppId] = useState<string | null>(null)
  const [openChatBookingId, setOpenChatBookingId] = useState<string | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [reviewedBookingIdsWorker, setReviewedBookingIdsWorker] = useState(() => new Set<string>())
  const [reviewedJobIdsWorker, setReviewedJobIdsWorker] = useState(() => new Set<string>())
  const [confirmAction, setConfirmAction] = useState<{
    jobId: string
    newStatus: JobStatus
    title?: string
    message?: string
  } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingApplicationIds, setDeletingApplicationIds] = useState<Set<string>>(() => new Set<string>())
  const [deletingServiceIds, setDeletingServiceIds] = useState<Set<string>>(() => new Set<string>())
  const [deletingBookingIdsWorker, setDeletingBookingIdsWorker] = useState<Set<string>>(() => new Set<string>())
  const [editProfileOpen, setEditProfileOpen] = useState(false)

  const makePrintable = (err: any) => {
    if (!err) return 'Unknown error'
    if (typeof err === 'string') return err
    if (err?.message) return err.message
    try {
      const names = Object.getOwnPropertyNames(err)
      const data: Record<string, any> = {}
      names.forEach((n) => (data[n] = err[n]))
      return JSON.stringify(data)
    } catch {
      return String(err)
    }
  }

  // Helper: set service status locally and persist to DB (only for this provider)
  const setAndPersistServiceStatus = async (serviceId: string, newStatus: string) => {
    try {
      // Update local state first for responsive UI
      setWorkerServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, status: newStatus } : s)));

      // Persist change to DB (RLS allows provider to update their own services)
      const { data: svcData, error: svcErr } = await supabase
        .from('services')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', serviceId)
        .select('*')
        .single();

      if (svcErr) {
        console.warn('[worker] Failed to persist service status change (client). Falling back to server endpoint', svcErr);
        // Try server-side fallback which uses the service-role key to bypass RLS
        try {
          const resp = await fetch('/api/services/set-status', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceId, status: newStatus }),
          })

          const text = await resp.text().catch(() => '')
          let body: any = null
          try { body = text ? JSON.parse(text) : null } catch (e) { body = text }

          if (!resp.ok) {
            const raw = text || ''
            console.error('[worker] Server fallback failed to persist service status:', { status: resp.status, statusText: resp.statusText, body, raw })
            alert(`Failed to persist service status (server): ${resp.status} ${resp.statusText} - ${JSON.stringify(body) || raw}`)
            return null
          }

          const updatedService = body?.updated || null
          if (updatedService) {
            setWorkerServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, ...updatedService } : s)));
            return updatedService
          }
          return null
        } catch (e) {
          console.warn('[worker] Error calling server fallback for service status:', e)
          return null
        }
      }

      // Reflect any DB-normalized fields back into state
      if (svcData) {
        setWorkerServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, ...svcData } : s)));
      }

      return svcData;
    } catch (e) {
      console.warn('[worker] Error persisting service status:', e);
      return null;
    }
  }
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get authenticated user
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.push("/login")
          return
        }

        setUser(authUser)

        // Fetch user profile from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle()

        if (profileError) {
          // Avoid logging opaque empty objects directly. Create a printable representation.
          const printable = makePrintable(profileError)
          console.warn('[v0] Profile fetch issue:', printable)

          // Try server-side fallback which uses the service role key and validates session
          try {
            const resp = await fetch('/api/admin/profile', { credentials: 'include' })
            if (resp.ok) {
              const body = await resp.json()
              if (body?.data) {
                setProfile(body.data)
              } else {
                console.warn('[v0] server-side profile fallback returned no data')
              }
            } else {
              console.warn('[v0] server-side profile fallback failed:', await resp.text())
            }
          } catch (e) {
            console.warn('[v0] server-side profile fallback error:', makePrintable(e))
          }
        } else {
          setProfile(profileData || null)
        }

        // Global "Available Jobs" feed removed from worker dashboard; we keep job_applications and bookings flows.

        // Fetch user's job_applications from job_applications table
        const { data: applicationsData } = await supabase
          .from("job_applications")
          .select("*, jobs(*, profiles(full_name, avatar_url, profile_tier, email, phone, location))")
          .eq("provider_id", authUser.id)
          .order("created_at", { ascending: false })

          setJob_applications(applicationsData || [])

          // Fetch a small, recent list of open jobs for the worker dashboard (limit to 5)
          // LOCATION-BASED FILTERING: Only show jobs matching user's location
          try {
            const userLocation = profileData?.location
            
            let jobsQuery = supabase
              .from('jobs')
              .select('id, title, location, budget, duration, status, client_id, profiles(full_name, avatar_url, profile_tier)')
              .eq('status', 'open')
              .neq('client_id', authUser.id)
              .order('created_at', { ascending: false })
            
            // If user has a location set, filter jobs by that location
            if (userLocation && userLocation.trim()) {
              jobsQuery = jobsQuery.ilike('location', `%${userLocation}%`)
            }
            
            const { data: jobsData, error: jobsError } = await jobsQuery.limit(5)

            if (!jobsError) {
              setAvailableJobs(jobsData || [])
            } else {
              console.warn('[worker] failed to fetch available jobs feed:', makePrintable(jobsError))
            }
          } catch (e) {
            console.warn('[worker] error fetching available jobs feed:', e)
          }

        // Fetch worker's services (include status & location) with retry and server fallback
        let servicesData: any = null
        let servicesError: any = null
        try {
          const res = await supabase
            .from('services')
            .select('*')
            .eq('provider_id', authUser.id)
            .order('created_at', { ascending: false })
          servicesData = res.data
          servicesError = res.error
        } catch (e: any) {
          servicesError = e
        }

        if (servicesError) {
          console.warn('[worker] initial services read failed, retrying:', servicesError)
          await new Promise((r) => setTimeout(r, 300))
          try {
            const res2 = await supabase
              .from('services')
              .select('*')
              .eq('provider_id', authUser.id)
              .order('created_at', { ascending: false })
            servicesData = res2.data
            servicesError = res2.error
          } catch (e: any) {
            servicesError = e
          }
        }

        if (servicesError) {
          // fallback to server-side debug endpoint and filter by provider id
          try {
            const resp = await fetch('/api/debug/services', { credentials: 'include' })
            if (resp.ok) {
              const body = await resp.json()
              const all = body?.data || []
              servicesData = (all || []).filter((s: any) => s.provider_id === authUser.id)
            } else {
              console.error('[worker] server-side services fallback failed:', await resp.text())
            }
          } catch (e) {
            console.error('[worker] services fetch failed (all fallbacks):', e)
          }
        }

        if (servicesData) {
          // Try to infer service status from recent bookings in case the
          // `services.status` column is stale or wasn't updated (helps when
          // RLS or transient errors prevented persisting status changes).
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

            setWorkerServices(mergedServices)
            // Fetch bookings for these services (use merged so UI reflects inferred status)
            await fetchBookings(mergedServices || [])
          } catch (e) {
            console.warn('[worker] could not infer service status from bookings', e)
            setWorkerServices(servicesData || [])
            await fetchBookings(servicesData || [])
          }

          // Fetch reviews for this worker
          const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select(`
              *,
              reviewer:reviewer_id (
                full_name,
                avatar_url
              ),
              reviewee:reviewee_id (
                full_name,
                avatar_url
              )
            `)
            .eq('provider_id', authUser.id)
            .order('created_at', { ascending: false })

          if (reviewsError) {
            console.error('Error fetching reviews:', makePrintable(reviewsError))
            // Fallback: fetch without relationships
            const { data: fallbackReviews, error: fallbackError } = await supabase
              .from('reviews')
              .select('*')
              .eq('provider_id', authUser.id)
              .order('created_at', { ascending: false })
            
            if (!fallbackError) {
              setWorkerReviews(fallbackReviews || [])
            }
          } else {
            setWorkerReviews(reviewsData || [])
            // Create Sets from the review data
            const bookingIds = new Set((reviewsData || [])
              .filter(r => r.booking_id)
              .map(r => r.booking_id))
            const jobIds = new Set((reviewsData || [])
              .filter(r => r.job_id)
              .map(r => r.job_id))
            
            setReviewedBookingIdsWorker(() => new Set(bookingIds))
            setReviewedJobIdsWorker(() => new Set(jobIds))
          }
        }
      } catch (err) {
        console.error("[v0] Error fetching dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()

    // Realtime subscriptions for jobs and bookings
    let sub: any = null
    // removed job update handler; workers no longer receive a global available-jobs feed here
      // Workers no longer subscribe to global job insert/update events for an "Available Jobs" feed.

    const handleBookingChange = async (payload: any) => {
      try {
        const booking = payload.new
        if (!booking) return

        // Fetch related profile and service data
        const [{ data: profileData }, { data: serviceData }] = await Promise.all([
          supabase.from('profiles').select('id, full_name, avatar_url, email, profile_tier').eq('id', booking.client_id),
          supabase.from('services').select('id, provider_id, name, price, duration').eq('id', booking.service_id)
        ])

        const enrichedBooking = {
          ...booking,
          profiles: (profileData || [])[0] || null,
          services: (serviceData || [])[0] || null
        }

        // Update recent bookings list
        setRecentClientBookings(prev => {
          const exists = prev.find(b => b.id === booking.id)
          if (exists) {
            return prev.map(b => b.id === booking.id ? enrichedBooking : b)
          }
          return [enrichedBooking, ...prev.slice(0, 9)] // Keep last 10
        })

        // Also update service bookings if the service belongs to this worker
        const serviceRow = (serviceData || [])[0] || null
        if (serviceRow && serviceRow.provider_id === user?.id) {
          setServiceBookings(prev => {
            const exists = prev.find(b => b.id === booking.id)
            if (exists) {
              return prev.map(b => b.id === booking.id ? enrichedBooking : b)
            }
            return [enrichedBooking, ...prev]
          })

          // If booking status implies a service status change, update it
          try {
            if (booking.status === 'approved') {
              // When a booking is approved, mark the service as closed/booked
              await setAndPersistServiceStatus(serviceRow.id, 'closed')
            } else if (booking.status === 'completed' || booking.status === 'rejected' || booking.status === 'cancelled') {
              // When completed/rejected/cancelled, free the service back to open
              await setAndPersistServiceStatus(serviceRow.id, 'open')
            }
          } catch (e) {
            console.warn('Error updating service status from booking change:', e)
          }
        }
      } catch (err) {
        console.error('Error handling booking change:', err)
      }
    }

    // Feature-detect newer channel API vs older from().on() subscription
      try {
      if ((supabase as any).channel) {
        // Subscribe to all booking changes for real-time updates (no global jobs feed here)
        const bookingsSub = (supabase as any)
          .channel("public:bookings")
          .on("postgres_changes", 
            { event: "*", schema: "public", table: "bookings" },
            async (payload: any) => {
              try {
                // Handle all booking changes
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                  const bookingRow = payload.new;
                  await handleBookingChange(payload);

                  // Also update service-specific bookings if applicable
                  const myServiceIds = workerServices.map((s: Service) => s.id);
                  if (bookingRow && myServiceIds.includes(bookingRow.service_id)) {
                    const [profileRes, serviceRes] = await Promise.all([
                      supabase.from('profiles').select('id, full_name, avatar_url, email').eq('id', bookingRow.client_id),
                      supabase.from('services').select('id, provider_id, name, price, duration').eq('id', bookingRow.service_id),
                    ]);

                    const profileRow = profileRes?.data?.[0] ?? null;
                    const serviceRow = serviceRes?.data?.[0] ?? null;

                    // If service belongs to this worker, update service bookings
                    if (serviceRow && serviceRow.provider_id === user?.id) {
                      const enrichedBooking = {
                        ...bookingRow,
                        profiles: profileRow || null,
                        services: serviceRow || null,
                      };

                      setServiceBookings((current) =>
                        current.some((b) => b.id === enrichedBooking.id)
                          ? current.map((b) => (b.id === enrichedBooking.id ? enrichedBooking : b))
                          : [enrichedBooking, ...current]
                      );

                      // Also ensure service status is kept in sync with booking status
                      try {
                        if (bookingRow.status === 'approved') {
                          await setAndPersistServiceStatus(serviceRow.id, 'closed')
                        } else if (bookingRow.status === 'completed' || bookingRow.status === 'rejected' || bookingRow.status === 'cancelled') {
                          await setAndPersistServiceStatus(serviceRow.id, 'open')
                        }
                      } catch (e) {
                        console.warn('[worker] could not persist service status from realtime payload', e)
                      }
                    }
                  }
                } else if (payload.eventType === 'DELETE') {
                  setServiceBookings((current) => current.filter((b) => b.id !== payload.old.id));
                  setRecentClientBookings((current) => current.filter((b) => b.id !== payload.old.id));
                }
              } catch (e) {
                console.error('Error handling booking realtime payload:', makePrintable(e));
              }
            }
          )
          .subscribe()

        sub = { bookingsSub }
      } else if ((supabase as any).from) {
        // older API: subscribe only to bookings changes (skip jobs)
        const bookingsInsert = (supabase as any)
          .from("bookings")
          .on("INSERT", (payload: any) => {
            handleBookingChange(payload)
          })
          .subscribe()

        const bookingsUpdate = (supabase as any)
          .from("bookings")
          .on("UPDATE", (payload: any) => {
            handleBookingChange(payload)
          })
          .subscribe()

        sub = { bookingsInsert, bookingsUpdate }
      }
    } catch (e) {
      console.warn("Realtime subscription failed:", e)
    }

    return () => {
      // cleanup realtime subscriptions
      try {
        if (!sub) return
        if ((supabase as any).channel && sub.unsubscribe) {
          sub.unsubscribe()
        } else if (sub.insertSub || sub.updateSub) {
          sub.insertSub.unsubscribe()
          sub.updateSub.unsubscribe()
        }
      } catch (e) {
        console.warn("Error unsubscribing realtime:", e)
      }
    }
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        alert('Error deleting account: ' + (data.error || 'Unknown error'))
        setDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      alert('Your account has been permanently deleted.')
      window.location.href = '/'
    } catch (err: any) {
      alert('Error deleting account: ' + err.message)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleEditService = (service: Service) => {
    router.push(`/services/offer?edit=${service.id}`)
  }

  // applyToJob removed — worker dashboard no longer shows the global available jobs feed

    const handleToggleServiceStatus = async (serviceId: string, isOpen: boolean) => {
      try {
        const newStatus = isOpen ? 'open' : 'closed';
        const { data, error } = await supabase
          .from('services')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', serviceId)
          .eq('provider_id', user?.id)
          .select('*')
          .single();

        if (error) {
          console.error('Error toggling service status:', makePrintable(error));
          alert(`Failed to update service status: ${error.message || String(error)}`);
          return;
        }

        if (data) {
          setWorkerServices((prev) => prev.map((service) => (service.id === serviceId ? { ...service, status: newStatus } : service)));
          alert(`Service ${newStatus} successfully`);
        }
      } catch (err: any) {
        console.error('Error toggling service:', err?.message || err);
        alert('An unexpected error occurred while updating service status');
      }
    };

    const fetchBookings = async (services: Service[]) => {
      if (!services.length) return;

      const serviceIds = services.map((s) => s.id);
      try {
        // Fetch bookings for worker's services with joined profile/service data
        console.log('Debug: fetching bookings, user id =', user?.id, 'serviceIds =', serviceIds);
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            *,
            profiles:client_id (
              id,
              full_name,
              avatar_url,
              email, phone, location, 
              profile_tier
            ),
            services (
              id,
              provider_id,
              name,
              price,
              duration
            )
          `)
          .in('service_id', serviceIds)
          .order('booking_date', { ascending: false });

        if (bookingsError) {
          console.error('Error fetching bookings:', makePrintable(bookingsError));
          return;
        }

        let allBookings = bookingsData || [];

        // If the batched .in() returned nothing, try per-service fetch to help debugging (RLS may block batched query)
        if ((!allBookings || allBookings.length === 0) && serviceIds.length > 0) {
          console.warn('Batched fetch returned no bookings — trying per-service fetch as fallback for debugging');
          const perServiceResults = await Promise.all(
            serviceIds.map((sid) =>
              supabase
                .from('bookings')
                .select(`
                  *,
                  profiles:client_id (
                    id,
                    full_name,
                    avatar_url,
                    email, phone, location, 
                    profile_tier
                  ),
                  services (
                    id,
                    provider_id,
                    name,
                    price,
                    duration
                  )
                `)
                .eq('service_id', sid)
                .order('booking_date', { ascending: false })
                .then((r) => ({ sid, ...r }))
            )
          );

          perServiceResults.forEach((r: any) => {
            if (r.error) {
              console.warn('Per-service fetch error for', r.sid, makePrintable(r.error));
            } else if (r.data && r.data.length) {
              allBookings = allBookings.concat(r.data);
            }
          });
        }

        if (allBookings && allBookings.length) {
          const filtered = allBookings.filter((b: any) =>
            b.services && services.some((s) => s.id === b.services.id)
          );

          setServiceBookings(filtered);

          const recentBookings = [...filtered]
            .sort((a: any, b: any) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())
            .slice(0, 10);

          setRecentClientBookings(recentBookings);
        } else {
          console.info('No bookings found for services:', serviceIds);
        }
      } catch (err) {
        console.error('Error fetching bookings:', makePrintable(err));
      }
    };

    const handleApproveBooking = async (bookingId: string) => {
      try {
        const res = await fetch('/api/bookings/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId }),
        });

        const updated = await res.json();

        if (!res.ok) {
          const errorMessage = updated?.error 
            ? `${updated.error}${updated.details ? `: ${updated.details}` : ''}`
            : 'Unknown error';
          console.error('Failed to approve booking:', errorMessage);
          alert(`Failed to approve booking: ${errorMessage}`);
          return;
        }

        setServiceBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
        setRecentClientBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));

        // Update local service status: when booking is approved, mark service as 'closed' (booked)
        try {
          const svcId = updated?.services?.id || updated?.service_id
          if (svcId) {
            setWorkerServices((prev) => prev.map((s) => (s.id === svcId ? { ...s, status: 'closed' } : s)));
            // Persist status change to DB so it doesn't remain pending on the server
            try {
              const { data: svcData, error: svcErr } = await supabase
                .from('services')
                .update({ status: 'closed', updated_at: new Date().toISOString() })
                .eq('id', svcId)
                .eq('provider_id', user?.id)
                .select('*')
                .single()

              if (svcErr) {
                console.warn('Failed to persist service status change after booking approval', svcErr)
              } else if (svcData) {
                setWorkerServices((prev) => prev.map((s) => (s.id === svcId ? { ...s, ...svcData } : s)));
              }
            } catch (e) {
              console.warn('Error persisting service status after approval', e)
            }
          }
        } catch (e) {
          console.warn('Failed to update service status locally after approval', e)
        }

        alert('Booking approved successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        console.error('Error approving booking:', err);
        alert(`Failed to approve booking: ${errorMessage}`);
      }
    };

    const handleRejectBooking = async (bookingId: string) => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected' }),
        });

        const updated = await res.json();

        if (!res.ok) {
          const errorMessage = updated?.error 
            ? `${updated.error}${updated.details ? `: ${updated.details}` : ''}`
            : 'Unknown error';
          console.error('Failed to reject booking:', errorMessage);
          alert(`Failed to reject booking: ${errorMessage}`);
          return;
        }

        setServiceBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
        setRecentClientBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));

        // Update local service status: keep service open after rejection
        try {
          const svcId = updated?.services?.id || updated?.service_id
          if (svcId) {
            setWorkerServices((prev) => prev.map((s) => (s.id === svcId ? { ...s, status: 'open' } : s)));
            // Persist status change to DB so it remains open for new bookings
            try {
              const { data: svcData, error: svcErr } = await supabase
                .from('services')
                .update({ status: 'open', updated_at: new Date().toISOString() })
                .eq('id', svcId)
                .eq('provider_id', user?.id)
                .select('*')
                .single()

              if (svcErr) {
                console.warn('Failed to persist service status change after booking rejection', svcErr)
              } else if (svcData) {
                setWorkerServices((prev) => prev.map((s) => (s.id === svcId ? { ...s, ...svcData } : s)));
              }
            } catch (e) {
              console.warn('Error persisting service status after rejection', e)
            }
          }
        } catch (e) {
          console.warn('Failed to update service status locally after rejection', e)
        }

        alert('Booking rejected successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        console.error('Error rejecting booking:', err);
        alert(`Failed to reject booking: ${errorMessage}`);
      }
    };

    const handleDeleteApplication = async (applicationId: string) => {
      if (!applicationId) return;
      if (!confirm('Permanently delete this application? This cannot be undone.')) return;
      setDeletingApplicationIds(prev => new Set(prev).add(applicationId));
      try {
        const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const token = session?.access_token || (session as any)?.accessToken || null;

        const res = await fetch(`/api/job-applications/${applicationId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });

        const text = await res.text();
        let body: any = null;
        try { body = text ? JSON.parse(text) : null } catch (e) { body = text }

        if (!res.ok) {
          const errMsg = body?.error || body || text || 'Failed to delete application';
          console.error('Delete application failed:', { status: res.status, body });
          alert(errMsg);
          return;
        }

        setJob_applications(prev => (prev || []).filter(a => a.id !== applicationId));
        alert('Application deleted');
      } catch (err) {
        console.error('Error deleting application:', err);
        alert('Failed to delete application: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setDeletingApplicationIds(prev => {
          const next = new Set(prev);
          next.delete(applicationId);
          return next;
        });
      }
    };

    const handleDeleteService = async (serviceId: string) => {
      if (!serviceId) return;
      if (!confirm('Permanently delete this service? This cannot be undone.')) return;
      setDeletingServiceIds(prev => new Set(prev).add(serviceId));
      try {
        const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const token = session?.access_token || (session as any)?.accessToken || null;

        const res = await fetch(`/api/services/${serviceId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });

        const text = await res.text();
        let body: any = null;
        try { body = text ? JSON.parse(text) : null } catch (e) { body = text }

        if (!res.ok) {
          const printable = makePrintable(body ?? text ?? { status: res.status });
          console.error(`Delete service failed: ${res.status} ${res.statusText || ''} - ${printable}`);
          alert(printable || `Failed to delete service (status ${res.status})`);
          return;
        }

        setWorkerServices(prev => (prev || []).filter(s => s.id !== serviceId));
        alert('Service deleted');
      } catch (err) {
        console.error('Error deleting service:', err);
        alert('Failed to delete service: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setDeletingServiceIds(prev => {
          const next = new Set(prev);
          next.delete(serviceId);
          return next;
        });
      }
    };

    const handleDeleteBookingWorker = async (bookingId: string) => {
      if (!bookingId) return;
      if (!confirm('Permanently delete this booking? This cannot be undone.')) return;
      setDeletingBookingIdsWorker(prev => new Set(prev).add(bookingId));
      try {
        const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const token = session?.access_token || (session as any)?.accessToken || null;

        const res = await fetch(`/api/bookings/${bookingId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });

        const text = await res.text();
        let body: any = null;
        try { body = text ? JSON.parse(text) : null } catch (e) { body = text }

        if (!res.ok) {
          const errMsg = body?.error || body || text || 'Failed to delete booking';
          console.error('Delete booking (worker) failed:', { status: res.status, body });
          alert(errMsg);
          return;
        }

        setServiceBookings(prev => (prev || []).filter(b => b.id !== bookingId));
        setRecentClientBookings(prev => (prev || []).filter(b => b.id !== bookingId));
        alert('Booking deleted');
      } catch (err) {
        console.error('Error deleting booking (worker):', err);
        alert('Failed to delete booking: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setDeletingBookingIdsWorker(prev => {
          const next = new Set(prev);
          next.delete(bookingId);
          return next;
        });
      }
    };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header with Action Buttons */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back, {profile?.full_name || "Worker"}
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage your services and monitor bookings
              </p>
            </div>
          </div>
          {/* Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Button onClick={() => setEditProfileOpen(true)} className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-2">
              <User className="w-4 h-4" />
              Edit Profile
            </Button>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="flex items-center justify-center gap-2 bg-transparent text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
              Delete Account
            </Button>
            <Button variant="outline" onClick={handleLogout} className="flex items-center justify-center gap-2 bg-transparent">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>



      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4 border-destructive/50">
            <h2 className="text-2xl font-bold text-destructive mb-2">⚠️ Delete Account Permanently</h2>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
              <p className="text-foreground font-semibold mb-2">This action is IRREVERSIBLE!</p>
              <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                <li>Your account will be permanently deleted</li>
                <li>All your services and data will be erased</li>
                <li>You cannot recover this account</li>
                <li>This cannot be undone</li>
              </ul>
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              Are you absolutely sure you want to proceed? This action cannot be reversed.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                className="flex-1"
                disabled={deleting}
              >
                Cancel - Keep My Account
              </Button>
              <Button
                onClick={handleDeleteAccount}
                variant="destructive"
                className="flex-1"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Forever'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Service Status Controls */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">My Services Status</h2>
            <Link href="/services/offer">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add New Service
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workerServices?.map((service) => (
              <Card key={service.id} className="p-4 bg-card/50">
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        KES {service.price.toLocaleString()} • {service.duration}
                      </p>
                      {service.location && (
                        <p className="text-sm text-muted-foreground flex items-center mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          {service.location}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      service.status === 'open' 
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {service.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleToggleServiceStatus(service.id, service.status === 'closed')}
                      variant={service.status === 'open' ? 'destructive' : 'default'}
                      className="flex-1"
                    >
                      {service.status === 'open' ? 'Close Service' : 'Open Service'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/services/offer?edit=${service.id}`)}
                      className="px-3"
                      disabled={serviceBookings.some(b => b.service_id === service.id && b.status === 'approved')}
                      title={serviceBookings.some(b => b.service_id === service.id && b.status === 'approved') ? 'Cannot edit service with approved bookings' : 'Edit service'}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Available Jobs removed from worker dashboard */}

            {/* Find Jobs - small feed so workers can open job details and apply */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Find Jobs</h2>
              <div className="space-y-3">
                {availableJobs.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-muted-foreground">No open jobs right now. Check back soon.</p>
                  </Card>
                ) : (
                  availableJobs.map((j) => (
                    <Card key={j.id} className="p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{j.title}</h3>
                        <p className="text-sm text-muted-foreground">{j.location} • KES {String(j.budget || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/jobs/${j.id}`}>
                          <Button className="bg-primary hover:bg-primary/90">View / Apply</Button>
                        </Link>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* My job_applications */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">My job_applications</h2>
              <div className="space-y-3">
                {job_applications.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-muted-foreground">You haven't applied for any jobs yet</p>
                  </Card>
                ) : (
                  job_applications.map((app) => (
                    <Card key={app.id} className="p-4">
                        {/* Client Avatar and Tier - Show BEFORE acceptance for decision making */}
                        {app.jobs?.profiles && (
                          <Link href={`/profile/${app.jobs.profiles.id}`}>
                            <div className="mb-4 pb-4 border-b border-border hover:bg-muted/50 rounded p-2 transition-colors cursor-pointer">
                              <p className="text-xs text-muted-foreground mb-2">Posted By</p>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                                  {app.jobs.profiles.avatar_url ? (
                                    <img
                                      src={app.jobs.profiles.avatar_url}
                                      alt="Client avatar"
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-5 h-5 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  {app.status === 'accepted' ? (
                                    <>
                                      <p className="font-medium text-foreground">{app.jobs.profiles.full_name}</p>
                                      {app.jobs.profiles.email && (
                                        <p className="text-xs text-muted-foreground">{app.jobs.profiles.email}</p>
                                      )}
                                      {app.jobs.profiles.phone && (
                                        <p className="text-xs text-muted-foreground">{app.jobs.profiles.phone}</p>
                                      )}
                                      {app.jobs.profiles.location && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                          <MapPin className="w-3 h-3" />
                                          {app.jobs.profiles.location}
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      {app.jobs.profiles.profile_tier && (
                                        <TierBadge tier={app.jobs.profiles.profile_tier} size="sm" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        )}

                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{app.jobs?.title}</h3>
                            <p className="text-sm text-muted-foreground">Proposed Rate: KES {app.proposed_rate}</p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                app.status === "accepted"
                                  ? "bg-green-100 text-green-700"
                                  : app.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                            </span>
                            {app.status !== 'pending' && (
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteApplication(app.id)}
                                  disabled={deletingApplicationIds.has(app.id)}
                                >
                                  {deletingApplicationIds.has(app.id) ? 'Deleting...' : 'Delete'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Buttons for accepted applications: complete + review + chat */}
                        <div className="mt-3 flex flex-col gap-2">
                          {app.status === 'accepted' && app.jobs?.status === 'open' && (
                            <Button
                              onClick={() => setConfirmAction({ jobId: app.job_id, newStatus: 'completed', title: 'Complete Job', message: 'Mark this job as completed? This will allow reviews.' })}
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Mark Job as Completed
                            </Button>
                          )}

                          {app.status === 'accepted' && app.jobs?.status === 'completed' && !reviewedJobIdsWorker.has(app.job_id) && (
                            <Button
                              onClick={() => {
                                setReviewContext({ type: 'job', id: app.job_id, client_id: app.jobs?.client_id })
                                setReviewModalOpen(true)
                              }}
                              size="sm"
                              className="w-full bg-primary hover:bg-primary/90 text-white"
                            >
                              Review Client
                            </Button>
                          )}

                          {/* Start Chat for this application */}
                          {app.status === 'accepted' && (
                            <div>
                              {openChatAppId === app.id ? (
                                <div className="mt-2">
                                  <JobChat
                                    jobId={app.job_id}
                                    jobApplicationId={app.id}
                                    recipientId={app.jobs?.client_id || ''}
                                    recipientName={app.jobs?.profiles?.full_name || 'Client'}
                                    currentUserId={user?.id || ''}
                                    onUnreadCountChange={(count) => setUnreadCounts(prev => ({ ...prev, [app.id]: count }))}
                                  />
                                  <Button size="sm" variant="outline" className="mt-2" onClick={() => setOpenChatAppId(null)}>Close Chat</Button>
                                </div>
                              ) : (
                                <Button size="sm" className="w-full bg-primary text-white relative" onClick={() => setOpenChatAppId(app.id)}>
                                  Start Chat
                                  {unreadCounts[app.id] && unreadCounts[app.id] > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                      {unreadCounts[app.id]}
                                    </span>
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Profile Card */}
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-0">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{profile?.full_name || "No Name"}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email || user?.email}</p>
                </div>
              </div>
              
              {/* Tier Badge */}
              {profile?.profile_tier && (
                <div className="mb-4">
                  <TierBadge 
                    tier={profile.profile_tier as any} 
                    size="sm" 
                    showLabel={true}
                    className="w-full justify-center"
                  />
                </div>
              )}
              
              {/* Tier Stats */}
              {profile?.avg_rating !== undefined && (
                <div className="mb-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <p className="font-bold text-foreground">{profile.avg_rating?.toFixed(1) || "0.0"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">Reviews</p>
                    <p className="font-bold text-foreground">{profile.total_reviews || 0}</p>
                  </div>
                </div>
              )}
              
              <Link href="/profile?edit=1">
                <Button variant="outline" className="w-full bg-transparent">
                  Edit Profile
                </Button>
              </Link>
            </Card>

            {/* My Services */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">My Services</h3>
                <Button
                  variant="outline"
                  className="text-sm"
                  onClick={() => router.push('/services/offer')}
                >
                  Offer New Service
                </Button>
              </div>
              <div className="space-y-3">
                {workerServices?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No services offered yet</p>
                ) : (
                  workerServices?.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">KES {service.price} • {service.location || 'No location'}</p>
                        <p className="text-xs mt-1">Status: <strong>{service.status || 'pending'}</strong></p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditService(service)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteService(service.id)}
                          disabled={deletingServiceIds.has(service.id)}
                        >
                          {deletingServiceIds.has(service.id) ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Service Bookings */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Recent Bookings</h3>
              </div>
              <div className="space-y-4">
                {serviceBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings yet</p>
                ) : (
                  serviceBookings.map((booking) => (
                    <div key={booking.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                            {booking.profiles.avatar_url ? (
                              <img
                                src={booking.profiles.avatar_url}
                                alt="Client avatar"
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div>
                            {booking.status === 'approved' ? (
                              <>
                                <p className="font-medium text-foreground">{booking.profiles.full_name}</p>
                                {booking.profiles.email && (
                                  <p className="text-xs text-muted-foreground">{booking.profiles.email}</p>
                                )}
                                {booking.profiles.phone && (
                                  <p className="text-xs text-muted-foreground">{booking.profiles.phone}</p>
                                )}
                                {booking.profiles.location && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {booking.profiles.location}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                {booking.profiles.profile_tier && (
                                  <div className="flex items-center gap-2">
                                    <TierBadge tier={booking.profiles.profile_tier} size="sm" />
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground">Details revealed after approval</p>
                              </>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          booking.status === 'approved' 
                            ? 'bg-green-500/20 text-green-400'
                            : booking.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {booking.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{booking.services.name}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="text-foreground">{new Date(booking.booking_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="text-foreground">KES {booking.services.price.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="text-foreground">{booking.services.duration}</span>
                        </div>
                        {booking.status === 'completed' && (
                          <div className="mt-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async (e) => { e.preventDefault(); await handleDeleteBookingWorker(booking.id); }}
                              disabled={deletingBookingIdsWorker.has(booking.id)}
                            >
                              {deletingBookingIdsWorker.has(booking.id) ? 'Deleting...' : 'Delete Booking'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {booking.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          "{booking.notes}"
                        </p>
                      )}

                      {booking.status === 'pending' && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button
                            onClick={() => handleApproveBooking(booking.id)}
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleRejectBooking(booking.id)}
                            size="sm"
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          >
                            Reject
                          </Button>
                        </div>
                      )}

                      {booking.status === 'approved' && (
                        <>
                          {openChatBookingId === booking.id ? (
                            <div>
                              <JobChat
                                bookingId={booking.id}
                                recipientId={booking.client_id}
                                recipientName={booking.profiles.full_name}
                                currentUserId={user?.id || ''}
                                context="booking"
                                onUnreadCountChange={(count) => setUnreadCounts(prev => ({ ...prev, [booking.id]: count }))}
                              />
                              <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setOpenChatBookingId(null)}>Close Chat</Button>
                            </div>
                          ) : (
                            <Button size="sm" className="w-full bg-primary text-white mt-2 relative" onClick={() => setOpenChatBookingId(booking.id)}>
                              Start Chat
                              {unreadCounts[booking.id] && unreadCounts[booking.id] > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                  {unreadCounts[booking.id]}
                                </span>
                              )}
                            </Button>
                          )}

                          <Button
                            type="button"
                            onClick={async () => {
                              try {
                                // Prevent double clicks by temporarily disabling this booking's button
                                setServiceBookingsLoading(prev => new Set(prev).add(booking.id));
                                const res = await fetch('/api/bookings/complete', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ bookingId: booking.id }),
                                });

                                const raw = await res.text().catch(() => '');
                                let parsed: any = null;
                                try { parsed = raw ? JSON.parse(raw) : null } catch (e) { parsed = raw }

                                if (!res.ok) {
                                  const message = parsed?.error || parsed?.message || raw || `Failed to complete booking (status ${res.status})`;
                                  console.error('Error completing booking:', res.status, res.statusText, String(message).slice(0, 2000));
                                  alert('Failed to complete booking: ' + message);
                                  return;
                                }

                                const updated = parsed ?? null;
                                if (updated) {
                                  setServiceBookings(prev => prev.map(b => b.id === booking.id ? updated : b));
                                  try {
                                    const svcId = updated?.services?.id || updated?.service_id
                                    if (svcId && updated.status === 'completed') {
                                      // When a booking is completed, free the service back to open
                                      setAndPersistServiceStatus(svcId, 'open')
                                    }
                                  } catch (e) {
                                    console.warn('Error updating service status after completing booking', e)
                                  }
                                }
                                alert('Booking marked as completed. You can now submit a review!');
                              } catch (err) {
                                console.error('Error completing booking (unexpected):', String(err));
                                alert('Failed to complete booking: ' + (err instanceof Error ? err.message : String(err)));
                              } finally {
                                setServiceBookingsLoading(prev => {
                                  const next = new Set(prev);
                                  next.delete(booking.id);
                                  return next;
                                });
                              }
                            }}
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
                            disabled={serviceBookingsLoading.has(booking.id)}
                          >
                            {serviceBookingsLoading.has(booking.id) ? 'Completing...' : 'Mark as Completed'}
                          </Button>
                        </>
                      )}

                      {booking.status === 'completed' && !reviewedBookingIdsWorker.has(booking.id) && (
                        <Button
                          onClick={() => {
                            setReviewContext({ type: 'booking', id: booking.id, client_id: booking.client_id })
                            setReviewModalOpen(true)
                          }}
                          size="sm"
                          className="w-full bg-primary hover:bg-primary/90 text-white mt-2"
                        >
                          Review Client
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

              {/* Reviews Section */}
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Recent Reviews</h3>
              <div className="space-y-4">
                {workerReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reviews yet</p>
                ) : (
                  workerReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden">
                          {review.reviewer?.avatar_url ? (
                            <img
                              src={review.reviewer.avatar_url}
                              alt={review.reviewer.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm text-primary">
                              {review.reviewer?.full_name?.[0] || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{review.reviewer?.full_name || 'Anonymous'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating ? 'text-yellow-400' : 'text-white/20'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-sm">{review.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Review modal */}
            <ReviewModal
              open={reviewModalOpen}
              title={reviewContext?.type === 'job' ? 'Review Client' : 'Review Client'}
              revieweeId={reviewContext?.client_id || ''}
              onClose={() => {
                setReviewModalOpen(false)
                setReviewContext(null)
              }}
              onSubmit={async (payload: { rating: number; comment: string; revieweeId: string }) => {
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session?.user?.id) {
                    console.error('[worker review] No active session found')
                    alert('Please log in to submit a review')
                    return
                  }

                  if (!reviewContext?.id || !reviewContext?.client_id) {
                    console.error('[worker review] Invalid review context:', reviewContext)
                    alert('Missing required review information. Please try again.')
                    setReviewModalOpen(false)
                    return
                  }

                  // Prepare payload for server
                  const token = session?.access_token || (session as any)?.accessToken || null
                  let bodyPayload: any = { revieweeId: reviewContext.client_id, rating: payload.rating, comment: payload.comment }
                  if (reviewContext.type === 'booking') bodyPayload.bookingId = reviewContext.id
                  if (reviewContext.type === 'job') bodyPayload.jobId = reviewContext.id
                  if (token) bodyPayload.accessToken = token

                  const res = await fetch('/api/reviews', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify(bodyPayload),
                  })

                  const text = await res.text()
                  let result: any = null
                  try { result = text ? JSON.parse(text) : null } catch (e) { result = text }

                  if (!res.ok) {
                    const detailedError = result?.details ? JSON.stringify(result.details) : (result?.error || 'Failed to submit review')
                    console.error('[worker review] Error submitting review (server):', { status: res.status, body: result, rawText: text, detailedError })
                    throw new Error(detailedError)
                  }

                  const reviewData = result?.data || result
                  // Attach profile info for rendering
                  if (reviewData && reviewContext.client_id) {
                    const { data: profileData } = await supabase
                      .from('profiles')
                      .select('id, full_name, avatar_url')
                      .eq('id', reviewContext.client_id)
                      .single()
                    if (profileData) reviewData.profiles = profileData
                  }

                  setWorkerReviews((prev) => [reviewData, ...(prev || [])])
                  if (reviewContext.type === 'booking') {
                    setReviewedBookingIdsWorker((prev) => new Set(Array.from(prev).concat([reviewContext.id])))
                  }
                  if (reviewContext.type === 'job') {
                    setReviewedJobIdsWorker((prev) => new Set(Array.from(prev).concat([reviewContext.id])))
                  }

                  setReviewModalOpen(false)
                  setReviewContext(null)
                  alert('Thank you for your review!')
                } catch (error: any) {
                  console.error('[worker review] Error submitting review:', error)
                  const errorMessage = error?.message || 'Failed to submit review'
                  alert(errorMessage)
                }
              }}
            />

            {/* Confirm modal for job actions */}
            {/* ...existing code for confirm modal should be here, not the review modal... */}

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total job_applications</span>
                  <span className="font-bold text-foreground">{job_applications.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Accepted</span>
                  <span className="font-bold text-green-600">
                    {job_applications.filter((a) => a.status === "accepted").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="font-bold text-yellow-600">
                    {job_applications.filter((a) => a.status === "pending").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Services Offered</span>
                  <span className="font-bold text-primary">
                    {workerServices?.length || 0}
                  </span>
                </div>
                <div className="pt-2 mt-2 border-t border-border">
                  <span className="text-sm font-medium text-foreground">Bookings</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-bold text-foreground">{serviceBookings.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Approved</span>
                    <span className="font-bold text-green-600">
                      {serviceBookings.filter(b => b.status === 'approved').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="font-bold text-yellow-600">
                      {serviceBookings.filter(b => b.status === 'pending').length}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Notifications */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Notifications</h3>
              </div>
              <p className="text-sm text-muted-foreground">No new notifications</p>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        profile={profile}
        onSave={(updatedProfile) => {
          setProfile(updatedProfile)
          // When profile is updated (especially location), refresh available jobs with new location filter
          const refreshJobsFeed = async () => {
            try {
              const userLocation = updatedProfile?.location
              
              let jobsQuery = supabase
                .from('jobs')
                .select('id, title, location, budget, duration, status, client_id, profiles(full_name, avatar_url, profile_tier)')
                .eq('status', 'open')
                .neq('client_id', user?.id)
                .order('created_at', { ascending: false })
              
              // If user has a location set, filter jobs by that location
              if (userLocation && userLocation.trim()) {
                jobsQuery = jobsQuery.ilike('location', `%${userLocation}%`)
              }
              
              const { data: jobsData, error: jobsError } = await jobsQuery.limit(5)

              if (!jobsError) {
                setAvailableJobs(jobsData || [])
              } else {
                console.warn('[worker] failed to refresh available jobs feed after profile update:', makePrintable(jobsError))
              }
            } catch (e) {
              console.warn('[worker] error refreshing available jobs feed after profile update:', e)
            }
          }
          refreshJobsFeed()
        }}
        backButtonClass="text-white hover:text-white/90"
      />
      
    </div>
  )
}





