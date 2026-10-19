"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Admin action control. In this phase it validates the interaction (including a
 * confirmation step for destructive actions) and explains that the privileged
 * operation runs through the trusted backend in Phase 1 — it never fakes a
 * persisted approval or a real credential issuance.
 */
export function ActionButton({
  label,
  message,
  confirm,
  variant = "outline",
  size = "sm",
  disabled,
}: {
  label: string;
  message?: string;
  confirm?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "xs" | "lg";
  disabled?: boolean;
}) {
  function onClick() {
    if (confirm && !window.confirm(confirm)) return;
    toast.info(
      message ??
        `“${label}” is recorded through the trusted backend with authorization + audit in Phase 1.`,
    );
  }
  return (
    <Button type="button" variant={variant} size={size} onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  );
}
