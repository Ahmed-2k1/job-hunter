"use client";

import { useOrganization } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { publishJobAction } from "../../actions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(50, "Description must be at least 50 characters"),
  location: z.string().min(2, "Location is required"),
  type: z.enum(["full-time", "part-time", "contract", "internship"]),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewJobPage() {
  const { organization } = useOrganization();
  const router = useRouter();
  const createJob = useMutation(api.jobs.createJob);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "full-time" },
  });

  async function onSubmit(values: FormValues, publish: boolean) {
    if (!organization) return;
    try {
      const jobId = await createJob({
        clerkOrgId: organization.id,
        title: values.title,
        description: values.description,
        location: values.location,
        type: values.type,
        salaryMin: values.salaryMin ? Number(values.salaryMin) : undefined,
        salaryMax: values.salaryMax ? Number(values.salaryMax) : undefined,
      });

      if (publish) {
        await publishJobAction(jobId);
        toast.success("Job published successfully!");
      } else {
        toast.success("Job saved as draft");
      }

      router.push("/employer/jobs");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Post a Job</h1>
        <p className="text-muted-foreground mt-1">Fill in the details for your job listing</p>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input id="title" placeholder="e.g. Senior React Developer" {...register("title")} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" placeholder="e.g. New York, NY or Remote" {...register("location")} />
                {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Job Type *</Label>
                <Select id="type" {...register("type")}>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Min Salary (optional)</Label>
                <Input id="salaryMin" type="number" placeholder="e.g. 80000" className="font-mono" {...register("salaryMin")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">Max Salary (optional)</Label>
                <Input id="salaryMax" type="number" placeholder="e.g. 120000" className="font-mono" {...register("salaryMax")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the role, responsibilities, requirements, and what makes it great..."
                rows={8}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6 justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={handleSubmit((v) => onSubmit(v, false))}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit((v) => onSubmit(v, true))}
          >
            Publish Now
          </Button>
        </div>
      </form>
    </div>
  );
}
