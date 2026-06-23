# Clerk Billing — Starter / Pro / Enterprise Plans

## Context
Job Hunter's employer org currently has a non-functional billing stub: `organizations.billingPlan` in Convex defaults to `"free"` and is never actually updated by anything in the app (the webhook code that was supposed to sync it reads `public_metadata.billing_plan`, which nothing ever writes). The only real gate today is a hardcoded 3-active-job limit in `convex/jobs.ts`. The user wants this replaced with real Clerk Billing: three actual paid plans (Starter, Pro, Enterprise) created in the Clerk Dashboard, billed per-organization, with three meaningful gates — active job limit, featured listings, and team seats — plus sane handling of plan downgrades and seat overflow.

## Confirmed decisions
1. **Three plans**: Starter (renamed/replaces today's "free" tier, $0), Pro, Enterprise — created in Clerk Dashboard (plans can't be created via API).
2. **Gates**: job posting limit, featured listings, team seats — proposed defaults: Starter = 3 jobs / 0 featured / 1 seat, Pro = 25 jobs / 5 featured / 4 seats, Enterprise = unlimited / unlimited / unlimited (confirm exact numbers with user once Dashboard plans are created — these are placeholders to start from).
3. **Plan checks read live via `auth().has({ plan })`** in Next.js (not a Convex-stored field) — Convex's `ctx.auth.getUserIdentity()` cannot decode Clerk's internal billing JWT claims, so a Next.js Server Action layer resolves the plan via `auth().has()` and passes a validated plan string into Convex mutations as an explicit argument.
4. **Team seats**: custom invite flow, not Clerk's hosted `<OrganizationProfile>` invite UI. One "org admin" role can add/remove members up to the seat cap; attempting to add past the cap is blocked upfront with a toast prompting upgrade (not a reactive revoke-after-join).
5. **Downgrade reconciliation**: if a downgrade leaves the org with more active jobs than the new plan allows, the org enters a "reconcile required" state — a blocking modal on the employer dashboard lists the active jobs and requires the admin to choose which ones to close until the count is back within the new limit. New job publishing stays blocked until resolved.

---

## Phase 1 — Clerk Dashboard setup (manual, blocking prerequisite)
- Enable **Billing for Organizations** (separate from Billing for Users) and connect Stripe (test mode for dev).
- Create 3 plans, `forPayerType: organization`:
  - `starter` — $0/mo, default plan for new orgs.
  - `pro` — paid.
  - `enterprise` — paid (or sales-assisted, `publiclyVisible: false`).
- Create one Clerk **Feature** — `featured_listings` — attached to `pro` and `enterprise` only. Job-limit and seat-limit numbers stay as code-side constants keyed by plan slug (no need for a Clerk Feature per limit).
- Confirm exact slugs (`starter`/`pro`/`enterprise`) — these become string literals in code.

**Exit criteria:** 3 plans visible in Clerk Dashboard, Stripe test mode connected, slugs confirmed.

---

## Phase 2 — Convex data layer
**`convex/schema.ts`**
- Remove `billingPlan` from `organizations` (no longer source of truth).
- Add `featuredJobCount: v.number()`.
- Add `reconcileRequired: v.boolean()` + `reconcileTargetLimit: v.optional(v.number())`.
- Run `npx convex dev` to push.

**New `convex/billing.ts`** — shared plan-limit constants:
```ts
export const PLAN_SLUGS = ["starter", "pro", "enterprise"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

export const JOB_LIMITS: Record<PlanSlug, number | null> = { starter: 3, pro: 25, enterprise: null };
export const FEATURED_LIMITS: Record<PlanSlug, number | null> = { starter: 0, pro: 5, enterprise: null };
export const SEAT_LIMITS: Record<PlanSlug, number | null> = { starter: 1, pro: 4, enterprise: null };
```

**`convex/organizations.ts`**
- Remove `syncOrgPlan`.
- Update `syncOrg`: drop `billingPlan`, add `featuredJobCount: 0`, `reconcileRequired: false`.
- New mutations: `setReconcileState` (internal — flags/clears `reconcileRequired`), `closeJobsToReconcile` (closes selected job IDs, decrements counts, clears flag once within limit).

