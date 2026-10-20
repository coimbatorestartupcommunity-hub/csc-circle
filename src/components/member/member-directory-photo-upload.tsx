"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { notifySubmissionSuccess } from "@/lib/ui/submission-feedback";

export function MemberDirectoryPhotoUpload({ savedPhotoUrl }: { savedPhotoUrl?: string }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [source, setSource] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [area, setArea] = React.useState<Area | null>(null);
  const [photoUrl, setPhotoUrl] = React.useState(savedPhotoUrl ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);

  function choosePhoto(next?: File) {
    if (!next) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(next.type) || next.size < 1 || next.size > 8 * 1024 * 1024) {
      toast.error("Choose a JPEG, PNG or WebP image under 8 MB.");
      return;
    }
    if (source) URL.revokeObjectURL(source);
    setFile(next);
    setSource(URL.createObjectURL(next));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function upload() {
    if (!source || !file || !area) return;
    setSaving(true);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Could not read this image."));
        element.src = source;
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(area.width);
      canvas.height = Math.round(area.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare the image crop.");
      context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
      const cropBlob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not prepare the photo crop.")), "image/webp", 0.92));
      const form = new FormData();
      form.append("image", new File([cropBlob], "founder-directory.webp", { type: "image/webp" }));
      const response = await fetch("/api/member/directory-photo", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save your Founder Directory photo.");
      setPhotoUrl(`${result.url}&v=${Date.now()}`);
      setSource(null);
      setFile(null);
      router.refresh();
      notifySubmissionSuccess({ title: "Founder photo saved", message: "Your 4:3 directory image is ready. Your profile and Digital ID portrait were left unchanged." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your Founder Directory photo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brand-border sm:p-8" aria-labelledby="directory-photo-heading">
      <div className="mx-auto max-w-3xl text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-purple text-brand-ink"><Camera className="size-5" aria-hidden /></span>
        <h2 id="directory-photo-heading" className="mt-3 text-xl font-semibold text-brand-ink">Founder Directory photo</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-brand-muted">Upload and crop a separate 4:3 image for your public founder listing. This does not replace or change your 4:5 profile and membership-card portrait.</p>
      </div>

      {source ? (
        <div className="mx-auto mt-6 w-full max-w-xl">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-brand-cloud ring-1 ring-brand-border">
            <Cropper image={source} crop={crop} zoom={zoom} aspect={4 / 3} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setArea(pixels)} objectFit="contain" />
          </div>
          <label htmlFor="directory-photo-zoom" className="mt-4 block text-sm font-medium text-brand-ink">Adjust crop</label>
          <input id="directory-photo-zoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 w-full accent-[var(--brand-accent)]" />
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Button type="button" variant="outline" disabled={saving} onClick={() => { setSource(null); setFile(null); setArea(null); }}>Cancel</Button>
            <Button type="button" disabled={saving || !area} onClick={upload}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {saving ? "Saving photo…" : "Save 4:3 founder photo"}
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-brand-muted">Drag to position · crop is saved as a separate directory image</p>
        </div>
      ) : (
        <div className="mx-auto mt-6 flex w-full max-w-xl flex-col items-center gap-4">
          {photoUrl ? (
            <div className="w-full overflow-hidden rounded-2xl bg-brand-cloud ring-1 ring-brand-border">
              {/* Authenticated route provides only the signed-in member's private crop. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Saved Founder Directory photo, 4:3 crop" className="aspect-[4/3] w-full object-cover" />
            </div>
          ) : <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-brand-cloud text-brand-muted ring-1 ring-brand-border"><span className="flex flex-col items-center gap-2 text-sm"><Camera className="size-8" aria-hidden />No directory photo yet</span></div>}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => choosePhoto(event.target.files?.[0])} />
          <Button type="button" variant={photoUrl ? "outline" : "default"} onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" /> {photoUrl ? "Replace 4:3 directory photo" : "Upload 4:3 founder photo"}
          </Button>
          <p className="text-center text-xs text-brand-muted">JPEG, PNG or WebP · up to 8 MB · crop output must be at least 600 × 450 px</p>
        </div>
      )}
    </section>
  );
}
