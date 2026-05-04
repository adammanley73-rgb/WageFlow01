import TheBusinessConsortiumLanding from "@/components/marketing/landings/TheBusinessConsortiumLanding";
import { cookies } from "next/headers";

const siteUrl = "https://www.thebusinessconsortiumltd.co.uk";
const companyName = "The Business Consortium Ltd";
const productName = "WageFlow";
const contactEmail = "enquiries@thebusinessconsortiumltd.co.uk";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: companyName,
      legalName: companyName,
      url: siteUrl,
      email: contactEmail,
      logo: `${siteUrl}/WageFlowLogo.png`,
      address: {
        "@type": "PostalAddress",
        streetAddress: "3rd Floor, 86-90 Paul Street",
        addressLocality: "London",
        postalCode: "EC2A 4NE",
        addressCountry: "GB",
      },
      founder: {
        "@id": `${siteUrl}/#founder`,
      },
      brand: {
        "@id": `${siteUrl}/#wageflow`,
      },
    },
    {
      "@type": "Person",
      "@id": `${siteUrl}/#founder`,
      name: "Adam Manley",
      jobTitle: "Founder",
      worksFor: {
        "@id": `${siteUrl}/#organization`,
      },
      description:
        "Founder of The Business Consortium Ltd and WageFlow, with 27 years of Payroll, HR and Pensions experience.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#wageflow`,
      name: productName,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Payroll software",
      operatingSystem: "Web",
      url: siteUrl,
      image: `${siteUrl}/wageflow-screenshot.png`,
      description:
        "WageFlow is UK payroll software that helps SMEs, payroll professionals, HR teams and payroll bureaux review payroll exceptions, PAYE, NI, RTI workflow, pricing and approval before payday.",
      provider: {
        "@id": `${siteUrl}/#organization`,
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
          audienceType: "Payroll bureaux",
        },
        {
          "@type": "Audience",
          audienceType: "Accountants and bookkeepers",
        },
      ],
      featureList: [
        "UK payroll software",
        "PAYE and National Insurance payroll workflow",
        "RTI payroll workflow support",
        "Payroll exception review",
        "Payroll audit trail",
        "Starter and leaver tracking",
        "Absence and holiday tracking",
        "Payroll reports and exports",
      ],
      offers: {
        "@id": `${siteUrl}/#wageflow-offers`,
      },
    },
    {
      "@type": "Product",
      "@id": `${siteUrl}/#product`,
      name: productName,
      brand: {
        "@id": `${siteUrl}/#organization`,
      },
      description:
        "UK payroll software by The Business Consortium Ltd, built to reduce manual payroll work, surface exceptions and support clearer payroll approval.",
      category: "Payroll software",
      offers: {
        "@id": `${siteUrl}/#wageflow-offers`,
      },
    },
    {
      "@type": "AggregateOffer",
      "@id": `${siteUrl}/#wageflow-offers`,
      url: siteUrl,
      priceCurrency: "GBP",
      lowPrice: "150",
      highPrice: "300",
      offerCount: "2",
      availability: "https://schema.org/InStock",
      seller: {
        "@id": `${siteUrl}/#organization`,
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What is WageFlow?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "WageFlow is UK payroll software built to reduce manual work, surface exceptions and make payroll approval clearer.",
          },
        },
        {
          "@type": "Question",
          name: "Who is WageFlow built for?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "WageFlow is built for SMEs, payroll professionals, HR teams and payroll bureaux that want a cleaner UK payroll workflow.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need to add a card immediately?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can explore, review pricing and request a demo without a card. A card is required before running your first live payroll.",
          },
        },
        {
          "@type": "Question",
          name: "What is the WageFlow pilot offer?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The first 10 companies can apply for a guided parallel run and 3 months free, subject to weekly or monthly testimonial submissions.",
          },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${siteUrl}/#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
      ],
    },
  ],
};

export default async function PreviewTBCLandingPage() {
  const cookieStore = await cookies();
  const played = cookieStore.get("tbc_intro_played_v1")?.value === "1";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <TheBusinessConsortiumLanding initialShowIntro={!played} />
    </>
  );
}