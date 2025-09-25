/* @ts-nocheck */
"use client";
import { useState, useEffect } from "react";
import { DEMO_EMPLOYEES, type Employee } from "../../../lib/data/employees";

interface OvertimeRate {
  id: string;
  name: string;
  multiplier: number;
  description: string;
}

interface OvertimeCalculation {
  employeeName: string;
  rateName: string;
  baseHourlyRate: number;
  overtimeRate: number;
  hours: number;
  grossOvertimePay: number;
  taxDeduction: number;
  niDeduction: number;
  netOvertimePay: number;
}

export default function OvertimeRatesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedRate, setSelectedRate] = useState("");
  const [hours, setHours] = useState("");
  const [calculation, setCalculation] = useState<OvertimeCalculation | null>(
    null
  );
  const [savedRates, setSavedRates] = useState<OvertimeRate[]>([]);

  const defaultOvertimeRates: OvertimeRate[] = [
    {
      id: "ot-125",
      name: "Time and Quarter",
      multiplier: 1.25,
      description: "25% premium - evenings/weekends",
    },
    {
      id: "ot-150",
      name: "Time and Half",
      multiplier: 1.5,
      description: "50% premium - after normal hours",
    },
    {
      id: "ot-175",
      name: "Time and Three Quarters",
      multiplier: 1.75,
      description: "75% premium - Sunday/bank holidays",
    },
    {
      id: "ot-200",
      name: "Double Time",
      multiplier: 2.0,
      description: "100% premium - emergency callouts",
    },
  ];

  useEffect(() => {
    setEmployees(DEMO_EMPLOYEES);
    setSavedRates(defaultOvertimeRates);
  }, []);

  const formatCurrencyUK = (amount: number): string => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const calculateOvertime = () => {
    if (!selectedEmployee || !selectedRate || !hours) return;

    const employee = employees.find((e) => e.id === selectedEmployee);
    const rate = savedRates.find((r) => r.id === selectedRate);

    if (!employee || !rate) return;

    const overtimeHours = parseFloat(hours);
    if (Number.isNaN(overtimeHours) || overtimeHours <= 0) return;

    const baseHourlyRate = employee.annualSalary / (52 * 37.5); // Assuming 37.5 hours per week
    const overtimeRate = baseHourlyRate * rate.multiplier;
    const grossOvertimePay = overtimeRate * overtimeHours;

    // UK tax calculations (simplified for demo)
    const taxDeduction = grossOvertimePay * 0.2; // Basic rate 20%
    const niDeduction = grossOvertimePay * 0.12; // Employee NI 12%
    const netOvertimePay = grossOvertimePay - taxDeduction - niDeduction;

    setCalculation({
      employeeName: `${employee.firstName} ${employee.lastName}`,
      rateName: rate.name,
      baseHourlyRate,
      overtimeRate,
      hours: overtimeHours,
      grossOvertimePay,
      taxDeduction,
      niDeduction,
      netOvertimePay,
    });
  };

  const resetCalculation = () => {
    setSelectedEmployee("");
    setSelectedRate("");
    setHours("");
    setCalculation(null);
  };

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
              ðŸ’¼ <span style={{ color: "#3b82f6" }}>WageFlow</span> Overtime Rates
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "8px 0 0 0",
              }}
            >
              Manage overtime rates and calculate overtime pay with UK tax deductions
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
              â† Back to Payroll
            </a>
            <a
              href="/dashboard/payroll/pay-elements"
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
              Pay Elements
            </a>
          </nav>
        </div>

        {/* Overtime Calculator */}
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
                fontWeight: 600,
                color: "#1f2937",
                margin: "0 0 8px 0",
              }}
            >
              Overtime Calculator
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "0",
              }}
            >
              Calculate overtime pay with automatic UK tax and NI deductions
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
                  fontWeight: 500,
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
                    {emp.firstName} {emp.lastName} -{" "}
                    {formatCurrencyUK(emp.annualSalary / (52 * 37.5))}/hour
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Overtime Rate *
              </label>
              <select
                value={selectedRate}
                onChange={(e) => setSelectedRate(e.target.value)}
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
                <option value="">Select overtime rate...</option>
                {savedRates.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {rate.name} ({rate.multiplier}x) - {rate.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Overtime Hours *
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="100"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="8.5"
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
          </div>

          <div
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={calculateOvertime}
              disabled={!selectedEmployee || !selectedRate || !hours}
              style={{
                backgroundColor:
                  !selectedEmployee || !selectedRate || !hours
                    ? "#9ca3af"
                    : "#10b981",
                color: "#000000",
                fontWeight: "bold",
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                fontSize: "16px",
                cursor:
                  !selectedEmployee || !selectedRate || !hours
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              ðŸ§® Calculate Overtime Pay
            </button>
            <button
              type="button"
              onClick={resetCalculation}
              style={{
                backgroundColor: "#f3f4f6",
                color: "#374151",
                fontWeight: "bold",
                padding: "12px 24px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              ðŸ”„ Reset
            </button>
          </div>
        </div>

        {/* Calculation Results */}
        {calculation && (
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
                fontWeight: 600,
                color: "#1f2937",
                margin: "0 0 24px 0",
              }}
            >
              Overtime Calculation Results
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "24px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  padding: "24px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#374151",
                    margin: "0 0 16px 0",
                  }}
                >
                  Employee Details
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Employee:</span>
                    <span style={{ fontWeight: 500, color: "#1f2937" }}>
                      {calculation.employeeName}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Base Hourly Rate:</span>
                    <span style={{ fontWeight: 500, color: "#1f2937" }}>
                      {formatCurrencyUK(calculation.baseHourlyRate)}/hour
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Overtime Rate:</span>
                    <span style={{ fontWeight: 600, color: "#10b981" }}>
                      {formatCurrencyUK(calculation.overtimeRate)}/hour
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Hours Worked:</span>
                    <span style={{ fontWeight: 500, color: "#1f2937" }}>
                      {calculation.hours} hours
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "24px",
                  backgroundColor: "#f0f9ff",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1e40af",
                    margin: "0 0 16px 0",
                  }}
                >
                  Payment Breakdown
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Gross Overtime Pay:</span>
                    <span style={{ fontWeight: 600, color: "#10b981" }}>
                      {formatCurrencyUK(calculation.grossOvertimePay)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Tax Deduction (20%):</span>
                    <span style={{ fontWeight: 500, color: "#dc2626" }}>
                      {formatCurrencyUK(calculation.taxDeduction)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>
                      National Insurance (12%):
                    </span>
                    <span style={{ fontWeight: 500, color: "#dc2626" }}>
                      {formatCurrencyUK(calculation.niDeduction)}
                    </span>
                  </div>
                  <div
                    style={{
                      borderTop: "2px solid #f3f4f6",
                      paddingTop: "12px",
                      marginTop: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 600, color: "#1f2937" }}>
                        Net Overtime Pay:
                      </span>
                      <span
                        style={{
                          fontWeight: "bold",
                          fontSize: "18px",
                          color: "#10b981",
                        }}
                      >
                        {formatCurrencyUK(calculation.netOvertimePay)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#dbeafe",
                border: "1px solid #93c5fd",
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>â„¹ï¸</div>
              <div>
                <h4
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1e40af",
                    margin: "0 0 8px 0",
                  }}
                >
                  UK Tax Treatment
                </h4>
                <ul
                  style={{
                    margin: "0",
                    paddingLeft: "20px",
                    color: "#1e40af",
                  }}
                >
                  <li>âœ… Subject to PAYE tax deduction</li>
                  <li>âœ… Subject to National Insurance contributions</li>
                  <li>âœ… Must be included in RTI submission to HMRC</li>
                  <li>âœ… Counts towards annual earnings for auto-enrollment</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Current Overtime Rates */}
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
              fontWeight: 600,
              color: "#1f2937",
              margin: "0 0 24px 0",
            }}
          >
            Current Overtime Rates
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
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "2px solid #f3f4f6",
                    }}
                  >
                    Rate Name
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "2px solid #f3f4f6",
                    }}
                  >
                    Multiplier
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "2px solid #f3f4f6",
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "2px solid #f3f4f6",
                    }}
                  >
                    Example (Â£15/hour base)
                  </th>
                </tr>
              </thead>
              <tbody>
                {savedRates.map((rate) => (
                  <tr key={rate.id}>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          color: "#1f2937",
                        }}
                      >
                        {rate.name}
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
                          fontWeight: 500,
                        }}
                      >
                        {rate.multiplier}x
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <span style={{ color: "#6b7280" }}>{rate.description}</span>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 500,
                          color: "#10b981",
                        }}
                      >
                        {formatCurrencyUK(15 * rate.multiplier)}/hour
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Help Information */}
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
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#1f2937",
              margin: "0 0 16px 0",
            }}
          >
            UK Overtime Regulations
          </h3>
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            <p style={{ margin: 0, color: "#374151" }}>
              <strong>Working Time Regulations:</strong> Maximum 48 hours per week
              average (including overtime) unless opt-out agreed
            </p>
            <p style={{ margin: 0, color: "#374151" }}>
              <strong>Minimum Wage:</strong> Overtime must still meet National Minimum
              Wage requirements
            </p>
            <p style={{ margin: 0, color: "#374151" }}>
              <strong>Tax Treatment:</strong> All overtime pay is subject to PAYE tax
              and National Insurance
            </p>
            <p style={{ margin: 0, color: "#374151" }}>
              <strong>Record Keeping:</strong> Maintain records of all overtime hours
              and payments for HMRC
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

