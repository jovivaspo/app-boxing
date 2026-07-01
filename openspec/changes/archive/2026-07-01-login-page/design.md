# Design: Login Page — Stitch AuthShell

## Technical Approach

Pure presentational UI implementing the AuthShell login page from the Stitch design (Neutral Precision theme). No domain/application/infrastructure layers are touched — this is a static page per the Clean/Hexagonal skill's "Skip When" rule for simple display pages. All components are Server Components (no `"use client"` directive needed). The page serves as the composition root, assembling sub-components from `src/ui/components/`.

## Architecture Decisions

| Decision | Alternatives | Rationale |
|----------|-------------|-----------|
| All Server Components | Client Components with state | Zero interactivity — static content only; no hydration cost |
| Flat component files in `src/ui/components/` | Feature folder per component | Each component is a single file; no co-located hooks/types needed yet |
| Inline SVG for Google icon | External SVG file, icon library | Multi-color paths (4 brand colors) — inline gives full control, zero deps |
| Lucide React for security badges | Custom SVGs, heroicons | Already compatible with shadcn/radix-nova; tree-shakeable |
| Server-side redirect on `/` | Client-side `useEffect` redirect, middleware | Faster — no JS needed; `redirect()` from `next/navigation` in RSC is correct for Next.js 16 App Router |
| Font migration via CSS variable rename | Add new variable, keep old | `--font-sans` already maps to Inter alias in `globals.css`; just swap the font source |

## Component Tree

```
/app/login/page.tsx (composition root — Server Component)
├── LoginHeader
│   ├── Brand (text + icon placeholder)
│   ├── NavTabs (Login active, Sign Up inactive)
│   └── HelpLink
├── LoginCard (shadcn Card)
│   ├── heading "Bienvenido"
│   ├── subtext "Inicia sesión en tu cuenta"
│   ├── GoogleButton (shadcn Button variant=outline, full-width)
│   │   └── GoogleIcon (inline SVG, 4-color)
│   └── SecurityBadges
│       ├── ShieldCheck (Lucide)
│       ├── Lock (Lucide)
│       └── Fingerprint (Lucide)
└── LoginFooter
    ├── Separator (shadcn)
    ├── LegalLinks (Terms, Privacy, Contact)
    └── Copyright
```

## Data Flow

No data flow — this is a static page. The only "data" is hardcoded copy and design tokens.

```
  Stitch Design Tokens ──→ globals.css (@theme inline) ──→ Tailwind classes
       ↓
  Component JSX ──→ Server Component render ──→ HTML to browser
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/login/page.tsx` | Create | Login route page — composition root assembling all sub-components |
| `src/ui/components/login-header.tsx` | Create | AuthShell header with brand, nav tabs, help link |
| `src/ui/components/login-card.tsx` | Create | Centered card with heading, subtext, Google button, security badges |
| `src/ui/components/login-footer.tsx` | Create | Legal footer with separator, links, copyright |
| `src/ui/components/google-icon.tsx` | Create | Inline SVG with Google's 4 brand colors |
| `src/ui/components/security-badges.tsx` | Create | Row of 3 Lucide icons with labels |
| `src/app/layout.tsx` | Modify | Geist → Inter font, `lang="es"`, updated metadata |
| `src/app/page.tsx` | Modify | Replace Vercel template with server-side redirect to `/login` |
| `src/app/globals.css` | Modify | Update `--font-sans` CSS variable to reference Inter |
| `package.json` | Modify | shadcn add `card` + `separator` |

## Interfaces / Contracts

### LoginPage (composition root)

No props — page component. Imports and assembles all sub-components.

### LoginHeader

```tsx
// No props — static content only
function LoginHeader(): JSX.Element;
```

### LoginCard

```tsx
// No props — static content only
function LoginCard(): JSX.Element;
```

### LoginFooter

```tsx
// No props — static content only
function LoginFooter(): JSX.Element;
```

### GoogleIcon

```tsx
interface GoogleIconProps {
  className?: string;  // For size control via Tailwind
}
function GoogleIcon({ className }: GoogleIconProps): JSX.Element;
```

### SecurityBadges

```tsx
// No props — static badges
function SecurityBadges(): JSX.Element;
```

## Design Token Mapping

