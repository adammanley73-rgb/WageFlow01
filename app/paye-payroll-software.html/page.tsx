import type { Metadata } from "next";

const siteUrl = "https://www.thebusinessconsortiumltd.co.uk";
const pageUrl = `${siteUrl}/paye-payroll-software.html`;
const title = "PAYE Payroll Software | WageFlow";
const description =
  "WageFlow is PAYE payroll software for UK employers, payroll teams and bureaus that need clearer PAYE, National Insurance, RTI workflow, exception review and payroll approval control.";

export const metadata: Metadata = {
  title: {
    absolute: title,
  },
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
      applicationSubCategory: "PAYE payroll software",
      operatingSystem: "Web",
      url: siteUrl,
      image: `${siteUrl}/wageflow-screenshot.png`,
      description:
        "WageFlow is UK PAYE payroll software for employers, payroll professionals, HR teams and bureaus that need clearer PAYE, National Insurance, RTI workflow, exception review and approval control.",
      provider: {
        "@id": `${siteUrl}/#organization`,
      },
      audience: [
        {
          "@type": "Audience",
          audienceType: "UK employers",
        },
        {
          "@type": "Audience",
          audienceType: "Payroll teams",
        },
        {
          "@type": "Audience",
          audienceType: "Payroll bureaus",
        },
        {
          "@type": "Audience",
          audienceType: "Accountants and bookkeepers",
        },
      ],
      featureList: [
        "PAYE payroll software",
        "PAYE and National Insurance visibility",
        "RTI payroll workflow",
        "Payroll exception review",
        "Payroll approval control",
        "Starter and leaver payroll workflow",
        "Payroll audit trail",
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
          name: "What is PAYE payroll software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "PAYE payroll software helps UK employers and payroll teams calculate, review and process payroll with PAYE tax, National Insurance, payslip and reporting workflow.",
          },
        },
        {
          "@type": "Question",
          name: "Is WageFlow PAYE payroll software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. WageFlow is designed for UK payroll teams that need clearer PAYE, National Insurance, RTI workflow, exception review, approvals and audit trail visibility.",
          },
        },
        {
          "@type": "Question",
          name: "Can WageFlow help review PAYE payroll exceptions?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. WageFlow is built around exception-led payroll review so payroll teams can focus on items that need checking before approval.",
          },
        },
        {
          "@type": "Question",
          name: "Who is WageFlow for?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "WageFlow is for UK employers, small businesses, payroll professionals, bureaus, accountants, bookkeepers and HR teams that need a clearer payroll workflow.",
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
          name: "PAYE Payroll Software",
          item: pageUrl,
        },
      ],
    },
  ],
};

const payeProblems = [
  "PAYE and National Insurance figures need to be checked before payroll is approved",
  "Tax codes, starter details and leaver status can affect payroll outcomes",
  "Payroll teams need visibility before RTI submission",
  "Small payroll errors can become time-consuming corrections",
  "Bureaus need repeatable checks across multiple client payrolls",
  "Audit trails need to explain payroll changes clearly",
];

const benefits = [
  "Review PAYE and National Insurance visibility before approval",
  "Use exception-led payroll checks to focus on items that need attention",
  "Support clearer starter, leaver and tax-code workflow",
  "Keep payroll approvals easier to review and explain",
  "Build cleaner records for payroll audit trails",
  "Give UK payroll teams a structured route from draft to approval",
];

const workflow = [
  {
    title: "Create the payroll run",
    text: "Set up the payroll run with the right employees, pay schedule and payroll context before figures are reviewed.",
  },
  {
    title: "Check PAYE payroll exceptions",
    text: "Review tax, National Insurance, starter, leaver, absence and pay movement issues before payroll is approved.",
  },
  {
    title: "Approve with clearer records",
    text: "Keep payroll approval, changes and review points easier to trace before moving toward RTI and final payroll records.",
  },
];

const audiences = [
  {
    title: "UK employers",
    text: "For employers that need payroll software with clearer PAYE, NI and approval workflow.",
  },
  {
    title: "Payroll teams",
    text: "For payroll professionals who need structured review before payroll is approved.",
  },
  {
    title: "Payroll bureaus",
    text: "For bureaus processing PAYE payroll across multiple clients with repeatable checks.",
  },
  {
    title: "Accountants and bookkeepers",
    text: "For advisers supporting payroll work where clean records and approval visibility matter.",
  },
];

