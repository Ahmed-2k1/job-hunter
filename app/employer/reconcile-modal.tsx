"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { confirmDowngradeReconcileAction } from "./actions";

type ActiveJob = { _id: Id<"jobs">; title: string };

export function ReconcileModal({
  activeJobs,
  targetLimit,
}: {
  activeJobs: ActiveJob[];
  targetLimit: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // How many jobs the employer must close to get back within the new limit.
  const mustClose = Math.max(0, activeJobs.length - targetLimit);
  const enough = selected.size >= mustClose;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirm() {
    if (!enough) return;
    setSubmitting(true);
    try {
      await confirmDowngradeReconcileAction([...selected] as Id<"jobs">[]);
      toast.success("Jobs closed — your plan is back in good standing.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not close the selected jobs.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-gold" />
          <div>
            <h2 className="font-display text-xl font-semibold">Action needed: too many active jobs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your new plan allows {targetLimit} active job
              {targetLimit === 1 ? "" : "s"}, but you have {activeJobs.length}. Choose at least{" "}
              <span className="font-medium text-foreground">{mustClose}</span> to close. You
              can&apos;t post new jobs until this is resolved.
            </p>
          </div>
        </div>

        <div className="mt-5 max-h-64 space-y-2 overflow-y-auto">
          {activeJobs.map((job) => (
            <label
              key={job._id}
              className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selected.has(job._id)}
                onChange={() => toggle(job._id)}
                className="h-4 w-4 accent-destructive"
              />
              <span className="truncate text-sm font-medium">{job.title}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {selected.size} of {mustClose} selected
          </span>
          <Button onClick={handleConfirm} disabled={!enough || submitting}>
            {submitting ? "Closing..." : `Close ${selected.size} job${selected.size === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
