# TỰA – Nét Vẽ Yêu Thương (charity T-shirt + donation website)

Full requirements: `docs/SRS.md` (Vietnamese). It is the source of truth. Read the relevant section before building a feature, and cite FR/BR numbers in commit messages.
Build playbook: `.claude/skills/tua-builder/SKILL.md`.

## Stack
- Next.js 15 (App Router, TypeScript, Server Actions) + Tailwind CSS + shadcn/ui
- Supabase: Postgres, Auth (staff only), Storage
- react-konva for the design canvas
- VietQR via `img.vietqr.io` image URL (no API key)
- Google Sheets API (`googleapis`, service account) as a read-only mirror
- Email: nodemailer + Gmail App Password
- Deploy: Vercel (Hobby) + Supabase (Free). Cron: Supabase `pg_cron` + `pg_net` calling `/api/cron/*`

## Commands
- `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`
- DB migrations live in `supabase/migrations/*.sql`

## Hard rules (never break)
1. **No customer image upload anywhere** (BR01). Only staff can upload, and only in the workshop order form.
2. **All UI text is Vietnamese.** Money is formatted `129.000đ` via `formatVND()`. Timezone is Asia/Ho_Chi_Minh.
3. **Prices, colors, sizes, print areas and bank accounts come from the `settings` table.** Never hardcode them.
4. **Server decides money.** Recompute totals and prepay amounts on the server; never trust client values.
5. **Order status changes only through `transitionOrder()`**, which validates against the state machine in SRS §5 and writes `order_status_history`.
6. **The Supabase service-role key is server-only.** Never import it into client components.
7. **Side effects (Sheets sync, email) never fail the main action.** Wrap them in try/catch and log.
8. Check role (ADMIN/STAFF) in every admin server action, not only in the UI.
9. Before finishing any task, run `npm run typecheck && npm run lint`.

## Working style
- Build in the phase order in the skill. Do one phase per session, then stop and summarize.
- Keep components small; put business logic in `src/lib/`, not in pages.
- When a requirement is unclear, check SRS §10 (open questions) and ask. Don't invent business rules.
