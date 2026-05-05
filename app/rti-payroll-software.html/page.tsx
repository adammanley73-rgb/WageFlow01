import type { Metadata } from "next";

const siteUrl = "https://www.thebusinessconsortiumltd.co.uk";
const pageUrl = `${siteUrl}/rti-payroll-software.html`;
const title = "RTI Payroll Software | WageFlow";
const description =
  "WageFlow supports RTI payroll software workflow for UK employers, payroll teams and bureaus that need clearer FPS, EPS, PAYE, NI, payroll approval and audit trail visibility before submission.";

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
      applicationSubCategory: "RTI payroll software",
      operatingSystem: "Web",
      url: siteUrl,
      image: `${siteUrl}/wageflow-screenshot.png`,
      description:
        "WageFlow is UK payroll software designed to support RTI payroll workflow, FPS and EPS review, PAYE and National Insurance visibility, payroll approval control and audit trail records.",
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
        "RTI payroll software workflow",
        "FPS payroll workflow visibility",
        "EPS payroll workflow visibility",
        "PAYE and National Insurance review",
        "Payroll exception reporting",
        "Payroll audit trail visibility",
        "Payroll approval control",
        "Starter and leaver payroll checks",
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
          name: "What is RTI payroll software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "RTI payroll software helps UK payroll teams manage payroll workflow connected to Real Time Information reporting, including FPS and EPS payroll processes.",
          },
        },
        {
          "@type": "Question",
          name: "What does RTI mean in payroll?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "RTI means Real Time Information. It is the payroll reporting framework used for payroll information submitted to HMRC through processes such as FPS and EPS.",
          },
        },
        {
          "@type": "Question",
          name: "Does WageFlow support RTI payroll workflow?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "WageFlow is designed to support clearer payroll review, approval control, audit trail visibility and RTI workflow preparation for UK payroll teams.",
          },
        },
        {
          "@type": "Question",
          name: "Who needs RTI payroll software?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "RTI payroll software is useful for UK employers, payroll teams, bureaus, accountants, bookkeepers and HR teams that need clearer payroll review before reporting deadlines.",
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
          name: "RTI Payroll Software",
          item: pageUrl,
        },
      ],
    },
  ],
};

const rtiProblems = [
  "Payroll needs to be reviewed clearly before FPS or EPS workflow is prepared",
  "PAYE and National Insurance values need visibility before payroll is finalised",
  "Starter, leaver and employee changes can affect payroll reporting context",
  "Payroll exceptions need checking before submission decisions are made",
  "Bureaus need repeatable RTI workflow checks across multiple client payrolls",
  "Audit trails need to show how payroll was reviewed and approved before reporting",
];

const benefits = [
  "Review payroll exceptions before RTI workflow moves forward",
  "Keep PAYE and National Insurance visibility in the approval process",
  "Support clearer FPS and EPS payroll preparation workflow",
  "Create stronger records around payroll review and approval",
  "Give payroll bureaus a repeatable process across client payrolls",
  "Support clearer audit trail visibility before and after payroll reporting",
];

const rtiWorkflowItems = [
  {
    title: "FPS workflow visibility",
    text: "Support clearer review before Full Payment Submission workflow is prepared from payroll run records.",
  },
  {
    title: "EPS workflow visibility",
    text: "Support clearer Employer Payment Summary workflow context where payroll adjustments or employer-level reporting items need review.",
  },
  {
    title: "PAYE and NI review",
    text: "Keep PAYE and National Insurance visibility close to payroll approval so payroll teams can check figures before finalising runs.",
  },
  {
    title: "RTI audit context",
    text: "Support clearer records around payroll review, approval and reporting preparation so later questions are easier to answer.",
  },
];

const workflow = [
  {
    title: "Prepare the payroll run",
    text: "Create the payroll run with employees, pay schedules, tax details, starters, leavers and payroll context ready for review.",
  },
  {
    title: "Review exceptions before approval",
    text: "Check pay movements, PAYE, National Insurance, deductions, starter details, leaver records and other items that affect payroll reporting context.",
  },
  {
    title: "Move forward with clearer records",
    text: "Use structured payroll records to support approval, RTI workflow preparation, later review and payroll audit visibility.",
  },
];

