import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "./server";
import type { Profile, UserRole } from "@/types/db";

/** Cookie-bound anon client carrying the staff session (Supabase Auth). */
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component: cookies are read-only there.
            // The middleware refreshes the session instead.
          }
        },
      },
    },
  );
}

export type StaffSession = { userId: string; email: string; profile: Profile };

/** Current logged-in staff member, or null if logged out / no profile / disabled. */
export const getStaff = cache(async (): Promise<StaffSession | null> => {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await createServiceClient()
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || !profile.is_active) return null;
  return { userId: user.id, email: user.email ?? "", profile };
});

/**
 * Guard for admin pages, layouts and server actions (hard rule 8).
 * Redirects to login when logged out or disabled, and to /admin when the role is not allowed.
 */
export async function requireRole(roles: UserRole[] = ["ADMIN", "STAFF"]): Promise<StaffSession> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (!roles.includes(staff.profile.role)) redirect("/admin?loi=khong-co-quyen");
  return staff;
}
