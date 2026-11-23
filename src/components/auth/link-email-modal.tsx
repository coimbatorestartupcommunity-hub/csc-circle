"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface LinkEmailModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
  nextUrl?: string;
}

export function LinkEmailModal({ isOpen, onSuccess, nextUrl = "/profile" }: LinkEmailModalProps) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone/link-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password || undefined }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to link email address.");
        setLoading(false);
        return;
      }

      toast.success("Account unified! Your email and phone are now linked.");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(nextUrl);
        router.refresh();
      }
    } catch {
      setError("Network error while connecting email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl ring-1 ring-slate-200/80 animate-in zoom-in-95 duration-200 text-left">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Link Your Email Address</h2>
            <p className="text-xs text-slate-500 font-medium">One Unified Account for Phone & Email</p>
          </div>
        </div>

        <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          Welcome to <strong>Coimbatore Startup Community</strong>! Please confirm your email address to connect your phone number and email into a single, unified account. Next time, you can log in seamlessly with either your mobile number or your email.
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleConfirm} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-email-input" className="text-xs font-semibold text-slate-800">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="link-email-input"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 pl-10 text-sm rounded-xl"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="link-password-input" className="text-xs font-semibold text-slate-800">
                Password <span className="font-normal text-slate-400">(Optional)</span>
              </Label>
              <span className="text-[11px] text-slate-400">For email-based sign-in</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="link-password-input"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pl-10 text-sm rounded-xl"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-11 w-full gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Confirm & Open Profile
          </Button>
        </form>
      </div>
    </div>
  );
}
