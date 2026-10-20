"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { notifySubmissionSuccess } from "@/lib/ui/submission-feedback";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { memberRequest } from "@/lib/services/member/request";
import { profileSchema, type ProfileFormValues } from "@/lib/validations/member";
import type { MemberProfile } from "@/types/member";

export function MemberProfileForm({
  profile,
  isDemo,
}: {
  profile: MemberProfile;
  isDemo: boolean;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.fullName,
      displayName: profile.displayName,
      whatsapp: profile.whatsapp ?? "",
      city: profile.city ?? "",
      startupName: profile.startup?.name ?? "",
      startupWebsite: profile.startup?.website ?? "",
      startupDescription: profile.startup?.description ?? "",
    },
  });
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(values: ProfileFormValues) {
    setSaving(true);
    try {
      const result = await memberRequest("profile", values);
      if (result.error) { toast.error(result.error); return; }
      notifySubmissionSuccess({ title: "Profile saved", message: "Your profile information was successfully saved." });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-6">
        <legend className="px-1 text-sm font-semibold text-brand-ink">
          Personal Details
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="p-full">Full name</FieldLabel>
            <Input id="p-full" {...register("fullName")} aria-invalid={!!errors.fullName} />
            {errors.fullName ? <FieldError>{errors.fullName.message}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="p-display">Display name</FieldLabel>
            <Input id="p-display" {...register("displayName")} aria-invalid={!!errors.displayName} />
            {errors.displayName ? <FieldError>{errors.displayName.message}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="p-wa">WhatsApp number</FieldLabel>
            <Input id="p-wa" type="tel" {...register("whatsapp")} aria-invalid={!!errors.whatsapp} />
            {errors.whatsapp ? <FieldError>{errors.whatsapp.message}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="p-city">City</FieldLabel>
            <Input id="p-city" {...register("city")} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-6">
        <legend className="px-1 text-sm font-semibold text-brand-ink">
          Founder Profile
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="p-sname">Startup name</FieldLabel>
            <Input id="p-sname" {...register("startupName")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="p-sweb">Startup website</FieldLabel>
            <Input id="p-sweb" placeholder="https://" {...register("startupWebsite")} aria-invalid={!!errors.startupWebsite} />
            {errors.startupWebsite ? <FieldError>{errors.startupWebsite.message}</FieldError> : null}
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="p-sdesc">Startup description</FieldLabel>
          <Textarea id="p-sdesc" rows={3} {...register("startupDescription")} />
        </Field>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={saving} className="h-11 gap-2 sm:w-fit sm:px-8">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </Button>
        {isDemo ? (
          <p className="text-xs text-brand-muted">
            DEMO preview — sign in with a real account to save profile changes.
          </p>
        ) : null}
      </div>
    </form>
  );
}
