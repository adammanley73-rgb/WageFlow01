export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900">PAY-ME</h2>
            <p className="text-sm text-gray-600">UK Payroll System</p>
          </div>
          <nav className="px-4">
            <a href="#" className="block px-4 py-2 text-gray-700 rounded hover:bg-gray-100">
              Dashboard
            </a>
            <a href="#" className="block px-4 py-2 text-gray-700 rounded hover:bg-gray-100">
              Employees
            </a>
            <a href="#" className="block px-4 py-2 text-gray-700 rounded hover:bg-gray-100">
              Payroll
            </a>
            <a href="#" className="block px-4 py-2 text-gray-700 rounded hover:bg-gray-100">
              Reports
            </a>
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-1">
          <header className="bg-white shadow-sm border-b">
            <div className="px-6 py-4">
              <h1 className="text-lg font-semibold text-gray-900">
                Payroll Management - 2025/26 Tax Year
              </h1>
            </div>
          </header>
          <main>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}