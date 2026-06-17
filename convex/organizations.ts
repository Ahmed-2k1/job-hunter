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
        billingPlan: "free",
        activeJobCount: 0,
      });
    }
  },
});

export const syncOrgPlan = internalMutation({
  args: {
    clerkOrgId: v.string(),
    billingPlan: v.union(v.literal("free"), v.literal("pro")),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    if (org) {
      await ctx.db.patch(org._id, { billingPlan: args.billingPlan });
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
