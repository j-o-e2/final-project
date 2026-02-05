"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Star, Award, Search, Trash2 } from "lucide-react"

interface Review {
  id: string
  reviewer_name: string
  reviewer_avatar?: string | null
  rating: number
  comment: string
  created_at: string
}

interface WorkerStats {
  id: string
  name: string
  email: string
  avatar_url?: string | null
  avgRating: number
  totalReviews: number
  reviews: Review[]
}

export default function AdminReviewsPage() {
  const [workers, setWorkers] = useState<WorkerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"rating" | "reviews">("rating")

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/admin/reviews")
        if (!res.ok) throw new Error("Failed to fetch reviews")
        const data = await res.json()
        setWorkers(data)
      } catch (err: any) {
        setError(err.message)
        console.error("Error fetching reviews:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchReviews()
  }, [])

  const filteredWorkers = workers
    .filter(w => w.name.toLowerCase().includes(search.toLowerCase()) || w.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === "rating" ? b.avgRating - a.avgRating : b.totalReviews - a.totalReviews)

  const handleDeleteReview = async (reviewId: string, workerId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return
    try {
      console.log(`[Admin] Deleting review ${reviewId}`)
      const res = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" })
      const responseData = await res.json()
      console.log(`[Admin] Response:`, responseData, `Status: ${res.status}`)
      
      if (!res.ok) {
        throw new Error(responseData?.error || `Failed to delete review (${res.status})`)
      }
      
      // Update the UI by refetching
      setWorkers(workers.map(w => 
        w.id === workerId 
          ? { ...w, reviews: w.reviews.filter(r => r.id !== reviewId), totalReviews: w.totalReviews - 1 }
          : w
      ))
      alert("Review deleted successfully!")
    } catch (err: any) {
      console.error(`[Admin] Error deleting review:`, err)
      alert(`Error: ${err.message}`)
    }
  }

  if (loading) return <div className="p-6">Loading reviews...</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reviews & Ratings</h1>
        <p className="text-muted-foreground">Manage worker ratings and upgrade high performers</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search workers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "rating" | "reviews")}
            className="px-3 py-2 rounded border border-border bg-background"
          >
            <option value="rating">Sort by Rating (High to Low)</option>
            <option value="reviews">Sort by Review Count</option>
          </select>
          <div className="text-sm text-muted-foreground pt-2">
            {filteredWorkers.length} workers
          </div>
        </div>
      </Card>

      {/* Workers Grid */}
      <div className="space-y-4">
        {filteredWorkers.map(worker => (
          <Card key={worker.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold">{worker.name}</h3>
                <p className="text-sm text-muted-foreground">{worker.email}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.round(worker.avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <p className="text-sm font-semibold">{worker.avgRating.toFixed(1)} / 5</p>
                <p className="text-xs text-muted-foreground">{worker.totalReviews} reviews</p>
              </div>
            </div>

            {/* Recent Reviews */}
            {worker.reviews && worker.reviews.length > 0 ? (
              <div className="space-y-3 mb-4 pb-4 border-b border-border">
                {worker.reviews.slice(0, 3).map(review => (
                  <div key={review.id} className="text-sm p-2 bg-muted/30 rounded flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{review.reviewer_name}</span>
                        <span className="text-xs">⭐ {review.rating}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">{review.comment || 'No comment'}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-red-600 hover:bg-red-100 ml-2"
                      onClick={() => handleDeleteReview(review.id, worker.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-4 pb-4 border-b border-border text-xs text-muted-foreground">
                No reviews yet
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Link href={`/dashboard/admin/manage-user/${worker.id}`}>
                <Button size="sm" variant="outline">
                  <Award className="w-4 h-4 mr-1" />
                  Award Badge
                </Button>
              </Link>
              {worker.avgRating >= 4.5 && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Award className="w-4 h-4 mr-1" />
                  Upgrade Profile
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredWorkers.length === 0 && (
        <div className="text-center p-8 text-muted-foreground">
          No workers found matching your search
        </div>
      )}
    </div>
  )
}
