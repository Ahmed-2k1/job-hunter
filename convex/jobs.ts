import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getClerkOrgId } from "./_utils/auth";
import { paginationOptsValidator } from "convex/server";

const FREE_PLAN_JOB_LIMIT = 3;

const jobTypeValidator = v.union(
  v.literal("full-time"),
  v.literal("part-time"),
  v.literal("contract"),
  v.literal("internship")
);

// Public: anyone can browse active job listings
export const listPublicJobs = query({
  args: {
    paginationOpts: paginationOptsValidator,
    type: v.optional(jobTypeValidator),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc");

    const result = await q.paginate(args.paginationOpts);

    let jobs = result.page;
    if (args.type) {
      jobs = jobs.filter((j) => j.type === args.type);
    }
    if (args.location) {
      const loc = args.location.toLowerCase();
      jobs = jobs.filter((j) => j.location.toLowerCase().includes(loc));
    }

    const jobsWithOrg = await Promise.all(
      jobs.map(async (job) => {
        const org = await ctx.db
          .query("organizations")
          .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", job.clerkOrgId))
          .unique();
        return { ...job, orgName: org?.name ?? "Unknown Company", orgImageUrl: org?.imageUrl };
      })
    );

    return { ...result, page: jobsWithOrg };
  },
});

// Public: get a single job by ID
export const getJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status === "draft") return null;

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", job.clerkOrgId))
      .unique();

    return { ...job, orgName: org?.name ?? "Unknown Company", orgImageUrl: org?.imageUrl };
  },
});

// Public: get stats for landing page
export const getPublicStats = query({
  args: {},
  handler: async (ctx) => {
    const activeJobs = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(1000);

    const orgs = await ctx.db.query("organizations").take(1000);

    return {
      totalJobs: activeJobs.length,
      totalCompanies: orgs.length,
    };
  },
});

// Employer: list their org's jobs (all statuses)
export const listOrgJobs = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const callerOrgId = (identity as Record<string, unknown>).org_id as string | undefined;
    if (callerOrgId !== args.clerkOrgId) {
      throw new ConvexError("Access denied: not a member of this organization");
    }

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    if (!org) throw new ConvexError("Organization not found");

    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_org", (q) => q.eq("orgId", org._id))
      .order("desc")
      .take(100);

    return { jobs, org };
  },
});

// Employer: get a single job with applicant count (for management)
export const getOrgJob = query({
  args: { jobId: v.id("jobs"), clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const callerOrgId = (identity as Record<string, unknown>).org_id as string | undefined;
    if (callerOrgId !== args.clerkOrgId) {
      throw new ConvexError("Access denied");
    }

    const job = await ctx.db.get(args.jobId);
    if (!job || job.clerkOrgId !== args.clerkOrgId) throw new ConvexError("Job not found");

    return job;
  },
});

// Employer: create a job as draft (no billing gate yet)
export const createJob = mutation({
  args: {
    clerkOrgId: v.string(),
    title: v.string(),
    description: v.string(),
    location: v.string(),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    type: jobTypeValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const callerOrgId = (identity as Record<string, unknown>).org_id as string | undefined;
    if (callerOrgId !== args.clerkOrgId) {
      throw new ConvexError("Access denied: not a member of this organization");
    }

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .unique();

    if (!org) throw new ConvexError("Organization not found — please try again");

    return ctx.db.insert("jobs", {
      orgId: org._id,
      clerkOrgId: args.clerkOrgId,
      title: args.title,
      description: args.description,
      location: args.location,
      salaryMin: args.salaryMin,
      salaryMax: args.salaryMax,
      type: args.type,
      status: "draft",
      featured: false,
      postedBy: identity.tokenIdentifier,
      applicationCount: 0,
    });
  },
});

// Employer: publish a draft job (billing gate lives here)
export const publishJob = mutation({
  args: { jobId: v.id("jobs"), clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const callerOrgId = (identity as Record<string, unknown>).org_id as string | undefined;
    if (callerOrgId !== args.clerkOrgId) {
      throw new ConvexError("Access denied");
    }

    const job = await ctx.db.get(args.jobId);
    if (!job || job.clerkOrgId !== args.clerkOrgId) throw new ConvexError("Job not found");
    if (job.status === "active") return; // already published
    if (job.status === "closed") throw new ConvexError("Cannot republish a closed job");

    const org = await ctx.db.get(job.orgId);
    if (!org) throw new ConvexError("Organization not found");

    if (org.billingPlan === "free" && org.activeJobCount >= FREE_PLAN_JOB_LIMIT) {
      throw new ConvexError(
        `Free plan limit reached (${FREE_PLAN_JOB_LIMIT} active jobs). Upgrade to Pro to post more.`
      );
    }

    await ctx.db.patch(args.jobId, { status: "active" });
    await ctx.db.patch(org._id, { activeJobCount: org.activeJobCount + 1 });
  },
});

// Employer: update job fields (draft or active)
export const updateJob = mutation({
  args: {
    jobId: v.id("jobs"),
    clerkOrgId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    type: v.optional(jobTypeValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const callerOrgId = (identity as Record<string, unknown>).org_id as string | undefined;
    if (callerOrgId !== args.clerkOrgId) {
      throw new ConvexError("Access denied");
    }

    const job = await ctx.db.get(args.jobId);
    if (!job || job.clerkOrgId !== args.clerkOrgId) throw new ConvexError("Job not found");
    if (job.status === "closed") throw new ConvexError("Cannot edit a closed job");

    const { jobId, clerkOrgId: _org, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(jobId, filteredUpdates);
  },
});

// Employer: close a job listing
export const closeJob = mutation({
  args: { jobId: v.id("jobs"), clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const callerOrgId = (identity as Record<string, unknown>).org_id as string | undefined;
    if (callerOrgId !== args.clerkOrgId) {
      throw new ConvexError("Access denied");
    }

    const job = await ctx.db.get(args.jobId);
    if (!job || job.clerkOrgId !== args.clerkOrgId) throw new ConvexError("Job not found");
    if (job.status === "closed") return;

    await ctx.db.patch(args.jobId, { status: "closed" });

    if (job.status === "active") {
      const org = await ctx.db.get(job.orgId);
      if (org && org.activeJobCount > 0) {
        await ctx.db.patch(org._id, { activeJobCount: org.activeJobCount - 1 });
      }
    }
  },
});
