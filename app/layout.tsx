import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

const siteTitle = "UK Payroll Software | WageFlow by The Business Consortium Ltd";
const siteDescription =
  "WageFlow is UK payroll software by The Business Consortium Ltd. Review payroll exceptions, PAYE, NI, RTI workflow, pricing, and request a demo or pilot.";
const siteUrl = "https://www.thebusinessconsortiumltd.co.uk";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | WageFlow",
  },
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "WageFlow by The Business Consortium Ltd",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
