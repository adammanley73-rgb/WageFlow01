// app/dashboard/absence/list/page.tsx
"use client"

import React, { useEffect, useState } from "react"
import EmployeePicker from "@/components/employees/EmployeePicker"
import { storeVersion } from "@/lib/storeVersion"

export default function AbsenceListPage() {
  const [version, setVersion] = useState<string>("")

  useEffect(() => {
    setVersion(storeVersion)
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Absence List</h1>
      <EmployeePicker />
      <div className="mt-4 text-sm text-gray-500">
        Store version: {version}
      </div>
    </div>
  )
}
