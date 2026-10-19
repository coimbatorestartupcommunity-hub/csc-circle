"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";

export function PublicFooterBoundary() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/member" || pathname.startsWith("/member/")) return null;
  return <SiteFooter />;
}
