"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ReviewModal from "@/components/ui/review-modal";
import { Card } from "@/components/ui/card";
import { LogOut, Plus, MapPin, Trash2, User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ConfirmModal from '@/components/ui/confirm-modal';
import EditProfileModal from "@/components/EditProfileModal";
import { updateJobStatus } from '@/lib/job-utils';
import { canTransitionJobStatus, getJobStatusColor, type JobStatus } from '@/lib/job-types';
import JobChat from "@/components/ui/job-chat";
import { TierBadge } from "@/components/TierBadge";
import Avatar from '@/components/Avatar'

interface JobApplication {
  id: string;
  provider_id: string;
  status: string;
  proposed_rate: number;
  provider: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    location: string;
    profile_tier?: string;
    avg_rating?: number;
    total_reviews?: number;
  };
}

interface Job {
  id: string;
  title: string;
  location: string;
  budget: number;
  duration: string;
  status: string;
  created_at: string;
  client_id: string;
  job_applications: JobApplication[];
}

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: string;
  description: string;
  provider_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    location: string;
    profile_tier?: string;
    email?: string;
    phone?: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  client_id: string;
  booking_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  location?: string;
  profile_tier?: string;
  role?: string;
  avatar_url?: string | null;
}

interface Booking {
  id: string;
  service_id: string;
  booking_date: string;
  status: string;
  notes?: string;
  services: {
    name: string;
    price: number;
    duration: string;
    provider_id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
      profile_tier?: string;
      email?: string;
      phone?: string;
      location?: string;
    };
  };
}

