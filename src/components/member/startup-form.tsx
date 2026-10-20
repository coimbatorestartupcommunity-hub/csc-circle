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

export function StartupForm() {
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<StartupSubmissionValues>({ resolver: zodResolver(startupSubmissionSchema) });
  const [message, setMessage] = useState("");

  return (
    <form
      className="mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-7"
      onSubmit={handleSubmit(async (values) => {
        const result = await memberRequest("startup", values);
        setMessage(result.error ?? `Submitted for review. Reference: ${result.id}`);
        if (result.ok) reset();
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="startup-name">Startup name</Label>
          <Input id="startup-name" {...register("name", { required: "Enter a startup name.", minLength: 2, maxLength: 120 })} aria-invalid={!!errors.name} />
          {errors.name ? <p className="text-sm text-red-700">{errors.name.message}</p> : null}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="startup-slug">Directory slug</Label>
          <Input id="startup-slug" {...register("slug", { required: "Enter a directory slug.", pattern: /^[a-z0-9-]{3,120}$/ })} aria-invalid={!!errors.slug} />
          {errors.slug ? <p className="text-sm text-red-700">{errors.slug.message}</p> : null}
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
        <input type="checkbox" {...register("consent", { required: true })} required className="mt-1" />
        <span>I consent to publication of these business details after CSC approval. Directory participation must also be enabled in my privacy settings.</span>
      </label>
      {errors.consent ? <p className="text-sm text-red-700">Please consent before submitting.</p> : null}

      <div className="flex flex-col items-center gap-2">
        <Button disabled={isSubmitting} className="w-full sm:w-auto sm:min-w-52">
          {isSubmitting ? "Submitting…" : "Submit for review"}
        </Button>
        <p role="status" aria-live="polite" className="text-center text-sm text-brand-muted">{message}</p>
      </div>
    </form>
  );
}
