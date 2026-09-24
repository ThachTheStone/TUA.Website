import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { formatDate, formatVND } from "@/lib/format";

// FR24: transactional email through Gmail SMTP + App Password.
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

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="vi"><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:12px;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${escape(title)}</h1>
${body}
</div>
<p style="font-size:12px;color:#78716c;text-align:center;margin-top:16px">TỰA – Nét Vẽ Yêu Thương · Email tự động, vui lòng không trả lời.</p>
</div></body></html>`;
}

const row = (label: string, value: string) =>
  `<tr><td style="padding:4px 12px 4px 0;color:#78716c">${escape(label)}</td><td style="padding:4px 0;font-weight:600">${escape(value)}</td></tr>`;

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

export type OrderCreatedEmail = {
  to: string;
  customerName: string;
  code: string;
  subtotal: number;
  prepayAmount: number;
  expiresAt: string;
  qrUrl: string;
  bank: { bankId: string; accountNo: string; accountName: string };
  paymentUrl: string;
};

export function sendOrderCreated(e: OrderCreatedEmail) {
  const html = layout(
    `Đặt hàng thành công – ${e.code}`,
    `<p>Chào ${escape(e.customerName)},</p>
<p>Cảm ơn bạn đã ủng hộ TỰA! Đơn hàng <strong>${escape(e.code)}</strong> đã được tạo. Vui lòng chuyển khoản trước
<strong>${escape(formatDate(e.expiresAt))}</strong> để giữ đơn.</p>
<p style="text-align:center"><img src="${escape(e.qrUrl)}" alt="Mã VietQR" width="260" style="max-width:100%"></p>
<table style="border-collapse:collapse;font-size:14px">
${row("Ngân hàng", e.bank.bankId)}
${row("Số tài khoản", e.bank.accountNo)}
${row("Chủ tài khoản", e.bank.accountName)}
${row("Số tiền cần chuyển", formatVND(e.prepayAmount))}
${row("Nội dung chuyển khoản", e.code)}
${row("Tổng đơn", formatVND(e.subtotal))}
${row("Còn lại khi nhận áo", formatVND(e.subtotal - e.prepayAmount))}
</table>
<p>Sau khi chuyển khoản, hãy bấm <strong>"Tôi đã chuyển khoản"</strong> trên trang thanh toán:</p>
<p><a href="${escape(e.paymentUrl)}" style="display:inline-block;background:#1c1917;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Mở trang thanh toán</a></p>
<p style="font-size:13px;color:#78716c">Bạn có thể tra cứu đơn bất kỳ lúc nào tại ${escape(siteUrl("/tra-cuu"))} bằng mã đơn và số điện thoại.</p>`,
  );
  return sendEmail(e.to, `[TỰA] Đơn hàng ${e.code} – thông tin thanh toán`, html);
}
