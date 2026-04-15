import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/cadastro', '/']

export async function proxy(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (user) {
      // Already authed → check onboarding
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('onboarding_done')
        .eq('user_id', user.id)
        .single()

      if (workspace && !workspace.onboarding_done) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      if (pathname === '/login' || pathname === '/cadastro') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
    return supabaseResponse
  }

  // Protected routes — must be authenticated
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check onboarding (skip if already on /onboarding)
  if (pathname !== '/onboarding') {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('onboarding_done')
      .eq('user_id', user.id)
      .single()

    if (workspace && !workspace.onboarding_done) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
