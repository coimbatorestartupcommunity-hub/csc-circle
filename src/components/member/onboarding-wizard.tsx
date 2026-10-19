"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { memberRequest } from "@/lib/services/member/request";
import {
  designationOptions,
  goalOptions,
} from "@/lib/content/member-taxonomy";
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep4Schema,
  onboardingStep5Schema,
} from "@/lib/validations/member";

const steps = [
  "Personal",
  "Role",
  "Startup",
  "Goals",
  "Consent",
] as const;

interface Data {
  fullName: string;
  displayName: string;
  email: string;
  whatsapp: string;
  city: string;
  designations: string[];
  startupName: string;
  startupWebsite: string;
  startupDescription: string;
  goals: string[];
  membershipTerms: boolean;
  operationalEmail: boolean;
  marketingEmail: boolean;
  directoryParticipation: boolean;
  displayNamePublicly: boolean;
  displayPhotoPublicly: boolean;
}

const initial: Data = {
  fullName: "",
  displayName: "",
  email: "",
  whatsapp: "",
  city: "",
  designations: [],
  startupName: "",
  startupWebsite: "",
  startupDescription: "",
  goals: [],
  membershipTerms: false,
  operationalEmail: true,
  marketingEmail: false,
  directoryParticipation: false,
  displayNamePublicly: false,
  displayPhotoPublicly: false,
};

function Chips({
  options,
  value,
  onToggle,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              on
                ? "bg-brand-ink text-brand-white"
                : "bg-brand-white text-brand-secondary ring-1 ring-brand-border hover:text-brand-ink",
            )}
          >
            {on ? <Check className="size-3.5" /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function OnboardingWizard({ isDemo }: { isDemo: boolean }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState<Data>(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const set = <K extends keyof Data>(k: K, v: Data[K]) =>
    setData((d) => ({ ...d, [k]: v }));
  const toggle = (k: "designations" | "goals", v: string) =>
    setData((d) => ({
      ...d,
      [k]: d[k].includes(v) ? d[k].filter((x) => x !== v) : [...d[k], v],
    }));

  function validateStep(): boolean {
    let schema;
    let payload: Record<string, unknown>;
    if (step === 0) {
      schema = onboardingStep1Schema;
      payload = {
        fullName: data.fullName,
        displayName: data.displayName,
        email: data.email,
        whatsapp: data.whatsapp,
        city: data.city,
      };
    } else if (step === 1) {
      schema = onboardingStep2Schema;
      payload = { designations: data.designations };
    } else if (step === 3) {
      schema = onboardingStep4Schema;
      payload = { goals: data.goals };
    } else if (step === 4) {
      schema = onboardingStep5Schema;
      payload = {
        membershipTerms: data.membershipTerms,
        operationalEmail: data.operationalEmail,
        marketingEmail: data.marketingEmail,
        directoryParticipation: data.directoryParticipation,
        displayNamePublicly: data.displayNamePublicly,
        displayPhotoPublicly: data.displayPhotoPublicly,
      };
    } else {
      return true; // step 2 (startup) is optional
    }
    const result = schema.safeParse(payload);
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const k = String(issue.path[0] ?? "form");
      if (!next[k]) next[k] = issue.message;
    }
    setErrors(next);
    return false;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  async function finish() {
    if (!validateStep()) return;
    setSaving(true);
    try {
      const result = await memberRequest("onboarding", data);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Welcome! Your profile is set up.");
      router.push("/member/claim");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Progress */}
      <ol className="mb-6 flex items-center gap-2">
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                i < step
                  ? "bg-green-500 text-white"
                  : i === step
                    ? "bg-brand-ink text-brand-white"
                    : "bg-brand-cloud text-brand-muted",
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </div>
            <span className="hidden text-[11px] text-brand-muted sm:block">{label}</span>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border sm:p-8">
        {step === 0 ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-brand-ink">Personal information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="o-full">Full name</FieldLabel>
                <Input id="o-full" value={data.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={!!errors.fullName} />
                {errors.fullName ? <FieldError>{errors.fullName}</FieldError> : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="o-disp">Public display name</FieldLabel>
                <Input id="o-disp" value={data.displayName} onChange={(e) => set("displayName", e.target.value)} aria-invalid={!!errors.displayName} />
                {errors.displayName ? <FieldError>{errors.displayName}</FieldError> : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="o-email">Email address</FieldLabel>
                <Input id="o-email" type="email" value={data.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} />
                {errors.email ? <FieldError>{errors.email}</FieldError> : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="o-wa">WhatsApp number</FieldLabel>
                <Input id="o-wa" type="tel" value={data.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} aria-invalid={!!errors.whatsapp} />
                {errors.whatsapp ? <FieldError>{errors.whatsapp}</FieldError> : null}
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="o-city">City</FieldLabel>
                <Input id="o-city" value={data.city} onChange={(e) => set("city", e.target.value)} aria-invalid={!!errors.city} />
                {errors.city ? <FieldError>{errors.city}</FieldError> : null}
              </Field>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-brand-ink">What best describes you?</h2>
            <p className="text-sm text-brand-muted">Select all that apply.</p>
            <Chips options={designationOptions} value={data.designations} onToggle={(v) => toggle("designations", v)} />
            {errors.designations ? <FieldError>{errors.designations}</FieldError> : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-brand-ink">Startup details</h2>
            <p className="text-sm text-brand-muted">Optional — skip if you don&apos;t have a startup yet.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="o-sn">Startup name</FieldLabel>
                <Input id="o-sn" value={data.startupName} onChange={(e) => set("startupName", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="o-sw">Website</FieldLabel>
                <Input id="o-sw" placeholder="https://" value={data.startupWebsite} onChange={(e) => set("startupWebsite", e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="o-sd">Description</FieldLabel>
              <Textarea id="o-sd" rows={3} value={data.startupDescription} onChange={(e) => set("startupDescription", e.target.value)} />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-brand-ink">
              What are you looking to achieve through CSC?
            </h2>
            <Chips options={goalOptions} value={data.goals} onToggle={(v) => toggle("goals", v)} />
            {errors.goals ? <FieldError>{errors.goals}</FieldError> : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-brand-ink">Privacy & confirmation</h2>
            {(
              [
                ["membershipTerms", "I accept the CSC membership terms.", true],
                ["operationalEmail", "Send me operational emails about my membership and events.", false],
                ["marketingEmail", "Send me occasional community updates (optional).", false],
                ["directoryParticipation", "Include me in the public founder directory.", false],
                ["displayNamePublicly", "Display my name publicly.", false],
                ["displayPhotoPublicly", "Display my photo publicly.", false],
              ] as const
            ).map(([key, label, required]) => (
              <label key={key} className="flex items-start gap-3 text-sm text-brand-secondary">
                <input
                  type="checkbox"
                  checked={data[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--brand-accent)]"
                />
                <span>
                  {label}
                  {required ? <span className="text-brand-accent"> *</span> : null}
                </span>
              </label>
            ))}
            {errors.membershipTerms ? <FieldError>{errors.membershipTerms}</FieldError> : null}
          </div>
        ) : null}

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="h-10 gap-1.5"
          >
            <ChevronLeft className="size-4" /> Back
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={nextStep} className="h-10 gap-1.5">
              {step === 2 ? "Continue" : "Next"} <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" onClick={finish} disabled={saving} className="h-10 gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Complete setup
            </Button>
          )}
        </div>
      </div>

      {isDemo ? (
        <p className="mt-4 text-center text-xs text-brand-muted">
          DEMO preview — onboarding is fully interactive; saving requires a real
          signed-in account.
        </p>
      ) : null}
    </div>
  );
}
