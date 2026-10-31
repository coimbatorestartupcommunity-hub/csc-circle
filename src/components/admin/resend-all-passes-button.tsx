"use client";

import * as React from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ResendAllPassesButtonProps {
  eventId: string;
  confirmedCount: number;
}

export function ResendAllPassesButton({
  eventId,
  confirmedCount,
}: ResendAllPassesButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [sentMessage, setSentMessage] = React.useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setSentMessage(null);
    try {
      const response = await fetch(
        `/api/admin/events/${encodeURIComponent(eventId)}/resend-all-passes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error(
          data.error || "Could not send event passes. Please try again.",
        );
        return;
      }

      toast.success(
        data.message || `Queued passes for ${data.queuedCount} attendees.`,
      );
      setSentMessage(
        data.message ||
          `Successfully queued event passes with PDF attachments for ${data.queuedCount} attendees. Delivery is in progress.`,
      );
    } catch {
      toast.error("Failed to connect. Please check your network and retry.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-ink px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-brand-ink/90 cursor-pointer"
          />
        }
      >
        <Mail className="size-4" />
        Email Passes with PDF ({confirmedCount})
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-1.25rem)] max-w-lg overflow-hidden rounded-[2rem] border border-white/80 bg-white/92 p-0 shadow-[0_25px_60px_-15px_rgba(20,25,45,0.25)] ring-1 ring-black/5 backdrop-blur-2xl">
        <div className="p-6 sm:p-7">
          <DialogHeader className="text-left">
            <div className="mb-3.5 flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-gradient-to-br from-brand-purple/40 to-brand-lilac/30 text-brand-ink shadow-xs ring-1 ring-white/80 backdrop-blur-md">
              {sentMessage ? (
                <CheckCircle2 className="size-6 text-emerald-600" />
              ) : (
                <Mail className="size-6 text-brand-ink" />
              )}
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-brand-ink">
              {sentMessage ? "Passes Queued for Delivery" : "Send Event Passes to All Registered Participants"}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-xs sm:text-sm leading-relaxed text-brand-secondary">
              {sentMessage
                ? sentMessage
                : `This will generate each attendee's updated event pass PDF (with individual QR code, UID, and attendee details) and email it directly as an attachment to all ${confirmedCount} confirmed participants.`}
            </DialogDescription>
          </DialogHeader>

          {sentMessage ? (
            <div className="mt-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/75 p-4 text-xs sm:text-sm font-medium text-emerald-900 shadow-xs ring-1 ring-emerald-300/40 backdrop-blur-md">
              Delivery is in progress through the community email worker. Each participant will receive their official Event Pass PDF attachment directly in their inbox.
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-white/80 bg-brand-cloud/60 p-4 text-xs text-brand-secondary ring-1 ring-brand-border/40 backdrop-blur-md">
              <p className="font-semibold text-brand-ink">
                What each participant receives:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Confirmation email with meeting / venue instructions</li>
                <li>Individual Entrance Verification QR code image</li>
                <li>Official printable Event Pass PDF attachment (ready to download &amp; open directly)</li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 border-t border-brand-border/60 bg-white/85 px-6 py-4 backdrop-blur-xl">
          {sentMessage ? (
            <Button
              type="button"
              onClick={() => {
                setOpen(false);
                setSentMessage(null);
              }}
              className="w-full sm:w-auto min-h-10 rounded-xl px-6 text-xs sm:text-sm font-semibold"
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={sending}
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto min-h-10 rounded-xl text-xs sm:text-sm font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={sending || confirmedCount === 0}
                onClick={handleSend}
                className="w-full sm:w-auto min-h-10 min-w-36 gap-2 rounded-xl bg-brand-ink px-6 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-brand-ink/90"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : null}
                {sending ? "Queueing Emails…" : "Send Passes via Email"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
