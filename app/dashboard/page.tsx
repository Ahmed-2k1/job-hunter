"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SignInButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JobCard } from "@/components/job-card";
import { Building2, ExternalLink } from "lucide-react";

const statusLabels = {
  pending: "Under Review",
  reviewing: "Reviewing",
  accepted: "Accepted",
  rejected: "Not Selected",
};

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const applications = useQuery(api.applications.listMyApplications);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 text-center space-y-4">
            <h2 className="text-xl font-bold">Track Your Applications</h2>
            <p className="text-muted-foreground">
              Sign in to see your job applications and their status
            </p>
            <SignInButton mode="modal">
              <Button size="lg">Sign In</Button>
            </SignInButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-xl font-semibold text-primary">
            JobHunter
          </Link>
          <nav className="flex gap-4">
            <Link href="/jobs">
              <Button variant="ghost" size="sm">Browse Jobs</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold">My Applications</h1>
          <p className="text-muted-foreground mt-1">
            Track the status of your job applications
          </p>
        </div>

        {applications === undefined && (
          <div className="text-muted-foreground">Loading...</div>
        )}

        {applications?.length === 0 && (
          <Card className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No applications yet</p>
            <Link href="/jobs">
              <Button>Browse Jobs</Button>
            </Link>
          </Card>
        )}

        <div className="space-y-4">
          {applications?.map((app) => {
            if (!app) return null;
            return (
              <JobCard
                key={app._id}
                title={app.job.title}
                orgName={app.orgName}
                location={app.job.location}
                meta={<span>Applied {new Date(app.submittedAt).toLocaleDateString()}</span>}
                status={{ variant: app.status, label: statusLabels[app.status] }}
                rightSlot={
                  <Link href={`/jobs/${app.jobId}`}>
                    <Button variant="ghost" size="icon" title="View job">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                }
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
