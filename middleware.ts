import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
  const { pathname } = req.nextUrl

  console.log('[MIDDLEWARE] Path:', pathname, '| Token exists:', !!token)

  // Handle /billing redirect - redirect to dashboard (which will check auth)
  if (pathname === '/billing') {
    if (!token) {
      // Not logged in, redirect to login with return URL
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('returnUrl', '/dashboard')
      return NextResponse.redirect(loginUrl)
    }
    // Logged in, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  const protectedRoutes = ['/dashboard', '/admin', '/settings']

  if (protectedRoutes.some(path => pathname.startsWith(path))) {
    if (!token) {
      console.log('[MIDDLEWARE] No token found, redirecting to /login')
      return NextResponse.redirect(new URL('/login', req.url))
    }

    console.log('[MIDDLEWARE] Token found, allowing access')

    // Simple role check for admin routes
    // Ideally we decode JWT here, but middleware environment (Edge) needs specific libraries
    // For now, we'll rely on server-side/client-side guards for granular roles
    if (pathname.startsWith('/admin')) {
      // In a real app, we'd check the 'role' claim in the token here
      // If not superadmin, redirect to /dashboard
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/billing', '/dashboard/:path*', '/admin/:path*', '/settings/:path*'],
}
