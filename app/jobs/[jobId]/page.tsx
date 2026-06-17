"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, ArrowLeft } from "lucide-react";

const typeLabels: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
};

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)} / year`;
  if (min) return `From ${fmt(min)} / year`;
  return `Up to ${fmt(max!)} / year`;
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const job = useQuery(api.jobs.getJob, { jobId: jobId as Id<"jobs"> });
  const hasApplied = useQuery(api.applications.hasApplied, { jobId: jobId as Id<"jobs"> });

  if (job === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (job === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Job not found</p>
          <Link href="/jobs">
            <Button variant="outline">Browse Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/jobs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Jobs
            </Button>
          </Link>
          <Link href="/" className="font-display text-xl font-semibold text-primary">
            JobHunter
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="font-display text-3xl font-semibold">{job.title}</h1>
              <p className="text-primary font-semibold text-lg mt-1">{job.orgName}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">{typeLabels[job.type]}</Badge>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
              {salary && (
                <span className="font-mono text-xs text-muted-foreground">{salary}</span>
              )}
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {job.applicationCount} applicants
              </span>
            </div>

            <Card>
              <CardContent className="pt-6">
                <h2 className="font-display text-lg font-semibold mb-4">Job Description</h2>
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
                  {job.description}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar apply card */}
          <div className="space-y-4">
            <Card className="sticky top-24">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 rounded-md border border-dashed border-border bg-ink/5 flex items-center justify-center">
                    <span
                      aria-hidden
                      className="font-display text-2xl font-semibold text-ink/60 -rotate-2 select-none"
                    >
                      {job.orgName.trim().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{job.orgName}</p>
                    <p className="text-sm text-muted-foreground">{job.type}</p>
                  </div>
                </div>

                {hasApplied ? (
                  <div className="text-center py-3 rounded-md border border-pine/40 bg-pine/10 text-pine text-sm font-medium font-mono uppercase tracking-wide">
                    ✓ Application submitted
                  </div>
                ) : (
                  <Link href={`/apply/${job._id}`} className="block">
                    <Button className="w-full" size="lg">
                      Apply Now
                    </Button>
                  </Link>
                )}

                <div className="text-xs text-muted-foreground text-center">
                  {job.applicationCount} people have applied
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
