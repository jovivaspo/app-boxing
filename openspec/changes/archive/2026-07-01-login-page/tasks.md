# Tasks: Login Page — Stitch AuthShell

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~265 (195 additions + 70 deletions) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Setup & Font Migration

- [x] 1.1 Install shadcn Card and Separator: run `npx shadcn@latest add card separator` — verify `src/ui/components/card.tsx` and `src/ui/components/separator.tsx` are created.
- [x] 1.2 Swap Geist → Inter in `src/app/layout.tsx`: replace `Geist, Geist_Mono` imports with `Inter` from `next/font/google`; set `variable: "--font-sans"`; remove `geistMono`; update `<html>` className to use only `inter.variable`; change `lang="en"` → `lang="es"`; update metadata title to `"AuthShell"` and description to `"Inicia sesión con tu cuenta de Google"`.
- [x] 1.3 Clean up `src/app/globals.css`: remove `--font-mono: var(--font-geist-mono)` from `@theme inline` (Geist Mono no longer loaded). Verify `--font-sans: var(--font-sans)` already maps correctly to the new Inter variable.

## Phase 2: Leaf Components

- [x] 2.1 Create `src/ui/components/google-icon.tsx`: inline SVG with Google's 4 brand colors (blue #4285F4, red #EA4335, yellow #FBBC05, green #34A853). Accept optional `className` prop for size control via Tailwind.
- [x] 2.2 Create `src/ui/components/security-badges.tsx`: row of 3 badges using Lucide React icons — ShieldCheck ("Verificado"), Lock ("Encriptado"), Fingerprint ("Seguro"). Use `text-muted-foreground` for labels, `gap-3` spacing.

## Phase 3: Composite & Shell Components

- [x] 3.1 Create `src/ui/components/login-card.tsx`: shadcn Card wrapping heading "Bienvenido" (`text-2xl font-semibold`), subtext "Inicia sesión en tu cuenta" (`text-muted-foreground`), full-width Google button (shadcn Button `variant="outline"` with `bg-zinc-900 text-white hover:bg-zinc-800` classes + GoogleIcon), and SecurityBadges row below. Max-width `max-w-[440px]`.
- [x] 3.2 Create `src/ui/components/login-header.tsx`: brand "AuthShell" (text, `font-semibold`), nav tabs (Login active with `border-b-2 border-zinc-900`, Sign Up inactive with `text-muted-foreground`), and "Help" link. Container `max-w-screen-xl mx-auto px-4`.
- [x] 3.3 Create `src/ui/components/login-footer.tsx`: shadcn Separator, "AuthShell" label, legal links (Terms of Service, Privacy Policy, Contact), "© 2024" copyright. Container `max-w-screen-xl mx-auto px-4`.

## Phase 4: Page Assembly & Root Redirect

- [x] 4.1 Create `src/app/login/page.tsx`: composition root (Server Component) assembling LoginHeader, centered LoginCard inside `flex-1 flex items-center justify-center px-4`, and LoginFooter. Page wrapper uses `flex min-h-screen flex-col`.
- [x] 4.2 Replace `src/app/page.tsx` with server-side redirect: import `redirect` from `next/navigation`, call `redirect("/login")` in the default export. Remove all Vercel template code and the `next/image` import.

## Phase 5: Verification

- [x] 5.1 Run `npm run build` — must pass with zero errors.
- [x] 5.2 Run `npm run lint` — must pass with zero warnings.
- [x] 5.3 Run `npx tsc --noEmit` — must pass with zero type errors.
