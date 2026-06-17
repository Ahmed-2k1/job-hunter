import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

// Job seeker: submit an application
export const applyToJob = mutation({
  args: {
    jobId: v.id("jobs"),
    name: v.string(),
    email: v.string(),
    coverLetter: v.optional(v.string()),
    resumeUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated — please sign in to apply");

    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError("Job not found");
    if (job.status !== "active") throw new ConvexError("This job is no longer accepting applications");

    // Prevent duplicate applications
    const existing = await ctx.db
      .query("applications")
      .withIndex("by_job_and_applicant", (q) =>
        q.eq("jobId", args.jobId).eq("applicantId", identity.tokenIdentifier)
      )
      .unique();

    if (existing) throw new ConvexError("You have already applied to this job");

    const appId = await ctx.db.insert("applications", {
      jobId: args.jobId,
      applicantId: identity.tokenIdentifier,
      name: args.name,
      email: args.email,
      coverLetter: args.coverLetter,
      resumeUrl: args.resumeUrl,
      status: "pending",
      submittedAt: Date.now(),
    });

    // Increment denormalized counter
    await ctx.db.patch(args.jobId, {
      applicationCount: job.applicationCount + 1,
    });

    return appId;
  },
});

// Job seeker: list their own applications
export const listMyApplications = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const applications = await ctx.db
      .query("applications")
      .withIndex("by_applicant", (q) => q.eq("applicantId", identity.tokenIdentifier))
      .order("desc")
      .take(50);

    const withJobs = await Promise.all(
      applications.map(async (app) => {
        const job = await ctx.db.get(app.jobId);
        if (!job) return null;
        const org = await ctx.db
          .query("organizations")
          .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", job.clerkOrgId))
          .unique();
        return { ...app, job, orgName: org?.name ?? "Unknown Company" };
      })
    );

    return withJobs.filter(Boolean);
  },
});

// Employer: list applicants for a specific job
export const listApplicationsForJob = query({
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

    return ctx.db
      .query("applications")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .order("desc")
      .take(200);
  },
});

// Employer: update application status
export const updateApplicationStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    clerkOrgId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewing"),
      v.literal("rejected"),
      v.literal("accepted")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const callerOrgId = (identity as Record<string, unknown>).org_id as string | undefined;
    if (callerOrgId !== args.clerkOrgId) {
      throw new ConvexError("Access denied");
    }

    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError("Application not found");

    const job = await ctx.db.get(application.jobId);
    if (!job || job.clerkOrgId !== args.clerkOrgId) {
      throw new ConvexError("Access denied: not your organization's job");
    }

    await ctx.db.patch(args.applicationId, { status: args.status });
  },
});

// Check if current user already applied to a job
export const hasApplied = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const existing = await ctx.db
      .query("applications")
      .withIndex("by_job_and_applicant", (q) =>
        q.eq("jobId", args.jobId).eq("applicantId", identity.tokenIdentifier)
      )
      .unique();

    return !!existing;
  },
});
