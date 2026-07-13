import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Catch all routes except internal system files, assets, and images
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
