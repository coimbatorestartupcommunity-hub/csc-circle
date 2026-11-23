"use client";

import * as React from "react";
import { Loader2, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LiveVerificationTool() {
  const [phone, setPhone] = React.useState("");
  const [text, setText] = React.useState("CSC Circle Live Health Check: WhatsApp Agent & Outbox Dispatcher online 24/7. Connect. Build. Grow.");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/whatsapp/test-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, text }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ ok: false, message: data.error || "Failed to dispatch test notification." });
        toast.error(data.error || "Failed to dispatch test notification");
        return;
      }

      setResult({ ok: true, message: data.message });
      toast.success("Live test notification enqueued! Outbox worker dispatching now.");
    } catch {
      setResult({ ok: false, message: "Network error while triggering test dispatch." });
      toast.error("Network error while triggering test dispatch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Live WhatsApp Verification & Test Dispatcher
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Send an instant test message through the live transactional outbox queue and verify 24/7 delivery.
          </p>
        </div>
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Live Testing Active
        </span>
      </div>

      <form onSubmit={handleSend} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="test-phone" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Target Phone Number
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">
                +91
              </span>
              <Input
                id="test-phone"
                type="tel"
                placeholder="75500 67712"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-11 h-10 text-sm"
              />
            </div>
            <p className="text-[11px] text-zinc-400">
              Enter any 10-digit number to receive a live WhatsApp message.
            </p>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="test-text" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Message Payload
            </Label>
            <Input
              id="test-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="h-10 text-sm"
            />
            <p className="text-[11px] text-zinc-400">
              Standard transactional footer is automatically appended by outbox dispatcher.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="submit"
            disabled={loading || !phone.trim()}
            className="gap-2 h-10 px-5 text-sm font-semibold"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Dispatch Live Test
          </Button>

          {result && (
            <div
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                result.ok
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300"
              }`}
            >
              {result.ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-red-600" />}
              <span>{result.message}</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
