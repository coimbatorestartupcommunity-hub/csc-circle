import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SiteFooter } from "@/components/layout/site-footer";
import MarketingLayout from "@/app/(marketing)/layout";
import MembersLayout from "@/app/members/layout";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: React.ComponentProps<"img"> & { src: string }) => <span role="img" aria-label={alt} {...props} />,
}));

afterEach(cleanup);

describe("SiteFooter", () => {
  it("keeps the footer focused on centered branding, social links and the join action", () => {
    render(<SiteFooter />);
    const brand = screen.getByTestId("footer-brand");
    const social = screen.getByTestId("footer-social");
    const join = screen.getByRole("link", { name: "Join CSC Circle" });

    expect(brand.className).toContain("items-center");
    expect(screen.queryByTestId("footer-community")).not.toBeInTheDocument();
    expect(screen.queryByTestId("footer-get-involved")).not.toBeInTheDocument();
    expect(social.compareDocumentPosition(join) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(join.parentElement).toBe(brand);
    expect(join).toHaveAttribute("href", "/member/claim");
  });

  it("removes the Community and Get Involved link columns while retaining legal and social links", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Terms and Conditions" })).toHaveAttribute("href", "/terms");
    expect(screen.queryByRole("link", { name: "Collaborations" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Member Login" })).not.toBeInTheDocument();
    for (const label of ["CSC Circle on Instagram", "Join the CSC Circle WhatsApp community", "Email CSC Circle"]) {
      expect(screen.getByRole("link", { name: label }).className).toContain("size-11");
    }
  });
});

describe("route footer layouts", () => {
  it("renders the public footer in the marketing route group", () => {
    render(<MarketingLayout><div>Marketing page</div></MarketingLayout>);
    expect(screen.getByText("Marketing page")).toBeInTheDocument();
    expect(screen.getByTestId("footer-brand")).toBeInTheDocument();
  });

  it("does not render the public footer in the member directory route family", () => {
    render(<MembersLayout><div>Shared member profile</div></MembersLayout>);
    expect(screen.getByText("Shared member profile")).toBeInTheDocument();
    expect(screen.queryByTestId("footer-brand")).not.toBeInTheDocument();
    expect(document.querySelector("footer")).not.toBeInTheDocument();
  });
});
