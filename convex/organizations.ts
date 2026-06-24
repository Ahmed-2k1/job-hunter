import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const syncOrg = internalMutation({
  args: {
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
      });
    } else {
      await ctx.db.insert("organizations", {
        clerkOrgId: args.clerkOrgId,
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
        activeJobCount: 0,
        featuredJobCount: 0,
        reconcileRequired: false,
      });
    }
  },
});

export const getOrgByClerkId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();
  },
});

export const getOrgById = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.orgId);
  },
});

// Internal: flag or clear the reconcile state after a plan downgrade.
// Called by the webhook when Clerk reports a subscription change.
export const setReconcileState = internalMutation({
  args: {
    clerkOrgId: v.string(),
    reconcileRequired: v.boolean(),
    reconcileTargetLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();
    if (!org) return;

    await ctx.db.patch(org._id, {
      reconcileRequired: args.reconcileRequired,
      ...(args.reconcileRequired && args.reconcileTargetLimit !== undefined
        ? { reconcileTargetLimit: args.reconcileTargetLimit }
        : {}),
    });
  },
});

// Employer: close selected jobs to bring active count within the new plan limit.
// The reconcile flag is cleared automatically once the org is back under the limit.
export const closeJobsToReconcile = mutation({
  args: {
    clerkOrgId: v.string(),
    jobIds: v.array(v.id("jobs")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const callerOrgId = (identity as Record<string, unknown>).org_id as string | undefined;
    if (callerOrgId !== args.clerkOrgId) throw new ConvexError("Access denied");

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();
    if (!org) throw new ConvexError("Organization not found");
    if (!org.reconcileRequired) return;

    let activeCount = org.activeJobCount;
    let featuredCount = org.featuredJobCount;

    for (const jobId of args.jobIds) {
      const job = await ctx.db.get(jobId);
      if (!job || job.clerkOrgId !== args.clerkOrgId || job.status !== "active") continue;
      await ctx.db.patch(jobId, { status: "closed" });
      if (activeCount > 0) activeCount -= 1;
      if (job.featured && featuredCount > 0) featuredCount -= 1;
    }

    const targetLimit = org.reconcileTargetLimit ?? 0;
    await ctx.db.patch(org._id, {
      activeJobCount: activeCount,
      featuredJobCount: featuredCount,
      ...(activeCount <= targetLimit ? { reconcileRequired: false } : {}),
    });
  },
});

// One-time backfill: fills in featuredJobCount/reconcileRequired for orgs
// created before these fields existed. Safe to run multiple times.
export const backfillBillingFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();
    for (const org of orgs) {
      if (org.featuredJobCount === undefined || org.reconcileRequired === undefined) {
        await ctx.db.patch(org._id, {
          featuredJobCount: org.featuredJobCount ?? 0,
          reconcileRequired: org.reconcileRequired ?? false,
        });
      }
    }
  },
});
