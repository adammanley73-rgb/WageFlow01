/* @ts-nocheck */
"use client";
import { useState, useEffect } from "react";
import { DEMO_EMPLOYEES, type Employee } from "../../../lib/data/employees";

interface PayElement {
  id: string;
  name: string;
  type: "earnings" | "deduction" | "benefit";
  calculation: "fixed" | "percentage" | "hourly_rate_multiple";
  value: number;
  subjectToPAYE: boolean;
  subjectToNI: boolean;
  subjectToPension: boolean;
  description?: string;
}

interface PayElementCalculation {
  employee: string;
  elementName: string;
  grossAmount: number;
  taxAmount: number;
  niAmount: number;
  netAmount: number;
}

export default function PayElementsPage() {
  const [payElements, setPayElements] = useState<PayElement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedElement, setSelectedElement] = useState("");
  const [elementAmount, setElementAmount] = useState("");
  const [calculation, setCalculation] = useState<PayElementCalculation | null>(
    null
  );

  // Form state for creating new elements
  const [newElement, setNewElement] = useState({
    name: "",
    type: "earnings" as "earnings" | "deduction" | "benefit",
    calculation: "fixed" as "fixed" | "percentage" | "hourly_rate_multiple",
    value: 0,
    subjectToPAYE: true,
    subjectToNI: true,
    subjectToPension: false,
    description: "",
  });

  useEffect(() => {
    const demoPayElements: PayElement[] = [
      {
        id: "pe-001",
        name: "Car Allowance",
        type: "earnings",
        calculation: "fixed",
        value: 400,
        subjectToPAYE: true,
        subjectToNI: true,
        subjectToPension: false,
        description: "Monthly car allowance - taxable benefit",
      },
      {
        id: "pe-002",
        name: "Private Medical Insurance",
        type: "benefit",
        calculation: "fixed",
        value: 85,
        subjectToPAYE: true,
        subjectToNI: true,
        subjectToPension: false,
        description: "Private healthcare insurance - P11D benefit",
      },
      {
        id: "pe-003",
        name: "Commission",
        type: "earnings",
        calculation: "fixed",
        value: 0,
        subjectToPAYE: true,
        subjectToNI: true,
        subjectToPension: true,
        description: "Sales commission payments - variable amount",
      },
      {
        id: "pe-004",
        name: "Student Loan Plan 2",
        type: "deduction",
        calculation: "percentage",
        value: 9,
        subjectToPAYE: false,
        subjectToNI: false,
        subjectToPension: false,
        description: "Student loan repayments - post-tax deduction",
      },
      {
        id: "pe-005",
        name: "London Weighting",
        type: "earnings",
        calculation: "fixed",
        value: 200,
        subjectToPAYE: true,
        subjectToNI: true,
        subjectToPension: true,
        description: "London location allowance - pensionable",
      },
    ];

    setPayElements(demoPayElements);
    setEmployees(DEMO_EMPLOYEES);
  }, []);

  const formatCurrencyUK = (amount: number): string =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "earnings":
        return {
          backgroundColor: "#dbeafe",
          color: "#1e40af",
          border: "1px solid #3b82f6",
        };
      case "benefit":
        return {
          backgroundColor: "#fef3c7",
          color: "#92400e",
          border: "1px solid #f59e0b",
        };
      case "deduction":
        return {
          backgroundColor: "#fee2e2",
          color: "#dc2626",
          border: "1px solid #ef4444",
        };
      default:
        return {
          backgroundColor: "#f3f4f6",
          color: "#374151",
          border: "1px solid #9ca3af",
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "earnings":
        return "ðŸ’°";
      case "benefit":
        return "ðŸ¥";
      case "deduction":
        return "âž–";
      default:
        return "ðŸ“‹";
    }
  };

  const calculatePayElement = () => {
    if (!selectedEmployee || !selectedElement || !elementAmount) return;

    const employee = employees.find((emp) => emp.id === selectedEmployee);
    const element = payElements.find((el) => el.id === selectedElement);

    if (!employee || !element) return;

    const amount = parseFloat(elementAmount);
    if (Number.isNaN(amount) || amount < 0) return;

    const grossAmount = amount;

    // Calculate tax implications
    const taxAmount = element.subjectToPAYE ? amount * 0.2 : 0; // Basic rate 20%
    const niAmount = element.subjectToNI ? amount * 0.12 : 0; // Employee NI 12%
    const netAmount =
      element.type === "deduction" ? amount : amount - taxAmount - niAmount;

    setCalculation({
      employee: `${employee.firstName} ${employee.lastName}`,
      elementName: element.name,
      grossAmount,
      taxAmount,
      niAmount,
      netAmount,
    });
  };

  const handleCreateElement = () => {
    if (!newElement.name) return;

    const element: PayElement = {
      id: `pe-${Date.now()}`,
      ...newElement,
    };

    setPayElements((prev) => [...prev, element]);

    // Reset form
    setNewElement({
      name: "",
      type: "earnings",
      calculation: "fixed",
      value: 0,
      subjectToPAYE: true,
      subjectToNI: true,
      subjectToPension: false,
      description: "",
    });

    setShowCreateForm(false);
    alert("Pay element created successfully!");
  };

  const resetCalculation = () => {
    setSelectedEmployee("");
    setSelectedElement("");
    setElementAmount("");
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
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
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
              ðŸ’¼ <span style={{ color: "#3b82f6" }}>WageFlow</span> Pay Elements
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "8px 0 0 0",
              }}
            >
              Manage custom pay elements including allowances, benefits, and
              deductions
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
              href="/dashboard/payroll/overtime-rates"
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
              Overtime Rates
            </a>
          </nav>
        </div>

        {/* Pay Element Calculator */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "12px",
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
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
              Pay Element Calculator
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "0",
              }}
            >
              Calculate the tax impact of pay elements on employee payroll
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
                    {formatCurrencyUK(emp.annualSalary)} annually
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
                Pay Element *
              </label>
              <select
                value={selectedElement}
                onChange={(e) => setSelectedElement(e.target.value)}
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
                <option value="">Select pay element...</option>
                {payElements.map((element) => (
                  <option key={element.id} value={element.id}>
                    {getTypeIcon(element.type)} {element.name} ({element.type})
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
                Amount (Â£) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={elementAmount}
                onChange={(e) => setElementAmount(e.target.value)}
                placeholder="250.00"
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
              onClick={calculatePayElement}
              disabled={!selectedEmployee || !selectedElement || !elementAmount}
              style={{
                backgroundColor:
                  !selectedEmployee || !selectedElement || !elementAmount
                    ? "#9ca3af"
                    : "#10b981",
                color: "#000000",
                fontWeight: "bold",
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                fontSize: "16px",
                cursor:
                  !selectedEmployee || !selectedElement || !elementAmount
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              ðŸ§® Calculate Impact
            </button>
            <button
              type="button"
              onClick={resetCalculation}
              style={{
                backgroundColor: "#6b7280",
                color: "#ffffff",
                fontWeight: "bold",
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
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
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
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
              Pay Element Impact
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "24px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "24px",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1f2937",
                    margin: "0 0 16px 0",
                  }}
                >
                  Element Details
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ fontSize: "14px", color: "#6b7280" }}>
                      Employee:
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#1f2937",
                      }}
                    >
                      {calculation.employee}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ fontSize: "14px", color: "#6b7280" }}>
                      Pay Element:
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#1f2937",
                      }}
                    >
                      {calculation.elementName}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ fontSize: "14px", color: "#6b7280" }}>
                      Gross Amount:
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#059669",
                      }}
                    >
                      {formatCurrencyUK(calculation.grossAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div
              style={{
                backgroundColor: "#f0f9ff",
                padding: "24px",
                borderRadius: "8px",
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#1f2937",
                  margin: "0 0 16px 0",
                }}
              >
                Tax Impact
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    PAYE Tax (20%):
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#dc2626",
                    }}
                  >
                    {formatCurrencyUK(calculation.taxAmount)}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    National Insurance (12%):
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#dc2626",
                    }}
                  >
                    {formatCurrencyUK(calculation.niAmount)}
                  </span>
                </div>
                <div
                  style={{
                    borderTop: "2px solid #f3f4f6",
                    paddingTop: "12px",
                    marginTop: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "#1f2937",
                      }}
                    >
                      Net Impact:
                    </span>
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#059669",
                      }}
                    >
                      {formatCurrencyUK(calculation.netAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create New Element & Library */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "12px",
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "32px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#1f2937",
                margin: "0",
              }}
            >
              Pay Elements Library
            </h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{
                backgroundColor: "#3b82f6",
                color: "#ffffff",
                fontWeight: "bold",
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              âž• Create New Element
            </button>
          </div>

          {showCreateForm && (
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "24px",
                marginBottom: "24px",
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
                Create New Pay Element
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "16px",
                  marginBottom: "16px",
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
                    Element Name *
                  </label>
                  <input
                    type="text"
                    value={newElement.name}
                    onChange={(e) =>
                      setNewElement((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g., Shift Allowance"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                    }}
                  />
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
                    Type *
                  </label>
                  <select
                    value={newElement.type}
                    onChange={(e) =>
                      setNewElement((prev) => ({
                        ...prev,
                        type: e.target.value as any,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                    }}
                  >
                    <option value="earnings">ðŸ’° Earnings</option>
                    <option value="benefit">ðŸ¥ Benefit</option>
                    <option value="deduction">âž– Deduction</option>
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
                    Default Value (Â£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newElement.value}
                    onChange={(e) =>
                      setNewElement((prev) => ({
                        ...prev,
                        value: parseFloat(e.target.value) || 0,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    value={newElement.description}
                    onChange={(e) =>
                      setNewElement((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="Brief description of this pay element..."
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <h4
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#1f2937",
                      margin: "16px 0 12px 0",
                    }}
                  >
                    Tax Treatment
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      gap: "24px",
                      flexWrap: "wrap",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "14px",
                        color: "#374151",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newElement.subjectToPAYE}
                        onChange={(e) =>
                          setNewElement((prev) => ({
                            ...prev,
                            subjectToPAYE: e.target.checked,
                          }))
                        }
                        style={{ width: "16px", height: "16px" }}
                      />
                      Subject to PAYE Tax
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "14px",
                        color: "#374151",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newElement.subjectToNI}
                        onChange={(e) =>
                          setNewElement((prev) => ({
                            ...prev,
                            subjectToNI: e.target.checked,
                          }))
                        }
                        style={{ width: "16px", height: "16px" }}
                      />
                      Subject to National Insurance
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "14px",
                        color: "#374151",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newElement.subjectToPension}
                        onChange={(e) =>
                          setNewElement((prev) => ({
                            ...prev,
                            subjectToPension: e.target.checked,
                          }))
                        }
                        style={{ width: "16px", height: "16px" }}
                      />
                      Pensionable
                    </label>
                  </div>
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
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    backgroundColor: "#6b7280",
                    color: "#ffffff",
                    fontWeight: "bold",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateElement}
                  disabled={!newElement.name}
                  style={{
                    backgroundColor: !newElement.name ? "#9ca3af" : "#10b981",
                    color: "#000000",
                    fontWeight: "bold",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "16px",
                    cursor: !newElement.name ? "not-allowed" : "pointer",
                  }}
                >
                  âœ… Create Element
                </button>
              </div>
            </div>
          )}

          {/* Pay Elements Table */}
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
                    Element Name
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
                    Type
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
                    Default Value
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
                    Tax Treatment
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
                </tr>
              </thead>
              <tbody>
                {payElements.map((element) => (
                  <tr key={element.id}>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontSize: "16px" }}>
                          {getTypeIcon(element.type)}
                        </span>
                        <div
                          style={{
                            fontWeight: 500,
                            color: "#1f2937",
                          }}
                        >
                          {element.name}
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
                        style={Object.assign(
                          {
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 500,
                          },
                          getTypeColor(element.type)
                        )}
                      >
                        {element.type}
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
                          fontWeight: 500,
                          color: "#059669",
                        }}
                      >
                        {element.value > 0
                          ? formatCurrencyUK(element.value)
                          : "Variable"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          flexWrap: "wrap",
                        }}
                      >
                        {element.subjectToPAYE && (
                          <span
                            style={{
                              backgroundColor: "#dbeafe",
                              color: "#1e40af",
                              padding: "2px 6px",
                              borderRadius: "8px",
                              fontSize: "11px",
                              fontWeight: 500,
                            }}
                          >
                            PAYE
                          </span>
                        )}
                        {element.subjectToNI && (
                          <span
                            style={{
                              backgroundColor: "#dbeafe",
                              color: "#1e40af",
                              padding: "2px 6px",
                              borderRadius: "8px",
                              fontSize: "11px",
                              fontWeight: 500,
                            }}
                          >
                            NI
                          </span>
                        )}
                        {element.subjectToPension && (
                          <span
                            style={{
                              backgroundColor: "#dbeafe",
                              color: "#1e40af",
                              padding: "2px 6px",
                              borderRadius: "8px",
                              fontSize: "11px",
                              fontWeight: 500,
                            }}
                          >
                            Pension
                          </span>
                        )}
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
                          fontSize: "14px",
                          color: "#6b7280",
                        }}
                      >
                        {element.description || "No description"}
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
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
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
            UK Pay Elements Guide
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
              <strong>ðŸ’° Earnings:</strong> Taxable income including allowances,
              bonuses, and commissions
            </p>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
              <strong>ðŸ¥ Benefits:</strong> Benefits-in-kind that require P11D
              reporting (e.g., company cars, medical insurance)
            </p>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
              <strong>âž– Deductions:</strong> Post-tax deductions like union dues,
              charity donations, or loan repayments
            </p>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
              <strong>ðŸ“‹ PAYE Treatment:</strong> Most earnings and benefits are
              subject to PAYE tax and National Insurance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

