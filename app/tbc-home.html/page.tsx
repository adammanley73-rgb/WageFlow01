import type { Metadata } from "next";

const siteUrl = "https://www.thebusinessconsortiumltd.co.uk";
const pageUrl = siteUrl + "/tbc-home.html";
const title = "The Business Consortium Ltd | Payroll and HR Software Company";
const description =
  "The Business Consortium Ltd is a Liverpool-based software company building practical payroll and HR tools for UK businesses. WageFlow is the live payroll product and PeopleFlow is in development.";

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
    siteName: "The Business Consortium Ltd",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

const productBadges = ["PAYE", "RTI", "Anomaly Detection", "AI Copilot", "Audit Trail"];
const peopleFlowBadges = ["Absence Management", "Contracts", "Employee Records", "Onboarding", "Payroll Integration"];

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
        addressLocality: "Liverpool",
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
    },
    {
      "@type": "SoftwareApplication",
      "@id": siteUrl + "/#wageflow",
      name: "WageFlow",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Payroll software",
      operatingSystem: "Web",
      url: siteUrl,
      provider: {
        "@id": siteUrl + "/#organization",
      },
    },
    {
      "@type": "WebPage",
      "@id": pageUrl + "#webpage",
      url: pageUrl,
      name: title,
      description,
      isPartOf: {
        "@id": siteUrl + "/#website",
      },
      about: {
        "@id": siteUrl + "/#organization",
      },
    }
  ],
};