**`convex/jobs.ts`**
- Remove `FREE_PLAN_JOB_LIMIT`; import limits from `convex/billing.ts`.
- `publishJob` — add `plan` arg; block if `reconcileRequired` or `activeJobCount >= JOB_LIMITS[plan]`.
- New `featureJob` mutation — gated by `FEATURED_LIMITS[plan]`, increments/decrements `featuredJobCount`.
- `closeJob` — also decrement `featuredJobCount` when closing a featured job.
- `listPublicJobs` — use existing unused `by_featured_and_status` index to fetch featured-active jobs first, concatenate with the existing paginated non-featured query.

**Exit criteria:** schema pushed, `npm run build`/`npx tsc --noEmit` clean, gating logic unit-testable via Convex dashboard function runner.

---

## Phase 3 — Webhook cleanup & downgrade/seat-overflow detection
**`convex/clerkWebhook.ts`**
- Remove dead `public_metadata.billing_plan` block.
- Keep `organization.created/updated` sync as-is.
- Add `organizationMembership.created` handler: safety-net check against `SEAT_LIMITS[plan]` (resolved via Clerk Backend SDK) — log/notify only, since primary enforcement is Phase 5's pre-flight invite check.
- Add downgrade detection on Clerk Billing's subscription-change event (verify exact event name in Clerk docs, likely `subscription.updated`): if new plan's `JOB_LIMITS` < current `activeJobCount`, call `organizations.setReconcileState`.

**Exit criteria:** webhook handles all events without errors; manual downgrade in Stripe test mode correctly flags `reconcileRequired` in Convex.

---

## Phase 4 — Next.js↔Convex bridge (Server Actions)
**New `app/employer/actions.ts`**
- `getCurrentPlan()` — resolves `"starter" | "pro" | "enterprise"` via `auth().has({ plan })`.
- `publishJobAction(jobId)`, `featureJobAction(jobId, featured)` — resolve plan server-side, call `fetchMutation`.
- `inviteMemberAction(email, role)` — checks seat count via Backend SDK before `clerkClient.organizations.createOrganizationInvitation`; returns upgrade-prompt error if at cap.
- `removeMemberAction(membershipId)` — admin-only, via `clerkClient.organizations.deleteOrganizationMembership`.
- `confirmDowngradeReconcileAction(jobIdsToClose)` — calls `closeJobsToReconcile`.

**Exit criteria:** each action callable from a temporary test page/log, returns expected plan/seat data for a real signed-in org.

---

## Phase 5 — UI
- **`app/employer/billing/page.tsx`** (new) — `<PricingTable />` wrapped in "Open Board" styling (`font-display` heading, `<Stamp variant="pro">` for current plan). Nav link in `app/employer/employer-nav.tsx`.
- **`app/employer/team/page.tsx`** (new) — custom member list + add/remove UI using Phase 4 actions, shows `used / limit` seats, admin-only controls.
- **Reconcile modal** on `app/employer/page.tsx` — shown when `org.reconcileRequired`, lists active jobs with checkboxes, calls `confirmDowngradeReconcileAction`.
- **Featured toggle** in `app/employer/jobs/page.tsx`'s `<JobCard rightSlot>` — enabled for Pro/Enterprise, disabled with upgrade tooltip on Starter.
- **Dashboard plan banner** in `app/employer/page.tsx` — replaces old `billingPlan === "free"` check with `getCurrentPlan()` result, gold/Stamp styled.

**Exit criteria:** all new UI renders, matches existing design tokens, no console errors.

---

## Phase 6 — Verification
1. `<PricingTable />` renders all 3 plans at `/employer/billing`.
2. Subscribe test org to Pro via Stripe test card `4242 4242 4242 4242`; confirm `getCurrentPlan()` returns `"pro"`.
3. As Starter: publish 3 jobs → 4th blocked; featured toggle disabled; 2nd member invite blocked with upgrade toast.
4. Upgrade to Pro: job limit 25, featured up to 5, invites up to 4 seats (5th blocked).
5. Featured jobs sort above non-featured on `/jobs`.
6. Downgrade Pro → Starter with >3 active jobs: reconcile modal appears, publishing blocked, closing jobs down to 3 clears the flag.
7. `npm run build` passes after every phase.
