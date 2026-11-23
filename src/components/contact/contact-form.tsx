"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { MessageSquare, Send, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { contactFormSchema, type ContactFormInput } from "@/lib/validations/contact.schema";

export function ContactForm() {
  const [submissionSuccess, setSubmissionSuccess] = React.useState<{
    contactId: string;
    whatsappStatus: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      inquiry: "",
      whatsappConsent: false,
      _hp: "",
    },
  });

  const onSubmit = async (values: ContactFormInput) => {
    try {
      const idempotencyKey = `web-contact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          name: values.name,
          phone: values.phone,
          inquiry: values.inquiry || undefined,
          whatsappConsent: values.whatsappConsent,
          _hp: values._hp || undefined,
        }),
      });

      const json = await res.json();

      if (res.status === 202 && json.success) {
        setSubmissionSuccess({
          contactId: json.contactId,
          whatsappStatus: json.whatsappStatus,
        });
        toast.success("Your inquiry has been received! Check your WhatsApp shortly.");
        reset();
      } else if (res.status === 429) {
        toast.error("Too many requests from your device. Please wait a few moments before trying again.");
      } else if (res.status === 400) {
        toast.error(json.error || "Please verify the information provided and try again.");
      } else {
        toast.error(json.error || "Submission service temporarily unavailable. Please email us directly.");
      }
    } catch {
      toast.error("Could not send your inquiry. Please check your internet connection.");
    }
  };

  if (submissionSuccess) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-200 bg-emerald-50/60 p-8 text-center sm:p-10">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-7" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-brand-ink">Inquiry Received!</h3>
        <p className="mt-2 max-w-md text-sm text-brand-secondary">
          Thank you for reaching out. Your request has been recorded with reference{" "}
          <span className="font-mono font-semibold text-brand-ink">
            {submissionSuccess.contactId.slice(0, 8)}
          </span>
          .
        </p>
        {submissionSuccess.whatsappStatus === "queued" && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            <MessageSquare className="size-3.5" />
            WhatsApp acknowledgement dispatched to your number
          </div>
        )}
        <button
          type="button"
          onClick={() => setSubmissionSuccess(null)}
          className="mt-6 rounded-xl border border-brand-border bg-brand-white px-5 py-2.5 text-xs font-semibold text-brand-ink shadow-xs transition hover:bg-brand-cloud"
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Honeypot field for bot deterrence (hidden from sighted users and screen readers) */}
      <input
        type="text"
        {...register("_hp")}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-name" className="text-xs font-semibold text-brand-ink">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            placeholder="e.g. Vikash Saravanan"
            {...register("name")}
            className="w-full rounded-2xl border border-brand-border bg-brand-white px-4 py-3 text-sm text-brand-ink shadow-xs placeholder:text-brand-muted focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-ink"
          />
          {errors.name && (
            <span className="text-xs text-rose-600">{errors.name.message}</span>
          )}
        </div>

        {/* WhatsApp Mobile Number */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-phone" className="text-xs font-semibold text-brand-ink">
            WhatsApp Mobile Number <span className="text-rose-500">*</span>
          </label>
          <input
            id="contact-phone"
            type="tel"
            placeholder="e.g. 9876543210 or +91 98765 43210"
            {...register("phone")}
            className="w-full rounded-2xl border border-brand-border bg-brand-white px-4 py-3 text-sm text-brand-ink shadow-xs placeholder:text-brand-muted focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-ink"
          />
          {errors.phone && (
            <span className="text-xs text-rose-600">{errors.phone.message}</span>
          )}
        </div>
      </div>

      {/* Inquiry Message */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-inquiry" className="text-xs font-semibold text-brand-ink">
          How can we help you? <span className="text-xs font-normal text-brand-muted">(Optional)</span>
        </label>
        <textarea
          id="contact-inquiry"
          rows={3}
          placeholder="Describe your inquiry, partnership idea, or question for our team..."
          {...register("inquiry")}
          className="w-full resize-y rounded-2xl border border-brand-border bg-brand-white px-4 py-3 text-sm text-brand-ink shadow-xs placeholder:text-brand-muted focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-ink"
        />
        {errors.inquiry && (
          <span className="text-xs text-rose-600">{errors.inquiry.message}</span>
        )}
      </div>

      {/* Explicit WhatsApp Consent Checkbox (Unchecked by default) */}
      <div className="rounded-2xl border border-brand-border/80 bg-brand-cloud/40 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("whatsappConsent")}
            className="mt-1 size-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent cursor-pointer"
          />
          <div className="flex flex-col text-xs leading-relaxed text-brand-secondary">
            <span className="font-semibold text-brand-ink">
              I agree to receive a WhatsApp confirmation and assistance from Coimbatore Startup Community regarding my inquiry.
            </span>
            <span className="mt-0.5 text-[11px] text-brand-muted">
              We respect your privacy. Zero marketing spam, zero promotions without consent.
            </span>
          </div>
        </label>
        {errors.whatsappConsent && (
          <span className="mt-1.5 block text-xs text-rose-600">{errors.whatsappConsent.message}</span>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 text-[11px] text-brand-muted">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          End-to-end TLS secured & automated outbox dispatch
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-ink px-6 py-3.5 text-sm font-semibold text-brand-white shadow-xs transition hover:bg-brand-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="size-4" />
              Send Contact Inquiry
            </>
          )}
        </button>
      </div>
    </form>
  );
}
