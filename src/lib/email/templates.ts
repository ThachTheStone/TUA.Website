// FR24/FR30: every email the system sends, its variables and its default text.
// Pure module (no server-only): the admin editor uses the same renderer for its live preview.
//
// Template syntax, kept small on purpose:
//   {bien}            variable, replaced by escaped data
//   **chữ đậm**       bold
//   [chữ](https://…)  link; the address may also be {link_don_hang}
//   blank line        new paragraph; single line break = <br>
// Markup is applied to the admin's text BEFORE variables are filled in, so customer data
// (a name like "**x**" or "[a](http://…)") can never turn into formatting or links.

export const EMAIL_KEYS = [
  "ORDER_CREATED",
  "DEPOSIT_CONFIRMED",
  "FULLY_PAID",
  "DESIGN_REJECTED",
  "ORDER_READY",
  "ORDER_DELIVERED",
  "ORDER_CANCELLED",
  "ORDER_EXPIRED",
  "DONATION_CONFIRMED",
] as const;
export type EmailKey = (typeof EMAIL_KEYS)[number];

export const VARIABLES = {
  ten_khach: { label: "Tên khách", sample: "Nguyễn Văn An" },
  ma_don: { label: "Mã đơn", sample: "TUA0042" },
  tong_tien: { label: "Tổng đơn", sample: "258.000đ" },
  da_tra: { label: "Đã thanh toán", sample: "129.000đ" },
  con_lai: { label: "Còn lại", sample: "129.000đ" },
  so_tien_can_chuyen: { label: "Số tiền cần chuyển", sample: "129.000đ" },
  han_thanh_toan: { label: "Hạn thanh toán", sample: "26/09/2026 14:30" },
  hinh_thuc_nhan: { label: "Hình thức nhận", sample: "Nhận tại campus" },
  link_don_hang: { label: "Link xem đơn", sample: "https://tua.example/tai-khoan/don-hang/TUA0042" },
  ten_ao: { label: "Áo bị từ chối", sample: "Áo custom · Trắng · M" },
  ly_do: { label: "Lý do", sample: "Hình ảnh có logo thương hiệu, vi phạm bản quyền" },
  ten_nguoi_quyen_gop: { label: "Tên người quyên góp", sample: "Trần Thị Bình" },
  so_tien_quyen_gop: { label: "Số tiền quyên góp", sample: "500.000đ" },
  ma_quyen_gop: { label: "Mã quyên góp", sample: "UH0007" },
} as const;
export type VarName = keyof typeof VARIABLES;
export type EmailVars = Partial<Record<VarName, string>>;

/** Fixed parts the system adds under the admin's text (FR30: not editable). */
export type BlockKind = "payment" | "order" | "donation";

export type TemplateDef = {
  key: EmailKey;
  name: string;
  when: string;
  block: BlockKind;
  variables: VarName[];
  required: VarName[];
  subject: string;
  body: string;
};

const ORDER_VARS: VarName[] = ["ten_khach", "ma_don", "tong_tien", "da_tra", "con_lai", "hinh_thuc_nhan", "link_don_hang"];

