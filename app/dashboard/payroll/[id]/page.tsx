"use client";
import type React from "react";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PayslipGenerator, type PayslipData } from "../../../../lib/services/payslip-generator";

type PayrollRun = {
  id: string;
  runNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  description: string;
  status: string;
  totalGrossPay: number;
  totalNetPay: number;
  employeeCount: number;
  createdBy: string;
  createdAt: string;
  payFrequency?: string;
  entries?: PayrollEntry[];
};

type PayrollEntry = {
  employeeId: string;
  employee: {
    name: string;
    employeeNumber: string;
    email: string;
  };
  earnings: {
    basicPay: number;
    overtime: number;
    bonus: number;
    gross: number;
  };
  deductions: {
    incomeTax: number;
    nationalInsurance: number;
    pensionEmployee: number;
    total: number;
  };
  netPay: number;
  payFrequency?: string;
};

export default function PayrollRunDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const payrollRunId = params?.id as string;
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPayslips, setGeneratingPayslips] = useState(false);
  const [generatingBulk, setGeneratingBulk] = useState(false);

  useEffect(() => {
    const loadPayrollRun = async () => {
      try {
        const response = await fetch("/api/payroll");
        if (response.ok) {
          const allRuns = await response.json();
          const foundRun = allRuns.find((run: PayrollRun) => run.id === payrollRunId);
          if (foundRun) setPayrollRun(foundRun);
        }
      } catch (error) {
        console.error("❌ Failed to load payroll run:", error);
      } finally {
        setLoading(false);
      }
    };
    if (payrollRunId) {
      void loadPayrollRun();
    }
  }, [payrollRunId]);

  // Generate individual payslip
  const generateIndividualPayslip = async (entry: PayrollEntry) => {
    try {
      setGeneratingPayslips(true);
      const payslipData: PayslipData = {
        employee: {
          name: entry.employee.name,
          employeeNumber: entry.employee.employeeNumber,
          email: entry.employee.email,
          address: "Employee Address\nLine 2\nCity, Postcode",
          niNumber: "AB123456C",
        },
        company: {
          name: "Your Company Ltd",
          address: "Company House\n123 Business Street\nLondon, SW1A 1AA",
          payeRef: "123/AB12345",
        },
        payPeriod: {
          startDate: payrollRun!.payPeriodStart,
          endDate: payrollRun!.payPeriodEnd,
          payDate: payrollRun!.payDate,
          frequency: payrollRun!.payFrequency || "monthly",
        },
        earnings: entry.earnings,
        deductions: entry.deductions,
        netPay: entry.netPay,
        yearToDate: {
          grossPay: entry.earnings.gross * 6,
          incomeTax: entry.deductions.incomeTax * 6,
          nationalInsurance: entry.deductions.nationalInsurance * 6,
          pensionEmployee: entry.deductions.pensionEmployee * 6,
          netPay: entry.netPay * 6,
        },
        payslipNumber: `${payrollRun!.runNumber}-${entry.employee.employeeNumber}`,
        taxCode: "1257L",
      };
      const pdf = PayslipGenerator.generatePayslip(payslipData);
      pdf.save(`payslip_${entry.employee.employeeNumber}_${payrollRun!.runNumber}.pdf`);
    } catch (error) {
      console.error("❌ Failed to generate payslip:", error);
      alert("Failed to generate payslip. Please try again.");
    } finally {
      setGeneratingPayslips(false);
    }
  };

  // Generate bulk payslips
  const generateBulkPayslips = async () => {
    if (!payrollRun?.entries || payrollRun.entries.length === 0) {
      alert("No employee entries found for this payroll run.");
      return;
    }
    try {
      setGeneratingBulk(true);
      const allPayslipData: PayslipData[] = payrollRun.entries.map((entry) => ({
        employee: {
          name: entry.employee.name,
          employeeNumber: entry.employee.employeeNumber,
          email: entry.employee.email,
          address: "Employee Address\nLine 2\nCity, Postcode",
          niNumber: "AB123456C",
        },
        company: {
          name: "Your Company Ltd",
          address: "Company House\n123 Business Street\nLondon, SW1A 1AA",
          payeRef: "123/AB12345",
        },
        payPeriod: {
          startDate: payrollRun.payPeriodStart,
          endDate: payrollRun.payPeriodEnd,
          payDate: payrollRun.payDate,
          frequency: payrollRun.payFrequency || "monthly",
        },
        earnings: entry.earnings,
        deductions: entry.deductions,
        netPay: entry.netPay,
        yearToDate: {
          grossPay: entry.earnings.gross * 6,
          incomeTax: entry.deductions.incomeTax * 6,
          nationalInsurance: entry.deductions.nationalInsurance * 6,
          pensionEmployee: entry.deductions.pensionEmployee * 6,
          netPay: entry.netPay * 6,
        },
        payslipNumber: `${payrollRun.runNumber}-${entry.employee.employeeNumber}`,
        taxCode: "1257L",
      }));
      const zipBlob = await PayslipGenerator.generateBulkPayslips(allPayslipData);
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payslips_${payrollRun.runNumber}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
      alert(
        `✅ Generated ${allPayslipData.length} payslips!\n\nDownloaded as: payslips_${payrollRun.runNumber}.zip`
      );
    } catch (error) {
      console.error("❌ Failed to generate bulk payslips:", error);
      alert("Failed to generate bulk payslips. Please try again.");
    } finally {
      setGeneratingBulk(false);
    }
  };

  // Format helpers
  const formatCurrency = (amount: number) => `£${(amount ?? 0).toFixed(2)}`;
  const formatDate = (dateStr: string) => {
    try {
      if (!dateStr) return "N/A";
      const date = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00.000Z`);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, React.CSSProperties> = {
      draft: { backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fbbf24" },
      processing: { backgroundColor: "#dbeafe", color: "#1e40af", border: "1px solid #60a5fa" },
      completed: { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #22c55e" },
      submitted: { backgroundColor: "#f3e8ff", color: "#7c3aed", border: "1px solid #a855f7" },
    };
    return (
      <span
        style={{
          padding: "4px 12px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 600,
          textTransform: "capitalize",
          ...(statusStyles[status] || statusStyles.draft),
        }}
      >
        {status}
      </span>
    );
  };

  const styles = {
    container: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
      minHeight: "100vh",
      padding: "40px 20px",
    } as React.CSSProperties,
    maxWidth: { maxWidth: "1200px", margin: "0 auto" } as React.CSSProperties,
    card: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",
      padding: "32px",
      borderRadius: "12px",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
      marginBottom: "24px",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    } as React.CSSProperties,
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "32px",
    } as React.CSSProperties,
    title: { fontSize: "28px", fontWeight: "bold", color: "#1f2937", margin: "0 0 8px 0" } as React.CSSProperties,
    subtitle: { fontSize: "16px", color: "#6b7280", margin: 0 } as React.CSSProperties,
    backButton: {
      padding: "12px 24px",
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      color: "#3b82f6",
      textDecoration: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: 600,
      border: "1px solid #3b82f6",
      cursor: "pointer",
    } as React.CSSProperties,
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "24px",
      marginBottom: "32px",
    } as React.CSSProperties,
    statCard: {
      padding: "20px",
      backgroundColor: "#f8fafc",
      borderRadius: "8px",
      border: "1px solid #e2e8f0",
    } as React.CSSProperties,
    statLabel: { fontSize: "14px", fontWeight: 600, color: "#64748b", marginBottom: "8px" } as React.CSSProperties,
    statValue: { fontSize: "20px", fontWeight: "bold", color: "#1e293b" } as React.CSSProperties,
    sectionTitle: { fontSize: "20px", fontWeight: "bold", color: "#1f2937", marginBottom: "16px" } as React.CSSProperties,
    table: { width: "100%", borderCollapse: "collapse" as const, marginTop: "16px" },
    th: {
      backgroundColor: "#f9fafb",
      padding: "12px",
      textAlign: "left" as const,
      fontSize: "14px",
      fontWeight: 600,
      color: "#374151",
      borderBottom: "1px solid #e5e7eb",
    } as React.CSSProperties,
    td: {
      padding: "12px",
      borderBottom: "1px solid #e5e7eb",
      fontSize: "14px",
      color: "#1f2937",
    } as React.CSSProperties,
    loading: { textAlign: "center" as const, padding: "80px 20px", fontSize: "18px", color: "white" } as React.CSSProperties,
    noData: { textAlign: "center" as const, padding: "80px 20px", fontSize: "18px", color: "white" } as React.CSSProperties,
    actionButton: {
      padding: "8px 16px",
      backgroundColor: "#10b981",
      color: "white",
      border: "none",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
      marginRight: "8px",
      marginBottom: "8px",
    } as React.CSSProperties,
    actionButtonSecondary: {
      padding: "8px 16px",
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      color: "#3b82f6",
      border: "1px solid #3b82f6",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
      marginRight: "8px",
      marginBottom: "8px",
    } as React.CSSProperties,
    bulkActionButton: {
      padding: "12px 24px",
      backgroundColor: "#10b981",
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: 600,
      cursor: "pointer",
      marginRight: "16px",
      marginBottom: "16px",
    } as React.CSSProperties,
    bulkActionButtonSecondary: {
      padding: "12px 24px",
      backgroundColor: "rgba(168, 85, 247, 0.1)",
      color: "#7c3aed",
      border: "1px solid #7c3aed",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: 600,
      cursor: "pointer",
      marginRight: "16px",
      marginBottom: "16px",
    } as React.CSSProperties,
    disabledButton: { opacity: 0.6, cursor: "not-allowed" } as React.CSSProperties,
    brand: { color: "#3b82f6" } as React.CSSProperties,
    amountGross: { fontSize: "20px", fontWeight: "bold", color: "#1e293b" } as React.CSSProperties,
    amountDeduction: { fontSize: "20px", fontWeight: "bold", color: "#dc2626" } as React.CSSProperties,
    amountNet: { fontSize: "20px", fontWeight: "bold", color: "#3b82f6" } as React.CSSProperties,
    actionsRow: { display: "flex", flexWrap: "wrap", alignItems: "center" } as React.CSSProperties,
    infoMuted: { fontSize: "12px", color: "#6b7280" } as React.CSSProperties,
    employeeSub: { fontSize: "12px", color: "#6b7280" } as React.CSSProperties,
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.loading}>🔄 Loading Payroll Run Details...</div>
        </div>
      </div>
    );
  }

  if (!payrollRun) {
    return (
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.noData}>
            <h1>❌ Payroll Run Not Found</h1>
            <p>The payroll run with ID "{payrollRunId}" could not be found.</p>
            <button onClick={() => router.push("/dashboard/payroll")} style={styles.backButton}>
              ← Back to Payroll
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.card}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>
                💼 <span style={styles.brand}>WageFlow</span> Payroll Run Details
              </h1>
              <p style={styles.subtitle}>
                {payrollRun.runNumber} - {payrollRun.description}
              </p>
            </div>
            <button onClick={() => router.push("/dashboard/payroll")} style={styles.backButton}>
              ← Back to Payroll
            </button>
          </div>
          {/* Status and Key Info */}
          <div style={styles.grid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Status</div>
              <div>{getStatusBadge(payrollRun.status)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Pay Frequency</div>
              <div style={styles.statValue}>{payrollRun.payFrequency?.toUpperCase() || "MONTHLY"}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Employee Count</div>
              <div style={styles.statValue}>{payrollRun.employeeCount}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Created By</div>
              <div style={styles.statValue}>{payrollRun.createdBy}</div>
            </div>
          </div>
          {/* Pay Period Information */}
          <div style={styles.grid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Pay Period Start</div>
              <div style={styles.statValue}>{formatDate(payrollRun.payPeriodStart)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Pay Period End</div>
              <div style={styles.statValue}>{formatDate(payrollRun.payPeriodEnd)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Payment Date</div>
              <div style={styles.statValue}>{formatDate(payrollRun.payDate)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Created</div>
              <div style={styles.statValue}>{formatDate(payrollRun.createdAt)}</div>
            </div>
          </div>
          {/* Financial Summary */}
          <div style={styles.grid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Gross Pay</div>
              <div style={styles.amountGross}>{formatCurrency(payrollRun.totalGrossPay)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Deductions</div>
              <div style={styles.amountDeduction}>
                {formatCurrency(payrollRun.totalGrossPay - payrollRun.totalNetPay)}
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Net Pay</div>
              <div style={styles.amountNet}>{formatCurrency(payrollRun.totalNetPay)}</div>
            </div>
          </div>
        </div>
        {/* Payslip Actions */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>📄 Payslip Generation</h2>
          <div style={styles.actionsRow}>
            <button
              onClick={generateBulkPayslips}
              disabled={generatingBulk || !payrollRun.entries || payrollRun.entries.length === 0}
              style={{
                ...styles.bulkActionButton,
                ...(generatingBulk || !payrollRun.entries || payrollRun.entries.length === 0
                  ? styles.disabledButton
                  : {}),
              }}
            >
              {generatingBulk ? "🔄 Generating..." : "📦 Download All Payslips (ZIP)"}
            </button>
            <button
              onClick={() => alert("Email distribution feature coming soon!")}
              style={styles.bulkActionButtonSecondary}
            >
              📧 Email All Payslips
            </button>
          </div>
          {!payrollRun.entries || payrollRun.entries.length === 0 ? (
            <p style={styles.infoMuted}>
              ℹ️ No employee entries available for payslip generation. This may be an older payroll
              run format.
            </p>
          ) : (
            <p style={styles.infoMuted}>
              Generate and download professional UK-compliant payslips for {payrollRun.entries.length} employees.
            </p>
          )}
        </div>
        {/* Employee Details */}
        {payrollRun.entries && payrollRun.entries.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Employee Breakdown & Individual Payslips</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Basic Pay</th>
                    <th style={styles.th}>Overtime</th>
                    <th style={styles.th}>Bonus</th>
                    <th style={styles.th}>Gross Pay</th>
                    <th style={styles.th}>Tax</th>
                    <th style={styles.th}>NI</th>
                    <th style={styles.th}>Pension</th>
                    <th style={styles.th}>Net Pay</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRun.entries.map((entry, index) => (
                    <tr key={index}>
                      <td style={styles.td}>
                        <div>
                          <strong>{entry.employee.name}</strong>
                          <div style={styles.employeeSub}>{entry.employee.employeeNumber}</div>
                        </div>
                      </td>
                      <td style={styles.td}>{formatCurrency(entry.earnings.basicPay)}</td>
                      <td style={styles.td}>{formatCurrency(entry.earnings.overtime)}</td>
                      <td style={styles.td}>{formatCurrency(entry.earnings.bonus)}</td>
                      <td style={styles.td}>
                        <strong>{formatCurrency(entry.earnings.gross)}</strong>
                      </td>
                      <td style={styles.td}>-{formatCurrency(entry.deductions.incomeTax)}</td>
                      <td style={styles.td}>-{formatCurrency(entry.deductions.nationalInsurance)}</td>
                      <td style={styles.td}>-{formatCurrency(entry.deductions.pensionEmployee)}</td>
                      <td style={styles.td}>
                        <strong>{formatCurrency(entry.netPay)}</strong>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => generateIndividualPayslip(entry)}
                          disabled={generatingPayslips}
                          style={{
                            ...styles.actionButton,
                            ...(generatingPayslips ? styles.disabledButton : {}),
                          }}
                        >
                          📄 PDF
                        </button>
                        <button
                          onClick={() => alert("Email payslip feature coming soon!")}
                          style={styles.actionButtonSecondary}
                        >
                          📧 Email
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Other Actions */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Additional Actions</h2>
          <div style={styles.actionsRow}>
            <button
              onClick={() => alert("Export Data feature coming soon!")}
              style={styles.bulkActionButtonSecondary}
            >
              📊 Export Data
            </button>
            <button
              onClick={() => alert("Process Payment feature coming soon!")}
              style={styles.bulkActionButton}
            >
              💰 Process Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
