import { PricingTable } from "@clerk/nextjs";
import { getCurrentPlan } from "../actions";
import { Stamp } from "@/components/ui/stamp";

// Maps a plan slug to the matching Stamp badge variant + label.
const planBadge: Record<string, { variant: "free" | "pro"; label: string }> = {
  starter: { variant: "free", label: "Starter" },
  pro: { variant: "pro", label: "Pro" },
  enterprise: { variant: "pro", label: "Enterprise" },
};

export default async function EmployerBillingPage() {
  const plan = await getCurrentPlan();
  const badge = planBadge[plan];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Plans &amp; Billing</h1>
          <p className="text-muted-foreground mt-1">
            Choose the plan that fits how your team hires.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Current plan
          </span>
          <Stamp variant={badge.variant}>{badge.label}</Stamp>
        </div>
      </div>

      <PricingTable
        for="organization"
        appearance={{
          elements: {
            rootBox: "w-full",
            pricingTableCard: "border rounded-lg shadow-none",
          },
        }}
      />
    </div>
  );
}
