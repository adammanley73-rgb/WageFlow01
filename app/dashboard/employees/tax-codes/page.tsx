"use client";
import { useState, useEffect } from "react";
import { DEMO_EMPLOYEES, type Employee } from "../../../../lib/data/employees";

interface TaxCodeOption {
  code: string;
  description: string;
  category: string;
}

interface TaxComparison {
  currentCode: string;
  newCode: string;
  currentMonthlyTax: number;
  newMonthlyTax: number;
  monthlyDifference: number;
  annualDifference: number;
  monthlySalary: number;
  isKCode: boolean;
  kCodeWarning: string | null;
}

export default function TaxCodesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [newTaxCode, setNewTaxCode] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [notes, setNotes] = useState("");
  const [taxComparison, setTaxComparison] = useState<TaxComparison | null>(null);

  const taxCodeOptions: TaxCodeOption[] = [
    // Standard Codes
    { code: "1257L", description: "Standard personal allowance", category: "Standard Codes" },
    { code: "1100L", description: "Reduced personal allowance", category: "Standard Codes" },
    { code: "1000L", description: "Further reduced allowance", category: "Standard Codes" },

    // Emergency Codes
    { code: "BR", description: "Basic rate (20%) on all income", category: "Emergency Codes" },
    { code: "D0", description: "Higher rate (40%) on all income", category: "Emergency Codes" },
    { code: "D1", description: "Additional rate (45%) on all income", category: "Emergency Codes" },
    { code: "0T", description: "No personal allowance", category: "Emergency Codes" },
    { code: "NT", description: "No tax deduction", category: "Emergency Codes" },

    // Scottish Codes
    { code: "S1257L", description: "Scottish standard rate", category: "Scottish Codes" },
    { code: "S1100L", description: "Scottish reduced allowance", category: "Scottish Codes" },

    // K Codes
    { code: "K497", description: "Negative allowance (benefits exceed allowance)", category: "K Codes" },
    { code: "K500", description: "Higher negative allowance", category: "K Codes" },
    { code: "K600", description: "Substantial negative allowance", category: "K Codes" },

    // Other Codes
    { code: "T", description: "Other items affecting allowance", category: "Other Codes" },
  ];

  useEffect(() => {
    setEmployees(DEMO_EMPLOYEES);
    setEffectiveDate(new Date().toISOString().split("T")[0]);
  }, []);

  const formatCurrencyUK = (amount: number): string =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const calculateTaxImpact = () => {
    if (!selectedEmployee || !newTaxCode) return;

    const employee = employees.find((emp) => emp.id === selectedEmployee);
    if (!employee) return;

    const monthlySalary = employee.annualSalary / 12;

    // Current tax calculation (simplified)
    const currentMonthlyTax = calculateMonthlyTax(employee.annualSalary, "1257L"); // Assume current code
    const newMonthlyTax = calculateMonthlyTax(employee.annualSalary, newTaxCode);

    const monthlyDifference = newMonthlyTax - currentMonthlyTax;
    const annualDifference = monthlyDifference * 12;

    const isKCode = newTaxCode.startsWith("K");
    const kCodeWarning = isKCode
      ? "K codes indicate benefits exceed personal allowance. Additional tax may apply."
      : null;

    setTaxComparison({
      currentCode: "1257L",
      newCode: newTaxCode,
      currentMonthlyTax,
      newMonthlyTax,
      monthlyDifference,
      annualDifference,
      monthlySalary,
      isKCode,
      kCodeWarning,
    });
  };

  const calculateMonthlyTax = (annualSalary: number, taxCode: string): number => {
    // Simplified UK tax calculation for demo
    const code = taxCode.toUpperCase();

    if (code === "BR") return (annualSalary * 0.2) / 12;
    if (code === "D0") return (annualSalary * 0.4) / 12;
    if (code === "D1") return (annualSalary * 0.45) / 12;
    if (code === "0T") return (annualSalary * 0.2) / 12;
    if (code === "NT") return 0;

    // Handle K codes (negative allowance), Scottish prefixes, and numeric codes like 1257L
    let personalAllowance = 12570;

    // Extract digits anywhere in the code
    const digits = code.match(/(\d+)/);
    if (digits) {
      const value = parseInt(digits[1], 10) * 10;
      if (code.startsWith("K")) {
        personalAllowance = -value; // negative allowance
      } else {
        personalAllowance = value;
      }
    } else if (code === "T") {
      personalAllowance = 12570;
    }

    const taxableIncome = Math.max(0, annualSalary - personalAllowance);
    const annualTax = taxableIncome * 0.2; // basic rate for demo

    return annualTax / 12;
  };

  const updateTaxCode = async () => {
    if (!selectedEmployee || !newTaxCode) return;

    // Reset form
    setSelectedEmployee("");
    setNewTaxCode("");
    setChangeReason("");
    setNotes("");
    setTaxComparison(null);

    alert("Tax code updated successfully!");
  };

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
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
              💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Tax Code Management
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "8px 0 0 0",
              }}
            >
              Manage employee tax codes and preview tax impact changes
            </p>
          </div>
          <nav
            style={{
              display: "flex",
              gap: "24px",
            }}
          >
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
            <a
              href="/dashboard/payroll"
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
              ← Back to Payroll
            </a>
          </nav>
        </div>

        {/* Tax Code Update Form */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "12px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "32px",
            marginBottom: "30px",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#1f2937",
                margin: "0 0 8px 0",
              }}
            >
              Update Employee Tax Code
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "0",
              }}
            >
              Select an employee and new tax code to preview the impact
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "24px",
              marginBottom: "24px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Select Employee *
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              >
                <option value="">Choose an employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeNumber}) - Current: 1257L
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                New Tax Code *
              </label>
              <select
                value={newTaxCode}
                onChange={(e) => setNewTaxCode(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              >
                <option value="">Select new tax code...</option>
                {Object.entries(
                  taxCodeOptions.reduce((acc, option) => {
                    if (!acc[option.category]) acc[option.category] = [];
                    acc[option.category].push(option);
                    return acc;
                  }, {} as Record<string, TaxCodeOption[]>)
                ).map(([category, options]) => (
                  <optgroup key={category} label={category}>
                    {options.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} - {option.description}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Effective Date *
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Reason for Change *
              </label>
              <select
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              >
                <option value="">Select reason...</option>
                <option value="new_employee">New Employee</option>
                <option value="p45_received">P45 Received</option>
                <option value="hmrc_notice">HMRC Notice</option>
                <option value="emergency_code">Emergency Tax Code</option>
                <option value="benefits_change">Benefits Change</option>
                <option value="error_correction">Error Correction</option>
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional notes about this tax code change..."
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <button
              type="button"
              onClick={calculateTaxImpact}
              disabled={!selectedEmployee || !newTaxCode}
              style={{
                backgroundColor: !selectedEmployee || !newTaxCode ? "#9ca3af" : "#10b981",
                color: "#000000",
                fontWeight: "bold",
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                fontSize: "16px",
                cursor: !selectedEmployee || !newTaxCode ? "not-allowed" : "pointer",
              }}
            >
              📊 Calculate Impact
            </button>
          </div>
        </div>

        {/* Tax Impact Preview */}
        {taxComparison && (
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              padding: "32px",
              marginBottom: "30px",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#1f2937",
                margin: "0 0 24px 0",
              }}
            >
              Tax Impact Preview
            </h2>

            {taxComparison.kCodeWarning && (
              <div
                style={{
                  backgroundColor: "#fef3c7",
                  border: "1px solid #f59e0b",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>⚠️</div>
                <div>
                  <strong>K Code Warning:</strong>
                  <p style={{ margin: "4px 0 0 0", color: "#92400e" }}>{taxComparison.kCodeWarning}</p>
                </div>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: "24px",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  padding: "24px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#374151",
                    margin: "0 0 8px 0",
                  }}
                >
                  Current Tax Code
                </h3>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    margin: "0 0 8px 0",
                  }}
                >
                  {taxComparison.currentCode}
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: "0",
                  }}
                >
                  Monthly Tax: {formatCurrencyUK(taxComparison.currentMonthlyTax)}
                </p>
              </div>

              <div style={{ fontSize: "24px", marginBottom: "8px" }}>→</div>

              <div
                style={{
                  textAlign: "center",
                  padding: "24px",
                  backgroundColor: "#f0f9ff",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#374151",
                    margin: "0 0 8px 0",
                  }}
                >
                  New Tax Code
                </h3>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#3b82f6",
                    margin: "0 0 8px 0",
                  }}
                >
                  {taxComparison.newCode}
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    margin: "0",
                  }}
                >
                  Monthly Tax: {formatCurrencyUK(taxComparison.newMonthlyTax)}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  padding: "16px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                }}
              >
                <h4
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6b7280",
                    margin: "0 0 8px 0",
                  }}
                >
                  Monthly Impact
                </h4>
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: taxComparison.monthlyDifference >= 0 ? "#dc2626" : "#059669",
                    margin: "0",
                  }}
                >
                  {taxComparison.monthlyDifference >= 0 ? "+" : ""}
                  {formatCurrencyUK(taxComparison.monthlyDifference)}
                </p>
              </div>

              <div
                style={{
                  textAlign: "center",
                  padding: "16px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                }}
              >
                <h4
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6b7280",
                    margin: "0 0 8px 0",
                  }}
                >
                  Annual Impact
                </h4>
                <p
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: taxComparison.annualDifference >= 0 ? "#dc2626" : "#059669",
                    margin: "0",
                  }}
                >
                  {taxComparison.annualDifference >= 0 ? "+" : ""}
                  {formatCurrencyUK(taxComparison.annualDifference)}
                </p>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                type="button"
                onClick={updateTaxCode}
                disabled={!changeReason}
                style={{
                  backgroundColor: !changeReason ? "#9ca3af" : "#10b981",
                  color: "#000000",
                  fontWeight: "bold",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "16px",
                  cursor: !changeReason ? "not-allowed" : "pointer",
                }}
              >
                ✅ Update Tax Code
              </button>
            </div>
          </div>
        )}

        {/* Current Tax Codes Table */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "12px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "32px",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#1f2937",
              margin: "0 0 24px 0",
            }}
          >
            Current Employee Tax Codes
          </h2>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#374151",
                      borderBottom: "2px solid #f3f4f6",
                    }}
                  >
                    Employee
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#374151",
                      borderBottom: "2px solid #f3f4f6",
                    }}
                  >
                    Tax Code
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#374151",
                      borderBottom: "2px solid #f3f4f6",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#374151",
                      borderBottom: "2px solid #f3f4f6",
                    }}
                  >
                    Personal Allowance
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#374151",
                      borderBottom: "2px solid #f3f4f6",
                    }}
                  >
                    Monthly Tax
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: "500",
                            color: "#1f2937",
                          }}
                        >
                          <a
                            href={`/dashboard/employees/${employee.id}`}
                            style={{
                              color: "#3b82f6",
                              textDecoration: "none",
                            }}
                          >
                            {employee.firstName} {employee.lastName}
                          </a>
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#6b7280",
                          }}
                        >
                          {employee.employeeNumber}
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: "#dbeafe",
                          color: "#1e40af",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        1257L
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        ✅ Normal
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      {formatCurrencyUK(12570)}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "500",
                          color: "#dc2626",
                        }}
                      >
                        {formatCurrencyUK(calculateMonthlyTax(employee.annualSalary, "1257L"))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
