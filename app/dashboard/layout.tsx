"use client"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative w-full min-h-screen">
      <div className="relative z-10 w-full min-h-screen bg-transparent text-white">
        {children}
      </div>
    </div>
  )
}