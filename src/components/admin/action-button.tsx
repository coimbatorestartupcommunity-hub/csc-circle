"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  operation,
}: {
  label: string;
  message?: string;
  confirm?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "xs" | "lg";
  disabled?: boolean;
  operation?: { kind: string; target: string; decision: string };
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  async function onClick() {
    if (confirm && !window.confirm(confirm)) return;
    if (!operation) { toast.info(message ?? "This operation is unavailable. No changes were saved."); return; }
    const reason = window.prompt("Review reason or independent payment settlement reference:", "");
    if (reason === null) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...operation, reason }) });
      const data = await res.json();
      if (!res.ok || !data.ok) { toast.error(data.error ?? "Action was not saved."); return; }
      toast.success("Change saved."); router.refresh();
    } catch { toast.error("Could not connect. Verify the record before retrying."); }
    finally { setSaving(false); }
  }
  return (
    <Button type="button" variant={variant} size={size} onClick={onClick} disabled={disabled || saving}>
      {saving ? "Saving…" : label}
    </Button>
  );
}
