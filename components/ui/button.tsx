import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 ring-offset-background [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-stroke bg-transparent text-foreground hover:border-foreground/50 hover:bg-muted/40",
        primary:
          "border border-transparent bg-[#1d9851] text-white shadow-sm hover:bg-[#178a48] focus-visible:ring-[#1d9851]/40",
        destructive:
          "border border-stroke bg-transparent text-foreground hover:border-foreground/50 hover:bg-muted/40",
        outline:
          "border border-border bg-transparent text-foreground hover:border-stroke",
        secondary:
          "border border-border bg-transparent text-muted-foreground hover:border-stroke hover:text-foreground",
        ghost:
          "border border-transparent hover:border-border hover:bg-transparent",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 rounded-md px-2.5",
        lg: "h-9 rounded-lg px-4",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
