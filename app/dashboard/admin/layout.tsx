"use client"

import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Package,
  Star,
  BarChart3,
  AlertCircle,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
} from "lucide-react"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    // Check if user is admin (could fetch from session)
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/debug/auth-config")
        const data = await res.json()
        if (data.session.authenticated) {
          setUserRole(data.session.user)
        } else {
          router.push("/login")
        }
      } catch (e) {
        // silent
      }
    }
    checkAuth()

    // Check if browser history has previous entries
    if (typeof window !== "undefined") {
      // Enable back button if there's history (simplified check)
      setCanGoBack(window.history.length > 1)
    }
  }, [router])

  const menuItems = [
    {
      label: "Dashboard",
      href: "/dashboard/admin",
      icon: LayoutDashboard,
    },
    {
      label: "Users",
      href: "/dashboard/admin/users",
      icon: Users,
    },
    {
      label: "Jobs",
      href: "/dashboard/admin/jobs",
      icon: Briefcase,
    },
    {
      label: "Applications",
      href: "/dashboard/admin/applications",
      icon: FileText,
    },
    {
      label: "Services",
      href: "/dashboard/admin/services",
      icon: Package,
    },
    {
      label: "Reviews & Ratings",
      href: "/dashboard/admin/reviews",
      icon: Star,
    },
    {
      label: "Analytics",
      href: "/dashboard/admin/analytics",
      icon: BarChart3,
    },
    {
      label: "Reports",
      href: "/dashboard/admin/reports",
      icon: AlertCircle,
    },
  ]

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  const isActive = (href: string) => pathname === href || (href !== "/dashboard/admin" && pathname.startsWith(href))

  return (
    <div className="flex h-screen bg-background relative">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-50 md:z-auto h-screen left-0 top-0 w-64 bg-card border-r border-border transition-all duration-300 flex flex-col overflow-hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="h-16 px-4 flex items-center border-b border-border">
          {sidebarOpen && <h2 className="text-lg font-bold text-primary">Admin</h2>}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top Bar */}
        <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              {canGoBack && pathname !== "/dashboard/admin" && (
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-accent rounded-lg transition-colors ml-2"
                  title="Go back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <div className="text-sm text-muted-foreground truncate max-w-[10rem]">
                {userRole && `Logged in as: ${userRole}`}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors ml-2"
                title="Logout"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
