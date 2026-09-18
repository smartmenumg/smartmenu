/**
 * Script: reset-superadmin.mjs
 * Finds the super_admin by email and resets their password using the Service Role key.
 * Also optionally creates a new super_admin if none found.
 *
 * Usage:
 *   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment
 *   (they are already in .env.local), then run:
 *     node -r dotenv/config scripts/reset-superadmin.mjs
 *   Or export them manually before running.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const TARGET_EMAIL = process.env.RESET_EMAIL ?? "kanhasharma313@gmail.com";
const NEW_PASSWORD = process.env.RESET_PASSWORD ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🔍 Looking up user:", TARGET_EMAIL);

  // List users and find by email
  const { data: listData, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Failed to list users:", listError.message);
    process.exit(1);
  }

  const existingUser = listData.users.find(
    (u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase()
  );

  if (existingUser) {
    console.log("✅ Found user:", existingUser.id);
    console.log("🔑 Resetting password...");

    const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
      password: NEW_PASSWORD,
      email_confirm: true,
    });

    if (updateError) {
      console.error("❌ Failed to reset password:", updateError.message);
      process.exit(1);
    }

    // Also ensure profile has super_admin role and is active
    const { data: profile } = await admin
      .from("profiles")
      .select("role, active")
      .eq("id", existingUser.id)
      .single();

    if (profile) {
      if (profile.role !== "super_admin" || !profile.active) {
        const { error: profileError } = await admin
          .from("profiles")
          .update({ role: "super_admin", active: true })
          .eq("id", existingUser.id);
        if (profileError) {
          console.warn("⚠️  Could not update profile role:", profileError.message);
        } else {
          console.log("✅ Profile ensured as super_admin + active.");
        }
      } else {
        console.log("✅ Profile is already super_admin and active.");
      }
    } else {
      console.warn("⚠️  No profile found for this user — the profile may need to be created manually.");
    }

    console.log("\n✅ Done! Login with:");
    console.log("   Email   :", TARGET_EMAIL);
    console.log("   Password:", NEW_PASSWORD);
  } else {
    console.log("⚠️  No user found with that email. Creating new super_admin...");

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: TARGET_EMAIL,
      password: NEW_PASSWORD,
      email_confirm: true,
    });

    if (createError || !newUser.user) {
      console.error("❌ Failed to create user:", createError?.message);
      process.exit(1);
    }

    console.log("✅ Auth user created:", newUser.user.id);

    // We need a theatre_id — fetch the first one or use a placeholder
    const { data: theatres } = await admin.from("theatres").select("id").limit(1);
    const theatreId = theatres?.[0]?.id;

    if (!theatreId) {
      console.error("❌ No theatre found. Cannot create profile without theatre_id.");
      console.log("   Auth user was created. Create the profile manually in Supabase with:");
      console.log("   id:", newUser.user.id, "| role: super_admin | active: true");
      process.exit(1);
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: newUser.user.id,
      theatre_id: theatreId,
      role: "super_admin",
      full_name: "Super Admin",
      active: true,
      permissions: [],
    });

    if (profileError) {
      console.error("❌ Failed to create profile:", profileError.message);
      process.exit(1);
    }

    console.log("\n✅ Done! New super_admin created. Login with:");
    console.log("   Email   :", TARGET_EMAIL);
    console.log("   Password:", NEW_PASSWORD);
  }
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
