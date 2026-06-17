import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import EmployerNav from "./employer-nav";

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId } = await auth();

  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/employer/onboarding");

  return (
    <div className="min-h-screen bg-background">
      <EmployerNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
