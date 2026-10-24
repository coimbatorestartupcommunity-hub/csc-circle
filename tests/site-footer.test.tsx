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
  default: (props: React.ComponentProps<"img"> & { src: string; priority?: boolean; fill?: boolean; unoptimized?: boolean }) => {
    const { alt, priority, fill, unoptimized, ...imageProps } = props;
    void priority; void fill; void unoptimized;
    return <span role="img" aria-label={alt} {...imageProps} />;
  },
}));

afterEach(cleanup);

describe("SiteFooter", () => {
  it("renders a balanced three-column footer with connect, info and identity sections", () => {
    render(<SiteFooter />);
    const connect = screen.getByTestId("footer-connect");
    const info = screen.getByTestId("footer-info");
    const brand = screen.getByTestId("footer-brand");
    const social = screen.getByTestId("footer-social");
    const join = screen.getByRole("link", { name: "Join CSC Circle" });

    expect(connect).toBeInTheDocument();
    expect(info).toBeInTheDocument();
    expect(brand).toBeInTheDocument();
    expect(screen.queryByTestId("footer-community")).not.toBeInTheDocument();
    expect(screen.queryByTestId("footer-get-involved")).not.toBeInTheDocument();
    // Social links and the Join action live together in the Stay Connected column.
    expect(join.parentElement).toBe(connect);
    expect(social.compareDocumentPosition(join) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(join).toHaveAttribute("href", "/member/claim");
  });

  it("exposes the help and legal links above the columns and keeps social icon sizing", () => {
    render(<SiteFooter />);
    const expected: [string, string][] = [
      ["Help & FAQ", "/help"],
      ["Contact", "/contact"],
      ["Community Guidelines", "/community-guidelines"],
      ["Membership Guide", "/membership"],
      ["Privacy Policy", "/privacy"],
      ["Terms and Conditions", "/terms"],
      ["Security", "/security"],
    ];
    for (const [label, href] of expected) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
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
    const { container } = render(<MembersLayout><div>Shared member profile</div></MembersLayout>);
    expect(screen.getByText("Shared member profile")).toBeInTheDocument();
    expect(screen.queryByTestId("footer-brand")).not.toBeInTheDocument();
    expect(document.querySelector("footer")).not.toBeInTheDocument();
    const main = container.querySelector("main");
    expect(main?.className).toContain("px-4");
    expect(main?.className).toContain("sm:px-6");
    expect(main?.className).toContain("lg:px-8");
    expect(main?.className).toContain("max-w-7xl");
  });
});
