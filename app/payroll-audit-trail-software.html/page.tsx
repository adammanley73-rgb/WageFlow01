import type { Metadata } from "next";

const siteUrl = "https://www.thebusinessconsortiumltd.co.uk";
const pageUrl = `${siteUrl}/payroll-audit-trail-software.html`;
const title = "Payroll Audit Trail Software | WageFlow";
const description =
  "WageFlow is payroll audit trail software for UK employers, payroll teams and bureaus that need clearer payroll change records, approvals, exception review and audit visibility.";

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
      applicationSubCategory: "Payroll audit trail software",
      operatingSystem: "Web",
      url: siteUrl,
      image: `${siteUrl}/wageflow-screenshot.png`,
      description:
        "WageFlow is UK payroll software designed to support payroll audit trails, exception-led payroll review, approval control, payroll change visibility and clearer payroll records.",
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
        "Payroll audit trail software",
        "Payroll change records",
        "Payroll approval control",
        "Payroll exception review",
        "PAYE and National Insurance visibility",
        "Starter and leaver payroll checks",
        "Payroll correction visibility",
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
          name: "What is payroll audit trail software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Payroll audit trail software helps payroll teams keep clearer records of payroll changes, review points, approvals, corrections and actions taken during payroll processing.",
          },
        },
        {
          "@type": "Question",
          name: "Why does payroll need an audit trail?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Payroll needs an audit trail so teams can explain what changed, who reviewed it, who approved it and why payroll figures were finalised.",
          },
        },
        {
          "@type": "Question",
          name: "Does WageFlow support payroll audit trail visibility?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. WageFlow is designed around clearer payroll records, exception-led review, approval control and audit trail visibility.",
          },
        },
        {
          "@type": "Question",
          name: "Who needs payroll audit trail software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Payroll audit trail software is useful for UK employers, payroll teams, bureaus, accountants, bookkeepers and HR teams that need clearer payroll review and approval records.",
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
          name: "Payroll Audit Trail Software",
          item: pageUrl,
        },
      ],
    },
  ],
};

const auditProblems = [
  "Payroll changes need a clear record before approval",
  "Teams need to know who reviewed payroll exceptions and when",
  "PAYE, National Insurance and deduction changes need visibility",
  "Starter, leaver and contract updates can affect payroll results",
  "Bureaus need clear records across multiple client payrolls",
  "Payroll corrections need context so later reviews are easier to explain",
];

const benefits = [
  "Keep clearer records of payroll changes and review points",
  "Support stronger payroll approval control before payday",
  "Review exceptions with better context before figures are finalised",
  "Make payroll changes easier to trace and explain",
  "Give bureaus a repeatable record trail across client payrolls",
  "Support cleaner payroll reporting and correction review",
];

const auditTrailItems = [
  {
    title: "Change visibility",
    text: "Support clearer records when payroll figures, employee details, pay elements or deductions change before approval.",
  },
  {
    title: "Review visibility",
    text: "Help payroll teams show which exceptions were reviewed before payroll was approved.",
  },
  {
    title: "Approval visibility",
    text: "Keep approval records clearer so payroll sign-off is easier to explain after payday.",
  },
  {
    title: "Correction visibility",
    text: "Support clearer context for payroll corrections, supplementary runs and later payroll review.",
  },
];

const workflow = [
  {
    title: "Prepare payroll data",
    text: "Set up the payroll run with the employees, pay schedules, tax information and payroll details needed for review.",
  },
  {
    title: "Review exceptions and changes",
    text: "Check unusual figures, missing data, pay changes, deductions, starter details, leaver records and other payroll risks.",
  },
  {
    title: "Approve with a clearer trail",
    text: "Use structured records to support payroll approval, later review, correction handling and client or internal questions.",
  },
];

