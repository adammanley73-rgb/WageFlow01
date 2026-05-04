import type { Metadata } from "next";

const siteUrl = "https://www.thebusinessconsortiumltd.co.uk";
const pageUrl = `${siteUrl}/uk-payroll-software.html`;
const title = "UK Payroll Software | WageFlow";
const description =
  "WageFlow is UK payroll software for SMEs, payroll professionals and bureaux that want exception-led payroll review, PAYE and NI checks, RTI workflow support and clearer approval before payday.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title,
    description,
    url: pageUrl,
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
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description,
      isPartOf: {
        "@id": `${siteUrl}/#website`,
      },
      about: {
        "@id": `${siteUrl}/#wageflow`,
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: `${siteUrl}/wageflow-screenshot.png`,
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#wageflow`,
      name: "WageFlow",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Payroll software",
      operatingSystem: "Web",
      url: siteUrl,
      image: `${siteUrl}/wageflow-screenshot.png`,
      description,
      provider: {
        "@id": `${siteUrl}/#organization`,
      },
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
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "The Business Consortium Ltd",
      legalName: "The Business Consortium Ltd",
      url: siteUrl,
      email: "enquiries@thebusinessconsortiumltd.co.uk",
      logo: `${siteUrl}/WageFlowLogo.png`,
    },
    {
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What is UK payroll software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "UK payroll software helps businesses calculate pay, PAYE, National Insurance, deductions, payslips and payroll records in line with UK payroll workflows.",
          },
        },
        {
          "@type": "Question",
          name: "Who is WageFlow built for?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "WageFlow is built for UK SMEs, payroll professionals, HR teams, accountants, bookkeepers and payroll bureaux that want clearer payroll review before approval.",
          },
        },
        {
          "@type": "Question",
          name: "Does WageFlow support PAYE and NI payroll review?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "WageFlow is designed around UK payroll workflow, including PAYE and National Insurance visibility, exception-led review and clearer approval before payday.",
          },
        },
        {
          "@type": "Question",
          name: "Can I request a WageFlow demo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. You can request a WageFlow demo from The Business Consortium Ltd to review the payroll workflow, pricing and pilot programme.",
          },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "UK Payroll Software",
          item: pageUrl,
        },
      ],
    },
  ],
};

const benefits = [
  "Review payroll exceptions before approval",
  "Keep PAYE and National Insurance checks visible",
  "Support cleaner payroll sign-off before payday",
  "Use audit trails to explain changes and corrections",
  "Handle starters, leavers, absence and payroll records in one workflow",
  "Give SMEs and payroll teams a clearer route from run creation to approval",
];

const audiences = [
  {
    title: "Small businesses running payroll in-house",
    text: "WageFlow helps small business owners and payroll leads review payroll before payday, reduce rekeying and spot issues before they become corrections.",
  },
  {
    title: "Payroll and HR professionals",
    text: "WageFlow gives payroll and HR teams a structured review process with visible exceptions, audit trail support and clearer approval control.",
  },
  {
    title: "Payroll bureaux and accountants",
    text: "WageFlow supports repeatable payroll review for teams handling multiple payrolls, where consistency and clear sign-off matter.",
  },
];

const workflowSteps = [
  {
    title: "Set up the payroll run",
    text: "Add company details, employee records, pay schedules and the core data needed for a clean payroll process.",
  },
  {
    title: "Review exceptions",
    text: "Check flagged items, gross-to-net movement, PAYE, NI and anything that needs attention before approval.",
  },
  {
    title: "Approve with a clear audit trail",
    text: "Keep the approval process deliberate, visible and easier to explain later if questions or corrections arise.",
  },
];

const faqs = [
  {
    question: "What makes WageFlow different from a basic payroll calculator?",
    answer:
      "A payroll calculator gives figures. WageFlow is designed around payroll workflow, review, exceptions, approvals and audit trail visibility.",
  },
  {
    question: "Is WageFlow only for large employers?",
    answer:
      "No. WageFlow is aimed at UK SMEs, payroll professionals, HR teams, bureaux, accountants and bookkeepers that want a clearer payroll process.",
  },
  {
    question: "Does WageFlow replace payroll review?",
    answer:
      "No. WageFlow supports review by surfacing the areas that need attention. The user stays in control of approval.",
  },
  {
    question: "Can WageFlow support a parallel payroll run?",
    answer:
      "Yes. The pilot programme is designed around a guided parallel run so a business can compare results before relying on live processing.",
  },
];

