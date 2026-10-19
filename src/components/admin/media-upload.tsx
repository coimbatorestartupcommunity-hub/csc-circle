"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function MediaUpload({ isDemo }: { isDemo: boolean }) {
  const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false); const router = useRouter();
  return <form className="mb-6 flex max-w-xl flex-col gap-3 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border" onSubmit={async e => {
    e.preventDefault(); if (isDemo) { setMessage("DEMO only. No file was uploaded."); return; }
    const form = e.currentTarget; const data = new FormData(form); setSaving(true);
    try { const r = await fetch("/api/admin/media", { method: "POST", body: data }); const result = await r.json(); setMessage(result.error ?? "Private media saved."); if (result.ok) { form.reset(); router.refresh(); } } catch { setMessage("Could not upload this file."); } finally { setSaving(false); }
  }}><h2 className="font-semibold">Upload private media</h2><Label htmlFor="media-file">JPEG, PNG, or WebP · up to 5 MB</Label><Input id="media-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required /><Label htmlFor="media-alt">Alt text</Label><Input id="media-alt" name="alt" minLength={2} maxLength={160} required /><Button disabled={saving}>{saving ? "Uploading…" : "Upload"}</Button><p role="status" className="text-sm">{message}</p></form>;
}
