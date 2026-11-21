"use client";

import * as React from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Smartphone, ArrowRight, ShieldCheck, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  calculatePaidRegistrationTotal,
  paidRegistrationReferrals,
  paidRegistrationRoles,
  paidRegistrationSchema,
  toCreateOrderBody,
} from "@/lib/validations/paid-registration";
import { UpiCheckoutModal, type OrderInfo } from "@/components/events/upi-checkout-modal";
import type { PaymentDeepLinks } from "@/lib/payments/orders";
import type { EventRecord } from "@/types";
import { z } from "zod";

type Values = z.input<typeof paidRegistrationSchema>;
const selectClass =
  "h-10 w-full rounded-lg border border-input bg-brand-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PaidRegistrationForm({ event }: { event: EventRecord }) {
  const [saving, setSaving] = React.useState(false);
  const isFree = event.admission === "free" || (event.pricePerAttendee ?? 0) <= 0;
  const [freeConfirmedData, setFreeConfirmedData] = React.useState<{ ok: boolean; reference: string; passHref?: string; message?: string } | null>(null);

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
    control,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(paidRegistrationSchema),
    defaultValues: {
      eventId: event.id,
      attendeeCount: 1,
      totalAmountPaid: event.pricePerAttendee ?? 0,
      consentContact: "true",
      consentPaymentTerms: undefined,
    },
  });

  const values = useWatch({ control });
  const total = calculatePaidRegistrationTotal(event.pricePerAttendee ?? 0, Number(values.attendeeCount ?? 1));

  // Check for 1-click email verification completion or saved session
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const verifiedParam = params.get("verified");
    const guestIdParam = params.get("guestId");
    const guestTokenParam = params.get("guestToken");
    const emailParam = params.get("email");

    if (verifiedParam === "true" && guestIdParam && guestTokenParam) {
      setGuestVerificationId(guestIdParam);
      setGuestVerificationToken(guestTokenParam);
      if (emailParam) {
        const norm = emailParam.toLowerCase();
        setGuestVerificationEmail(norm);
        setValue("email", norm, { shouldValidate: true });
      }
      toast.success("Email verified successfully! You can now proceed to payment.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    try {
      const stored = localStorage.getItem("csc_guest_verification");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id && parsed.token && Date.now() - (parsed.verifiedAt || 0) < 15 * 60_000) {
          if (!parsed.eventSlug || parsed.eventSlug === event.slug) {
            setGuestVerificationId(parsed.id);
            setGuestVerificationToken(parsed.token);
            setGuestVerificationEmail(parsed.email?.toLowerCase() || null);
            if (parsed.email) setValue("email", parsed.email, { shouldValidate: true });
          }
        }
      }
    } catch {
      // Ignore storage error
    }
  }, [event.slug, setValue]);

  // Restore draft values
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = `csc_reg_draft_${event.id}`;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.fullName) setValue("fullName", draft.fullName);
        if (draft.whatsapp) setValue("whatsapp", draft.whatsapp);
        if (draft.organization) setValue("organization", draft.organization);
        if (draft.role) setValue("role", draft.role);
        if (draft.referralSource) setValue("referralSource", draft.referralSource);
      }
    } catch {
      // Ignore
    }
  }, [event.id, setValue]);

  // Persist form draft as user types
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = `csc_reg_draft_${event.id}`;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          fullName: values.fullName || "",
          whatsapp: values.whatsapp || "",
          organization: values.organization || "",
          role: values.role || "",
          referralSource: values.referralSource || "",
        })
      );
    } catch {
      // Ignore
    }
  }, [event.id, values.fullName, values.whatsapp, values.organization, values.role, values.referralSource]);

  const requestGuestEmailVerification = async (email: string) => {
    const response = await fetch("/api/payments/guest-email/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, eventId: event.id, eventSlug: event.slug }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Could not send the verification code.");
    setGuestVerificationId(result.verificationId);
    setGuestVerificationToken(null);
    setGuestVerificationEmail(email.toLowerCase());
    setGuestVerificationCode("");
    toast.success("Verification link & code sent! Click the button in your email to verify instantly.");
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
    // Validate primary attendee fields first
    const fieldsToValidate = [
      "fullName" as const,
      "email" as const,
      "whatsapp" as const,
      "organization" as const,
      "role" as const,
      "attendeeCount" as const,
      "consentPaymentTerms" as const,
      ...(!isFree ? ["consentContact" as const] : []),
    ];

    const isPrimaryValid = await trigger(fieldsToValidate);

    if (!isPrimaryValid) {
      const err = errors;
      const count = Number(getValues("attendeeCount") || 1);
      const prefix = count > 1 ? "Attendee 1: " : "";

      if (err.fullName) {
        toast.error(`${prefix}${err.fullName.message || "Please enter your full name (at least 2 characters)."}`);
      } else if (err.email) {
        toast.error(`${prefix}${err.email.message || "Please enter a valid email address."}`);
      } else if (err.whatsapp) {
        toast.error(`${prefix}${err.whatsapp.message || "Please enter a valid WhatsApp number."}`);
      } else if (err.organization) {
        toast.error(`${prefix}${err.organization.message || "Please enter your startup or company name."}`);
      } else if (err.role) {
        toast.error(`${prefix}Please select your role from the list.`);
      } else if (err.consentPaymentTerms) {
        toast.error("Please agree to the event registration guidelines to proceed.");
      } else if (err.consentContact) {
        toast.error("Please confirm the contact consent checkbox.");
      } else {
        toast.error(count > 1 ? "Please fill in all required registration details for Attendee 1." : "Please fill in all required registration details.");
      }
      return;
    }

    const currentValues = getValues();
    const count = Number(currentValues.attendeeCount || 1);

    // Validate additional attendees when selecting 2 or more attendees
    if (count > 1) {
      const additional = currentValues.additionalAttendees || [];
      for (let i = 0; i < count - 1; i++) {
        const att = additional[i];
        const attendeeNumber = i + 2;

        if (!att?.fullName?.trim()) {
          toast.error(`Please provide the full name for Attendee ${attendeeNumber}.`);
          return;
        }
        if (!att?.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(att.email.trim())) {
          toast.error(`Please provide a valid email address for Attendee ${attendeeNumber}.`);
          return;
        }
        if (!att?.whatsapp?.trim() || !/^\+?[0-9][0-9\s()-]{7,20}$/.test(att.whatsapp.trim())) {
          toast.error(`Please provide a valid WhatsApp number for Attendee ${attendeeNumber}.`);
          return;
        }
        if (!att?.organization?.trim()) {
          toast.error(`Please provide the startup or company name for Attendee ${attendeeNumber}.`);
          return;
        }
        if (!att?.role) {
          toast.error(`Please select the role for Attendee ${attendeeNumber}.`);
          return;
        }
      }

      // Ensure distinct names across all attendees
      const allNames = [
        String(currentValues.fullName || "").trim().toLowerCase(),
        ...additional.slice(0, count - 1).map((a) => String(a?.fullName || "").trim().toLowerCase()),
      ];
      if (new Set(allNames).size !== allNames.length) {
        toast.error("Each attendee must have a distinct full name.");
        return;
      }
    }

    const normalizedEmail = String(currentValues.email || "").trim().toLowerCase();

    if (isFree) {
      setSaving(true);
      try {
        const res = await fetch("/api/events/register-free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event.id,
            fullName: currentValues.fullName,
            email: currentValues.email,
            whatsapp: currentValues.whatsapp,
            organization: currentValues.organization,
            role: currentValues.role,
            attendeeCount: count,
            additionalAttendees: (currentValues.additionalAttendees || []).slice(0, count - 1),
            additionalAttendeeNames: (currentValues.additionalAttendees || [])
              .slice(0, count - 1)
              .map((a) => a.fullName)
              .join("\n"),
            referralSource: currentValues.referralSource,
            dietaryAccessibilityNotes: currentValues.dietaryAccessibilityNotes,
            consentContact: currentValues.consentContact ? "true" : "false",
            consentPaymentTerms: "true",
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Unable to complete free registration.");
        }

        setFreeConfirmedData(data);
        toast.success(data.message || "Registration confirmed! Your digital event pass has been emailed to you.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to register.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const usableVerification = guestVerificationEmail === normalizedEmail;
    setSaving(true);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          toCreateOrderBody({
            eventId: event.id,
            fullName: currentValues.fullName,
            email: currentValues.email,
            whatsapp: currentValues.whatsapp,
            organization: currentValues.organization,
            role: currentValues.role,
            attendeeCount: currentValues.attendeeCount,
            additionalAttendees: (currentValues.additionalAttendees || []).slice(0, count - 1),
            additionalAttendeeNames: (currentValues.additionalAttendees || [])
              .slice(0, count - 1)
              .map((a) => a.fullName)
              .join("\n"),
            referralSource: currentValues.referralSource,
            dietaryAccessibilityNotes: currentValues.dietaryAccessibilityNotes,
            consentContact: currentValues.consentContact,
            consentPaymentTerms: currentValues.consentPaymentTerms,
            guestVerificationId: usableVerification ? guestVerificationId : null,
            guestEmailVerificationToken: usableVerification ? guestVerificationToken : null,
          })
        ),
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

  if (freeConfirmedData) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-6 text-slate-800 ring-1 ring-teal-300/50" aria-live="polite">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-6 text-teal-600 shrink-0" />
          <div className="flex-1">
            <h4 className="text-lg font-bold text-slate-900">Registration Confirmed!</h4>
            <p className="mt-1 text-xs font-mono font-bold text-teal-800">Pass Reference: {freeConfirmedData.reference}</p>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              {freeConfirmedData.message || "Your spot is secured. We have sent your individual QR event pass and Google Meet access instructions to your email."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {freeConfirmedData.passHref && (
                <Link
                  href={freeConfirmedData.passHref}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
                >
                  View Digital Event Pass →
                </Link>
              )}
              <Link
                href="/events/google-meet/check-in"
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-white px-4 py-2.5 text-xs font-semibold text-teal-800 shadow-2xs hover:bg-teal-50 transition"
              >
                Go to QR Check-in Portal →
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              Check-in and Google Meet access unlock 3 hours prior to meeting start time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <form
          onSubmit={(e) => { e.preventDefault(); handleProceedToUpi(); }}
          className="flex flex-col gap-4"
        >
          {/* Attendee 1 Header (if count > 1) */}
          {Number(values.attendeeCount || 1) > 1 ? (
            <div className="flex items-center gap-2 border-b border-brand-border/70 pb-2 pt-1 text-sm font-semibold text-brand-ink">
              <span className="flex size-5 items-center justify-center rounded-full bg-brand-accent/15 text-xs font-bold text-brand-accent">
                1
              </span>
              <span>Primary Attendee (Attendee 1)</span>
            </div>
          ) : null}

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
              {guestVerificationToken && guestVerificationEmail === (values.email || "").trim().toLowerCase() && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>Email verified · Ready for instant UPI checkout</span>
                </div>
              )}
              {guestVerificationId && !guestVerificationToken && (
                <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs">
                  <span className="font-semibold text-teal-900">Verification link &amp; code sent:</span>
                  <p className="text-[11px] text-teal-800 leading-relaxed">
                    Check your email and click <strong>&quot;Verify Email &amp; Complete Checkout&quot;</strong> to continue automatically, or enter your 6-digit code below:
                  </p>
                  <div className="flex gap-2 mt-0.5">
                    <Input
                      placeholder="6-digit code"
                      maxLength={6}
                      value={guestVerificationCode}
                      onChange={(e) => setGuestVerificationCode(e.target.value.replace(/\D/g, ""))}
                      className="h-9 bg-white text-xs font-mono"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleVerifyGuestEmail}
                      disabled={verifyingEmail || guestVerificationCode.length !== 6}
                      className="h-9 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs shrink-0"
                    >
                      {verifyingEmail ? <Loader2 className="size-3.5 animate-spin" /> : "Verify Code"}
                    </Button>
                  </div>
                </div>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="paid-whatsapp">WhatsApp number</FieldLabel>
              <Input id="paid-whatsapp" type="tel" autoComplete="tel" {...register("whatsapp")} aria-invalid={!!errors.whatsapp} />
              {errors.whatsapp && <FieldError>{errors.whatsapp.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="paid-org">Startup / Company Name</FieldLabel>
              <Input id="paid-org" autoComplete="organization" placeholder="Your startup, company, or venture" {...register("organization")} aria-invalid={!!errors.organization} />
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

          {/* Additional Attendee Form Cards (for Attendee 2, Attendee 3, etc.) */}
          {Number(values.attendeeCount || 1) > 1 ? (
            <div className="flex flex-col gap-4 pt-1">
              {Array.from({ length: Number(values.attendeeCount || 1) - 1 }, (_, idx) => {
                const attendeeNumber = idx + 2;
                return (
                  <div
                    key={attendeeNumber}
                    className="flex flex-col gap-3 rounded-2xl border border-brand-border/80 bg-brand-cloud/40 p-4 sm:p-5"
                  >
                    <div className="flex items-center gap-2 border-b border-brand-border/70 pb-2 text-sm font-semibold text-brand-ink">
                      <span className="flex size-5 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-white">
                        {attendeeNumber}
                      </span>
                      <span>Attendee {attendeeNumber} Information</span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 pt-1">
                      <Field>
                        <FieldLabel htmlFor={`paid-att-${attendeeNumber}-name`}>Full Name</FieldLabel>
                        <Input
                          id={`paid-att-${attendeeNumber}-name`}
                          placeholder={`Attendee ${attendeeNumber} full name`}
                          {...register(`additionalAttendees.${idx}.fullName` as const)}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor={`paid-att-${attendeeNumber}-email`}>Email Address</FieldLabel>
                        <Input
                          id={`paid-att-${attendeeNumber}-email`}
                          type="email"
                          placeholder={`Attendee ${attendeeNumber} email address`}
                          {...register(`additionalAttendees.${idx}.email` as const)}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor={`paid-att-${attendeeNumber}-whatsapp`}>WhatsApp Number</FieldLabel>
                        <Input
                          id={`paid-att-${attendeeNumber}-whatsapp`}
                          type="tel"
                          placeholder={`+91 or WhatsApp number`}
                          {...register(`additionalAttendees.${idx}.whatsapp` as const)}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor={`paid-att-${attendeeNumber}-org`}>Startup / Company Name</FieldLabel>
                        <Input
                          id={`paid-att-${attendeeNumber}-org`}
                          placeholder={`Startup, company or venture`}
                          {...register(`additionalAttendees.${idx}.organization` as const)}
                        />
                      </Field>

                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor={`paid-att-${attendeeNumber}-role`}>Role</FieldLabel>
                        <select
                          id={`paid-att-${attendeeNumber}-role`}
                          className={selectClass}
                          {...register(`additionalAttendees.${idx}.role` as const)}
                          defaultValue=""
                        >
                          <option value="" disabled>Select role for Attendee {attendeeNumber}</option>
                          {paidRegistrationRoles.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="rounded-xl bg-brand-cloud p-4 text-lg font-semibold text-brand-ink flex items-center justify-between" aria-live="polite">
            <span>{isFree ? "Admission: Free" : `Total payable: ₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}</span>
            <span className="text-xs font-normal text-slate-500">
              {isFree ? "100% Free Admission" : `₹${event.pricePerAttendee} × ${Number(values.attendeeCount || 1)} attendee(s)`}
            </span>
          </div>

          <Field>
            <FieldLabel htmlFor="paid-referral">How did you hear about us? (optional)</FieldLabel>
            <select id="paid-referral" className={selectClass} {...register("referralSource")}>
              <option value="">Select</option>
              {paidRegistrationReferrals.map((referral) => (
                <option key={referral}>{referral}</option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="paid-notes">What are you currently building or looking for? (optional)</FieldLabel>
            <Textarea
              id="paid-notes"
              rows={2}
              placeholder="Briefly share what you are building, your product/tech, or co-founders/collaborators you are seeking..."
              {...register("dietaryAccessibilityNotes")}
            />
          </Field>

          <div className="flex flex-col gap-1">
            <label className="flex items-start gap-3 text-sm text-brand-secondary">
              <input type="checkbox" value="true" {...register("consentContact")} className="mt-1 size-4 accent-[var(--brand-accent)]" />
              <span>CSC may contact me about this event registration.</span>
            </label>
            {errors.consentContact && <FieldError>{errors.consentContact.message}</FieldError>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="flex items-start gap-3 text-sm text-brand-secondary">
              <input type="checkbox" value="true" {...register("consentPaymentTerms")} className="mt-1 size-4 accent-[var(--brand-accent)]" />
              <span>
                {isFree
                  ? "I confirm the registration details are accurate and agree to CSC community guidelines."
                  : "I confirm the registration details are accurate and understand my pass is issued upon verified payment."}
              </span>
            </label>
            {errors.consentPaymentTerms && <FieldError>{errors.consentPaymentTerms.message}</FieldError>}
          </div>

          {/* Payment / Pass Instructions & Notes */}
          <div className="rounded-xl border border-teal-200/80 bg-teal-50/70 p-3 text-xs leading-relaxed text-teal-950">
            <p className="font-bold flex items-center gap-1.5 text-teal-900 mb-1">
              <ShieldCheck className="size-4 text-teal-700" />
              <strong>{isFree ? "Registration & Pass Instructions:" : "Payment Instructions & Pass Delivery:"}</strong>
            </p>
            <ul className="space-y-1 text-[11.5px] text-teal-900/90 list-disc list-inside">
              {isFree ? (
                <>
                  <li><strong>Admission:</strong> Free access for approved attendees and community members.</li>
                  <li><strong>Pass Delivery:</strong> Your <strong>individual QR pass</strong> and <strong>Google Meet check-in link</strong> will be dispatched immediately to your email.</li>
                  <li><strong>Check-in Notice:</strong> Google Meet check-in unlocks <strong>one hour before the meeting starts</strong>.</li>
                </>
              ) : (
                <>
                  <li><strong>Registration Fee:</strong> ₹{event.pricePerAttendee ?? 1} per attendee via <strong>Instant UPI Confirmation</strong>.</li>
                  <li><strong>Official Payee:</strong> <strong>VIKASH S</strong> (<code>9342877474@ptaxis</code>).</li>
                  <li><strong>Pass Delivery:</strong> Once verified, your <strong>individual QR pass</strong> and <strong>Google Meet check-in link</strong> will be dispatched immediately to your email.</li>
                </>
              )}
            </ul>
          </div>

          {/* Check-in unlock notice before the button */}
          <div className="flex items-center justify-center gap-2 rounded-xl border border-teal-200/90 bg-teal-50/90 px-3.5 py-2.5 text-center text-xs font-semibold text-teal-950">
            <Clock className="size-4 shrink-0 text-teal-700" />
            <span>Google Meet check-in unlocks one hour before the meeting starts.</span>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <Button
              type="submit"
              disabled={saving}
              className="h-12 w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : isFree ? <CheckCircle2 className="size-4" /> : <Smartphone className="size-4" />}
              {saving
                ? isFree ? "Confirming Registration…" : "Generating Payment Session…"
                : isFree ? "Register Now — Free Admission" : "Pay using UPI instant confirmation."}
              {!saving && <ArrowRight className="size-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-1">
            <ShieldCheck className="size-3.5 text-teal-600" />
            <span>
              {isFree
                ? "Instant Registration · Individual Encrypted QR Pass Delivered Automatically"
                : "Direct Bank UPI Checkout · Verified Automatically · Event Pass Delivered Instantly"}
            </span>
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
