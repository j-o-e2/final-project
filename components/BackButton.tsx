"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface BackButtonProps {
  label?: string
  className?: string
  variant?: "default" | "outline" | "ghost"
}

export default function BackButton({ 
  label = "Go Back", 
  className = "",
  variant = "outline" 
}: BackButtonProps) {
  const router = useRouter()

  return (
    <Button
      onClick={() => router.back()}
      variant={variant}
      size="sm"
      className={`flex items-center gap-2 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </Button>
  )
}
