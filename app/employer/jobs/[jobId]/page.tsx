"use client";

import { useOrganization } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Stamp } from "@/components/ui/stamp";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

const jobStatusLabels = { active: "Active", draft: "Draft", closed: "Closed" } as const;
const appStatusLabels = {
  pending: "Pending",
  reviewing: "Reviewing",
  accepted: "Accepted",
  rejected: "Rejected",
} as const;

export default function JobApplicantsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const { organization } = useOrganization();
  const job = useQuery(
    api.jobs.getOrgJob,
    organization ? { jobId: jobId as Id<"jobs">, clerkOrgId: organization.id } : "skip"
  );
  const applications = useQuery(
    api.applications.listApplicationsForJob,
    organization ? { jobId: jobId as Id<"jobs">, clerkOrgId: organization.id } : "skip"
  );
  const updateStatus = useMutation(api.applications.updateApplicationStatus);

  async function handleStatusChange(
    applicationId: Id<"applications">,
    status: "pending" | "reviewing" | "rejected" | "accepted"
  ) {
    if (!organization) return;
    try {
      await updateStatus({ applicationId, clerkOrgId: organization.id, status });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/employer/jobs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold">{job?.title ?? "Loading..."}</h1>
          {job && (
            <p className="text-muted-foreground text-sm flex items-center gap-3">
              {job.location} · {job.type}
              <Stamp variant={job.status}>{jobStatusLabels[job.status]}</Stamp>
            </p>
          )}
        </div>
      </div>

      <h2 className="font-display text-xl font-semibold">
        Applicants {applications ? `(${applications.length})` : ""}
      </h2>

      {!applications ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : applications.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No applications yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app._id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-md border border-dashed border-border bg-ink/5 flex items-center justify-center">
                      <span
                        aria-hidden
                        className="font-display text-base font-semibold text-ink/60 -rotate-2 select-none"
                      >
                        {app.name.trim().charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{app.name}</p>
                      <a
                        href={`mailto:${app.email}`}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                      >
                        <Mail className="h-3 w-3" />
                        {app.email}
                      </a>
                      {app.coverLetter && (
                        <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                          {app.coverLetter}
                        </p>
                      )}
                      {app.resumeUrl && (
                        <a
                          href={app.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline mt-1 inline-block"
                        >
                          View Resume →
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Select
                      value={app.status}
                      onChange={(e) =>
                        handleStatusChange(
                          app._id,
                          e.target.value as "pending" | "reviewing" | "rejected" | "accepted"
                        )
                      }
                      className="w-36"
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </Select>
                    <Stamp variant={app.status}>{appStatusLabels[app.status]}</Stamp>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
