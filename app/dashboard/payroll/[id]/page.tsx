"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type PayrollRun = {
  id: string;
  runNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  description: string;
  status: "draft" | "processing" | "completed" | "submitted";
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  totals?: {
    gross: number;
    net: number;
    tax: number;
    ni: number;
    pension: number;
  };
  employees: any[];
  createdBy: string;
  createdAt: string;
};

export default function PayrollRunDetailsPage() {
  const params = useParams<{ id: string }>();
  const payrollId = (params?.id as string) || "";
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
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
    statusButton: {
      backgroundColor: "#10b981",
      color: "#000000",
      padding: "12px 24px",
      borderRadius: "6px",
      textDecoration: "none",
      fontWeight: "bold",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
    } as const,
  };

  // ✅ Load payroll run from API
  useEffect(() => {
    const loadPayrollRun = async () => {
      try {
        if (!payrollId) return;
        const response = await fetch("/api/payroll");
        if (response.ok) {
          const allRuns: PayrollRun[] = await response.json();
          const foundRun = allRuns.find((run: PayrollRun) => run.id === payrollId) || null;
          setPayrollRun(foundRun);
        } else {
          console.error("❌ Failed to fetch payroll runs:", response.status);
        }
      } catch (error) {
        console.error("❌ Error loading payroll run:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadPayrollRun();
  }, [payrollId]);

  // Update payroll run status (local only)
  const updateStatus = async (newStatus: PayrollRun["status"]) => {
    if (payrollRun) {
      setPayrollRun({ ...payrollRun, status: newStatus });
      alert(`✅ Payroll run status updated to: ${newStatus.toUpperCase()}`);
    }
  };

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount || 0);

  const formatDateUK = (dateString: string): string =>
    new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const getStatusBadge = (status: PayrollRun["status"] | string) => {
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
        text = String(status);
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
          <p style={{ color: "#6b7280", margin: "16px 0" }}>
            Loading details for payroll run: {payrollId}
          </p>
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
            The payroll run with ID "{payrollId}" could not be found.
          </p>
          <a href="/dashboard/payroll" style={S.navLink}>
            ← Back to Payroll Dashboard
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
              {payrollRun.description || payrollRun.runNumber} - {payrollRun.employeeCount} employees
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
            </div>
          </div>
          <div style={S.summaryGrid}>
            <div>
              <label style={S.label}>Run Number</label>
              <p style={S.value}>{payrollRun.runNumber}</p>
            </div>
            <div>
              <label style={S.label}>Pay Period</label>
              <p style={S.value}>
                {formatDateUK(payrollRun.payPeriodStart)} - {formatDateUK(payrollRun.payPeriodEnd)}
              </p>
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
              <label style={S.label}>Created By</label>
              <p style={S.value}>{payrollRun.createdBy}</p>
            </div>
            <div>
              <label style={S.label}>Created Date</label>
              <p style={S.value}>{formatDateUK(payrollRun.createdAt)}</p>
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
              <p style={S.financeVal}>{formatCurrency(payrollRun.totalGrossPay)}</p>
            </div>
            <div style={S.financeItem}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🏛️</div>
              <h3 style={S.financeH3}>PAYE Tax</h3>
              <p style={S.financeValAlt}>{formatCurrency(payrollRun.totals?.tax || 0)}</p>
            </div>
            <div style={S.financeItem}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🏛️</div>
              <h3 style={S.financeH3}>National Insurance</h3>
              <p style={S.financeValAlt}>{formatCurrency(payrollRun.totals?.ni || 0)}</p>
            </div>
            <div style={S.financeItem}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>🏦</div>
              <h3 style={S.financeH3}>Pension Contributions</h3>
              <p style={S.financeValAlt}>{formatCurrency(payrollRun.totals?.pension || 0)}</p>
            </div>
            <div style={S.financeNet}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>💸</div>
              <h3 style={S.financeH3}>Total Net Pay</h3>
              <p style={S.financeVal}>{formatCurrency(payrollRun.totalNetPay)}</p>
            </div>
          </div>
        </div>

        {/* Employee Payroll Details */}
        <div style={S.tableCard}>
          <div style={{ marginBottom: "12px" }}>
            <h2 style={S.tableTitle}>Employee Payroll Details</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            {payrollRun.employees && payrollRun.employees.length > 0 ? (
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
                  {payrollRun.employees.map((employee: any, index: number) => (
                    <tr key={employee.id || index}>
                      <td style={S.td}>
                        <div>
                          <div style={S.empName}>
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div style={S.empMeta}>
                            {employee.employeeNumber} • Tax Code: {employee.taxCode || "1257L"}
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>
                        <span style={S.amount}>{formatCurrency(employee.grossPay || 0)}</span>
                      </td>
                      <td style={S.td}>
                        <span style={S.amountTax}>{formatCurrency(employee.taxDeduction || 0)}</span>
                      </td>
                      <td style={S.td}>
                        <span style={S.amountTax}>{formatCurrency(employee.niDeduction || 0)}</span>
                      </td>
                      <td style={S.td}>
                        <span style={S.amountPen}>{formatCurrency(employee.pensionDeduction || 0)}</span>
                      </td>
                      <td style={S.td}>
                        <span style={S.amountNet}>{formatCurrency(employee.netPay || 0)}</span>
                      </td>
                      <td style={S.td}>
                        <a
                          href={`/dashboard/employees/${employee.id}`}
                          style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 500 }}
                        >
                          View Employee
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={S.empty}>
                <p style={S.emptyText}>No employee details available for this payroll run.</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Update Actions */}
        <div style={S.summaryCard}>
          <h2 style={S.h2}>Payroll Actions</h2>
          <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {payrollRun.status === "draft" && (
              <>
                <button onClick={() => updateStatus("processing")} style={S.statusButton}>
                  🚀 Start Processing
                </button>
                <button
                  onClick={() => alert("Edit functionality coming soon!")}
                  style={{ ...S.statusButton, backgroundColor: "#3b82f6" }}
                >
                  ✏️ Edit Payroll Run
                </button>
              </>
            )}

            {payrollRun.status === "processing" && (
              <button onClick={() => updateStatus("completed")} style={S.statusButton}>
                ✅ Mark as Completed
              </button>
            )}

            {payrollRun.status === "completed" && (
              <button onClick={() => updateStatus("submitted")} style={S.statusButton}>
                📊 Submit RTI to HMRC
              </button>
            )}

            {payrollRun.status === "submitted" && (
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#f0fdf4",
                  borderRadius: "8px",
                  color: "#166534",
                }}
              >
                ✅ RTI has been submitted to HMRC
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={S.actions}>
          <a href="/dashboard/payroll" style={S.backLink}>
            ← Back to Payroll Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
