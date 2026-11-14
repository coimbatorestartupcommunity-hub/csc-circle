"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export interface DeleteContentButtonProps {
  kind:
    | "event"
    | "notice"
    | "update"
    | "collaboration"
    | "opportunity"
    | "resource"
    | "content"
    | "announcement"
    | "home_announcement";
  id: string;
  slug?: string;
  title?: string;
  redirectTo?: string;
  isSuperAdmin?: boolean;
  className?: string;
  label?: string;
}

export function DeleteContentButton({
  kind,
  id,
  slug,
  title,
  redirectTo,
  isSuperAdmin = true,
  className,
  label = "Delete",
}: DeleteContentButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (!isSuperAdmin) {
    return null;
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/delete-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, slug }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Could not delete ${kind}.`);
      }
      toast.success(
        `${title ? `"${title}"` : kind.replace("_", " ")} was permanently removed from the website.`,
      );
      setConfirming(false);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deletion failed.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50/95 p-1 text-xs shadow-sm",
          className,
        )}
      >
        <span className="flex items-center gap-1 px-1.5 font-medium text-rose-900">
          <AlertTriangle className="size-3 text-rose-600" /> Confirm?
        </span>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => void handleDelete()}
          className="h-7 px-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : "Delete Now"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => setConfirming(false)}
          className="h-7 px-2 text-xs text-slate-600 hover:bg-white"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() => setConfirming(true)}
      title="Super Admin: Permanently delete this item from the website"
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 shadow-2xs transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-800 focus-visible:ring-2 focus-visible:ring-rose-500/20",
        className,
      )}
    >
      <Trash2 className="size-3.5 text-rose-600" />
      {label}
    </Button>
  );
}