const audiences = [
  {
    title: "UK employers",
    text: "For employers that need clearer payroll records before wages are approved.",
  },
  {
    title: "Payroll teams",
    text: "For payroll professionals who need to review and explain payroll changes.",
  },
  {
    title: "Payroll bureaus",
    text: "For bureaus that need repeatable audit visibility across multiple client payrolls.",
  },
  {
    title: "Accountants and bookkeepers",
    text: "For advisers supporting payroll work where audit trails and approval records matter.",
  },
];

const faqs = [
  {
    question: "What should a payroll audit trail include?",
    answer:
      "A payroll audit trail should include clear records of payroll changes, review points, approvals, exceptions, corrections and actions taken before payroll is finalised.",
  },
  {
    question: "Why is payroll audit visibility important?",
    answer:
      "Payroll audit visibility helps teams explain payroll outcomes, investigate changes, review corrections and show that payroll was checked before approval.",
  },
  {
    question: "Can audit trails help payroll bureaus?",
    answer:
      "Yes. Payroll bureaus can use audit trail visibility to create a more consistent review process across client payrolls and support clearer client conversations.",
  },
  {
    question: "Does WageFlow focus on payroll audit trails?",
    answer:
      "WageFlow is built around exception-led payroll review, approval control and clearer payroll records, which supports stronger audit trail visibility.",
  },
];

const internalLinks = [
  {
    href: "/payroll-exception-reporting.html",
    title: "Payroll exception reporting",
    text: "See the WageFlow page for exception-led payroll review.",
  },
  {
    href: "/paye-payroll-software.html",
    title: "PAYE payroll software",
    text: "See the WageFlow page for PAYE payroll review and approval workflow.",
  },
  {
    href: "/payroll-software-for-bureaus.html",
    title: "Payroll bureau software",
    text: "See the WageFlow page for payroll bureaus and multi-client teams.",
  },
];

export default function PayrollAuditTrailSoftwarePage() {
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
              Payroll audit trail software
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl lg:text-6xl">
              Payroll audit trail software for clearer review and approval records
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-700">
              WageFlow helps UK employers, payroll teams and bureaus keep clearer payroll change
              records, review exceptions and approve payroll with better audit visibility before
              payday.
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
              Built for payroll audit visibility
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-950">
              Track the payroll review trail before payday
            </h2>
            <p className="mt-3 text-gray-700">
              Payroll audit trails help teams understand what changed, what was reviewed and how
              payroll was approved.
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
              Why payroll audit trails matter
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              Payroll teams need records that explain changes, approvals and review decisions. A
              clearer audit trail helps make payroll easier to check, approve and review later.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {auditProblems.map((problem) => (
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
              What payroll audit trail software should make clearer
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is designed to support clearer visibility around payroll changes, review
              points, approvals and corrections.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {auditTrailItems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold text-gray-950">{item.title}</h3>
                <p className="mt-3 leading-7 text-gray-700">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              Benefits of clearer payroll audit trails
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow gives payroll teams a cleaner way to connect exception review, approval
              control and payroll records.
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

      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              A clearer payroll audit workflow
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow helps payroll teams move from payroll preparation to exception review,
              approval and later record checking with clearer context throughout the process.
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

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              Payroll audit trail software for different teams
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is designed for payroll work where review, records and approval visibility
              matter.
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

      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              Explore more WageFlow payroll software pages
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              Review related WageFlow pages for payroll exception reporting, PAYE payroll and
              payroll bureau workflow.
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

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-950 sm:text-4xl">
              Payroll audit trail software FAQs
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              Straight answers for payroll teams reviewing audit trail visibility in payroll
              software.
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
            Review WageFlow for payroll audit trail visibility
          </h2>
          <p className="mt-4 text-lg leading-8 text-blue-50">
            Request a demo if you want to review how WageFlow can support clearer payroll records,
            exception review, approval control and audit trail visibility.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/#contact"
              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 font-semibold text-[#0f3c85] transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Request a demo
            </a>

            <a
              href="/payroll-exception-reporting.html"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white px-8 py-4 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-white"
            >
              View payroll exception reporting page
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}