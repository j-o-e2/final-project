"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Award, Settings, Star } from "lucide-react"

interface User {
  id: string
  email: string
  full_name: string
  role: string
  phone: string
  email_verified: boolean
  phone_verified: boolean
  avgRating: number
  totalReviews: number
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/admin/users")
        const raw = await res.text()
        let data: any = null
        try {
          data = raw ? JSON.parse(raw) : null
        } catch {
          data = raw
        }

        if (!res.ok) {
          const msg = (data && (data.error || data.message)) || (typeof data === 'string' ? data : 'Failed to fetch users')
          throw new Error(msg)
        }

        setUsers(Array.isArray(data) ? data : (data?.data || []))
      } catch (err: any) {
        setError(err.message)
        console.error("Error fetching users:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (loading) return <div className="p-6">Loading users...</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage, verify, and award users</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded border border-border bg-background"
          >
            <option value="all">All Roles</option>
            <option value="worker">Workers</option>
            <option value="client">Clients</option>
            <option value="admin">Admins</option>
          </select>
          <div className="text-sm text-muted-foreground pt-2">
            {filteredUsers.length} of {users.length} users
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Name</th>
                <th className="px-6 py-3 text-left font-medium">Email</th>
                <th className="px-6 py-3 text-left font-medium">Role</th>
                <th className="px-6 py-3 text-left font-medium">Rating</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Joined</th>
                <th className="px-6 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-muted/50 transition">
                  <td className="px-6 py-4 font-medium">{user.full_name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === "admin" ? "bg-red-100 text-red-700" :
                      user.role === "worker" ? "bg-blue-100 text-blue-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {user.totalReviews > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < Math.round(user.avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-semibold">{user.avgRating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No ratings</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="space-y-1">
                      {user.email_verified ? (
                        <span className="text-green-600">✓ Email verified</span>
                      ) : (
                        <span className="text-orange-600">⚠ Email unverified</span>
                      )}
                      {user.phone_verified ? (
                        <span className="text-green-600 block">✓ Phone verified</span>
                      ) : (
                        <span className="text-orange-600 block">⚠ Phone unverified</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Link href={`/dashboard/admin/manage-user/${user.id}`}>
                        <Button size="sm" variant="outline">
                          <Settings className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No users found matching your filters
          </div>
        )}
      </Card>
    </div>
  )
}
