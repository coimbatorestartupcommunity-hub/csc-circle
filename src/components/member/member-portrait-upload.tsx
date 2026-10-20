"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, Loader2, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function canvasCrop(source: string, area: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(area.width);
      canvas.height = Math.round(area.height);
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("Your browser could not prepare the crop."));
      context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create the cropped image.")), "image/webp", 0.92);
    };
    image.onerror = () => reject(new Error("Could not read this image."));
    image.src = source;
  });
}

export function MemberPortraitUpload({ portraitUrl, directoryPhotoUrl }: { portraitUrl?: string; directoryPhotoUrl?: string }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [source, setSource] = React.useState<string | null>(null);
  const [original, setOriginal] = React.useState<File | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [step, setStep] = React.useState<"portrait" | "directory">("portrait");
  const [portraitArea, setPortraitArea] = React.useState<Area | null>(null);
  const [directoryArea, setDirectoryArea] = React.useState<Area | null>(null);
  const [area, setArea] = React.useState<Area | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadedUrl, setUploadedUrl] = React.useState<string | null>(null);
  const [directoryUploadedUrl, setDirectoryUploadedUrl] = React.useState<string | null>(null);
  const savedUrl = uploadedUrl ?? portraitUrl;
  const savedDirectoryUrl = directoryUploadedUrl ?? directoryPhotoUrl;

  React.useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);

  function selectFile(file?: File) {
    if (!file) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size < 1 || file.size > 8 * 1024 * 1024) {
      toast.error("Choose a JPEG, PNG or WebP image under 8 MB.");
      return;
    }
    if (source) URL.revokeObjectURL(source);
    setOriginal(file);
    setSource(URL.createObjectURL(file));
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setArea(null);
    setPortraitArea(null);
    setDirectoryArea(null);
    setStep("portrait");
    if (inputRef.current) inputRef.current.value = "";
  }

  const cropComplete = React.useCallback((_: Area, pixels: Area) => {
    setArea(pixels);
    if (step === "portrait") setPortraitArea(pixels);
    else setDirectoryArea(pixels);
  }, [step]);

  async function save() {
    if (!source || !original || !portraitArea || !directoryArea) return;
    setUploading(true);
    try {
      const [portraitBlob, directoryBlob] = await Promise.all([
        canvasCrop(source, portraitArea),
        canvasCrop(source, directoryArea),
      ]);
      const form = new FormData();
      form.append("original", original);
      form.append("portrait", new File([portraitBlob], "portrait.webp", { type: "image/webp" }));
      form.append("directory", new File([directoryBlob], "directory.webp", { type: "image/webp" }));
      const response = await fetch("/api/member/portrait", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save your photos.");
      setUploadedUrl(result.portraitUrl);
      setDirectoryUploadedUrl(result.directoryPhotoUrl);
      setSource(null);
      setOriginal(null);
      router.refresh();
      toast.success("Your 4:5 profile portrait and private 4:3 directory crop were saved securely.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your photos.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section id="profile-portrait" className="mx-auto w-full max-w-3xl rounded-3xl bg-brand-white p-5 text-center shadow-sm ring-1 ring-brand-border sm:p-7">
      <h2 className="text-lg font-semibold text-brand-ink">Profile photograph</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm text-brand-muted">Save a 4:5 portrait for your profile and eligible digital ID, plus a separately positioned 4:3 crop for your Founder Directory listing. Both stay private unless you explicitly allow public display.</p>
      <div className="mx-auto mt-5 aspect-[4/5] w-48 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink ring-1 ring-brand-border sm:w-56 md:w-[280px]">
        {source ? (
          <div className="relative size-full"><Cropper image={source} crop={crop} zoom={zoom} aspect={step === "portrait" ? 4 / 5 : 4 / 3} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={cropComplete} objectFit="contain" /></div>
        ) : savedUrl ? (
          // Same-origin endpoint returns only the current user's private stored portrait.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={savedUrl} alt="Your saved 4:5 profile portrait" className="size-full object-cover" onError={() => setUploadedUrl("")} />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 px-4 text-brand-muted">
            <span className="flex size-20 items-center justify-center rounded-full bg-white/90 text-2xl font-semibold text-brand-ink"><Camera className="size-8" aria-hidden /></span>
            <span className="text-sm font-medium">Upload a 4:5 portrait</span>
          </div>
        )}
      </div>
      {source ? (
        <div className="mx-auto mt-4 flex max-w-md flex-col gap-3">
          <p className="text-sm font-semibold text-brand-ink">{step === "portrait" ? "Step 1 of 2 · Digital ID portrait (4:5)" : "Step 2 of 2 · Founder Directory photo (4:3)"}</p>
          <label className="text-left text-sm font-medium text-brand-ink" htmlFor="portrait-zoom">Zoom</label>
          <input id="portrait-zoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-[var(--brand-accent)]" />
          <p className="text-xs text-brand-muted">Drag the image to position it inside the crop. The directory crop is saved separately.</p>
          <div className="flex flex-col-reverse justify-center gap-2 sm:flex-row">
            <Button type="button" variant="outline" disabled={uploading} onClick={() => { setSource(null); setOriginal(null); setArea(null); setPortraitArea(null); setDirectoryArea(null); setStep("portrait"); }}><RotateCcw className="size-4" /> Cancel</Button>
            {step === "directory" ? <Button type="button" variant="outline" disabled={uploading} onClick={() => { setStep("portrait"); setArea(null); }}>Back to 4:5 crop</Button> : null}
            {step === "portrait" ? <Button type="button" disabled={uploading || !area} onClick={() => { setStep("directory"); setArea(null); setCrop({ x: 0, y: 0 }); setZoom(1); }}>Next: 4:3 crop</Button> : null}
            <Button type="button" disabled={uploading || !area || !portraitArea || !directoryArea} onClick={save}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Save both photos
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-3">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} />
          <Button variant={savedUrl ? "outline" : "default"} onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" /> {savedUrl ? "Replace photo" : "Choose photo"}
          </Button>
          <p className="text-xs text-brand-muted">JPEG, PNG or WebP · up to 8 MB · minimum crop sizes 320 × 400 and 600 × 450 px</p>
        </div>
      )}
      {!source && savedDirectoryUrl ? <div className="mx-auto mt-6 w-full max-w-sm text-left">
        <h3 className="text-sm font-semibold text-brand-ink">Founder Directory photo preview · 4:3</h3>
        <div className="relative mt-2 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-brand-cloud ring-1 ring-brand-border">
          {/* Authenticated endpoint returns only this member's private directory crop. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={savedDirectoryUrl} alt="Your saved 4:3 Founder Directory photo" className="size-full object-cover" onError={() => setDirectoryUploadedUrl("")} />
        </div>
      </div> : null}
    </section>
  );
}
