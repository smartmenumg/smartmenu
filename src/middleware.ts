import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database, Profile, UserRole } from "@/types/database";

// ─── Route permission map ────────────────────────────────────────────────────────

const ROUTE_ROLE_MAP: Array<{ prefix: string; roles: UserRole[] }> = [
  // super-admin prefix: admins are also allowed so page-level checks can grant granular access
  { prefix: "/dashboard/super-admin", roles: ["admin", "super_admin"] },
  { prefix: "/dashboard/admin",       roles: ["admin", "super_admin"] },
  { prefix: "/dashboard/menu",        roles: ["menu", "admin", "super_admin"] },
  { prefix: "/dashboard",             roles: ["menu", "admin", "super_admin"] },
];

// Map of permission keys to their possible URL segment representations
const PERMISSION_SEGMENT_MAP: Record<string, string[]> = {
  live_orders: ["admin"],           // /dashboard/admin → live_orders
  menu:        ["menu", "categories", "products"],
  revenue:     ["revenue"],
  accounts:    ["accounts"],
  audit_logs:  ["audit"],
  qr_codes:    ["qr-codes"],
};

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
    const profile = await getUserProfile(request, user.id);
    if (!profile) {
      return NextResponse.redirect(new URL("/auth/unauthorized", request.url));
    }

    const { role, permissions } = profile;

    // super_admin always passes
    if (role === "super_admin") {
      return supabaseResponse;
    }

    // For non-super_admin roles, verify their role is listed for this route
    if (!routeRule.roles.includes(role)) {
      return NextResponse.redirect(new URL("/auth/unauthorized", request.url));
    }

    // For admins on the super-admin prefix, verify they have at least one
    // permission that corresponds to a segment of the requested path.
    // Page-level checks will enforce the exact permission; middleware just
    // ensures the request is plausibly authorised.
    if (role === "admin" && pathname.startsWith("/dashboard/super-admin")) {
      const segments = pathname.split("/").filter(Boolean);
      const hasMatchingPermission = permissions.some((p) => {
        const aliases = PERMISSION_SEGMENT_MAP[p] ?? [p, p.replace(/_/g, "-")];
        return aliases.some((alias) => segments.includes(alias));
      });

      if (!hasMatchingPermission) {
        return NextResponse.redirect(new URL("/auth/unauthorized", request.url));
      }
    }
  }

  return supabaseResponse;
}

/** Refresh session without full role check (used for public routes) */
async function refreshSession(request: NextRequest) {
  const { supabaseResponse } = await updateSession(request);
  return supabaseResponse;
}

/** Fetch user profile (role + permissions) from profiles table using the middleware client */
async function getUserProfile(
  request: NextRequest,
  userId: string
): Promise<{ role: UserRole; permissions: string[] } | null> {
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
    .select("role, active, permissions")
    .eq("id", userId)
    .single<Pick<Profile, "role" | "active" | "permissions">>();

  if (!data || !data.active) return null;
  return { role: data.role, permissions: data.permissions || [] };
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
