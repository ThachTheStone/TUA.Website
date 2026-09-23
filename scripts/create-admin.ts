/**
 * Seeds (or promotes) the first Admin account.
 *
 *   npm run create-admin -- <email> <password> "<Họ tên>"
 *
 * Falls back to ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from .env.local.
 * Does not import src/lib/supabase/server.ts because that module is `server-only`.
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [argEmail, argPassword, argName] = process.argv.slice(2);
  const email = (argEmail ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = argPassword ?? process.env.ADMIN_PASSWORD ?? "";
  const fullName = (argName ?? process.env.ADMIN_NAME ?? "Admin").trim();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  if (!email) throw new Error("Missing email (arg 1 or ADMIN_EMAIL)");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | undefined;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created?.user) {
    userId = created.user.id;
    console.log(`Created auth user ${email}`);
  } else {
    // Most likely the user already exists: find them and reset the password.
    for (let page = 1; !userId; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (data.users.length < 200) break;
    }
    if (!userId) throw createError ?? new Error("Could not create user");
    const { error } = await supabase.auth.admin.updateUserById(userId, { password });
    if (error) throw error;
    console.log(`Auth user ${email} already existed; password updated`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId, full_name: fullName, role: "ADMIN", is_active: true });
  if (profileError) throw profileError;

  console.log(`✔ ${email} is an active ADMIN (${fullName})`);
}

main().catch((err) => {
  console.error("✖", err instanceof Error ? err.message : err);
  process.exit(1);
});
