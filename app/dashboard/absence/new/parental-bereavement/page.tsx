// app/dashboard/absence/new/parental-bereavement/page.tsx
"use client"

import React, { useState } from "react"
import EmployeePicker from "@/components/employees/EmployeePicker"
import { storeVersion } from "@/lib/storeVersion"
import { calcSPBP } from "@/lib/statutory/spbp"

export default function ParentalBereavementPage() {
  const [employeeId, setEmployeeId] = useState<string>("")
  const [calcResult, setCalcResult] = useState<string>("")

  const handleCalculate = () => {
    // Dummy input for now; real implementation will pull from employee data
    const result = calcSPBP({
      weeklyEarnings: 600,
      startDate: "2025-09-01",
    })
    setCalcResult(JSON.stringify(result, null, 2))
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Parental Bereavement Absence
      </h1>
      <EmployeePicker onSelect={setEmployeeId} />
      <button
        onClick={handleCalculate}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Calculate SPBP
      </button>
      {calcResult && (
        <pre className="mt-4 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
          {calcResult}
        </pre>
      )}
      <div className="mt-4 text-sm text-gray-500">
        Store version: {storeVersion}
      </div>
    </div>
  )
}
