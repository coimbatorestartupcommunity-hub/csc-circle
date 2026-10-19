"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Info, Lock } from "lucide-react";
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

function UnavailableBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-brand-blue/70 p-4 text-sm text-brand-ink ring-1 ring-brand-border">
      <Info className="mt-0.5 size-4 shrink-0 text-brand-accent" aria-hidden />
      <p>
        Registration isn&apos;t live yet. This form previews the experience and
        validates your details, but nothing is stored or confirmed until secure
        submissions open in a later phase.
      </p>
    </div>
  );
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
    formState: { errors, isSubmitSuccessful },
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

  const onSubmit = (values: RsvpFormValues) => {
    // No backend yet: acknowledge validation without faking a confirmed booking.
    toast.info("Your details look good — registration opens soon.", {
      description:
        "We validated your RSVP, but submissions aren't stored yet. No booking has been created.",
    });
    if (process.env.NODE_ENV === "development") {
      console.debug("[dev] RSVP preview payload", values);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <UnavailableBanner />

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

      <SubmitArea success={isSubmitSuccessful} />
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
    formState: { errors, isSubmitSuccessful },
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

  const onSubmit = (values: ConsultationFormValues) => {
    toast.info("Thanks — your consultation request looks complete.", {
      description:
        "We validated your request, but it isn't stored yet. Secure submissions open in a later phase.",
    });
    if (process.env.NODE_ENV === "development") {
      console.debug("[dev] Consultation preview payload", values);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <UnavailableBanner />

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

      <SubmitArea success={isSubmitSuccessful} />
    </form>
  );
}

function SubmitArea({ success }: { success: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <Button type="submit" size="lg" className="h-11 w-full gap-2">
        <Lock className="size-4" />
        Validate &amp; preview (submission opens later)
      </Button>
      {success ? (
        <p
          className="text-center text-sm font-medium text-green-700"
          role="status"
        >
          Validated — no booking was created. We&apos;ll be in touch when
          registration opens.
        </p>
      ) : (
        <FieldDescription className="text-center">
          Your details are validated locally and never submitted yet.
        </FieldDescription>
      )}
    </div>
  );
}
