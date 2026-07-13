import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/navigation";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options }),
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options }),
          );
        },
      },
    },
  );

  // 3. Retrieve the current active user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. Protection Rule: If they are trying to visit /admin pages but have no session, send them to login
  if (!user && request.nextUrl.pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/"; // 🔄 Change this to your exact login route if it's not the root path
    return NextResponse.redirect(url);
  }

  return response;
}

// 🎯 Matcher Config: Run this middleware ONLY on /admin routes to save performance
export const config = {
  matcher: ["/admin/:path*"],
};
