"use client";

import * as React from "react";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { calculatePaidRegistrationTotal, paidRegistrationReferrals, paidRegistrationRoles, paidRegistrationSchema } from "@/lib/validations/paid-registration";
import { isAllowedPaymentProof } from "@/lib/validations/paid-registration";
import type { EventRecord } from "@/types";
import { z } from "zod";

type Values = z.input<typeof paidRegistrationSchema>;
const selectClass = "h-10 w-full rounded-lg border border-input bg-brand-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PaidRegistrationForm({ event }: { event: EventRecord }) {
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [paymentProof, setPaymentProof] = React.useState<File | null>(null);
  const { register, handleSubmit, control, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(paidRegistrationSchema),
    defaultValues: { eventId: event.id, attendeeCount: 1, totalAmountPaid: event.pricePerAttendee ?? 0, consentContact: undefined, consentPaymentTerms: undefined },
  });
  const values = useWatch({ control });
  const total = calculatePaidRegistrationTotal(event.pricePerAttendee ?? 0, Number(values.attendeeCount ?? 1));

  async function onSubmit(data: Values) {
    const file = paymentProof;
    if (!file || !isAllowedPaymentProof(file)) {
      toast.error("Upload a JPEG, PNG, WebP, or PDF file under 5 MB.");
      return;
    }
    const body = new FormData();
    for (const [key, value] of Object.entries(data)) if (value !== undefined && value !== "") body.append(key, String(value));
    body.set("totalAmountPaid", String(total));
    body.append("paymentScreenshot", file);
    setSaving(true);
    try {
      const response = await fetch("/api/registrations", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Registration could not be submitted.");
      setSuccess(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Registration could not be submitted."); }
    finally { setSaving(false); }
  }

  if (success) return <div role="status" className="rounded-2xl bg-emerald-50 p-6 text-emerald-950 ring-1 ring-emerald-200"><CheckCircle2 className="mb-3 size-7" /><h4 className="font-semibold">Registration received</h4><p className="mt-1 text-sm">Your payment proof is pending verification. A registration receipt will be emailed to you. Your place is confirmed only after CSC verifies the payment.</p></div>;

  return <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field><FieldLabel htmlFor="paid-name">Full name</FieldLabel><Input id="paid-name" autoComplete="name" {...register("fullName")} aria-invalid={!!errors.fullName} />{errors.fullName && <FieldError>{errors.fullName.message}</FieldError>}</Field>
      <Field><FieldLabel htmlFor="paid-email">Email</FieldLabel><Input id="paid-email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />{errors.email && <FieldError>{errors.email.message}</FieldError>}</Field>
      <Field><FieldLabel htmlFor="paid-whatsapp">WhatsApp number</FieldLabel><Input id="paid-whatsapp" type="tel" autoComplete="tel" {...register("whatsapp")} aria-invalid={!!errors.whatsapp} />{errors.whatsapp && <FieldError>{errors.whatsapp.message}</FieldError>}</Field>
      <Field><FieldLabel htmlFor="paid-org">Organization</FieldLabel><Input id="paid-org" autoComplete="organization" {...register("organization")} aria-invalid={!!errors.organization} />{errors.organization && <FieldError>{errors.organization.message}</FieldError>}</Field>
      <Field><FieldLabel htmlFor="paid-role">Role</FieldLabel><select id="paid-role" className={selectClass} {...register("role")} defaultValue=""><option value="" disabled>Select your role</option>{paidRegistrationRoles.map((role) => <option key={role}>{role}</option>)}</select>{errors.role && <FieldError>{errors.role.message}</FieldError>}</Field>
      <Field><FieldLabel htmlFor="paid-count">Attendees (up to {event.maxAttendeesPerRegistration ?? 10})</FieldLabel><select id="paid-count" className={selectClass} {...register("attendeeCount", { valueAsNumber: true })}>{Array.from({ length: event.maxAttendeesPerRegistration ?? 10 }, (_, i) => <option value={i + 1} key={i + 1}>{i + 1}</option>)}</select></Field>
    </div>
    <div className="rounded-xl bg-brand-cloud p-4 text-lg font-semibold text-brand-ink" aria-live="polite">Total payable: ₹{total.toLocaleString("en-IN")}</div>
    <div className="grid gap-5 rounded-2xl bg-brand-cloud p-4 sm:grid-cols-[150px_1fr]">
      {event.upiQrImage ? <Image src={event.upiQrImage} alt={`UPI payment QR for ${event.title}`} width={150} height={150} unoptimized className="size-[150px] rounded-lg bg-white object-contain p-2" /> : <div className="grid size-[150px] place-items-center rounded-lg bg-brand-white text-center text-xs text-brand-muted">UPI QR will appear here</div>}
      <div className="self-center text-sm text-brand-secondary"><p className="font-semibold text-brand-ink">Pay to {event.upiPayeeName}</p><p className="mt-1">UPI ID: <span className="font-mono">{event.upiVpa}</span></p><p className="mt-2">{event.paymentNote || "Pay the exact total using any UPI app, then enter your transaction reference and upload the screenshot."}</p></div>
    </div>
    <Field><FieldLabel htmlFor="paid-txn">UPI transaction reference</FieldLabel><Input id="paid-txn" autoComplete="off" {...register("upiTransactionRef")} aria-invalid={!!errors.upiTransactionRef} />{errors.upiTransactionRef && <FieldError>{errors.upiTransactionRef.message}</FieldError>}</Field>
    <Field><FieldLabel htmlFor="paid-proof">Payment screenshot or receipt</FieldLabel><Input id="paid-proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={(event) => setPaymentProof(event.target.files?.[0] ?? null)} /><p className="text-xs text-brand-muted">JPEG, PNG, WebP, or PDF · up to 5 MB. Visible only to authorized CSC reviewers.</p></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="paid-additional">Additional attendee names (required when count is above 1)</FieldLabel><Textarea id="paid-additional" rows={2} placeholder="One full name per line" {...register("additionalAttendeeNames")} />{errors.additionalAttendeeNames && <FieldError>{errors.additionalAttendeeNames.message}</FieldError>}</Field><Field><FieldLabel htmlFor="paid-referral">How did you hear about us? (optional)</FieldLabel><select id="paid-referral" className={selectClass} {...register("referralSource")}><option value="">Select</option>{paidRegistrationReferrals.map((referral) => <option key={referral}>{referral}</option>)}</select></Field></div>
    <Field><FieldLabel htmlFor="paid-notes">Dietary or accessibility notes (optional)</FieldLabel><Textarea id="paid-notes" rows={2} {...register("dietaryAccessibilityNotes")} /></Field>
    <label className="flex items-start gap-3 text-sm text-brand-secondary"><input type="checkbox" value="true" {...register("consentContact")} className="mt-1 size-4 accent-[var(--brand-accent)]" /><span>CSC may contact me about this event registration.</span></label>
    <label className="flex items-start gap-3 text-sm text-brand-secondary"><input type="checkbox" value="true" {...register("consentPaymentTerms")} className="mt-1 size-4 accent-[var(--brand-accent)]" /><span>I confirm the payment details are accurate and understand my registration remains pending until payment verification.</span></label>
    <Button type="submit" disabled={saving} className="h-11 gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{saving ? "Submitting…" : "Submit registration"}</Button>
  </form>;
}