export const TEMPLATES: Record<EmailKey, TemplateDef> = {
  ORDER_CREATED: {
    key: "ORDER_CREATED",
    name: "Đặt hàng thành công",
    when: "Khách đặt đơn trên website, hoặc Staff tạo đơn Workshop chuyển khoản",
    block: "payment",
    variables: [...ORDER_VARS, "so_tien_can_chuyen", "han_thanh_toan"],
    required: ["ma_don"],
    subject: "[TỰA] Đơn hàng {ma_don} – thông tin thanh toán",
    body: `Chào {ten_khach},

Cảm ơn bạn đã ủng hộ TỰA – Nét Vẽ Yêu Thương! Đơn hàng **{ma_don}** đã được tạo.

Vui lòng chuyển khoản **{so_tien_can_chuyen}** trước **{han_thanh_toan}** để giữ đơn, rồi bấm **"Tôi đã chuyển khoản"** trên trang thanh toán.

Nếu đơn có áo custom, Ban tổ chức sẽ duyệt thiết kế trước khi in.`,
  },
  DEPOSIT_CONFIRMED: {
    key: "DEPOSIT_CONFIRMED",
    name: "Đã nhận cọc",
    when: 'Staff bấm "Đã cọc"',
    block: "order",
    variables: ORDER_VARS,
    required: ["ma_don"],
    subject: "[TỰA] Đã nhận cọc đơn {ma_don}",
    body: `Chào {ten_khach},

Ban tổ chức đã nhận **{da_tra}** tiền cọc cho đơn **{ma_don}**. Phần còn lại **{con_lai}** bạn thanh toán khi nhận áo.

Cảm ơn bạn!`,
  },
  FULLY_PAID: {
    key: "FULLY_PAID",
    name: "Đã thanh toán 100%",
    when: 'Staff bấm "Đã thanh toán 100%"',
    block: "order",
    variables: ORDER_VARS,
    required: ["ma_don"],
    subject: "[TỰA] Đơn {ma_don} đã thanh toán đủ",
    body: `Chào {ten_khach},

Ban tổ chức đã nhận đủ **{tong_tien}** cho đơn **{ma_don}**. Cảm ơn bạn đã đồng hành cùng TỰA!`,
  },
  DESIGN_REJECTED: {
    key: "DESIGN_REJECTED",
    name: "Thiết kế bị từ chối",
    when: 'Staff bấm "Từ chối" một thiết kế',
    block: "order",
    variables: [...ORDER_VARS, "ten_ao", "ly_do"],
    required: ["ma_don", "ly_do"],
    subject: "[TỰA] Thiết kế trong đơn {ma_don} cần chỉnh sửa",
    body: `Chào {ten_khach},

Thiết kế **{ten_ao}** trong đơn **{ma_don}** chưa được duyệt.

Lý do: {ly_do}

Ban tổ chức sẽ liên hệ với bạn để trao đổi. Bạn có thể sửa và gửi lại thiết kế trong trang tài khoản, trên máy tính hoặc máy tính bảng.`,
  },
  ORDER_READY: {
    key: "ORDER_READY",
    name: "Đơn sẵn sàng",
    when: "Đơn chuyển sang Sẵn sàng giao/nhận",
    block: "order",
    variables: ORDER_VARS,
    required: ["ma_don"],
    subject: "[TỰA] Đơn {ma_don} đã sẵn sàng",
    body: `Chào {ten_khach},

Áo trong đơn **{ma_don}** đã sẵn sàng ({hinh_thuc_nhan}). Ban tổ chức sẽ liên hệ để hẹn thời gian.

Số tiền còn lại cần thanh toán khi nhận: **{con_lai}**.`,
  },
  ORDER_DELIVERED: {
    key: "ORDER_DELIVERED",
    name: "Đã giao",
    when: 'Staff bấm "Đã giao"',
    block: "order",
    variables: ORDER_VARS,
    required: ["ma_don"],
    subject: "[TỰA] Đơn {ma_don} đã giao",
    body: `Chào {ten_khach},

Đơn **{ma_don}** đã được giao. Cảm ơn bạn đã đồng hành cùng TỰA – Nét Vẽ Yêu Thương!`,
  },
  ORDER_CANCELLED: {
    key: "ORDER_CANCELLED",
    name: "Đơn bị hủy",
    when: "Staff hủy đơn",
    block: "order",
    variables: [...ORDER_VARS, "ly_do"],
    required: ["ma_don", "ly_do"],
    subject: "[TỰA] Đơn {ma_don} đã bị hủy",
    body: `Chào {ten_khach},

Đơn **{ma_don}** đã bị hủy.

Lý do: {ly_do}

Nếu bạn đã chuyển khoản, Ban tổ chức sẽ liên hệ để hoàn tiền.`,
  },
  ORDER_EXPIRED: {
    key: "ORDER_EXPIRED",
    name: "Đơn hết hạn",
    when: "Hệ thống tự hủy đơn quá hạn thanh toán",
    block: "order",
    variables: ORDER_VARS,
    required: ["ma_don"],
    subject: "[TỰA] Đơn {ma_don} đã hết hạn thanh toán",
    body: `Chào {ten_khach},

Đơn **{ma_don}** đã tự hủy vì quá hạn thanh toán. Nếu bạn vẫn muốn mua áo, hãy đặt đơn mới trên website.

Nếu bạn đã chuyển khoản, vui lòng liên hệ Ban tổ chức kèm mã đơn.`,
  },
  DONATION_CONFIRMED: {
    key: "DONATION_CONFIRMED",
    name: "Cảm ơn quyên góp",
    when: "Staff xác nhận khoản quyên góp",
    block: "donation",
    variables: ["ten_nguoi_quyen_gop", "so_tien_quyen_gop", "ma_quyen_gop"],
    required: ["ma_quyen_gop"],
    subject: "[TỰA] Cảm ơn bạn đã quyên góp",
    body: `Chào {ten_nguoi_quyen_gop},

Ban tổ chức đã nhận khoản quyên góp **{so_tien_quyen_gop}** (mã {ma_quyen_gop}) của bạn.

Toàn bộ số tiền sẽ được dùng để hỗ trợ trẻ em có hoàn cảnh đặc biệt. Cảm ơn tấm lòng của bạn!`,
  },
};

