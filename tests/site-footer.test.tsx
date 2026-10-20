import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SiteFooter } from "@/components/layout/site-footer";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: React.ComponentProps<"img"> & { src: string }) => <span role="img" aria-label={alt} {...props} />,
}));

afterEach(cleanup);

describe("SiteFooter", () => {
  it("places brand, social row and join action before the mobile navigation columns", () => {
    render(<SiteFooter />);
    const brand = screen.getByTestId("footer-brand");
    const community = screen.getByTestId("footer-community");
    const involved = screen.getByTestId("footer-get-involved");
    const social = screen.getByTestId("footer-social");
    const join = screen.getByRole("link", { name: "Join CSC Circle" });

    expect(brand.className).toContain("order-1");
    expect(community.parentElement?.className).toContain("order-2");
    expect(involved.parentElement?.className).toContain("order-3");
    expect(social.compareDocumentPosition(join) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(join.parentElement).toBe(brand);
    expect(join).toHaveAttribute("href", "/member/claim");
  });

  it("centers both navigation groups and keeps verified links in the footer", () => {
    render(<SiteFooter />);
    for (const id of ["footer-community", "footer-get-involved"]) {
      const nav = screen.getByTestId(id);
      expect(nav.className).toContain("text-center");
      expect(nav.querySelector("ul")?.className).toContain("items-center");
    }
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Terms and Conditions" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Collaborations" })).toHaveAttribute("href", "/collaborations");
    expect(screen.getByRole("link", { name: "Member Login" })).toHaveAttribute("href", "/member/profile");
    for (const label of ["CSC Circle on Instagram", "Join the CSC Circle WhatsApp community", "Email CSC Circle"]) {
      expect(screen.getByRole("link", { name: label }).className).toContain("size-11");
    }
  });
});
