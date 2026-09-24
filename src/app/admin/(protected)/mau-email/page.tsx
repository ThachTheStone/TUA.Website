import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EMAIL_KEYS, TEMPLATES } from "@/lib/email/templates";
import { formatDate } from "@/lib/format";
import { requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mẫu email" };
export const dynamic = "force-dynamic";

type Row = { key: string; is_enabled: boolean; updated_at: string; profiles: { full_name: string } | null };

/** FR30: every email the system sends, with its on/off state and last edit. */
export default async function EmailTemplatesPage() {
  await requireRole(["ADMIN"]);
  const { data } = await createServiceClient().from("email_templates").select("key, is_enabled, updated_at, profiles(full_name)");
  const rows = new Map(((data ?? []) as unknown as Row[]).map((r) => [r.key, r]));

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Mẫu email</h1>
        <p className="text-sm text-muted-foreground">
          Sửa tiêu đề và nội dung các email gửi cho khách. Email xác thực tài khoản khi đăng ký được sửa trong bảng điều khiển
          Supabase (Authentication → Emails).
        </p>
      </div>
      <ul className="flex flex-col divide-y rounded-xl border bg-card">
        {EMAIL_KEYS.map((key) => {
          const def = TEMPLATES[key];
          const row = rows.get(key);
          return (
            <li key={key}>
              <Link href={`/admin/mau-email/${key}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4 hover:bg-muted/50">
                <span className="font-medium">{def.name}</span>
                {row && !row.is_enabled ? (
                  <Badge variant="destructive">Đã tắt</Badge>
                ) : (
                  <Badge variant="secondary">Đang bật</Badge>
                )}
                {row ? <Badge variant="outline">Đã chỉnh sửa</Badge> : <Badge variant="outline">Mặc định</Badge>}
                <span className="w-full text-sm text-muted-foreground">Gửi khi: {def.when}</span>
                {row && (
                  <span className="w-full text-xs text-muted-foreground">
                    Sửa lần cuối {formatDate(row.updated_at)}
                    {row.profiles?.full_name ? ` bởi ${row.profiles.full_name}` : ""}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
