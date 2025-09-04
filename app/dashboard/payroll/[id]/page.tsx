"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DEMO_EMPLOYEES } from "../../../../lib/data/employees";

type PayrollRun = {
  id: string;
  name: string;
  payPeriod: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  status: "draft" | "processing" | "completed" | "submitted";
  employeeCount: number;
  grossPay: number;
  netPay: number;
  totalTax: number;
  totalNI: number;
  totalPension: number;
  createdDate: string;
  submittedDate?: string;
};

type PayrollEntry = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  grossPay: number;
  taxDeduction: number;
  niDeduction: number;
  pensionDeduction: number;
  netPay: number;
  taxCode: string;
};

export default function PayrollRunDetailsPage() {
  const params = useParams<{ id: string }>();
  const payrollId = params?.id as string;

  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const S = {
    page: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background:
        "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
      minHeight: "100vh",
      padding: "40px 20px",
    } as const,
    center: { maxWidth: "800px", margin: "0 auto", textAlign: "center" } as const,
    container: { maxWidth: "1000px", margin: "0 auto" } as const,
    headerCard: {
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
    } as const,
    title: { fontSize: "28px", fontWeight: "bold", color: "#1f2937", margin: 0 } as const,
    subtitle: { color: "#6b7280", margin: "8px 0 0 0" } as const,
    nav: { display: "flex", gap: "24px" } as const,
    navLink: {
      color: "#000000",
      textDecoration: "none",
      fontWeight: "bold",
      padding: "8px 16px",
      borderRadius: "6px",
      backgroundColor: "#10b981",
      border: "1px solid #059669",
    } as const,

    summaryCard: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",
      borderRadius: "12px",
      boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
      border: "1px solid rgba(255,255,255,0.2)",
      padding: "24px 32px",
      marginBottom: "24px",
    } as const,
    summaryHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
    } as const,
    h2: { fontSize: "20px", fontWeight: "bold", color: "#1f2937", margin: 0 } as const,
    rti: {
      fontSize: "12px",
      color: "#1f2937",
      backgroundColor: "#f1f5f9",
      padding: "4px 10px",
      borderRadius: "999px",
    } as const,
    summaryGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "16px",
    } as const,
    label: {
      display: "block",
      fontSize: "12px",
      fontWeight: 500,
      color: "#6b7280",
      marginBottom: "4px",
    } as const,
    value: { margin: 0, color: "#1f2937", fontSize: "16px" } as const,

    financeCard: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",
      borderRadius: "12px",
      boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
      border: "1px solid rgba(255,255,255,0.2)",
      padding: "24px 32px",
      marginBottom: "24px",
    } as const,
    financeHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" } as const,
    financeH2: { fontSize: "20px", fontWeight: "bold", color: "#1f2937", margin: 0 } as const,
    financeGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "16px",
    } as const,
    financeItem: {
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "16px",
    } as const,
    financeH3: { fontSize: "14px", fontWeight: 600, color: "#374151", margin: "4px 0 6px" } as const,
    financeVal: { fontSize: "18px", fontWeight: 700, margin: 0 } as const,
    financeValAlt: { fontSize: "18px", fontWeight: 700, margin: 0, color: "#1e3a8a" } as const,
    financeNet: {
      backgroundColor: "#ecfeff",
      border: "1px solid #bae6fd",
      borderRadius: "12px",
      padding: "16px",
    } as const,
    tableCard: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",
      borderRadius: "12px",
      boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
      border: "1px solid rgba(255,255,255,0.2)",
      padding: "24px 32px",
      marginBottom: "24px",
    } as const,
    tableTitle: { fontSize: "20px", fontWeight: "bold", color: "#1f2937", margin: 0 } as const,
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      minWidth: "800px",
      backgroundColor: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      overflow: "hidden",
    } as const,
    th: {
      textAlign: "left",
      fontSize: "12px",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      color: "#6b7280",
      padding: "12px 16px",
      backgroundColor: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
      whiteSpace: "nowrap",
    } as const,
    td: { padding: "12px 16px", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" } as const,
    empName: { fontWeight: 600, color: "#111827" } as const,
    empMeta: { fontSize: "12px", color: "#6b7280" } as const,
    amount: { fontWeight: 600, color: "#111827" } as const,
    amountTax: { fontWeight: 600, color: "#1f2937" } as const,
    amountPen: { fontWeight: 600, color: "#0f766e" } as const,
    amountNet: { fontWeight: 700, color: "#065f46" } as const,
    empty: {
      textAlign: "center",
      padding: "24px",
      backgroundColor: "#ffffff",
      border: "1px dashed #e5e7eb",
      borderRadius: "12px",
      marginTop: "12px",
    } as const,
    emptyText: { color: "#6b7280", margin: 0 } as const,
    actions: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "24px",
    } as const,
    backLink: {
      color: "#6b7280",
      textDecoration: "none",
      fontWeight: 500,
      padding: "8px 16px",
    } as const,
    editLink: {
      backgroundColor: "#10b981",
      color: "#000000",
      padding: "8px 16px",
      borderRadius: "6px",
      textDecoration: "none",
      fontWeight: "bold",
      border: "1px solid #059669",
    } as const,
  };

  useEffect(() => {
    console.log("Loading payroll run with ID:", payrollId);

    const timer = setTimeout(() => {
      const demoPayrollRuns: PayrollRun[] = [
        {
          id: "pr-001",
          name: "Monthly Payroll - September 2025",
          payPeriod: "01/09/2025 - 30/09/2025",
          payPeriodStart: "2025-09-01",
          payPeriodEnd: "2025-09-30",
          payDate: "2025-09-30",
          status: "completed",
          employeeCount: 4,
          grossPay: 10083.33,
          netPay: 7637.5,
          totalTax: 1505.0,
          totalNI: 890.0,
          totalPension: 504.17,
          createdDate: "2025-09-28",
          submittedDate: "2025-10-01",
        },
        {
          id: "pr-002",
          name: "Monthly Payroll - August 2025",
          payPeriod: "01/08/2025 - 31/08/2025",
          payPeriodStart: "2025-08-01",
          payPeriodEnd: "2025-08-31",
          payDate: "2025-08-31",
          status: "submitted",
          employeeCount: 3,
          grossPay: 8333.33,
          netPay: 6312.5,
          totalTax: 1270.0,
          totalNI: 750.83,
          totalPension: 416.67,
          createdDate: "2025-08-28",
          submittedDate: "2025-09-01",
        },
      ];

      const demoPayrollEntries: { [key: string]: PayrollEntry[] } = {
        "pr-001": [
          {
            employeeId: "EMP001",
            employeeName: "Sarah Johnson",
            employeeNumber: "EMP001",
            grossPay: 2916.67,
            taxDeduction: 450.0,
            niDeduction: 280.0,
            pensionDeduction: 145.83,
            netPay: 2040.84,
            taxCode: "1257L",
          },
          {
            employeeId: "EMP002",
            employeeName: "James Wilson",
            employeeNumber: "EMP002",
            grossPay: 2333.33,
            taxDeduction: 315.0,
            niDeduction: 200.0,
            pensionDeduction: 116.67,
            netPay: 1701.66,
            taxCode: "1257L",
          },
          {
            employeeId: "EMP003",
            employeeName: "Emma Brown",
            employeeNumber: "EMP003",
            grossPay: 1833.33,
            taxDeduction: 160.0,
            niDeduction: 120.0,
            pensionDeduction: 91.67,
            netPay: 1461.66,
            taxCode: "1257L",
          },
          {
            employeeId: "EMP004",
            employeeName: "Michael Davis",
            employeeNumber: "EMP004",
            grossPay: 3000.0,
            taxDeduction: 580.0,
            niDeduction: 290.0,
            pensionDeduction: 150.0,
            netPay: 1980.0,
            taxCode: "1257L",
          },
        ],
        "pr-002": [
          {
            employeeId: "EMP001",
            employeeName: "Sarah Johnson",
            employeeNumber: "EMP001",
            grossPay: 2916.67,
            taxDeduction: 440.0,
            niDeduction: 290.0,
            pensionDeduction: 145.83,
            netPay: 2040.84,
            taxCode: "1257L",
          },
          {
            employeeId: "EMP002",
            employeeName: "James Wilson",
            employeeNumber: "EMP002",
            grossPay: 2333.33,
            taxDeduction: 310.0,
            niDeduction: 210.0,
            pensionDeduction: 116.67,
            netPay: 1696.66,
            taxCode: "1257L",
          },
          {
            employeeId: "EMP003",
            employeeName: "Emma Brown",
            employeeNumber: "EMP003",
            grossPay: 3083.33,
            taxDeduction: 520.0,
            niDeduction: 250.83,
            pensionDeduction: 154.17,
            netPay: 2158.33,
            taxCode: "1257L",
          },
        ],
      };

      const foundPayrollRun = demoPayrollRuns.find((pr) => pr.id === payrollId);
      console.log("Found payroll run:", foundPayrollRun);

      setPayrollRun(foundPayrollRun || null);
      setPayrollEntries(foundPayrollRun ? demoPayrollEntries[foundPayrollRun.id] || [] : []);

      if (foundPayrollRun) {
        const entries = demoPayrollEntries[foundPayrollRun.id] || [];
        console.log("Payroll entries:", entries);
        console.log("Available employees:", DEMO_EMPLOYEES.map((e) => e.id));
        console.log("Entry employee IDs:", entries.map((e) => e.employeeId));
      }

      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [payrollId]);

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  const formatDateUK = (dateString: string): string =>
    new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const getStatusBadge = (status: string) => {
    let backgroundColor = "";
    let color = "";
    let text = "";

    switch (status) {
      case "draft":
        backgroundColor = "#fef3c7";
        color = "#92400e";
        text = "Draft";
        break;
      case "processing":
        backgroundColor = "#dbeafe";
        color = "#1e40af";
        text = "Processing";
        break;
      case "completed":
        backgroundColor = "#dcfce7";
        color = "#166534";
        text = "Completed";
        break;
      case "submitted":
        backgroundColor = "#f3e8ff";
        color = "#7c3aed";
        text = "RTI Submitted";
        break;
      default:
        backgroundColor = "#f3f4f6";
        color = "#374151";
        text = status;
    }

    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 12px",
          borderRadius: "999px",
          backgroundColor,
          color,
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        {text}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.center}>
          <h1 style={{ color: "#1f2937", margin: 0 }}>Loading Payroll Run...</h1>
        </div>
      </div>
    );
  }

  if (!payrollRun) {
    return (
      <div style={S.page}>
        <div style={S.center}>
          <h1 style={{ color: "#1f2937", margin: 0 }}>Payroll Run Not Found</h1>
          <p style={{ color: "#6b7280", margin: "16px 0" }}>
            The payroll run you're looking for could not be found.
          </p>
          <a href="/dashboard/payroll" style={S.navLink}>
            ← Back to Payroll
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Navigation Header */}
        <div style={S.headerCard}>
          <div>
            <h1 style={S.title}>
              💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Payroll Run Details
            </h1>
            <p style={S.subtitle}>
              {payrollRun.name} - {payrollEntries.length} employees
            </p>
          </div>
          <nav style={S.nav}>
            <a href="/dashboard" style={S.navLink}>
              Dashboard
            </a>
            <a href="/dashboard/payroll" style={S.navLink}>
              ← Back to Payroll
            </a>
          </nav>
        </div>

        {/* Payroll Run Summary */}
        <div style={S.summaryCard}>
          <div style={S.summaryHeader}>
            <h2 style={S.h2}>Payroll Run Summary</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {getStatusBadge(payrollRun.status)}
              {payrollRun.submittedDate && (
                <span style={S.rti}>RTI Submitted: {formatDateUK(payrollRun.submittedDate)}</span>
              )}
            </div>
          </div>

          <div style={S.summaryGrid}>
            <div>
              <label style={S.label}>Pay Period</label>
              <p style={S.value}>{payrollRun.payPeriod}</p>
            </div>

            <div>
              <label style={S.label}>Pay Date</label>
              <p style={S.value}>{formatDateUK(payrollRun.payDate)}</p>
            </div>

            <div>
              <label style={S.label}>Employees</label>
              <p style={{ ...S.value, fontWeight: 700 }}>{payrollRun.employeeCount}</p>
            </div>

            <div>
              <label style={S.label}>Created Date</label>
              <p style={S.value}>{formatDateUK(payrollRun.createdDate)}</p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div style={S.financeCard}>
          <div style={S.financeHeader}>
            <div style={{ fontSize: "20px" }}>📊</div>
            <h2 style={S.financeH2}>Financial Summary</h2>
          </div>

          <div style={S.financeGrid}>
            <div style={S.financeItem}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>💰</div>
              <h3 style={S.financeH3}>Total Gross Pay</h3>
              <p style={S.financeVal}>{formatCurrency(payrollRun.grossPay)}</p>
            </div>

            <div style={S.financeItem}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🏛️</div>
              <h3 style={S.financeH3}>PAYE Tax</h3>
              <p style={S.financeValAlt}>{formatCurrency(payrollRun.totalTax)}</p>
            </div>

            <div style={S.financeItem}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🏛️</div>
              <h3 style={S.financeH3}>National Insurance</h3>
              <p style={S.financeValAlt}>{formatCurrency(payrollRun.totalNI)}</p>
            </div>

            <div style={S.financeItem}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🏦</div>
              <h3 style={S.financeH3}>Pension Contributions</h3>
              <p style={S.financeValAlt}>{formatCurrency(payrollRun.totalPension)}</p>
            </div>

            <div style={S.financeNet}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>💸</div>
              <h3 style={S.financeH3}>Total Net Pay</h3>
              <p style={S.financeVal}>{formatCurrency(payrollRun.netPay)}</p>
            </div>
          </div>
        </div>

        {/* Employee Payroll Details */}
        <div style={S.tableCard}>
          <div style={{ marginBottom: "12px" }}>
            <h2 style={S.tableTitle}>Employee Payroll Details</h2>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Employee</th>
                  <th style={S.th}>Gross Pay</th>
                  <th style={S.th}>PAYE Tax</th>
                  <th style={S.th}>National Insurance</th>
                  <th style={S.th}>Pension</th>
                  <th style={S.th}>Net Pay</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrollEntries.map((entry) => (
                  <tr key={entry.employeeId}>
                    <td style={S.td}>
                      <div>
                        <div style={S.empName}>{entry.employeeName}</div>
                        <div style={S.empMeta}>
                          {entry.employeeNumber} • Tax Code: {entry.taxCode}
                        </div>
                      </div>
                    </td>
                    <td style={S.td}>
                      <span style={S.amount}>{formatCurrency(entry.grossPay)}</span>
                    </td>
                    <td style={S.td}>
                      <span style={S.amountTax}>{formatCurrency(entry.taxDeduction)}</span>
                    </td>
                    <td style={S.td}>
                      <span style={S.amountTax}>{formatCurrency(entry.niDeduction)}</span>
                    </td>
                    <td style={S.td}>
                      <span style={S.amountPen}>{formatCurrency(entry.pensionDeduction)}</span>
                    </td>
                    <td style={S.td}>
                      <span style={S.amountNet}>{formatCurrency(entry.netPay)}</span>
                    </td>
                    <td style={S.td}>
                      <a
                        href={`/dashboard/employees/${entry.employeeId}`}
                        style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 500 }}
                      >
                        View Employee
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {payrollEntries.length === 0 && (
              <div style={S.empty}>
                <p style={S.emptyText}>No payroll entries found for this run.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={S.actions}>
          <a href="/dashboard/payroll" style={S.backLink}>
            ← Back to Payroll
          </a>
          {payrollRun.status === "draft" && (
            <a href={`/dashboard/payroll/${payrollRun.id}/edit`} style={S.editLink}>
              ✏️ Edit Payroll Run
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
