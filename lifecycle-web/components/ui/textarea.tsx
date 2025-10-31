import * as React from "react";
import { cn } from "../utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn("flex w-full rounded-xl border border-input bg-background p-3 text-sm", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";
