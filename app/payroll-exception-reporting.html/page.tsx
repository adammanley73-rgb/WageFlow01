import type { Metadata } from "next";

const siteUrl = "https://www.thebusinessconsortiumltd.co.uk";
const pageUrl = `${siteUrl}/payroll-exception-reporting.html`;
const title = "Payroll Exception Reporting | WageFlow";
const description =
  "WageFlow supports payroll exception reporting for UK employers, payroll teams and bureaus that need clearer checks, approval control, audit trails and payroll review before payday.";

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
      applicationSubCategory: "Payroll exception reporting software",
      operatingSystem: "Web",
      url: siteUrl,
      image: `${siteUrl}/wageflow-screenshot.png`,
      description:
        "WageFlow is UK payroll software built around exception-led payroll review, clearer approval control, payroll audit trails and payroll reporting visibility.",
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
        "Payroll exception reporting",
        "Exception-led payroll review",
        "Payroll approval control",
        "Payroll audit trail",
        "PAYE and National Insurance visibility",
        "Payroll variance review",
        "Starter and leaver payroll checks",
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
          name: "What is payroll exception reporting?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Payroll exception reporting helps payroll teams identify unusual payroll items, changes, missing data, pay movements and other issues that need review before payroll approval.",
          },
        },
        {
          "@type": "Question",
          name: "Why is payroll exception reporting important?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Payroll exception reporting helps teams focus on the payroll entries that need attention before payday, reducing preventable errors and making approvals easier to explain.",
          },
        },
        {
          "@type": "Question",
          name: "Does WageFlow support payroll exception reporting?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. WageFlow is designed around exception-led payroll review, approval control, audit trails and clearer payroll records.",
          },
        },
        {
          "@type": "Question",
          name: "Who needs payroll exception reporting?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Payroll exception reporting is useful for UK employers, payroll professionals, HR teams, bureaus, accountants and bookkeepers that need stronger payroll review before approval.",
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
          name: "Payroll Exception Reporting",
          item: pageUrl,
        },
      ],
    },
  ],
};

const exceptionProblems = [
  "Unexpected gross pay movements need review before payroll approval",
  "Missing starter, leaver or tax information can affect payroll accuracy",
  "PAYE, National Insurance and pension figures need visibility before sign-off",
  "Manual payroll checks can miss unusual items under deadline pressure",
  "Bureaus need a repeatable way to review exceptions across client payrolls",
  "Audit trails need to explain what changed, who reviewed it and why it was approved",
];

const benefits = [
  "Focus payroll review on entries that need attention",
  "Review pay movements, tax, National Insurance and deduction issues before approval",
  "Support clearer starter, leaver, absence and pay element checks",
  "Give payroll teams stronger approval control before payday",
  "Keep clearer payroll records for audit trails and later questions",
  "Help bureaus use a repeatable exception review process across clients",
];

const exceptionTypes = [
  {
    title: "Pay movement exceptions",
    text: "Flag unusual gross pay, net pay, overtime, bonus or deduction movements before payroll is approved.",
  },
  {
    title: "Employee data exceptions",
    text: "Review starter, leaver, contract, pay schedule, tax code and National Insurance issues that can affect payroll results.",
  },
  {
    title: "Approval exceptions",
    text: "Keep review points visible so payroll approval is based on checked information, clear records and a repeatable review process.",
  },
  {
    title: "Audit trail exceptions",
    text: "Support clearer records of changes, reviews and decisions so payroll can be explained after the run is complete.",
  },
];

const workflow = [
  {
    title: "Prepare the payroll run",
    text: "Set up the payroll run with the employees, pay schedules and payroll context needed before review starts.",
  },
  {
    title: "Review payroll exceptions",
    text: "Check unusual figures, missing information, employee changes, deductions, PAYE, National Insurance and other items that need attention.",
  },
  {
    title: "Approve with clearer evidence",
    text: "Use the review record to support payroll approval, reduce preventable rework and make the final payroll easier to explain.",
  },
];

const audiences = [
  {
    title: "UK employers",
    text: "For employers that want clearer payroll checks before wages are approved.",
  },
  {
    title: "Payroll teams",
    text: "For payroll professionals who need to review exceptions before payroll is finalised.",
  },
  {
    title: "Payroll bureaus",
    text: "For bureaus that need repeatable exception reporting across multiple client payrolls.",
  },
  {
    title: "Accountants and bookkeepers",
    text: "For advisers supporting payroll work where review, records and approval visibility matter.",
  },
];

const faqs = [
  {
    question: "What should payroll exception reporting include?",
    answer:
      "Payroll exception reporting should highlight unusual pay movements, missing data, starter and leaver changes, tax-code issues, deduction changes, pension issues and approval risks.",
  },
  {
    question: "How does exception-led payroll review help?",
    answer:
      "Exception-led payroll review helps teams focus on items that need checking instead of manually reviewing every payroll line with the same level of attention.",
  },
  {
    question: "Can payroll exception reporting reduce payroll errors?",
    answer:
      "It can help reduce preventable payroll errors by making unusual or risky items easier to review before payroll is approved.",
  },
  {
    question: "Is payroll exception reporting useful for payroll bureaus?",
    answer:
      "Yes. Payroll bureaus can use exception reporting to create a repeatable review process across client payrolls, especially where approval control and audit trails matter.",
  },
];

const internalLinks = [
  {
    href: "/uk-payroll-software.html",
    title: "UK payroll software",
    text: "See the broader WageFlow page for UK payroll teams.",
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

export default function PayrollExceptionReportingPage() {
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
              Payroll exception reporting
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl lg:text-6xl">
              Payroll exception reporting for clearer review before payday
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-700">
              WageFlow helps UK employers, payroll teams and bureaus review payroll exceptions,
              check unusual figures and approve payroll with clearer records before payday.
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
              Built for exception-led payroll review
            </p>
            <h2 className="mt-3 text-2xl font-bold text-gray-950">
              Focus on the payroll entries that need attention
            </h2>
            <p className="mt-3 text-gray-700">
              Payroll exception reporting helps teams review unusual items before approval, so
              payroll is checked with more structure and less last-minute guesswork.
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
              Why payroll exception reporting matters
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              Payroll teams need to know what changed before approval. Exception reporting gives
              them a clearer way to review unusual items, missing information and payroll risks.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {exceptionProblems.map((problem) => (
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
              What WageFlow helps payroll teams review
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow supports a practical exception-led payroll process so teams can check the
              right issues before approval.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {exceptionTypes.map((item) => (
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
              Benefits of exception-led payroll reporting
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow gives payroll teams a clearer way to move from payroll preparation to
              exception review and approval.
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
              A cleaner payroll exception workflow
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is built to help payroll teams review exceptions before approval, keep
              records clearer and reduce avoidable rework after payroll is finalised.
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
              Payroll exception reporting for different teams
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is designed for teams that need to review payroll clearly before approval.
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
              Review related WageFlow pages for UK payroll software, PAYE payroll and payroll
              bureau workflow.
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
              Payroll exception reporting FAQs
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              Straight answers for payroll teams reviewing exception-led payroll software.
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
            Review WageFlow for payroll exception reporting
          </h2>
          <p className="mt-4 text-lg leading-8 text-blue-50">
            Request a demo if you want to review how WageFlow can support exception-led payroll
            review, approval control and clearer payroll records.
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