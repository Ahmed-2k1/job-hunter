export const PLAN_SLUGS = ["starter", "pro", "enterprise"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

// null means "no limit" (unlimited).
export const JOB_LIMITS: Record<PlanSlug, number | null> = {
  starter: 3,
  pro: 25,
  enterprise: null,
};

export const FEATURED_LIMITS: Record<PlanSlug, number | null> = {
  starter: 0,
  pro: 5,
  enterprise: null,
};

export const SEAT_LIMITS: Record<PlanSlug, number | null> = {
  starter: 1,
  pro: 4,
  enterprise: null,
};
