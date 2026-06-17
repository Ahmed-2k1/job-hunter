import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Stamp } from "@/components/ui/stamp";
import { cn } from "@/lib/utils";

interface JobCardProps {
  title: string;
  orgName?: string;
  location: string;
  typeLabel?: string;
  salary?: string | null;
  applicationCount?: number;
  status?: { variant: NonNullable<React.ComponentProps<typeof Stamp>["variant"]>; label: string };
  href?: string;
  initial?: string;
  rightSlot?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

export function JobCard({
  title,
  orgName,
  location,
  typeLabel,
  salary,
  applicationCount,
  status,
  href,
  initial,
  rightSlot,
  meta,
  className,
}: JobCardProps) {
  const letter = (initial ?? orgName ?? title ?? "?").trim().charAt(0).toUpperCase();

  const content = (
    <div
      className={cn(
        "flex border bg-card rounded-md overflow-hidden transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="relative flex w-16 sm:w-20 shrink-0 items-center justify-center border-r border-dashed border-border bg-ink/5">
        <span
          aria-hidden
          className="font-display text-xl sm:text-2xl font-semibold text-ink/60 -rotate-2 select-none"
        >
          {letter}
        </span>
      </div>

      <div className="flex-1 min-w-0 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold leading-snug truncate">
              {title}
            </h3>
            {orgName && (
              <p className="text-primary font-medium text-sm mt-0.5">{orgName}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {typeLabel && <Badge variant="secondary">{typeLabel}</Badge>}
            {status && <Stamp variant={status.variant}>{status.label}</Stamp>}
            {rightSlot}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </span>
          {salary && <span className="font-mono text-xs">{salary}</span>}
          {applicationCount !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {applicationCount} applicant{applicationCount === 1 ? "" : "s"}
            </span>
          )}
          {meta}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
