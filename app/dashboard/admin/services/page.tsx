"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Edit, Trash2, Plus } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface Service {
  id: string
  name: string
  category: string
  description: string
  workers_count: number
  created_at: string
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/admin/services")
        if (!res.ok) throw new Error("Failed to fetch services")
        const data = await res.json()
        setServices(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchServices()

    // Subscribe to real-time updates on services table
    const subscription = supabase
      .channel("services-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        (payload) => {
          // Refetch services when changes occur
          fetchServices()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service? This will affect all workers using it.")) return
    try {
      console.log(`[Admin] Deleting service ${serviceId}`)
      const res = await fetch(`/api/admin/services/${serviceId}`, { method: "DELETE" })
      const responseData = await res.json()
      console.log(`[Admin] Response:`, responseData, `Status: ${res.status}`)
      
      if (!res.ok) {
        throw new Error(responseData?.error || `Failed to delete service (${res.status})`)
      }
      
      setServices(services.filter(s => s.id !== serviceId))
      alert("Service deleted successfully!")
    } catch (err: any) {
      console.error(`[Admin] Error deleting service:`, err)
      alert(`Error: ${err.message}`)
    }
  }

  const handleEditService = (service: Service) => {
    setEditingService(service)
    setEditName(service.name)
    setEditDescription(service.description)
  }

  const handleSaveEdit = async () => {
    if (!editingService) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/services/${editingService.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDescription }),
      })
      const responseData = await res.json()
      
      if (!res.ok) {
        throw new Error(responseData?.error || `Failed to update service (${res.status})`)
      }
      
      setServices(services.map(s => s.id === editingService.id ? { ...s, name: editName, description: editDescription } : s))
      setEditingService(null)
      alert("Service updated successfully!")
    } catch (err: any) {
      console.error(`[Admin] Error updating service:`, err)
      alert(`Error: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return <div className="p-6">Loading services...</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services Management</h1>
          <p className="text-muted-foreground">Manage service categories and listings</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Service
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Service Name</th>
                <th className="px-6 py-3 text-left font-medium">Category</th>
                <th className="px-6 py-3 text-left font-medium">Description</th>
                <th className="px-6 py-3 text-left font-medium">Workers</th>
                <th className="px-6 py-3 text-left font-medium">Added</th>
                <th className="px-6 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredServices.map(service => (
                <tr key={service.id} className="hover:bg-muted/50 transition">
                  <td className="px-6 py-4 font-medium">{service.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{service.category}</td>
                  <td className="px-6 py-4 text-muted-foreground text-xs line-clamp-1">{service.description}</td>
                  <td className="px-6 py-4 text-center font-semibold">{service.workers_count}</td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(service.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-1"
                        onClick={() => handleEditService(service)}
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-red-600 hover:bg-red-100"
                        onClick={() => handleDeleteService(service.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editingService && (
        <Card className="p-4 mt-6">
          <h2 className="text-xl font-semibold mb-4">Edit Service</h2>
          <div className="grid gap-4">
            <Input
              placeholder="Service Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={isSaving}
            />
            <Input
              placeholder="Service Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setEditingService(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className={isSaving ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
