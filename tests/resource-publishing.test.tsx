import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));
vi.mock("@/lib/services/cms-public", () => ({
  cmsImageUrl: (path: string | null) => (path ? `/img?path=${encodeURIComponent(path)}` : null),
}));

import { ResourceContentRenderer } from "@/components/cms/resource-content-renderer";
import { ResourceCard, formatResourceDate, resourceMetaLine } from "@/components/cms/resource-card";
import { mapResourceTopics, type ResourceRecord } from "@/types/cms";
import { resourceSaveSchema } from "@/lib/validations/cms";

const record = (overrides: Partial<ResourceRecord> = {}): ResourceRecord => ({
  id: "11111111-1111-4111-8111-111111111111",
  slug: "the-ai-economy-handbook",
  title: "The AI Economy Handbook",
  category: "Technology",
  resourceType: "document",
  summary: "A practical handbook.",
  description: "Full description here.",
  tags: ["AI Economy"],
  language: null,
  pageCount: null,
  publicationDate: null,
  topics: [],
  audience: null,
  coverImagePath: null,
  documentPath: null,
  documentFilename: null,
  documentMime: null,
  documentSize: null,
  externalUrl: null,
  sourceName: null,
  sourceOrganization: null,
  sourceUrl: null,
  author: null,
  license: null,
  attribution: null,
  publicationConsent: true,
  seoTitle: null,
  metaDescription: null,
  status: "published",
  publishedAt: "2026-11-09T10:00:00Z",
  updatedAt: null,
  ...overrides,
});

describe("ResourceContentRenderer", () => {
  it("renders Markdown structure without raw syntax", () => {
    const { container } = render(
      <ResourceContentRenderer
        content={"# Handbook\n\n## What You Will Learn\n\n**Bold point** and *italic*.\n\n- first\n- second\n\n1. one\n2. two\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n[Docs](https://example.com/docs)\n\n> quoted\n"}
      />,
    );
    expect(container.querySelector("h1")).toBeNull();
    const headings = [...container.querySelectorAll("h2")].map((h) => h.textContent);
    expect(headings).toContain("Handbook");
    expect(headings).toContain("What You Will Learn");
    expect(container.querySelector("strong")?.textContent).toBe("Bold point");
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
    expect(container.querySelectorAll("ol li")).toHaveLength(2);
    expect(container.querySelector("table")).not.toBeNull();
    const link = container.querySelector('a[href="https://example.com/docs"]');
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toContain("noopener");
    expect(container.querySelector("blockquote")).not.toBeNull();
    expect(container.textContent).not.toContain("# Handbook");
    expect(container.textContent).not.toContain("**Bold point**");
  });

  it("never executes raw HTML from publisher copy", () => {
    const { container } = render(
      <ResourceContentRenderer content={'Hello <script>alert("x")</script> <img src="x" onerror="alert(1)" />'} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("Hello");
  });

  it("renders plain paragraphs without Markdown", () => {
    const { container } = render(<ResourceContentRenderer content={"First paragraph.\n\nSecond paragraph."} />);
    const paragraphs = [...container.querySelectorAll("p")].map((p) => p.textContent);
    expect(paragraphs).toContain("First paragraph.");
    expect(paragraphs).toContain("Second paragraph.");
  });
});

describe("ResourceCard", () => {
  it("links View Details to the canonical slug and shows full metadata", () => {
    render(
      <ResourceCard
        resource={record({
          pageCount: 178,
          language: "English",
          author: "CSC & LIT",
          publicationDate: "2026-11-01",
          coverImagePath: "resource-media/11111111-1111-4111-8111-111111111111.webp",
          documentPath: "resource-docs/11111111-1111-4111-8111-111111111111.pdf",
          documentMime: "application/pdf",
        })}
      />,
    );
    expect(screen.getByRole("link", { name: "View Details" })).toHaveAttribute(
      "href",
      "/resources/the-ai-economy-handbook",
    );
    expect(screen.getByRole("link", { name: /Download The AI Economy Handbook/ })).toHaveAttribute(
      "href",
      "/api/resources/the-ai-economy-handbook/download",
    );
    expect(screen.getByText(/PDF Document · 178 pages · English/)).not.toBeNull();
    expect(screen.getByText(/CSC & LIT/)).not.toBeNull();
  });

  it("omits the Download action when no file exists and never fabricates metadata", () => {
    const { container } = render(<ResourceCard resource={record()} />);
    expect(screen.queryByRole("link", { name: /Download/ })).toBeNull();
    expect(container.textContent).not.toContain("pages");
    expect(resourceMetaLine(record({ description: null }))).toBe("Document");
  });

  it("formats helpers safely", () => {
    expect(formatResourceDate("2026-11-01")).toContain("2026");
    expect(formatResourceDate("not-a-date")).toBeNull();
    expect(formatResourceDate(null)).toBeNull();
    expect(
      resourceMetaLine(record({ pageCount: 178, language: "English", documentMime: "application/pdf" })),
    ).toBe("PDF Document · 178 pages · English");
  });
});

describe("resource publishing metadata validation", () => {
  const valid = {
    slug: "the-ai-economy-handbook",
    title: "The AI Economy Handbook",
    category: "Technology",
    resourceType: "document" as const,
    summary: "A practical handbook.",
    description: "Complete description with enough detail.",
    language: "English",
    pageCount: 178,
    publicationDate: "2026-11-01",
    topics: [{ title: "The AI Economic Shift", body: "Industries and employment." }],
    publicationConsent: true,
  };

  it("accepts the new optional publishing metadata", () => {
    const parsed = resourceSaveSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pageCount).toBe(178);
      expect(parsed.data.topics).toHaveLength(1);
    }
  });

  it("accepts absent metadata for historical-style records", () => {
    const { language, pageCount, publicationDate, topics, ...rest } = valid;
    void language; void pageCount; void publicationDate; void topics;
    expect(resourceSaveSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects malformed metadata", () => {
    expect(resourceSaveSchema.safeParse({ ...valid, pageCount: 0 }).success).toBe(false);
    expect(resourceSaveSchema.safeParse({ ...valid, pageCount: 1.5 }).success).toBe(false);
    expect(resourceSaveSchema.safeParse({ ...valid, publicationDate: "01-11-2026" }).success).toBe(false);
    expect(resourceSaveSchema.safeParse({ ...valid, topics: [{ title: "", body: "x" }] }).success).toBe(false);
    expect(
      resourceSaveSchema.safeParse({
        ...valid,
        topics: Array.from({ length: 13 }, (_, i) => ({ title: `t${i}`, body: "b" })),
      }).success,
    ).toBe(false);
  });

  it("drops malformed stored topics defensively", () => {
    expect(mapResourceTopics("nope")).toEqual([]);
    expect(
      mapResourceTopics([{ title: "Ok", body: "Yes" }, { title: "", body: "x" }, null, { title: "T" }]),
    ).toEqual([{ title: "Ok", body: "Yes" }]);
  });
});
