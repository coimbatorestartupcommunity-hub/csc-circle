"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch, type DefaultValues } from "react-hook-form";
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  businessConnectionOptions,
  businessTeamSizes,
  discoverySources,
  ideaSupportOptions,
  industrySectors,
  memberCategories,
  memberSurveyFieldsSchema,
  preferredContactMethods,
  sanitizeMemberSurveyValues,
  seekingCofounderOptions,
  stagesForCategory,
  startupSupportOptions,
  startupTeamStructures,
  supportNeededOptions,
  type MemberCategory,
  type MemberSurveyFields,
  type MemberSurveyFieldsOutput,
} from "@/lib/community-data/schema";
import { submitMemberSurvey } from "./actions";

const inputClass = "h-11 rounded-xl border-brand-border bg-white px-3";
const selectClass = "h-11 w-full min-w-0 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-ink transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const checkboxClass = "mt-0.5 size-4 shrink-0 accent-brand-ink";
const optionCardClass = "flex cursor-pointer items-start gap-2.5 rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm leading-5 text-brand-ink transition-colors hover:border-brand-accent has-checked:border-brand-accent has-checked:bg-brand-cloud/60";

function ErrorMessage({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className="text-xs font-medium text-red-700">{message}</p>;
}

function SectionHeading({ id, step, title, hint }: { id: string; step: string; title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-ink text-xs font-bold text-white">{step}</span>
        <h2 id={id} className="text-base font-bold text-brand-ink sm:text-lg">{title}</h2>
      </div>
      {hint ? <p className="mt-1.5 pl-[2.625rem] text-xs leading-5 text-brand-muted sm:text-sm">{hint}</p> : null}
    </div>
  );
}

const descriptionPlaceholders: Record<MemberCategory | "none", string> = {
  none: "Describe your business, startup, or idea.",
  "Established Business": "Describe the products or services your business offers, your target customers, and what makes your business unique.",
  "Startup Founder": "What problem is your startup solving, who are your target users, and what are you currently building?",
  "Idea Stage": "Describe your idea, the problem you want to solve, and who might benefit from your solution.",
};

const stageLabels: Record<MemberCategory, string> = {
  "Established Business": "What is your current business stage?",
  "Startup Founder": "What is your current startup stage?",
  "Idea Stage": "Have you started developing your idea?",
};

const DEFAULT_VALUES: DefaultValues<MemberSurveyFields> = {
  full_name: "",
  contact_number: "",
  email: "",
  city: "",
  member_category: undefined,
  business_or_idea_name: "",
  industry_sector: undefined,
  industry_other: "",
  current_stage: undefined,
  description: "",
  support_needed: [],
  support_needed_other: "",
  biggest_challenge: "",
  website_url: "",
  linkedin_url: "",
  portfolio_url: "",
  discovery_source: undefined,
  discovery_source_other: "",
  preferred_contact_method: undefined,
  established_year: "",
  business_team_size: undefined,
  business_connections: [],
  business_connections_other: "",
  startup_team_structure: undefined,
  startup_support: [],
  startup_support_other: "",
  startup_current_focus: "",
  seeking_cofounder: undefined,
  idea_support: [],
  idea_support_other: "",
  idea_problem_statement: "",
  consent: false,
};

type ArrayFieldName = "support_needed" | "business_connections" | "startup_support" | "idea_support";
type OtherFieldName = "support_needed_other" | "business_connections_other" | "startup_support_other" | "idea_support_other";
type SelectFieldName = "business_team_size" | "startup_team_structure" | "seeking_cofounder" | "preferred_contact_method";

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
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<MemberSurveyFields, unknown, MemberSurveyFieldsOutput>({
    resolver: zodResolver(memberSurveyFieldsSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });
  const category = useWatch({ control, name: "member_category" });
  const industry = useWatch({ control, name: "industry_sector" });
  const discovery = useWatch({ control, name: "discovery_source" });
  const description = useWatch({ control, name: "description" }) ?? "";
  const biggestChallenge = useWatch({ control, name: "biggest_challenge" }) ?? "";
  const startupFocus = useWatch({ control, name: "startup_current_focus" }) ?? "";
  const problemStatement = useWatch({ control, name: "idea_problem_statement" }) ?? "";
  const supportNeeded = useWatch({ control, name: "support_needed" }) ?? [];
  const businessConnections = useWatch({ control, name: "business_connections" }) ?? [];
  const startupSupport = useWatch({ control, name: "startup_support" }) ?? [];
  const ideaSupport = useWatch({ control, name: "idea_support" }) ?? [];
  const stageOptions = category ? stagesForCategory[category] : [];

  function clearCategoryFields(next: MemberCategory | undefined) {
    if (next !== "Established Business") {
      setValue("established_year", "", { shouldValidate: false });
      setValue("business_team_size", undefined, { shouldValidate: false });
      setValue("business_connections", [], { shouldValidate: false });
      setValue("business_connections_other", "", { shouldValidate: false });
      clearErrors(["established_year", "business_team_size", "business_connections", "business_connections_other"]);
    }
    if (next !== "Startup Founder") {
      setValue("startup_team_structure", undefined, { shouldValidate: false });
      setValue("startup_support", [], { shouldValidate: false });
      setValue("startup_support_other", "", { shouldValidate: false });
      setValue("startup_current_focus", "", { shouldValidate: false });
      clearErrors(["startup_team_structure", "startup_support", "startup_support_other", "startup_current_focus"]);
    }
    if (next !== "Idea Stage") {
      setValue("seeking_cofounder", undefined, { shouldValidate: false });
      setValue("idea_support", [], { shouldValidate: false });
      setValue("idea_support_other", "", { shouldValidate: false });
      setValue("idea_problem_statement", "", { shouldValidate: false });
      clearErrors(["seeking_cofounder", "idea_support", "idea_support_other", "idea_problem_statement"]);
    }
  }

  function handleCategoryChange(next: MemberCategory | undefined) {
    setValue("member_category", next as MemberSurveyFields["member_category"], { shouldValidate: false, shouldDirty: true });
    clearErrors("member_category");
    const stage = getValues("current_stage");
    if (stage && (!next || !stagesForCategory[next].includes(stage))) {
      setValue("current_stage", undefined as unknown as MemberSurveyFields["current_stage"], { shouldValidate: false });
      clearErrors("current_stage");
    }
    clearCategoryFields(next);
  }

  function checkboxGroup(name: ArrayFieldName, otherName: OtherFieldName, options: readonly string[], errorId: string) {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const selected = (field.value ?? []) as string[];
          return (
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-describedby={errors[name] ? errorId : undefined}>
              {options.map((option) => {
                const checked = selected.includes(option);
                return (
                  <label key={option} className={optionCardClass}>
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={checked}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...selected, option]
                          : selected.filter((item) => item !== option);
                        field.onChange(next);
                        if (option === "Other" && !event.target.checked) {
                          setValue(otherName, "", { shouldValidate: false });
                          clearErrors(otherName);
                        }
                      }}
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          );
        }}
      />
    );
  }

  function selectField(name: SelectFieldName, id: string, placeholder: string, options: readonly string[], errorId: string) {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <select
            id={id}
            aria-invalid={Boolean(errors[name])}
            aria-describedby={errors[name] ? errorId : undefined}
            className={selectClass}
            value={field.value ?? ""}
            onChange={(event) => field.onChange(event.target.value || undefined)}
            onBlur={field.onBlur}
          >
            <option value="">{placeholder}</option>
            {options.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        )}
      />
    );
  }

  // react-hook-form invokes this callback only for a submit event. These refs
  // deliberately hold anti-replay metadata that is independent of rendering.
  // eslint-disable-next-line react-hooks/refs
  const submit = handleSubmit(async (values) => {
    setStatus("form");
    setServerMessage("");
    const payload = sanitizeMemberSurveyValues({
      ...values,
      submission_token: submissionToken.current ?? crypto.randomUUID(),
      form_started_at: formStartedAt.current,
      website: "",
    });
    const result = await submitMemberSurvey(payload);
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
    <form onSubmit={submit} noValidate className="space-y-8" aria-describedby={status === "error" ? "survey-submit-error" : undefined}>
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

      <section aria-labelledby="survey-section-personal" className="space-y-5">
        <SectionHeading id="survey-section-personal" step="1" title="Personal Information" hint="Tell us who you are and where you are based." />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="full_name">Full Name <span aria-hidden>*</span></Label>
            <Input id="full_name" autoComplete="name" placeholder="Enter your full name" maxLength={120} aria-invalid={Boolean(errors.full_name)} aria-describedby={errors.full_name ? "full-name-error" : undefined} className={inputClass} {...register("full_name")} />
            <ErrorMessage id="full-name-error" message={errors.full_name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_number">Contact Number <span aria-hidden>*</span></Label>
            <Input id="contact_number" type="tel" inputMode="tel" autoComplete="tel" placeholder="eg: +91 98765 43210" maxLength={30} aria-invalid={Boolean(errors.contact_number)} aria-describedby={errors.contact_number ? "contact-number-error" : undefined} className={inputClass} {...register("contact_number")} />
            <ErrorMessage id="contact-number-error" message={errors.contact_number?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address <span aria-hidden>*</span></Label>
            <Input id="email" type="email" inputMode="email" autoComplete="email" placeholder="eg: name@example.com" maxLength={254} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} className={inputClass} {...register("email")} />
            <ErrorMessage id="email-error" message={errors.email?.message} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="city">City / Location <span aria-hidden>*</span></Label>
            <Input id="city" autoComplete="address-level2" placeholder="Enter your city (eg: Coimbatore)" maxLength={120} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "city-error" : undefined} className={inputClass} {...register("city")} />
            <ErrorMessage id="city-error" message={errors.city?.message} />
          </div>
        </div>
      </section>

      <section aria-labelledby="survey-section-business" className="space-y-5">
        <SectionHeading id="survey-section-business" step="2" title="Business, Startup or Idea Information" hint="Choose the category that fits you best — the rest of the form adapts immediately." />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="member_category">Which category best describes you? <span aria-hidden>*</span></Label>
            <Controller
              name="member_category"
              control={control}
              render={({ field }) => (
                <select
                  id="member_category"
                  aria-invalid={Boolean(errors.member_category)}
                  aria-describedby={errors.member_category ? "member-category-error" : undefined}
                  className={selectClass}
                  value={field.value ?? ""}
                  onChange={(event) => handleCategoryChange((event.target.value || undefined) as MemberCategory | undefined)}
                  onBlur={field.onBlur}
                >
                  <option value="">Select your category</option>
                  {memberCategories.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              )}
            />
            <ErrorMessage id="member-category-error" message={errors.member_category?.message} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="business_or_idea_name">Business, Startup, or Idea Name <span aria-hidden>*</span></Label>
            <Input id="business_or_idea_name" autoComplete="organization" placeholder="Enter your business name or a working name for your idea" maxLength={160} aria-invalid={Boolean(errors.business_or_idea_name)} aria-describedby={errors.business_or_idea_name ? "business-name-error" : undefined} className={inputClass} {...register("business_or_idea_name")} />
            <ErrorMessage id="business-name-error" message={errors.business_or_idea_name?.message} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="industry_sector">Which industry or sector are you involved in? <span aria-hidden>*</span></Label>
            <Controller
              name="industry_sector"
              control={control}
              render={({ field }) => (
                <select
                  id="industry_sector"
                  aria-invalid={Boolean(errors.industry_sector)}
                  aria-describedby={errors.industry_sector ? "industry-error" : undefined}
                  className={selectClass}
                  value={field.value ?? ""}
                  onChange={(event) => {
                    field.onChange(event.target.value || undefined);
                    if (event.target.value !== "Other") {
                      setValue("industry_other", "", { shouldValidate: false });
                      clearErrors("industry_other");
                    }
                  }}
                  onBlur={field.onBlur}
                >
                  <option value="">Select your industry or sector</option>
                  {industrySectors.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              )}
            />
            <ErrorMessage id="industry-error" message={errors.industry_sector?.message} />
          </div>
          {industry === "Other" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="industry_other">Please Specify Your Industry <span aria-hidden>*</span></Label>
              <Input id="industry_other" placeholder="Enter your industry or sector" maxLength={120} aria-invalid={Boolean(errors.industry_other)} aria-describedby={errors.industry_other ? "industry-other-error" : undefined} className={inputClass} {...register("industry_other")} />
              <ErrorMessage id="industry-other-error" message={errors.industry_other?.message} />
            </div>
          ) : null}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="current_stage">{category ? stageLabels[category] : "Current Stage"} <span aria-hidden>*</span></Label>
            <Controller
              name="current_stage"
              control={control}
              render={({ field }) => (
                <select
                  id="current_stage"
                  aria-invalid={Boolean(errors.current_stage)}
                  aria-describedby={errors.current_stage ? "current-stage-error" : undefined}
                  className={selectClass}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value || undefined)}
                  onBlur={field.onBlur}
                >
                  <option value="">{category ? `Select your stage as ${category === "Idea Stage" ? "an idea-stage member" : category === "Startup Founder" ? "a startup founder" : "an established business"}` : "Select your category first"}</option>
                  {stageOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              )}
            />
            <ErrorMessage id="current-stage-error" message={errors.current_stage?.message} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-end justify-between gap-3">
              <Label htmlFor="description">Tell Us About Your Business or Idea <span aria-hidden>*</span></Label>
              <span className="shrink-0 text-xs text-brand-muted" aria-live="polite">{description.length}/1000</span>
            </div>
            <Textarea id="description" rows={7} maxLength={1000} placeholder={descriptionPlaceholders[category ?? "none"]} aria-invalid={Boolean(errors.description)} aria-describedby={`description-help${errors.description ? " description-error" : ""}`} className="min-h-36 resize-y rounded-xl border-brand-border bg-white px-3 py-3" {...register("description")} />
            <p id="description-help" className="text-xs text-brand-muted">A brief overview of your idea is enough. Please do not include passwords, payment details, or unrelated sensitive information.</p>
            <ErrorMessage id="description-error" message={errors.description?.message} />
          </div>
        </div>
      </section>

      <section aria-labelledby="survey-section-category" className="space-y-5">
        <SectionHeading id="survey-section-category" step="3" title="Category-Specific Questions" hint="A few questions specific to your stage. These are optional unless marked otherwise." />
        {!category ? (
          <p className="rounded-2xl border border-dashed border-brand-border bg-brand-cloud/50 p-4 text-sm leading-6 text-brand-secondary">
            Select your member category to view questions relevant to your business or idea.
          </p>
        ) : null}
        {category === "Established Business" ? (
          <div className="grid gap-5 transition-opacity duration-200 sm:grid-cols-2">
            <h3 className="text-sm font-bold text-brand-ink sm:col-span-2">Tell Us More About Your Business</h3>
            <div className="space-y-2">
              <Label htmlFor="established_year">In which year was your business established?</Label>
              <Input id="established_year" inputMode="numeric" autoComplete="off" placeholder="e.g., 2019" maxLength={4} aria-invalid={Boolean(errors.established_year)} aria-describedby={errors.established_year ? "established-year-error" : undefined} className={inputClass} {...register("established_year")} />
              <ErrorMessage id="established-year-error" message={errors.established_year?.message} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="business_team_size">How many people are currently working in your business?</Label>
              {selectField("business_team_size", "business_team_size", "Select your team size", businessTeamSizes, "business-team-size-error")}
              <ErrorMessage id="business-team-size-error" message={errors.business_team_size?.message} />
            </div>
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-sm font-medium text-brand-ink">What type of business connections are you looking for?</legend>
              {checkboxGroup("business_connections", "business_connections_other", businessConnectionOptions, "business-connections-error")}
              <ErrorMessage id="business-connections-error" message={errors.business_connections?.message} />
            </fieldset>
            {businessConnections.includes("Other") ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="business_connections_other">Other connections you are looking for</Label>
                <Input id="business_connections_other" placeholder="Describe the connections you need" maxLength={200} aria-invalid={Boolean(errors.business_connections_other)} aria-describedby={errors.business_connections_other ? "business-connections-other-error" : undefined} className={inputClass} {...register("business_connections_other")} />
                <ErrorMessage id="business-connections-other-error" message={errors.business_connections_other?.message} />
              </div>
            ) : null}
          </div>
        ) : null}
        {category === "Startup Founder" ? (
          <div className="grid gap-5 transition-opacity duration-200 sm:grid-cols-2">
            <h3 className="text-sm font-bold text-brand-ink sm:col-span-2">Tell Us More About Your Startup</h3>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="startup_team_structure">Do you currently have a startup team?</Label>
              {selectField("startup_team_structure", "startup_team_structure", "Select your current team structure", startupTeamStructures, "startup-team-structure-error")}
              <ErrorMessage id="startup-team-structure-error" message={errors.startup_team_structure?.message} />
            </div>
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-sm font-medium text-brand-ink">What support would help your startup most?</legend>
              {checkboxGroup("startup_support", "startup_support_other", startupSupportOptions, "startup-support-error")}
              <ErrorMessage id="startup-support-error" message={errors.startup_support?.message} />
            </fieldset>
            {startupSupport.includes("Other") ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="startup_support_other">Other startup support you need</Label>
                <Input id="startup_support_other" placeholder="Describe the support you need" maxLength={200} aria-invalid={Boolean(errors.startup_support_other)} aria-describedby={errors.startup_support_other ? "startup-support-other-error" : undefined} className={inputClass} {...register("startup_support_other")} />
                <ErrorMessage id="startup-support-other-error" message={errors.startup_support_other?.message} />
              </div>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-end justify-between gap-3">
                <Label htmlFor="startup_current_focus">What are you currently working on?</Label>
                <span className="shrink-0 text-xs text-brand-muted" aria-live="polite">{startupFocus.length}/1000</span>
              </div>
              <Textarea id="startup_current_focus" rows={4} maxLength={1000} placeholder="Tell us about your current product, MVP, launch, customer validation, or growth activities." aria-invalid={Boolean(errors.startup_current_focus)} aria-describedby={errors.startup_current_focus ? "startup-focus-error" : undefined} className="min-h-28 resize-y rounded-xl border-brand-border bg-white px-3 py-3" {...register("startup_current_focus")} />
              <ErrorMessage id="startup-focus-error" message={errors.startup_current_focus?.message} />
            </div>
          </div>
        ) : null}
        {category === "Idea Stage" ? (
          <div className="grid gap-5 transition-opacity duration-200 sm:grid-cols-2">
            <h3 className="text-sm font-bold text-brand-ink sm:col-span-2">Tell Us More About Your Idea</h3>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="seeking_cofounder">Are you looking for a co-founder or team?</Label>
              {selectField("seeking_cofounder", "seeking_cofounder", "Select an option", seekingCofounderOptions, "seeking-cofounder-error")}
              <ErrorMessage id="seeking-cofounder-error" message={errors.seeking_cofounder?.message} />
            </div>
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-sm font-medium text-brand-ink">What would help you move forward with your idea?</legend>
              {checkboxGroup("idea_support", "idea_support_other", ideaSupportOptions, "idea-support-error")}
              <ErrorMessage id="idea-support-error" message={errors.idea_support?.message} />
            </fieldset>
            {ideaSupport.includes("Other") ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="idea_support_other">Other idea support you need</Label>
                <Input id="idea_support_other" placeholder="Describe the support you need" maxLength={200} aria-invalid={Boolean(errors.idea_support_other)} aria-describedby={errors.idea_support_other ? "idea-support-other-error" : undefined} className={inputClass} {...register("idea_support_other")} />
                <ErrorMessage id="idea-support-other-error" message={errors.idea_support_other?.message} />
              </div>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-end justify-between gap-3">
                <Label htmlFor="idea_problem_statement">What problem are you hoping to solve?</Label>
                <span className="shrink-0 text-xs text-brand-muted" aria-live="polite">{problemStatement.length}/1000</span>
              </div>
              <Textarea id="idea_problem_statement" rows={4} maxLength={1000} placeholder="Describe the problem you have identified and why you believe solving it would be valuable." aria-invalid={Boolean(errors.idea_problem_statement)} aria-describedby={errors.idea_problem_statement ? "idea-problem-error" : undefined} className="min-h-28 resize-y rounded-xl border-brand-border bg-white px-3 py-3" {...register("idea_problem_statement")} />
              <ErrorMessage id="idea-problem-error" message={errors.idea_problem_statement?.message} />
            </div>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="survey-section-support" className="space-y-5">
        <SectionHeading id="survey-section-support" step="4" title="Community Interests & Support Requirements" hint="Select every area where the CSC community could help you." />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-brand-ink">What support are you looking for from CSC Circle? <span aria-hidden>*</span></legend>
          {checkboxGroup("support_needed", "support_needed_other", supportNeededOptions, "support-needed-error")}
          <ErrorMessage id="support-needed-error" message={errors.support_needed?.message} />
        </fieldset>
        {supportNeeded.includes("Other") ? (
          <div className="space-y-2">
            <Label htmlFor="support_needed_other">Other support you need</Label>
            <Input id="support_needed_other" placeholder="Describe the support you need" maxLength={200} aria-invalid={Boolean(errors.support_needed_other)} aria-describedby={errors.support_needed_other ? "support-needed-other-error" : undefined} className={inputClass} {...register("support_needed_other")} />
            <ErrorMessage id="support-needed-other-error" message={errors.support_needed_other?.message} />
          </div>
        ) : null}
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <Label htmlFor="biggest_challenge">What is your biggest current challenge?</Label>
            <span className="shrink-0 text-xs text-brand-muted" aria-live="polite">{biggestChallenge.length}/1000</span>
          </div>
          <Textarea id="biggest_challenge" rows={4} maxLength={1000} placeholder="Tell us about the biggest challenge you are facing in your business, startup, or entrepreneurial journey." aria-invalid={Boolean(errors.biggest_challenge)} aria-describedby={errors.biggest_challenge ? "biggest-challenge-error" : undefined} className="min-h-28 resize-y rounded-xl border-brand-border bg-white px-3 py-3" {...register("biggest_challenge")} />
          <ErrorMessage id="biggest-challenge-error" message={errors.biggest_challenge?.message} />
        </div>
      </section>

      <section aria-labelledby="survey-section-additional" className="space-y-5">
        <SectionHeading id="survey-section-additional" step="5" title="Additional Information" hint="Optional details that help us reach you and understand how you found CSC." />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="website_url">Website</Label>
            <Input id="website_url" type="url" inputMode="url" autoComplete="url" placeholder="https://yourwebsite.com" maxLength={2048} aria-invalid={Boolean(errors.website_url)} aria-describedby={errors.website_url ? "website-url-error" : undefined} className={inputClass} {...register("website_url")} />
            <ErrorMessage id="website-url-error" message={errors.website_url?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn</Label>
            <Input id="linkedin_url" type="url" inputMode="url" autoComplete="url" placeholder="https://linkedin.com/in/yourprofile" maxLength={2048} aria-invalid={Boolean(errors.linkedin_url)} aria-describedby={errors.linkedin_url ? "linkedin-url-error" : undefined} className={inputClass} {...register("linkedin_url")} />
            <ErrorMessage id="linkedin-url-error" message={errors.linkedin_url?.message} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="portfolio_url">Portfolio</Label>
            <Input id="portfolio_url" type="url" inputMode="url" autoComplete="url" placeholder="https://yourportfolio.com" maxLength={2048} aria-invalid={Boolean(errors.portfolio_url)} aria-describedby={errors.portfolio_url ? "portfolio-url-error" : undefined} className={inputClass} {...register("portfolio_url")} />
            <ErrorMessage id="portfolio-url-error" message={errors.portfolio_url?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discovery_source">How did you hear about Coimbatore Startup Community?</Label>
            <Controller
              name="discovery_source"
              control={control}
              render={({ field }) => (
                <select
                  id="discovery_source"
                  aria-invalid={Boolean(errors.discovery_source)}
                  aria-describedby={errors.discovery_source ? "discovery-source-error" : undefined}
                  className={selectClass}
                  value={field.value ?? ""}
                  onChange={(event) => {
                    field.onChange(event.target.value || undefined);
                    if (event.target.value !== "Other") {
                      setValue("discovery_source_other", "", { shouldValidate: false });
                      clearErrors("discovery_source_other");
                    }
                  }}
                  onBlur={field.onBlur}
                >
                  <option value="">Select an option</option>
                  {discoverySources.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              )}
            />
            <ErrorMessage id="discovery-source-error" message={errors.discovery_source?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_contact_method">How would you prefer CSC Circle to contact you?</Label>
            {selectField("preferred_contact_method", "preferred_contact_method", "Select your preferred contact method", preferredContactMethods, "preferred-contact-error")}
            <ErrorMessage id="preferred-contact-error" message={errors.preferred_contact_method?.message} />
          </div>
          {discovery === "Other" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="discovery_source_other">Please tell us how you heard about CSC</Label>
              <Input id="discovery_source_other" placeholder="Describe how you found us" maxLength={200} aria-invalid={Boolean(errors.discovery_source_other)} aria-describedby={errors.discovery_source_other ? "discovery-source-other-error" : undefined} className={inputClass} {...register("discovery_source_other")} />
              <ErrorMessage id="discovery-source-other-error" message={errors.discovery_source_other?.message} />
            </div>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="survey-section-privacy" className="space-y-5">
        <SectionHeading id="survey-section-privacy" step="6" title="Privacy Consent & Submission" />
        <h3 className="text-sm font-bold text-brand-ink">Your Information & Privacy</h3>
        <p className="text-sm leading-6 text-brand-secondary">
          Your information will be reviewed by authorized CSC Circle administrators and used for community-related engagement. Submitting this form does not automatically create a CSC membership account or guarantee access to particular opportunities.
        </p>
        <div className="rounded-2xl border border-brand-border bg-brand-cloud/70 p-4">
          <label htmlFor="consent" className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-brand-secondary">
            <input id="consent" type="checkbox" className="mt-1 size-4 shrink-0 accent-brand-ink" aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consent-error" : undefined} {...register("consent")} />
            <span>
              I understand that Coimbatore Startup Community will use the information I provide to review my submission and communicate with me about relevant community activities, as described in the{" "}
              <Link href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-brand-ink underline underline-offset-4">Privacy Policy</Link>.
            </span>
          </label>
          <ErrorMessage id="consent-error" message={errors.consent?.message} />
        </div>
        <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl text-sm font-semibold sm:text-base">
          {isSubmitting ? <><LoaderCircle className="size-5 animate-spin" aria-hidden />Submitting Your Information...</> : "Submit Information"}
        </Button>
      </section>
    </form>
  );
}
