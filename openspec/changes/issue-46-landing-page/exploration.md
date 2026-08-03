# Exploration: Landing Page & Shared Shell

Issue: #46 — Create landing & subcomponents
OpenSpec change: `issue-46-landing-page`

## Binding Decision (user, pre-exploration)

`/` becomes a **public landing page for everyone**. No session-based redirect. The topbar
reflects session state (logged-out shows a sign-in link; logged-in shows app links / logout).
The current authenticated home content on `/` must be rehomed — options in [§7](#7-where-the-current-authenticated-home-content-goes).

## 1. Current `/` behaviour and constraints

`src/app/page.tsx` is entirely session-gated: `export const dynamic = "force-dynamic"` with a
comment explaining why — `getCurrentSession()` reaches `cookies()` only through the session
adapter, and if that adapter ever fails closed before calling `cookies()`, Next.js's build-time
static analysis would miss the dynamic-API usage and bake the redirect into a static page.
`redirect("/login")` fires when there is no session; otherwise it renders a greeting plus
`/profile`, `/timers` links and a logout `<form>`.

**Key finding — no PPR / Cache Components in this repo.** `next.config.ts` does not set
`cacheComponents: true`. Per `node_modules/next/dist/docs/01-app/02-guides/rendering-philosophy.md`,
without Cache Components/PPR, Next.js falls back to **route-level, all-or-nothing** static/dynamic
boundaries — component-level Suspense streaming for static/dynamic mixing is a PPR-only feature.
So if the topbar reads `cookies()` anywhere in `/`'s RSC render pass, the entire `/` route bails
to dynamic; a Suspense boundary does **not** grant a static shell in this project as configured.

Dynamic (SSR) rendering does **not** hurt crawler indexability — Next.js still returns fully
server-rendered HTML per request, just without CDN-level caching. `next.config.ts` sets
`output: "standalone"` (self-hosted Node server via Docker), with no CDN anywhere in the repo. The
usual "static generation for SEO" argument is therefore weak here: the cost of staying dynamic is
edge-cache latency, not indexability.

## 2. Existing shared-shell surface

There is **no topbar/footer today outside the login flow**, and **no nested route layouts**
(`src/app/*/layout.tsx` does not exist — only the root `src/app/layout.tsx`).

- `src/ui/components/login-header/login-header.tsx` — static `LoginHeader`, **not session-aware**:
  hardcoded active "Iniciar Sesión" link, a disabled "Registrarse" `<span>`, an "Ayuda" link, and
  a menu button — none wired to real routes or state.
- `src/ui/components/login-footer/login-footer.tsx` — static `LoginFooter`, legal links plus
  "ELITE COMBAT LEAGUE" branding, no session concerns.
- `src/ui/components/security-badges/security-badges.tsx` — pure display list, used only inside
  `LoginCard`.
- `src/app/login/page.tsx` wires `LoginHeader` + `LoginCard` + `LoginFooter` directly — the only
  place a header/footer shell exists.

None read session state; they are presentational shells built for the logged-out login screen. The
new shared topbar must become session-aware, so this is a **generalization**, not reuse-as-is.
`LoginHeader`'s nav items ("Iniciar Sesión" / "Registrarse" / "Ayuda") already read like landing
nav copy that leaked into the login screen, so generalizing them into one shared component is the
lower-duplication path.

## 3. Session read from the UI layer

Server-side session reads happen only at the composition root (`app/*/page.tsx` Server Components):

```ts
const session = await getCurrentSession({
  session: createCookieSessionAdapter(),
})();
```

`getCurrentSession` is a pure application use case
(`src/application/use-cases/get-current-session/get-current-session.ts`);
`createCookieSessionAdapter` is the infra adapter implementing `SessionPort`.

Two architecturally valid paths for a session-aware shared topbar:

1. **Server-side (composition root passes it down)** — `app/page.tsx` calls `getCurrentSession`
   once and passes `Session | null` as a prop into `<Topbar session={session} />`. `Topbar` stays a
   dumb presentational component; no new AGENTS.md exception needed. Forces `/` dynamic (§1).
2. **Client-side via Server Action (AGENTS.md exception 1 + A2)** — a new Server Action wraps
   `getCurrentSession`, called from `topbar.hook.ts` (never the `.tsx`, per A2) after mount. Keeps
   `/`'s initial RSC render free of `cookies()`, but produces a flash-of-unauthenticated-content and
   repeats a pattern this codebase already had to work around for guest-timer hydration (issue #44).

**Recommendation: path 1.**

## 4. Design tokens & visual language

- `src/app/layout.tsx` wires three fonts: `Anton` → `--font-heading` (headings, used with
  `uppercase`/`italic` in `not-found.tsx`), `Inter` → `--font-sans` (body default), `JetBrains_Mono`
  → `--font-mono` (small uppercase tracked-out labels).
- `src/app/globals.css` is Tailwind v4, no config file, `@theme inline {}` mapping CSS vars to
  Tailwind tokens. **Single fixed dark palette in `:root`** — no `.dark` class and no
  `@custom-variant dark` block, despite AGENTS.md describing class-based dark mode. The app ships
  one dark theme: background `#131313`, primary red `#dc0000`, accent yellow `#f9bd22`,
  `--radius: 0px` (sharp corners everywhere).
- Conventions in `login-card.tsx` and `timer-configuration-card.tsx`: `Card` primitives with
  `border-l-4 border-l-primary` accent borders, `font-heading uppercase` headings,
  `font-mono text-[10px] uppercase tracking-widest` micro-labels, Lucide icons at `size-4`/`size-5`,
  and a `bg-primary h-1 w-full` bottom accent bar. The landing must reuse these, not invent new ones.

## 5. SEO surface in Next.js 16

Verified against `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`,
`.../03-file-conventions/01-metadata/sitemap.md`, `.../robots.md`.

Today: only `src/app/layout.tsx` exports a static `metadata: Metadata` (`title: "Iron Pulse"`,
Spanish description). No `generateMetadata`, no `openGraph`/`twitter` fields, no `metadataBase`, no
`robots.ts`, no `sitemap.ts`. `src/app/icon.png` is already auto-picked up as the favicon by the
file-based convention — icons are covered.

Needed for the landing:

- static `metadata` object exported from `app/page.tsx` (page metadata overrides the layout's);
- `openGraph` / `twitter` fields for shareability;
- `metadataBase` in `layout.tsx` — currently absent, required for relative OG image URLs to resolve;
- `app/robots.ts` and `app/sitemap.ts` as typed `MetadataRoute.Robots` / `MetadataRoute.Sitemap`.

## 6. Stitch design status (prerequisite gap)

Stitch project `6380251267090136078` currently holds: "Configurar Timer", "Timer Activo",
"Cronómetros", "Login (Replica)", "Error 404", plus a logo asset — **no landing screen**.

A landing screen (topbar / footer / sections, guest and authenticated variants) must be generated in
Stitch before `sdd-design` can cite concrete visual specs. This blocks design, not the proposal.

## 7. Where the current authenticated home content goes

| Option                                                    | Description                                                                                                                                                                                                             | Pros                                                                                                    | Cons                                                                                                             |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **1. Fold into landing as a logged-in CTA (recommended)** | `/` composition root still calls `getCurrentSession()` once; the landing renders a distinct section when authenticated, reusing the greeting plus `/profile` / `/timers` links and logout form as a hero-area CTA block | No new routes; existing copy/links and most of `src/app/__tests__/page.test.tsx` survive; smallest diff | The landing branches on auth state                                                                               |
| **2. Move to `/home`**                                    | New authenticated dashboard route; `/` is pure marketing regardless of auth                                                                                                                                             | Clean marketing/app separation                                                                          | New route plus new tests; authenticated users hitting `/` see marketing instead of their dashboard; adds a click |
| **3. Drop it, topbar carries the links**                  | Topbar shows profile/timers/logout when authenticated; landing body is 100% marketing                                                                                                                                   | Least code; matches the binding decision that the topbar carries session-aware nav                      | Loses the personalized greeting; three nav items is tight in a topbar                                            |

**Recommendation: Option 1**, with the topbar also getting a lightweight authenticated-state
affordance (required by the binding decision regardless of which option wins).

## 8. Scope/size forecast vs the 400-line review budget

| Slice                                                               | Est. lines | Notes                          |
| ------------------------------------------------------------------- | ---------- | ------------------------------ |
| Shared `Topbar` (tsx/types/hook/tests) + generalizing `LoginHeader` | ~150–220   | Session-aware nav, mobile menu |
| Shared `Footer` (mostly static)                                     | ~80–120    | Likely hook-less               |
| Landing composition (hero + 2–4 sections + links + auth CTA)        | ~150–250   | Depends on final section count |
| SEO (`metadata`, `robots.ts`, `sitemap.ts`, `metadataBase`)         | ~40–80     | New small files                |
| Rehoming `app/page.tsx` + updated tests                             | ~50–100    | Most assertions carry over     |

**Total ≈ 470–770 lines — likely exceeds the 400-line budget.** Natural slice boundary:

1. **PR1** — shared `Topbar` / `Footer` (session-aware, generalized from `LoginHeader`/`LoginFooter`) + tests.
2. **PR2** — landing composition and `/` rehoming (Option 1), wired to PR1's components.
3. **PR3** — SEO metadata, `robots.ts`, `sitemap.ts`.

## Risks

- Stitch has no landing screen — `sdd-design` is blocked until one exists.
- No PPR/Cache Components configured. If a future SEO goal demands a statically cached `/`, enabling
  `cacheComponents` is a separate infra decision, out of scope here.
- Generalizing `LoginHeader`/`LoginFooter` touches the already-shipped, tested login page — must not
  regress `src/app/login/page.tsx`.
- Single fixed dark theme with `--radius: 0px` is the only visual language. If the Stitch mock
  assumes light mode or rounded corners, reconcile before `sdd-design`.
- 400-line budget risk is Medium-High; chained PRs recommended up front.

## Ready for Proposal

Yes. The Stitch landing screen is the only blocker, and it blocks `sdd-design`, not `sdd-propose`.
