"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  Lock,
  Mail,
  Menu,
  Shield,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

type Props = {
  initialShowIntro?: boolean;
};

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

type PersonaCard = {
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function TheBusinessConsortiumLanding(_: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingMode, setBillingMode] = useState<BillingMode>("annual");
  const [employeeCount, setEmployeeCount] = useState<number>(5);

  const CONTACT_EMAIL = "enquiries@thebusinessconsortiumltd.co.uk";
  const CONTACT_BODY =
    "Welcome to The Business Consortium Ltd's initial contact method.\n\n" +
    "Before we can help you, we just need a few details from you, listed below.\n" +
    "Please answer the questions as best you can and when you're happy with your responses, hit that \"Send\" button.\n" +
    "When we receive your enquiry, one of the onboarding team will be in touch.\n\n" +
    "Name of company:\n" +
    "Name of company contact and their position in company:\n" +
    "Best method of contact, telephone or email:\n" +
    "Telephone or email details:\n" +
    "Best time of day to contact:\n" +
    "Size of company (No of employees):\n" +
    "Pay frequencies (weekly/fortnightly/4-weekly/monthly):";

  const HERO_SCREENSHOT_SRC = "/wageflow-screenshot.png";
  const FOUNDER_IMAGE_SRC = "/MeWageFlowWebsitePicDeepNavyBlueMAIN.png";
  const HMRC_GATE_LOGO_SRC = "/hmrc-gate.png";

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
    const mailto = buildMailto(CONTACT_EMAIL, "WageFlow demo request", CONTACT_BODY);
    window.location.href = mailto;
  };

  const onApplyPilotProgram = () => {
    const mailto = buildMailto(CONTACT_EMAIL, "WageFlow pilot program application", CONTACT_BODY);
    window.location.href = mailto;
  };

  const features: Feature[] = useMemo(
    () => [
      {
        icon: <Clock3 className="w-6 h-6" aria-hidden="true" />,
        title: "Exception-led payroll review",
        description:
          "WageFlow handles the heavy lifting so you focus on the entries that actually need attention.",
      },
      {
        icon: <Shield className="w-6 h-6" aria-hidden="true" />,
        title: "Built for real UK payroll workflow",
        description:
          "Structured runs, clear approvals, predictable processing, and fewer mystery states.",
      },
      {
        icon: <TrendingUp className="w-6 h-6" aria-hidden="true" />,
        title: "See changes before approval",
        description:
          "Review movements and totals before payday, not after the damage is done. Humans do love cleaning up preventable mess.",
      },
    ],
    []
  );

  const featureBullets = useMemo(
    () => [
      "Unlimited payroll runs with a visible audit trail.",
      "UK PAYE and NI calculations built into the workflow.",
      "Clear payslips and gross-to-net visibility.",
      "Starter and leaver handling to keep records clean.",
      "Absence and holiday tracking to reduce avoidable errors.",
      "Exports and reports for review, records, and control.",
    ],
    []
  );

  const personas: PersonaCard[] = useMemo(
    () => [
      {
        icon: <Users className="w-6 h-6" aria-hidden="true" />,
        title: "SMEs running payroll in-house",
        description:
          "For owners and managers who need payroll done correctly without burning half the week on admin.",
        bullets: [
          "Reduce manual steps and repeat work.",
          "Review what matters instead of everything.",
          "Keep payday week calmer and more predictable.",
        ],
      },
      {
        icon: <Shield className="w-6 h-6" aria-hidden="true" />,
        title: "Payroll and HR professionals",
        description:
          "For teams who want a clean review process, explainable totals, and less rework after approval.",
        bullets: [
          "Exception-led review keeps attention in the right place.",
          "Clear totals and movements for sign-off.",
          "Designed around real UK payroll behaviour.",
        ],
      },
      {
        icon: <FileText className="w-6 h-6" aria-hidden="true" />,
        title: "Bureaux and multi-client operators",
        description:
          "For people processing payroll repeatedly across clients and needing a system that stays consistent.",
        bullets: [
          "Repeatable run structure across clients.",
          "Fewer surprises before approval.",
          "Simple pricing that scales by employee count.",
        ],
      },
    ],
    []
  );

  const seoPages = useMemo(
    () => [
      {
        href: "/uk-payroll-software.html",
        title: "UK payroll software",
        description:
          "A broader overview of WageFlow for UK payroll teams that want cleaner PAYE, NI, RTI and approval workflow.",
        cta: "Learn more about UK payroll software",
      },
      {
        href: "/payroll-software-for-small-business.html",
        title: "Payroll software for small business",
        description:
          "A focused page for small UK employers that need simple payroll review, clear pricing and fewer payday surprises.",
        cta: "View small business payroll software",
      },
      {
        href: "/payroll-software-for-bureaus.html",
        title: "Payroll software for payroll bureaus",
        description:
          "A focused page for bureaux, accountants and multi-client payroll teams that need repeatable review and approval control.",
        cta: "View bureau payroll software",
      },
    ],
    []
  );

  const faqs: FAQ[] = useMemo(
    () => [
      {
        q: "What is WageFlow?",
        a: "WageFlow is UK payroll software built to reduce manual work, surface exceptions, and make payroll approval clearer.",
      },
      {
        q: "Who is it built for?",
        a: "It is built for SMEs, payroll professionals, HR teams, and bureaux that want a cleaner UK payroll workflow.",
      },
      {
        q: "Do I need to add a card immediately?",
        a: "You can explore, review pricing, and request a demo without a card. A card is required before running your first live payroll.",
      },
      {
        q: "What is the pilot offer?",
        a: "The first 10 companies can apply for a guided parallel run and 3 months free, subject to weekly or monthly testimonial submissions.",
      },
      {
        q: "How do extra employees work?",
        a: "Each plan includes a set number of employees. Employees above that are charged at £1 per employee per month.",
      },
      {
        q: "Can I choose annual or monthly billing?",
        a: "Yes. Annual billing is paid upfront and saves the equivalent of 2 months compared with monthly pricing.",
      },
      {
        q: "Can I import employee data?",
        a: "Yes. WageFlow supports CSV import for employee data so you do not have to key everything in by hand like it is 2004.",
      },
      {
        q: "What happens if payroll needs correction later?",
        a: "You review and approve within WageFlow first. Corrections after approval are handled through the payroll workflow rather than pretending mistakes never happened.",
      },
    ],
    []
  );

  const plans: Plan[] = useMemo(
    () => [
      {
        name: "Starter",
        monthlyPrice: 15,
        annualPrice: 150,
        includedEmployees: 5,
        extraEmployeeMonthly: 1,
        features: [
          "Up to 5 employees included",
          "Unlimited payroll runs",
          "UK PAYE and NI calculations",
          "Basic payslips",
          "Starter and leaver tracking",
          "Basic absence tracking",
          "Email support",
        ],
      },
      {
        name: "Growth",
        monthlyPrice: 30,
        annualPrice: 300,
        includedEmployees: 20,
        extraEmployeeMonthly: 1,
        highlight: true,
        features: [
          "Up to 20 employees included",
          "Unlimited payroll runs",
          "UK PAYE and NI calculations",
          "Detailed payslips and breakdowns",
          "Starter and leaver workflows",
          "Absence and holiday tracking",
          "Payroll exports and reports",
          "Priority email support",
          "Bulk employee import",
        ],
      },
    ],
    []
  );

  const pricingCards = useMemo(() => {
    const employees = clamp(employeeCount, 1, 50);

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
  }, [billingMode, employeeCount, plans]);

  const closeMenuAndGo = (id: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => scrollToId(id), 0);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-[#0f3c85]"
      >
        Skip to content
      </a>

      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              type="button"
              onClick={() => scrollToId("top")}
              className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              aria-label="Go to top"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden">
                <Image
                  src="/WageFlowLogo.png"
                  alt="WageFlow logo"
                  width={36}
                  height={36}
                  className="object-contain"
                  priority
                />
              </div>

              <div className="text-left leading-tight">
                <div className="text-xl sm:text-2xl font-bold text-[#0f3c85]">WageFlow</div>
                <div className="text-xs sm:text-sm text-gray-600">
                  UK payroll software by The Business Consortium Ltd
                </div>
              </div>
            </button>

            <div className="hidden md:flex items-center gap-6">
              <button
                type="button"
                onClick={() => scrollToId("why")}
                className="text-gray-700 hover:text-gray-900 transition px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Why WageFlow
              </button>
              <button
                type="button"
                onClick={() => scrollToId("how")}
                className="text-gray-700 hover:text-gray-900 transition px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                How it works
              </button>
              <button
                type="button"
                onClick={() => scrollToId("pricing")}
                className="text-gray-700 hover:text-gray-900 transition px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => scrollToId("faq")}
                className="text-gray-700 hover:text-gray-900 transition px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                FAQs
              </button>
              <button
                type="button"
                onClick={onRequestDemo}
                className="bg-[#0f3c85] text-white px-5 py-2 rounded-lg hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Request a demo
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
                onClick={() => closeMenuAndGo("why")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Why WageFlow
              </button>
              <button
                type="button"
                onClick={() => closeMenuAndGo("how")}
                className="block w-full text-left text-gray-800 hover:text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                How it works
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
                  onRequestDemo();
                }}
                className="block w-full bg-[#0f3c85] text-white px-6 py-3 rounded-lg hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
              >
                Request a demo
              </button>
            </div>
          </div>
        )}
      </nav>

      <main id="main" className="pt-24" role="main">
        <section id="top" className="pt-10 pb-14 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 items-stretch">
              <div className="h-full flex flex-col">
                <p className="inline-flex items-center gap-2 text-sm text-[#0f3c85] bg-blue-50 px-3 py-1 rounded-full border border-blue-100 w-fit">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  Payroll first. Exception-led review.
                </p>

                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mt-5 leading-tight">
                  UK Payroll Software That Helps You Catch Problems Before Payday
                </h1>

                <p className="text-lg md:text-xl text-gray-700 mt-5 max-w-2xl">
                  WageFlow processes the run, checks the data, and flags what looks wrong.
                  You review the exceptions, then approve with confidence. Less manual work.
                  Less preventable chaos. Which, frankly, is overdue.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <button
                    type="button"
                    onClick={onRequestDemo}
                    className="bg-[#0f3c85] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:opacity-95 transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                  >
                    Request a demo
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToId("pricing")}
                    className="border-2 border-gray-300 text-gray-800 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                  >
                    View pricing
                  </button>
                </div>

                <div className="mt-8 text-sm text-gray-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
                    Clear runs. Calm review. Clean approval.
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#0f3c85]" aria-hidden="true" />
                    Card required before processing your first live payroll
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" />
                    One guided parallel run included for trust and comparison
                  </div>
                </div>

                <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-6">
                  <p className="font-semibold text-gray-900">Built by a payroll professional</p>
                  <p className="text-gray-700 mt-2">
                    WageFlow was built using 27 years of experience across Payroll, HR, and Pensions
                    environments, including payroll and HR software implementation work across 20+ companies.
                  </p>
                </div>

                <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                  <p className="font-bold text-gray-900">Pilot Program: First 10 Companies</p>
                  <p className="text-gray-700 mt-2">
                    The first 10 customers get a free Payroll Director guided parallel run and 3 months free,
                    subject to weekly or monthly testimonial submissions.
                  </p>
                  <button
                    type="button"
                    onClick={onApplyPilotProgram}
                    className="mt-4 w-full sm:w-auto bg-[#0f3c85] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                  >
                    Apply for pilot program
                  </button>
                </div>
              </div>

              <div className="h-full flex flex-col gap-6">
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden">
                        <Image
                          src="/WageFlowLogo.png"
                          alt="WageFlow logo"
                          width={28}
                          height={28}
                          className="object-contain"
                        />
                      </div>
                      <div className="font-bold text-gray-900 text-lg">WageFlow</div>
                    </div>

                    <div className="text-xs font-semibold text-[#0f3c85] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                      Product preview
                    </div>
                  </div>

                  <div className="relative min-h-[420px] bg-white">
                    <Image
                      src={HERO_SCREENSHOT_SRC}
                      alt=""
                      fill
                      priority
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover blur-xl scale-110 opacity-25"
                      aria-hidden="true"
                    />
                    <Image
                      src={HERO_SCREENSHOT_SRC}
                      alt="WageFlow dashboard preview"
                      fill
                      priority
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-contain object-top"
                    />
                  </div>

                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-full bg-gray-100 border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-900">
                        Exception-led review
                      </div>
                      <div className="rounded-full bg-gray-100 border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-900">
                        Explainable totals
                      </div>
                      <div className="rounded-full bg-gray-100 border border-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-900">
                        Audit trail per change
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                  <div className="grid sm:grid-cols-[140px,1fr] gap-5 items-start">
                    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
                      <div className="relative w-full aspect-[4/5]">
                        <Image
                          src={FOUNDER_IMAGE_SRC}
                          alt="Adam Manley, Founder"
                          fill
                          className="object-contain bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900 text-lg">Adam Manley, Founder</p>
                      <p className="text-gray-700 mt-2">
                        27 years in Payroll, HR, and Pensions environments, with hands-on implementation
                        experience across companies of different sizes.
                      </p>

                      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <Image
                            src={HMRC_GATE_LOGO_SRC}
                            alt="HMRC compliance reference"
                            width={20}
                            height={20}
                            className="w-5 h-5 object-contain mt-0.5"
                          />
                          <div>
                            <p className="font-semibold text-gray-900">Built around HMRC RTI workflow</p>
                            <p className="text-gray-700 mt-1">
                              WageFlow is designed around UK payroll rules and HMRC RTI requirements.
                              Compliance is part of the workflow, not some decorative afterthought.
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Not affiliated with or endorsed by HMRC.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="why" className="py-16 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Why WageFlow</h2>
              <p className="text-lg text-gray-700 mt-3 max-w-3xl mx-auto">
                WageFlow is designed to reduce manual work, make payroll review clearer,
                and keep the whole process controlled from start to approval.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0f3c85]">
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

            <div className="grid lg:grid-cols-2 gap-8 items-start mt-8">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="font-semibold text-gray-900">Built for cleaner payroll runs</p>
                <p className="text-gray-700 mt-2">
                  The point is simple. Reduce mistakes. Reduce time. Keep review visible.
                  Keep approval deliberate. Resist the very human urge to trust a mess because it looks familiar.
                </p>

                <div className="mt-5 space-y-3">
                  {featureBullets.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div className="text-gray-800">{item}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="font-semibold text-gray-900">You stay in control</p>
                <p className="text-gray-700 mt-2">
                  WageFlow is built for review, not blind trust. You can inspect the run, understand the movement,
                  then approve. That is the entire point of doing payroll properly.
                </p>

                <div className="mt-5 grid gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="font-medium text-gray-900">Before approval</p>
                    <p className="text-gray-700 mt-1">Review flagged exceptions, totals, and changes.</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="font-medium text-gray-900">During approval</p>
                    <p className="text-gray-700 mt-1">Approve with visibility instead of guesswork.</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="font-medium text-gray-900">After approval</p>
                    <p className="text-gray-700 mt-1">Keep the audit trail clear and the records explainable.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onRequestDemo}
                  className="w-full mt-6 bg-[#0f3c85] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                >
                  Request a demo
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">How it works</h2>
              <p className="text-lg text-gray-700 mt-3">
                From setup to your first payroll run in a simple three-step flow.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#0f3c85] mb-4">
                  <FileText className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Step 1: Add company details</h3>
                <p className="text-gray-700 mb-3">
                  Set up your payroll foundation with the details needed to run properly.
                </p>
                <p className="text-sm text-gray-600">
                  Company details, PAYE references, and core setup.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#0f3c85] mb-4">
                  <Users className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Step 2: Add or import employees</h3>
                <p className="text-gray-700 mb-3">
                  Upload by CSV or add people manually, depending on how much suffering you are in the mood for.
                </p>
                <p className="text-sm text-gray-600">
                  CSV support helps you move faster and avoid rekeying.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#0f3c85] mb-4">
                  <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Step 3: Run payroll and review exceptions</h3>
                <p className="text-gray-700 mb-3">
                  Review flagged items, confirm the run, and approve with a clear audit trail.
                </p>
                <p className="text-sm text-gray-600">
                  A guided parallel run is available for added confidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="who" className="py-16 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Who WageFlow is for</h2>
              <p className="text-lg text-gray-700 mt-3 max-w-3xl mx-auto">
                WageFlow is for people who need payroll processed accurately, visibly, and without unnecessary drama.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {personas.map((card, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0f3c85]">
                      {card.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{card.title}</p>
                      <p className="text-gray-700 mt-1">{card.description}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    {card.bullets.map((bullet, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <div className="text-gray-800">{bullet}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={onRequestDemo}
                    className="w-full mt-6 border-2 border-gray-300 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                  >
                    Request a demo
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm md:p-8">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#0f3c85]">
                  Explore WageFlow payroll software
                </p>
                <h3 className="mt-2 text-2xl font-bold text-gray-900">
                  Choose the page that matches how you run payroll
                </h3>
                <p className="mt-3 text-gray-700">
                  These pages give visitors and search engines clear routes into the right WageFlow use case, with dedicated pages for UK payroll teams, small businesses and bureaus.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {seoPages.map((page) => (
                  <a
                    key={page.href}
                    href={page.href}
                    className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#0f3c85]"
                  >
                    <span className="text-lg font-bold text-gray-900">{page.title}</span>
                    <span className="mt-2 flex-1 text-sm leading-6 text-gray-700">
                      {page.description}
                    </span>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0f3c85]">
                      {page.cta}
                      <ArrowRight
                        className="h-4 w-4 transition group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Simple pricing</h2>
              <p className="text-lg text-gray-700 mt-3">
                Transparent pricing with annual and monthly options.
              </p>
            </div>

            <div className="flex flex-col items-center gap-6 mb-10">
              <div
                className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2"
                role="group"
                aria-label="Billing period"
              >
                <button
                  type="button"
                  onClick={() => setBillingMode("annual")}
                  className={classNames(
                    "px-4 py-2 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f3c85]",
                    billingMode === "annual" ? "bg-[#0f3c85] text-white" : "text-gray-800 hover:bg-white"
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
                    billingMode === "monthly" ? "bg-[#0f3c85] text-white" : "text-gray-800 hover:bg-white"
                  )}
                  aria-pressed={billingMode === "monthly"}
                >
                  Monthly
                </button>
              </div>

              <div className="w-full max-w-3xl bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <Calculator className="w-6 h-6 text-[#0f3c85] mt-0.5" aria-hidden="true" />
                  <div className="w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900 text-lg">Pricing calculator</p>
                        <p className="text-sm text-gray-700 mt-1">
                          Move the slider to estimate pricing by employee count.
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-2 bg-white border border-blue-200 rounded-xl px-4 py-2 shadow-sm">
                        <Users className="w-5 h-5 text-[#0f3c85]" aria-hidden="true" />
                        <span className="font-bold text-gray-900 text-lg">{employeeCount}</span>
                        <span className="text-gray-700 font-semibold">employees</span>
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
                        max={50}
                        step={1}
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(parseInt(e.target.value || "1", 10))}
                        className="w-full accent-[#0f3c85] h-3"
                      />
                      <div className="flex justify-between text-xs text-gray-600 mt-2 font-semibold">
                        <span>1 employee</span>
                        <span>50 employees</span>
                      </div>
                    </div>

                    <div className="mt-5 text-sm text-gray-700 bg-white rounded-lg p-3 border border-blue-200">
                      Annual plans save the equivalent of 2 months compared with monthly pricing.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {pricingCards.map(
                ({ plan, employees, extras, base, baseLabel, extrasCost, total, savings, isAnnual }, index) => {
                  const perExtraLabel = isAnnual ? "/year" : "/month";
                  const perExtraAmount = isAnnual ? plan.extraEmployeeMonthly * 12 : plan.extraEmployeeMonthly;

                  return (
                    <div
                      key={index}
                      className={classNames(
                        "rounded-2xl p-8 border bg-gray-50",
                        plan.highlight ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                          <p className="text-gray-700 mt-1">
                            First {plan.includedEmployees} employees included. You selected {employees}.
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

                        <div className="mt-3 border border-gray-200 rounded-xl p-4 bg-white">
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
                            Save {formatGBP(savings.saving)} versus monthly on the base plan.
                          </p>
                        )}

                        <p className="text-sm text-gray-700 mt-3">
                          Card required before processing your first live payroll.
                        </p>
                      </div>

                      <ul className="space-y-3 mt-6">
                        {plan.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                            <span className="text-gray-800">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        onClick={onRequestDemo}
                        className="w-full mt-7 py-3 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85] bg-[#0f3c85] text-white hover:opacity-95"
                      >
                        Request a demo
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </section>

        <section id="faq" className="py-16 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">FAQs</h2>
              <p className="text-lg text-gray-700 mt-3">Straight answers before you buy.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {faqs.map((item, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6">
                  <p className="font-semibold text-gray-900">{item.q}</p>
                  <p className="text-gray-700 mt-2">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Contact</h2>
              <p className="text-lg text-gray-700 mt-3 max-w-3xl mx-auto">
                Click the button and your email client opens with the subject line already set.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-left">
                <p className="font-semibold text-gray-900">Request a WageFlow demo</p>
                <p className="text-gray-700 mt-2">
                  No clutter. No fake funnel theatre. Just contact and demo.
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
                    <span>{CONTACT_EMAIL}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-left">
                <p className="font-semibold text-gray-900">Apply for the pilot program</p>
                <p className="text-gray-700 mt-2">
                  First 10 companies can apply for a guided parallel run and 3 months free.
                </p>

                <button
                  type="button"
                  onClick={onApplyPilotProgram}
                  className="mt-5 inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition focus:outline-none focus:ring-2 focus:ring-[#0f3c85] w-full"
                >
                  Apply for pilot program
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-[#0f3c85]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              WageFlow gives your website one clear job
            </h2>
            <p className="text-lg text-blue-50 mt-4">
              Explain the payroll problem. Show the product. Ask for the demo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button
                type="button"
                onClick={onRequestDemo}
                className="bg-white text-[#0f3c85] px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-white inline-flex items-center justify-center gap-2"
              >
                Request a demo
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => scrollToId("pricing")}
                className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-white"
              >
                View pricing
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
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/WageFlowLogo.png"
                    alt="WageFlow logo"
                    width={34}
                    height={34}
                    className="object-contain"
                  />
                </div>
                <div className="text-2xl font-bold text-white">WageFlow</div>
              </div>

              <p className="text-sm text-gray-300 mb-4">
                UK payroll software built for speed, clarity, and cleaner review.
              </p>

              <div className="text-xs text-gray-400 space-y-1 border-t border-gray-800 pt-4">
                <p>The Business Consortium Ltd</p>
                <p>Registered in England and Wales</p>
                <p>Company No: 16636529</p>
                <p className="leading-relaxed">Registered Office: 86-90 Paul Street, London EC2A 4NE</p>
                <p className="mt-2">
                  <a
                    href="mailto:enquiries@thebusinessconsortiumltd.co.uk"
                    className="hover:text-white transition"
                  >
                    enquiries@thebusinessconsortiumltd.co.uk
                  </a>
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">WageFlow</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToId("why")}
                    className="hover:text-white transition"
                  >
                    Why WageFlow
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToId("how")}
                    className="hover:text-white transition"
                  >
                    How it works
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToId("pricing")}
                    className="hover:text-white transition"
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToId("faq")}
                    className="hover:text-white transition"
                  >
                    FAQs
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToId("contact")}
                    className="hover:text-white transition"
                  >
                    Contact
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/privacy" className="hover:text-white transition">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-white transition">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Get started</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={onRequestDemo}
                    className="hover:text-white transition text-left"
                  >
                    Request a demo
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onApplyPilotProgram}
                    className="hover:text-white transition text-left"
                  >
                    Apply for pilot program
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <p className="text-sm text-gray-400 text-center">
              © {new Date().getFullYear()} The Business Consortium Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}