"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Menu,
  X,
  ChevronRight,
  Shield,
  Users,
  Briefcase,
  Building2,
  Mail,
  Phone,
  ArrowRight,
  Check,
  Sparkles,
  LayoutGrid,
} from "lucide-react";

type ProductCard = {
  name: string;
  tagline: string;
  description: string;
  href: string;
  badge?: string;
  icon: React.ReactNode;
};

type Pill = {
  title: string;
  desc: string;
  icon: React.ReactNode;
};

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function TheBusinessConsortiumLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const products: ProductCard[] = useMemo(
    () => [
      {
        name: "WageFlow",
        tagline: "UK payroll, done with control",
        description:
          "Run payroll with a clear workflow. Review changes before approval. Parallel run support for trust.",
        href: "/",
        badge: "Live build",
        icon: <LayoutGrid className="w-6 h-6" aria-hidden="true" />,
      },
      {
        name: "PeopleFlow",
        tagline: "HR workflows without the mess",
        description:
          "Employee records, starter checklists, absences, and approvals. Built to match WageFlow.",
        href: "/peopleflow",
        badge: "Planned",
        icon: <Users className="w-6 h-6" aria-hidden="true" />,
      },
      {
        name: "AccountsFlow",
        tagline: "Finance ops that stay aligned",
        description:
          "A future module for reconciliations and reporting that connects cleanly to payroll data.",
        href: "/accountsflow",
        badge: "Planned",
        icon: <Briefcase className="w-6 h-6" aria-hidden="true" />,
      },
    ],
    []
  );

  const pillars: Pill[] = useMemo(
    () => [
      {
        title: "Operational clarity",
        desc: "We build systems that make it obvious what changed and why. No mystery states.",
        icon: <Shield className="w-5 h-5 text-blue-700" aria-hidden="true" />,
      },
      {
        title: "UK-first compliance mindset",
        desc: "We design around real UK workflows. Audit-ready structure. Calm, predictable process.",
        icon: <Building2 className="w-5 h-5 text-blue-700" aria-hidden="true" />,
      },
      {
        title: "Practical automation",
        desc: "Automation where it reduces errors. Humans keep control where it matters.",
        icon: <Sparkles className="w-5 h-5 text-blue-700" aria-hidden="true" />,
      },
    ],
    []
  );

  const closeMenuAndGo = (id: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => scrollToId(id), 0);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-blue-700"
      >
        Skip to content
      </a>

      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              type="button"
              onClick={() => scrollToId("top")}
              className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              aria-label="Go to top"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold">
                TBC
              </div>
              <div className="text-left">
                <div className="text-base font-bold text-gray-900 leading-tight">
                  The Business Consortium Ltd
                </div>
                <div className="text-xs text-gray-600 leading-tight">
                  Payroll, HR, and finance systems
                </div>
              </div>
            </button>

            <div className="hidden md:flex items-center gap-8">
              <button
                type="button"
                onClick={() => scrollToId("products")}
                className="text-gray-700 hover:text-gray-900 transition px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                Products
              </button>
              <button
                type="button"
                onClick={() => scrollToId("how")}
                className="text-gray-700 hover:text-gray-900 transition px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                How we work
              </button>
              <button
                type="button"
                onClick={() => scrollToId("contact")}
                className="text-gray-700 hover:text-gray-900 transition px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                Contact
              </button>
              <button
                type="button"
                onClick={() => scrollToId("products")}
                className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                View products
              </button>
            </div>

            <button
              type="button"
              className="md:hidden p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              onClick={() => setMobileMenuOpen((s) => !s)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-4 space-y-2">
              <button
                type="button"
                onClick={() => closeMenuAndGo("products")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                Products
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("how")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                How we work
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("contact")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                Contact
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("products")}
                className="block w-full bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                View products
              </button>
            </div>
          </div>
        )}
      </nav>

      <main id="main" className="pt-24" role="main">
        <section id="top" className="pt-10 pb-14 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-sm text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  <Shield className="w-4 h-4" aria-hidden="true" />
                  UK-first systems for payroll, HR, and finance operations
                </p>

                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mt-5 leading-tight">
                  Build calmer operations.
                  <br />
                  Reduce payroll risk.
                </h1>

                <p className="text-lg md:text-xl text-gray-700 mt-5 max-w-xl">
                  The Business Consortium Ltd builds practical software products for SMEs. We focus on clarity, control,
                  and workflows that are hard to mess up.
                </p>

                <div className="mt-5 text-sm text-gray-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
                    Clear, auditable workflows
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
                    UK-first product design
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
                    Automation without losing control
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => scrollToId("products")}
                    className="bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-800 transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  >
                    Explore products
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToId("contact")}
                    className="border-2 border-gray-300 text-gray-800 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-blue-700"
                  >
                    Contact us
                  </button>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  People will click one of the product buttons below. This page is your clean front door.
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 md:p-8">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-blue-700 mt-0.5" aria-hidden="true" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">What we do</h2>
                    <p className="text-gray-700 mt-2">
                      We build a connected suite. Each product works on its own, but the experience stays consistent.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  {pillars.map((p, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{p.icon}</div>
                        <div>
                          <p className="font-semibold text-gray-900">{p.title}</p>
                          <p className="text-gray-700 mt-1">{p.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => scrollToId("products")}
                  className="w-full mt-6 bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-700"
                >
                  View the suite
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="products" className="py-16 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Products</h2>
              <p className="text-lg text-gray-700 mt-3 max-w-3xl mx-auto">
                Each product has its own page. This is the hub. Clean navigation. Clear intent.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {products.map((p, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-700">
                      {p.icon}
                    </div>
                    {p.badge && (
                      <span className="text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                        {p.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mt-4">{p.name}</h3>
                  <p className="text-sm font-semibold text-gray-700 mt-1">{p.tagline}</p>
                  <p className="text-gray-700 mt-3">{p.description}</p>

                  <a
                    href={p.href}
                    className="mt-5 inline-flex items-center justify-center gap-2 w-full bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-700"
                  >
                    Go to {p.name}
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </a>

                  <p className="text-xs text-gray-600 mt-3">
                    Link can be changed later. This is a safe placeholder route.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">How we work</h2>
              <p className="text-lg text-gray-700 mt-3 max-w-3xl mx-auto">
                We build for real operational behaviour. People are cautious with payroll. They should be.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Users className="w-5 h-5 text-blue-700" aria-hidden="true" />
                  Understand your workflow
                </div>
                <p className="text-gray-700 mt-2">
                  We design around how payroll and HR actually run, including checks, approvals, and exceptions.
                </p>
              </div>

              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Shield className="w-5 h-5 text-blue-700" aria-hidden="true" />
                  Build guardrails
                </div>
                <p className="text-gray-700 mt-2">
                  The system should prevent common mistakes and make changes obvious before you commit.
                </p>
              </div>

              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Briefcase className="w-5 h-5 text-blue-700" aria-hidden="true" />
                  Ship the boring wins
                </div>
                <p className="text-gray-700 mt-2">
                  Speed, clarity, and consistency beat flashy features. Especially in payroll.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="py-16 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Contact</h2>
              <p className="text-lg text-gray-700 mt-3 max-w-3xl mx-auto">
                If you want a quick chat before you choose a product, that’s sensible. Tell us your company size and what you’re trying to fix.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="font-semibold text-gray-900">General enquiries</p>
                <p className="text-gray-700 mt-2">
                  Replace these placeholder details before launch.
                </p>

                <div className="mt-5 space-y-3 text-sm text-gray-800">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-700" aria-hidden="true" />
                    <span>hello@thebusinessconsortiumltd.co.uk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-700" aria-hidden="true" />
                    <span>+44 (0)000 000 0000</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="font-semibold text-gray-900">Start with a product</p>
                <p className="text-gray-700 mt-2">
                  Most people land here first, then click into a product page.
                </p>

                <button
                  type="button"
                  onClick={() => scrollToId("products")}
                  className="mt-5 inline-flex items-center justify-center gap-2 w-full bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-700"
                >
                  View products
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-blue-700">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              A professional front door for your product suite
            </h2>
            <p className="text-lg text-blue-50 mt-4">
              Clean navigation. Clear intent. A place you can confidently send prospects.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button
                type="button"
                onClick={() => scrollToId("products")}
                className="bg-white text-blue-800 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-white"
              >
                Explore products
              </button>
              <button
                type="button"
                onClick={() => scrollToId("contact")}
                className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-white"
              >
                Contact us
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold">
                  TBC
                </div>
                <div className="text-white font-bold">The Business Consortium Ltd</div>
              </div>
              <p className="text-sm text-gray-300">
                UK-first systems for payroll, HR, and finance operations.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/" className="hover:text-white transition">
                    WageFlow
                  </a>
                </li>
                <li>
                  <a href="/peopleflow" className="hover:text-white transition">
                    PeopleFlow
                  </a>
                </li>
                <li>
                  <a href="/accountsflow" className="hover:text-white transition">
                    AccountsFlow
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Site</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button type="button" onClick={() => scrollToId("products")} className="hover:text-white transition">
                    Products
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToId("how")} className="hover:text-white transition">
                    How we work
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToId("contact")} className="hover:text-white transition">
                    Contact
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} The Business Consortium Ltd. All rights reserved.
            </p>
            <p className="text-sm text-gray-400">Registered in the UK. Replace this line with your registered details.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
