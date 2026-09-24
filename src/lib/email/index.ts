import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { createServiceClient } from "@/lib/supabase/server";
import { TEMPLATES, renderEmail, type EmailBlock, type EmailKey, type EmailVars } from "@/lib/email/templates";

// FR24: transactional email through Gmail SMTP + App Password, texts from FR30 templates.
// Hard rule 7: sending never throws; failures are logged and the main action carries on.

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  transporter ??= nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return transporter;
}

export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export async function sendEmail(to: string | null | undefined, subject: string, html: string): Promise<boolean> {
  if (!to) return false;
  const t = getTransporter();
  if (!t) {
    console.warn("[email] GMAIL_USER/GMAIL_APP_PASSWORD not set, skipped:", subject);
    return false;
  }
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM || process.env.GMAIL_USER, to, subject, html });
    return true;
  } catch (err) {
    console.error("[email] send failed:", subject, err);
    return false;
  }
}

export type StoredTemplate = { subject: string; body: string; is_enabled: boolean; updated_by: string | null; updated_at: string | null };

/** The admin's version of a template, or the code default when it was never edited. */
export async function loadTemplate(key: EmailKey): Promise<StoredTemplate & { customized: boolean }> {
  const { data, error } = await createServiceClient()
    .from("email_templates")
    .select("subject, body, is_enabled, updated_by, updated_at")
    .eq("key", key)
    .maybeSingle<StoredTemplate>();
  if (error) console.error("[email] load template failed, using default:", key, error.message);
  if (data) return { ...data, customized: true };
  const def = TEMPLATES[key];
  return { subject: def.subject, body: def.body, is_enabled: true, updated_by: null, updated_at: null, customized: false };
}

/** Renders and sends one template. Skips disabled templates. Never throws. */
export async function sendTemplate(key: EmailKey, to: string | null | undefined, vars: EmailVars, block: EmailBlock): Promise<boolean> {
  if (!to) return false;
  try {
    const template = await loadTemplate(key);
    if (!template.is_enabled) return false;
    const { subject, html } = renderEmail(template, vars, block);
    return await sendEmail(to, subject, html);
  } catch (err) {
    console.error("[email] template send failed:", key, err);
    return false;
  }
}
