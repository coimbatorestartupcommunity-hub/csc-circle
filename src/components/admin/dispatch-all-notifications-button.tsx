"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DispatchAllNotificationsButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDispatch() {
    if (loading || disabled) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispatch_all" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to dispatch notifications.");
        return;
      }

      toast.success(data.message || "All pending notifications have been dispatched!");
      router.refresh();
    } catch {
      toast.error("Notification dispatch service temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleDispatch}
      disabled={loading || disabled}
      className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-4 py-2 text-sm font-semibold text-white hover:bg-brand-secondary transition"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Send className="size-4" />
      )}
      <span>{loading ? "Dispatching..." : "Send All Pending Notifications"}</span>
    </Button>
  );
}
