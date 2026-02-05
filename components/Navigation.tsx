"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { Menu, X, LogOut, Home, Briefcase, Users, Settings, ArrowLeft, AlertCircle } from "lucide-react"

interface UserProfile {
  id: string
  role?: string
  full_name?: string
  avatar_url?: string | null
}

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user || null)

        if (session?.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, role, full_name, avatar_url")
            .eq("id", session.user.id)
            .single()
          setProfile(profileData || null)
        }
      } catch (err) {
        console.error("Auth check error:", err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, role, full_name, avatar_url")
          .eq("id", session.user.id)
          .single()
        setProfile(profileData || null)
      } else {
        setProfile(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    setMobileMenuOpen(false)
  }

  // Determine if we should show back button
  const showBackButton = pathname && !["", "/", "/jobs", "/services", "/bookings", "/dashboard"].includes(pathname)

  // Navigation links based on user role
  const getNavLinks = () => {
    if (!user) {
      return [
        { label: "Browse Jobs", href: "/jobs", icon: Briefcase },
        { label: "Services", href: "/services", icon: Users },
      ]
    }

    if (profile?.role === "admin") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: Home },
        { label: "Jobs", href: "/jobs", icon: Briefcase },
        { label: "Services", href: "/services", icon: Users },
        { label: "Disputes", href: "/admin/disputes", icon: AlertCircle },
      ]
    }

    if (profile?.role === "client") {
      return [
        { label: "Dashboard", href: "/dashboard/client", icon: Home },
        { label: "Post Job", href: "/jobs/post", icon: Briefcase },
        { label: "Bookings", href: "/bookings", icon: Users },
        { label: "Disputes", href: "/dashboard/disputes", icon: AlertCircle },
      ]
    }

    if (profile?.role === "worker") {
      return [
        { label: "Dashboard", href: "/dashboard/worker", icon: Home },
        { label: "Find Jobs", href: "/jobs", icon: Briefcase },
        { label: "Services", href: "/services", icon: Users },
        { label: "Disputes", href: "/dashboard/disputes", icon: AlertCircle },
      ]
    }

    return [
      { label: "Browse Jobs", href: "/jobs", icon: Briefcase },
      { label: "Services", href: "/services", icon: Users },
    ]
  }

  const navLinks = getNavLinks()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Back Button for Detail Pages */}
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="mr-2 p-2 hover:bg-muted rounded-lg"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary hover:text-primary/80">
            <span>🚀</span> FixKenya
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || pathname?.startsWith(link.href + "/")
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center gap-3">
            {user && profile ? (
              <>
                <Link href="/profile">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Profile
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-muted rounded-lg"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || pathname?.startsWith(link.href + "/")
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                </Link>
              )
            })}
            <hr className="my-2 opacity-50" />
            {user && profile ? (
              <>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full justify-start flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Profile
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="ghost" size="sm" className="w-full justify-start text-red-500">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
