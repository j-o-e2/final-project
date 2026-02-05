Integration Guide: DottedSurface Component

Overview
- Files added:
  - `components/ui/dotted-surface.tsx` (Three.js animated dotted surface)
  - `components/ui/dotted-surface-demo.tsx` (small demo wrapper)
- This project already uses TypeScript and Tailwind (see `package.json` and `app/globals.css`). The `components/ui` folder exists and is the correct place for UI primitives in a shadcn-style layout.

Why `components/ui`?
- `components/ui` is the conventional folder used by the shadcn component library generator to store small, reusable UI primitives (buttons, inputs, toggles, etc.).
- Keeping UI components under `components/ui` makes it easy to import them across the app with short paths like `@/components/ui/button` and groups styling/variants in a predictable place.

Required dependencies
- `three` (Three.js) for the WebGL animation (already present in `package.json`, but install if missing):

```bash
npm install three
# or
pnpm add three
```

- `next-themes` (already in `package.json`) is used to read theme for color choices. If not installed:

```bash
npm install next-themes
# or
pnpm add next-themes
```

- `clsx` / `tailwind-merge` / `cn` helper: project already has `clsx` and `tailwind-merge` and a `cn` helper at `lib/utils.ts`.

Quick usage examples

1) Import the demo inside a dashboard or homepage component:

```tsx
import DottedSurfaceDemo from '@/components/ui/dotted-surface-demo'

export default function Dashboard() {
  return (
    <div className="p-6">
      <DottedSurfaceDemo />
      {/* rest of dashboard */}
    </div>
  )
}
```

2) Import the raw component if you want the canvas background behind other content:

```tsx
import { DottedSurface } from '@/components/ui/dotted-surface'

export default function Hero() {
  return (
    <div className="relative h-[520px]">
      <DottedSurface />
      <div className="absolute inset-0 flex items-center justify-center">
        <h2 className="text-4xl font-bold">CONNECTING RURAL WORKERS TO JOBS</h2>
      </div>
    </div>
  )
}
```

Notes & Compatibility
- The component uses `useTheme()` from `next-themes`. Make sure the application provides a ThemeProvider at the root (if you removed it earlier, add it back to `app/layout.tsx` or use a simplified approach):

```tsx
'use client'
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- If you prefer not to use `next-themes`, you can modify the component to accept a `theme` prop and remove `useTheme()`.
- The component is a client component and requires `'use client'` at the top of the file (this is already in place).
- Three.js can be heavy; the component attempts to keep geometry/material usage reasonable. If you experience performance issues on low-end devices, reduce `AMOUNTX`/`AMOUNTY` values or reduce `size` in the material.

Troubleshooting
- If you see a blank area where the canvas should be, open the browser console for WebGL errors. Some browsers/VMs may not support WebGL.
- Ensure `three` is installed and at a compatible version. The code uses standard Three APIs and should work with recent `three` versions (r180+).

Where to place the component in this repo
- `components/ui` exists — this is the correct place. The demo can be used in the homepage or in any `app/.../page.tsx` or dashboard layout.

Next steps I can do for you (pick any):
- Add a usage example to the dashboard layout (`app/dashboard/layout.tsx`) so the dotted surface appears behind the dashboard header.
- Re-enable `ThemeProvider` in `app/layout.tsx` if you want the component to react to light/dark modes.
- Add a small toggle (client-only) to disable the animation for low-power devices.

