/* eslint-disable @next/next/no-img-element */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StartupCard } from "@/components/directory/startup-card";
import type { Startup } from "@/types";

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/image", () => ({ default: ({ alt, ...props }: React.ComponentProps<"img"> & { src: string }) => <img alt={alt} {...props} /> }));
vi.mock("@/components/motion", () => ({ HoverLiftCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const startup: Startup = {
  id: "startup-id",
  slug: "logic-intelligence-technologies",
  name: "Logic Intelligence Technologies",
  logoUrl: "/brand/lit-logo.png",
  industry: "Software & Information Technology, Artificial Intelligence And Enterprise Technology",
  description: "A founder-led engineering and AI company.",
  collaboration: [],
  founder: { id: "founder-id", name: "Vikash Saravanan", role: "Founder", avatarUrl: "/founder.jpg" },
  status: "published",
};

describe("StartupCard", () => {
  it("keeps the company name on one line and wraps long industry text inside the card", () => {
    render(<StartupCard startup={startup} />);
    const companyName = screen.getByRole("heading", { name: startup.name });
    expect(companyName).toHaveClass("whitespace-nowrap");
    expect(companyName).not.toHaveClass("truncate");
    expect(Number.parseFloat(companyName.style.fontSize)).toBeLessThan(18);
    expect(screen.getByText(startup.industry)).toHaveClass("min-w-0", "max-w-full", "whitespace-normal", "break-words");
    expect(screen.getByText(startup.description)).toHaveClass("min-w-0", "max-w-full", "break-words");
    expect(screen.getByRole("img", { name: `${startup.name} logo` })).toHaveAttribute("src", "/brand/lit-logo.png");
    expect(screen.getByRole("img", { name: `${startup.name} directory image` }).parentElement).toHaveClass("w-[calc(100%+3rem)]", "max-w-none", "aspect-[4/3]");
  });
});
