"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { memberRequest } from "@/lib/services/member/request";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { startupSubmissionSchema, type StartupSubmissionValues } from "@/lib/validations/member";
import { notifySubmissionSuccess } from "@/lib/ui/submission-feedback";
import { CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";

export function StartupForm() {
  const { register, handleSubmit, setValue, formState: { isSubmitting, errors } } = useForm<StartupSubmissionValues>({
    resolver: zodResolver(startupSubmissionSchema),
    defaultValues: { name: "", slug: "", industry: "", description: "", website: "", consent: false },
  });
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const nameField = register("name");
  const slugField = register("slug");
  const fieldErrors = Object.values(errors).filter(Boolean);

  const submit = handleSubmit(async (values) => {
    setMessage("");
    setMessageIsError(false);
    const result = await memberRequest("startup", values);
    if (!result.ok) {
      setMessage(result.error ?? "Your startup could not be submitted. Please check the details and try again.");
      setMessageIsError(true);
      return;
    }
    setSubmitted({ id: result.id ?? "" });
    notifySubmissionSuccess({ title: "Successfully submitted", message: "Your startup submission was received and is awaiting the review decision shown in your account.", reference: result.id });
  }, (invalidFields) => {
    setMessage("Please complete the highlighted fields before submitting.");
    setMessageIsError(true);
    const firstInvalidField = Object.keys(invalidFields)[0];
    if (firstInvalidField) {
      requestAnimationFrame(() => document.getElementById(`startup-${firstInvalidField}`)?.focus());
    }
  });

  if (submitted) {
    return (
      <section className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-brand-border sm:p-9" aria-live="polite">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-brand-ink">Startup submitted</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-brand-secondary">
          Your startup details have been submitted and are under active CSC administrator review. The form is closed while your submission is being reviewed.
        </p>
        {submitted.id ? <p className="mt-3 font-mono text-xs text-brand-muted">Reference: {submitted.id}</p> : null}
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-cloud px-4 py-2 text-sm font-medium text-brand-secondary">
          <Clock3 className="size-4" aria-hidden="true" /> Awaiting CSC administrator review
        </div>
        <div className="mt-6">
          <Button type="button" variant="outline" render={<Link href="/member/profile" />}>Back to profile</Button>
        </div>
      </section>
    );
  }

  return (
    <form
      className="mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-7"
      noValidate
      onSubmit={submit}
    >
      {fieldErrors.length > 0 ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200" role="alert">Please review the highlighted fields below.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="startup-name">Startup name</Label>
          <Input id="startup-name" {...nameField} onChange={(event) => {
            nameField.onChange(event);
            if (!slugWasEdited) {
              const slug = event.currentTarget.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
              setValue("slug", slug, { shouldDirty: true, shouldValidate: true });
            }
          }} aria-invalid={!!errors.name} />
          {errors.name ? <p className="text-sm text-red-700">{errors.name.message}</p> : null}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="startup-slug">Directory slug</Label>
          <Input id="startup-slug" {...slugField} onChange={(event) => {
            setSlugWasEdited(true);
            slugField.onChange(event);
          }} aria-invalid={!!errors.slug} aria-describedby="startup-slug-help" />
          {errors.slug ? <p className="text-sm text-red-700">{errors.slug.message}</p> : <p id="startup-slug-help" className="text-xs text-brand-muted">Generated from your startup name. You can edit it.</p>}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor="startup-industry">Industry</Label>
        <Input
          id="startup-industry"
          placeholder="e.g., Climate technology, Food processing, Robotics"
          maxLength={80}
          {...register("industry", { required: "Enter your startup's industry.", minLength: 2, maxLength: 80 })}
          aria-invalid={!!errors.industry}
        />
        {errors.industry ? <p className="text-sm text-red-700">{errors.industry.message}</p> : null}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor="startup-description">Description</Label>
        <Textarea id="startup-description" {...register("description", { required: true, minLength: 20, maxLength: 600 })} aria-invalid={!!errors.description} />
        {errors.description ? <p className="text-sm text-red-700">{errors.description.message}</p> : null}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor="startup-website">Website (optional)</Label>
        <Input id="startup-website" type="url" placeholder="https://" {...register("website")} />
        {errors.website ? <p className="text-sm text-red-700">Enter a valid http(s) website URL.</p> : null}
      </div>

      <label className="flex items-start gap-2 text-sm leading-relaxed text-brand-secondary">
        <input id="startup-consent" type="checkbox" {...register("consent")} className="mt-1" aria-invalid={!!errors.consent} />
        <span>I consent to publication of these business details after CSC approval. Directory participation must also be enabled in my privacy settings.</span>
      </label>
      {errors.consent ? <p className="text-sm text-red-700">Please consent before submitting.</p> : null}

      <div className="flex flex-col items-center gap-2">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto sm:min-w-52">
          {isSubmitting ? "Submitting…" : "Submit for review"}
        </Button>
        <p role={messageIsError ? "alert" : "status"} aria-live={messageIsError ? "assertive" : "polite"} className={`text-center text-sm ${messageIsError ? "text-red-700" : "text-brand-muted"}`}>{message}</p>
      </div>
    </form>
  );
}
