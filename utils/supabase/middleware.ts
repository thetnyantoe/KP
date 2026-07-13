import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// 🔑 Check both common naming variations for safety in Production environments
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getRedirectUrl(request: NextRequest) {
  return new URL("/", request.url).toString();
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Missing Supabase configuration tokens in environment variables.",
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const pathname = request.nextUrl.pathname;

  // 🛡️ Protected route matching
  const needsAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!needsAdmin) {
    return supabaseResponse;
  }

  if (request.nextUrl.searchParams.has("_rsc")) {
    return supabaseResponse;
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.redirect(getRedirectUrl(request));
  }

  return supabaseResponse;
}
