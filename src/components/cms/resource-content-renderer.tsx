import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "cn";

/**
 * Renders publisher-authored resource copy. Raw HTML is never enabled, so
 * untrusted markup cannot inject scripts — formatting comes only from the
 * Markdown parser. Top-level `#` headings render as <h2> because the page
 * hero already owns the single <h1>.
 */
export function ResourceContentRenderer({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 text-[16px] leading-[1.8] text-brand-secondary", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="pt-2 text-[26px] leading-snug font-bold text-brand-ink sm:text-[30px]">{children}</h2>
          ),
          h2: ({ children }) => (
            <h2 className="pt-2 text-[26px] leading-snug font-bold text-brand-ink sm:text-[30px]">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="pt-1 text-[20px] leading-snug font-semibold text-brand-ink sm:text-[22px]">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[17px] leading-snug font-semibold text-brand-ink">{children}</h4>
          ),
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-brand-ink">{children}</strong>,
          ul: ({ children }) => <ul className="flex list-disc flex-col gap-2 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="flex list-decimal flex-col gap-2 pl-6">{children}</ol>,
          li: ({ children }) => <li className="[&>p]:inline">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="font-medium text-brand-accent underline decoration-brand-accent/40 underline-offset-4 hover:decoration-brand-accent focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="rounded-r-xl border-l-4 border-brand-accent/60 bg-brand-purple/40 px-4 py-3 text-brand-ink">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-brand-border" />,
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-xl ring-1 ring-brand-border">
              <table className="w-full min-w-[480px] border-collapse text-left text-[15px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-brand-cloud">{children}</thead>,
          th: ({ children }) => <th className="border-b border-brand-border px-4 py-2.5 font-semibold text-brand-ink">{children}</th>,
          td: ({ children }) => <td className="border-b border-brand-border/60 px-4 py-2.5 align-top last:[&]:border-b-0">{children}</td>,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : undefined}
              alt={typeof alt === "string" ? alt : ""}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-auto max-w-full rounded-xl ring-1 ring-brand-border"
            />
          ),
          code: ({ children, className: codeClassName }) =>
            codeClassName ? (
              <code className={codeClassName}>{children}</code>
            ) : (
              <code className="rounded bg-brand-cloud px-1.5 py-0.5 font-mono text-[0.9em] text-brand-ink">{children}</code>
            ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl bg-brand-ink p-4 font-mono text-sm leading-relaxed text-brand-white">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Bold section heading shared by the public detail page and admin preview. */
export function ResourceSectionHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-[26px] leading-snug font-bold text-brand-ink sm:text-[30px]", className)}>
      {children}
    </h2>
  );
}
