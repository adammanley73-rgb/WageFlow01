// app/page.tsx
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="h-dvh w-full overflow-x-hidden overflow-y-hidden bg-gradient-to-b from-[#0fb96b] to-[#1f5fff]">
      {/* Full-viewport grid to eliminate scroll and center content */}
      <section className="h-full w-full grid place-items-center px-4">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-6 md:p-8 shadow-xl">
          {/* Logo only. No adjacent text. Sizes chosen to prevent overflow on small screens */}
          <div className="flex items-center justify-center">
            <Image
              src="/wageflow-logo.png"
              alt="WageFlow"
              priority
              width={960}
              height={320}
              className="h-28 w-auto md:h-40 lg:h-48"
            />
          </div>

          <h1 className="mt-6 text-center text-2xl font-extrabold tracking-tight text-neutral-900 md:mt-8 md:text-4xl">
            UK Payroll Management Demo
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-neutral-600 md:mt-4 md:text-base">
            Professional payroll system with employee management, auto-enrollment
            compliance, and UK tax features.
          </p>

          <div className="mt-6 flex justify-center md:mt-8">
            <a
              href="/dashboard"
              className="rounded-full bg-[#1f5fff] px-6 py-3 text-sm font-semibold text-white shadow hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              View Live Demo System
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
