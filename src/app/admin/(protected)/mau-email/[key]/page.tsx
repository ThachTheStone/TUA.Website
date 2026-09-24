import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailTemplateEditor } from "@/components/admin/email-template-editor";
import { ConfirmActionButton } from "@/components/admin/form-kit";
import { resetEmailTemplate, saveEmailTemplate, sendTestEmail } from "@/lib/admin/email-template-actions";
import { loadTemplate } from "@/lib/email";
import { EMAIL_KEYS, TEMPLATES, sampleBlock, type EmailKey } from "@/lib/email/templates";
import { formatDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { requireRole } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isBankConfigured, vietQrUrl } from "@/lib/vietqr";

export const metadata: Metadata = { title: "Sửa mẫu email" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ key: string }> };

export default async function EmailTemplatePage({ params }: Props) {
  await requireRole(["ADMIN"]);
  const { key } = await params;
  if (!(EMAIL_KEYS as readonly string[]).includes(key)) notFound();
  const templateKey = key as EmailKey;
  const def = TEMPLATES[templateKey];

  const [template, settings] = await Promise.all([loadTemplate(templateKey), getSettings()]);
  const editorName = template.updated_by
    ? (await createServiceClient().from("profiles").select("full_name").eq("id", template.updated_by).maybeSingle()).data?.full_name
    : null;
  const qr = isBankConfigured(settings.bank_sales) ? vietQrUrl(settings.bank_sales, 129000, "TUA0042") : null;

  return (
    <div className="flex max-w-7xl flex-col gap-6">
      <Link href="/admin/mau-email" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Mẫu email
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{def.name}</h1>
          <p className="text-sm text-muted-foreground">Gửi khi: {def.when}</p>
          <p className="text-xs text-muted-foreground">
            {template.customized
              ? `Đã chỉnh sửa ${formatDate(template.updated_at)}${editorName ? ` bởi ${editorName}` : ""}`
              : "Đang dùng nội dung mặc định"}
          </p>
        </div>
        {template.customized && (
          <ConfirmActionButton
            action={resetEmailTemplate.bind(null, templateKey)}
            confirmText="Khôi phục nội dung mặc định? Nội dung đã sửa sẽ bị xóa."
            successMessage="Đã khôi phục mặc định"
            variant="outline"
          >
            Khôi phục mặc định
          </ConfirmActionButton>
        )}
      </div>
      <EmailTemplateEditor
        // Remount after save/reset so the fields show what is stored.
        key={template.updated_at ?? "default"}
        templateKey={templateKey}
        subject={template.subject}
        body={template.body}
        enabled={template.is_enabled}
        sample={sampleBlock(def.block, settings.bank_sales, qr)}
        save={saveEmailTemplate.bind(null, templateKey)}
        sendTest={sendTestEmail.bind(null, templateKey)}
      />
    </div>
  );
}
