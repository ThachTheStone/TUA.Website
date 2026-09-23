# Integrations

## VietQR (`lib/vietqr.ts`)
Use the free quick-link image; no API key is needed:
```ts
export function vietQrUrl(bank: {bankId:string;accountNo:string;accountName:string}, amount:number, addInfo:string) {
  const p = new URLSearchParams({ amount: String(amount), addInfo, accountName: bank.accountName });
  return `https://img.vietqr.io/image/${bank.bankId}-${bank.accountNo}-compact2.png?${p}`;
}
```
- `addInfo` must be ASCII with no diacritics or special characters, max 25 chars: `TUA0012` for orders, `UH0005` for donations.
- Orders use `settings.bank_sales`; donations use `settings.bank_fund` (BR04).
- Also show the text info (bank, account number, name, amount, content) with copy buttons, because some banking apps scan badly.
- Future auto-verify: SePay or Casso webhook → match `TUA\d{4}` in the transfer content → record payment → transition. Keep `recordPayment()` reusable for this.

## Email (`lib/email.ts`)
- nodemailer with Gmail SMTP and an **App Password** (the Google account needs 2FA). Env: `GMAIL_USER`, `GMAIL_APP_PASSWORD`. Limit is about 500 emails/day, which is plenty.
- Templates (Vietnamese, simple HTML): `orderCreated` (includes QR image URL, amount, deadline, lookup link), `orderConfirmed`, `orderReady`, `orderDelivered`, `orderCancelled` (with reason), `orderExpired`, `donationConfirmed`.
- Always wrap sends in try/catch and never throw into the main action.

## Google Sheets (`lib/sheets.ts`)
- Create a Google Cloud service account, enable the Sheets API, and share the spreadsheet with the service-account email as Editor.
- Env: `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY` (replace `\n` escapes), `GOOGLE_SHEET_ID`.
- **Full resync strategy** (simple and idempotent; fine at under 1000 rows): `syncAll()` reads orders, items and donations from the DB, then for each tab calls `values.clear` followed by `values.update` with a header row plus all rows.
  - `Orders`: Mã đơn, Nguồn, Tên, SĐT, Email, Hình thức nhận, Địa chỉ/Địa điểm, Thời gian, Tổng tiền, % trả trước, Đã trả, Còn lại, Trạng thái, Hoàn tiền, Ngày tạo
  - `OrderItems`: Mã đơn, Loại, Màu, Size, SL, Đơn giá, Thành tiền, Link thiết kế (admin page link, not a raw storage URL)
  - `Donations`: Mã, Tên hiển thị, Liên hệ, Số tiền, Lời nhắn, Công khai, Trạng thái, Ngày
- Call `syncAll()` after every mutation without awaiting in the response path (or with `after()` from `next/server`), plus from the admin "Đồng bộ lại" button. Debounce: skip if a sync ran in the last 5 seconds, then schedule one more.

## Cron: expire unpaid orders (FR25)
Vercel Hobby cron runs only once a day, so use Supabase instead:
```sql
select cron.schedule('expire-orders','*/15 * * * *', $$
  select net.http_post(url:='https://<domain>/api/cron/expire-orders',
    headers:='{"Authorization":"Bearer <CRON_SECRET>"}'::jsonb) $$);
```
`/api/cron/expire-orders` checks the secret, finds orders with `status = PENDING_PAYMENT and expires_at < now()`, transitions each to EXPIRED (writing history), sends the expired email, then runs `syncAll()`.

## Env vars (`.env.example`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
GMAIL_USER=
GMAIL_APP_PASSWORD=
GOOGLE_SA_EMAIL=
GOOGLE_SA_PRIVATE_KEY=
GOOGLE_SHEET_ID=
CRON_SECRET=
```
