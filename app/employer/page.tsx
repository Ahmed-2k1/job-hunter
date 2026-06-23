"use client";

import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobCard } from "@/components/job-card";
import { Briefcase, Plus, AlertCircle } from "lucide-react";
import { JOB_LIMITS } from "@/convex/billing";

const statusLabels = { active: "Active", draft: "Draft", closed: "Closed" } as const;

export default function EmployerDashboard() {
  const { organization } = useOrganization();
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

  // TODO(Phase 4/5): replace with the org's real plan via getCurrentPlan().
  const starterLimit = JOB_LIMITS.starter ?? Infinity;
  const isFreePlanAtLimit = (orgDoc?.activeJobCount ?? 0) >= starterLimit;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">{organization?.name ?? "Dashboard"}</h1>
          <p className="text-muted-foreground mt-1">Manage your job postings and applications</p>
        </div>
        <Link href="/employer/jobs/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Post a Job
          </Button>
        </Link>
      </div>

      {isFreePlanAtLimit && (
        <div className="flex items-start gap-3 p-4 rounded-md border border-gold/40 bg-gold/10 text-gold">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Free plan limit reached</p>
            <p className="text-sm mt-1">
              You have 3 active job postings (the free plan limit).{" "}
              <Link href="/employer/settings" className="underline font-medium">
                Upgrade to Pro
              </Link>{" "}
              to post unlimited jobs.
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
