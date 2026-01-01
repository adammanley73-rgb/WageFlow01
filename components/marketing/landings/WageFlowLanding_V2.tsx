// C:\Users\adamm\Projects\wageflow01\components\marketing\landings\WageFlowLanding_V2.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Check,
  Menu,
  X,
  Clock,
  Shield,
  TrendingUp,
  ChevronRight,
  CreditCard,
  Scale,
  Lock,
  Users,
  Calculator,
  Mail,
  Phone,
  ArrowRight,
} from "lucide-react";

type BillingMode = "annual" | "monthly";

type Feature = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

type Plan = {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  includedEmployees: number;
  extraEmployeeMonthly: number;
  features: string[];
  highlight?: boolean;
};

type FAQ = {
  q: string;
  a: string;
};

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatGBP(n: number, maximumFractionDigits: number = 0) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits,
  }).format(n);
}

function calcAnnualSavings(monthly: number, annual: number) {
  const fullYear = monthly * 12;
  const saving = Math.max(0, fullYear - annual);
  return { fullYear, saving };
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function buildMailto(to: string, subject: string, body: string) {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  return `mailto:${to}?subject=${s}&body=${b}`;
}

type ToastState = { open: boolean; message: string };

function YouTubeShort({
  videoId,
  title,
}: {
  videoId: string;
  title: string;
}) {
  // No autoplay, no mute. People click play.
  // Uses youtube-nocookie but still clearly YouTube if someone inspects the page/network.
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?controls=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <div className="w-full max-w-[320px] mx-auto">
      <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
        <div className="relative w-full" style={{ paddingTop: "177.7778%" }}>
          <iframe
            title={title}
            src={src}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

export default function WageFlowLandingV2() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingMode, setBillingMode] = useState<BillingMode>("annual");
  const [employeeCount, setEmployeeCount] = useState<number>(10);
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

  const onRequestDemo = () => {
    const mailto = buildMailto(
      "sales@thebusinessconsortiumltd.co.uk",
      "WageFlow demo request",
      "Hi,\n\nPlease can I request a WageFlow demo.\n\nCompany name:\nNumber of employees:\nPay frequency (weekly/fortnightly/4-weekly/monthly):\nPreferred contact number:\n\nThanks,"
    );
    window.location.href = mailto;
  };

  const features: Feature[] = useMemo(
    () => [
      {
        icon: <Clock className="w-6 h-6" aria-hidden="true" />,
        title: "Exception-led payroll",
        description:
          "WageFlow automates the run so you focus on what needs attention, not endless manual steps.",
      },
      {
        icon: <Shield className="w-6 h-6" aria-hidden="true" />,
        title: "UK-first workflows",
        description:
          "Structured runs, clear review, predictable approvals. Built for real UK payroll behaviour.",
      },
      {
        icon: <TrendingUp className="w-6 h-6" aria-hidden="true" />,
        title: "See changes before approval",
        description:
          "Review totals and movements so you catch problems during review, not after payday.",
      },
    ],
    []
  );

  const plans: Plan[] = useMemo(
    () => [
      {
        name: "Plan 1. Starter",
        monthlyPrice: 15,
        annualPrice: 150,
        includedEmployees: 5,
        extraEmployeeMonthly: 1,
        features: [
          "Up to 5 employees included",
          "Unlimited payroll runs",
          "UK PAYE and NI calculations",
          "Payslips",
          "Starter and leaver tracking",
          "Basic absence tracking",
          "Email support",
        ],
      },
      {
        name: "Plan 2. Growth",
        monthlyPrice: 30,
        annualPrice: 300,
        includedEmployees: 20,
        extraEmployeeMonthly: 1,
        features: [
          "Up to 20 employees included",
          "Unlimited payroll runs",
          "UK PAYE and NI calculations",
          "Payslips",
          "Starter and leaver workflows",
          "Absence and holiday tracking",
          "Payroll exports and reports",
          "Priority email support",
        ],
        highlight: true,
      },
    ],
    []
  );

  const faqs: FAQ[] = useMemo(
    () => [
      {
        q: "Is the first month really free?",
        a: "The offer is launching soon. The button currently shows a “Coming soon” confirmation.",
      },
      {
        q: "Do I need to add a card on day 1?",
        a: "You can explore without a card. A card is required before you run your first live payroll.",
      },
      {
        q: "What is the parallel run promise?",
        a: "Most customers run one payroll in parallel first. Compare results and decide. No pressure, no lock-in.",
      },
      {
        q: "Do you lock me into a contract?",
        a: "No lock-in. Cancel anytime.",
      },
      {
        q: "How do extra employees work?",
        a: "Each plan includes an allowance. Extra employees are billed at £1 per employee per month.",
      },
      {
        q: "Can I pay annually?",
        a: "Yes. Annual plans are billed upfront and save the equivalent of 2 months compared to monthly.",
      },
    ],
    []
  );

  const pricingCards = useMemo(() => {
    const employees = clamp(employeeCount, 1, 250);

    return plans.map((plan) => {
      const isAnnual = billingMode === "annual";

      const base = isAnnual ? plan.annualPrice : plan.monthlyPrice;
      const baseLabel = isAnnual ? "/year" : "/month";

      const extras = Math.max(0, employees - plan.includedEmployees);

      const extrasCost = isAnnual
        ? extras * plan.extraEmployeeMonthly * 12
        : extras * plan.extraEmployeeMonthly;

      const total = base + extrasCost;

      const savings = calcAnnualSavings(plan.monthlyPrice, plan.annualPrice);

      return {
        plan,
        employees,
        extras,
        base,
        baseLabel,
        extrasCost,
        total,
        savings,
        isAnnual,
      };
    });
  }, [plans, billingMode, employeeCount]);

  const closeMenuAndGo = (id: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => scrollToId(id), 0);
  };

  const onSignIn = () => {
    scrollToId("pricing");
  };

  const onGetFreeMonth = () => {
    showToast("Get 1st month free is coming soon.");
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
              className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-[#0f3c85] rounded-lg"
              aria-label="Go to top"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden animate-pulse">
                <Image src="/WageFlowLogo.png" alt="WageFlow logo" width={36} height={36} className="object-contain" />
              </div>
              <span className="text-2xl font-bold text-[#0f3c85]">WageFlow</span>
            </button>

            <div className="hidden md:flex items-center gap-8">
              <button
                type="button"
                onClick={() => scrollToId("features")}
                className="text-gray-700 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85] rounded-md px-2 py-1"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => scrollToId("who")}
                className="text-gray-700 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85] rounded-md px-2 py-1"
              >
                Who it’s for
              </button>
              <button
                type="button"
                onClick={() => scrollToId("pricing")}
                className="text-gray-700 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85] rounded-md px-2 py-1"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => scrollToId("faq")}
                className="text-gray-700 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85] rounded-md px-2 py-1"
              >
                FAQs
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="text-gray-700 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85] rounded-md px-2 py-1"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={onGetFreeMonth}
                className="bg-[#0f3c85] text-white px-6 py-2 rounded-lg hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Get 1st Month Free
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
                onClick={() => closeMenuAndGo("features")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("who")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Who it’s for
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("pricing")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("faq")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                FAQs
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignIn();
                }}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGetFreeMonth();
                }}
                className="block w-full bg-[#0f3c85] text-white px-6 py-3 rounded-lg hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Get 1st Month Free
              </button>
            </div>
          </div>
        )}
      </nav>

      <main id="main" className="pt-24" role="main">
        <section id="top" className="pt-10 pb-14 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Top videos (reduced size by ~50%) */}
            <div className="mb-10">
              <p className="text-sm text-[#0f3c85] bg-blue-50 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-100">
                <Lock className="w-4 h-4" aria-hidden="true" />
                Video previews
              </p>
              <p className="text-gray-700 mt-2">
                Press play. No autoplay.
              </p>

              <div className="mt-5 grid md:grid-cols-2 gap-6 justify-items-center">
                <YouTubeShort videoId="c1qYUYKstp8" title="WageFlow preview video 1" />
                <YouTubeShort videoId="DglfS7FoNRQ" title="WageFlow preview video 2" />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-sm text-[#0f3c85] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  Payroll first. Exception-led review.
                </p>

                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mt-5 leading-tight">
                  The Payroll revolution is here
                </h1>

                <p className="text-lg md:text-xl text-gray-700 mt-5 max-w-xl">
                  Stop spending hours running payroll. WageFlow automates it so you only review the 1 in 50 exceptions.
                  Approve it, amend it, or delete it. Job done.
                </p>

                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-5">
                  <p className="font-semibold text-gray-900">Built by a payroll professional</p>
                  <p className="text-gray-700 mt-2">
                    WageFlow is my payroll app. I built it using the skills and expertise I have gathered over a 27 year career
                    across Payroll, HR, and Pensions environments, including numerous software implementations.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <button
                    type="button"
                    onClick={onGetFreeMonth}
                    className="bg-[#0f3c85] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:opacity-95 transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                  >
                    Get 1st Month Free
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
                    Clear runs. Calm review. Clean approval.
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#0f3c85]" aria-hidden="true" />
                    Card required before first live payroll run.
                  </div>
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#0f3c85]" aria-hidden="true" />
                    One parallel payroll run included for trust.
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 md:p-8">
                <h2 className="text-xl font-bold text-gray-900">What you get</h2>
                <p className="text-gray-700 mt-2">
                  Core features built to keep payroll clean, fast, and explainable.
                </p>

                <div className="mt-6 grid gap-4">
                  {features.map((feature, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0f3c85]">
                          {feature.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{feature.title}</p>
                          <p className="text-gray-700 mt-1">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl overflow-hidden border border-gray-200 bg-white">
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden">
                      <Image src="/WageFlowLogo.png" alt="WageFlow logo" width={36} height={36} className="object-contain" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">WageFlow is the flagship</p>
                      <p className="text-sm text-gray-700">
                        PeopleFlow and AccountsFlow follow. BusinessFlow is the package name later.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => scrollToId("pricing")}
                  className="w-full mt-6 bg-[#0f3c85] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                >
                  View pricing
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 bg-white px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Clock className="w-5 h-5 text-[#0f3c85]" aria-hidden="true" />
                  Reduce payroll time
                </div>
                <p className="text-gray-700 mt-2">
                  Focus on exceptions and approvals, not endless manual steps.
                </p>
              </div>

              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Shield className="w-5 h-5 text-[#0f3c85]" aria-hidden="true" />
                  Compliance-led workflow
                </div>
                <p className="text-gray-700 mt-2">
                  Clear run history and consistent outputs. Less chaos when you need answers.
                </p>
              </div>

              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <TrendingUp className="w-5 h-5 text-[#0f3c85]" aria-hidden="true" />
                  Understand changes
                </div>
                <p className="text-gray-700 mt-2">
                  Review movements before approval so problems are caught early.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
              <p className="text-lg text-gray-700 mt-3">
                Annual pricing shown upfront. Monthly is available too.
              </p>
            </div>

            <div className="flex flex-col items-center gap-6 mb-10">
              <div
                className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-2"
                role="group"
                aria-label="Billing period"
              >
                <button
                  type="button"
                  onClick={() => setBillingMode("annual")}
                  className={classNames(
                    "px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f3c85]",
                    billingMode === "annual" ? "bg-[#0f3c85] text-white" : "text-gray-800 hover:bg-gray-50"
                  )}
                  aria-pressed={billingMode === "annual"}
                >
                  Annual
                </button>
                <button
                  type="button"
                  onClick={() => setBillingMode("monthly")}
                  className={classNames(
                    "px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f3c85]",
                    billingMode === "monthly" ? "bg-[#0f3c85] text-white" : "text-gray-800 hover:bg-gray-50"
                  )}
                  aria-pressed={billingMode === "monthly"}
                >
                  Monthly
                </button>
              </div>

              {/* Mid-page video (reduced size by ~50%), placed above the pricing calculator tool */}
              <div className="w-full">
                <div className="text-center mb-3">
                  <p className="font-semibold text-gray-900">Quick walkthrough</p>
                  <p className="text-sm text-gray-700 mt-1">Press play. No autoplay.</p>
                </div>
                <YouTubeShort videoId="XmUeFtDwf5U" title="WageFlow walkthrough video" />
              </div>

              <div className="w-full max-w-3xl bg-gray-50 border border-gray-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Calculator className="w-5 h-5 text-[#0f3c85] mt-0.5" aria-hidden="true" />
                  <div className="w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">Pricing calculator</p>
                        <p className="text-sm text-gray-700 mt-1">
                          Slide to your employee count. Plans update instantly including extra employees at £1 per employee per month.
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
                        <Users className="w-5 h-5 text-[#0f3c85]" aria-hidden="true" />
                        <span className="font-semibold text-gray-900">{employeeCount}</span>
                        <span className="text-gray-700">employees</span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <label className="sr-only" htmlFor="employeeCount">
                        Employee count
                      </label>
                      <input
                        id="employeeCount"
                        type="range"
                        min={1}
                        max={250}
                        step={1}
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(parseInt(e.target.value || "1", 10))}
                        className="w-full accent-[#0f3c85]"
                      />
                      <div className="flex justify-between text-xs text-gray-600 mt-2">
                        <span>1</span>
                        <span>250</span>
                      </div>
                    </div>

                    <div className="mt-5 text-sm text-gray-700">
                      Annual plans are billed upfront. They save the equivalent of 2 months compared to monthly.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {pricingCards.map(({ plan, employees, extras, base, baseLabel, extrasCost, total, savings, isAnnual }, index) => {
                const perExtraLabel = isAnnual ? "/year" : "/month";
                const perExtraAmount = isAnnual ? plan.extraEmployeeMonthly * 12 : plan.extraEmployeeMonthly;

                return (
                  <div
                    key={index}
                    className={classNames(
                      "rounded-2xl p-8 border bg-white",
                      plan.highlight ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                        <p className="text-gray-700 mt-1">
                          Includes {plan.includedEmployees} employees. You selected {employees}.
                        </p>
                      </div>
                      {plan.highlight && (
                        <span className="text-sm font-semibold text-[#0f3c85] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                          Most popular
                        </span>
                      )}
                    </div>

                    <div className="mt-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-gray-900">{formatGBP(total)}</span>
                        <span className="text-gray-700">{baseLabel}</span>
                      </div>

                      <div className="mt-3 border border-gray-200 rounded-xl p-4 bg-gray-50">
                        <p className="font-semibold text-gray-900">Price breakdown</p>
                        <div className="mt-2 space-y-1 text-sm text-gray-800">
                          <div className="flex justify-between gap-3">
                            <span>Base subscription</span>
                            <span className="font-semibold">
                              {formatGBP(base)}
                              {baseLabel}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span>
                              Extra employees ({extras} x {formatGBP(perExtraAmount)}
                              {perExtraLabel})
                            </span>
                            <span className="font-semibold">
                              {formatGBP(extrasCost)}
                              {baseLabel}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3 pt-2 border-t border-gray-200">
                            <span className="font-semibold">Total</span>
                            <span className="font-bold">
                              {formatGBP(total)}
                              {baseLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isAnnual && savings.saving > 0 && (
                        <p className="text-sm text-green-700 mt-3">
                          Save {formatGBP(savings.saving)} vs monthly on the base plan ({formatGBP(savings.fullYear)}/year).
                        </p>
                      )}

                      <p className="text-sm text-gray-700 mt-3">
                        Card required before first live payroll run.
                      </p>
                    </div>

                    <ul className="space-y-3 mt-6">
                      {plan.features.map((f, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                          <span className="text-gray-800">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="w-full mt-7 py-3 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85] bg-[#0f3c85] text-white hover:opacity-95"
                      onClick={onGetFreeMonth}
                    >
                      Get 1st month free
                    </button>

                    <button
                      type="button"
                      className="w-full mt-3 py-3 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85] border-2 border-gray-300 text-gray-900 hover:border-gray-400"
                      onClick={onRequestDemo}
                    >
                      Request a demo
                    </button>

                    <p className="text-xs text-gray-600 text-center mt-3">
                      Offer and billing go live soon. Buttons confirm instead of failing.
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="max-w-5xl mx-auto mt-10">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-[#0f3c85] mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-gray-900">Card-before-first-payroll policy</p>
                    <p className="text-gray-700 mt-1">
                      You can explore WageFlow without a card. To run your first live payroll, you add a card. Simple.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        <section id="faq" className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">FAQs</h2>
              <p className="text-lg text-gray-700 mt-3">Quick answers before you buy.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {faqs.map((item, i) => (
                <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                  <p className="font-semibold text-gray-900">{item.q}</p>
                  <p className="text-gray-700 mt-2">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="py-16 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Contact</h2>
              <p className="text-lg text-gray-700 mt-3 max-w-3xl mx-auto">
                Click request demo and your email client opens with the subject line already set.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-left">
                <p className="font-semibold text-gray-900">Request a demo</p>
                <p className="text-gray-700 mt-2">
                  Simple. No forms. No pretending.
                </p>
                <button
                  type="button"
                  onClick={onRequestDemo}
                  className="mt-5 inline-flex items-center justify-center gap-2 bg-[#0f3c85] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85] w-full"
                >
                  Request a demo
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>

                <div className="mt-5 space-y-3 text-sm text-gray-800">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#0f3c85]" aria-hidden="true" />
                    <span>sales@thebusinessconsortiumltd.co.uk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#0f3c85]" aria-hidden="true" />
                    <span>Replace with your public phone number</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-left">
                <p className="font-semibold text-gray-900">Get 1st month free</p>
                <p className="text-gray-700 mt-2">
                  This offer goes live when billing is enabled. For now, the button confirms “Coming soon”.
                </p>

                <button
                  type="button"
                  onClick={onGetFreeMonth}
                  className="mt-5 inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85] w-full"
                >
                  Get 1st month free
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-[#0f3c85]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Ready to simplify payroll?</h2>
            <p className="text-lg text-blue-50 mt-4">
              Exception-led review. Calm approvals. Less time wasted.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button
                type="button"
                onClick={onGetFreeMonth}
                className="bg-white text-[#0f3c85] px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-white"
              >
                Get 1st month free
              </button>
              <button
                type="button"
                onClick={onRequestDemo}
                className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-white"
              >
                Request a demo
              </button>
            </div>

            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 text-blue-50 hover:text-white transition mt-8"
            >
              Back to The Business Consortium
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden">
                  <Image src="/WageFlowLogo.png" alt="WageFlow logo" width={34} height={34} className="object-contain" />
                </div>
                <div className="text-2xl font-bold text-white">WageFlow</div>
              </div>
              <p className="text-sm text-gray-300">
                UK payroll software built for speed, clarity, and clean workflows.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button type="button" onClick={() => scrollToId("features")} className="hover:text-white transition">
                    Features
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToId("pricing")} className="hover:text-white transition">
                    Pricing
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToId("faq")} className="hover:text-white transition">
                    FAQs
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
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/" className="hover:text-white transition">
                    The Business Consortium
                  </a>
                </li>
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
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button type="button" onClick={onRequestDemo} className="hover:text-white transition text-left">
                    Request a demo
                  </button>
                </li>
                <li>
                  <button type="button" onClick={onGetFreeMonth} className="hover:text-white transition text-left">
                    Get 1st month free
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">© {new Date().getFullYear()} WageFlow. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white transition">
                Terms
              </a>
              <a href="#" className="hover:text-white transition">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
