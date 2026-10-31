"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CompleteContentButton({
  kind,
  id,
  isCompleted = false,
  label = "Completed",
  onCompleted,
  className,
}: {
  kind: "event" | "notice" | "update" | "collaboration";
  id: string;
  isCompleted?: boolean;
  label?: string;
  onCompleted?: () => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
        <CheckCircle2 className="size-3.5" /> Completed
      </span>
    );
  }

  async function complete() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/complete-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not mark this content completed.");
      toast.success("Completed. Published content remains available and editable.");
      onCompleted?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not complete content.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() => void complete()}
      className={className ?? "inline-flex items-center gap-1.5 font-medium text-brand-ink hover:border-emerald-500 hover:text-emerald-700"}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
      {busy ? "Saving…" : label}
    </Button>
  );
}
