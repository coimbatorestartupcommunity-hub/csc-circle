/**
 * Testimonials data provider. Only approved, published reviews are eligible for
 * public display. Serves development fixtures when enabled; Phase 1 swaps in
 * Supabase. No aggregate scores are fabricated.
 */

import type { Testimonial } from "@/types";
import { testimonialFixtures, USE_FIXTURES } from "@/lib/services/fixtures";

export function getPublishedTestimonials(): Testimonial[] {
  const source = USE_FIXTURES ? testimonialFixtures : [];
  return source
    .filter((t) => t.status === "published" && t.rating >= 1 && t.rating <= 5)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
