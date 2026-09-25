---
name: tua-builder
description: Step-by-step playbook for building the TỰA charity T-shirt and donation website (Next.js + Supabase). Use this skill for ANY work on this repo — scaffolding, database, canvas designer, cart, checkout, VietQR payment, admin portal, donations, sponsors, Google Sheets sync, emails, cron, deployment — even if the user only says "build the next part", "fix the checkout" or "continue".
---

# TỰA website builder

The source of truth is `docs/SRS.md`. This skill tells you **how** and **in what order** to build it.

## Before any task
1. Find the phase below that the task belongs to. If an earlier phase isn't done, say so before continuing.
2. Read the SRS sections listed for that phase.
3. Read the reference file for that phase:
   - Database, RLS, state machine → `references/data-model.md`
   - Canvas designer → `references/canvas.md`
   - VietQR, Google Sheets, email, cron → `references/integrations.md`
4. After finishing: run typecheck and lint, check each acceptance criterion, and give a short summary plus what to test manually.

## Folder structure
```
src/
  app/
    (public)/            page.tsx, thiet-ke/, ao-tron/, gio-hang/, thanh-toan/,
                         thanh-toan/[code]/, tra-cuu/, quyen-gop/, vinh-danh/, chinh-sach/
    admin/               login/, (protected)/{page,don-hang,don-hang/[code],workshop,
                         quyen-gop,noi-dung,nha-tai-tro,tai-khoan,cai-dat}
    api/cron/expire-orders/route.ts
  components/            ui/ (shadcn), public/, admin/, canvas/
  lib/
    supabase/            server.ts (service role), client.ts (anon), auth.ts (requireRole)
    orders/              pricing.ts, state-machine.ts, transition.ts, code.ts
    vietqr.ts  sheets.ts  email.ts  format.ts  settings.ts
  types/
supabase/migrations/
```
URLs are Vietnamese slugs without diacritics.

## Phases

### Phase 1 — Foundation (SRS §3, §8)
- Scaffold Next.js with TS, Tailwind and shadcn/ui; set up `.env.example`.
- Write the migration from `references/data-model.md`: tables, enums, RLS, seed settings, storage buckets.
- Implement `lib/settings.ts`, `lib/format.ts` (`formatVND`, `formatDate`) and `lib/supabase/*`.
- Admin login (Supabase Auth email/password), `requireRole()`, and a protected layout with a sidebar.
- Seed the first Admin with a script: `scripts/create-admin.ts`.
**Done when:** an admin can log in and log out, `/admin` redirects when logged out, and a disabled account is rejected.

### Phase 2 — Content + CMS (FR01, FR09, FR10, FR17, FR19, FR20, FR21)
- Public home page: story, Top 5 artworks, event, active promotions, sponsor strip.
- Admin CRUD: content blocks, artworks, promotions, sponsors (logo upload by staff to the `content` bucket), accounts (Admin only, using `auth.admin.createUser`), settings form.
**Done when:** editing in the admin shows up on the home page without a redeploy.

### Phase 3 — Canvas designer (FR02–FR05) → `references/canvas.md`
**Done when:** a user can draw on all 3 areas on an iPad with no page scroll, undo/redo works, and export produces a 200 DPI PNG per area.

### Phase 4 — Cart + checkout + VietQR (FR06, FR07, FR11, FR22, FR24)
- Cart state is Zustand persisted to localStorage. Items: `{type, color, size, quantity, designDraftId?}`.
- Checkout server action `createOrder`: validate with zod → recompute prices from settings → upload design PNGs → insert order, items and designs in one RPC/transaction → generate code → return code.
- `/thanh-toan/[code]`: QR, bank info, copy buttons, countdown to `expires_at`, and a "Tôi đã chuyển khoản" button that moves the order to PAYMENT_REVIEW.
- `/tra-cuu`: lookup requiring both code and phone.
- Send an order-created email.
**Done when:** placing an order with 2 custom + 1 plain shirt at 75% shows the correct QR amount, and a tampered client price is ignored.

### Phase 4b — Buyer accounts (FR26) ✅ done
- Email + password sign-up with email confirmation, Google sign-in behind `GOOGLE_LOGIN_ENABLED`.
- `customers`, `carts`, `orders.customer_id` (migration 0003). Checkout requires login; cart syncs to the account.

