# Job Hunter Visual Redesign — "The Open Board"

## Context
The Job Hunter job marketplace is fully built and functionally verified: auth (Clerk + Convex sync via `convex/http.ts` webhook), job posting/publishing with billing gates, applications, employer portal, and the seeker dashboard all work end-to-end. The UI, however, uses unmodified default shadcn styling — generic blue/gray palette, stock Geist fonts with no display treatment, flat cards, no motion, several hardcoded Tailwind colors (`green-50`, `yellow-200`, etc.) bypassing the theme system entirely. The user (acting as design lead) wants a distinctive, intentional visual identity instead of this generic baseline, with all functionality and logic left untouched — this is a pure visual/markup redesign.

## Confirmed creative direction: "The Open Board"
Centers the design around the job listing itself — the core artifact of this product — using an editorial-meets-marketplace identity rather than generic SaaS blue.

**Color tokens** (HSL values to add in `app/globals.css`):
- `ink` #1B1E27 — primary text / dark-mode background
- `paper` #F2EFE9 — warm stone background (light mode)
- `ember` #E2572B — primary accent / CTAs / focus rings
- `pine` #1F4D3D — success / active status
- `gold` #C99A2E — featured / pro-plan accent (used sparingly)
- `slate` #5B6472 — secondary text / borders / neutral status

**Type system:**
- Display: **Fraunces** (variable serif, via `next/font/google`) — hero headline, job titles on cards/detail pages, big stat numbers, section headers only
- Body/UI: **Geist Sans** (already installed) — all body copy, labels, buttons, nav, forms — unchanged
- Utility/mono: **Geist Mono** (already installed) — applicant IDs, timestamps, salary figures, stat counters, stamp badge text

**Signature element — the "stamp" badge:** every status indicator across the app (job draft/active/closed, application pending/reviewing/accepted/rejected, billing plan free/pro) becomes ONE consistent component: uppercase, tracked-out letter-spacing, mono font, thin border, slight rotation (-1 to -2deg), color-coded via the tokens above. This replaces today's three competing, inconsistent status-rendering patterns (CVA `Badge` variants, inline ternaries, hardcoded Tailwind colors).

**Job cards become "ticket stubs":** a stamped company-initial circle (Fraunces letter, slight rotation) on the left, separated by a dashed divider from the job details on the right (title in Fraunces, salary in mono).

**Landing hero drops the generic boxed-search-card template:** oversized Fraunces headline with the search fields styled as inline underlined fields within the sentence; stats become small mono chip tags instead of a separate boxed section.

**Rollout scope:** everything in one pass — shared component library + all 13 page files (public-facing and full employer portal).

---

## 1. Foundation layer (sequential, blocking — do first)