export default function TBCHomePage() {
  return (
    <main className="min-h-screen bg-white text-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <a href="/tbc-home.html" className="rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]">
            <span className="block text-lg font-bold text-[#0f3c85]">The Business Consortium Ltd</span>
            <span className="block text-sm text-gray-600">Payroll and HR software company</span>
          </a>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-gray-700 md:flex">
            <a href="#about" className="hover:text-gray-950">About</a>
            <a href="#products" className="hover:text-gray-950">Products</a>
            <a href="#story" className="hover:text-gray-950">Our Story</a>
            <a href="/" className="rounded-lg bg-[#0f3c85] px-5 py-3 text-white hover:opacity-95">
              Visit WageFlow
            </a>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-[#0f3c85]">
              Liverpool, United Kingdom
            </p>

            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl lg:text-6xl">
              Payroll and HR software built for real UK businesses.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-700">
              The Business Consortium Ltd builds practical payroll and HR tools for UK businesses.
              WageFlow is our live payroll product. PeopleFlow is in development to connect HR records,
              absence, contracts and onboarding into the payroll workflow.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-lg bg-[#0f3c85] px-8 py-4 text-base font-semibold text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Visit WageFlow
              </a>
              <a
                href="mailto:enquiries@thebusinessconsortiumltd.co.uk?subject=The%20Business%20Consortium%20Ltd%20enquiry"
                className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 px-8 py-4 text-base font-semibold text-gray-900 transition hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Get in touch
              </a>
            </div>

            <p className="mt-6 text-sm font-semibold text-gray-700">
              Founded by a disabled UK Armed Forces veteran. Built in Liverpool.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#0f3c85]">
                Live product
              </p>
              <h2 className="mt-3 text-3xl font-bold text-gray-950">WageFlow</h2>
              <p className="mt-4 text-gray-700">
                UK payroll software for SMEs, payroll teams and bureaus. Built around PAYE,
                National Insurance, RTI workflow, exception-led review, audit trail and approval control.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {productBadges.map((badge) => (
                  <span key={badge} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0f3c85]">
                    {badge}
                  </span>
                ))}
              </div>
              <a href="/" className="mt-6 inline-flex font-semibold text-[#0f3c85] hover:underline">
                Visit WageFlow
              </a>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                Next product in development
              </p>
              <h2 className="mt-3 text-2xl font-bold text-gray-950">PeopleFlow</h2>
              <p className="mt-4 text-gray-700">
                PeopleFlow will connect HR records, absence, contracts and onboarding into the payroll workflow.
                It is being designed to support WageFlow, not distract from it.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {peopleFlowBadges.map((badge) => (
                  <span key={badge} className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-700 ring-1 ring-gray-200">
                    {badge}
                  </span>
                ))}
              </div>
              <a
                href="mailto:enquiries@thebusinessconsortiumltd.co.uk?subject=PeopleFlow%20interest"
                className="mt-6 inline-flex font-semibold text-[#0f3c85] hover:underline"
              >
                Register interest
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#0f3c85]">Who we are</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-950 sm:text-4xl">
              Built in Liverpool. Built for UK business.
            </h2>
          </div>

          <div className="space-y-5 text-lg leading-8 text-gray-700">
            <p>
              The Business Consortium Ltd is a Liverpool-based software company building payroll and HR tools for UK businesses.
            </p>
            <p>
              We are not trying to be a broad consultancy. We are building focused software for the people who have to run payroll,
              manage records, keep audit trails clean and explain what happened when something changes.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-2xl font-bold text-[#0f3c85]">UK</p>
                <p className="mt-1 text-sm font-semibold text-gray-700">UK-focused workflow</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-2xl font-bold text-[#0f3c85]">RTI</p>
                <p className="mt-1 text-sm font-semibold text-gray-700">Payroll compliance focus</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-2xl font-bold text-[#0f3c85]">LIV</p>
                <p className="mt-1 text-sm font-semibold text-gray-700">Liverpool based</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#0f3c85]">Our products</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-950 sm:text-4xl">
              Software built for people who run payroll and HR for real.
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-700">
              WageFlow is the live product. PeopleFlow is the next product in development.
              The direction is simple: connect payroll and HR records without creating a bloated enterprise monster.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <p className="inline-flex rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                Live
              </p>
              <h3 className="mt-5 text-2xl font-bold text-gray-950">WageFlow</h3>
              <p className="mt-4 leading-7 text-gray-700">
                WageFlow helps UK employers, payroll professionals and bureaus review payroll before approval,
                with clearer visibility over PAYE, National Insurance, starters, leavers, payroll changes and audit trail.
              </p>
              <a href="/" className="mt-6 inline-flex font-semibold text-[#0f3c85] hover:underline">
                Visit WageFlow
              </a>
            </article>

            <article className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <p className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#0f3c85]">
                In development
              </p>
              <h3 className="mt-5 text-2xl font-bold text-gray-950">PeopleFlow</h3>
              <p className="mt-4 leading-7 text-gray-700">
                PeopleFlow will support HR records, contracts, onboarding and absence data with a direct path into payroll.
                It sits behind WageFlow in priority because payroll is the live commercial product.
              </p>
              <a
                href="mailto:enquiries@thebusinessconsortiumltd.co.uk?subject=PeopleFlow%20interest"
                className="mt-6 inline-flex font-semibold text-[#0f3c85] hover:underline"
              >
                Register interest
              </a>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-blue-100 bg-blue-50 p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#0f3c85]">Why payroll first</p>
          <h2 className="mt-3 text-3xl font-bold text-gray-950">
            Payroll is where HR data, compliance, money, deadlines and trust all meet.
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-700">
            We started with WageFlow because payroll needs clear review, accurate calculations and proper audit trails
            before anything else can scale safely. HR data matters, but payroll is where mistakes become urgent.
          </p>
        </div>
      </section>

      <section id="story" className="bg-gray-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">Our story</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Why we built this.</h2>
          </div>

          <div className="space-y-6 text-lg leading-8 text-gray-200">
            <p>
              The Business Consortium Ltd exists to build practical software for UK payroll and HR teams.
              The first product is WageFlow because payroll needs clearer review before approval, not another place to hide problems until payday.
            </p>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="font-bold text-white">Adam Manley</p>
              <p className="mt-1 text-gray-300">Founder, The Business Consortium Ltd</p>
              <p className="mt-4 text-gray-300">
                Liverpool-based software company. Building payroll and HR tools for UK business.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-950">Ready to see the live product?</h2>
            <p className="mt-2 text-gray-700">
              Start with WageFlow. That is the product with the clearest buyer need and the strongest commercial route.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-[#0f3c85] px-8 py-4 text-base font-semibold text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
          >
            Visit WageFlow
          </a>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          <div>
            <p className="font-bold text-gray-950">The Business Consortium Ltd</p>
            <p className="mt-2 text-sm text-gray-600">
              Payroll and HR software company. Liverpool, UK.
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-950">Products</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li><a href="/" className="hover:text-gray-950">WageFlow</a></li>
              <li><a href="mailto:enquiries@thebusinessconsortiumltd.co.uk?subject=PeopleFlow%20interest" className="hover:text-gray-950">PeopleFlow, coming soon</a></li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-950">Get in touch</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li><a href="mailto:enquiries@thebusinessconsortiumltd.co.uk" className="hover:text-gray-950">enquiries@thebusinessconsortiumltd.co.uk</a></li>
              <li>Liverpool, United Kingdom</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-7xl border-t border-gray-200 pt-6 text-sm text-gray-600">
          © 2026 The Business Consortium Ltd. All rights reserved.
        </div>
      </footer>
    </main>
  );
}