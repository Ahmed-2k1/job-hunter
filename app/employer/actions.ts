"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SEAT_LIMITS, type PlanSlug } from "@/convex/billing";

// ─── Shared helpers ──────────────────────────────────────────────────────────

async function getAuthContext() {
  const session = await auth();
  const orgId = session.orgId;
  const userId = session.userId;
  if (!orgId || !userId) throw new Error("No active organization session");
  // getToken fetches a short-lived JWT configured for Convex (set up in Clerk Dashboard).
  const token = await session.getToken({ template: "convex" });
  return { token, orgId, userId };
}

// ─── Plan resolution ─────────────────────────────────────────────────────────

/**
 * Returns the org's current billing plan slug by asking Clerk.
 * Checks from highest to lowest so the first true match wins.
 */
export async function getCurrentPlan(): Promise<PlanSlug> {
  const session = await auth();
  if (!session.orgId) throw new Error("No active organization");

  // has() returns true if the org's active subscription matches that plan slug.
  if (session.has({ plan: "enterprise" })) return "enterprise";
  if (session.has({ plan: "pro" })) return "pro";
  return "starter";
}

// ─── Team data ───────────────────────────────────────────────────────────────

export type TeamMember = {
  membershipUserId: string;
  name: string;
  email: string;
  role: string;
  imageUrl: string;
};

export type TeamData = {
  orgId: string;
  plan: PlanSlug;
  members: TeamMember[];
  usedSeats: number;
  seatLimit: number | null; // null = unlimited
  isAdmin: boolean;
  currentUserId: string;
};

/**
 * Returns everything the Team page needs: the member list, the seat limit for
 * the current plan, and whether the signed-in user is an org admin.
 */
export async function getTeamData(): Promise<TeamData> {
  const session = await auth();
  const orgId = session.orgId;
  if (!orgId) throw new Error("No active organization");

  const plan = await getCurrentPlan();
  const client = await clerkClient();
  const currentUserId = session.userId ?? "";

  const { data, totalCount } = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  });

  const members: TeamMember[] = data.map((m) => {
    const u = m.publicUserData;
    const fullName = [u?.firstName, u?.lastName].filter(Boolean).join(" ");
    return {
      membershipUserId: u?.userId ?? "",
      name: fullName || u?.identifier || "Unknown",
      email: u?.identifier ?? "",
      role: m.role,
      imageUrl: u?.imageUrl ?? "",
    };
  });

  return {
    orgId,
    plan,
    members,
    usedSeats: totalCount,
    seatLimit: SEAT_LIMITS[plan],
    isAdmin: session.orgRole === "org:admin",
    currentUserId,
  };
}

// ─── Job actions ─────────────────────────────────────────────────────────────

/**
 * Publishes a draft job.
 * Resolves the real plan server-side so Convex enforces the correct job limit.
 */
export async function publishJobAction(jobId: Id<"jobs">): Promise<void> {
  const { token, orgId } = await getAuthContext();
  const plan = await getCurrentPlan();

  await fetchMutation(
    api.jobs.publishJob,
    { jobId, clerkOrgId: orgId, plan },
    { token: token ?? undefined }
  );
}

/**
 * Marks or unmarks a job as featured.
 * Resolves the real plan so Convex enforces the correct featured-listing limit.
 */
export async function featureJobAction(
  jobId: Id<"jobs">,
  featured: boolean
): Promise<void> {
  const { token, orgId } = await getAuthContext();
  const plan = await getCurrentPlan();

  await fetchMutation(
    api.jobs.featureJob,
    { jobId, clerkOrgId: orgId, featured, plan },
    { token: token ?? undefined }
  );
}

// ─── Team / seat actions ─────────────────────────────────────────────────────

/**
 * Invites a new member to the org.
 * Checks the seat limit first; returns an error string if the org is at cap.
 */
export async function inviteMemberAction(
  email: string,
  role: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { orgId } = await getAuthContext();
  const plan = await getCurrentPlan();

  const client = await clerkClient();

  // Count current members to enforce seat limit before sending the invite.
  const { totalCount } = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 500,
  });

  const seatLimit = SEAT_LIMITS[plan];
  if (seatLimit !== null && totalCount >= seatLimit) {
    return {
      ok: false,
      error: `Your ${plan} plan allows up to ${seatLimit} seat${seatLimit === 1 ? "" : "s"}. Upgrade to add more team members.`,
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await client.organizations.createOrganizationInvitation({
    organizationId: orgId,
    emailAddress: email,
    role,
    redirectUrl: `${appUrl}/employer`,
  });

  return { ok: true };
}

/**
 * Removes a member from the org (admin-only action).
 * The calling user's role is enforced by Clerk on the server.
 */
export async function removeMemberAction(
  orgId: string,
  userId: string
): Promise<void> {
  const session = await auth();
  // Only allow if the caller is acting within their own org.
  if (session.orgId !== orgId) throw new Error("Access denied");

  const client = await clerkClient();
  await client.organizations.deleteOrganizationMembership({
    organizationId: orgId,
    userId,
  });
}

// ─── Downgrade reconciliation ─────────────────────────────────────────────────
/**
 * Closes the employer-selected jobs to bring the org back under the new plan limit.
 * The reconcile flag is cleared automatically once the count drops to the target.
 */
export async function confirmDowngradeReconcileAction(
  jobIds: Id<"jobs">[]
): Promise<void> {
  const { token, orgId } = await getAuthContext();

  await fetchMutation(
    api.organizations.closeJobsToReconcile,
    { clerkOrgId: orgId, jobIds },
    { token: token ?? undefined }
  );
}