**`app/globals.css`**
- Replace the default shadcn HSL values with the new palette, keeping all variable *names* unchanged (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`) so every existing `bg-background`/`text-primary`/etc. usage re-themes automatically with zero markup changes.
  - `--background → paper`, `--foreground → ink`, `--primary → ember`, `--destructive →` a desaturated rust (not default Tailwind red), `--border/--input →` warm slate-tinted (not cool gray), `--ring → ember`
  - Add a new `--success` variable (`→ pine`) since `badge.tsx` already has a `success` variant that needs a non-hardcoded source
  - `.dark` block: invert ink/paper as background/foreground, brighten pine/rust slightly for legibility on dark backgrounds, keep ember constant across modes (brand color shouldn't shift)
- Add raw, mode-independent color tokens to the `@theme inline` block for direct utility classes the semantic slots can't cover: `--color-ink`, `--color-paper`, `--color-ember`, `--color-pine`, `--color-gold`, `--color-slate` → gives `bg-pine`, `text-gold`, `border-slate` etc., needed by the Stamp component's 4+ distinct hues
- Add `--font-display: var(--font-fraunces)` to `@theme inline`, following the exact existing pattern used by `--font-sans`/`--font-mono` (Tailwind 4 requires the var() reference form, not a literal)
- Consider lowering `--radius` from `0.5rem` to something tighter (e.g. `0.375rem`) — the stamp/ticket aesthetic reads better with more deliberate corners

**`app/layout.tsx`**
- Import `Fraunces` from `next/font/google` alongside the existing `Geist`/`Geist_Mono`, configure with `variable: "--font-fraunces"`, add to the `<body>` className string
- No other changes — ClerkProvider/ConvexProviderWithClerk/Toaster wiring stays as-is

**Checkpoint:** run `npm run build` after this step alone to confirm the new `@theme inline` entries compile cleanly before touching any component/page.

---

## 2. Shared components (depends on Step 1 tokens existing)

**New: `components/ui/stamp.tsx`**
- CVA-based, modeled on `badge.tsx` but visually distinct: `font-mono uppercase tracking-widest text-xs px-2.5 py-1 border` + a per-variant rotation (`-rotate-1`/`-rotate-1.5`/`-rotate-2`)
- Variants: `active`/`accepted` → pine, `draft`/`pending`/`reviewing`/`free` → slate, `closed`/`rejected` → ink/rust, `pro` → gold
- Retires `badge.tsx`'s hardcoded `success: "bg-green-100 text-green-800"` variant entirely — every current consumer of `variant="success"` is a status indicator and migrates to `<Stamp>`. Keep `badge.tsx` itself for non-status pill labels (job-type tag "Full-time", the landing hero's job-count pill) — different visual role, not retired.

**New: `components/job-card.tsx`**
- Consolidates the 4 near-duplicate inline card blocks currently hand-rolled in `app/jobs/page.tsx`, `app/dashboard/page.tsx`, `app/employer/page.tsx`, and `app/employer/jobs/page.tsx`
- Presentational-only props: `title`, `orgName?`, `location`, `type?`, `salary?`, `applicationCount?`, `status?: { variant, label }` (renders a `<Stamp>`), `href?` (wraps in `Link`), `initial?` (stamped-circle letter), `rightSlot?: ReactNode` (escape hatch for employer action buttons — keeps the component free of action-specific logic; pages keep their own mutation calls and pass handlers into buttons rendered via `rightSlot`)
- Ticket-stub layout: stamped initial-circle (Fraunces letter, rotated) on the left, `border-dashed` divider, job details on the right (title in Fraunces, salary in `font-mono`)
- `app/employer/jobs/[jobId]/page.tsx`'s applicant rows are a different content shape (name/email/cover-letter, not a job listing) — do NOT force into `JobCard`; give them the same stamped-circle visual language inline instead

**Existing primitives (`button.tsx`, `card.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `label.tsx`):** no structural changes — they re-theme automatically once `globals.css` tokens change, since they all consume the semantic CSS variables (`bg-card`, `border-input`, `ring-ring`, etc.) rather than hardcoded colors.

---

## 3. Page-by-page changes (markup/className only — no logic changes)

**Public-facing**
- `app/page.tsx` — remove boxed search card; inline underlined search fields within a Fraunces headline sentence (same `handleSearch`/`useRouter` logic); stats become mono chip tags, not a boxed section; employer CTA becomes the one full-ember block on the page
- `app/jobs/page.tsx` — job list adopts `<JobCard>`; filters restyle via tokens only
- `app/jobs/[jobId]/page.tsx` — title in Fraunces, salary in mono, sidebar company block gets the stamped-circle treatment, "already applied" banner moves off hardcoded `bg-green-50` to token-based pine styling
- `app/apply/[jobId]/page.tsx` — Fraunces heading, token-only restyle elsewhere, all `react-hook-form`/zod logic untouched
- `app/dashboard/page.tsx` — adopts `<JobCard>` (status = application-status Stamp, `rightSlot` = existing `ExternalLink` button), Fraunces heading

