'use client'

import Image from 'next/image'

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center space-x-3">
              {/* WageFlow Logo */}
              <Image 
                src="/WageFlowLogo.png" 
                alt="WageFlow" 
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <h1 className="text-2xl font-bold text-blue-600">
                WageFlow
              </h1>
            </div>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
              Dashboard
            </a>
            <a href="/payroll/employees" className="text-gray-700 hover:text-blue-600 font-medium">
              Employees
            </a>
            <a href="/payroll/pay-runs" className="text-gray-700 hover:text-blue-600 font-medium">
              Payroll
            </a>
            <a href="/dashboard/reports" className="text-gray-700 hover:text-blue-600 font-medium">
              Reports
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}