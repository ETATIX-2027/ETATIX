import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Menyegarkan token sesi Supabase di halaman yang memerlukan login agar
// Server Components (mis. /dashboard) tidak mendadak kehilangan sesi.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  try { await supabase.auth.getUser(); } catch { /* jaringan gagal: biarkan halaman menangani sendiri */ }
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/organizer/:path*', '/my-tickets/:path*', '/payment/:path*'],
};
