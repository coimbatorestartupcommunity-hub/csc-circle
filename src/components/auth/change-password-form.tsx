"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordValues } from "@/lib/validations/auth";
import { authRequest } from "@/lib/auth/request";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });
  const password = useWatch({ control, name: "newPassword", defaultValue: "" });
  const [nonce, setNonce] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  async function sendCode() {
    setSending(true);
    const result = await authRequest("reauthenticate", {});
    setMessage(result.error ?? "Check your verified email for a security code.");
    setSending(false);
  }
  async function submit(values: ChangePasswordValues) {
    const result = await authRequest("change-password", { ...values, nonce });
    if (result.error) { setMessage(result.error); return; }
    reset(); setNonce("");
    setMessage(result.sessionsRevoked ? "Password updated. Sign in again with your new password." : "Password updated. Session revocation could not be confirmed; sign out of other devices.");
  }
  return <section className="flex w-full flex-col gap-5 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
    <h2 className="font-semibold">Account security</h2>
    <p className="max-w-4xl text-sm leading-relaxed text-brand-secondary">Change your password or add one to your existing Google account. Your CSC identity and membership stay linked to the same account. Verify your email with a security code first.</p>
    <form onSubmit={handleSubmit(submit)} className="grid min-w-0 gap-5 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor="security-code">Email security code</Label>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <Input id="security-code" autoComplete="one-time-code" inputMode="numeric" value={nonce} onChange={e => setNonce(e.target.value)} required className="h-11 sm:flex-1" />
          <Button type="button" variant="outline" onClick={sendCode} disabled={sending} className="h-11 shrink-0 sm:min-w-48">{sending ? "Sending…" : "Send security code"}</Button>
        </div>
      </div>
      <PasswordField id="change-password" label="New password" autoComplete="new-password" {...register("newPassword")} value={password} showStrength error={errors.newPassword?.message} />
      <PasswordField id="change-confirm" label="Confirm password" autoComplete="new-password" {...register("confirmPassword")} error={errors.confirmPassword?.message} />
      <div className="flex items-end sm:justify-end">
        <Button type="submit" disabled={isSubmitting} className="h-11 w-full sm:w-auto sm:min-w-48">{isSubmitting ? "Updating…" : "Update password"}</Button>
      </div>
      <p role="status" className="text-sm text-brand-secondary sm:col-span-2" aria-live="polite">{message}</p>
    </form>
  </section>;
}