**Employer portal**
- `app/employer/employer-nav.tsx` — active-state restyle via ember token, optional Fraunces wordmark
- `app/employer/page.tsx` — adopts `<JobCard>` for recent jobs; stat numbers in Fraunces/mono; billing-limit banner moves off hardcoded `bg-yellow-50` to token-based gold styling; per-stat hardcoded colors (`text-green-600`, `text-yellow-600`) replaced with pine/gold/slate/ember tokens
- `app/employer/jobs/page.tsx` — adopts `<JobCard>` with `rightSlot` carrying the existing Eye/Rocket/X action buttons and their `handlePublish`/`handleClose` mutations unchanged
- `app/employer/jobs/new/page.tsx` — Fraunces heading, token-only form restyle, all `createJob`/`publishJob` logic untouched
- `app/employer/jobs/[jobId]/page.tsx` — Fraunces job title, job-status Stamp, applicant rows get stamped-circle avatars, status `Select` + Stamp pair (mutation logic untouched)
- `app/employer/settings/page.tsx`, `app/employer/onboarding/page.tsx` — Fraunces headings + token-only shell restyle; the embedded Clerk components (`<OrganizationProfile>`, `<CreateOrganization>`) are NOT stylable via this token system — they need Clerk's separate `appearance` prop API, which is out of scope for this pass unless requested separately

---

## 4. Implementation order

1. **Foundation** (sequential): `globals.css` → `layout.tsx` → build checkpoint
2. **Shared components** (parallelizable): `components/ui/stamp.tsx`, `components/job-card.tsx`
3. **Public pages** (parallelizable, start with landing since it's highest-risk due to the hero restructure): `app/page.tsx` → `app/jobs/page.tsx`, `app/jobs/[jobId]/page.tsx`, `app/apply/[jobId]/page.tsx`, `app/dashboard/page.tsx`
4. **Employer portal** (parallelizable, nav first): `app/employer/employer-nav.tsx` → `app/employer/page.tsx`, `app/employer/jobs/page.tsx`, `app/employer/jobs/new/page.tsx`, `app/employer/jobs/[jobId]/page.tsx`, `app/employer/settings/page.tsx`, `app/employer/onboarding/page.tsx`
5. **Final QA pass**: `grep -rn "green-\|yellow-\|red-\|blue-" app/ --include=*.tsx` to confirm no hardcoded colors remain; verify every Stamp variant across all call sites; spot-check dark mode on landing, job board, and employer dashboard

---

## Risks / Gotchas
- Fraunces is a variable font with multiple optical-size axes — may need an explicit `weight` array if auto-negotiation doesn't pick a heavy-enough weight for stat numbers/headlines
- Dark-mode exact values are inferred (not explicitly specified in the brief) — confirm they read correctly once built, particularly pine/rust contrast on dark backgrounds
- Hardcoded Tailwind colors (`green-50/yellow-200/green-600` etc., confirmed in `app/jobs/[jobId]/page.tsx`, `app/apply/[jobId]/page.tsx`, `app/employer/page.tsx`, and `components/ui/badge.tsx`'s `success` variant) will NOT be fixed by the token swap alone — each needs an explicit JSX edit
- Keep `JobCard` deliberately "dumb" (presentational props + `rightSlot` escape hatch) rather than branching on "is this an employer view" internally, to avoid prop-explosion across its 4 call sites
- Every page touched has live Convex queries/mutations, Clerk auth hooks, and react-hook-form/zod validation — edits must be reviewable as markup/className-only diffs; no changes to query args, mutation calls, `register()` bindings, or conditional render logic
- No animation library is installed and none is being added in this pass — reuse existing Tailwind `transition-*`/`hover:` utilities already in the codebase

---

## Verification
1. `npm run build` passes after the foundation step and again after full rollout
2. Visually review in the browser: landing hero (inline search + mono chips), public job board (ticket-stub cards), job detail (stamped sidebar), employer dashboard (stat cards + billing banner), job postings list (stamp + actions), applicants page (stamped avatars + status stamp), seeker dashboard (application stamps)
3. Toggle dark mode on at least 3 pages (landing, job board, employer dashboard) and confirm contrast/legibility
4. Run the `grep` sweep for leftover hardcoded Tailwind colors and confirm zero matches outside intentional exceptions
5. Confirm no functional regressions: sign in/out, search/filter on job board, apply to a job, publish/close a job as employer, update an applicant's status — all should behave identically to pre-redesign
