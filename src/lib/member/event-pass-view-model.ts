import type { EventPass } from "@/types/member";

export type EventPassViewModel = {
  name: string;
  uid: string;
  location: string;
  email: string;
  phone: string;
};

/** Normalizes the three mandatory pass fields for both screen and export. */
export function eventPassViewModel(
  pass: Pick<EventPass, "memberName" | "reference" | "venue" | "location"> & Partial<Pick<EventPass, "email" | "phone">>,
): EventPassViewModel {
  const venue = pass.venue?.trim() ?? "";
  const address = pass.location.trim();
  const parts = [venue, address].filter(Boolean);
  const location = parts.filter((part, index) => parts.indexOf(part) === index).join(", ");

  return {
    name: pass.memberName.trim() || "Name unavailable",
    uid: pass.reference.trim() || "UID pending",
    location: location || "Location to be confirmed",
    email: pass.email?.trim() || "Email unavailable",
    phone: pass.phone?.trim() || "Phone unavailable",
  };
}
