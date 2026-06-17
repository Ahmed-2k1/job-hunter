import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("seeker"), v.literal("employer")),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_clerk_id", ["clerkId"]),

  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
    billingPlan: v.union(v.literal("free"), v.literal("pro")),
    activeJobCount: v.number(),
  }).index("by_clerk_org_id", ["clerkOrgId"]),

  jobs: defineTable({
    orgId: v.id("organizations"),
    clerkOrgId: v.string(),
    title: v.string(),
    description: v.string(),
    location: v.string(),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    type: v.union(
      v.literal("full-time"),
      v.literal("part-time"),
      v.literal("contract"),
      v.literal("internship")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("closed")
    ),
    featured: v.boolean(),
    postedBy: v.string(),
    applicationCount: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["status"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_featured_and_status", ["featured", "status"]),

  applications: defineTable({
    jobId: v.id("jobs"),
    applicantId: v.string(),
    name: v.string(),
    email: v.string(),
    resumeUrl: v.optional(v.string()),
    coverLetter: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewing"),
      v.literal("rejected"),
      v.literal("accepted")
    ),
    submittedAt: v.number(),
  })
    .index("by_job", ["jobId"])
    .index("by_applicant", ["applicantId"])
    .index("by_job_and_applicant", ["jobId", "applicantId"]),
});
