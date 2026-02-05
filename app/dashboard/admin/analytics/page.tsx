"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface AnalyticsData {
  userGrowth: Array<{ date: string; users: number }>
  jobTrends: Array<{ date: string; jobs: number; completed: number }>
  topServices: Array<{ name: string; count: number }>
  usersByRole: Array<{ name: string; value: number }>
  applicationStats: Array<{ status: string; count: number }>
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/admin/analytics")
        if (!res.ok) throw new Error("Failed to fetch analytics")
        const data = await res.json()
        setAnalytics(data)
      } catch (err: any) {
        setError(err.message)
        console.error("Error fetching analytics:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading) return <div className="p-6">Loading analytics...</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>
  if (!analytics) return <div className="p-6">No data available</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Platform trends and insights</p>
      </div>

      {/* User Growth Chart */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">User Growth (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.userGrowth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} name="Total Users" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Job Trends */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Job Activity (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.jobTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="jobs" fill="#3b82f6" name="New Jobs" />
            <Bar dataKey="completed" fill="#10b981" name="Completed Jobs" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Three Column Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Users by Role */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Users by Role</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={analytics.usersByRole}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.usersByRole.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Services */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Top Services</h2>
          <div className="space-y-3">
            {analytics.topServices.map((service, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm">{service.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (service.count / Math.max(...analytics.topServices.map(s => s.count))) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{service.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Application Status */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Application Status</h2>
          <div className="space-y-3">
            {analytics.applicationStats.map((stat, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm font-medium">{stat.status}</span>
                <span className="text-lg font-bold text-primary">{stat.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