export const SUBJECT_MAX = 200;
export const BODY_MAX = 5000;

// ─── Validation ────────────────────────────────────────────────────────────

const VAR_RE = /\{([a-zA-Z_]+)\}/g;

/** Vietnamese error for a subject/body pair, or null when it can be saved. */
export function validateTemplate(key: EmailKey, subject: string, body: string): string | null {
  const def = TEMPLATES[key];
  if (!subject.trim()) return "Vui lòng nhập tiêu đề";
  if (!body.trim()) return "Vui lòng nhập nội dung";
  if (subject.length > SUBJECT_MAX) return `Tiêu đề tối đa ${SUBJECT_MAX} ký tự`;
  if (body.length > BODY_MAX) return `Nội dung tối đa ${BODY_MAX} ký tự`;

  const used = new Set([...`${subject}\n${body}`.matchAll(VAR_RE)].map((m) => m[1]));
  const unknown = [...used].filter((v) => !(def.variables as string[]).includes(v));
  if (unknown.length) return `Biến không dùng được trong email này: ${unknown.map((v) => `{${v}}`).join(", ")}`;
  const missing = def.required.filter((v) => !used.has(v));
  if (missing.length) return `Thiếu biến bắt buộc: ${missing.map((v) => `{${v}}`).join(", ")}`;

  for (const m of body.matchAll(/\[[^\]\n]*\]\(([^)\n]*)\)/g)) {
    if (!/^https?:\/\/\S+$/.test(m[1]) && m[1] !== "{link_don_hang}") {
      return `Liên kết "${m[1]}" phải bắt đầu bằng https:// hoặc là {link_don_hang}`;
    }
  }
  return null;
}

// ─── Rendering ─────────────────────────────────────────────────────────────

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function fill(text: string, vars: EmailVars, encode: (s: string) => string): string {
  return text.replace(VAR_RE, (whole, name: string) => (name in vars ? encode(vars[name as VarName] ?? "") : whole));
}

/** Subject line: plain text, one line. */
export function renderSubject(subject: string, vars: EmailVars): string {
  return fill(subject, vars, (s) => s).replace(/\s+/g, " ").trim();
}

/** Admin text → HTML paragraphs. Markup first, then escaped variable values. */
export function renderBody(body: string, vars: EmailVars): string {
  const html = escapeHtml(body.replace(/\r\n/g, "\n").trim())
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+|\{link_don_hang\})\)/g, '<a href="$2" style="color:#1c1917">$1</a>');
  return fill(html, vars, escapeHtml)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

// ─── Fixed layout and blocks ───────────────────────────────────────────────

