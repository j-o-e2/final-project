"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";

export default function OfferServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
    location: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Check profile completion before allowing service offer
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone, location')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        alert("Unable to verify profile. Please try again.");
        setLoading(false);
        return;
      }

      if (!profile.full_name?.trim() || !profile.email?.trim() || !profile.phone?.trim() || !profile.location?.trim()) {
        alert("Please complete your profile (Name, Email, Phone, Location) before offering a service.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from("services").insert([
        {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          duration: formData.duration,
          location: formData.location,
          provider_id: user.id,
          status: 'pending', // default status so worker can monitor/approve
        },
      ]);

      if (error) {
        alert("Error creating service: " + error.message);
        return;
      }

      alert("Service created successfully!");
      router.push("/dashboard/worker");
    } catch (error) {
      console.error("Error:", error);
      alert("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">Offer a New Service</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Service Name
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., House Cleaning"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="Describe your service in detail..."
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-1">
                Price (KES)
              </label>
              <Input
                id="price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                placeholder="e.g., 1000"
              />
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium mb-1">
                Duration
              </label>
              <Input
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                placeholder="e.g., 2 hours"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-1">
                Location
              </label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                placeholder="e.g., Nairobi, Kayole"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Creating..." : "Create Service"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}