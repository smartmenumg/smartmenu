import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database, Profile, UserRole } from "@/types/database";

// ─── Route permission map ────────────────────────────────────────────────────────

const ROUTE_ROLE_MAP: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/dashboard/super-admin", roles: ["super_admin"] },
  { prefix: "/dashboard/admin",       roles: ["admin", "super_admin"] },
  { prefix: "/dashboard/menu",        roles: ["menu", "super_admin"] },
  { prefix: "/dashboard",             roles: ["menu", "admin", "super_admin"] },
];

/** Public routes — never redirect */
const PUBLIC_PREFIXES = ["/order", "/track", "/my-orders", "/auth", "/api", "/_next", "/favicon"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return await refreshSession(request);
  }

  // Root redirect
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/order", request.url));
  }

  // Refresh session first
  const { supabaseResponse, user } = await updateSession(request);

  // Unauthenticated on a protected route → login
  if (!user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role for dashboard routes
  const routeRule = ROUTE_ROLE_MAP.find((r) => pathname.startsWith(r.prefix));
  if (routeRule) {
    const role = await getUserRole(request, user.id);
    if (!role || !routeRule.roles.includes(role)) {
      return NextResponse.redirect(new URL("/auth/unauthorized", request.url));
    }
  }

  return supabaseResponse;
}

/** Refresh session without full role check (used for public routes) */
async function refreshSession(request: NextRequest) {
  const { supabaseResponse } = await updateSession(request);
  return supabaseResponse;
}

/** Fetch user role from profiles table using the middleware client */
async function getUserRole(
  request: NextRequest,
  userId: string
): Promise<UserRole | null> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {}, // read-only in this context
      },
    }
  );

  const { data } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", userId)
    .single<Pick<Profile, "role" | "active">>();

  if (!data || !data.active) return null;
  return data.role;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     * This is the recommended pattern from Supabase docs.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