const audiences = [
  {
    title: "UK employers",
    text: "For employers that need clearer payroll workflow before RTI reporting steps.",
  },
  {
    title: "Payroll teams",
    text: "For payroll professionals who need to review payroll before approval and reporting preparation.",
  },
  {
    title: "Payroll bureaus",
    text: "For bureaus that need repeatable RTI workflow checks across multiple client payrolls.",
  },
  {
    title: "Accountants and bookkeepers",
    text: "For advisers supporting payroll work where RTI workflow, records and approval visibility matter.",
  },
];

const faqs = [
  {
    question: "What should RTI payroll software help with?",
    answer:
      "RTI payroll software should help payroll teams manage payroll workflow, review PAYE and National Insurance values, prepare payroll records and support FPS and EPS reporting processes.",
  },
  {
    question: "Why should payroll be reviewed before RTI workflow?",
    answer:
      "Payroll should be reviewed before RTI workflow so unusual figures, missing employee details, starter or leaver issues and approval risks can be checked before payroll is finalised.",
  },
  {
    question: "Can RTI payroll workflow help payroll bureaus?",
    answer:
      "Yes. Payroll bureaus can use clearer RTI workflow to review client payrolls more consistently before reporting and approval steps.",
  },
  {
    question: "How does WageFlow relate to RTI payroll?",
    answer:
      "WageFlow focuses on clearer payroll review, approval control, audit trail visibility and payroll workflow that supports RTI preparation for UK payroll teams.",
  },
];

const internalLinks = [
  {
    href: "/paye-payroll-software.html",
    title: "PAYE payroll software",
    text: "See the WageFlow page for PAYE payroll review and approval workflow.",
  },
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
];

export default function RtiPayrollSoftwarePage() {
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
              RTI payroll software
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl lg:text-6xl">
              RTI payroll software workflow for clearer payroll reporting preparation
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-700">
              WageFlow helps UK employers, payroll teams and bureaus review payroll exceptions,
              check PAYE and National Insurance visibility and keep clearer records before RTI
              payroll workflow moves forward.
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
              Built for RTI payroll workflow visibility
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-950">
              Review payroll before reporting steps
            </h2>
            <p className="mt-3 text-gray-700">
              RTI payroll workflow needs clear review before submission decisions. WageFlow is
              designed to support review, approvals and records before payroll moves forward.
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
              Why RTI payroll workflow needs clear review
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              Payroll teams need to review payroll data, employee changes and exception items before
              payroll is approved and reporting workflow moves forward.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {rtiProblems.map((problem) => (
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
              What RTI payroll software should make clearer
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is designed to support clearer visibility around RTI payroll preparation,
              review and approval workflow.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {rtiWorkflowItems.map((item) => (
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
              Benefits of clearer RTI payroll workflow
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow gives payroll teams a cleaner route through review, approval and reporting
              preparation workflow.
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
              A clearer RTI payroll workflow
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow helps payroll teams move from payroll preparation to exception review,
              approval and RTI workflow preparation with clearer context throughout the process.
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
              RTI payroll software for different teams
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is designed for payroll work where RTI workflow, review, records and
              approval visibility matter.
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
              Review related WageFlow pages for PAYE payroll, exception reporting and audit trail
              visibility.
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
              RTI payroll software FAQs
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              Straight answers for payroll teams reviewing RTI payroll workflow and reporting
              preparation.
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
            Review WageFlow for RTI payroll workflow
          </h2>
          <p className="mt-4 text-lg leading-8 text-blue-50">
            Request a demo if you want to review how WageFlow can support payroll exception review,
            approval control, audit trail visibility and RTI workflow preparation.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/#contact"
              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 font-semibold text-[#0f3c85] transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Request a demo
            </a>

            <a
              href="/paye-payroll-software.html"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white px-8 py-4 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-white"
            >
              View PAYE payroll software page
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}