"use client";

import * as React from "react";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Upload, Smartphone, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  calculatePaidRegistrationTotal,
  paidRegistrationReferrals,
  paidRegistrationRoles,
  paidRegistrationSchema,
  isAllowedPaymentProof,
} from "@/lib/validations/paid-registration";
import { UpiCheckoutModal, type OrderInfo } from "@/components/events/upi-checkout-modal";
import type { PaymentDeepLinks } from "@/lib/payments/orders";
import type { EventRecord } from "@/types";
import { z } from "zod";

type Values = z.input<typeof paidRegistrationSchema>;
const selectClass =
  "h-10 w-full rounded-lg border border-input bg-brand-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PaidRegistrationForm({ event }: { event: EventRecord }) {
  const [paymentMode, setPaymentMode] = React.useState<"automated" | "manual">("automated");
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [paymentProof, setPaymentProof] = React.useState<File | null>(null);

  // Automated UPI Checkout state
  const [checkoutModalOpen, setCheckoutModalOpen] = React.useState(false);
  const [activeOrder, setActiveOrder] = React.useState<OrderInfo | null>(null);
  const [activeDeepLinks, setActiveDeepLinks] = React.useState<PaymentDeepLinks | null>(null);
  const [guestVerificationId, setGuestVerificationId] = React.useState<string | null>(null);
  const [guestVerificationToken, setGuestVerificationToken] = React.useState<string | null>(null);
  const [guestVerificationEmail, setGuestVerificationEmail] = React.useState<string | null>(null);
  const [guestVerificationCode, setGuestVerificationCode] = React.useState("");
  const [verifyingEmail, setVerifyingEmail] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(paidRegistrationSchema),
    defaultValues: {
      eventId: event.id,
      attendeeCount: 1,
      totalAmountPaid: event.pricePerAttendee ?? 0,
      consentContact: undefined,
      consentPaymentTerms: undefined,
    },
  });

  const values = useWatch({ control });
  const total = calculatePaidRegistrationTotal(event.pricePerAttendee ?? 0, Number(values.attendeeCount ?? 1));

  const requestGuestEmailVerification = async (email: string) => {
    const response = await fetch("/api/payments/guest-email/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, eventId: event.id }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Could not send the verification code.");
    setGuestVerificationId(result.verificationId);
    setGuestVerificationToken(null);
    setGuestVerificationEmail(email.toLowerCase());
    setGuestVerificationCode("");
    toast.success("A verification code was sent to your email address.");
  };

  const handleVerifyGuestEmail = async () => {
    const email = String(getValues("email") || "").trim().toLowerCase();
    if (!guestVerificationId || email !== guestVerificationEmail || !/^\d{6}$/.test(guestVerificationCode)) {
      toast.error("Enter the six-digit code sent to this email address.");
      return;
    }
    setVerifyingEmail(true);
    try {
      const response = await fetch("/api/payments/guest-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId: guestVerificationId, email, code: guestVerificationCode }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "The verification code could not be confirmed.");
      setGuestVerificationToken(result.verificationToken);
      toast.success("Email verified. You can now create the payment order.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Email verification failed.");
    } finally {
      setVerifyingEmail(false);
    }
  };

  // Handler for the order-scoped UPI checkout
  const handleProceedToUpi = async () => {
    // Validate attendee fields first
    const isValid = await trigger([
      "fullName",
      "email",
      "whatsapp",
      "organization",
      "role",
      "attendeeCount",
      "consentContact",
      "consentPaymentTerms",
    ]);

    if (!isValid) {
      toast.error("Please fill in all required registration details.");
      return;
    }

    const currentValues = getValues();
    const normalizedEmail = String(currentValues.email || "").trim().toLowerCase();
    const usableVerification = guestVerificationEmail === normalizedEmail;
    setSaving(true);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          fullName: currentValues.fullName,
          email: currentValues.email,
          whatsapp: currentValues.whatsapp,
          organization: currentValues.organization,
          role: currentValues.role,
          attendeeCount: Number(currentValues.attendeeCount || 1),
          additionalAttendeeNames: currentValues.additionalAttendeeNames,
          referralSource: currentValues.referralSource,
          dietaryAccessibilityNotes: currentValues.dietaryAccessibilityNotes,
          consentContact: currentValues.consentContact,
          consentPaymentTerms: currentValues.consentPaymentTerms,
          guestVerificationId: usableVerification ? guestVerificationId || undefined : undefined,
          guestEmailVerificationToken: usableVerification ? guestVerificationToken || undefined : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (res.status === 403 && String(data.error || "").startsWith("Verify your email")) {
          await requestGuestEmailVerification(normalizedEmail);
          return;
        }
        throw new Error(data.error || "Unable to initialize UPI payment.");
      }

      setActiveOrder(data.order);
      setActiveDeepLinks(data.deepLinks);
      setCheckoutModalOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create payment order.");
    } finally {
      setSaving(false);
    }
  };

  // Handler for Legacy Manual Submission
  async function onSubmitManual(data: Values) {
    const file = paymentProof;
    if (!file || !isAllowedPaymentProof(file)) {
      toast.error("Upload a JPEG, PNG, WebP, or PDF file under 5 MB.");
      return;
    }
    const body = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== "") body.append(key, String(value));
    }
    body.set("totalAmountPaid", String(total));
    body.append("paymentScreenshot", file);
    setSaving(true);
    try {
      const response = await fetch("/api/registrations", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Registration could not be submitted.");
      setSuccess(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration could not be submitted.");
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div role="status" className="rounded-2xl bg-emerald-50 p-6 text-emerald-950 ring-1 ring-emerald-200">
        <CheckCircle2 className="mb-3 size-7 text-emerald-600" />
        <h4 className="font-semibold">Registration received</h4>
        <p className="mt-1 text-sm">
          Your payment proof is pending verification. A registration receipt will be emailed to you. Your place is
          confirmed only after CSC verifies the payment.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Verified Direct UPI Payment Card with QR Code and App Options */}
        <div className="rounded-2xl border border-teal-200/90 bg-gradient-to-br from-teal-50/80 via-white to-sky-50/70 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="flex flex-col items-center shrink-0">
              <div className="size-[170px] overflow-hidden rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 flex items-center justify-center">
                <Image
                  src="/images/payments/vikash-upi-qr.png"
                  alt="UPI Payment QR Code"
                  width={150}
                  height={150}
                  unoptimized
                  className="size-full object-contain"
                />
              </div>
              <span className="mt-1.5 text-[11px] font-medium text-slate-500">Scan with any UPI app</span>
            </div>

            <div className="flex-1 flex flex-col gap-2.5 text-xs text-slate-700 w-full">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Authorized UPI Payee</span>
                  <p className="font-bold text-slate-900 text-base">S VIKASH</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Amount</span>
                  <p className="font-extrabold text-teal-800 text-lg">₹{total.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px]">UPI ID (VPA):</span>
                <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 font-mono text-xs font-semibold text-slate-900 ring-1 ring-slate-200">
                  <span>9342877474@ptyes</span>
                </div>
              </div>

              <div className="pt-1">
                <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Or tap your installed UPI app to pay:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <a
                    href={`upi://pay?pa=9342877474@ptyes&pn=S%20VIKASH&am=${total.toFixed(2)}&cu=INR`}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 px-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
                  >
                    <Image src="/images/payments/gpay-icon.png" alt="Google Pay" width={16} height={16} className="shrink-0" />
                    <span>Google Pay</span>
                  </a>
                  <a
                    href={`upi://pay?pa=9342877474@ptyes&pn=S%20VIKASH&am=${total.toFixed(2)}&cu=INR`}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 px-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
                  >
                    <Image src="/images/payments/phonepe-icon.png" alt="PhonePe" width={16} height={16} className="shrink-0" />
                    <span>PhonePe</span>
                  </a>
                  <a
                    href={`upi://pay?pa=9342877474@ptyes&pn=S%20VIKASH&am=${total.toFixed(2)}&cu=INR`}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 px-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
                  >
                    <Image src="/images/payments/paytm-icon.png" alt="Paytm" width={16} height={16} className="shrink-0" />
                    <span>Paytm</span>
                  </a>
                  <a
                    href={`upi://pay?pa=9342877474@ptyes&pn=S%20VIKASH&am=${total.toFixed(2)}&cu=INR`}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 px-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
                  >
                    <Image src="/images/payments/bhim-icon.png" alt="BHIM" width={16} height={16} className="shrink-0" />
                    <span>BHIM</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleProceedToUpi(); }}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="paid-name">Full name</FieldLabel>
              <Input id="paid-name" autoComplete="name" {...register("fullName")} aria-invalid={!!errors.fullName} />
              {errors.fullName && <FieldError>{errors.fullName.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="paid-email">Email</FieldLabel>
              <Input id="paid-email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="paid-whatsapp">WhatsApp number</FieldLabel>
              <Input id="paid-whatsapp" type="tel" autoComplete="tel" {...register("whatsapp")} aria-invalid={!!errors.whatsapp} />
              {errors.whatsapp && <FieldError>{errors.whatsapp.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="paid-org">Organization</FieldLabel>
              <Input id="paid-org" autoComplete="organization" {...register("organization")} aria-invalid={!!errors.organization} />
              {errors.organization && <FieldError>{errors.organization.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="paid-role">Role</FieldLabel>
              <select id="paid-role" className={selectClass} {...register("role")} defaultValue="">
                <option value="" disabled>Select your role</option>
                {paidRegistrationRoles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
              {errors.role && <FieldError>{errors.role.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="paid-count">Attendees (up to {event.maxAttendeesPerRegistration ?? 10})</FieldLabel>
              <select id="paid-count" className={selectClass} {...register("attendeeCount", { valueAsNumber: true })}>
                {Array.from({ length: event.maxAttendeesPerRegistration ?? 10 }, (_, i) => (
                  <option value={i + 1} key={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-xl bg-brand-cloud p-4 text-lg font-semibold text-brand-ink flex items-center justify-between" aria-live="polite">
            <span>Total payable: ₹{total.toLocaleString("en-IN")}</span>
            <span className="text-xs font-normal text-slate-500">₹{event.pricePerAttendee} × {Number(values.attendeeCount || 1)} attendee(s)</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="paid-additional">Additional attendee names (required when count is above 1)</FieldLabel>
              <Textarea
                id="paid-additional"
                rows={2}
                placeholder="One full name per line"
                {...register("additionalAttendeeNames")}
              />
              {errors.additionalAttendeeNames && <FieldError>{errors.additionalAttendeeNames.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="paid-referral">How did you hear about us? (optional)</FieldLabel>
              <select id="paid-referral" className={selectClass} {...register("referralSource")}>
                <option value="">Select</option>
                {paidRegistrationReferrals.map((referral) => (
                  <option key={referral}>{referral}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="paid-notes">Dietary or accessibility notes (optional)</FieldLabel>
            <Textarea id="paid-notes" rows={2} {...register("dietaryAccessibilityNotes")} />
          </Field>

          <label className="flex items-start gap-3 text-sm text-brand-secondary">
            <input type="checkbox" value="true" {...register("consentContact")} className="mt-1 size-4 accent-[var(--brand-accent)]" />
            <span>CSC may contact me about this event registration.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-brand-secondary">
            <input type="checkbox" value="true" {...register("consentPaymentTerms")} className="mt-1 size-4 accent-[var(--brand-accent)]" />
            <span>I confirm the registration details are accurate and understand my pass is issued upon verified payment.</span>
          </label>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="h-12 gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
              {saving ? "Generating Payment Session…" : `Pay ₹${total.toFixed(2)} via UPI · Instant Confirmation`}
              {!saving && <ArrowRight className="size-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-1">
            <ShieldCheck className="size-3.5 text-teal-600" />
            <span>Direct Bank UPI Checkout · Verified Automatically · Event Pass Delivered Instantly</span>
          </div>
        </form>
      </div>

      {/* UPI Checkout Modal */}
      <UpiCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        order={activeOrder}
        deepLinks={activeDeepLinks}
        eventTitle={event.title}
        attendeeName={values.fullName || "Attendee"}
      />
    </>
  );
}
