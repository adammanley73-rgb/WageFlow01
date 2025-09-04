"use client";
import { useState, useEffect } from "react";

type PayrollRun = {
  id: string;
  name: string;
  payPeriod: string;
  payDate: string;
  status: "draft" | "processing" | "completed" | "submitted";
  employeeCount: number;
  grossPay: number;
  netPay: number;
  rtiSubmitted: boolean;
  submittedDate?: string;
};

export default function PayrollDashboard() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [ytdStats, setYtdStats] = useState({
    totalGross: 0,
    totalTax: 0,
    totalNI: 0,
    totalPension: 0,
    totalNet: 0,
    payrollRuns: 0,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setPayrollRuns([
        {
          id: "pr-001",
          name: "Monthly Payroll - August 2025",
          payPeriod: "01/08/2025 - 31/08/2025",
          payDate: "31/08/2025",
          status: "completed",
          employeeCount: 5,
          grossPay: 18750.0,
          netPay: 14250.0,
          rtiSubmitted: true,
          submittedDate: "01/09/2025",
        },
        {
          id: "pr-002",
          name: "Monthly Payroll - July 2025",
          payPeriod: "01/07/2025 - 31/07/2025",
          payDate: "31/07/2025",
          status: "submitted",
          employeeCount: 5,
          grossPay: 18750.0,
          netPay: 14180.0,
          rtiSubmitted: true,
          submittedDate: "01/08/2025",
        },
        {
          id: "pr-003",
          name: "Monthly Payroll - June 2025",
          payPeriod: "01/06/2025 - 30/06/2025",
          payDate: "30/06/2025",
          status: "processing",
          employeeCount: 4,
          grossPay: 15000.0,
          netPay: 11400.0,
          rtiSubmitted: false,
        },
      ]);

      setYtdStats({
        totalGross: 225000,
        totalTax: 45000,
        totalNI: 27000,
        totalPension: 11250,
        totalNet: 171750,
        payrollRuns: 8,
      });

      setLoading(false);
    }, 1000);

    return () => clearTimeout(t);
  }, []);

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  const getStatusBadge = (status: PayrollRun["status"], rtiSubmitted?: boolean) => {
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
        text = rtiSubmitted ? "RTI Submitted" : "Completed";
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
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: 600,
          backgroundColor,
          color,
        }}
      >
        {text}
      </span>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background:
            "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
          minHeight: "100vh",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            textAlign: "center",
            paddingTop: "100px",
          }}
        >
          <h1 style={{ color: "#1f2937", margin: "0" }}>Loading Payroll Dashboard...</h1>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background:
          "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
        minHeight: "100vh",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Navigation Header */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            padding: "20px 40px",
            borderRadius: "12px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
            marginBottom: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#1f2937",
                margin: "0",
              }}
            >
              💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Payroll Dashboard
            </h1>
          </div>
          <nav style={{ display: "flex", gap: "24px" }}>
            <a
              href="/dashboard"
              style={{
                color: "#000000",
                textDecoration: "none",
                fontWeight: "bold",
                padding: "8px 16px",
                borderRadius: "6px",
                backgroundColor: "#10b981",
                border: "1px solid #059669",
              }}
            >
              Dashboard
            </a>
            <a
              href="/dashboard/employees"
              style={{
                color: "#000000",
                textDecoration: "none",
                fontWeight: "bold",
                padding: "8px 16px",
                borderRadius: "6px",
                backgroundColor: "#10b981",
                border: "1px solid #059669",
              }}
            >
              Employees
            </a>
          </nav>
        </div>

        {/* YTD Statistics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "24px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>📈</div>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#6b7280",
                margin: "0 0 8px 0",
              }}
            >
              YTD Gross Pay
            </h3>
            <p
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#10b981",
                margin: "0",
              }}
            >
              {formatCurrency(ytdStats.totalGross)}
            </p>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🏛️</div>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#6b7280",
                margin: "0 0 8px 0",
              }}
            >
              YTD Tax & NI
            </h3>
            <p
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#dc2626",
                margin: "0",
              }}
            >
              {formatCurrency(ytdStats.totalTax + ytdStats.totalNI)}
            </p>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>💸</div>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#6b7280",
                margin: "0 0 8px 0",
              }}
            >
              YTD Net Pay
            </h3>
            <p
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#1f2937",
                margin: "0",
              }}
            >
              {formatCurrency(ytdStats.totalNet)}
            </p>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>📋</div>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#6b7280",
                margin: "0 0 8px 0",
              }}
            >
              Payroll Runs
            </h3>
            <p
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#3b82f6",
                margin: "0",
              }}
            >
              {ytdStats.payrollRuns}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "12px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#1e293b",
                  margin: "0 0 4px 0",
                }}
              >
                Recent Payroll Runs
              </h2>
              <p style={{ color: "#64748b", margin: 0 }}>
                View and manage your payroll processing history
              </p>
            </div>
            <a
              href="/dashboard/payroll/new"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                backgroundColor: "#10b981",
                color: "#000000",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 600,
                border: "1px solid #059669",
              }}
            >
              £ New Payroll Run
            </a>
          </div>

          {/* Payroll Runs Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      backgroundColor: "#f8fafc",
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Payroll Period
                  </th>
                  <th
                    style={{
                      backgroundColor: "#f8fafc",
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Employees
                  </th>
                  <th
                    style={{
                      backgroundColor: "#f8fafc",
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Gross Pay
                  </th>
                  <th
                    style={{
                      backgroundColor: "#f8fafc",
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      backgroundColor: "#f8fafc",
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {payrollRuns.map((run) => (
                  <tr key={run.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "16px" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{run.name}</div>
                        <div style={{ color: "#64748b", fontSize: "14px" }}>{run.payPeriod}</div>
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{ fontWeight: 500, color: "#1e293b" }}>
                        {run.employeeCount}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{ fontWeight: 600, color: "#10b981" }}>
                        {formatCurrency(run.grossPay)}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      {getStatusBadge(run.status, run.rtiSubmitted)}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <a
                          href={`/dashboard/payroll/${run.id}`}
                          style={{
                            color: "#3b82f6",
                            textDecoration: "none",
                            fontSize: "14px",
                            fontWeight: 500,
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          View
                        </a>
                        {run.status === "draft" && (
                          <a
                            href={`/dashboard/payroll/${run.id}/edit`}
                            style={{
                              color: "#10b981",
                              textDecoration: "none",
                              fontSize: "14px",
                              fontWeight: 500,
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Edit
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {payrollRuns.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <p style={{ color: "#6b7280", fontSize: "16px", margin: "0 0 16px 0" }}>
                  No payroll runs found.
                </p>
                <a
                  href="/dashboard/payroll/new"
                  style={{
                    display: "inline-block",
                    padding: "12px 24px",
                    backgroundColor: "#10b981",
                    color: "#000000",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: 600,
                    border: "1px solid #059669",
                  }}
                >
                  £ Create Your First Payroll Run
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
