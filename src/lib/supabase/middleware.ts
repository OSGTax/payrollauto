import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(all) {
          for (const { name, value } of all) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of all) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const isAuthRoute = url.pathname.startsWith('/login');
  const isSetup = url.pathname.startsWith('/setup');
  const isApiAuth = url.pathname.startsWith('/api/auth');
  const isPublic =
    isAuthRoute ||
    isSetup ||
    isApiAuth ||
    url.pathname.startsWith('/_next') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/sw.js' ||
    url.pathname === '/offline.html';

  if (!user && !isPublic) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  if (user && isAuthRoute) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}