### Phase 5 — Admin orders (FR13–FR16, SRS §5)
- Migration: `payment_status` enum (`UNPAID`, `DEPOSIT_PAID`, `FULLY_PAID`) on `orders`, default `UNPAID`; show it on the payment page, lookup and account pages too.
- Orders table with filters (order status, payment status, source, fulfilment, dates), search and status counters; "Còn nợ" marker for DELIVERED + DEPOSIT_PAID.
- Order detail: design previews plus download of print files (signed URLs), status history, and buttons that show only valid actions:
  - **"Đã cọc"** (amount input, default `prepay_amount`, must be ≥ 50% and < subtotal) and **"Đã thanh toán 100%"** (records the remainder). Both insert a `payments` row; the first one moves PAYMENT_REVIEW → CONFIRMED via `transitionOrder()`. "Đã thanh toán 100%" stays available on DEPOSIT_PAID orders until cancelled.
  - Production buttons (Đang in, Kiểm tra chất lượng, Sẵn sàng) and **"Đã giao"** (READY only; warns about the remaining amount when DEPOSIT_PAID).
- Payment status changes go through one server function (like `transitionOrder()`), which checks the role, the amounts and writes history in one RPC.
- Design approval (FR29, SRS §5.3): `order_items.approval_status` + `design_reviews` history. Buttons Xem xét / Duyệt / Từ chối (reason required) per custom item; "Thiết kế chờ duyệt" counter and filter; CONFIRMED → PRINTING blocked until every custom item is APPROVED (BR12). Email on rejection with the reason. Buyer account + lookup show each shirt's approval status and reason.
- Workshop form: staff uploads scans to the `scans` bucket (created APPROVED); cash payment creates the order as CONFIRMED with DEPOSIT_PAID or FULLY_PAID.
- Emails on Đã cọc, Đã thanh toán 100%, READY, DELIVERED and CANCELLED.
**Done when:** printing is blocked until a rejected design is approved, a 50% order goes Đã cọc → … → Đã giao with "Còn nợ" shown, then Đã thanh toán 100% clears it; a 100% order goes straight to FULLY_PAID; history is logged; a STAFF user cannot open accounts or settings.

### Phase 5b — Email templates (FR24, FR30) ✅ done
- Migration 0005: `email_templates (key text pk, subject, body, is_enabled, updated_by → profiles, updated_at)`. Defaults live only in code (`lib/email/templates.ts`); a row exists once an admin edits, and "Khôi phục mặc định" deletes it.
- `lib/email/templates.ts`: per key, the allowed variables, the required ones, and a sample data object for preview. Rendering: escape every variable value, replace `{bien}`, convert the limited markup (line breaks, **bold**, links) to HTML, wrap in the fixed layout, and add the fixed blocks (QR + bank info for ORDER_CREATED, items/amount table for order emails).
- `sendTemplate(key, to, data)`: loads the template (cached per request), skips when disabled, never throws (hard rule 7). Move `sendOrderCreated` and every Phase 5 email onto it.
- Admin `/admin/mau-email` (ADMIN only, checked in every action): list, edit subject/body with clickable variable chips, validation for unknown/missing variables, live preview, "Gửi thử" to the admin's own email, "Khôi phục mặc định", enable toggle.
**Done when:** editing the "Đơn sẵn sàng" subject changes the next real email, a disabled template sends nothing, an unknown `{bien}` is refused on save, a value containing `<script>` is escaped, and STAFF gets redirected away from the page.

### Phase 6 — Buyer images in the canvas + resubmit (FR03, FR05, FR26, FR29, BR01) ✅ done
- Canvas "Chèn ảnh" tool (signed-in buyers only; logged-out buyers see a login prompt). New shape kind `image` referencing a `design_assets` row; move/resize/rotate like other shapes, clipped to the print area; max 10 per design.
- Browser downscales to what the print area needs at 200 DPI, then uploads through a server action: check MIME by magic bytes (JPG/PNG/WebP), ≤ 10MB, strip EXIF, store in a private `uploads` bucket under `<customer_id>/`, insert `design_assets`. Signed URLs for display; never public.
- Blurry warning when the placed image is below 150 DPI at its printed size.
- Cart/saved cart store only asset ids (not image data). Export loads the images via signed URLs before rendering print files.
- FR05 checkbox text covers uploaded images and the approval step.
- Account page: rejected shirt → "Sửa thiết kế" opens the canvas with that design → "Gửi lại" uploads new print files, replaces `order_items.design_id`, sets PENDING_APPROVAL, logs `design_reviews` (changed_by null). Color/size/qty/price unchanged; APPROVED designs are locked.
**Done when:** a buyer inserts two photos, orders, staff rejects with a reason, the buyer sees it, edits, resubmits, staff approves, and the print file contains the photos at full quality. A logged-out visitor cannot upload; a renamed .exe as .png is refused.

