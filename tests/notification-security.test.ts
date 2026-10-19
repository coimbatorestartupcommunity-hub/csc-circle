// @vitest-environment node
import { afterEach,expect,it,vi } from "vitest";
import { classifyEmailFailure } from "@/lib/notifications/failures";
import { renderNotification } from "@/lib/notifications/templates";
import { GET } from "@/app/api/internal/notifications/route";
afterEach(()=>vi.unstubAllEnvs());
it("does not automatically retry ambiguous SMTP outcomes",()=>{
 expect(classifyEmailFailure({code:"ETIMEDOUT",command:"DATA"}).outcome).toBe("ambiguous");
 expect(classifyEmailFailure({code:"ECONNECTION",command:"DATA"}).outcome).toBe("ambiguous");
 expect(classifyEmailFailure({responseCode:451}).outcome).toBe("failed_retryable");
 expect(classifyEmailFailure({responseCode:550}).outcome).toBe("failed_permanent");
 expect(classifyEmailFailure({code:"EAUTH"}).code).toBe("SMTP_AUTH_FAILED");
});
it("rejects unauthenticated dispatch even when no cron secret is configured",async()=>{
 vi.stubEnv("CRON_SECRET","");expect((await GET(new Request("https://example.test/api/internal/notifications"))).status).toBe(401);
});
it("escapes template content and keeps CTA destinations trusted",()=>{
 for(const [key,value] of Object.entries({SMTP_HOST:"smtp.gmail.com",SMTP_USER:"sender@example.test",SMTP_APP_PASSWORD:"synthetic-only",CSC_SUPPORT_EMAIL:"support@example.test",CSC_ADMIN_NOTIFICATION_EMAILS:"admin@example.test",APP_BASE_URL:"https://csc.logicintelligencetechnologies.in"})) vi.stubEnv(key,value);
 const result=renderNotification("EventRSVPReceived",{name:'<script>alert(1)</script>',eventTitle:'<img onerror="alert(1)">',url:"https://evil.example",internalNotes:"private-secret",pass_token:"private-token"});
 expect(result.html).not.toContain("<script>");expect(result.html).toContain("&lt;script&gt;");
 expect(result.html).not.toContain("evil.example");expect(result.text).not.toContain("private-secret");expect(result.html).not.toContain("private-token");
 expect(result.text).toContain("pending review");
});
