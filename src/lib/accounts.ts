import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/db";

export type Account = Profile & { email: string };

/** All staff profiles with their login email (FR20). Callers must check requireRole(["ADMIN"]). */
export async function listAccounts(): Promise<Account[]> {
  const supabase = createServiceClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at")
    .returns<Profile[]>();
  if (error) throw new Error(`Không đọc được danh sách tài khoản: ${error.message}`);

  const emails = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error: authError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (authError) throw new Error(`Không đọc được danh sách tài khoản: ${authError.message}`);
    data.users.forEach((u) => emails.set(u.id, u.email ?? ""));
    if (data.users.length < 1000) break;
  }

  return profiles.map((p) => ({ ...p, email: emails.get(p.id) ?? "" }));
}
