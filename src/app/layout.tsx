import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
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
  metadataBase: new URL("https://csc.logicintelligencetechnologies.in"),
  title: "Coimbatore Startup Community (CSC) — Connect, Build & Grow",
  description:
    "A platform bringing together Founders, Entrepreneurs, Innovators & Aspiring Builders in Coimbatore.",
  applicationName: "Coimbatore Startup Community",
  keywords: [
    "Coimbatore Startup Community",
    "CSC",
    "Coimbatore Startups",
    "Logic Intelligence Technologies",
    "Founders Coimbatore",
  ],
  authors: [{ name: siteConfig.legalName }],
  creator: siteConfig.legalName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "https://csc.logicintelligencetechnologies.in/",
    siteName: "Coimbatore Startup Community",
    title: "Coimbatore Startup Community (CSC) — Connect, Build & Grow",
    description:
      "A platform bringing together Founders, Entrepreneurs, Innovators & Aspiring Builders in Coimbatore.",
    images: [{
      url: "https://csc.logicintelligencetechnologies.in/brand/csc-homepage-banner.png?v=20261122",
      width: 1200,
      height: 630,
      type: "image/png",
      alt: "Coimbatore Startup Community — The People Behind CSC Circle",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Coimbatore Startup Community (CSC) — Connect, Build & Grow",
    description:
      "A platform bringing together Founders, Entrepreneurs, Innovators & Aspiring Builders in Coimbatore.",
    images: ["https://csc.logicintelligencetechnologies.in/brand/csc-homepage-banner.png?v=20261122"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

function OrganizationJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Coimbatore Startup Community",
    alternateName: ["CSC", "CSC Circle"],
    url: "https://csc.logicintelligencetechnologies.in/",
    sameAs: ["https://www.instagram.com/coimbatorestartupcommunity/"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(organization).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${lora.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <OrganizationJsonLd />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-brand-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-white"
          >
            Skip to content
          </a>
          <Suspense fallback={<div aria-hidden="true" className="h-16 shrink-0 lg:h-[4.5rem]" />}>
            <SiteHeader />
          </Suspense>
          <div id="main-content" className="flex flex-1 flex-col">
            {children}
          </div>
          <ScrollToTop />
        </Providers>
      </body>
    </html>
  );
}
