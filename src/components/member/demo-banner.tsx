import * as React from "react";
import { FlaskConical } from "lucide-react";

/**
 * Shown across the member area in PREVIEW mode (dev, no real auth). Makes it
 * unmistakable that the data is DEMO and nothing shown is a real credential.
 */
export function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-brand-gold px-4 py-2 text-center text-xs font-medium text-brand-ink">
      <FlaskConical className="size-3.5" aria-hidden />
      DEMO preview — sample data only. Not a real membership, credential, or
      registration.
    </div>
  );
}