| Stitch Token | Tailwind Class | CSS Variable | Value |
|-------------|---------------|-------------|-------|
| Primary color | `bg-zinc-900` / `text-zinc-900` | `--primary` | `oklch(0.205 0 0)` |
| Background | `bg-background` | `--background` | `oklch(1 0 0)` |
| Card surface | `bg-card` | `--card` | `oklch(1 0 0)` |
| Muted text | `text-muted-foreground` | `--muted-foreground` | `oklch(0.556 0 0)` |
| Border | `border-border` | `--border` | `oklch(0.922 0 0)` |
| Radius | `rounded-lg` | `--radius` | `0.625rem` (10px) |
| Spacing baseline | `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px) | — | 4px scale |
| Font | `font-sans` | `--font-sans` → Inter | — |
| Card max-width | `max-w-[440px]` | — | 440px |
| Container max-width | `max-w-screen-xl` | — | 1280px |

## Layout Strategy

### Root Layout (`layout.tsx`)

```
html.h-full
└── body.flex.min-h-full.flex-col
    └── {children}  ← each page fills available height
```

The body uses `flex min-h-full flex-col` so pages can use `flex-1` to push content and create sticky footer behavior.

### Login Page Layout

```
div.flex.min-h-screen.flex-col (page wrapper)
├── header (LoginHeader) — sticky or static at top
├── main.flex-1.flex.items-center.justify-center (content area)
│   └── div.px-4.w-full.max-w-[440px] (card container)
│       └── LoginCard
└── footer (LoginFooter) — at bottom via flex-1 on main
```

### Responsive Breakpoints

| Breakpoint | Tailwind | Behavior |
|-----------|----------|----------|
| Mobile (375px) | default | `px-4` (16px) margins, full-width card, stacked layout |
| sm (640px) | `sm:` | `px-6`, slightly larger spacing |
| md (768px) | `md:` | Card centered with visible whitespace |
| lg (1024px) | `lg:` | Full desktop layout, header links visible |
| xl (1280px) | `xl:` | Max container width, card stays at 440px |

## shadcn Integration

| Component | Usage | Variant/Props |
|-----------|-------|---------------|
| `Card` | Wraps login form content | Default — `CardHeader`, `CardContent`, `CardFooter` as needed |
| `Separator` | Divides footer links from copyright | Default (horizontal) |
| `Button` | "Continuar con Google" | `variant="outline"`, full-width, custom className for zinc-900 background |

The Google button uses `variant="outline"` with custom classes to match the Stitch design: dark background (`bg-zinc-900`), white text, full-width, hover state.

## Font Migration Steps

1. In `layout.tsx`: Replace `Geist, Geist_Mono` imports with `Inter` from `next/font/google`
2. Update the font variable: `Inter({ variable: "--font-sans", subsets: ["latin"] })`
3. Remove `geistMono` — not needed for login page
4. Update `className` on `<html>`: use only `inter.variable`
5. Change `lang="en"` → `lang="es"`
6. Update metadata: `title: "AuthShell"`, `description: "Inicia sesión con tu cuenta de Google"`
7. In `globals.css`: `--font-sans` already references `var(--font-sans)` — no change needed there

## Root Redirect

`src/app/page.tsx` becomes a server-side redirect:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

This is the correct Next.js 16 App Router pattern — `redirect()` throws a special error that Next.js catches and performs a 307 temporary redirect at the server level. No client-side JavaScript needed.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Visual | Page renders at 375px and 1280px | Manual browser check against Stitch design |
| Build | `npm run build` passes | CI gate |
| Lint | `npm run lint` passes | CI gate |
| Type-check | `npx tsc --noEmit` passes | CI gate |
| Accessibility | All interactive elements focusable | Manual keyboard navigation |

No automated tests per user directive.

## Migration / Rollout

No migration needed — this is a new page. The redirect on `/` is immediate.

**Rollback Plan** (from proposal):
1. Revert `layout.tsx`: restore Geist, `lang="en"`, original metadata
2. Restore `page.tsx` from Vercel template
3. Delete `src/app/login/` and 5 new components
4. Uninstall shadcn Card/Separator if unused
5. `npm run build && npm run lint` to verify

## Open Questions

- [ ] Should the Google button link to an actual OAuth endpoint now, or use `href="#"` as placeholder? (Proposal says OAuth is out of scope — placeholder is fine.)
- [ ] Does the brand in the header use text-only or an SVG logo? (Stitch design shows text "AuthShell" — text-only for now.)
- [ ] Should "Sign Up" tab be a disabled visual state or a working link to a future `/signup` route? (Proposal says sign-up page is out of scope — use disabled/inactive visual state.)
