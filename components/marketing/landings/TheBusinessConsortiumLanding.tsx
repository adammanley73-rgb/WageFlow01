// C:\Users\adamm\Projects\wageflow01\components\marketing\landings\TheBusinessConsortiumLanding.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
  Layers,
} from "lucide-react";

type ProductCard = {
  name: string;
  tagline: string;
  description: string;
  href?: string;
  badge?: string;
  icon: React.ReactNode;
  logoSrc?: string;
  comingSoon?: boolean;
  pulse?: boolean;
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

function buildMailto(to: string, subject: string, body: string) {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  return `mailto:${to}?subject=${s}&body=${b}`;
}

type ToastState = { open: boolean; message: string };

export default function TheBusinessConsortiumLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "" });

  const showToast = (message: string) => {
    setToast({ open: true, message });
    window.setTimeout(() => setToast({ open: false, message: "" }), 2200);
  };

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
        tagline: "Payroll first. Built for control.",
        description:
          "Automated payroll with exception-led review so you only focus on what needs attention. WageFlow is the flagship.",
        href: "/wageflow",
        badge: "Flagship",
        icon: <LayoutGrid className="w-6 h-6" aria-hidden="true" />,
        logoSrc: "/WageFlowLogo.png",
        comingSoon: false,
        pulse: true,
      },
      {
        name: "PeopleFlow",
        tagline: "Coming soon",
        description:
          "HR workflows and employee records designed to sit cleanly alongside WageFlow, without the mess.",
        badge: "Coming soon",
        icon: <Users className="w-6 h-6" aria-hidden="true" />,
        logoSrc: "/PeopleFlow.png",
        comingSoon: true,
      },
      {
        name: "AccountsFlow",
        tagline: "Coming soon",
        description:
          "Finance ops and reporting that stays aligned with payroll and people data, without spreadsheet chaos.",
        badge: "Coming soon",
        icon: <Briefcase className="w-6 h-6" aria-hidden="true" />,
        logoSrc: "/AccountsFlow.png",
        comingSoon: true,
      },
      {
        name: "BusinessFlow",
        tagline: "Coming soon",
        description:
          "BusinessFlow is the full package name when WageFlow, PeopleFlow, and AccountsFlow are used together.",
        badge: "Coming soon",
        icon: <Layers className="w-6 h-6" aria-hidden="true" />,
        logoSrc: "/BusinessFlowLogo.png",
        comingSoon: true,
      },
    ],
    []
  );

  const pillars: Pill[] = useMemo(
    () => [
      {
        title: "Operational clarity",
        desc: "Obvious changes. Clear reasons. No mystery states.",
        icon: <Shield className="w-5 h-5 text-[#0f3c85]" aria-hidden="true" />,
      },
      {
        title: "UK-first workflow design",
        desc: "Built around real UK payroll behaviour. Calm, predictable process.",
        icon: <Building2 className="w-5 h-5 text-[#0f3c85]" aria-hidden="true" />,
      },
      {
        title: "Practical automation",
        desc: "Automation reduces errors. Humans keep control where it matters.",
        icon: <Sparkles className="w-5 h-5 text-[#0f3c85]" aria-hidden="true" />,
      },
    ],
    []
  );

  const closeMenuAndGo = (id: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => scrollToId(id), 0);
  };

  const onRequestDemo = () => {
    const mailto = buildMailto(
      "enquiries@thebusinessconsortiumltd.co.uk",
      "WageFlow demo request",
      "Hi,\n\nPlease can I request a WageFlow demo.\n\nCompany name:\nNumber of employees:\nPay frequency (weekly/fortnightly/4-weekly/monthly):\nPreferred contact number:\n\nThanks,"
    );
    window.location.href = mailto;
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-[#0f3c85]"
      >
        Skip to content
      </a>

      {toast.open && (
        <div className="fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4">
          <div className="max-w-md w-full rounded-xl bg-gray-900 text-white px-4 py-3 shadow-lg border border-gray-800">
            <div className="text-sm font-semibold">Coming soon</div>
            <div className="text-sm text-gray-200 mt-1">{toast.message}</div>
          </div>
        </div>
      )}

      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              type="button"
              onClick={() => scrollToId("top")}
              className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              aria-label="Go to top"
            >
              <div className="text-left leading-tight">
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#10b981] leading-none">
                  The Business Consortium Ltd
                </div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">
                  Payroll-first systems for SMEs
                </div>
              </div>
            </button>

            <div className="hidden md:flex items-center gap-8">
              <button
                type="button"
                onClick={() => scrollToId("products")}
                className="text-gray-700 hover:text-gray-900 transition px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Products
              </button>
              <button
                type="button"
                onClick={() => scrollToId("how")}
                className="text-gray-700 hover:text-gray-900 transition px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                How we work
              </button>
              <button
                type="button"
                onClick={() => scrollToId("contact")}
                className="text-gray-700 hover:text-gray-900 transition px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Contact
              </button>
            </div>

            <button
              type="button"
              className="md:hidden p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
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
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Products
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("how")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                How we work
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("contact")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Contact
              </button>
            </div>
          </div>
        )}
      </nav>

      <main id="main" className="pt-24" role="main">
        <section id="top" className="pt-10 pb-14 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 items-start">
              <div>
                <div className="mb-4">
                  <Image
                    src="/company-logo.png"
                    alt="The Business Consortium Ltd logo"
                    width={520}
                    height={180}
                    className="h-auto w-72 sm:w-96 md:w-[28rem] object-contain"
                    priority
                  />
                </div>

                <p className="inline-flex items-center gap-2 text-sm text-[#0f3c85] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  <Shield className="w-4 h-4" aria-hidden="true" />
                  Payroll first. Suite second.
                </p>

                <div className="mt-5">
                  <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mt-2 leading-tight">
                    The Payroll revolution is here
                  </h1>
                </div>

                <p className="text-lg md:text-xl text-gray-700 mt-5 max-w-xl">
                  Stop spending hours running payroll. WageFlow automates the work so you only review the 1 in 50 exceptions.
                  Approve it, amend it, or delete it. Job done.
                </p>

                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-5">
                  <p className="font-semibold text-gray-900">Why WageFlow exists</p>
                  <p className="text-gray-700 mt-2">
                    WageFlow is my payroll app. I built it using the skills and expertise I have gathered over a 27 year career
                    across Payroll, HR, and Pensions environments, including numerous software implementations.
                  </p>
                  <p className="text-gray-700 mt-2">
                    It is built for calm control, clear review, and fewer mistakes. Payroll is treated like it matters, because it does.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => scrollToId("products")}
                    className="bg-[#0f3c85] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:opacity-95 transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                  >
                    Explore products
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={onRequestDemo}
                    className="border-2 border-gray-300 text-gray-800 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                  >
                    Request a demo
                  </button>
                </div>

                <div className="mt-5 text-sm text-gray-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
                    WageFlow is the flagship product
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
                    PeopleFlow and AccountsFlow are coming soon
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
                    BusinessFlow is the package name when you take all three
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 md:p-8">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-[#0f3c85] mt-0.5" aria-hidden="true" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Founder</h2>
                    <p className="text-gray-700 mt-2">Real payroll experience, turned into software that is hard to mess up.</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl overflow-hidden border border-gray-200 bg-white">
                  <div className="relative w-full aspect-[16/10]">
                    <Image
                      src="/MeWageFlowWebsitePicDeepNavyBlueMAIN.png"
                      alt="WageFlow founder"
                      fill
                      className="object-contain bg-white"
                      priority
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-gray-900">Payroll, built properly</p>
                    <p className="text-sm text-gray-700 mt-1">WageFlow leads hard with Payroll. The suite follows when it is ready.</p>
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
                  className="w-full mt-6 bg-[#0f3c85] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                >
                  View products
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
                WageFlow is live. PeopleFlow, AccountsFlow, and BusinessFlow are coming soon.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              {products.map((p, idx) => {
                const CardInner = (
                  <div
                    className={classNames(
                      "bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition relative h-full flex flex-col",
                      p.pulse ? "ring-2 ring-blue-100" : ""
                    )}
                  >
                    {p.pulse && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-2 -right-2 inline-flex h-4 w-4 rounded-full bg-[#10b981] animate-pulse"
                      />
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0f3c85] overflow-hidden">
                        {p.logoSrc ? (
                          <Image
                            src={p.logoSrc}
                            alt={`${p.name} logo`}
                            width={72}
                            height={72}
                            className="object-contain"
                          />
                        ) : (
                          p.icon
                        )}
                      </div>

                      {p.badge && (
                        <span className="text-xs font-semibold text-[#0f3c85] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                          {p.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-gray-900 mt-4">{p.name}</h3>
                      <p className="text-sm font-semibold text-gray-700 mt-1">{p.tagline}</p>
                      <p className="text-gray-700 mt-3">{p.description}</p>
                    </div>

                    <div className="mt-5">
                      {p.comingSoon ? (
                        <button
                          type="button"
                          onClick={() => showToast(`${p.name} is coming soon.`)}
                          className="inline-flex items-center justify-center gap-2 w-full bg-gray-900 text-white px-5 py-3 rounded-lg font-semibold hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                        >
                          {p.name}
                          <ArrowRight className="w-5 h-5" aria-hidden="true" />
                        </button>
                      ) : (
                        <a
                          href={p.href || "/wageflow"}
                          className={classNames(
                            "inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]",
                            "bg-[#0f3c85] text-white hover:opacity-95",
                            p.pulse ? "animate-pulse" : ""
                          )}
                        >
                          Go to WageFlow
                          <ArrowRight className="w-5 h-5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                );

                return (
                  <div key={idx} className="h-full">
                    {CardInner}
                  </div>
                );
              })}
            </div>

            <div className="mt-10 max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-[#0f3c85] mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-gray-900">BusinessFlow</p>
                  <p className="text-gray-700 mt-1">
                    BusinessFlow is the package name when WageFlow, PeopleFlow, and AccountsFlow are used together to manage your business.
                    For now, we lead hard with Payroll.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">How we work</h2>
              <p className="text-lg text-gray-700 mt-3 max-w-3xl mx-auto">Payroll needs guardrails. Clear steps. Calm review. No drama.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Users className="w-5 h-5 text-[#0f3c85]" aria-hidden="true" />
                  Understand the workflow
                </div>
                <p className="text-gray-700 mt-2">We design around how payroll actually runs, including checks, approvals, and exceptions.</p>
              </div>

              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Shield className="w-5 h-5 text-[#0f3c85]" aria-hidden="true" />
                  Build guardrails
                </div>
                <p className="text-gray-700 mt-2">The system should prevent common mistakes and make changes obvious before you commit.</p>
              </div>

              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Sparkles className="w-5 h-5 text-[#0f3c85]" aria-hidden="true" />
                  Automate safely
                </div>
                <p className="text-gray-700 mt-2">Automation reduces manual work. You keep control where it matters.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="py-16 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Contact</h2>
              <p className="text-lg text-gray-700 mt-3 max-w-3xl mx-auto">
                Want a demo. Fine. Click the button and your email client will open with everything prefilled.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="font-semibold text-gray-900">Sales</p>
                <p className="text-gray-700 mt-2">Request a WageFlow demo.</p>

                <button
                  type="button"
                  onClick={onRequestDemo}
                  className="mt-5 inline-flex items-center justify-center gap-2 w-full bg-[#0f3c85] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                >
                  Request a demo
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>

                <div className="mt-5 space-y-3 text-sm text-gray-800">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#0f3c85]" aria-hidden="true" />
                    <span>enquiries@thebusinessconsortiumltd.co.uk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#0f3c85]" aria-hidden="true" />
                    <span>Replace with your public phone number</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="font-semibold text-gray-900">Monthly free offer</p>
                <p className="text-gray-700 mt-2">The “Get 1st month free” offer will go live when billing is enabled.</p>

                <button
                  type="button"
                  onClick={() => showToast("Get 1st month free is coming soon.")}
                  className="mt-5 inline-flex items-center justify-center gap-2 w-full bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                >
                  Get 1st month free
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>

                <p className="text-xs text-gray-600 mt-3">This is intentionally not a dead button.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-[#0f3c85]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Payroll first. Everything else follows.</h2>
            <p className="text-lg text-blue-50 mt-4">Start with WageFlow. Keep it calm. Keep it controlled.</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <a
                href="/wageflow"
                className="bg-white text-[#0f3c85] px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-white inline-flex items-center justify-center gap-2 animate-pulse"
              >
                Go to WageFlow
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={onRequestDemo}
                className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-white"
              >
                Request a demo
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
                <div className="text-white font-bold">The Business Consortium Ltd</div>
              </div>
              <p className="text-sm text-gray-300">Payroll-first systems for SMEs. WageFlow leads. The rest follows.</p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/wageflow" className="hover:text-white transition">
                    WageFlow
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => showToast("PeopleFlow is coming soon.")}
                    className="hover:text-white transition text-left"
                  >
                    PeopleFlow
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => showToast("AccountsFlow is coming soon.")}
                    className="hover:text-white transition text-left"
                  >
                    AccountsFlow
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => showToast("BusinessFlow is coming soon.")}
                    className="hover:text-white transition text-left"
                  >
                    BusinessFlow
                  </button>
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
            <p className="text-sm text-gray-400">© {new Date().getFullYear()} The Business Consortium Ltd. All rights reserved.</p>
            <p className="text-sm text-gray-400">Replace with your registered company details.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
