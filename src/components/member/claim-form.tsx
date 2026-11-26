"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { Camera, Loader2, ShieldCheck, X } from "lucide-react";
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

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function canvasCrop45(source: string, area: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const outW = Math.max(320, Math.round(area.width));
      const outH = Math.round((outW * 5) / 4);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
        "image/webp",
        0.92,
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = source;
  });
}

function autoCrop43(source: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const targetAspect = 4 / 3;
      const imgAspect = img.width / img.height;
      let cw = img.width;
      let ch = img.height;
      if (imgAspect > targetAspect) cw = ch * targetAspect;
      else ch = cw / targetAspect;
      const x = (img.width - cw) / 2;
      const y = (img.height - ch) / 2;
      const outW = Math.max(600, Math.round(cw));
      const outH = Math.round((outW * 3) / 4);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, x, y, cw, ch, 0, 0, outW, outH);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
        "image/webp",
        0.92,
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = source;
  });
}

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
  const [photoSource, setPhotoSource] = React.useState<string | null>(null);
  const [originalFile, setOriginalFile] = React.useState<File | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [portraitArea, setPortraitArea] = React.useState<Area | null>(null);
  const [portraitBlob, setPortraitBlob] = React.useState<Blob | null>(null);
  const [portraitPreviewUrl, setPortraitPreviewUrl] = React.useState<string | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (photoSource) URL.revokeObjectURL(photoSource);
    };
  }, [photoSource]);

  React.useEffect(() => {
    if (!portraitBlob) {
      setPortraitPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(portraitBlob);
    setPortraitPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [portraitBlob]);

  function clearPhoto() {
    setPhotoSource(null);
    setOriginalFile(null);
    setPortraitArea(null);
    setPortraitBlob(null);
    setPhotoConfirmed(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  function handlePhotoSelect(file?: File) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.has(file.type) || file.size < 1 || file.size > MAX_IMAGE_BYTES) {
      toast.error("Choose a JPEG, PNG, or WebP image under 8 MB.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      if (probe.naturalWidth < 600 || probe.naturalHeight < 800) {
        URL.revokeObjectURL(objectUrl);
        toast.error("Choose an image at least 600 × 800 pixels so your ID card portrait stays sharp.");
        return;
      }
      setOriginalFile(file);
      setPhotoSource(objectUrl);
      setPortraitArea(null);
      setPortraitBlob(null);
      setPhotoConfirmed(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error("Could not read this image file.");
    };
    probe.src = objectUrl;
  }

  async function onSubmit(values: ClaimFormValues) {
    setSubmitting(true);
    try {
      const result = await memberRequest("claim", values);
      if (result.error) { toast.error(result.error); return; }

      if (originalFile && portraitBlob && photoSource) {
        try {
          const dirBlob = await autoCrop43(photoSource);
          const form = new FormData();
          form.append("original", originalFile);
          form.append("portrait", new File([portraitBlob], "portrait.webp", { type: "image/webp" }));
          form.append("directory", new File([dirBlob], "directory.webp", { type: "image/webp" }));
          const uploadRes = await fetch("/api/member/portrait", { method: "POST", body: form });
          if (!uploadRes.ok) {
            toast.warning("Membership claimed! You can upload your profile photo later in Account Settings.");
          }
        } catch {
          toast.warning("Membership claimed! You can upload your profile photo later in Account Settings.");
        }
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("csc_membership_claimed", "true");
        localStorage.setItem("csc_membership_claimed_at", new Date().toISOString());
      }
      notifySubmissionSuccess({ title: "Successfully submitted", message: "Your membership claim has been submitted. It will be automatically approved within 5 minutes." });
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
      <div className="flex flex-col gap-2 rounded-2xl bg-brand-blue/60 p-4 text-sm text-brand-ink ring-1 ring-brand-border/60">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 shrink-0 text-brand-accent" aria-hidden />
          <span className="font-semibold text-brand-ink">Automated 5-Minute Verification &amp; Activation</span>
        </div>
        <p className="text-xs leading-relaxed text-brand-secondary sm:text-sm">
          Claiming your free membership issues your official CSC Digital ID Card with Apple &amp; Google Wallet integration. Your card acts as your express QR pass for all offline CSC meetups, verifies your listing in the Founder Directory, and grants priority endorsement for TANSEED and SISFS seed grant cohorts.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-brand-border bg-brand-cloud/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-brand-ink">
            Profile photo (optional — you can skip and add this later)
          </p>
          {photoSource ? (
            <button
              type="button"
              onClick={clearPhoto}
              className="text-xs font-medium text-brand-muted hover:text-brand-ink"
            >
              Skip photo
            </button>
          ) : null}
        </div>
        {!photoSource ? (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl py-4 transition hover:bg-brand-cloud/60">
            <Camera className="size-8 text-brand-muted" />
            <span className="text-sm font-medium text-brand-secondary">Upload a photo (min 600 × 800 px)</span>
            <span className="text-xs text-brand-muted">JPEG, PNG, or WebP under 8 MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                handlePhotoSelect(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        ) : !photoConfirmed ? (
          <div>
            <div className="relative mx-auto h-64 w-48 overflow-hidden rounded-xl bg-brand-cloud">
              <Cropper
                image={photoSource}
                crop={crop}
                zoom={zoom}
                aspect={4 / 5}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={async (_, pixels) => {
                  setPortraitArea(pixels);
                  try {
                    const blob = await canvasCrop45(photoSource, pixels);
                    setPortraitBlob(blob);
                  } catch {
                    // ignore transient crop error
                  }
                }}
                objectFit="contain"
              />
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={clearPhoto} className="gap-1.5">
                <X className="size-4" /> Remove
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!portraitArea || !portraitBlob}
                onClick={() => setPhotoConfirmed(true)}
              >
                Confirm crop
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative size-14 overflow-hidden rounded-full bg-brand-cloud ring-1 ring-brand-border">
                {portraitPreviewUrl ? (
                  <img src={portraitPreviewUrl} alt="Cropped portrait preview" className="size-full object-cover" />
                ) : null}
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-ink">Photo ready for your Digital ID</p>
                <button
                  type="button"
                  className="text-xs font-medium text-brand-accent underline"
                  onClick={() => setPhotoConfirmed(false)}
                >
                  Re-crop
                </button>
              </div>
            </div>
          </div>
        )}
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
