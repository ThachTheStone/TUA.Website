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
- Package: `@googleapis/sheets` (the Sheets-only part of `googleapis`, much smaller on Vercel).
- Env: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (replace `\n` escapes), `GOOGLE_SHEETS_ID`.
- **Full resync strategy** (simple and idempotent; fine at under 1000 rows): `syncAll()` reads orders, items and donations from the DB, adds missing tabs, then `values.batchClear` + `values.batchUpdate` (`valueInputOption: RAW`, so names starting with `=` stay text) with a header row plus all rows. Reads page through 1000-row chunks.
  - `Orders`: Mã đơn, Nguồn, Tên, SĐT, Email, Hình thức nhận, Địa chỉ/Địa điểm, Thời gian, Tổng tiền, % trả trước, Đã trả, Còn lại, Trạng thái, Thanh toán, Hoàn tiền, Ngày tạo
  - `OrderItems`: Mã đơn, Loại, Áo mẫu, Màu, Size, SL, Đơn giá, Thành tiền, Duyệt thiết kế, Link thiết kế (admin page link, not a raw storage URL)
  - `Donations`: Mã, Tên hiển thị, Liên hệ, Số tiền, Lời nhắn, Công khai, Ẩn khỏi vinh danh, Trạng thái, Ngày
- `syncSheetsLater()` (runs in `after()`) is called by `transitionOrder()`, `confirmPayment()`, `reviewDesign()`, `resubmitDesign()`, order/workshop creation, "Đã hoàn tiền" and every donation write. Syncs are coalesced per server instance: while one runs, new requests only mark "run once more". The dashboard has "Đồng bộ lại toàn bộ" (awaits `syncAll()` and reports counts), and the expiry cron resyncs every 15 minutes, so a failed sync heals itself.

## Cron: expire unpaid orders (FR25) and clean up buyer photos (NFR06)
Vercel Hobby cron runs only once a day, so use Supabase instead. The full script is `supabase/cron.example.sql` (run by hand per environment with the real URL and secret):
```sql
select cron.schedule('expire-orders','*/15 * * * *', $$
  select net.http_post(url:='https://<domain>/api/cron/expire-orders',
    headers:='{"Authorization":"Bearer <CRON_SECRET>"}'::jsonb) $$);
```
`/api/cron/expire-orders` checks the secret, finds orders with `status = PENDING_PAYMENT and expires_at < now()`, transitions each to EXPIRED (writing history), sends the expired email, then runs `syncAll()`.

`/api/cron/cleanup-uploads` (daily): `stale_design_assets(now() - 30 days)` lists photos no live order uses (not in `canvas_json.assets` of any order item whose order is not EXPIRED/CANCELLED); files are removed from the `uploads` bucket first, then the rows.

## Env vars (`.env.example`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
GMAIL_USER=
GMAIL_APP_PASSWORD=
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
CRON_SECRET=
```
