import { OrganizationProfile } from "@clerk/nextjs";

export default function EmployerSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Organization Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your company profile, members, and billing
        </p>
      </div>
      <OrganizationProfile
        routing="hash"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none border rounded-lg w-full",
          },
        }}
      />
    </div>
  );
}
