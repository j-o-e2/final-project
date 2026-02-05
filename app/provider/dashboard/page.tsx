"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { ArrowLeft, TrendingUp, Users, Calendar, DollarSign } from "lucide-react"

// Mock data
const STATS = [
  { label: "Total Earnings", value: "KES 45,000", icon: DollarSign },
  { label: "Completed Jobs", value: "28", icon: Calendar },
  { label: "Active Clients", value: "12", icon: Users },
  { label: "Rating", value: "4.8/5", icon: TrendingUp },
]

const CHART_DATA = [
  { month: "Jan", earnings: 3000 },
  { month: "Feb", earnings: 4500 },
  { month: "Mar", earnings: 3800 },
  { month: "Apr", earnings: 5200 },
  { month: "May", earnings: 6100 },
  { month: "Jun", earnings: 5800 },
]

const RECENT_BOOKINGS = [
  { id: 1, client: "Alice Johnson", date: "2025-11-15", status: "Completed", amount: "KES 2,500" },
  { id: 2, client: "Bob Smith", date: "2025-11-18", status: "Pending", amount: "KES 3,000" },
  { id: 3, client: "Carol White", date: "2025-11-20", status: "Confirmed", amount: "KES 2,800" },
]

export default function ProviderDashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Provider Dashboard</h1>
        </div>
      </header>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {STATS.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <Icon className="w-8 h-8 text-primary" />
                </div>
              </Card>
            )
          })}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Earnings Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip />
                <Line type="monotone" dataKey="earnings" stroke="var(--color-primary)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Bookings</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip />
                <Bar dataKey="earnings" fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recent Bookings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Bookings</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_BOOKINGS.map((booking) => (
                  <tr key={booking.id} className="border-b border-border hover:bg-secondary">
                    <td className="py-3 px-4 text-foreground">{booking.client}</td>
                    <td className="py-3 px-4 text-foreground">{booking.date}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === "Completed"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{booking.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  )
}
