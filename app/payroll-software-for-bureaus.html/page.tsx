import type { Metadata } from "next";

const siteUrl = "https://www.thebusinessconsortiumltd.co.uk";
const pageUrl = `${siteUrl}/payroll-software-for-bureaus.html`;
const title = "Payroll Software for Payroll Bureaus | WageFlow";
const description =
  "WageFlow is payroll software for payroll bureaus and multi-client payroll teams that need repeatable workflow, exception-led review, approval control, audit trails and clearer client payroll processing.";

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
      applicationSubCategory: "Payroll software for bureaus",
      operatingSystem: "Web",
      url: siteUrl,
      image: `${siteUrl}/wageflow-screenshot.png`,
      description:
        "WageFlow is UK payroll software for payroll bureaus and multi-client payroll processors that want repeatable payroll workflow, exception review, approval control and audit trail visibility.",
      provider: {
        "@id": `${siteUrl}/#organization`,
      },
      audience: [
        {
          "@type": "Audience",
          audienceType: "Payroll bureaus",
        },
        {
          "@type": "Audience",
          audienceType: "Accountants",
        },
        {
          "@type": "Audience",
          audienceType: "Bookkeepers",
        },
        {
          "@type": "Audience",
          audienceType: "Multi-client payroll teams",
        },
      ],
      featureList: [
        "Payroll software for payroll bureaus",
        "Multi-client payroll workflow",
        "Payroll exception review",
        "Payroll approval control",
        "Payroll audit trail",
        "PAYE and National Insurance visibility",
        "Starter and leaver workflow",
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
          name: "What payroll software do payroll bureaus need?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Payroll bureaus need software that supports repeatable payroll workflow, multiple client payrolls, exception review, approval control, audit trails, reports and clear payroll records.",
          },
        },
        {
          "@type": "Question",
          name: "Is WageFlow suitable for payroll bureaus?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "WageFlow is designed for UK payroll workflow and can support bureaus, accountants, bookkeepers and payroll teams that need clearer review before approval.",
          },
        },
        {
          "@type": "Question",
          name: "Can WageFlow help with payroll exception review?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. WageFlow is built around exception-led payroll review so teams can focus on items that need checking before payroll approval.",
          },
        },
        {
          "@type": "Question",
          name: "Can payroll bureaus request a WageFlow demo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Payroll bureaus can request a WageFlow demo through The Business Consortium Ltd website.",
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
          name: "Payroll Software for Payroll Bureaus",
          item: pageUrl,
        },
      ],
    },
  ],
};

const bureauProblems = [
  "Multiple payrolls need a repeatable review process",
  "Different clients create different approval risks",
  "Payroll exceptions can be missed when work is rushed",
  "Audit trails need to explain who changed what and why",
  "Client confidence depends on payroll being controlled before payday",
  "Bureau teams need consistency without adding more admin sludge",
];

const benefits = [
  "Review payroll exceptions before client approval",
  "Use a repeatable payroll workflow across client payrolls",
  "Keep PAYE and National Insurance visibility in the process",
  "Support clearer starter, leaver, absence and payslip handling",
  "Create stronger audit trails for payroll changes",
  "Give payroll processors a cleaner route from run creation to sign-off",
];

const workflow = [
  {
    title: "Prepare each payroll run",
    text: "Set up the payroll run with the employee, pay schedule and company information needed for controlled processing.",
  },
  {
    title: "Review the exceptions",
    text: "Use exception-led review to focus attention on unusual items, changes, movements and figures that need checking.",
  },
  {
    title: "Approve with an audit trail",
    text: "Keep the approval process visible and easier to explain to clients, managers and anyone else who appears after payday asking questions.",
  },
];

const faqs = [
  {
    question: "What is payroll software for payroll bureaus?",
    answer:
      "It is payroll software built to help bureaus process payroll for multiple clients with repeatable workflow, clear records, exception review and approval control.",
  },
  {
    question: "Why do bureaus need exception-led payroll review?",
    answer:
      "Exception-led review helps payroll teams focus on the entries that need attention instead of manually reviewing every line with the patience of a trapped monk.",
  },
  {
    question: "Does WageFlow support audit trail visibility?",
    answer:
      "WageFlow is designed around clearer payroll records, approval workflow and audit trail visibility so changes are easier to explain later.",
  },
  {
    question: "Is WageFlow only for payroll bureaus?",
    answer:
      "No. WageFlow is also built for UK SMEs, payroll professionals, HR teams, accountants and bookkeepers that need cleaner payroll workflow.",
  },
];

export default function PayrollBureauSoftwarePage() {
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
              Payroll software for payroll bureaus
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl lg:text-6xl">
              Payroll software for bureaus that need repeatable review and cleaner approval
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-700">
              WageFlow helps payroll bureaus, accountants, bookkeepers and multi-client payroll
              teams review payroll exceptions, control approvals and keep clearer audit trails
              before payday. It is built for payroll work that needs consistency, not hopeful
              spreadsheet archaeology.
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
              Built for multi-client payroll
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-950">
              Keep client payroll review consistent
            </h2>
            <p className="mt-3 text-gray-700">
              Bureau payroll needs repeatable checks, visible approvals and records that can
              survive client questions after payday.
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
              Why payroll bureaus need controlled workflow
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              Processing payroll for multiple clients means the same risks repeat again and again.
              WageFlow is designed to make review, approval and audit trails clearer across payroll
              work.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {bureauProblems.map((problem) => (
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
              What WageFlow helps payroll bureaus do
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow gives bureau teams a cleaner route through payroll processing, exception
              review and approval.
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
              A repeatable payroll process for client work
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is designed to support repeatable payroll workflow so bureau teams can
              review exceptions, keep approval visible and reduce preventable rework.
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
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              Payroll bureau software FAQs
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              Straight answers for payroll teams processing multiple clients without needing more
              admin theatre.
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
            Review WageFlow for your payroll bureau workflow
          </h2>
          <p className="mt-4 text-lg leading-8 text-blue-50">
            Request a demo if you want to review how WageFlow can support repeatable payroll
            processing, exception review and clearer client approval.
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