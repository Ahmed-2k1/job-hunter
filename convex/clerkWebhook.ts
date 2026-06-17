"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

export const verifyAndSync = internalAction({
  args: {
    payload: v.string(),
    svixId: v.string(),
    svixTimestamp: v.string(),
    svixSignature: v.string(),
  },
  handler: async (ctx, args) => {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SIGNING_SECRET!);
    let evt: { type: string; data: Record<string, unknown> };
    try {
      evt = wh.verify(args.payload, {
        "svix-id": args.svixId,
        "svix-timestamp": args.svixTimestamp,
        "svix-signature": args.svixSignature,
      }) as { type: string; data: Record<string, unknown> };
    } catch {
      return { ok: false };
    }

    const { type, data } = evt;

    if (type === "user.created" || type === "user.updated") {
      const user = data as {
        id: string;
        email_addresses: Array<{ email_address: string }>;
        first_name?: string | null;
        last_name?: string | null;
        image_url?: string;
      };
      const email = user.email_addresses[0]?.email_address ?? "";
      const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || email;
      const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN ?? "";
      const tokenIdentifier = `${issuer}|${user.id}`;

      await ctx.runMutation(internal.users.syncUser, {
        tokenIdentifier,
        clerkId: user.id,
        name,
        email,
        imageUrl: user.image_url,
      });
    }

    if (type === "organization.created" || type === "organization.updated") {
      const org = data as {
        id: string;
        name: string;
        slug?: string | null;
        image_url?: string;
        public_metadata?: { billing_plan?: string };
      };

      await ctx.runMutation(internal.organizations.syncOrg, {
        clerkOrgId: org.id,
        name: org.name,
        slug: org.slug ?? org.id,
        imageUrl: org.image_url,
      });

      if (org.public_metadata?.billing_plan) {
        const plan = org.public_metadata.billing_plan === "pro" ? "pro" : "free";
        await ctx.runMutation(internal.organizations.syncOrgPlan, {
          clerkOrgId: org.id,
          billingPlan: plan,
        });
      }
    }

    return { ok: true };
  },
});
