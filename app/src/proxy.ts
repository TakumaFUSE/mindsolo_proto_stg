import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_ROUTES  = ['/login', '/signup', '/forgot-password', '/terms']
const PUBLIC_PATHS = ['/', ...AUTH_ROUTES]

export async function proxy(request: NextRequest) {
  // Allow all requests if Supabase credentials are not configured (local dev without .env.local)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Invalid / expired session → treat as unauthenticated
  }

  const { pathname } = request.nextUrl
  const isAuthRoute  = AUTH_ROUTES.some(r => pathname.startsWith(r))
  const isPublicPath = PUBLIC_PATHS.some(r => pathname === r)
  const isCronRoute  = pathname.startsWith('/api/cron/')

  // Cron routes are authenticated by CRON_SECRET header, not user session
  if (isCronRoute) return supabaseResponse

  // Unauthenticated access to protected route → /login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated user on auth page → /feed
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/feed'
    return NextResponse.redirect(url)
  }

  // Plan feature-flag check lives here when 'pro' features are introduced.
  // Phase 1: all features are 'free' → no-op.

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
