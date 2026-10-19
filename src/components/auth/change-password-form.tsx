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
  return <section className="mt-6 flex flex-col gap-4 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
    <h2 className="font-semibold">Account security</h2>
    <p className="text-sm text-brand-secondary">Change your password or add one to your existing Google account. Your CSC identity and membership stay linked to the same account. Verify your email with a security code first.</p>
    <Button type="button" variant="outline" onClick={sendCode} disabled={sending}>{sending ? "Sending…" : "Send security code"}</Button>
    <form onSubmit={handleSubmit(submit)} className="flex max-w-md flex-col gap-4">
      <Label htmlFor="security-code">Email security code</Label><Input id="security-code" autoComplete="one-time-code" inputMode="numeric" value={nonce} onChange={e => setNonce(e.target.value)} required />
      <PasswordField id="change-password" label="New password" autoComplete="new-password" {...register("newPassword")} value={password} showStrength error={errors.newPassword?.message} />
      <PasswordField id="change-confirm" label="Confirm password" autoComplete="new-password" {...register("confirmPassword")} error={errors.confirmPassword?.message} />
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Updating…" : "Update password"}</Button>
    </form><p role="status" className="text-sm text-brand-secondary">{message}</p>
  </section>;
}
