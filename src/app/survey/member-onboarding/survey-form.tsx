"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  memberCategories,
  memberSurveyFieldsSchema,
  type MemberSurveyFields,
} from "@/lib/community-data/schema";
import { submitMemberSurvey } from "./actions";

const inputClass = "h-11 rounded-xl border-brand-border bg-white px-3";

function ErrorMessage({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className="text-xs font-medium text-red-700">{message}</p>;
}
export function SurveyForm() {
  const [status, setStatus] = useState<"form" | "success" | "error">("form");
  const [serverMessage, setServerMessage] = useState("");
  const submissionToken = useRef<string | null>(null);
  const formStartedAt = useRef(0);
  useEffect(() => {
    submissionToken.current = crypto.randomUUID();
    formStartedAt.current = Date.now();
  }, []);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MemberSurveyFields>({
    resolver: zodResolver(memberSurveyFieldsSchema),
    defaultValues: {
      full_name: "",
      contact_number: "",
      email: "",
      member_category: undefined,
      business_or_idea_name: "",
      description: "",
      consent: false,
    },
    mode: "onBlur",
  });
  const description = useWatch({ control, name: "description" }) ?? "";

  // react-hook-form invokes this callback only for a submit event. These refs
  // deliberately hold anti-replay metadata that is independent of rendering.
  // eslint-disable-next-line react-hooks/refs
  const submit = handleSubmit(async (values) => {
    setStatus("form");
    setServerMessage("");
    const result = await submitMemberSurvey({
      ...values,
      submission_token: submissionToken.current ?? crypto.randomUUID(),
      form_started_at: formStartedAt.current,
      website: "",
    });
    if (result.ok) {
      setStatus("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages?.[0] && field in values) {
          setError(field as keyof MemberSurveyFields, { type: "server", message: messages[0] });
        }
      }
    }
    setServerMessage(result.message);
    setStatus("error");
  });

  if (status === "success") {
    return (
      <section aria-live="polite" className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-9">
        <CheckCircle2 className="mx-auto size-11 text-emerald-700" aria-hidden />
        <h2 className="mt-4 text-xl font-bold text-brand-ink sm:text-2xl">
          Thank You! Your Information Has Been Submitted Successfully.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-brand-secondary">
          We have received your information. The CSC Circle team can now review your submission.
        </p>
        <Button render={<Link href="/" />} className="mt-6 h-11 rounded-xl px-6">
          Back to CSC Circle
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-describedby={status === "error" ? "survey-submit-error" : undefined}>
      {status === "error" ? (
        <div id="survey-submit-error" role="alert" tabIndex={-1} className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">We Couldn&apos;t Submit Your Information</p>
              <p className="mt-1 text-sm">{serverMessage || "Please check your details and try again."}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="full_name">Full Name <span aria-hidden>*</span></Label>
          <Input id="full_name" autoComplete="name" placeholder="Enter your full name" maxLength={120} aria-invalid={Boolean(errors.full_name)} aria-describedby={errors.full_name ? "full-name-error" : undefined} className={inputClass} {...register("full_name")} />
          <ErrorMessage id="full-name-error" message={errors.full_name?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_number">Contact Number <span aria-hidden>*</span></Label>
          <Input id="contact_number" type="tel" inputMode="tel" autoComplete="tel" placeholder="Enter your contact number" maxLength={30} aria-invalid={Boolean(errors.contact_number)} aria-describedby={errors.contact_number ? "contact-number-error" : undefined} className={inputClass} {...register("contact_number")} />
          <ErrorMessage id="contact-number-error" message={errors.contact_number?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address <span aria-hidden>*</span></Label>
          <Input id="email" type="email" inputMode="email" autoComplete="email" placeholder="Enter your email address" maxLength={254} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} className={inputClass} {...register("email")} />
          <ErrorMessage id="email-error" message={errors.email?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="member_category">Which category best describes you? <span aria-hidden>*</span></Label>
          <Controller
            name="member_category"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? null} onValueChange={field.onChange}>
                <SelectTrigger id="member_category" aria-invalid={Boolean(errors.member_category)} aria-describedby={errors.member_category ? "member-category-error" : undefined} className="h-11 w-full rounded-xl border-brand-border bg-white px-3">
                  <SelectValue placeholder="Select your category" />
                </SelectTrigger>
                <SelectContent>
                  {memberCategories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <ErrorMessage id="member-category-error" message={errors.member_category?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="business_or_idea_name">Business, Startup, or Idea Name <span aria-hidden>*</span></Label>
          <Input id="business_or_idea_name" autoComplete="organization" placeholder="Enter the name of your business, startup, or idea" maxLength={160} aria-invalid={Boolean(errors.business_or_idea_name)} aria-describedby={errors.business_or_idea_name ? "business-name-error" : undefined} className={inputClass} {...register("business_or_idea_name")} />
          <ErrorMessage id="business-name-error" message={errors.business_or_idea_name?.message} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-end justify-between gap-3">
            <Label htmlFor="description">Tell Us About Your Business or Idea <span aria-hidden>*</span></Label>
            <span className="shrink-0 text-xs text-brand-muted" aria-live="polite">{description.length}/3000</span>
          </div>
          <Textarea id="description" rows={7} maxLength={3000} placeholder="Briefly describe what your business does, what your startup is building, or what idea you are planning to develop." aria-invalid={Boolean(errors.description)} aria-describedby={`description-help${errors.description ? " description-error" : ""}`} className="min-h-36 resize-y rounded-xl border-brand-border bg-white px-3 py-3" {...register("description")} />
          <p id="description-help" className="text-xs text-brand-muted">Please do not include passwords, payment details, or unrelated sensitive information.</p>
          <ErrorMessage id="description-error" message={errors.description?.message} />
        </div>
      </div>

      <div className="rounded-2xl border border-brand-border bg-brand-cloud/70 p-4">
        <label htmlFor="consent" className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-brand-secondary">
          <input id="consent" type="checkbox" className="mt-1 size-4 shrink-0 accent-brand-ink" aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consent-error" : undefined} {...register("consent")} />
          <span>
            I understand that Coimbatore Startup Community will use the information I provide to review my submission and communicate with me about relevant CSC community activities, as described in the{" "}
            <Link href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-brand-ink underline underline-offset-4">Privacy Policy</Link>.
          </span>
        </label>
        <ErrorMessage id="consent-error" message={errors.consent?.message} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl text-sm font-semibold sm:text-base">
        {isSubmitting ? <><LoaderCircle className="size-5 animate-spin" aria-hidden />Submitting Your Information...</> : "Submit Information"}
      </Button>
    </form>
  );
}
