"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { JobCard } from "@/components/job-card";
import { Plus, Eye, X, Rocket, Star } from "lucide-react";
import { toast } from "sonner";
import { FEATURED_LIMITS, type PlanSlug } from "@/convex/billing";
import { publishJobAction, featureJobAction, getCurrentPlan } from "../actions";

const statusLabels = { active: "Active", draft: "Draft", closed: "Closed" } as const;
const typeLabels: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
};

export default function EmployerJobsPage() {
  const { organization } = useOrganization();
  const [plan, setPlan] = useState<PlanSlug | null>(null);

  useEffect(() => {
    if (organization) getCurrentPlan().then(setPlan).catch(() => setPlan("starter"));
  }, [organization]);

  const data = useQuery(
    api.jobs.listOrgJobs,
    organization ? { clerkOrgId: organization.id } : "skip"
  );
  const closeJob = useMutation(api.jobs.closeJob);

  // Starter (limit 0) can't feature jobs; Pro/Enterprise can.
  const canFeature = plan !== null && FEATURED_LIMITS[plan] !== 0;

  async function handlePublish(jobId: Id<"jobs">) {
    try {
      await publishJobAction(jobId);
      toast.success("Job published successfully");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to publish job");
    }
  }

  async function handleFeature(jobId: Id<"jobs">, featured: boolean) {
    try {
      await featureJobAction(jobId, featured);
      toast.success(featured ? "Job featured" : "Job unfeatured");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update featured status");
    }
  }

  async function handleClose(jobId: Id<"jobs">) {
    if (!organization) return;
    try {
      await closeJob({ jobId, clerkOrgId: organization.id });
      toast.success("Job closed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to close job");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Job Postings</h1>
        <Link href="/employer/jobs/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
        </Link>
      </div>

      {!data ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : data.jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No job postings yet</p>
          <Link href="/employer/jobs/new">
            <Button>Post Your First Job</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.jobs.map((job) => (
            <JobCard
              key={job._id}
              title={job.title}
              location={job.location}
              typeLabel={typeLabels[job.type]}
              applicationCount={job.applicationCount}
              status={{ variant: job.status, label: statusLabels[job.status] }}
              rightSlot={
                <div className="flex items-center gap-1">
                  <Link href={`/employer/jobs/${job._id}`}>
                    <Button variant="ghost" size="icon" title="View applicants">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  {job.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Publish"
                      onClick={() => handlePublish(job._id)}
                    >
                      <Rocket className="h-4 w-4 text-pine" />
                    </Button>
                  )}
                  {job.status === "active" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!canFeature}
                      title={
                        canFeature
                          ? job.featured
                            ? "Remove from featured"
                            : "Feature this job"
                          : "Featured listings are a Pro feature — upgrade to enable"
                      }
                      onClick={() => handleFeature(job._id, !job.featured)}
                    >
                      <Star
                        className={
                          job.featured
                            ? "h-4 w-4 fill-gold text-gold"
                            : "h-4 w-4 text-muted-foreground"
                        }
                      />
                    </Button>
                  )}
                  {job.status === "active" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Close"
                      onClick={() => handleClose(job._id)}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
