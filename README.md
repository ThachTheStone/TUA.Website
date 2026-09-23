# TỰA – Nét Vẽ Yêu Thương

Requirements: `docs/SRS.md`. Build playbook: `.claude/skills/tua-builder/SKILL.md`.

## Setup
1. `npm install`
2. Create a Supabase project, then run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`).
3. `cp .env.example .env.local` and fill in the Supabase URL, anon key and service-role key.
4. Seed the first Admin: `npm run create-admin -- admin@example.com "matkhau123" "Tên Admin"`
5. `npm run dev` and open http://localhost:3000/admin

## Checks
`npm run typecheck && npm run lint`

## Note on shadcn/ui
`npx shadcn add <component>` currently writes `import { cn } from "cn"`. After adding a component, run:
`sed -i 's#from "cn"#from "@/lib/utils"#' src/components/ui/*.tsx` and `npm uninstall cn` if it got installed.
