"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Webhook } from "svix";
import { JOB_LIMITS, PLAN_SLUGS, type PlanSlug } from "./billing";

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
        // Clerk Billing: subscription info is present on org objects when billing is enabled.
        // Verify exact shape at https://clerk.com/docs/webhooks/overview
        subscription?: { plan_slug?: string };
      };

      await ctx.runMutation(internal.organizations.syncOrg, {
        clerkOrgId: org.id,
        name: org.name,
        slug: org.slug ?? org.id,
        imageUrl: org.image_url,
      });

      // Downgrade detection: only fires on updates (not on creation).
      // If Clerk tells us the org's plan changed to one with a lower job limit,
      // and the org currently has more active jobs than that limit allows,
      // we flag the org so the employer is forced to close jobs before posting new ones.
      if (type === "organization.updated") {
        const rawSlug = org.subscription?.plan_slug;
        if (rawSlug && (PLAN_SLUGS as readonly string[]).includes(rawSlug)) {
          const plan = rawSlug as PlanSlug;
          const newLimit = JOB_LIMITS[plan];
          if (newLimit !== null) {
            const orgDoc = await ctx.runQuery(api.organizations.getOrgByClerkId, {
              clerkOrgId: org.id,
            });
            if (orgDoc && orgDoc.activeJobCount > newLimit) {
              await ctx.runMutation(internal.organizations.setReconcileState, {
                clerkOrgId: org.id,
                reconcileRequired: true,
                reconcileTargetLimit: newLimit,
              });
              console.log(
                `[billing] Downgrade detected for org ${org.id}: ` +
                  `${orgDoc.activeJobCount} active jobs > new limit ${newLimit} (${plan}). ` +
                  `reconcileRequired set.`
              );
            }
          }
        }
      }
    }

    // Safety-net: log when a new member joins an org.
    // Real seat enforcement (blocking over-limit invites) is in Phase 4 via the Clerk Backend SDK.
    if (type === "organizationMembership.created") {
      const membership = data as {
        organization?: { id?: string; name?: string };
        public_user_data?: { user_id?: string };
        role?: string;
      };
      const clerkOrgId = membership.organization?.id;
      const userId = membership.public_user_data?.user_id;
      console.log(
        `[seats] New member ${userId} joined org ${clerkOrgId} as ${membership.role}. ` +
          `Seat limit enforcement deferred to Phase 4.`
      );
    }

    return { ok: true };
  },
});
