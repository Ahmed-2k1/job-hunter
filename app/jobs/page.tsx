"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { JobCard } from "@/components/job-card";
import { useState, Suspense } from "react";

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

const typeLabels: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
};

function JobBoard() {
  const searchParams = useSearchParams();
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const { results, status, loadMore } = usePaginatedQuery(
    api.jobs.listPublicJobs,
    {
      type: (type as "full-time" | "part-time" | "contract" | "internship") || undefined,
      location: location || undefined,
    },
    { initialNumItems: 20 }
  );

  const filtered = search
    ? results.filter(
        (j) =>
          j.title.toLowerCase().includes(search.toLowerCase()) ||
          j.orgName.toLowerCase().includes(search.toLowerCase())
      )
    : results;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold text-primary">
            JobHunter
          </Link>
          <div className="flex gap-3">
            <Link href="/employer">
              <Button variant="outline" size="sm">For Employers</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">My Applications</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold mb-6">Browse Jobs</h1>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search job title or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Input
              placeholder="Location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="max-w-48"
            />
            <Select value={type} onChange={(e) => setType(e.target.value)} className="max-w-44">
              <option value="">All Types</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3">
          {status === "LoadingFirstPage" && (
            <div className="text-center text-muted-foreground py-12">Loading jobs...</div>
          )}
          {filtered.length === 0 && status !== "LoadingFirstPage" && (
            <div className="text-center text-muted-foreground py-12">
              No jobs found. Try adjusting your filters.
            </div>
          )}
          {filtered.map((job) => (
            <JobCard
              key={job._id}
              href={`/jobs/${job._id}`}
              title={job.title}
              orgName={job.orgName}
              location={job.location}
              typeLabel={typeLabels[job.type]}
              salary={formatSalary(job.salaryMin, job.salaryMax)}
              applicationCount={job.applicationCount}
            />
          ))}
        </div>

        {status === "CanLoadMore" && (
          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => loadMore(20)}>
              Load More Jobs
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense>
      <JobBoard />
    </Suspense>
  );
}
