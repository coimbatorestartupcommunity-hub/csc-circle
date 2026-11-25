import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { linkUserEmailAndCredentials } from "@/lib/auth/phone-auth";
import { z } from "zod";

const linkEmailSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .optional()
    .or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const sb = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "You must be signed in to link your email." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = linkEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input." },
        { status: 422 }
      );
    }

    const { email, password } = parsed.data;
    const result = await linkUserEmailAndCredentials({
      userId: user.id,
      email,
      password: password || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Could not link email address." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      email,
      message: "Email successfully linked to your account.",
      next: "/profile",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Account linking service temporarily unavailable." },
      { status: 503 }
    );
  }
}
