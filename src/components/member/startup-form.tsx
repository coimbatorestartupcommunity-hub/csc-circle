"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { memberRequest } from "@/lib/services/member/request";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
interface Values { name: string; slug: string; industry: string; description: string; website: string; consent: boolean }
export function StartupForm() {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Values>();
  const [message, setMessage] = useState("");
  return <form className="flex max-w-xl flex-col gap-4 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border" onSubmit={handleSubmit(async values => { const r = await memberRequest("startup", values); setMessage(r.error ?? `Submitted for review. Reference: ${r.id}`); if (r.ok) reset(); })}>
    <Label htmlFor="startup-name">Startup name</Label><Input id="startup-name" {...register("name")} required minLength={2} maxLength={120} />
    <Label htmlFor="startup-slug">Directory slug</Label><Input id="startup-slug" {...register("slug")} required pattern="[a-z0-9-]{3,120}" />
    <Label htmlFor="startup-industry">Industry</Label><select id="startup-industry" {...register("industry")} className="rounded-lg border p-2">{["ai","saas","d2c","healthtech","fintech","marketing","education","other"].map(v => <option key={v} value={v}>{v}</option>)}</select>
    <Label htmlFor="startup-description">Description</Label><Textarea id="startup-description" {...register("description")} required minLength={20} maxLength={600} />
    <Label htmlFor="startup-website">Website (optional)</Label><Input id="startup-website" type="url" {...register("website")} />
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" {...register("consent")} required className="mt-1" />I consent to publication of these business details after CSC approval. Directory participation must also be enabled in my privacy settings.</label>
    <Button disabled={isSubmitting}>{isSubmitting ? "Submitting…" : "Submit for review"}</Button><p role="status" className="text-sm">{message}</p>
  </form>;
}
