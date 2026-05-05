import type { Metadata } from "next";

const siteUrl = "https://www.thebusinessconsortiumltd.co.uk";
const pageUrl = `${siteUrl}/payroll-anomaly-detection.html`;
const title = "Payroll Anomaly Detection | WageFlow";
const description =
  "WageFlow supports payroll anomaly detection workflow for UK employers, payroll teams and bureaus that need clearer exception review, unusual pay movement checks, approval control and audit visibility.";

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
      applicationSubCategory: "Payroll anomaly detection software",
      operatingSystem: "Web",
      url: siteUrl,
      image: `${siteUrl}/wageflow-screenshot.png`,
      description:
        "WageFlow is UK payroll software designed to support payroll anomaly detection workflow, exception-led payroll review, approval control, audit trail visibility and clearer payroll records.",
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
        "Payroll anomaly detection workflow",
        "Exception-led payroll review",
        "Unusual pay movement checks",
        "PAYE and National Insurance visibility",
        "Payroll approval control",
        "Payroll audit trail visibility",
        "Starter and leaver payroll checks",
        "Payroll reporting and exports",
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
          name: "What is payroll anomaly detection?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Payroll anomaly detection helps payroll teams identify unusual payroll figures, unexpected pay movements, missing data and other items that may need review before approval.",
          },
        },
        {
          "@type": "Question",
          name: "Why does payroll anomaly detection matter?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Payroll anomaly detection helps teams focus review time on payroll entries that look unusual, reducing the risk of preventable errors before payroll is finalised.",
          },
        },
        {
          "@type": "Question",
          name: "Does WageFlow support payroll anomaly detection workflow?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "WageFlow is designed around exception-led payroll review, unusual pay movement checks, approval control, audit trail visibility and clearer payroll records.",
          },
        },
        {
          "@type": "Question",
          name: "Who needs payroll anomaly detection?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Payroll anomaly detection is useful for UK employers, payroll teams, bureaus, accountants, bookkeepers and HR teams that need stronger review before payroll approval.",
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
          name: "Payroll Anomaly Detection",
          item: pageUrl,
        },
      ],
    },
  ],
};

const anomalyProblems = [
  "Unexpected gross pay or net pay movements need review before approval",
  "Unusual PAYE, National Insurance or pension values can be missed under deadline pressure",
  "Starter, leaver and contract changes can create payroll risk",
  "Manual review can waste time on normal entries while unusual items slip through",
  "Bureaus need repeatable anomaly review across multiple client payrolls",
  "Audit trails need to show how unusual payroll items were checked and approved",
];

const benefits = [
  "Focus payroll review on unusual figures and risky changes",
  "Review PAYE, National Insurance, pension and deduction movements before approval",
  "Support clearer starter, leaver, absence and pay element checks",
  "Give payroll teams stronger approval control before payday",
  "Keep clearer records of reviewed payroll anomalies",
  "Help bureaus use a repeatable anomaly review process across client payrolls",
];

const anomalyTypes = [
  {
    title: "Pay movement anomalies",
    text: "Review unusual changes in gross pay, net pay, overtime, bonus, deductions or pay elements before payroll is approved.",
  },
  {
    title: "Tax and NI anomalies",
    text: "Keep PAYE and National Insurance visibility close to payroll review so unusual figures can be checked before finalisation.",
  },
  {
    title: "Employee change anomalies",
    text: "Review starter, leaver, contract, absence, pay schedule and employee data changes that can affect payroll results.",
  },
  {
    title: "Approval anomalies",
    text: "Support clearer approval records where unusual payroll entries have been reviewed before payday.",
  },
];

const workflow = [
  {
    title: "Prepare the payroll run",
    text: "Create the payroll run with employees, pay schedules, tax details, starters, leavers and payroll context ready for review.",
  },
  {
    title: "Review payroll anomalies",
    text: "Check unusual pay movements, PAYE, National Insurance, deductions, employee changes and other items that need attention.",
  },
  {
    title: "Approve with clearer records",
    text: "Use structured review records to support payroll approval, audit visibility and later correction review.",
  },
];

