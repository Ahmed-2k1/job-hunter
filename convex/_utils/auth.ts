import { ConvexError } from "convex/values";
import { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  if (!user) {
    throw new ConvexError("User not found — please wait a moment and try again");
  }

  return user;
}

export async function getClerkOrgId(ctx: QueryCtx | MutationCtx): Promise<string | undefined> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return undefined;
  // Clerk embeds the active org in the JWT when a user has an org context
  return (identity as Record<string, unknown>).org_id as string | undefined;
}
