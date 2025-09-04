"use client";
import { useState, useEffect } from "react";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("12_months");
  const [reportData] = useState({
    payrollSummary: {
      totalGrossPay: 1245600,
      totalNetPay: 945230,
      totalTax: 186420,
      totalNI: 113950,
      employeeCount: 42,
      averageSalary: 29656,
      trend: 5.2,
    },
    departmentBreakdown: [
      { department: "Sales", employeeCount: 12, totalCost: 435600, averageSalary: 36300 },
      { department: "Engineering", employeeCount: 15, totalCost: 652500, averageSalary: 43500 },
      { department: "Marketing", employeeCount: 8, totalCost: 264000, averageSalary: 33000 },
      { department: "Administration", employeeCount: 7, totalCost: 193500, averageSalary: 27642 },
    ],
    monthlyTrends: [
      { month: "Jan", grossPay: 98500, tax: 15200, ni: 9400, netPay: 73900 },
      { month: "Feb", grossPay: 101200, tax: 15800, ni: 9700, netPay: 75700 },
      { month: "Mar", grossPay: 103800, tax: 16200, ni: 9950, netPay: 77650 },
      { month: "Apr", grossPay: 106200, tax: 16600, ni: 10200, netPay: 79400 },
      { month: "May", grossPay: 108900, tax: 17100, ni: 10450, netPay: 81350 },
      { month: "Jun", grossPay: 111600, tax: 17500, ni: 10700, netPay: 83400 },
    ],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(e.target.value);
  };

  const handleExport = () => {
    alert("Export functionality coming soon!");
  };

  if (loading) {
    return (
      <div style={styles.s804}>
        <div style={styles.s805}>
          <h1 style={{ color: "#1f2937", margin: "0" }}>Loading Reports Dashboard...</h1>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.s804}>
      <div style={styles.s806}>
        {/* Navigation Header */}
        <div style={styles.s807}>
          <div>
            <h1 style={styles.s808}>
              💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Reports & Analytics
            </h1>
            <p style={styles.s809}>Comprehensive payroll insights and business intelligence</p>
          </div>
          <nav style={styles.s810}>
            <a href="/dashboard" style={styles.s811}>
              Dashboard
            </a>
            <a href="/dashboard/employees" style={styles.s811}>
              Employees
            </a>
            <a href="/dashboard/payroll" style={styles.s811}>
              Payroll
            </a>
          </nav>
        </div>

        {/* Report Controls */}
        <div style={styles.s812}>
          <div style={styles.s813}>
            <h2 style={styles.s814}>Report Period</h2>
            <div style={styles.s815}>
              <select value={selectedPeriod} onChange={handlePeriodChange} style={styles.s816}>
                <option value="3_months">Last 3 Months</option>
                <option value="6_months">Last 6 Months</option>
                <option value="12_months">Last 12 Months</option>
                <option value="ytd">Year to Date</option>
              </select>
              <button onClick={handleExport} style={styles.s817}>
                📊 Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div style={styles.s818}>
          <div style={styles.s819}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "32px", marginRight: "12px" }}>📈</div>
              <div>
                <h3 style={styles.s820}>Total Gross Pay</h3>
                <p style={styles.s821}>{formatCurrency(reportData.payrollSummary.totalGrossPay)}</p>
                <div style={{ display: "flex", alignItems: "center", fontSize: "12px", color: "#10b981" }}>
                  <span style={{ marginRight: "4px" }}>↗</span>
                  <span>+{reportData.payrollSummary.trend}% vs last period</span>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.s819}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "32px", marginRight: "12px" }}>🏛️</div>
              <div>
                <h3 style={styles.s820}>Tax & NI Deducted</h3>
                <p style={styles.s822}>
                  {formatCurrency(reportData.payrollSummary.totalTax + reportData.payrollSummary.totalNI)}
                </p>
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  Tax: {formatCurrency(reportData.payrollSummary.totalTax)} | NI:{" "}
                  {formatCurrency(reportData.payrollSummary.totalNI)}
                </p>
              </div>
            </div>
          </div>

          <div style={styles.s819}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "32px", marginRight: "12px" }}>👥</div>
              <div>
                <h3 style={styles.s820}>Total Employees</h3>
                <p style={styles.s823}>{reportData.payrollSummary.employeeCount}</p>
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  Avg Salary: {formatCurrency(reportData.payrollSummary.averageSalary)}
                </p>
              </div>
            </div>
          </div>

          <div style={styles.s819}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "32px", marginRight: "12px" }}>💸</div>
              <div>
                <h3 style={styles.s820}>Total Net Pay</h3>
                <p style={styles.s821}>{formatCurrency(reportData.payrollSummary.totalNetPay)}</p>
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>After all deductions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Department Breakdown */}
        <div style={styles.s824}>
          <div style={styles.s825}>
            <h2 style={styles.s826}>Department Breakdown</h2>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={styles.s827}>
              <thead>
                <tr>
                  <th style={styles.s828}>Department</th>
                  <th style={styles.s828}>Employees</th>
                  <th style={styles.s828}>Total Cost</th>
                  <th style={styles.s828}>Average Salary</th>
                </tr>
              </thead>
              <tbody>
                {reportData.departmentBreakdown.map((dept, index) => (
                  <tr key={index}>
                    <td style={styles.s829}>
                      <div style={styles.s830}>{dept.department}</div>
                    </td>
                    <td style={styles.s829}>
                      <span style={styles.s831}>{dept.employeeCount}</span>
                    </td>
                    <td style={styles.s829}>
                      <span style={styles.s832}>{formatCurrency(dept.totalCost)}</span>
                    </td>
                    <td style={styles.s829}>
                      <span style={styles.s833}>{formatCurrency(dept.averageSalary)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Trends */}
        <div style={styles.s824}>
          <div style={styles.s825}>
            <h2 style={styles.s826}>Monthly Payroll Trends</h2>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={styles.s827}>
              <thead>
                <tr>
                  <th style={styles.s834}>Month</th>
                  <th style={styles.s835}>Gross Pay</th>
                  <th style={styles.s836}>Tax Deducted</th>
                  <th style={styles.s837}>NI Deducted</th>
                  <th style={styles.s838}>Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {reportData.monthlyTrends.map((month, index) => (
                  <tr key={index}>
                    <td style={styles.s829}>
                      <div style={styles.s830}>{month.month}</div>
                    </td>
                    <td style={styles.s829}>
                      <span style={styles.s832}>{formatCurrency(month.grossPay)}</span>
                    </td>
                    <td style={styles.s829}>
                      <span style={styles.s839}>{formatCurrency(month.tax)}</span>
                    </td>
                    <td style={styles.s829}>
                      <span style={styles.s839}>{formatCurrency(month.ni)}</span>
                    </td>
                    <td style={styles.s829}>
                      <span style={styles.s832}>{formatCurrency(month.netPay)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Report Actions */}
        <div style={styles.s840}>
          <h3 style={styles.s841}>Available Reports</h3>

          <div style={styles.s842}>
            <button onClick={handleExport} style={styles.s843}>
              📊 Payroll Summary Report
            </button>
            <button onClick={handleExport} style={styles.s843}>
              👥 Employee Details Report
            </button>
            <button onClick={handleExport} style={styles.s843}>
              🏛️ Tax & NI Report
            </button>
            <button onClick={handleExport} style={styles.s843}>
              📈 Monthly Trends Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inline styles mapped from numeric placeholders */
const styles: Record<string, React.CSSProperties> = {
  s804: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    background: "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
    minHeight: "100vh",
    padding: "40px 20px",
  },
  s805: {
    maxWidth: "1200px",
    margin: "0 auto",
    textAlign: "center",
    paddingTop: "100px",
  },
  s806: { maxWidth: "1200px", margin: "0 auto" },
  s807: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    padding: "20px 40px",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
    marginBottom: "30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  s808: { fontSize: "28px", fontWeight: "bold", color: "#1f2937", margin: 0 },
  s809: { color: "#6b7280", margin: "8px 0 0 0" },
  s810: { display: "flex", gap: "24px" },
  s811: {
    color: "#000000",
    textDecoration: "none",
    fontWeight: "bold",
    padding: "8px 16px",
    borderRadius: "6px",
    backgroundColor: "#10b981",
    border: "1px solid #059669",
  },

  // Controls
  s812: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "20px 24px",
    marginBottom: "24px",
  },
  s813: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  s814: { fontSize: "18px", fontWeight: 700, color: "#1f2937", margin: 0 },
  s815: { display: "flex", gap: "16px", alignItems: "center" },
  s816: {
    padding: "10px 12px",
    border: "2px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
  },
  s817: {
    padding: "10px 16px",
    backgroundColor: "#10b981",
    color: "#000000",
    border: "1px solid #059669",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
  },

  // Key metrics
  s818: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  s819: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  s820: { fontSize: "14px", fontWeight: 500, color: "#6b7280", margin: "0 0 8px 0" },
  s821: { fontSize: "24px", fontWeight: "bold", color: "#10b981", margin: 0 },
  s822: { fontSize: "24px", fontWeight: "bold", color: "#dc2626", margin: 0 },
  s823: { fontSize: "24px", fontWeight: "bold", color: "#1f2937", margin: 0 },

  // Tables / sections
  s824: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "20px 24px",
    marginTop: "20px",
  },
  s825: { marginBottom: "8px" },
  s826: { fontSize: "18px", fontWeight: 700, color: "#1f2937", margin: 0 },
  s827: { width: "100%", borderCollapse: "collapse" },
  s828: {
    backgroundColor: "#f8fafc",
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: 600,
    color: "#374151",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  s829: { padding: "12px 16px", borderBottom: "1px solid #f1f5f9" },
  s830: { color: "#1f2937", fontWeight: 600 },
  s831: { color: "#1f2937", fontWeight: 600 },
  s832: { color: "#059669", fontWeight: 600 },
  s833: { color: "#374151", fontWeight: 600 },

  // Monthly table headers (same style as s828, split for clarity)
  s834: {
    backgroundColor: "#f8fafc",
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: 600,
    color: "#374151",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  s835: {
    backgroundColor: "#f8fafc",
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: 600,
    color: "#374151",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  s836: {
    backgroundColor: "#f8fafc",
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: 600,
    color: "#374151",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  s837: {
    backgroundColor: "#f8fafc",
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: 600,
    color: "#374151",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  s838: {
    backgroundColor: "#f8fafc",
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: 600,
    color: "#374151",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  s839: { color: "#dc2626", fontWeight: 600 },

  // Actions
  s840: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "20px 24px",
    marginTop: "20px",
  },
  s841: { fontSize: "16px", fontWeight: 600, color: "#1f2937", margin: "0 0 12px 0" },
  s842: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },
  s843: {
    padding: "12px 16px",
    backgroundColor: "#10b981",
    color: "#000000",
    border: "1px solid #059669",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
  },
};
