"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Check, Copy, Download, Mail, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminAgreementActions({
  id,
  signingUrl,
  status,
}: {
  id: string;
  signingUrl: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  async function runAction(action: "resend" | "void") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/agreements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Action failed.");
        return;
      }
      toast.success(
        action === "resend" ? "Signing link emailed again." : "Agreement voided.",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          void navigator.clipboard.writeText(signingUrl);
          setCopied(true);
          toast.success("Signing link copied.");
          window.setTimeout(() => setCopied(false), 2000);
        }}
        className="gap-2"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        Copy Signing Link
      </Button>
      <Button
        render={<a href={`/api/admin/agreements/${id}/pdf`} target="_blank" rel="noreferrer" />}
        className="gap-2"
      >
        <Download className="size-4" />
        Download Editorial PDF
      </Button>
      {status === "sent" || status === "opened" ? (
        <>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void runAction("resend")}
            className="gap-2"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            Resend Email
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => void runAction("void")}
            className="gap-2"
          >
            <Ban className="size-4" />
            Void Agreement
          </Button>
        </>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm("Are you sure you want to permanently delete this agreement? This action cannot be undone.")) return;
          setBusy(true);
          try {
            const res = await fetch(`/api/admin/agreements/${id}`, { method: "DELETE" });
            if (!res.ok) {
              const data = await res.json();
              toast.error(data.error ?? "Delete failed");
              return;
            }
            toast.success("Agreement permanently deleted.");
            router.push("/admin/agreements");
          } finally {
            setBusy(false);
          }
        }}
        className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
    </div>
  );
}
