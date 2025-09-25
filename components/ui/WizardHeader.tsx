/* @ts-nocheck */
import React from "react"
import HeaderBanner from "@/components/ui/HeaderBanner"

export default function WizardHeader() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <HeaderBanner currentSection={"employees" as any} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-semibold">New Employee Wizard</div>
        <nav className="flex flex-wrap gap-2"></nav>
      </div>
    </div>
  )
}
