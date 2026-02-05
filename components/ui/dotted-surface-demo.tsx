"use client"

import React from "react"

// Simple demo stub. Keeps the demo component present but lightweight so
// references won't cause heavy client bundles or runtime three.js usage.
export default function DottedSurfaceDemo() {
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-lg">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <h1 className="font-mono text-3xl font-semibold">Dotted Surface (removed)</h1>
      </div>
    </div>
  )
}
