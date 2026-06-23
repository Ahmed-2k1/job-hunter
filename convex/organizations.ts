import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

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
