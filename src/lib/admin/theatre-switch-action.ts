"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/actions";
import { THEATRE_COOKIE } from "@/lib/theatre-context";

/**
 * Server action called by the TheatreSwitcher component.
 * Sets the active_theatre_id cookie for super_admin users.
 * theatreId = "all" → cross-theatre view
 * theatreId = <uuid> → specific theatre view
 */
export async function switchTheatre(theatreId: string): Promise<void> {
  const session = await getCurrentProfile();

  // Only super_admin can switch theatres
  if (!session || session.profile.role !== "super_admin") return;

  const cookieStore = await cookies();

  if (theatreId === "all") {
    cookieStore.delete(THEATRE_COOKIE);
  } else {
    cookieStore.set(THEATRE_COOKIE, theatreId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // Session cookie — clears on browser close
    });
  }

  // Revalidate all dashboard pages so data refreshes immediately
  revalidatePath("/dashboard", "layout");
}
