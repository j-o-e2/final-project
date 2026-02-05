import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // For admin routes, just let them through - the page will handle auth verification
  // This avoids cookie parsing issues and complexity in middleware
  // The admin dashboard page will:
  // 1. Check if user is authenticated
  // 2. Check if user has admin role
  // 3. Redirect to login or show error if not authorized
  
  if (request.nextUrl.pathname.startsWith('/dashboard/admin')) {
    // Allow the request to go through, page handles auth
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/admin/:path*'],
}
