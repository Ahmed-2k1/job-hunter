"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Briefcase, CreditCard, LayoutDashboard, Settings, Users } from "lucide-react";

const navItems = [
  { href: "/employer", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employer/jobs", label: "Job Postings", icon: Briefcase },
  { href: "/employer/team", label: "Team", icon: Users },
  { href: "/employer/billing", label: "Billing", icon: CreditCard },
  { href: "/employer/settings", label: "Settings", icon: Settings },
];

export default function EmployerNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center gap-6">
        <Link href="/" className="font-display text-xl font-semibold text-primary mr-2">
          JobHunter
        </Link>
        <span className="text-muted-foreground text-sm">Employer Portal</span>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <OrganizationSwitcher
            afterCreateOrganizationUrl="/employer"
            afterSelectOrganizationUrl="/employer"
          />
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
