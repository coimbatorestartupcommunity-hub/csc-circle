"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Info, Loader2, CheckCircle2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { rsvpGoals } from "@/lib/content/taxonomy";
import {
  rsvpSchema,
  consultationSchema,
  type RsvpFormValues,
  type ConsultationFormValues,
} from "@/lib/validations/forms";
import type { EventRecord } from "@/types";
import { notifySubmissionSuccess } from "@/lib/ui/submission-feedback";

function InfoBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-brand-blue/70 p-4 text-sm text-brand-ink ring-1 ring-brand-border">
      <Info className="mt-0.5 size-4 shrink-0 text-brand-accent" aria-hidden />
      <p>
        Your request is sent to the CSC team for review — submitting does not
        confirm a booking. We&apos;ll contact you to confirm your spot. Your
        details are used only to organise this and to keep you informed.
      </p>
    </div>
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

const goalOptions = rsvpGoals.map((g) => ({ value: g, label: g }));

/* -------------------------------------------------------------------------- */
/*  RSVP form                                                                 */
/* -------------------------------------------------------------------------- */

export interface RsvpFormProps {
  events: EventRecord[];
  selectedEventId?: string;
  onEventChange?: (eventId: string) => void;
}

export function RsvpForm({
  events,
  selectedEventId,
  onEventChange,
}: RsvpFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RsvpFormValues>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      fullName: "",
      startup: "",
      whatsapp: "",
      email: "",
      eventId: selectedEventId ?? "",
      consent: false as unknown as true,
    },
  });
  const [reference, setReference] = React.useState<string | null>(null);

  const onSubmit = async (values: RsvpFormValues) => {
    const ev = events.find((e) => e.id === values.eventId);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          startup: values.startup,
          whatsapp: values.whatsapp,
          email: values.email,
          goal: values.goal,
          consent: values.consent,
          eventId: isUuid(values.eventId) ? values.eventId : undefined,
          eventLabel: ev?.title,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Could not submit your RSVP.");
        return;
      }
      setReference(json.reference);
      notifySubmissionSuccess({ title: "Registration request submitted", message: "Your RSVP was received. The CSC team will confirm your place when the registration is approved.", reference: json.reference });
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <InfoBanner />

      <Field>
        <FieldLabel htmlFor="rsvp-event">Select event</FieldLabel>
        <Controller
          control={control}
          name="eventId"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => {
                const next = (v as string | null) ?? "";
                field.onChange(next);
                onEventChange?.(next);
              }}
            >
              <SelectTrigger id="rsvp-event" className="h-10 w-full">
                <SelectValue placeholder="Choose an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.eventId ? <FieldError>{errors.eventId.message}</FieldError> : null}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="rsvp-name">Full name</FieldLabel>
          <Input id="rsvp-name" {...register("fullName")} aria-invalid={!!errors.fullName} />
          {errors.fullName ? <FieldError>{errors.fullName.message}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="rsvp-startup">Startup name or idea</FieldLabel>
          <Input id="rsvp-startup" {...register("startup")} aria-invalid={!!errors.startup} />
          {errors.startup ? <FieldError>{errors.startup.message}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="rsvp-whatsapp">WhatsApp number</FieldLabel>
          <Input
            id="rsvp-whatsapp"
            type="tel"
            inputMode="tel"
            {...register("whatsapp")}
            aria-invalid={!!errors.whatsapp}
          />
          {errors.whatsapp ? <FieldError>{errors.whatsapp.message}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="rsvp-email">Email address</FieldLabel>
          <Input
            id="rsvp-email"
            type="email"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email ? <FieldError>{errors.email.message}</FieldError> : null}
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="rsvp-goal">Main goal</FieldLabel>
        <Controller
          control={control}
          name="goal"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="rsvp-goal" className="h-10 w-full">
                <SelectValue placeholder="What are you hoping to get from this event?" />
              </SelectTrigger>
              <SelectContent>
                {goalOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.goal ? <FieldError>{errors.goal.message}</FieldError> : null}
      </Field>

      <Controller
        control={control}
        name="consent"
        render={({ field }) => (
          <label className="flex items-start gap-3 text-sm text-brand-secondary">
            <Checkbox
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <span>
              I agree to be contacted about this event and consent to CSC Circle
              processing my details for this purpose.
            </span>
          </label>
        )}
      />
      {errors.consent ? <FieldError>{errors.consent.message}</FieldError> : null}

      <SubmitArea label="Submit RSVP" submitting={isSubmitting} reference={reference} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Consultation form                                                         */
/* -------------------------------------------------------------------------- */

export function ConsultationForm() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      fullName: "",
      startup: "",
      whatsapp: "",
      email: "",
      challenge: "",
      consent: false as unknown as true,
    },
  });
  const [reference, setReference] = React.useState<string | null>(null);

  const onSubmit = async (values: ConsultationFormValues) => {
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          startup: values.startup,
          whatsapp: values.whatsapp,
          email: values.email,
          challenge: values.challenge,
          consent: values.consent,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Could not submit your request.");
        return;
      }
      setReference(json.reference);
      notifySubmissionSuccess({ title: "Consultation request submitted", message: "Your request has been received. The CSC team will contact you to schedule a consultation.", reference: json.reference });
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <InfoBanner />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="c-name">Full name</FieldLabel>
          <Input id="c-name" {...register("fullName")} aria-invalid={!!errors.fullName} />
          {errors.fullName ? <FieldError>{errors.fullName.message}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="c-startup">Startup name or idea</FieldLabel>
          <Input id="c-startup" {...register("startup")} aria-invalid={!!errors.startup} />
          {errors.startup ? <FieldError>{errors.startup.message}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="c-whatsapp">WhatsApp number</FieldLabel>
          <Input id="c-whatsapp" type="tel" inputMode="tel" {...register("whatsapp")} aria-invalid={!!errors.whatsapp} />
          {errors.whatsapp ? <FieldError>{errors.whatsapp.message}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="c-email">Email address</FieldLabel>
          <Input id="c-email" type="email" {...register("email")} aria-invalid={!!errors.email} />
          {errors.email ? <FieldError>{errors.email.message}</FieldError> : null}
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="c-challenge">Your startup challenge or request</FieldLabel>
        <Textarea
          id="c-challenge"
          rows={5}
          {...register("challenge")}
          placeholder="Describe what you'd like support with — your challenge, goal, or the kind of guidance you're looking for."
          aria-invalid={!!errors.challenge}
        />
        {errors.challenge ? (
          <FieldError>{errors.challenge.message}</FieldError>
        ) : (
          <FieldDescription>
            The more context you share, the more useful the conversation.
          </FieldDescription>
        )}
      </Field>

      <Controller
        control={control}
        name="consent"
        render={({ field }) => (
          <label className="flex items-start gap-3 text-sm text-brand-secondary">
            <Checkbox
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <span>
              I agree to be contacted about my request and consent to CSC Circle
              processing my details for this purpose.
            </span>
          </label>
        )}
      />
      {errors.consent ? <FieldError>{errors.consent.message}</FieldError> : null}

      <SubmitArea label="Submit request" submitting={isSubmitting} reference={reference} />
    </form>
  );
}

function SubmitArea({
  label,
  submitting,
  reference,
}: {
  label: string;
  submitting: boolean;
  reference: string | null;
}) {
  if (reference) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-green-50 p-4 text-center" role="status">
        <CheckCircle2 className="size-6 text-green-700" />
        <p className="text-sm font-medium text-green-800">
          Received — reference{" "}
          <span className="font-mono">{reference}</span>
        </p>
        <p className="text-xs text-green-700">
          The CSC team will review your submission and contact you.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Button type="submit" size="lg" disabled={submitting} className="h-11 w-full gap-2">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {label}
      </Button>
      <FieldDescription className="text-center">
        Submitting sends your details to the CSC team for review; it isn&apos;t a
        confirmed booking.
      </FieldDescription>
    </div>
  );
}
