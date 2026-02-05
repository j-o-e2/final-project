"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Briefcase, FileText, Package, Star, AlertCircle, TrendingUp, LogOut, User } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import EditProfileModal from "@/components/EditProfileModal"

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalJobs: number
  activeJobs: number
  totalApplications: number
  pendingApplications: number
  totalServices: number
  totalReviews: number
  averageRating: number
  topWorkerByRating: string | null
}

export default function AdminDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editProfileOpen, setEditProfileOpen] = useState(false)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        // Fetch admin profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()

        setProfile(profileData)

        // Fetch stats
        setLoading(true)
        const res = await fetch("/api/admin/dashboard/stats")
        if (!res.ok) throw new Error("Failed to fetch stats")
        const data = await res.json()
        setStats(data)
      } catch (err: any) {
        setError(err.message)
        console.error("Error fetching dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()

    // Set up real-time subscriptions to refresh stats when data changes
    const subscriptions: any[] = []

    const setupSubscriptions = async () => {
      try {
        // Subscribe to services table changes
        const servicesSubscription = supabase
          .channel("admin:services")
          .on("postgres_changes", { event: "*", schema: "public", table: "services" }, () => {
            fetchDashboardData()
          })
          .subscribe()
        subscriptions.push(servicesSubscription)

        // Subscribe to jobs table changes
        const jobsSubscription = supabase
          .channel("admin:jobs")
          .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
            fetchDashboardData()
          })
          .subscribe()
        subscriptions.push(jobsSubscription)

        // Subscribe to job applications changes
        const applicationsSubscription = supabase
          .channel("admin:applications")
          .on("postgres_changes", { event: "*", schema: "public", table: "job_applications" }, () => {
            fetchDashboardData()
          })
          .subscribe()
        subscriptions.push(applicationsSubscription)

        // Subscribe to bookings changes
        const bookingsSubscription = supabase
          .channel("admin:bookings")
          .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
            fetchDashboardData()
          })
          .subscribe()
        subscriptions.push(bookingsSubscription)

        // Subscribe to reviews changes
        const reviewsSubscription = supabase
          .channel("admin:reviews")
          .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => {
            fetchDashboardData()
          })
          .subscribe()
        subscriptions.push(reviewsSubscription)
      } catch (error) {
        console.error("Error setting up subscriptions:", error)
      }
    }

    setupSubscriptions()

    // Cleanup subscriptions on unmount
    return () => {
      subscriptions.forEach(sub => supabase.removeChannel(sub))
    }
  }, [])

  const StatCard = ({ icon: Icon, label, value, trend, href }: any) => (
    <Link href={href || "#"}>
      <Card className="p-6 space-y-2 cursor-pointer hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
          {trend && <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">{trend}</span>}
        </div>
      </Card>
    </Link>
  )

  if (loading) return <div className="p-6 text-center">Loading dashboard...</div>
  if (error) return <div className="p-6 text-center text-red-600">Error: {error}</div>
  if (!stats) return <div className="p-6 text-center">No data available</div>

  return (
    <div className="space-y-6 max-w-full overflow-x-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of platform activity and metrics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setEditProfileOpen(true)}
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Edit Profile
          </Button>
          <Button
            variant="outline"
            onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} href="/dashboard/admin/users" />
        <StatCard icon={Users} label="Active Users" value={stats.activeUsers} trend="Last 30d" href="/dashboard/admin/users" />
        <StatCard icon={Briefcase} label="Total Jobs" value={stats.totalJobs} href="/dashboard/admin/jobs" />
        <StatCard icon={Briefcase} label="Active Jobs" value={stats.activeJobs} href="/dashboard/admin/jobs" />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Applications" value={stats.totalApplications} href="/dashboard/admin/applications" />
        <StatCard icon={FileText} label="Pending" value={stats.pendingApplications} trend="Action needed" href="/dashboard/admin/applications" />
        <StatCard icon={Package} label="Services" value={stats.totalServices} href="/dashboard/admin/services" />
        <StatCard icon={Star} label="Avg Rating" value={stats.averageRating.toFixed(2)} href="/dashboard/admin/reviews" />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/dashboard/admin/users">
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                View All Users
              </Button>
            </Link>
            <Link href="/dashboard/admin/reviews">
              <Button variant="outline" className="w-full justify-start">
                <Star className="w-4 h-4 mr-2" />
                Review Ratings
              </Button>
            </Link>
            <Link href="/dashboard/admin/jobs">
              <Button variant="outline" className="w-full justify-start">
                <Briefcase className="w-4 h-4 mr-2" />
                Manage Jobs
              </Button>
            </Link>
            <Link href="/dashboard/admin/applications">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                View Applications
              </Button>
            </Link>
          </div>
        </Card>

        {/* Top Performers */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Top Performers</h2>
          <div className="space-y-3">
            {stats.topWorkerByRating ? (
              <>
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-green-700 font-medium">Highest Rated Worker</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{stats.topWorkerByRating}</p>
                  <p className="text-xs text-muted-foreground mt-1">⭐ {stats.averageRating} avg</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No ratings yet</p>
            )}
            <Link href="/dashboard/admin/reviews">
              <Button variant="ghost" className="w-full justify-start text-primary">
                View All →
              </Button>
            </Link>
          </div>
        </Card>

        {/* Recent Alerts */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Recent Alerts</h2>
          <div className="space-y-3">
            {stats.pendingApplications > 5 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded flex gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-yellow-900">{stats.pendingApplications} pending applications</p>
                  <p className="text-yellow-700">Action needed</p>
                </div>
              </div>
            )}
            {stats.totalServices === 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded flex gap-2">
                <AlertCircle className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-blue-900">Set up services</p>
                  <p className="text-blue-700">Configure service categories</p>
                </div>
              </div>
            )}
            {!stats.topWorkerByRating && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded flex gap-2">
                <AlertCircle className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-purple-900">No reviews yet</p>
                  <p className="text-purple-700">Encourage user reviews</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        profile={profile}
        onSave={(updatedProfile) => {
          setProfile(updatedProfile)
        }}
      />
    </div>
  )
}
