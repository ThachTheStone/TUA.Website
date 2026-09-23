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
**Done when:** a user can draw on all 3 areas on an iPad with no page scroll, undo/redo works, export produces a 200 DPI PNG per area, and there is no upload button.

### Phase 4 — Cart + checkout + VietQR (FR06, FR07, FR11, FR22, FR24)
- Cart state is Zustand persisted to localStorage. Items: `{type, color, size, quantity, designDraftId?}`.
- Checkout server action `createOrder`: validate with zod → recompute prices from settings → upload design PNGs → insert order, items and designs in one RPC/transaction → generate code → return code.
- `/thanh-toan/[code]`: QR, bank info, copy buttons, countdown to `expires_at`, and a "Tôi đã chuyển khoản" button that moves the order to PAYMENT_REVIEW.
- `/tra-cuu`: lookup requiring both code and phone.
- Send an order-created email.
**Done when:** placing an order with 2 custom + 1 plain shirt at 75% shows the correct QR amount, and a tampered client price is ignored.

### Phase 5 — Admin orders (FR13–FR16)
- Orders table with filters, search and status counters.
- Order detail: design previews plus download of print files (signed URLs), payment recording, and transition buttons that show only valid next states.
- Workshop form: staff uploads scans to the `scans` bucket; the cash option creates the order as CONFIRMED.
- Emails on CONFIRMED, READY, DELIVERED and CANCELLED.
**Done when:** an order can go from start to DELIVERED, history is logged, and a STAFF user cannot open accounts or settings.

### Phase 6 — Donations, Sheets, cron (FR08, FR18, FR23, FR25)
- Donation form (min from settings, default 300.000đ), donation QR using the fund account and prefix `UH`, admin confirm, donor wall and progress bar.
- `lib/sheets.ts` full-resync approach (see integrations), called after every mutation plus an admin "Đồng bộ lại" button.
- Expire cron.
**Done when:** a confirmed donation appears on the wall and in the sheet, and an old unpaid order becomes EXPIRED within 15 minutes.

### Phase 7 — Polish + deploy
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
- [ ] A pickup order stores the free-text location and time.
- [ ] An unpaid order expires.
- [ ] A workshop cash order with a scanned image.
- [ ] A donation under 300.000đ is rejected; an anonymous donation shows "Nhà hảo tâm ẩn danh".
- [ ] The Sheets tabs match the DB after a resync.
- [ ] No upload input exists on any public page (search the code for `type="file"` outside `admin/`).
- [ ] The service key is not in the client bundle.