const audiences = [
  {
    title: "UK employers",
    text: "For employers that want clearer checks before wages are approved.",
  },
  {
    title: "Payroll teams",
    text: "For payroll professionals who need to review unusual payroll entries before finalising payroll.",
  },
  {
    title: "Payroll bureaus",
    text: "For bureaus that need repeatable anomaly review across multiple client payrolls.",
  },
  {
    title: "Accountants and bookkeepers",
    text: "For advisers supporting payroll work where unusual figures, records and approval visibility matter.",
  },
];

const faqs = [
  {
    question: "What should payroll anomaly detection look for?",
    answer:
      "Payroll anomaly detection should help highlight unusual pay movements, unexpected tax or National Insurance values, deduction changes, missing data, starter and leaver issues and approval risks.",
  },
  {
    question: "Is payroll anomaly detection the same as payroll exception reporting?",
    answer:
      "They are closely related. Payroll anomaly detection focuses on unusual items, while payroll exception reporting helps organise those items for review and approval.",
  },
  {
    question: "Can payroll anomaly detection reduce payroll errors?",
    answer:
      "It can help reduce preventable payroll errors by making unusual or risky items easier to review before payroll is approved.",
  },
  {
    question: "Is payroll anomaly detection useful for payroll bureaus?",
    answer:
      "Yes. Payroll bureaus can use anomaly detection workflow to create a repeatable review process across client payrolls, especially where approval control and audit visibility matter.",
  },
];

const internalLinks = [
  {
    href: "/payroll-exception-reporting.html",
    title: "Payroll exception reporting",
    text: "See the WageFlow page for exception-led payroll review.",
  },
  {
    href: "/payroll-audit-trail-software.html",
    title: "Payroll audit trail software",
    text: "See the WageFlow page for payroll audit trail visibility.",
  },
  {
    href: "/paye-payroll-software.html",
    title: "PAYE payroll software",
    text: "See the WageFlow page for PAYE payroll review and approval workflow.",
  },
];

export default function PayrollAnomalyDetectionPage() {
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
              Payroll anomaly detection
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl lg:text-6xl">
              Payroll anomaly detection for clearer review before approval
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-700">
              WageFlow helps UK employers, payroll teams and bureaus review unusual payroll
              figures, check risky pay movements and approve payroll with clearer records before
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
              Built for unusual payroll review
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-950">
              Check payroll entries that need attention
            </h2>
            <p className="mt-3 text-gray-700">
              Payroll anomaly detection workflow helps teams focus review time on unusual figures,
              pay movements and employee changes before payroll is approved.
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
              Why payroll anomaly detection matters
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              Payroll teams need to know what looks unusual before approval. Anomaly detection
              workflow helps highlight payroll entries that need human review and clearer records.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {anomalyProblems.map((problem) => (
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
              What payroll anomaly detection should make clearer
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is designed to support clearer visibility around unusual payroll figures,
              employee changes, approvals and audit records.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {anomalyTypes.map((item) => (
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
              Benefits of payroll anomaly detection workflow
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow gives payroll teams a cleaner way to connect unusual payroll checks,
              exception review, approval control and payroll records.
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
              A clearer anomaly review workflow
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow helps payroll teams move from payroll preparation to anomaly review,
              exception reporting, approval and audit trail visibility with clearer context.
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
              Payroll anomaly detection for different teams
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is designed for payroll work where unusual figures, records and approval
              visibility matter.
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
              Review related WageFlow pages for exception reporting, audit trails and PAYE payroll
              workflow.
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
              Payroll anomaly detection FAQs
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              Straight answers for payroll teams reviewing anomaly detection and exception-led
              payroll workflow.
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
            Review WageFlow for payroll anomaly detection workflow
          </h2>
          <p className="mt-4 text-lg leading-8 text-blue-50">
            Request a demo if you want to review how WageFlow can support unusual payroll checks,
            exception-led review, approval control and audit trail visibility.
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