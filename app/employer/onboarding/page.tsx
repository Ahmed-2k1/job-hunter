import { CreateOrganization } from "@clerk/nextjs";

export default function EmployerOnboarding() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-semibold">Set Up Your Company</h1>
        <p className="text-muted-foreground mt-2">
          Create or join an organization to start posting jobs
        </p>
      </div>
      <CreateOrganization afterCreateOrganizationUrl="/employer" />
    </div>
  );
}
