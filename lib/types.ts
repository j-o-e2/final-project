// User types
export interface User {
  id: string
  email: string
  name: string
  role: "client" | "provider"
  phone?: string
  location?: string
  createdAt: Date
}

// Service Provider types
export interface ServiceProvider {
  id: string
  userId: string
  category: string
  rating: number
  reviews: number
  price: string
  bio: string
  services: string[]
  availability: string
  image?: string
}

// Booking types
export interface Booking {
  id: string
  clientId: string
  providerId: string
  date: Date
  time: string
  status: "pending" | "confirmed" | "completed" | "cancelled"
  description: string
  amount: number
  createdAt: Date
}

// Review types
export interface Review {
  id: string
  bookingId: string
  clientId: string
  providerId: string
  rating: number
  comment: string
  createdAt: Date
}
