import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require a logged-in user
// /admin is included so unauthenticated users are sent to /login.
// Role check (ADMIN) is handled client-side in AdminShell + server-side by AdminGuard.
const PROTECTED_PREFIXES = ['/dashboard', '/create', '/admin']

// Routes that should redirect to /dashboard when already logged in
const AUTH_ONLY_PATHS = ['/login', '/register']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const isAuthOnly = AUTH_ONLY_PATHS.includes(pathname)

  // Unauthenticated user trying to access protected page → send to login
  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname) // preserve intended destination
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user visiting login/register → send to dashboard
  if (isAuthOnly && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Only run middleware on these routes — keeps it fast
  matcher: ['/dashboard/:path*', '/create/:path*', '/admin/:path*', '/admin', '/login', '/register'],
}