### Phase 7 — Shirt prototypes (FR27, FR28, FR02, FR06) → `references/data-model.md` (Prototypes) ✅ done (migration 0007)
- Migration: `prototypes` table, `item_type` + `PROTOTYPE`, `design_source` + `PROTOTYPE`, `order_items.prototype_id`.
- Admin `/admin/mau-ao`: CRUD, sort, active toggle. Staff/Admin upload 1–4 display images (`content` bucket) and one print PNG per print area (`designs` bucket, under `prototypes/<id>/`). Check PNG pixel size against print area × DPI and warn.
- Public `/mau-ao` grid and `/mau-ao/[slug]` detail: images, name, description, fixed color, size + quantity, "Thêm vào giỏ".
- Cart: new line kind `{type: "PROTOTYPE", prototypeId, size, quantity}`; same prototype + size merges. Color comes from the prototype.
- Checkout: server loads the prototype (must be active), uses its color and `prices.CUSTOM`, links `order_items.design_id` to the prototype's design so admin print downloads work unchanged.
- Workshop form (Phase 5) can pick a prototype.
- Phones (shorter screen side < 600px): `/thiet-ke` shows "Tính năng tự thiết kế cần máy tính hoặc máy tính bảng", the organizer contact from `settings.contact`, and buttons to Áo mẫu / Áo trơn instead of the canvas. Hide "Sửa thiết kế" in the cart on phones. Add the contact fields to the admin settings form.
- Check plain + prototype buying, checkout, payment and account pages at 390px.
**Done when:** on a phone the canvas is replaced by the help message, and admin publishes a prototype, a buyer orders it with a plain and a custom shirt, totals use the custom price, a deactivated prototype blocks checkout, and admin order detail downloads the prototype's print file.

### Phase 8 — Donations, Sheets, cron (FR08, FR09, FR18, FR23, FR25)
- Donation form (min from settings, default 300.000đ), donation QR using the fund account and prefix `UH`, admin confirm, donor wall and progress bar.
- `lib/sheets.ts` full-resync approach (see integrations), called after every mutation plus an admin "Đồng bộ lại" button. OrderItems sheet includes the prototype name.
- Expire cron, plus a daily cleanup of buyer uploads older than 30 days that no live order uses (NFR06).
**Done when:** a confirmed donation appears on the wall and in the sheet, and an old unpaid order becomes EXPIRED within 15 minutes.

### Phase 9 — New home page (FR01, FR17)
- Content blocks `hero`, `about`, `mission` (seed + admin editing in Nội dung; hero has title, body, image).
- Sections in order: Hero (CTAs: Xem áo mẫu, Tự thiết kế áo, Quyên góp) → Áo mẫu grid (+ entries to custom and plain) → Về chúng tôi → Ý nghĩa dự án → Top 5 / Workshop / promotions → Vinh danh (total, progress, latest ~10 confirmed donations via `public_donations`, link to /vinh-danh, sponsor logos by tier).
- Hide any section with no data. Keep each section a small server component in `components/public/home/`.
**Done when:** every section is editable in admin, an empty section disappears, and the page works at 390px, 820px and 1440px.

### Phase 10 — Polish + deploy
- Responsive check at 390px, 820px (iPad) and 1440px; empty and loading states; error toasts in Vietnamese.
- Policy page (Nghị định 13/2023 consent), OG image and favicon.
- Deploy to Vercel, set env vars, run through the end-to-end checklist below.

## Code patterns
- **Server actions** return `{ ok: true, data } | { ok: false, error: string }` with a Vietnamese error message. Validate every input with zod.
- **Money** is an integer number of VND. `prepayAmount = Math.ceil(subtotal * pct / 100 / 1000) * 1000`.
- **Order code:** `TUA` + zero-padded Postgres sequence (`TUA0001`). Donation: `UH0001`.
- **Status changes:** `transitionOrder(orderId, to, {note, userId})` → check `ALLOWED[from].includes(to)` → update plus history insert → fire email and sheet sync (non-blocking).
- **Forms** use react-hook-form + zod, with Vietnamese labels.
- **Images** use `next/image` with the Supabase storage domain.

## End-to-end checklist (run before launch)
- [ ] Custom order on an iPad, then pay 50%, confirm in admin, and move through PRINTING → QC → READY → DELIVERED. The customer receives emails and the lookup shows the history.
- [ ] A pickup order stores the free-text location and the date/time picked on the calendar (a past time is refused).
- [ ] "Quên mật khẩu" emails a reset link that works on another device and ends on /tai-khoan with the new password.
- [ ] An unpaid order expires.
- [ ] A workshop cash order with a scanned image.
- [ ] A donation under 300.000đ is rejected; an anonymous donation shows "Nhà hảo tâm ẩn danh".
- [ ] The Sheets tabs match the DB after a resync.
- [ ] The only public upload is the canvas "Chèn ảnh" tool, and it requires login (search the code for `type="file"` outside `admin/`).
- [ ] A rejected design blocks printing; the buyer can resubmit; uploaded photos are not reachable without a signed URL.
- [ ] The service key is not in the client bundle.
- [ ] Checkout while logged out redirects to login; the cart survives login and shows on a second device.
- [ ] A prototype order uses the custom price and the prototype's print file; a deactivated prototype cannot be ordered.
- [ ] Home page: every section editable in admin; latest donations and sponsors shown.
