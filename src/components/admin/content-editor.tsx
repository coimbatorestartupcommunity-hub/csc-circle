"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
export function ContentEditor({ isDemo }: { isDemo: boolean }) {
  const [key, setKey] = useState("homepage.announcement"); const [value, setValue] = useState(""); const [publish, setPublish] = useState(false); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); const router = useRouter();
  return <form className="mt-6 flex flex-col gap-4 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border" onSubmit={async e => {
    e.preventDefault(); if (isDemo) { setMessage("DEMO only. No public content was changed."); return; }
    setSaving(true); try { const r = await fetch("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content_key: key, content_value: value, publish }) }); const data = await r.json(); setMessage(data.ok ? "Content saved." : data.error); if (data.ok) router.refresh(); } catch { setMessage("Could not save content."); } finally { setSaving(false); }
  }}><h2 className="font-semibold">Edit structured content</h2><Label htmlFor="content-key">Content section</Label><select id="content-key" className="rounded-lg border p-2" value={key} onChange={e => setKey(e.target.value)}>{["homepage.announcement", "community.introduction", "about.mission", "about.vision"].map(k => <option key={k}>{k}</option>)}</select><Label htmlFor="content-value">Text</Label><Textarea id="content-value" value={value} onChange={e => setValue(e.target.value)} maxLength={4000} /><label className="flex gap-2"><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} />Publish after saving</label><p className="whitespace-pre-wrap rounded-xl bg-brand-cloud p-4 text-sm">{value || "Preview appears here."}</p><Button disabled={saving}>{saving ? "Saving…" : "Save content"}</Button><p role="status">{message}</p></form>;
}
