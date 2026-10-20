"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";

export function PublicFooterBoundary() {
  const pathname = usePathname();
  const privateWorkspace = pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/member" || pathname.startsWith("/member/");
  const authenticationFlow = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth"]
    .some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (privateWorkspace || authenticationFlow) return null;
  return <SiteFooter />;
}