export default function UKPayrollSoftwarePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-white">
              <img src="/WageFlowLogo.png" alt="WageFlow logo" className="h-9 w-9 object-contain" />
            </span>
            <span>
              <span className="block text-xl font-bold text-[#0f3c85]">WageFlow</span>
              <span className="block text-xs text-gray-600">by The Business Consortium Ltd</span>
            </span>
          </a>

          <a
            href="/#contact"
            className="hidden rounded-lg bg-[#0f3c85] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#0f3c85] sm:inline-flex"
          >
            Request a demo
          </a>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-[#0f3c85]">
              UK payroll software
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl lg:text-6xl">
              UK payroll software that helps you catch problems before payday
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-700">
              WageFlow is payroll software for UK SMEs, payroll professionals and bureaux that want a clearer route from payroll run to review, approval and audit trail. It is built around exception-led payroll review, PAYE and NI visibility, RTI workflow support and calmer sign-off before payday.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="/#contact"
                className="inline-flex items-center justify-center rounded-lg bg-[#0f3c85] px-8 py-4 text-base font-semibold text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Request a demo
              </a>
              <a
                href="/#pricing"
                className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 px-8 py-4 text-base font-semibold text-gray-900 transition hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                See pricing
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#0f3c85]">Built for payroll review</p>
            <h2 className="mt-3 text-2xl font-bold text-gray-950">Focus on the items that need attention</h2>
            <p className="mt-3 text-gray-700">
              WageFlow is not trying to make payroll look clever. It is trying to make payroll easier to review before the wrong numbers reach payday.
            </p>
            <div className="mt-6 grid gap-3">
              {benefits.slice(0, 4).map((benefit) => (
                <div key={benefit} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-900">
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">UK payroll software for real payroll workflow</h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              Payroll software should help you review the run before approval, not just produce totals and hope everyone claps. WageFlow is designed for payroll checks, exceptions, approval control and records that make sense after the event.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="font-semibold text-gray-950">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">Who WageFlow is built for</h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is built for UK teams that need payroll to be accurate, controlled and easier to review. Strange concept, payroll being reviewed before payday. Humanity may yet recover.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {audiences.map((audience) => (
              <article key={audience.title} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-950">{audience.title}</h3>
                <p className="mt-4 leading-7 text-gray-700">{audience.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">Exception-led payroll review</h2>
              <p className="mt-4 text-lg leading-8 text-gray-700">
                WageFlow is designed around a simple idea. Process the run, surface what needs checking, then approve with better visibility. That gives payroll teams a clearer way to reduce avoidable corrections and approval surprises.
              </p>
              <a
                href="/#contact"
                className="mt-8 inline-flex rounded-lg bg-[#0f3c85] px-7 py-4 font-semibold text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Request a demo
              </a>
            </div>

            <div className="grid gap-5">
              {workflowSteps.map((step, index) => (
                <article key={step.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-bold text-[#0f3c85]">Step {index + 1}</p>
                  <h3 className="mt-2 text-xl font-bold text-gray-950">{step.title}</h3>
                  <p className="mt-3 leading-7 text-gray-700">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">UK payroll software FAQs</h2>
            <p className="mt-4 text-lg text-gray-700">Straight answers for people who would rather not discover payroll errors after approval.</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-950">{faq.question}</h3>
                <p className="mt-3 leading-7 text-gray-700">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0f3c85] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Review WageFlow for your UK payroll workflow</h2>
          <p className="mt-4 text-lg leading-8 text-blue-50">
            Request a demo, review pricing or apply for the pilot programme if you want a guided parallel run before live payroll.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/#contact"
              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 font-semibold text-[#0f3c85] transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Request a demo
            </a>
            <a
              href="/#pricing"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white px-8 py-4 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-white"
            >
              See pricing
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
