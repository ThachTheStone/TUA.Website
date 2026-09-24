import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSessionClient } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Customer } from "@/types/db";

// FR26 buyer sessions. Buyers use the same Supabase Auth cookie as staff, but are
// identified by a `customers` row. Admin access still requires a `profiles` row.

export type CustomerSession = { userId: string; email: string; customer: Customer };

/** Current logged-in buyer, or null when logged out or the user has no customer row. */
export const getCustomer = cache(async (): Promise<CustomerSession | null> => {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: customer } = await createServiceClient()
    .from("customers")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Customer>();

  return customer ? { userId: user.id, email: user.email ?? "", customer } : null;
});

/** Guard for buyer-only pages: sends logged-out visitors to login and back to `next` afterwards. */
export async function requireCustomer(next: string): Promise<CustomerSession> {
  const session = await getCustomer();
  if (!session) redirect(`/dang-nhap?next=${encodeURIComponent(next)}`);
  return session;
}

/**
 * Creates the customer row on first sign-in. Email sign-ups carry name and phone in
 * user_metadata; Google gives a name only (phone is asked at checkout).
 */
export async function ensureCustomer(user: User): Promise<void> {
  const meta = user.user_metadata ?? {};
  const name = String(meta.full_name || meta.name || user.email?.split("@")[0] || "Người mua").slice(0, 100);
  const phone = typeof meta.phone === "string" && meta.phone ? meta.phone : null;

  const { error } = await createServiceClient()
    .from("customers")
    .upsert({ id: user.id, full_name: name, phone }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(`ensureCustomer: ${error.message}`);
}

/** Only same-site paths outside the admin area are allowed as post-login targets. */
export function safeNext(value: unknown, fallback = "/tai-khoan"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value.startsWith("/admin") ? fallback : value;
}
