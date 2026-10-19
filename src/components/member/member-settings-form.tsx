"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { memberRequest } from "@/lib/services/member/request";
import type { MemberProfile } from "@/types/member";

type ConsentKey = keyof MemberProfile["consent"];

const consentFields: { key: ConsentKey; label: string; locked?: boolean }[] = [
  { key: "membershipTerms", label: "Accept CSC membership terms", locked: true },
  { key: "operationalEmail", label: "Operational emails (membership & events)" },
  { key: "marketingEmail", label: "Community updates (marketing)" },
  { key: "directoryParticipation", label: "Appear in the public founder directory" },
  { key: "displayNamePublicly", label: "Display my name publicly" },
  { key: "displayPhotoPublicly", label: "Display my photo publicly" },
];

export function MemberSettingsForm({
  profile,
  isDemo,
}: {
  profile: MemberProfile;
  isDemo: boolean;
}) {
  const [consent, setConsent] = React.useState(profile.consent);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const result = await memberRequest("preferences", consent);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Preferences saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
      <h2 className="text-sm font-semibold text-brand-ink">Privacy preferences</h2>
      <div className="flex flex-col divide-y divide-brand-border">
        {consentFields.map((f) => (
          <label
            key={f.key}
            className="flex items-center justify-between gap-4 py-3 text-sm text-brand-secondary"
          >
            <span>{f.label}</span>
            <input
              type="checkbox"
              checked={consent[f.key]}
              disabled={f.locked}
              onChange={(e) =>
                setConsent((c) => ({ ...c, [f.key]: e.target.checked }))
              }
              className="size-4 accent-[var(--brand-accent)] disabled:opacity-50"
            />
          </label>
        ))}
      </div>
      <Button onClick={save} disabled={saving} className="h-10 gap-2 sm:w-fit sm:px-6">
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Save preferences
      </Button>
      {isDemo ? (
        <p className="text-xs text-brand-muted">
          DEMO preview — sign in with a real account to save preferences.
        </p>
      ) : null}
    </div>
  );
}