const ClientDashboard = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewContext, setReviewContext] = useState<{
    type: "booking" | "job";
    id: string;
    provider_id?: string;
  } | null>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewedJobIds, setReviewedJobIds] = useState<Set<string>>(new Set());
  const [openBookingChatId, setOpenBookingChatId] = useState<string | null>(null);
  const [openJobChatAppId, setOpenJobChatAppId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loadingAppIds, setLoadingAppIds] = useState<Set<string>>(new Set());
  // Confirmation modal state for job actions
  const [confirmAction, setConfirmAction] = useState<{
    jobId: string;
    newStatus: JobStatus;
    title?: string;
    message?: string;
    hasAcceptedApplication?: boolean;
  } | null>(null);
  // Confirmation modal state for rejecting applications
  const [rejectConfirm, setRejectConfirm] = useState<{
    jobId: string;
    applicationId: string;
    providerName: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingJobIds, setDeletingJobIds] = useState<Set<string>>(new Set());
  const [deletingBookingIds, setDeletingBookingIds] = useState<Set<string>>(new Set());
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('');
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const makePrintable = (err: any) => {
    if (!err) return "Unknown error";
    if (typeof err === "string") return err;
    if (err?.message) return err.message;
    try {
      const names = Object.getOwnPropertyNames(err);
      const data: Record<string, any> = {};
      names.forEach((n) => (data[n] = err[n]));
      return JSON.stringify(data);
    } catch {
      return String(err);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      // ✅ Fetch available services (with retry and server-side fallback)
      let servicesData: any = null
      let servicesError: any = null

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
          .limit(3)

        servicesData = res.data
        servicesError = res.error
      } catch (e: any) {
        servicesError = e
      }

      // If client-side read failed, retry once, then fall back to server endpoint
      if (servicesError) {
        const printable = makePrintable(servicesError)
        console.warn('[dashboard] initial services read failed, retrying:', printable)
        // small backoff
        await new Promise((r) => setTimeout(r, 300))
        try {
          const res2 = await supabase
            .from('services')
            .select(`*, profiles:provider_id ( full_name, avatar_url, location )`)
            .order('created_at', { ascending: false })
            .limit(3)
          servicesData = res2.data
          servicesError = res2.error
        } catch (e: any) {
          servicesError = e
        }
      }

      if (servicesError) {
        // Final fallback to server-side debug endpoint which uses the service role key
        try {
          const resp = await fetch('/api/debug/services', { credentials: 'include' })
          if (resp.ok) {
            const body = await resp.json()
            setServices(body?.data || [])
          } else {
            console.error('[dashboard] server-side services fallback failed:', await resp.text())
            setServices([])
          }
        } catch (e) {
          console.error('Error fetching services (all fallbacks failed):', makePrintable(e))
          setServices([])
        }
      } else {
        setServices(servicesData || [])
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push("/login");
          return;
        }

        // Get session to ensure we're authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          router.push("/login");
          return;
        }

        // ✅ Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", makePrintable(profileError));
          setLoading(false);
          router.push("/login");
          return;
        }

        if (!profileData) {
          console.warn("No profile found for user", user.id);
          setLoading(false);
          router.push("/profile");
          return;
        }

        if (profileData.role !== "client") {
          router.push("/dashboard");
          return;
        }

        setProfile(profileData);

        // ✅ Ensure jobs are fetched for the logged-in client using the correct column name
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select(`
            *,
            job_applications (
              id,
              status,
              proposed_rate,
              profiles!job_applications_provider_id_fkey (
                id,
                full_name,
                avatar_url,
                location,
                profile_tier,
                avg_rating,
                total_reviews
              )
            )
          `)
          .eq('client_id', user.id)
          .order("created_at", { ascending: false });

        if (jobsError) {
          console.error("Error fetching jobs for client dashboard:", makePrintable(jobsError));
          setMyJobs([]);
        } else {
          // Transform job_applications to rename 'profiles' to 'provider' for UI compatibility
          const transformedJobs = (jobsData || []).map((job: any) => ({
            ...job,
            job_applications: (job.job_applications || []).map((app: any) => ({
              ...app,
              provider: app.profiles  // Rename the nested FK expand from 'profiles' to 'provider'
            }))
          }));
          setMyJobs(transformedJobs);
        }

        // ✅ Fetch client's bookings with retry and robust error handling
        const fetchBookingsWithRetries = async (attempts = 2) => {
          let lastErr: any = null
          for (let i = 0; i < attempts; i++) {
            try {
              const { data: bookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select('*')
                .eq('client_id', user.id)
                .order('booking_date', { ascending: false });

              if (bookingsError) {
                lastErr = bookingsError
                const printable = makePrintable(bookingsError)
                // If it's a transient network error, retry once
                if (/networkerror|failed to fetch|network request failed|TypeError: NetworkError/i.test(printable)) {
                  console.warn(`[dashboard] transient network error fetching bookings (attempt ${i + 1}):`, printable)
                  // small backoff
                  await new Promise((r) => setTimeout(r, 300 * (i + 1)))
                  continue
                }

                // Non-network error: log and return empty set
                console.error('[dashboard] Error fetching bookings:', { message: printable, raw: bookingsError })
                return []
              }

              const bookings = bookingsData || []
              if (!bookings.length) return []

              // fetch related services/providers in bulk
              const svcIds = Array.from(new Set(bookings.map((b: any) => b.service_id)))
              const { data: servicesData, error: servicesErr } = await supabase
                .from('services')
                .select('id, provider_id, name, price, duration')
                .in('id', svcIds || [])

              if (servicesErr) {
                console.warn('[dashboard] Warning: failed to bulk-fetch services:', makePrintable(servicesErr))
              }

              const providerIds = Array.from(new Set((servicesData || []).map((s: any) => s.provider_id).filter(Boolean)))
              const { data: providersData, error: providersErr } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, email, phone, location, profile_tier')
                .in('id', providerIds || [])

              if (providersErr) {
                console.warn('[dashboard] Warning: failed to bulk-fetch provider profiles:', makePrintable(providersErr))
              }

              const servicesMap: Record<string, any> = {};
              (servicesData || []).forEach((s: any) => (servicesMap[s.id] = s));
              const providersMap: Record<string, any> = {};
              (providersData || []).forEach((p: any) => (providersMap[p.id] = p));

              const enriched = bookings.map((b: any) => ({
                ...b,
                services: servicesMap[b.service_id] || null,
              }))

              // attach provider profile to services
              enriched.forEach((b: any) => {
                if (b.services && providersMap[b.services.provider_id]) {
                  b.services.profiles = providersMap[b.services.provider_id]
                }
              })

              return enriched
            } catch (e: any) {
              lastErr = e
              const printable = makePrintable(e)
              if (/networkerror|failed to fetch|network request failed|TypeError: NetworkError/i.test(printable)) {
                console.warn(`[dashboard] fetch exception (attempt ${i + 1}), will retry:`, printable)
                await new Promise((r) => setTimeout(r, 300 * (i + 1)))
                continue
              }
              console.error('[dashboard] Unexpected exception fetching bookings:', printable)
              return []
            }
          }
          console.error('[dashboard] Failed to fetch bookings after retries:', makePrintable(lastErr))
          return []
        }

        const enrichedBookings = await fetchBookingsWithRetries(2)
        setBookings(enrichedBookings || [])

        // ✅ Fetch other users
        const { data: usersData, error: usersError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, avatar_url, profile_tier")
          .neq("id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (usersError) {
          console.error("Error fetching users:", makePrintable(usersError));
        } else {
          setUsers(usersData || []);
        }

        // Fetch reviews submitted by this client (so we can know which bookings/jobs they've reviewed)
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            *,
            profiles:reviewee_id ( id, full_name, avatar_url )
          `)
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });

        if (reviewsError) {
          console.error('Error fetching reviews:', makePrintable(reviewsError));
          setReviews([]);
        } else {
          setReviews(reviewsData || []);
          // populate reviewed id sets
          const b = new Set<string>();
          const j = new Set<string>();
          (reviewsData || []).forEach((r: any) => {
            if (r.booking_id) b.add(r.booking_id);
            if (r.job_id) j.add(r.job_id);
          });
          setReviewedBookingIds(b);
          setReviewedJobIds(j);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", makePrintable(err));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const handleApproveApplication = async (jobId: string, applicationId: string) => {
    try {
      setLoadingAppIds(prev => new Set(prev).add(applicationId));
      // Use the server-side API which validates ownership and handles RLS
      console.log('Approving application:', { jobId, applicationId });
      
      // Include credentials/token so server can authenticate the client
      const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = session?.access_token || (session as any)?.accessToken || null;
      const bodyPayload: any = { status: 'accepted' };
      if (token) bodyPayload.accessToken = token;

      const res = await fetch(`/api/job-applications/${applicationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(bodyPayload)
      });

      // Parse response safely
      const raw = await res.text();
      let response: any = null;
      try { response = raw ? JSON.parse(raw) : null } catch (e) { response = raw }
      
      if (!res.ok) {
        // Build a detailed, serializable error description to avoid seeing `{}` in console
        const detailedError = response?.details ? JSON.stringify(response.details) : (response?.error || response || raw || 'Failed to approve application');
        const printableResponse = makePrintable(response);
        const printableRaw = typeof raw === 'string' ? raw : makePrintable(raw);

        console.error('Error approving application:', {
          status: res.status,
          statusText: res.statusText,
          error: makePrintable(detailedError),
          response: printableResponse,
          raw: printableRaw,
        });

        const errorMessage = response?.error
          ? `${response.error}${response.details ? `: ${response.details}` : ''}`
          : detailedError;

        alert(errorMessage);
        return;
      }

      if (!response || !response.id) {
        console.warn('Invalid response data:', response);
        alert('Received invalid response from server. Please refresh and try again.');
        return;
      }

      // Update local state
      setMyJobs(prev => prev.map(job => {
        if (job.id === jobId) {
          return {
            ...job,
            job_applications: job.job_applications.map(app => 
              app.id === applicationId 
                ? { ...app, status: 'accepted' }
                : { ...app, status: app.status === 'pending' ? 'rejected' : app.status }
            )
          };
        }
        return job;
      }));

      alert('Application approved successfully!');
    } catch (err) {
      console.error('Error in handleApproveApplication:', makePrintable(err), err);
      alert('An unexpected error occurred: ' + makePrintable(err));
    } finally {
      setLoadingAppIds(prev => {
        const next = new Set(prev);
        next.delete(applicationId);
        return next;
      });
    }
  };

  const handleRejectApplication = async (jobId: string, applicationId: string) => {
    try {
      setLoadingAppIds(prev => new Set(prev).add(applicationId));
      console.log('Rejecting application:', { jobId, applicationId });

      const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = session?.access_token || (session as any)?.accessToken || null;
      const bodyPayload: any = { status: 'rejected' };
      if (token) bodyPayload.accessToken = token;

      const res = await fetch(`/api/job-applications/${applicationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(bodyPayload)
      });

      const raw = await res.text();
      let response: any = null;
      try { response = raw ? JSON.parse(raw) : null } catch (e) { response = raw }

      if (!res.ok) {
        const detailedError = response?.details ? JSON.stringify(response.details) : (response?.error || response || raw || 'Failed to reject application');
        console.error('Error rejecting application:', { status: res.status, statusText: res.statusText, error: detailedError, response });
        alert(response?.error || detailedError);
        return;
      }

      // Update local state
      setMyJobs(prev => prev.map(job => {
        if (job.id === jobId) {
          return {
            ...job,
            job_applications: job.job_applications.map(app => app.id === applicationId ? { ...app, status: 'rejected' } : app)
          };
        }
        return job;
      }));

      alert('Application rejected.');
    } catch (err) {
      console.error('Error in handleRejectApplication:', makePrintable(err));
      alert('An unexpected error occurred: ' + makePrintable(err));
    } finally {
      setLoadingAppIds(prev => {
        const next = new Set(prev);
        next.delete(applicationId);
        return next;
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    if (!profile?.email || deleteEmailConfirm !== profile.email) {
      alert('Please enter your email correctly to confirm account deletion.');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        alert('Error deleting account: ' + (data.error || 'Unknown error'));
        setDeleting(false);
        setShowDeleteConfirm(false);
        setDeleteEmailConfirm('');
        return;
      }

      alert('Your account has been permanently deleted.');
      window.location.href = '/';
    } catch (err: any) {
      alert('Error deleting account: ' + err.message);
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteEmailConfirm('');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!jobId) return;
    if (!confirm(`Permanently delete this job? This cannot be undone.`)) return;
    setDeletingJobIds(prev => new Set(prev).add(jobId));
    try {
      const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = session?.access_token || (session as any)?.accessToken || null;

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      const text = await res.text();
      let body: any = null;
      try { body = text ? JSON.parse(text) : null } catch (e) { body = text }

      if (!res.ok) {
        const errMsg = body?.error || body || text || 'Failed to delete job';
        console.error('Delete job failed:', { status: res.status, statusText: res.statusText, body, raw: text });
        alert(errMsg);
        return;
      }

      setMyJobs(prev => (prev || []).filter(j => j.id !== jobId));
      alert('Job deleted');
    } catch (err) {
      console.error('Error deleting job:', err);
      alert('Failed to delete job: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingJobIds(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!bookingId) return;
    if (!confirm(`Permanently delete this booking? This cannot be undone.`)) return;
    setDeletingBookingIds(prev => new Set(prev).add(bookingId));
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
        console.error('Delete booking failed:', { status: res.status, statusText: res.statusText, body, raw: text });
        alert(errMsg);
        return;
      }

      setBookings(prev => (prev || []).filter(b => b.id !== bookingId));
      alert('Booking deleted');
    } catch (err) {
      console.error('Error deleting booking:', err);
      alert('Failed to delete booking: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingBookingIds(prev => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    }
  };

  const handleToggleJobStatus = async (jobId: string, newStatus: 'open' | 'closed') => {
    // Validate transition using helper
    const job = myJobs.find((j) => j.id === jobId);
    const fromStatus = (job?.status || 'open') as JobStatus;
    if (!canTransitionJobStatus(fromStatus, newStatus, true)) {
      alert('Invalid status transition');
      return;
    }

        // Ask for confirmation before changing
      setConfirmAction({ jobId, newStatus });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Action Buttons */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome, {profile?.full_name || "Client"}
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage your jobs and bookings
              </p>
            </div>
          </div>
          
          {/* Buttons Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            <Link href="/jobs/post" className="w-full">
              <Button className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 w-full">
                <Plus className="w-5 h-5" />
                Post Job
              </Button>
            </Link>
            <Link href="/bookings" className="w-full">
              <Button className="bg-secondary hover:bg-secondary/90 flex items-center justify-center gap-2 w-full">
                Book Service
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setEditProfileOpen(true)}
              className="flex items-center justify-center gap-2 bg-transparent w-full"
            >
              <User className="w-4 h-4" />
              Edit Profile
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center justify-center gap-2 bg-transparent text-destructive hover:text-destructive w-full"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 bg-transparent w-full"
            >
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
                <li>All your jobs and data will be erased</li>
                <li>You cannot recover this account</li>
                <li>This cannot be undone</li>
              </ul>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Are you absolutely sure you want to proceed? This action cannot be reversed.
            </p>
            <p className="text-sm font-semibold text-foreground mb-2">
              Type your email to confirm:
            </p>
            <input
              type="email"
              placeholder="your.email@example.com"
              value={deleteEmailConfirm}
              onChange={(e) => setDeleteEmailConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4"
              disabled={deleting}
            />
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteEmailConfirm('');
                }}
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
                disabled={deleting || deleteEmailConfirm !== profile?.email}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Forever'}
              </Button>
            </div>
          </Card>
        </div>
      )}





      {/* My Bookings Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <h2 className="text-2xl font-bold text-white mb-6">My Bookings</h2>

        {bookings.length === 0 ? (
          <Card className="p-6 text-center bg-card/50 backdrop-blur-sm border-0">
            <p className="text-white/60">You haven't made any bookings yet</p>
            <Link href="/services" className="mt-4 inline-block">
              <Button>Browse Services</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookings.slice(0, 6).map((booking) => (
              <Card key={booking.id} className="p-6 bg-card/50 backdrop-blur-sm border-0">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden">
                    <Avatar
                      src={booking.services?.profiles?.avatar_url}
                      alt={booking.services?.profiles?.full_name || 'Provider'}
                      size={48}
                      tier={(booking.services?.profiles?.profile_tier as any) || 'basic'}
                      showBadge={true}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{booking.services?.name ?? 'Unnamed service'}</h3>
                    {booking.status === 'approved' ? (
                      (() => {
                        const p: any = booking.services?.profiles || {};
                        const email = p.email || p.contact_email || p.email_address || null;
                        const phone = p.phone || p.mobile || p.phone_number || p.contact_phone || p.contact_number || null;
                        return (
                          <div className="text-sm text-white/80 space-y-1">
                            <p>by {p.full_name ?? 'Provider'}</p>
                            <div className="flex items-center gap-2">
                              {p.profile_tier && (
                                <TierBadge tier={['basic','pro','verified','trusted','elite'].includes(p.profile_tier as any) ? p.profile_tier as any : 'basic'} size="sm" />
                              )}
                            </div>
                            {email && (
                              <p className="text-sm text-white/60">Email: {email}</p>
                            )}
                            {phone && (
                              <p className="text-sm text-white/60">Phone: {phone}</p>
                            )}
                            {p.location && (
                              <p className="text-sm text-white/60">Location: {p.location}</p>
                            )}
                          </div>
                        )
                      })()
                    ) : (
                      <div className="flex items-center gap-2">
                        {booking.services?.profiles?.profile_tier && (
                          <TierBadge tier={['basic','pro','verified','trusted','elite'].includes(booking.services?.profiles?.profile_tier as any) ? booking.services?.profiles?.profile_tier as any : 'basic'} size="sm" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">Booking Date</span>
                    <span className="text-sm text-white">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">Duration</span>
                    <span className="text-sm text-white">{booking.services?.duration ?? 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/60">Price</span>
                    <span className="text-primary font-medium">
                      KES {(booking.services?.price ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-sm text-white/60">Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      booking.status === 'approved' 
                        ? 'bg-green-500/20 text-green-300'
                        : booking.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {booking.notes && (
                  <p className="text-sm text-white/60 mb-4 italic">
                    Note: {booking.notes}
                  </p>
                )}

                {booking.status === 'approved' && (
                  <>
                  {openBookingChatId === booking.id ? (
                    <div>
                      <JobChat
                        bookingId={booking.id}
                        recipientId={booking.services?.provider_id ?? ''}
                        recipientName={booking.services?.profiles?.full_name ?? 'Provider'}
                        currentUserId={profile?.id || ''}
                        context="booking"
                        onUnreadCountChange={(count) => setUnreadCounts(prev => ({ ...prev, [booking.id]: count }))}
                      />
                      <Button onClick={() => setOpenBookingChatId(null)} className="w-full mt-2" variant="outline">Close Chat</Button>
                    </div>
                  ) : (
                    <Button onClick={() => setOpenBookingChatId(booking.id)} className="w-full mt-2 bg-primary text-white relative">
                      Start Chat
                      {unreadCounts[booking.id] && unreadCounts[booking.id] > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                          {unreadCounts[booking.id]}
                        </span>
                      )}
                    </Button>
                  )}

                  <Button
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        const res = await fetch('/api/bookings/complete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ bookingId: booking.id }),
                        });
                        
                        if (!res.ok) {
                          const error = await res.json();
                          throw new Error(error.error || 'Failed to complete booking');
                        }
                        
                        const updated = await res.json();
                        setBookings(prev => prev.map(b => b.id === booking.id ? updated : b));
                        alert('Booking marked as completed. You can now submit a review!');
                      } catch (err) {
                        console.error('Error completing booking:', err);
                        alert('Failed to complete booking: ' + (err instanceof Error ? err.message : String(err)));
                      }
                    }}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                  >
                    Mark as Completed
                  </Button>
                  </>
                )}

                {booking.status === 'completed' && !reviewedBookingIds.has(booking.id) && (
                  <Button
                      onClick={(e) => {
                      e.preventDefault();
                      setReviewContext({ type: 'booking', id: booking.id, provider_id: booking.services?.provider_id ?? '' });
                      setReviewModalOpen(true);
                    }}
                    className="w-full mt-4 bg-primary"
                  >
                    Submit Review
                  </Button>
                )}
                {booking.status === 'completed' && (
                  <Button
                    onClick={async (e) => {
                      e.preventDefault();
                      await handleDeleteBooking(booking.id);
                    }}
                    variant="destructive"
                    className="w-full mt-2"
                    disabled={deletingBookingIds.has(booking.id)}
                  >
                    {deletingBookingIds.has(booking.id) ? 'Deleting...' : 'Delete Booking'}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Jobs Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          My Posted Jobs
        </h2>

        {myJobs.length === 0 ? (
          <p className="text-muted-foreground">
            You have not posted any jobs yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myJobs.map((job) => (
              <Card key={job.id} className="p-4 flex flex-col justify-between bg-card/50 backdrop-blur-sm border-0">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      job.status === "open"
                        ? "bg-green-500/20 text-green-300"
                        : "bg-red-500/20 text-red-300"
                    }`}>
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-white/80">{job.location}</p>
                  <p className="text-sm text-white/80 mt-1">
                    Budget: KES {job.budget.toLocaleString()} | Duration: {job.duration}
                  </p>
                  
                  {/* Applications Section */}
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <h4 className="text-sm font-medium text-white mb-2">Applications ({job.job_applications?.length || 0})</h4>
                    
                    {job.job_applications && job.job_applications.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        {job.job_applications.slice(0, 2).map((application) => (
                          <div key={application.id} className="flex flex-col gap-2 bg-white/5 p-2 rounded">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Avatar
                                    src={application.provider.avatar_url}
                                    alt={application.provider.full_name || 'Worker'}
                                    size={32}
                                    tier={(application.provider.profile_tier as any) || 'basic'}
                                    showBadge={true}
                                    className="rounded-full"
                                  />
                                </div>
                                <div className="text-sm">
                                  {application.status === 'accepted' ? (
                                    <>
                                      <p className="text-white/90">{application.provider.full_name}</p>
                                      <p className="text-white/60">KES {application.proposed_rate.toLocaleString()}</p>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                        {application.provider.profile_tier && (
                                          <TierBadge tier={['basic','pro','verified','trusted','elite'].includes(application.provider.profile_tier as any) ? application.provider.profile_tier as any : 'basic'} size="sm" />
                                        )}
                                      </div>
                                      <p className="text-white/60">KES {application.proposed_rate.toLocaleString()}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  application.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                  application.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                                  'bg-red-500/20 text-red-300'
                                }`}>
                                  {application.status.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {application.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-green-500/20 text-green-300 hover:bg-green-500/30 border-green-500/30 w-full sm:w-auto"
                                    disabled={loadingAppIds.has(application.id)}
                                    onClick={(e) => { e.preventDefault(); handleApproveApplication(job.id, application.id); }}
                                  >
                                    {loadingAppIds.has(application.id) ? 'Approving...' : 'Approve'}
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/30 w-full sm:w-auto"
                                    disabled={loadingAppIds.has(application.id)}
                                    onClick={(e) => { e.preventDefault(); setRejectConfirm({ jobId: job.id, applicationId: application.id, providerName: application.provider.full_name }); }}
                                  >
                                    {loadingAppIds.has(application.id) ? 'Rejecting...' : 'Reject'}
                                  </Button>
                                </>
                              )}

                              {/* Chat button available for pending and accepted apps; opens inline JobChat */}
                              {job.status === 'completed' && application.status === 'accepted' && !reviewedJobIds.has(job.id) && (
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.preventDefault(); setReviewContext({ type: 'job', id: job.id, provider_id: application.provider.id }); setReviewModalOpen(true); }}
                                  className="bg-primary/80 text-white"
                                >
                                  Leave Review
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}

                        {job.job_applications.length > 2 && (
                          <p className="text-sm text-white/60 text-center">
                            +{job.job_applications.length - 2} more applications
                          </p>
                        )}
                    </div>
                    ) : (
                      <p className="text-sm text-white/60 mb-4">No applications yet</p>
                    )}

                    <Link href={`/jobs/${job.id}`}>
                      <Button variant="outline" className="w-full bg-white/10 text-white border-white/20">
                        View Full Details
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Show chat if job has an accepted application and is not completed */}
                {job.status !== 'completed' && job.job_applications.some(app => app.status === 'accepted') && (
                  <div className="mt-4">
                    {(() => {
                      const acceptedApp = job.job_applications.find(app => app.status === 'accepted');
                      if (!acceptedApp) return null;
                      return (
                        openJobChatAppId === acceptedApp.id ? (
                          <div>
                            <JobChat
                              jobId={job.id}
                              jobApplicationId={acceptedApp.id}
                              recipientId={acceptedApp.provider?.id || ''}
                              recipientName={acceptedApp.provider?.full_name || 'Worker'}
                              currentUserId={profile?.id || ''}
                              onUnreadCountChange={(count) => setUnreadCounts(prev => ({ ...prev, [acceptedApp.id]: count }))}
                            />
                            <Button onClick={() => setOpenJobChatAppId(null)} className="w-full mt-2" variant="outline">Close Chat</Button>
                          </div>
                        ) : (
                          <Button onClick={() => setOpenJobChatAppId(acceptedApp.id)} className="w-full mt-2 bg-primary text-white relative">
                            Start Chat
                            {unreadCounts[acceptedApp.id] && unreadCounts[acceptedApp.id] > 0 && (
                              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                {unreadCounts[acceptedApp.id]}
                              </span>
                            )}
                          </Button>
                        )
                      );
                    })()}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => handleToggleJobStatus(job.id, job.status === 'open' ? 'closed' : 'open')}
                    className={`flex-1 ${
                      job.status === 'open' 
                        ? 'bg-destructive/90 hover:bg-destructive text-white' 
                        : 'bg-green-600/90 hover:bg-green-600 text-white'
                    }`}
                  >
                    {job.status === 'open' ? 'Close Job' : 'Reopen Job'}
                  </Button>
                  
                  <div className="flex gap-2 w-full">
                    <Link href={`/jobs/${job.id}/edit`} className="flex-1">
                      <Button variant="outline" className="w-full bg-white/10 text-white border-white/20">
                        Edit Job
                      </Button>
                    </Link>
                    <div className="w-32">
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleDeleteJob(job.id)}
                        disabled={deletingJobIds.has(job.id)}
                      >
                        {deletingJobIds.has(job.id) ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Show Mark as Complete button for jobs with accepted applications */}
                {job.status === 'open' && (
                  <Button
                    onClick={() => setConfirmAction({ 
                      jobId: job.id, 
                      newStatus: 'completed', 
                      title: 'Complete Job', 
                      message: 'Mark this job as completed? This will allow reviews.',
                      hasAcceptedApplication: job.job_applications.some(app => app.status === 'accepted')
                    })}
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!job.job_applications.some(app => app.status === 'accepted')}
                  >
                    Mark Job as Completed
                  </Button>
                )}

                {/* Show Review button for completed jobs */}
                {job.status === 'completed' && job.job_applications.some(app => app.status === 'accepted') && !reviewedJobIds.has(job.id) && (
                  <Button
                    onClick={() => {
                      const acceptedWorker = job.job_applications.find(app => app.status === 'accepted');
                      if (!acceptedWorker) return;
                      setReviewContext({ type: 'job', id: job.id, provider_id: acceptedWorker.provider.id });
                      setReviewModalOpen(true);
                    }}
                    className="w-full mt-2 bg-primary hover:bg-primary/90 text-white"
                  >
                    Review Worker
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Available Services Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Available Services</h2>
          <Link href="/services">
            <Button variant="outline" className="bg-white/10 text-white border-white/20">
              View All Services
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 3).map((service) => (
            <Card key={service.id} className="p-6 bg-card/50 backdrop-blur-sm border-0">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden">
                  <Avatar
                    src={service.profiles?.avatar_url}
                    alt={service.profiles?.full_name || 'Provider'}
                    size={48}
                    tier={(service.profiles?.profile_tier as any) || 'basic'}
                    showBadge={true}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                  <p className="text-sm text-white/80">{service.category}</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-sm text-white/80">{service.description}</p>
                {service.profiles?.location ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/80">{service.profiles.location}</span>
                  </div>
                ) : null}
                <p className="text-primary font-medium">KES {service.price.toLocaleString()}</p>
              </div>

              <Link href={`/provider/${service.provider_id}?service=${service.id}`}>
                <Button className="w-full">View & Book</Button>
              </Link>
            </Card>
          ))}

          {services.length === 0 && (
            <Card className="p-6 col-span-3 text-center bg-card/50 backdrop-blur-sm border-0">
              <p className="text-white/80">Loading available services...</p>
            </Card>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-white mb-4">My Reviews</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.length === 0 ? (
            <Card className="p-6 col-span-3 text-center bg-card/50 backdrop-blur-sm border-0">
              <p className="text-white/80">You haven't submitted any reviews yet</p>
            </Card>
          ) : (
            reviews.map((review) => {
              const revieweeProfile = review.profiles || { full_name: 'Anonymous', avatar_url: null };
              return (
              <Card key={review.id} className="p-6 bg-card/50 backdrop-blur-sm border-0">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {revieweeProfile?.avatar_url ? (
                      <img
                        src={revieweeProfile.avatar_url}
                        alt={revieweeProfile.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl text-primary">
                        {revieweeProfile.full_name?.[0] || '?'}
                      </span>
                    )}
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg font-semibold text-white">{revieweeProfile?.full_name || 'Anonymous'}</h3>
                    <p className="text-sm text-white/60">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-center sm:justify-start items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${
                          star <= (review?.rating || 0) ? 'text-yellow-400' : 'text-white/20'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-white/80">{review?.comment || ''}</p>
                </div>
              </Card>
            );
            })
          )}
        </div>
      </div>

      {/* Recent Providers Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-white mb-4">Featured Service Providers</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.filter(user => user.role === 'worker').slice(0, 6).map((user) => (
            <Card key={user.id} className="p-4 flex flex-col justify-between bg-card/50 backdrop-blur-sm border-0">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <Avatar
                    src={user.avatar_url}
                    alt={user.full_name || 'Provider'}
                    size={48}
                    tier={(user.profile_tier as any) || 'basic'}
                    showBadge={true}
                    className="rounded-full"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{user.full_name}</h3>
                    <p className="text-sm text-white/80">{user.role}</p>
                  </div>
                </div>
              </div>
              <Link href={`/provider/${user.id}`}>
                <Button className="w-full bg-primary hover:bg-primary/90">View Profile</Button>
              </Link>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link href="/services">
            <Button variant="outline" className="bg-white/10 text-white border-white/20">
              View All Service Providers
            </Button>
          </Link>
        </div>
      </div>
      {/* Review modal */}
      <ReviewModal
        open={reviewModalOpen}
        title={reviewContext?.type === 'job' ? 'Review Worker' : 'Review Service'}
        revieweeId={reviewContext?.provider_id || ''}
        onClose={() => {
          setReviewModalOpen(false);
          setReviewContext(null);
        }}
        onSubmit={async (payload: { rating: number; comment: string; revieweeId: string }) => {
          // First check for an active session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session?.user?.id) {
            console.error('No active session found');
            alert('Please log in to submit a review');
            router.push('/login');
            return;
          }
          
          const userId = session.user.id;

          if (!reviewContext?.id || !reviewContext?.provider_id) {
            console.error('Invalid review context:', reviewContext);
            alert('Missing required review information. Please try again.');
            setReviewModalOpen(false);
            return;
          }

          try {
            // Ensure we have valid session before proceeding
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
              throw new Error('No active session. Please log in again.');
            }

            if (reviewContext.type === 'booking') {
              // Use server API so the server controls allowed fields (avoids client-side review_type mismatches)
              const token = session?.access_token || (session as any)?.accessToken || null
              const bodyPayload: any = { revieweeId: reviewContext.provider_id, bookingId: reviewContext.id, rating: payload.rating, comment: payload.comment }
              if (token) bodyPayload.accessToken = token

              console.log('[DEBUG SEND /api/reviews] booking payload:', bodyPayload, 'hasToken:', !!token)
              const res = await fetch('/api/reviews', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(bodyPayload)
              })

              // Parse response safely (some server errors can return empty body)
              const text = await res.text();
              let result: any = null;
              try {
                result = text ? JSON.parse(text) : null;
              } catch (e) {
                result = text;
              }

              if (!res.ok) {
                const detailedError = result?.details ? JSON.stringify(result.details) : (result?.error || 'Failed to submit review');
                console.error('Error submitting booking review (server):', { status: res.status, body: result, rawText: text, detailedError })
                throw new Error(detailedError)
              }

              // Extract the review data from the response and ensure profile is included
              const reviewData = result?.data || result;
              // Fetch the reviewee profile to ensure the review object has full profile info for rendering
              if (reviewData && reviewContext.provider_id) {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url')
                  .eq('id', reviewContext.provider_id)
                  .single();
                if (profileData) {
                  reviewData.profiles = profileData;
                }
              }
              setReviews((prev) => [reviewData, ...(prev || [])]);
              setReviewedBookingIds((prev) => new Set(Array.from(prev).concat([reviewContext.id])));
            }

            if (reviewContext.type === 'job') {
              const token = session?.access_token || (session as any)?.accessToken || null
              const bodyPayload: any = { revieweeId: reviewContext.provider_id, jobId: reviewContext.id, rating: payload.rating, comment: payload.comment }
              if (token) bodyPayload.accessToken = token

              console.log('[DEBUG SEND /api/reviews] job payload:', bodyPayload, 'hasToken:', !!token)
              const res = await fetch('/api/reviews', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(bodyPayload)
              })

              const text = await res.text();
              let result: any = null;
              try {
                result = text ? JSON.parse(text) : null;
              } catch (e) {
                result = text;
              }

              if (!res.ok) {
                const detailedError = result?.details ? JSON.stringify(result.details) : (result?.error || 'Failed to submit review');
                console.error('Error submitting job review (server):', {
                  status: res.status,
                  error: detailedError,
                  body: result,
                  rawText: text
                });
                throw new Error(detailedError);
              }

              // Extract the review data from the response and ensure profile is included
              const reviewData = result?.data || result;
              // Fetch the reviewee profile to ensure the review object has full profile info for rendering
              if (reviewData && reviewContext.provider_id) {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url')
                  .eq('id', reviewContext.provider_id)
                  .single();
                if (profileData) {
                  reviewData.profiles = profileData;
                }
              }
              setReviews((prev) => [reviewData, ...(prev || [])]);
              setReviewedJobIds((prev) => new Set(Array.from(prev).concat([reviewContext.id])));
            }
            
            setReviewModalOpen(false);
            setReviewContext(null);
            alert('Thank you for your review!');
          } catch (error: any) {
            console.error('Error submitting review:', {
              error: makePrintable(error),
              rawError: error,
              errorKeys: Object.getOwnPropertyNames(error || {}),
              errorType: typeof error,
              context: {
                type: reviewContext?.type,
                reviewId: reviewContext?.id,
                userId,
                providerId: reviewContext?.provider_id
              }
            });

            // Check if it's a session error and handle accordingly
            if (error.message?.includes('No active session')) {
              router.push('/login');
              alert('Your session has expired. Please log in again.');
              return;
            }

            // Show a more detailed error message to the user
            const errorMessage = error.message || error.error_description || 'Failed to submit review';
            alert(errorMessage);
          }
        }}
      />
      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel="Yes, continue"
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction) return;
          try {
            const { jobId, newStatus, hasAcceptedApplication } = confirmAction;

            // Pre-check: if user tries to complete without an accepted application, stop early
            if (newStatus === 'completed' && !hasAcceptedApplication) {
              alert('Cannot complete job: there is no accepted application. Accept an application first.');
              setConfirmAction(null);
              return;
            }

            // Use the helper to update status
            const res = await updateJobStatus(jobId, newStatus);
            if (!res.success) {
              // If it's an auth error, guide the user to login
              if (res.isAuthError) {
                alert(res.error || 'Authentication required. Please log in again.');
                // Optionally navigate to login
                router.push('/login');
                return;
              }
              alert(res.error || 'Failed to update job status');
              return;
            }
            setMyJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
            if (newStatus === 'completed') {
              alert('Job marked as completed. You can now submit reviews!');
            } else {
              alert(`Job ${newStatus} successfully`);
            }
          } catch (err) {
            console.error('Confirm action error', err);
            alert('Action failed');
          }
        }}
      />

      {/* Edit Profile Modal */}
        <EditProfileModal
          isOpen={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          profile={profile}
          onSave={(updatedProfile) => {
            setProfile(updatedProfile);
          }}
          backButtonClass="text-white hover:text-white/90"
        />

      {/* Reject Application Confirmation Modal */}
      {rejectConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4 border-destructive/50">
            <h2 className="text-2xl font-bold text-destructive mb-2">⚠️ Reject Application</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Are you sure you want to reject the application from {rejectConfirm.providerName}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setRejectConfirm(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!rejectConfirm.jobId || !rejectConfirm.applicationId) return;
                  setLoadingAppIds(prev => new Set(prev).add(rejectConfirm.applicationId));
                  try {
                    const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
                    const token = session?.access_token || (session as any)?.accessToken || null;
                    const bodyPayload: any = { status: 'rejected' };
                    if (token) bodyPayload.accessToken = token;

                    const res = await fetch(`/api/job-applications/${rejectConfirm.applicationId}`, {
                      method: 'PATCH',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                      body: JSON.stringify(bodyPayload)
                    });

                    const raw = await res.text();
                    let response: any = null;
                    try { response = raw ? JSON.parse(raw) : null } catch (e) { response = raw }

                    if (!res.ok) {
                      const detailedError = response?.details ? JSON.stringify(response.details) : (response?.error || response || raw || 'Failed to reject application');
                      console.error('Error rejecting application:', { status: res.status, statusText: res.statusText, error: detailedError, response });
                      alert(response?.error || detailedError);
                      return;
                    }

                    // Update local state
                    setMyJobs(prev => prev.map(job => {
                      if (job.id === rejectConfirm.jobId) {
                        return {
                          ...job,
                          job_applications: job.job_applications.map(app => app.id === rejectConfirm.applicationId ? { ...app, status: 'rejected' } : app)
                        };
                      }
                      return job;
                    }));

                    alert('Application rejected.');
                    setRejectConfirm(null);
                  } catch (err) {
                    console.error('Error in reject application:', makePrintable(err));
                    alert('An unexpected error occurred: ' + makePrintable(err));
                    setRejectConfirm(null);
                  } finally {
                    setLoadingAppIds(prev => {
                      const next = new Set(prev);
                      next.delete(rejectConfirm.applicationId);
                      return next;
                    });
                  }
                }}
                variant="destructive"
                className="flex-1"
              >
                {loadingAppIds.has(rejectConfirm.applicationId) ? 'Rejecting...' : 'Yes, Reject'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ClientDashboard;


