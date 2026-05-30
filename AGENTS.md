# 1600 — agent map

Next.js 15 App Router + Supabase. Dev: `npm run dev` → http://127.0.0.1:3000

**If every page shows Internal Server Error:** run `npm run fix` (do not run `npm run build` while dev is running — it corrupts `.next`).

## Open only what you need

| Task | Files |
|------|--------|
| Auth / login | `src/components/login-form.tsx`, `src/app/auth/callback/route.ts` |
| Onboarding | `src/components/onboarding-form.tsx`, `src/lib/student-path.ts`, `saveOnboarding` in `src/app/actions.ts` |
| Dashboard | `src/components/dashboard-view.tsx`, `getDashboardData` in `src/app/actions.ts` |
| Session UI | `src/components/session-runner.tsx`, `session-*` components |
| Session logic | `src/lib/session-builder.ts`, `src/lib/intelligence/*`, `advanceSessionPhase` / `submitAttempt` in `src/app/actions.ts` |
| Skill scores & adaptation | `src/lib/intelligence/skill-score.ts`, `adaptive.ts`, `insights.ts` |
| AI explanations | `src/lib/ai/provider.ts`, `src/app/intelligence-actions.ts` |
| Routing / auth gate | `src/lib/supabase/middleware.ts`, `src/middleware.ts` |
| DB setup (user runs in Supabase) | `supabase/schema.sql`, `supabase/seed.sql`, `supabase/complete_setup.sql` |

Do not open: `node_modules`, `.next`, deleted mock/demo files.

## Routes

`/login` → `/onboarding` → `/dashboard` → `/session?id=`
