"use client"

import React from "react"

type DottedSurfaceProps = Omit<React.ComponentProps<"div">, "ref">

// No-op stub. The heavy three.js implementation was removed to fully
// remove the dotted theme. Keeping a small stub prevents import failures
// in pages that still reference the symbol until callers are cleaned up.
export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
  return (
    <div
      aria-hidden="true"
      className={className ?? "pointer-events-none fixed inset-0 z-0"}
      {...props}
    />
  )
}
