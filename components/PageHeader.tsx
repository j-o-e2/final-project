"use client"

import { ReactNode } from "react"
import BackButton from "@/components/BackButton"

interface PageHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  backLabel?: string
  children?: ReactNode
  actions?: ReactNode
}

export default function PageHeader({
  title,
  subtitle,
  showBack = true,
  backLabel = "Go Back",
  children,
  actions,
}: PageHeaderProps) {
  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            {showBack && <BackButton label={backLabel} className="mb-4" />}
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}