const faqs = [
  {
    question: "What does PAYE payroll software do?",
    answer:
      "PAYE payroll software helps process UK payroll by supporting PAYE tax, National Insurance, payslips, payroll records and workflow needed before approval and reporting.",
  },
  {
    question: "Why is PAYE payroll review important?",
    answer:
      "PAYE payroll review helps payroll teams catch unusual figures, tax-code issues, starter or leaver changes and other items before payroll is approved.",
  },
  {
    question: "Does WageFlow replace payroll review?",
    answer:
      "No. WageFlow supports payroll review by making exceptions, approvals and records clearer. The goal is better control before payroll is finalised.",
  },
  {
    question: "Can bureaus use WageFlow for PAYE payroll?",
    answer:
      "Yes. WageFlow is designed to support payroll bureaus and multi-client payroll teams that need repeatable PAYE payroll workflow and review.",
  },
];

const internalLinks = [
  {
    href: "/uk-payroll-software.html",
    title: "UK payroll software",
    text: "See the broader WageFlow page for UK payroll teams.",
  },
  {
    href: "/payroll-software-for-small-business.html",
    title: "Small business payroll software",
    text: "See the WageFlow page for small UK employers.",
  },
  {
    href: "/payroll-software-for-bureaus.html",
    title: "Payroll bureau software",
    text: "See the WageFlow page for payroll bureaus and multi-client teams.",
  },
];

export default function PayePayrollSoftwarePage() {
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
          <a
            href="/"
            className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
          >
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-white">
              <img
                src="/WageFlowLogo.png"
                alt="WageFlow logo"
                className="h-9 w-9 object-contain"
              />
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
              PAYE payroll software for UK teams
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl lg:text-6xl">
              PAYE payroll software for clearer review before approval
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-700">
              WageFlow helps UK employers, payroll teams and bureaus review PAYE payroll
              exceptions, keep National Insurance visibility in the workflow and approve payroll
              with clearer records before payday.
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
            <p className="text-sm font-semibold uppercase tracking-wide text-[#0f3c85]">
              Built for PAYE payroll control
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-950">
              Review the figures that matter before approval
            </h2>
            <p className="mt-3 text-gray-700">
              PAYE payroll needs clear checks before the run is approved. WageFlow is designed to
              make exceptions, approvals and records easier to manage.
            </p>
            <div className="mt-6 grid gap-3">
              {benefits.slice(0, 4).map((benefit) => (
                <div
                  key={benefit}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-900"
                >
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
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              Why PAYE payroll needs structured review
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              PAYE payroll is not just about producing a number. Payroll teams need clear checks,
              approval control and records that explain what happened when figures change.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {payeProblems.map((problem) => (
              <div
                key={problem}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <p className="font-semibold text-gray-950">{problem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              What WageFlow helps PAYE payroll teams do
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow gives payroll teams a cleaner workflow for PAYE payroll review, exception
              handling and approval.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <p className="font-semibold text-gray-950">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              A clearer PAYE payroll workflow
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is built to support a practical route from payroll preparation to exception
              review and approval, with clearer records throughout the process.
            </p>

            <a
              href="/#contact"
              className="mt-8 inline-flex rounded-lg bg-[#0f3c85] px-7 py-4 font-semibold text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
            >
              Request a demo
            </a>
          </div>
          <div className="grid gap-5">
            {workflow.map((step, index) => (
              <article
                key={step.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <p className="text-sm font-bold text-[#0f3c85]">Step {index + 1}</p>
                <h3 className="mt-2 text-xl font-bold text-gray-950">{step.title}</h3>
                <p className="mt-3 leading-7 text-gray-700">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              PAYE payroll software for different teams
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is designed for the teams that need payroll to be reviewed, approved and
              explained clearly.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {audiences.map((audience) => (
              <article
                key={audience.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold text-gray-950">{audience.title}</h3>
                <p className="mt-3 leading-7 text-gray-700">{audience.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              Explore more WageFlow payroll software pages
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              Review the wider WageFlow pages for UK payroll teams, small businesses and payroll
              bureaus.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {internalLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                <span className="block text-lg font-bold text-gray-950">{link.title}</span>
                <span className="mt-3 block leading-7 text-gray-700">{link.text}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              PAYE payroll software FAQs
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              Straight answers for UK teams reviewing PAYE payroll software.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold text-gray-950">{faq.question}</h3>
                <p className="mt-3 leading-7 text-gray-700">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0f3c85] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Review WageFlow for PAYE payroll workflow
          </h2>
          <p className="mt-4 text-lg leading-8 text-blue-50">
            Request a demo if you want to review how WageFlow can support PAYE payroll review,
            exception handling, approval control and clearer payroll records.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/#contact"
              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 font-semibold text-[#0f3c85] transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Request a demo
            </a>

            <a
              href="/uk-payroll-software.html"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white px-8 py-4 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-white"
            >
              View UK payroll software page
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}