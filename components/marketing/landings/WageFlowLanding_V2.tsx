"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  FileText,
  Lock,
  Users,
  Calculator,
  BadgeCheck,
  Link as LinkIcon,
  Mail,
  Phone,
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

export default function WageFlowLandingV2() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingMode, setBillingMode] = useState<BillingMode>("annual");

  // Option A: employee count slider to calculate pricing live.
  const [employeeCount, setEmployeeCount] = useState<number>(10);

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

  const features: Feature[] = useMemo(
    () => [
      {
        icon: <Clock className="w-6 h-6" aria-hidden="true" />,
        title: "Run payroll fast",
        description:
          "Prepare a run, review exceptions, approve. WageFlow handles PAYE and NI calculations for you.",
      },
      {
        icon: <Shield className="w-6 h-6" aria-hidden="true" />,
        title: "UK-first workflows",
        description:
          "Structured run history, clear outputs, and predictable steps that make audits less painful.",
      },
      {
        icon: <TrendingUp className="w-6 h-6" aria-hidden="true" />,
        title: "See what changed before approval",
        description:
          "Review totals and employee movements so you catch problems during review, not after payday.",
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
        a: "Yes. You get full access for 30 days. Cancel before day 30 and you will not be charged.",
      },
      {
        q: "Do I need to add a card on day 1?",
        a: "No. A card is required before you run your first payroll. You can explore the product first.",
      },
      {
        q: "What is the parallel run promise?",
        a: "Most customers do one payroll in parallel first. Compare results and decide. No pressure, no lock-in.",
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

      // For annual billing, treat extra employee charge as monthly x 12.
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
    // Adjust to your real sign-in route later.
    // For now it scrolls to pricing so the button isn't dead.
    scrollToId("pricing");
  };

  const onTalkToSales = () => {
    scrollToId("contact");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-blue-600"
      >
        Skip to content
      </a>

      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              type="button"
              onClick={() => scrollToId("top")}
              className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-lg"
              aria-label="Go to top"
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="20" y="20" width="160" height="80" rx="20" fill="#4A9B6F" />
                <path
                  d="M20 120 Q60 80 100 100 Q140 120 180 100 L180 160 Q180 180 160 180 L40 180 Q20 180 20 160 Z"
                  fill="#1D5B99"
                />
                <path
                  d="M20 100 Q60 60 100 80 Q140 100 180 80 L180 100 Q140 120 100 100 Q60 80 20 120 Z"
                  fill="white"
                />
              </svg>
              <span className="text-2xl font-bold text-blue-700">WageFlow</span>
            </button>

            <div className="hidden md:flex items-center gap-8">
              <button
                type="button"
                onClick={() => scrollToId("features")}
                className="text-gray-700 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-md px-2 py-1"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => scrollToId("who")}
                className="text-gray-700 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-md px-2 py-1"
              >
                Who it’s for
              </button>
              <button
                type="button"
                onClick={() => scrollToId("pricing")}
                className="text-gray-700 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-md px-2 py-1"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => scrollToId("faq")}
                className="text-gray-700 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-md px-2 py-1"
              >
                FAQs
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="text-gray-700 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-md px-2 py-1"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => scrollToId("pricing")}
                className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                Get 1st Month Free
              </button>
            </div>

            <button
              type="button"
              className="md:hidden p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("who")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                Who it’s for
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("pricing")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("faq")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                FAQs
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignIn();
                }}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("pricing")}
                className="block w-full bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-600"
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
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-sm text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  UK payroll SaaS. Transparent pricing. No lock-in.
                </p>

                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mt-5 leading-tight">
                  See what changed before you approve payroll
                </h1>

                <p className="text-lg md:text-xl text-gray-700 mt-5 max-w-xl">
                  WageFlow is built by a UK payroll professional for SMEs who want fewer mistakes, clearer runs, and less
                  time lost to rework.
                </p>

                <p className="text-lg text-gray-700 mt-4 max-w-xl">
                  Approve, amend, or delete exceptions. Do one parallel payroll to verify results. Add a card only before
                  your first payroll run.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => scrollToId("pricing")}
                    className="bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-800 transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    Get 1st Month Free
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToId("promise")}
                    className="border-2 border-gray-300 text-gray-800 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    See the parallel run promise
                  </button>
                </div>

                <div className="mt-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">What happens next</p>
                  <p className="mt-1">
                    Create an account, explore freely, do one parallel run, add a card only when you are ready to run
                    live payroll.
                  </p>
                </div>

                <div className="mt-5 text-sm text-gray-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
                    First month free. Cancel anytime.
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-700" aria-hidden="true" />
                    Card required before first payroll run.
                  </div>
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-700" aria-hidden="true" />
                    One parallel payroll run included for trust.
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 md:p-8">
                <h2 className="text-xl font-bold text-gray-900">What you get in the free month</h2>
                <p className="text-gray-700 mt-2">
                  Full access for 30 days. Explore first. Add your card only when you are ready to run payroll.
                </p>

                <ul className="mt-5 space-y-3 text-gray-800">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5" aria-hidden="true" />
                    Create a run. Attach employees. Review totals.
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5" aria-hidden="true" />
                    Do one parallel run and compare results.
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5" aria-hidden="true" />
                    Cancel before day 30 and you will not be charged.
                  </li>
                </ul>

                <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-700 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-gray-900">Transparent pricing from day 1</p>
                      <p className="text-sm text-gray-700 mt-1">
                        Annual plans save the equivalent of 2 months compared to monthly. No hidden setup fees.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => scrollToId("pricing")}
                  className="w-full mt-6 bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  <Clock className="w-5 h-5 text-blue-700" aria-hidden="true" />
                  Reduce payroll time
                </div>
                <p className="text-gray-700 mt-2">
                  Stop spending hours on input and rework. Focus on exceptions and approvals.
                </p>
              </div>

              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Shield className="w-5 h-5 text-blue-700" aria-hidden="true" />
                  Compliance-led workflow
                </div>
                <p className="text-gray-700 mt-2">
                  Clear run history and consistent outputs. Less chaos when you need answers.
                </p>
              </div>

              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <TrendingUp className="w-5 h-5 text-blue-700" aria-hidden="true" />
                  Understand changes
                </div>
                <p className="text-gray-700 mt-2">
                  Review totals and movements so you can spot problems before approval.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Everything you need</h2>
              <p className="text-lg text-gray-700 mt-3 max-w-2xl mx-auto">
                Core features that keep payroll clean, fast, and consistent for UK businesses.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-8 border border-gray-200 rounded-2xl bg-white hover:shadow-lg transition"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-700 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-700">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => scrollToId("pricing")}
                className="inline-flex items-center justify-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                See pricing
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section id="who" className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Who WageFlow is for</h2>
              <p className="text-lg text-gray-700 mt-3 max-w-3xl mx-auto">
                Built for people who want payroll to be predictable, explainable, and hard to mess up.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Users className="w-5 h-5 text-blue-700" aria-hidden="true" />
                  SME owners
                </div>
                <p className="text-gray-700 mt-2">You want payroll done properly without it taking over your week.</p>
              </div>

              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <FileText className="w-5 h-5 text-blue-700" aria-hidden="true" />
                  Payroll admins
                </div>
                <p className="text-gray-700 mt-2">
                  You need a clean run process, clear outputs, and fewer “why is this wrong” loops.
                </p>
              </div>

              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <Shield className="w-5 h-5 text-blue-700" aria-hidden="true" />
                  HR teams
                </div>
                <p className="text-gray-700 mt-2">
                  You want starter and leaver tracking, absence basics, and audit-friendly records.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="promise" className="py-16 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Parallel run payroll promise</h2>
            <p className="text-lg text-gray-700 mt-4">
              Most customers do a parallel run before switching. That’s the point.
            </p>
            <p className="text-lg text-gray-700 mt-2">
              Run one payroll in parallel with your current system. Compare results. Then decide.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mt-8 text-left">
              <div className="border border-gray-200 rounded-xl p-5 bg-white">
                <p className="font-semibold text-gray-900">1. Run it</p>
                <p className="text-gray-700 mt-2">Create one run and process it alongside your current payroll.</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-5 bg-white">
                <p className="font-semibold text-gray-900">2. Compare it</p>
                <p className="text-gray-700 mt-2">Check gross, deductions, and net results before you commit.</p>
              </div>
              <div className="border border-gray-200 rounded-xl p-5 bg-white">
                <p className="font-semibold text-gray-900">3. Decide</p>
                <p className="text-gray-700 mt-2">No pressure. No lock-in. Cancel anytime.</p>
              </div>
            </div>

            <div className="mt-8 border border-gray-200 bg-white rounded-2xl p-6 text-left">
              <div className="flex items-start gap-3">
                <BadgeCheck className="w-5 h-5 text-green-600 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-gray-900">Risk removal, not a sales trick</p>
                  <p className="text-gray-700 mt-1">
                    Compare totals and employee results before you ever switch. If you see a mismatch, you catch it
                    during the parallel run, not after payday.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
              <p className="text-lg text-gray-700 mt-3">
                Annual pricing shown upfront. Monthly is available too. First month free. No contract.
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
                    "px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600",
                    billingMode === "annual" ? "bg-blue-700 text-white" : "text-gray-800 hover:bg-gray-50"
                  )}
                  aria-pressed={billingMode === "annual"}
                >
                  Annual
                </button>
                <button
                  type="button"
                  onClick={() => setBillingMode("monthly")}
                  className={classNames(
                    "px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600",
                    billingMode === "monthly" ? "bg-blue-700 text-white" : "text-gray-800 hover:bg-gray-50"
                  )}
                  aria-pressed={billingMode === "monthly"}
                >
                  Monthly
                </button>
              </div>

              <div className="w-full max-w-3xl bg-gray-50 border border-gray-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Calculator className="w-5 h-5 text-blue-700 mt-0.5" aria-hidden="true" />
                  <div className="w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">Pricing calculator</p>
                        <p className="text-sm text-gray-700 mt-1">
                          Slide to your employee count. Plans update instantly including extra employees at £1 per employee per month.
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
                        <Users className="w-5 h-5 text-blue-700" aria-hidden="true" />
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
                        className="w-full accent-blue-700"
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
                        <span className="text-sm font-semibold text-blue-800 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
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
                        First month free. Cancel anytime. Card required before first payroll run.
                      </p>

                      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
                        <p className="font-semibold text-gray-900">What happens after you click</p>
                        <ul className="mt-2 space-y-2 text-sm text-gray-800">
                          <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-600 mt-0.5" aria-hidden="true" />
                            Create an account and explore the product
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-600 mt-0.5" aria-hidden="true" />
                            Run one parallel payroll to verify results
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-600 mt-0.5" aria-hidden="true" />
                            Add a card only when you are ready to run live payroll
                          </li>
                        </ul>
                      </div>
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
                      className="w-full mt-7 py-3 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-600 bg-blue-700 text-white hover:bg-blue-800"
                      onClick={() => scrollToId("contact")}
                    >
                      Start free month
                    </button>

                    <p className="text-xs text-gray-600 text-center mt-3">
                      No lock-in. Explore first. Add card before running payroll.
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="max-w-5xl mx-auto mt-10">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-blue-700 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-gray-900">Card-before-first-payroll policy</p>
                    <p className="text-gray-700 mt-1">
                      You can explore WageFlow without a card. To run your first payroll, you add a card. Simple.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">WageFlow AI, used properly</h2>
            <p className="text-lg text-gray-700 mt-4">
              In-product guidance designed to reduce confusion. Where relevant, it can point you to official sources.
              You still approve payroll. The software does not guess.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-4 text-left">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="font-semibold text-gray-900">Clear answers</p>
                <p className="text-gray-700 mt-2">Explain what a rule means and what it changes in your run.</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="font-semibold text-gray-900">Links when relevant</p>
                <p className="text-gray-700 mt-2">Point to official guidance when it matters.</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="font-semibold text-gray-900">Human control</p>
                <p className="text-gray-700 mt-2">You approve. You can still run a parallel payroll to verify.</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-6 inline-flex items-center justify-center gap-2">
              <LinkIcon className="w-4 h-4" aria-hidden="true" />
              We keep claims specific and grounded. Trust beats hype.
            </p>
          </div>
        </section>

        <section id="faq" className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">FAQs</h2>
              <p className="text-lg text-gray-700 mt-3">Quick answers to the stuff people ask before they buy.</p>
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
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Talk to us</h2>
              <p className="text-lg text-gray-700 mt-3 max-w-3xl mx-auto">
                If you are cautious, good. Payroll should be treated like that. Tell us your employee count and pay frequency.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-left">
                <p className="font-semibold text-gray-900">Get started</p>
                <p className="text-gray-700 mt-2">
                  Start your free month, run one parallel payroll, then decide. No lock-in.
                </p>
                <button
                  type="button"
                  onClick={() => scrollToId("pricing")}
                  className="mt-5 inline-flex items-center justify-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  Start free month
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-left">
                <p className="font-semibold text-gray-900">Sales and onboarding</p>
                <p className="text-gray-700 mt-2">
                  Prefer a quick chat first. Fine. We can walk through a parallel run and onboarding.
                </p>

                <div className="mt-5 space-y-3 text-sm text-gray-800">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-700" aria-hidden="true" />
                    <span>sales@wageflow.co.uk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-700" aria-hidden="true" />
                    <span>+44 (0)000 000 0000</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Replace these with your real contact details before launch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-blue-700">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Ready to simplify payroll?</h2>
            <p className="text-lg text-blue-50 mt-4">
              Start with the free month. Run one parallel payroll. Decide with confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button
                type="button"
                onClick={() => scrollToId("pricing")}
                className="bg-white text-blue-800 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-white"
              >
                Get 1st Month Free
              </button>
              <button
                type="button"
                onClick={onTalkToSales}
                className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-white"
              >
                Talk to sales
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
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect x="20" y="20" width="160" height="80" rx="20" fill="#4A9B6F" />
                  <path
                    d="M20 120 Q60 80 100 100 Q140 120 180 100 L180 160 Q180 180 160 180 L40 180 Q20 180 20 160 Z"
                    fill="#1D5B99"
                  />
                  <path
                    d="M20 100 Q60 60 100 80 Q140 100 180 80 L180 100 Q140 120 100 100 Q60 80 20 120 Z"
                    fill="white"
                  />
                </svg>
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
                  <button type="button" onClick={() => scrollToId("who")} className="hover:text-white transition">
                    Who it’s for
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToId("pricing")} className="hover:text-white transition">
                    Pricing
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToId("promise")} className="hover:text-white transition">
                    Parallel run promise
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
                  <a href="#" className="hover:text-white transition">
                    About
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
                  <button type="button" onClick={() => scrollToId("faq")} className="hover:text-white transition">
                    FAQs
                  </button>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Status
                  </a>
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
