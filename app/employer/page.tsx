"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stamp } from "@/components/ui/stamp";
import { JobCard } from "@/components/job-card";
import { Briefcase, Plus, AlertCircle } from "lucide-react";
import { JOB_LIMITS, type PlanSlug } from "@/convex/billing";
import { getCurrentPlan } from "./actions";
import { ReconcileModal } from "./reconcile-modal";

const statusLabels = { active: "Active", draft: "Draft", closed: "Closed" } as const;
const planMeta: Record<PlanSlug, { variant: "free" | "pro"; label: string }> = {
  starter: { variant: "free", label: "Starter" },
  pro: { variant: "pro", label: "Pro" },
  enterprise: { variant: "pro", label: "Enterprise" },
};

export default function EmployerDashboard() {
  const { organization } = useOrganization();
  const [plan, setPlan] = useState<PlanSlug | null>(null);

  useEffect(() => {
    if (organization) getCurrentPlan().then(setPlan).catch(() => setPlan("starter"));
  }, [organization]);

  const data = useQuery(
    api.jobs.listOrgJobs,
    organization ? { clerkOrgId: organization.id } : "skip"
  );
  const orgDoc = useQuery(
    api.organizations.getOrgByClerkId,
    organization ? { clerkOrgId: organization.id } : "skip"
  );

  const activeJobs = data?.jobs.filter((j) => j.status === "active") ?? [];
  const draftJobs = data?.jobs.filter((j) => j.status === "draft") ?? [];
  const closedJobs = data?.jobs.filter((j) => j.status === "closed") ?? [];
  const totalApplications = data?.jobs.reduce((sum, j) => sum + j.applicationCount, 0) ?? 0;

  // The real plan's active-job limit (null = unlimited).
  const jobLimit = plan ? JOB_LIMITS[plan] : null;
  const activeCount = orgDoc?.activeJobCount ?? 0;
  const atLimit = jobLimit !== null && activeCount >= jobLimit;

  // Show the blocking reconcile modal only after a downgrade left too many active jobs.
  const showReconcile =
    orgDoc?.reconcileRequired === true && activeJobs.length > 0;

  return (
    <div className="space-y-8">
      {showReconcile && (
        <ReconcileModal
          activeJobs={activeJobs.map((j) => ({ _id: j._id, title: j.title }))}
          targetLimit={orgDoc?.reconcileTargetLimit ?? jobLimit ?? 0}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold">{organization?.name ?? "Dashboard"}</h1>
            {plan && <Stamp variant={planMeta[plan].variant}>{planMeta[plan].label}</Stamp>}
          </div>
          <p className="text-muted-foreground mt-1">
            {jobLimit === null
              ? "Unlimited active jobs"
              : `${activeCount} of ${jobLimit} active jobs used`}
          </p>
        </div>
        <Link href="/employer/jobs/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Post a Job
          </Button>
        </Link>
      </div>

      {atLimit && (
        <div className="flex items-start gap-3 p-4 rounded-md border border-gold/40 bg-gold/10 text-gold">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{planMeta[plan!].label} plan limit reached</p>
            <p className="text-sm mt-1">
              You have {activeCount} active job postings (your plan&apos;s limit).{" "}
              <Link href="/employer/billing" className="underline font-medium">
                Upgrade
              </Link>{" "}
              to post more.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-semibold text-pine">{activeJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-semibold text-slate">{draftJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Closed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-semibold text-muted-foreground">{closedJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl font-semibold text-primary">{totalApplications}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold mb-4">Recent Job Postings</h2>
        {!data ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : data.jobs.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No job postings yet</p>
            <Link href="/employer/jobs/new">
              <Button>Post Your First Job</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.jobs.slice(0, 5).map((job) => (
              <JobCard
                key={job._id}
                href={`/employer/jobs/${job._id}`}
                title={job.title}
                location={job.location}
                applicationCount={job.applicationCount}
                status={{ variant: job.status, label: statusLabels[job.status] }}
              />
            ))}
            {data.jobs.length > 5 && (
              <Link href="/employer/jobs" className="block text-center text-sm text-primary hover:underline pt-2">
                View all {data.jobs.length} postings →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
