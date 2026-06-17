# 🚀 High-ROI Project Context for JOB HUNTER(Next.js + Clerk + Convex)

**Job Hunter**: Fast-moving, production-grade full-stack SaaS/web Job Hunting app. Prioritize developer velocity, delightful UX, real-time magic, and rock-solid auth/security. Ship features in hours, not days. Keep it clean, typed, and scalable from day one.

**Tech Stack (Authoritative)**
- **Frontend**: Next.js 15+ (App Router), React 19, TypeScript (strict), Tailwind CSS + shadcn/ui (or your component lib of choice).
- **Auth**: Clerk (full user management, organizations, webhooks).
- **Backend/Database**: Convex (reactive queries/mutations, file storage, scheduling, real-time everything).
- **Deployment**: Vercel (frontend) + Convex cloud (backend). Edge-ready where possible.
- **Styling/UI**: Tailwind, shadcn/ui, lucide-react icons. Dark mode by default.
- **State**: Convex React hooks primarily. Minimal local state (Zustand only if needed for complex client-only logic).
- **Forms**: React Hook Form + Zod.

## Core Architecture Principles (Never Violate)

1. **Convex is the Source of Truth** — 
- All persistent data, business logic, and real-time features live in Convex. No direct DB access from frontend. 
- When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.
- Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.
2. **Clerk for Identity** — Use Clerk for sign-in, sessions, organizations. Sync user data to Convex via webhooks + `ctx.auth` in functions.
3. **Type Safety Everywhere** — Convex schema → generated types → full end-to-end typing. No `any`.
4. **Real-time First** — Default to `useQuery` for data that should update live. Use optimistic updates in mutations.
5. **Server Components + Server Actions** — Use Next.js Server Components aggressively. Server Actions only when needed (e.g., file uploads bridging to Convex).
6. **Performance & DX** — Streaming, loading.js, error.js, parallel routes where it adds value. Keep bundle small.
7. **Security** — Always check `ctx.auth` in Convex mutations/queries. Role/permission checks in Convex (not just frontend). Use Clerk's protected routes + middleware.

## Key Setup & Integration Rules

### Clerk + Convex Auth (Critical)
- Use official `ConvexProviderWithClerk`.
- Create JWT Template in Clerk for Convex.
- `convex/auth.config.ts` with Clerk issuer.
- Sync users: Clerk webhook → Convex mutation to create/update user document.
- In Convex functions: `const identity = ctx.auth.getUserIdentity();` then `userId = identity?.subject`.

### Environment Variables (Required)
- All the keys, public and private, can be found in .env file.

## Development Workflow (Vibe Coding Optimized)
### Commands to Know:
- npm run dev → Next.js + Convex dev (watch mode).
- npx convex dev → Local Convex backend.
- npx convex deploy → Deploy backend.
- npm run build → Always passes before considering feature done.

### When Building Features:
1. Define/update schema in Convex first.
2. Write queries + mutations (with proper auth checks).
3. Build UI + hooks in Next.js.
4. Add real-time where it feels magical.
5. Test auth edge cases (signed out, org roles, etc.).
6. Add loading/error states.

### Code Style & Rules:
- Functional components, minimal classes.
- Server Components by default.
- Descriptive component names (DashboardSidebar, UserProfileCard).
- Convex functions: clear naming (listDocuments, createDocument, updateDocument).
- Comments only for "why", not "what".
- Error handling: User-friendly messages. Log internals.
- Accessibility: aria labels, keyboard nav basics.
Mobile-first responsive.

### High-ROI Patterns to Favor:
- Convex internal mutations for complex logic.
- File storage via Convex for uploads.
- Scheduling/crons for background jobs.
- Clerk Organizations for multi-tenant if applicable.
- Optimistic updates + toast notifications (Sonner or similar).
- Protected routes with Clerk middleware.

### Things to Avoid:
- Over-fetching (Convex reactivity handles most).
- Stale data patterns.
- Putting business logic in frontend.
- Direct Convex HTTP calls without proper auth.
- Ignoring TypeScript errors.

### Lessons Learned / Anti-Patterns (Keep Updated):
- [Add lessons here as you build, e.g., "Always deploy Convex before testing auth sync"]
- Common pitfall: Forgetting to run npx convex deploy after schema changes.

### Success Criteria for Any Task:
- Works in production (auth, real-time, mobile).
- Fully typed.
- Great UX (loading, empty states, errors).
- Secure (no auth bypasses).
- Maintainable and delightful to extend.