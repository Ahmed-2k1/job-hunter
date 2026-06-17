"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Search, Briefcase, Building2, Users, TrendingUp, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const categories = [
  { label: "Engineering", type: "full-time", icon: "⚙️" },
  { label: "Design", type: "full-time", icon: "🎨" },
  { label: "Marketing", type: "full-time", icon: "📣" },
  { label: "Part-time", type: "part-time", icon: "⏱️" },
  { label: "Contract", type: "contract", icon: "📄" },
  { label: "Internships", type: "internship", icon: "🎓" },
];

export default function LandingPage() {
  const stats = useQuery(api.jobs.getPublicStats);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (location) params.set("location", location);
    router.push(`/jobs?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <span className="font-display text-xl font-semibold text-primary">JobHunter</span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/jobs" className="text-muted-foreground hover:text-foreground transition-colors">
              Browse Jobs
            </Link>
            <Link href="/employer" className="text-muted-foreground hover:text-foreground transition-colors">
              For Employers
            </Link>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              My Applications
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Get Started</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">My Applications</Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <form onSubmit={handleSearch}>
            <h1 className="font-display text-4xl sm:text-6xl font-semibold tracking-tight mb-2 leading-[1.15]">
              Find your next{" "}
              <span className="relative inline-block">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="role"
                  size={Math.max(search.length, 4)}
                  className="bg-transparent outline-none text-ember border-b-2 border-ember/40 focus:border-ember placeholder:text-ember/40 px-1 align-baseline"
                />
              </span>{" "}
              job
              <br className="hidden sm:block" />
              {" "}in{" "}
              <span className="relative inline-block">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Remote"
                  size={Math.max(location.length, 6)}
                  className="bg-transparent outline-none border-b-2 border-foreground/30 focus:border-foreground/70 placeholder:text-foreground/30 px-1 align-baseline"
                />
              </span>
              .
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto mt-6">
              Connect with top companies hiring now — browse thousands of opportunities across every industry and skill level.
            </p>
            <Button type="submit" size="lg">
              <Search className="h-4 w-4 mr-2" />
              Search Jobs
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-10">
            <span className="font-mono text-xs uppercase tracking-widest border rounded-full px-3 py-1 text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="h-3 w-3" />
              {stats?.totalJobs ?? "—"} active jobs
            </span>
            <span className="font-mono text-xs uppercase tracking-widest border rounded-full px-3 py-1 text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3 w-3" />
              {stats?.totalCompanies ?? "—"} companies hiring
            </span>
            <span className="font-mono text-xs uppercase tracking-widest border rounded-full px-3 py-1 text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              free to apply
            </span>
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-display text-2xl font-semibold mb-8 text-center">Browse by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.type + cat.label}
              href={`/jobs?type=${cat.type}`}
              className="group flex items-center gap-3 p-4 rounded-xl border bg-card hover:border-primary hover:shadow-md transition-all"
            >
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <p className="font-medium group-hover:text-primary transition-colors">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{cat.type}</p>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </section>

      {/* Employer CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">For Employers</span>
            </div>
            <h2 className="font-display text-3xl font-semibold mb-3">Hire Top Talent Fast</h2>
            <p className="opacity-80 max-w-md">
              Post your first 3 jobs free. Reach thousands of qualified candidates with real-time applications and team collaboration tools.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <Link href="/employer">
              <Button
                size="lg"
                variant="secondary"
                className="w-full text-primary font-semibold"
              >
                Post a Job — Its Free
              </Button>
            </Link>
            <p className="text-xs text-center opacity-70">
              No credit card required · 3 free job posts
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} JobHunter. Built with Next.js, Clerk & Convex.</p>
      </footer>
    </div>
  );
}
