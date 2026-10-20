import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { Providers } from "@/app/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { siteConfig } from "@/lib/content/site";

const poppins = localFont({
  src: [
    { path: "./fonts/Poppins-300.woff2", weight: "300" },
    { path: "./fonts/Poppins-400.woff2", weight: "400" },
    { path: "./fonts/Poppins-500.woff2", weight: "500" },
    { path: "./fonts/Poppins-600.woff2", weight: "600" },
    { path: "./fonts/Poppins-700.woff2", weight: "700" },
    { path: "./fonts/Poppins-800.woff2", weight: "800" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

const lora = localFont({
  src: "./fonts/Lora-Variable.woff2",
  variable: "--font-lora",
  weight: "400 600",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-jetbrains-mono",
  weight: "400 500",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "Coimbatore startup community",
    "CSC Circle",
    "startup community Coimbatore",
    "founders",
    "entrepreneurs",
    "startup events Coimbatore",
    "networking",
  ],
  authors: [{ name: siteConfig.legalName }],
  creator: siteConfig.legalName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [{
      url: "/brand/csc-homepage-banner.png",
      width: 1200,
      height: 630,
      alt: "CSC Circle homepage — Connect. Build. Grow.",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: ["/brand/csc-homepage-banner.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${lora.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-brand-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-white"
          >
            Skip to content
          </a>
          <SiteHeader />
          <div id="main-content" className="flex flex-1 flex-col">
            {children}
          </div>
          <ScrollToTop />
        </Providers>
      </body>
    </html>
  );
}
