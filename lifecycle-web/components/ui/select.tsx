import * as React from "react";
import { cn } from "../utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("h-10 w-full rounded-xl border border-input bg-background px-3 text-sm", className)}
      {...props}
    />
  );
}
