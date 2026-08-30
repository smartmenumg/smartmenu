import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export interface AuthContext {
  user: User;
  role: UserRole;
  theatreId: string;
}

/**
 * Validates that the current request has an authenticated session
 * with the required role. Throws a typed error if not.
 *
 * Use at the top of every protected API route handler.
 *
 * @example
 * const auth = await requireRole("admin");
 */
export async function requireRole(
  ...allowedRoles: UserRole[]
): Promise<AuthContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthorizationError("Unauthorized", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, theatre_id, active")
    .eq("id", user.id)
    .single<Pick<Profile, "role" | "theatre_id" | "active">>();

  if (profileError || !profile) {
    throw new AuthorizationError("Unauthorized", 401);
  }

  if (!profile.active) {
    throw new AuthorizationError("Account is disabled", 403);
  }

  if (!allowedRoles.includes(profile.role)) {
    throw new AuthorizationError("Forbidden", 403);
  }

  return {
    user,
    role: profile.role,
    theatreId: profile.theatre_id,
  };
}

/** Typed error class for auth/authz failures */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 401 | 403 = 403
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Wraps an AuthorizationError into a Next.js JSON response.
 * Avoids leaking internal details.
 */
export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthorizationError) {
    return Response.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    );
  }
  // Unknown auth failure — do not leak details
  return Response.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}
