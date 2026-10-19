"use client";

import * as React from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordChecks } from "@/lib/validations/auth";

export const PasswordField = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    label: string;
    id: string;
    value?: string;
    showStrength?: boolean;
    error?: string;
  }
>(function PasswordField(
  { label, id, value, showStrength, error, className, ...props },
  ref,
) {
  const [visible, setVisible] = React.useState(false);
  const checks = showStrength ? passwordChecks(value ?? "") : null;

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          className={cn("h-11 pr-10", className)}
          aria-invalid={!!error}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-brand-muted hover:text-brand-ink focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {checks ? (
        <ul className="mt-1 grid grid-cols-2 gap-1 text-xs text-brand-muted">
          {[
            ["12+ characters", checks.length],
            ["Lowercase", checks.lower],
            ["Uppercase", checks.upper],
            ["Number", checks.digit],
            ["Symbol", checks.symbol],
          ].map(([txt, ok]) => (
            <li key={txt as string} className={cn("flex items-center gap-1", ok && "text-green-700")}>
              <Check className={cn("size-3", ok ? "opacity-100" : "opacity-30")} />
              {txt}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
