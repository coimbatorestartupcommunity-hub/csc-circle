import * as React from "react";
import { cn } from "cn";

/** Centered max-width (~1280px) content container with responsive gutters. */
export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("brand-container", className)} {...props} />;
}
