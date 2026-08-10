import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border border-border bg-transparent px-1.5 py-0 text-[10px] font-medium leading-5 text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1",
  {
    variants: {
      variant: {
        default: "border-stroke text-foreground",
        secondary: "border-border text-muted-foreground",
        destructive: "border-stroke text-foreground",
        outline: "border-border text-muted-foreground",
        success: "border-border text-muted-foreground",
        warning: "border-stroke text-foreground",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
