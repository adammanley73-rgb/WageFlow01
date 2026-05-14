import type { Metadata } from "next";
import TheBusinessConsortiumLanding from "@/components/marketing/landings/TheBusinessConsortiumLanding";

const siteUrl = "https://www.thebusinessconsortiumltd.co.uk";
const title = "UK Payroll Software | WageFlow by The Business Consortium Ltd";
const description =
  "WageFlow is UK payroll software for SMEs, payroll professionals, HR teams and payroll bureaus that need exception-led payroll review, PAYE and NI visibility, RTI workflow support and clearer approval before payday.";

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
  description,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "WageFlow by The Business Consortium Ltd",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": siteUrl + "/#organization",
      name: "The Business Consortium Ltd",
      legalName: "The Business Consortium Ltd",
      url: siteUrl,
      email: "enquiries@thebusinessconsortiumltd.co.uk",
      logo: siteUrl + "/WageFlowLogo.png",
      address: {
        "@type": "PostalAddress",
        streetAddress: "86-90 Paul Street",
        addressLocality: "London",
        postalCode: "EC2A 4NE",
        addressCountry: "GB",
      },
      founder: {
        "@id": siteUrl + "/#founder",
      },
      brand: {
        "@id": siteUrl + "/#wageflow",
      },
    },
    {
      "@type": "Person",
      "@id": siteUrl + "/#founder",
      name: "Adam Manley",
      jobTitle: "Founder",
      worksFor: {
        "@id": siteUrl + "/#organization",
      },
      description:
        "Founder of The Business Consortium Ltd and WageFlow, with 27 years of Payroll, HR and Pensions experience.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": siteUrl + "/#wageflow",
      name: "WageFlow",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Payroll software",
      operatingSystem: "Web",
      url: siteUrl,
      image: siteUrl + "/wageflow-screenshot.png",
      description:
        "WageFlow is UK payroll software that helps SMEs, payroll professionals, HR teams and payroll bureaus review payroll exceptions, PAYE, NI, RTI workflow and approval before payday.",
      provider: {
        "@id": siteUrl + "/#organization",
      },
      audience: [
        {
          "@type": "Audience",
          audienceType: "UK SMEs",
        },
        {
          "@type": "Audience",
          audienceType: "Payroll professionals",
        },
        {
          "@type": "Audience",
          audienceType: "HR professionals",
        },
        {
          "@type": "Audience",
          audienceType: "Payroll bureaus",
        },
        {
          "@type": "Audience",
          audienceType: "Accountants and bookkeepers",
        }
      ],
      featureList: [
        "UK payroll software",
        "PAYE and National Insurance payroll workflow",
        "RTI payroll workflow support",
        "Payroll exception review",
        "Payroll audit trail",
        "Starter and leaver tracking",
        "Absence and holiday tracking",
        "Payroll reports and exports"
      ],
      offers: {
        "@id": siteUrl + "/#wageflow-offers",
      },
    },
    {
      "@type": "AggregateOffer",
      "@id": siteUrl + "/#wageflow-offers",
      url: siteUrl,
      priceCurrency: "GBP",
      lowPrice: "150",
      highPrice: "300",
      offerCount: "2",
      availability: "https://schema.org/InStock",
      seller: {
        "@id": siteUrl + "/#organization",
      },
    },
    {
      "@type": "WebSite",
      "@id": siteUrl + "/#website",
      url: siteUrl,
      name: "WageFlow by The Business Consortium Ltd",
      publisher: {
        "@id": siteUrl + "/#organization",
      },
    }
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <TheBusinessConsortiumLanding />
    </>
  );
}