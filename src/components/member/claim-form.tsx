"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { memberRequest } from "@/lib/services/member/request";
import { claimSchema, type ClaimFormValues } from "@/lib/validations/member";
import { designationOptions } from "@/lib/content/member-taxonomy";
import { notifySubmissionSuccess } from "@/lib/ui/submission-feedback";

export function ClaimForm({ isDemo }: { isDemo: boolean }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      fullName: "",
      linkedAccountEmail: "",
      applicantType: "new_applicant",
      reference: "",
      whatsapp: "",
      designation: undefined,
      designationOther: "",
      startupAffiliation: "",
      declarationAccurate: false as unknown as true,
    },
  });
  const selectedDesignation = useWatch({ control, name: "designation" });
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(values: ClaimFormValues) {
    setSubmitting(true);
    try {
      const result = await memberRequest("claim", values);
      if (result.error) { toast.error(result.error); return; }
      notifySubmissionSuccess({ title: "Successfully submitted", message: "Your membership claim has been sent to CSC for review." });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border sm:p-8"
    >
      <div className="flex items-start gap-3 rounded-2xl bg-brand-blue/60 p-4 text-sm text-brand-ink">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-accent" aria-hidden />
        <p>
          Membership claims are reviewed by CSC administrators. Submitting a
          claim does not grant membership until it is verified and approved.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="c-full">Full name</FieldLabel>
          <Input id="c-full" {...register("fullName")} aria-invalid={!!errors.fullName} />
          {errors.fullName ? <FieldError>{errors.fullName.message}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="c-email">Linked account email</FieldLabel>
          <Input id="c-email" type="email" {...register("linkedAccountEmail")} aria-invalid={!!errors.linkedAccountEmail} />
          {errors.linkedAccountEmail ? <FieldError>{errors.linkedAccountEmail.message}</FieldError> : null}
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="c-type">Are you an existing member or new applicant?</FieldLabel>
        <Controller
          control={control}
          name="applicantType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
              <SelectTrigger id="c-type" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing_member">Existing CSC member</SelectItem>
                <SelectItem value="new_applicant">New applicant</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="c-ref">Invitation / membership reference (optional)</FieldLabel>
          <Input id="c-ref" {...register("reference")} />
        </Field>
        <Field>
          <FieldLabel htmlFor="c-wa">WhatsApp number used in the community</FieldLabel>
          <Input id="c-wa" type="tel" {...register("whatsapp")} aria-invalid={!!errors.whatsapp} />
          {errors.whatsapp ? <FieldError>{errors.whatsapp.message}</FieldError> : null}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="c-desig">Member designation</FieldLabel>
          <Controller
            control={control}
            name="designation"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                <SelectTrigger id="c-desig" className="h-10 w-full">
                  <SelectValue placeholder="Select a designation" />
                </SelectTrigger>
                <SelectContent>
                  {designationOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.designation ? <FieldError>{errors.designation.message}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="c-aff">Startup affiliation (optional)</FieldLabel>
          <Input id="c-aff" {...register("startupAffiliation")} />
        </Field>
      </div>

      {selectedDesignation === "other" ? (
        <Field>
          <FieldLabel htmlFor="c-desig-other">Your category</FieldLabel>
          <Input
            id="c-desig-other"
            maxLength={30}
            placeholder="For example, Community Builder"
            {...register("designationOther")}
            aria-invalid={!!errors.designationOther}
          />
          <p className="text-xs text-brand-muted">
            This label will appear on your membership ID. Use 2 to 30 characters.
          </p>
          {errors.designationOther ? <FieldError>{errors.designationOther.message}</FieldError> : null}
        </Field>
      ) : null}

      <Controller
        control={control}
        name="declarationAccurate"
        render={({ field }) => (
          <label className="flex items-start gap-3 text-sm text-brand-secondary">
            <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
            <span>I declare that the information provided is accurate and complete.</span>
          </label>
        )}
      />
      {errors.declarationAccurate ? (
        <FieldError>{errors.declarationAccurate.message}</FieldError>
      ) : null}

      <Button type="submit" disabled={submitting} className="h-11 gap-2 sm:w-fit sm:px-8">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Submit membership claim
      </Button>
      {isDemo ? (
        <p className="text-xs text-brand-muted">
          DEMO preview — sign in with a real account to submit a claim.
        </p>
      ) : null}
    </form>
  );
}
