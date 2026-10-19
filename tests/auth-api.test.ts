// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const { sb, recovery } = vi.hoisted(() => ({
  sb: { auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn(), resend: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), reauthenticate: vi.fn(), verifyOtp: vi.fn() } },
  recovery: { hasRecovery: vi.fn(), clearRecovery: vi.fn(), authorizeRecovery: vi.fn() },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => sb }));
vi.mock("@/lib/auth/recovery", () => recovery);
import { POST } from "@/app/api/auth/[action]/route";
import { GET as confirm } from "@/app/auth/confirm/route";
let ip = 0;
function request(action: string, body: object, origin = "https://csc.example") {
  return POST(new Request(`https://csc.example/api/auth/${action}`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "x-forwarded-for": `test-${ip++}` }, body: JSON.stringify(body) }), { params: Promise.resolve({ action }) });
}
beforeEach(() => { vi.resetAllMocks(); sb.auth.getUser.mockResolvedValue({ data: { user: { id: "member-a", email_confirmed_at: "2026-01-01" } } }); });
describe("server auth boundary", () => {
  it("rejects cross-origin changes before sending credentials", async () => {
    expect((await request("login", { email: "a@example.test", password: "secret" }, "https://evil.test")).status).toBe(400);
    expect(sb.auth.signInWithPassword).not.toHaveBeenCalled();
  });
  it("rejects weak signup server-side", async () => {
    expect((await request("signup", { email: "a@example.test", password: "weak" })).status).toBe(422);
    expect(sb.auth.signUp).not.toHaveBeenCalled();
  });
  it("uses a generic login failure", async () => {
    sb.auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials", message: "internal detail" } });
    const r = await request("login", { email: "a@example.test", password: "wrong" });
    expect(r.status).toBe(401); expect(JSON.stringify(await r.json())).not.toContain("internal detail");
  });
  it("does not allow an ordinary session to reset a password", async () => {
    recovery.hasRecovery.mockResolvedValue(false);
    expect((await request("reset", { password: "Strong-passphrase-42", confirmPassword: "Strong-passphrase-42" })).status).toBe(403);
    expect(sb.auth.updateUser).not.toHaveBeenCalled();
  });
  it("updates a verified recovery session and revokes sessions", async () => {
    recovery.hasRecovery.mockResolvedValue(true); sb.auth.updateUser.mockResolvedValue({ error: null }); sb.auth.signOut.mockResolvedValue({ error: null });
    expect((await request("reset", { password: "Strong-passphrase-42", confirmPassword: "Strong-passphrase-42" })).status).toBe(200);
    expect(recovery.clearRecovery).toHaveBeenCalled(); expect(sb.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
  });
  it("requires confirmed identity for password changes", async () => {
    sb.auth.getUser.mockResolvedValue({ data: { user: { id: "a" } } });
    expect((await request("change-password", {})).status).toBe(401);
  });
  it("does not reveal account existence during recovery", async () => {
    sb.auth.resetPasswordForEmail.mockResolvedValue({ error: { code: "user_not_found" } });
    expect(await (await request("recover", { email: "unknown@example.test" })).json()).toEqual({ ok: true });
  });
  it("rejects invalid/reused verification tokens", async () => {
    sb.auth.verifyOtp.mockResolvedValue({ data: {}, error: { message: "expired" } });
    const r = await confirm(new Request("https://csc.example/auth/confirm?token_hash=expired&type=signup"));
    expect(r.headers.get("location")).toBe("https://csc.example/login?error=invalid_link");
  });
  it("only grants recovery after Supabase validates a recovery token", async () => {
    sb.auth.verifyOtp.mockResolvedValue({ data: { user: { id: "a" } }, error: null }); recovery.authorizeRecovery.mockResolvedValue(true);
    const r = await confirm(new Request("https://csc.example/auth/confirm?token_hash=valid&type=recovery"));
    expect(recovery.authorizeRecovery).toHaveBeenCalledWith("a"); expect(r.headers.get("location")).toBe("https://csc.example/reset-password");
  });
});
