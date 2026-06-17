"use client";

import { useQuery, useMutation } from "convex/react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  coverLetter: z.string().optional(),
  resumeUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function ApplyPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const job = useQuery(api.jobs.getJob, { jobId: jobId as Id<"jobs"> });
  const hasApplied = useQuery(api.applications.hasApplied, { jobId: jobId as Id<"jobs"> });
  const apply = useMutation(api.applications.applyToJob);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "",
      email: user?.emailAddresses[0]?.emailAddress ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await apply({
        jobId: jobId as Id<"jobs">,
        name: values.name,
        email: values.email,
        coverLetter: values.coverLetter || undefined,
        resumeUrl: values.resumeUrl || undefined,
      });
      toast.success("Application submitted!");
      router.push(`/jobs/${jobId}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit application");
    }
  }

  if (!isLoaded || job === undefined) {
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
            <h2 className="font-display text-xl font-semibold">Sign in to Apply</h2>
            <p className="text-muted-foreground">
              Create an account or sign in to submit your application for{" "}
              <strong>{job?.title}</strong>
            </p>
            <SignInButton mode="modal">
              <Button size="lg">Sign In to Continue</Button>
            </SignInButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasApplied) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 text-center space-y-4">
            <div className="text-5xl text-pine">✓</div>
            <h2 className="font-display text-xl font-semibold">Already Applied</h2>
            <p className="text-muted-foreground">
              You have already submitted an application for this position.
            </p>
            <Link href="/dashboard">
              <Button>View My Applications</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center">
          <Link href={`/jobs/${jobId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Job
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold">Apply for {job?.title}</h1>
          {job && <p className="text-primary font-medium mt-1">{job.orgName}</p>}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Your Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resumeUrl">Resume URL (optional)</Label>
                <Input
                  id="resumeUrl"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  {...register("resumeUrl")}
                />
                {errors.resumeUrl && (
                  <p className="text-sm text-destructive">{errors.resumeUrl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverLetter">Cover Letter (optional)</Label>
                <Textarea
                  id="coverLetter"
                  placeholder="Tell the employer why you're a great fit..."
                  rows={6}
                  {...register("coverLetter")}
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}
