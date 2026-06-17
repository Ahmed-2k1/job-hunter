import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const stampVariants = cva(
  "inline-flex items-center gap-1.5 border font-mono text-[10px] sm:text-xs font-medium uppercase tracking-widest px-2.5 py-1 select-none whitespace-nowrap before:content-['\\25CF'] before:text-[8px]",
  {
    variants: {
      variant: {
        active: "-rotate-1 border-pine/40 bg-pine/10 text-pine before:text-pine",
        accepted: "-rotate-1 border-pine/40 bg-pine/10 text-pine before:text-pine",
        draft: "-rotate-[1.5deg] border-slate/40 bg-slate/10 text-slate before:text-slate",
        pending: "-rotate-[1.5deg] border-slate/40 bg-slate/10 text-slate before:text-slate",
        reviewing: "-rotate-[1.5deg] border-slate/40 bg-slate/10 text-slate before:text-slate",
        free: "-rotate-[1.5deg] border-slate/40 bg-slate/10 text-slate before:text-slate",
        closed: "-rotate-2 border-ink/30 bg-ink/5 text-ink/70 before:text-ink/70",
        rejected: "-rotate-2 border-destructive/40 bg-destructive/10 text-destructive before:text-destructive",
        pro: "-rotate-1 border-gold/40 bg-gold/10 text-gold before:text-gold",
      },
    },
    defaultVariants: {
      variant: "draft",
    },
  }
);

export interface StampProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof stampVariants> {}

function Stamp({ className, variant, ...props }: StampProps) {
  return <span className={cn(stampVariants({ variant }), className)} {...props} />;
}

export { Stamp, stampVariants };
