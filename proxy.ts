import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
  const { pathname } = req.nextUrl

  console.log('[MIDDLEWARE] Path:', pathname, '| Token exists:', !!token)

  if (pathname === '/billing') {
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('returnUrl', '/dashboard')
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  const protectedRoutes = ['/dashboard', '/admin', '/settings']

  if (protectedRoutes.some(path => pathname.startsWith(path))) {
    if (!token) {
      console.log('[MIDDLEWARE] No token found, redirecting to /login')
      return NextResponse.redirect(new URL('/login', req.url))
    }

    console.log('[MIDDLEWARE] Token found, allowing access')
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/billing', '/dashboard/:path*', '/admin/:path*', '/settings/:path*'],
}

