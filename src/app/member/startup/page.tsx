import { redirect } from "next/navigation";

/** Retired single-startup flow; My Startups is the canonical workspace. */
export default function LegacyStartupPage(): never {
  redirect("/member/startups");
}