export type PaymentBlock = {
  kind: "payment";
  qrUrl: string | null;
  bank: { bankId: string; accountNo: string; accountName: string };
  code: string;
  amount: string;
  subtotal: string;
  remaining: string;
  paymentUrl: string;
};
export type OrderBlock = { kind: "order"; code: string; subtotal: string; paid: string; remaining: string; orderUrl: string };
export type DonationBlock = { kind: "donation"; code: string; amount: string };
export type EmailBlock = PaymentBlock | OrderBlock | DonationBlock;

const row = (label: string, value: string) =>
  `<tr><td style="padding:4px 12px 4px 0;color:#78716c">${escapeHtml(label)}</td><td style="padding:4px 0;font-weight:600">${escapeHtml(value)}</td></tr>`;

const button = (href: string, label: string) =>
  `<p style="margin:16px 0 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#1c1917;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">${escapeHtml(label)}</a></p>`;

const table = (rows: string) => `<table style="border-collapse:collapse;font-size:14px;margin-top:8px">${rows}</table>`;

export function renderBlock(block: EmailBlock): string {
  switch (block.kind) {
    case "payment":
      return [
        block.qrUrl
          ? `<p style="text-align:center"><img src="${escapeHtml(block.qrUrl)}" alt="Mã VietQR" width="260" style="max-width:100%"></p>`
          : "",
        table(
          row("Ngân hàng", block.bank.bankId) +
            row("Số tài khoản", block.bank.accountNo) +
            row("Chủ tài khoản", block.bank.accountName) +
            row("Số tiền cần chuyển", block.amount) +
            row("Nội dung chuyển khoản", block.code) +
            row("Tổng đơn", block.subtotal) +
            row("Còn lại khi nhận áo", block.remaining),
        ),
        button(block.paymentUrl, "Mở trang thanh toán"),
      ].join("\n");
    case "order":
      return (
        table(row("Mã đơn", block.code) + row("Tổng đơn", block.subtotal) + row("Đã thanh toán", block.paid) + row("Còn lại", block.remaining)) +
        button(block.orderUrl, "Xem đơn hàng")
      );
    case "donation":
      return table(row("Mã quyên góp", block.code) + row("Số tiền", block.amount));
  }
}

export function renderLayout(title: string, content: string): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:12px;padding:24px;font-size:15px;line-height:1.5">
<p style="margin:0 0 16px;font-weight:700">TỰA – Nét Vẽ Yêu Thương</p>
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
${content}
</div>
<p style="font-size:12px;color:#78716c;text-align:center;margin-top:16px">TỰA – Nét Vẽ Yêu Thương · Email tự động, vui lòng không trả lời.</p>
</div></body></html>`;
}

/** The full email: subject + HTML. Title = the rendered subject without the "[TỰA]" prefix. */
export function renderEmail(t: { subject: string; body: string }, vars: EmailVars, block: EmailBlock) {
  const subject = renderSubject(t.subject, vars);
  const title = subject.replace(/^\[TỰA\]\s*/, "");
  return { subject, html: renderLayout(title, `${renderBody(t.body, vars)}\n${renderBlock(block)}`) };
}

/** Sample data for the editor preview and test emails. */
export function sampleVars(): EmailVars {
  return Object.fromEntries(Object.entries(VARIABLES).map(([k, v]) => [k, v.sample])) as EmailVars;
}

export function sampleBlock(kind: BlockKind, bank: PaymentBlock["bank"], qrUrl: string | null): EmailBlock {
  const s = VARIABLES;
  if (kind === "payment") {
    return {
      kind,
      qrUrl,
      bank,
      code: s.ma_don.sample,
      amount: s.so_tien_can_chuyen.sample,
      subtotal: s.tong_tien.sample,
      remaining: s.con_lai.sample,
      paymentUrl: s.link_don_hang.sample,
    };
  }
  if (kind === "order") {
    return { kind, code: s.ma_don.sample, subtotal: s.tong_tien.sample, paid: s.da_tra.sample, remaining: s.con_lai.sample, orderUrl: s.link_don_hang.sample };
  }
  return { kind, code: s.ma_quyen_gop.sample, amount: s.so_tien_quyen_gop.sample };
}
