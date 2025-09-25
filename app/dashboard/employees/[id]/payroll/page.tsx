/* @ts-nocheck */
"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type Employee = {
  id: string;
  employeeId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  annualSalary: number;
  hireDate: string;
  employmentType: string;
  status: string;
};

type Section =
  | "overview"
  | "basic-pay"
  | "overtime"
  | "additions"
  | "deductions"
  | "summary";

export default function EmployeePayrollPage() {
  const params = useParams<{ id: string }>();
  const employeeId = params?.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("overview");

  // Payroll state management with ALL deductions
  const [payrollData, setPayrollData] = useState({
    basicPay: 0,
    overtime: {
      hours: 0,
      rate: "1.5x",
      amount: 0,
    },
    bonus: 0,
    commission: 0,
    allowances: 0,
    grossPay: 0,
    taxDeductions: {
      payeTax: 0,
      nationalInsurance: 0,
      pensionContribution: 0,
      studentLoan: 0,
      studentLoanPlan: "none",
      unionFees: 0,
      salarySacrifice: 0,
      privateMedical: 0,
      childcareVouchers: 0,
      attachmentOfEarnings: 0,
      otherDeductions: 0,
    },
    netPay: 0,
  });

  const overtimeRates = [
    { id: "1.25x", name: "x1.25", multiplier: 1.25 },
    { id: "1.5x", name: "x1.5", multiplier: 1.5 },
    { id: "1.75x", name: "x1.75", multiplier: 1.75 },
    { id: "2.0x", name: "x2.0", multiplier: 2.0 },
  ] as const;

  // Employee data loading - NOW USES DATABASE
  useEffect(() => {
    const loadEmployee = async () => {
      try {
        console.log("ðŸ” Loading employee from database:", employeeId);
        const response = await fetch("/api/employees");
        if (response.ok) {
          const employees = await response.json();
          const foundEmployee = employees.find(
            (emp: any) => emp.id === employeeId || emp.employeeId === employeeId
          );

          if (foundEmployee) {
            console.log("âœ… Employee found:", foundEmployee);
            // Transform to match expected format
            const emp: Employee = {
              id: foundEmployee.id,
              employeeId: foundEmployee.employeeId,
              employeeNumber:
                foundEmployee.employeeNumber || foundEmployee.employeeId,
              firstName: foundEmployee.firstName,
              lastName: foundEmployee.lastName,
              email: foundEmployee.email,
              annualSalary: foundEmployee.annualSalary || 0,
              hireDate: foundEmployee.hireDate,
              employmentType: foundEmployee.employmentType || "full_time",
              status: foundEmployee.status || "active",
            };
            setEmployee(emp);

            const monthlyPay = (emp.annualSalary || 0) / 12;
            setPayrollData((prev) => ({
              ...prev,
              basicPay: monthlyPay,
              grossPay: monthlyPay,
            }));
          } else {
            console.error("âŒ Employee not found:", employeeId);
          }
        } else {
          console.error("âŒ Failed to fetch employees:", response.status);
        }
      } catch (error) {
        console.error("âŒ Error loading employee:", error);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      loadEmployee();
    }
  }, [employeeId]);

  const calculateOvertime = (
    hours: number,
    hourlyRate: number,
    multiplier: number
  ) => hours * hourlyRate * multiplier;

  const calculateTaxDeductions = (
    grossPay: number,
    _taxCode: string = "1257L"
  ) => {
    // Simplified UK tax calculation for demo
    const monthlyAllowance = 12570 / 12; // 2025-26 personal allowance
    const taxableIncome = Math.max(0, grossPay - monthlyAllowance);

    const payeTax = taxableIncome * 0.2; // Basic rate
    const nationalInsurance = Math.max(0, (grossPay - 1048) * 0.12); // 2025-26 rates
    const pensionContribution = grossPay * 0.05; // 5% auto-enrollment

    // Student loan calculation based on plan
    let studentLoan = 0;
    const plan = payrollData.taxDeductions.studentLoanPlan;
    if (plan && plan !== "none") {
      let threshold = 0;
      let rate = 0;

      switch (plan) {
        case "plan1":
          threshold = 1615; // Â£19,390 annually / 12
          rate = 0.09;
          break;
        case "plan2":
          threshold = 2274; // Â£27,295 annually / 12
          rate = 0.09;
          break;
        case "plan4":
          threshold = 2114; // Â£25,375 annually / 12
          rate = 0.09;
          break;
        case "postgrad":
          threshold = 1750; // Â£21,000 annually / 12
          rate = 0.06;
          break;
      }

      if (grossPay > threshold) {
        studentLoan = (grossPay - threshold) * rate;
      }
    }

    return {
      payeTax,
      nationalInsurance,
      pensionContribution,
      studentLoan,
      studentLoanPlan: payrollData.taxDeductions.studentLoanPlan,
      unionFees: payrollData.taxDeductions.unionFees || 0,
      salarySacrifice: payrollData.taxDeductions.salarySacrifice || 0,
      privateMedical: payrollData.taxDeductions.privateMedical || 0,
      childcareVouchers: payrollData.taxDeductions.childcareVouchers || 0,
      attachmentOfEarnings: payrollData.taxDeductions.attachmentOfEarnings || 0,
      otherDeductions: payrollData.taxDeductions.otherDeductions || 0,
    };
  };

  const updateGrossPay = () => {
    if (!employee) return;
    const hourlyRate = (employee.annualSalary || 0) / 2080;
    const overtimeAmount = calculateOvertime(
      payrollData.overtime.hours,
      hourlyRate,
      overtimeRates.find((r) => r.id === payrollData.overtime.rate)?.multiplier ||
        1.5
    );

    const newGrossPay =
      payrollData.basicPay +
      overtimeAmount +
      payrollData.bonus +
      payrollData.commission +
      payrollData.allowances;

    const deductions = calculateTaxDeductions(newGrossPay);

    const totalDeductions =
      deductions.payeTax +
      deductions.nationalInsurance +
      deductions.pensionContribution +
      (deductions.studentLoan || 0) +
      (deductions.unionFees || 0) +
      (deductions.salarySacrifice || 0) +
      (deductions.privateMedical || 0) +
      (deductions.childcareVouchers || 0) +
      (deductions.attachmentOfEarnings || 0) +
      (deductions.otherDeductions || 0);

    const netPay = newGrossPay - totalDeductions;

    setPayrollData((prev) => ({
      ...prev,
      overtime: { ...prev.overtime, amount: overtimeAmount },
      grossPay: newGrossPay,
      taxDeductions: deductions,
      netPay,
    }));
  };

  useEffect(() => {
    if (employee) {
      updateGrossPay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    employee,
    payrollData.overtime.hours,
    payrollData.overtime.rate,
    payrollData.bonus,
    payrollData.commission,
    payrollData.allowances,
  ]);

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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "white" }}>
          <h1
            style={{
              color: "white",
              fontSize: "24px",
              textAlign: "center",
              margin: 0,
            }}
          >
            Loading Employee Payroll...
          </h1>
          <p style={{ color: "rgba(255,255,255,0.8)", margin: "16px 0" }}>
            Fetching payroll data for employee: {employeeId}
          </p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background:
            "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
          minHeight: "100vh",
          padding: "40px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "white" }}>
          <h1 style={{ margin: 0 }}>Employee Not Found</h1>
          <p style={{ margin: "16px 0" }}>
            The employee with ID "{employeeId}" could not be found in the
            database.
          </p>
          <a
            href="/dashboard/employees"
            style={{ color: "white", textDecoration: "underline" }}
          >
            â† Back to Employees
          </a>
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
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
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
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  margin: 0,
                }}
              >
                ðŸ’¼ <span style={{ color: "#3b82f6" }}>WageFlow</span> Payroll
              </h1>
              <p style={{ color: "#6b7280", margin: "8px 0 0 0" }}>
                {employee.firstName} {employee.lastName} (
                {employee.employeeNumber})
              </p>
            </div>
            <nav style={{ display: "flex", gap: "24px" }}>
              <a
                href={`/dashboard/employees/${employee.id}`}
                style={{
                  color: "#000000",
                  textDecoration: "none",
                  fontWeight: "bold",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #d1d5db",
                }}
              >
                Details
              </a>
              <a
                href={`/dashboard/employees/${employee.id}/payroll`}
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
                Payroll
              </a>
              <a
                href={`/dashboard/employees/${employee.id}/edit`}
                style={{
                  color: "#000000",
                  textDecoration: "none",
                  fontWeight: "bold",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #d1d5db",
                }}
              >
                Edit
              </a>
            </nav>
          </div>

          {/* Sub-navigation */}
          <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[
              { id: "overview", label: "ðŸ“Š Overview" },
              { id: "basic-pay", label: "ðŸ’° Basic Pay" },
              { id: "overtime", label: "â° Overtime" },
              { id: "additions", label: "âž• Additions" },
              { id: "deductions", label: "âž– Deductions" },
              { id: "summary", label: "ðŸ“‹ Summary" },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as Section)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor:
                    activeSection === (section.id as Section)
                      ? "#3b82f6"
                      : "#f3f4f6",
                  color:
                    activeSection === (section.id as Section)
                      ? "white"
                      : "#374151",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: "30px",
          }}
        >
          {/* Left Column - Main Content */}
          <div>
            {/* Overview Section */}
            {activeSection === "overview" && (
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(20px)",
                  padding: "32px",
                  borderRadius: "12px",
                  boxShadow:
                    "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "24px",
                  }}
                >
                  ðŸ“Š Payroll Overview
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "20px",
                  }}
                >
                  <div
                    style={{
                      padding: "20px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        margin: "0 0 8px 0",
                      }}
                    >
                      Annual Salary
                    </h3>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#059669",
                        margin: 0,
                      }}
                    >
                      Â£{employee.annualSalary.toLocaleString()}
                    </p>
                  </div>

                  <div
                    style={{
                      padding: "20px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        margin: "0 0 8px 0",
                      }}
                    >
                      Monthly Basic
                    </h3>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#059669",
                        margin: 0,
                      }}
                    >
                      Â£{(employee.annualSalary / 12).toFixed(2)}
                    </p>
                  </div>

                  <div
                    style={{
                      padding: "20px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        margin: "0 0 8px 0",
                      }}
                    >
                      Hourly Rate
                    </h3>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#059669",
                        margin: 0,
                      }}
                    >
                      Â£{(employee.annualSalary / 2080).toFixed(2)}
                    </p>
                  </div>

                  <div
                    style={{
                      padding: "20px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        margin: "0 0 8px 0",
                      }}
                    >
                      Tax Code
                    </h3>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#059669",
                        margin: 0,
                      }}
                    >
                      1257L
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Pay Section */}
            {activeSection === "basic-pay" && (
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(20px)",
                  padding: "32px",
                  borderRadius: "12px",
                  boxShadow:
                    "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "24px",
                  }}
                >
                  ðŸ’° Basic Pay Management
                </h2>

                <div
                  style={{
                    marginBottom: "32px",
                    padding: "24px",
                    backgroundColor: "#f0fdf4",
                    borderRadius: "12px",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "#166534",
                      marginBottom: "16px",
                    }}
                  >
                    Current Month
                  </h3>
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "#f7fee7",
                      borderRadius: "8px",
                      border: "1px solid #d9f99d",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>Monthly Salary:</span>
                      <strong>Â£{payrollData.basicPay.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "#1f2937",
                      marginBottom: "16px",
                    }}
                  >
                    Pay Frequency Options
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {[
                      { label: "Monthly", amount: employee.annualSalary / 12 },
                      { label: "Bi-Weekly", amount: employee.annualSalary / 26 },
                      { label: "Weekly", amount: employee.annualSalary / 52 },
                    ].map((freq) => (
                      <div
                        key={freq.label}
                        style={{
                          padding: "20px",
                          backgroundColor: "#f8fafc",
                          borderRadius: "8px",
                          textAlign: "center",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "14px",
                            color: "#6b7280",
                            margin: "0 0 8px 0",
                          }}
                        >
                          {freq.label}
                        </p>
                        <p
                          style={{
                            fontSize: "20px",
                            fontWeight: "bold",
                            color: "#059669",
                            margin: 0,
                          }}
                        >
                          Â£{freq.amount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Overtime Section */}
            {activeSection === "overtime" && (
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(20px)",
                  padding: "32px",
                  borderRadius: "12px",
                  boxShadow:
                    "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "24px",
                  }}
                >
                  â° Overtime Management
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "20px",
                    marginBottom: "24px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: 500,
                        color: "#374151",
                      }}
                    >
                      Overtime Hours
                    </label>
                    <input
                      type="number"
                      placeholder="8"
                      value={payrollData.overtime.hours}
                      onChange={(e) =>
                        setPayrollData((prev) => ({
                          ...prev,
                          overtime: {
                            ...prev.overtime,
                            hours: parseFloat(e.target.value) || 0,
                          },
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: 500,
                        color: "#374151",
                      }}
                    >
                      Overtime Rate
                    </label>
                    <select
                      value={payrollData.overtime.rate}
                      onChange={(e) =>
                        setPayrollData((prev) => ({
                          ...prev,
                          overtime: { ...prev.overtime, rate: e.target.value },
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    >
                      {overtimeRates.map((rate) => (
                        <option key={rate.id} value={rate.id}>
                          {rate.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: 500,
                        color: "#374151",
                      }}
                    >
                      Base Hourly Rate
                    </label>
                    <input
                      type="text"
                      value={`Â£${(employee.annualSalary / 2080).toFixed(2)}`}
                      readOnly
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        backgroundColor: "#f9fafb",
                      }}
                    />
                  </div>
                </div>

                {payrollData.overtime.hours > 0 && (
                  <div
                    style={{
                      padding: "20px",
                      backgroundColor: "#f0f9ff",
                      borderRadius: "12px",
                      border: "1px solid #bfdbfe",
                      marginBottom: "24px",
                    }}
                  >
                    <h4
                      style={{
                        color: "#1e40af",
                        fontSize: "18px",
                        margin: "0 0 8px 0",
                      }}
                    >
                      ðŸ’° Overtime Calculation
                    </h4>
                    <p style={{ color: "#1e40af", margin: "0 0 8px 0" }}>
                      {payrollData.overtime.hours} hours Ã— Â£
                      {(employee.annualSalary / 2080).toFixed(2)} Ã—{" "}
                      {
                        overtimeRates.find(
                          (r) => r.id === payrollData.overtime.rate
                        )?.multiplier
                      }{" "}
                      = <strong> Â£{payrollData.overtime.amount.toFixed(2)}</strong>
                    </p>
                    <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                      Subject to PAYE tax, National Insurance, and pension
                      contributions
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    alert(
                      `Overtime added: ${employee.firstName} ${employee.lastName} - ${payrollData.overtime.hours} hours at ${payrollData.overtime.rate}`
                    );
                  }}
                  disabled={payrollData.overtime.hours <= 0}
                  style={{
                    backgroundColor:
                      payrollData.overtime.hours > 0 ? "#10b981" : "#9ca3af",
                    color: "white",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor:
                      payrollData.overtime.hours > 0
                        ? "pointer"
                        : "not-allowed",
                  }}
                >
                  Add Overtime to Payroll
                </button>
              </div>
            )}

            {/* Additional Pay Elements */}
            {activeSection === "additions" && (
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(20px)",
                  padding: "32px",
                  borderRadius: "12px",
                  boxShadow:
                    "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "24px",
                  }}
                >
                  âž• Additional Pay Elements
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "24px",
                  }}
                >
                  <div
                    style={{
                      padding: "24px",
                      backgroundColor: "#f0fdf4",
                      borderRadius: "12px",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: "#166534",
                        marginBottom: "12px",
                      }}
                    >
                      ðŸ’° Bonus
                    </h3>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={payrollData.bonus}
                      onChange={(e) =>
                        setPayrollData((prev) => ({
                          ...prev,
                          bonus: parseFloat(e.target.value) || 0,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #bbf7d0",
                        borderRadius: "6px",
                        fontSize: "16px",
                        marginBottom: "8px",
                      }}
                    />
                    <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
                      One-time performance bonus
                    </p>
                  </div>

                  <div
                    style={{
                      padding: "24px",
                      backgroundColor: "#eff6ff",
                      borderRadius: "12px",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: "#1e40af",
                        marginBottom: "12px",
                      }}
                    >
                      ðŸŽ¯ Commission
                    </h3>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={payrollData.commission}
                      onChange={(e) =>
                        setPayrollData((prev) => ({
                          ...prev,
                          commission: parseFloat(e.target.value) || 0,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        fontSize: "16px",
                        marginBottom: "8px",
                      }}
                    />
                    <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
                      Sales commission earned
                    </p>
                  </div>

                  <div
                    style={{
                      padding: "24px",
                      backgroundColor: "#fef7f7",
                      borderRadius: "12px",
                      border: "1px solid #fee2e2",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: "#dc2626",
                        marginBottom: "12px",
                      }}
                    >
                      ðŸš— Allowances
                    </h3>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={payrollData.allowances}
                      onChange={(e) =>
                        setPayrollData((prev) => ({
                          ...prev,
                          allowances: parseFloat(e.target.value) || 0,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #fee2e2",
                        borderRadius: "6px",
                        fontSize: "16px",
                        marginBottom: "8px",
                      }}
                    />
                    <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
                      Car, travel, meal allowances
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Deductions Section */}
            {activeSection === "deductions" && (
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(20px)",
                  padding: "32px",
                  borderRadius: "12px",
                  boxShadow:
                    "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "24px",
                  }}
                >
                  âž– Tax & Deductions
                </h2>

                {/* Statutory Deductions */}
                <div
                  style={{
                    marginBottom: "32px",
                    padding: "24px",
                    backgroundColor: "#fef7f7",
                    borderRadius: "12px",
                    border: "1px solid #fee2e2",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: "#dc2626",
                      marginBottom: "16px",
                    }}
                  >
                    Statutory Deductions
                  </h3>

                  <div
                    style={{ display: "flex", flexDirection: "column", gap: "16px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "20px",
                        backgroundColor: "#fef2f2",
                        borderRadius: "8px",
                        border: "1px solid #fecaca",
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            color: "#dc2626",
                            fontSize: "16px",
                            margin: "0 0 4px 0",
                          }}
                        >
                          ðŸ›ï¸ PAYE Tax
                        </h4>
                        <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
                          Income tax deduction
                        </p>
                      </div>
                      <span
                        style={{ fontSize: "20px", fontWeight: "bold", color: "#dc2626" }}
                      >
                        Â£{payrollData.taxDeductions.payeTax.toFixed(2)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "20px",
                        backgroundColor: "#fef2f2",
                        borderRadius: "8px",
                        border: "1px solid #fecaca",
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            color: "#dc2626",
                            fontSize: "16px",
                            margin: "0 0 4px 0",
                          }}
                        >
                          ðŸ¥ National Insurance
                        </h4>
                        <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
                          Employee contribution
                        </p>
                      </div>
                      <span
                        style={{ fontSize: "20px", fontWeight: "bold", color: "#dc2626" }}
                      >
                        Â£{payrollData.taxDeductions.nationalInsurance.toFixed(2)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "20px",
                        backgroundColor: "#fef2f2",
                        borderRadius: "8px",
                        border: "1px solid #fecaca",
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            color: "#dc2626",
                            fontSize: "16px",
                            margin: "0 0 4px 0",
                          }}
                        >
                          ðŸ¦ Pension Contribution
                        </h4>
                        <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
                          Auto-enrollment 5%
                        </p>
                      </div>
                      <span
                        style={{ fontSize: "20px", fontWeight: "bold", color: "#dc2626" }}
                      >
                        Â£{payrollData.taxDeductions.pensionContribution.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Student Loan Deductions */}
                <div
                  style={{
                    marginBottom: "32px",
                    padding: "24px",
                    backgroundColor: "#f0f9ff",
                    borderRadius: "12px",
                    border: "1px solid #bae6fd",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: "#0369a1",
                      marginBottom: "16px",
                    }}
                  >
                    Student Loan Deductions
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: 500,
                          color: "#374151",
                        }}
                      >
                        Student Loan Plan
                      </label>
                      <select
                        value={payrollData.taxDeductions.studentLoanPlan || "none"}
                        onChange={(e) => {
                          const plan = e.target.value;
                          const grossPay = payrollData.grossPay;
                          let studentLoanAmount = 0;

                          if (plan !== "none" && grossPay > 0) {
                            const monthlyGross = grossPay;
                            let threshold = 0;
                            let rate = 0;

                            switch (plan) {
                              case "plan1":
                                threshold = 1615;
                                rate = 0.09;
                                break;
                              case "plan2":
                                threshold = 2274;
                                rate = 0.09;
                                break;
                              case "plan4":
                                threshold = 2114;
                                rate = 0.09;
                                break;
                              case "postgrad":
                                threshold = 1750;
                                rate = 0.06;
                                break;
                            }

                            if (monthlyGross > threshold) {
                              studentLoanAmount = (monthlyGross - threshold) * rate;
                            }
                          }

                          setPayrollData((prev) => ({
                            ...prev,
                            taxDeductions: {
                              ...prev.taxDeductions,
                              studentLoanPlan: plan,
                              studentLoan: studentLoanAmount,
                            },
                          }));
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #bae6fd",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      >
                        <option value="none">No Student Loan</option>
                        <option value="plan1">Plan 1 (Pre-2012)</option>
                        <option value="plan2">Plan 2 (2012-2023)</option>
                        <option value="plan4">Plan 4 (Scotland)</option>
                        <option value="postgrad">Postgraduate Loan</option>
                      </select>
                    </div>

                    {payrollData.taxDeductions.studentLoanPlan &&
                      payrollData.taxDeductions.studentLoanPlan !== "none" && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "20px",
                            backgroundColor: "#f0f9ff",
                            borderRadius: "8px",
                            border: "1px solid #bae6fd",
                          }}
                        >
                          <div>
                            <h4
                              style={{
                                color: "#0369a1",
                                fontSize: "16px",
                                margin: "0 0 4px 0",
                              }}
                            >
                              ðŸŽ“ Student Loan
                            </h4>
                            <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
                              {payrollData.taxDeductions.studentLoanPlan === "plan1" &&
                                "Plan 1 - 9% above Â£19,390"}
                              {payrollData.taxDeductions.studentLoanPlan === "plan2" &&
                                "Plan 2 - 9% above Â£27,295"}
                              {payrollData.taxDeductions.studentLoanPlan === "plan4" &&
                                "Plan 4 - 9% above Â£25,375"}
                              {payrollData.taxDeductions.studentLoanPlan === "postgrad" &&
                                "Postgrad - 6% above Â£21,000"}
                            </p>
                          </div>
                          <span
                            style={{ fontSize: "20px", fontWeight: "bold", color: "#0369a1" }}
                          >
                            Â£{(payrollData.taxDeductions.studentLoan || 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Other Deductions */}
                <div
                  style={{
                    marginBottom: "32px",
                    padding: "24px",
                    backgroundColor: "#fefce8",
                    borderRadius: "12px",
                    border: "1px solid #fde047",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: "#a16207",
                      marginBottom: "16px",
                    }}
                  >
                    Other Deductions
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(250px, 1fr))",
                      gap: "20px",
                    }}
                  >
                    <div
                      style={{
                        padding: "16px",
                        backgroundColor: "#fffbeb",
                        borderRadius: "8px",
                        border: "1px solid #fed7aa",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          color: "#a16207",
                          marginBottom: "8px",
                        }}
                      >
                        ðŸ›ï¸ Union Fees
                      </h4>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={payrollData.taxDeductions.unionFees || 0}
                        onChange={(e) =>
                          setPayrollData((prev) => ({
                            ...prev,
                            taxDeductions: {
                              ...prev.taxDeductions,
                              unionFees: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #fed7aa",
                          borderRadius: "4px",
                          marginBottom: "8px",
                        }}
                      />
                      <p style={{ color: "#6b7280", fontSize: "12px", margin: 0 }}>
                        Monthly union membership fee
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "16px",
                        backgroundColor: "#fffbeb",
                        borderRadius: "8px",
                        border: "1px solid #fed7aa",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          color: "#a16207",
                          marginBottom: "8px",
                        }}
                      >
                        ðŸš— Salary Sacrifice
                      </h4>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={payrollData.taxDeductions.salarySacrifice || 0}
                        onChange={(e) =>
                          setPayrollData((prev) => ({
                            ...prev,
                            taxDeductions: {
                              ...prev.taxDeductions,
                              salarySacrifice: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #fed7aa",
                          borderRadius: "4px",
                          marginBottom: "8px",
                        }}
                      />
                      <p style={{ color: "#6b7280", fontSize: "12px", margin: 0 }}>
                        Car scheme, cycle to work, etc.
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "16px",
                        backgroundColor: "#fffbeb",
                        borderRadius: "8px",
                        border: "1px solid #fed7aa",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          color: "#a16207",
                          marginBottom: "8px",
                        }}
                      >
                        ðŸ¥ Private Medical
                      </h4>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={payrollData.taxDeductions.privateMedical || 0}
                        onChange={(e) =>
                          setPayrollData((prev) => ({
                            ...prev,
                            taxDeductions: {
                              ...prev.taxDeductions,
                              privateMedical: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #fed7aa",
                          borderRadius: "4px",
                          marginBottom: "8px",
                        }}
                      />
                      <p style={{ color: "#6b7280", fontSize: "12px", margin: 0 }}>
                        Private health insurance
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "16px",
                        backgroundColor: "#fffbeb",
                        borderRadius: "8px",
                        border: "1px solid #fed7aa",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          color: "#a16207",
                          marginBottom: "8px",
                        }}
                      >
                        ðŸ’³ Childcare Vouchers
                      </h4>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={payrollData.taxDeductions.childcareVouchers || 0}
                        onChange={(e) =>
                          setPayrollData((prev) => ({
                            ...prev,
                            taxDeductions: {
                              ...prev.taxDeductions,
                              childcareVouchers: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #fed7aa",
                          borderRadius: "4px",
                          marginBottom: "8px",
                        }}
                      />
                      <p style={{ color: "#6b7280", fontSize: "12px", margin: 0 }}>
                        Tax-free childcare vouchers
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "16px",
                        backgroundColor: "#fffbeb",
                        borderRadius: "8px",
                        border: "1px solid #fed7aa",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          color: "#a16207",
                          marginBottom: "8px",
                        }}
                      >
                        âš–ï¸ Attachment of Earnings
                      </h4>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={
                          payrollData.taxDeductions.attachmentOfEarnings || 0
                        }
                        onChange={(e) =>
                          setPayrollData((prev) => ({
                            ...prev,
                            taxDeductions: {
                              ...prev.taxDeductions,
                              attachmentOfEarnings:
                                parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #fed7aa",
                          borderRadius: "4px",
                          marginBottom: "8px",
                        }}
                      />
                      <p style={{ color: "#6b7280", fontSize: "12px", margin: 0 }}>
                        Court orders, maintenance, etc.
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "16px",
                        backgroundColor: "#fffbeb",
                        borderRadius: "8px",
                        border: "1px solid #fed7aa",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          color: "#a16207",
                          marginBottom: "8px",
                        }}
                      >
                        ðŸ“± Other Deductions
                      </h4>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={payrollData.taxDeductions.otherDeductions || 0}
                        onChange={(e) =>
                          setPayrollData((prev) => ({
                            ...prev,
                            taxDeductions: {
                              ...prev.taxDeductions,
                              otherDeductions: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #fed7aa",
                          borderRadius: "4px",
                          marginBottom: "8px",
                        }}
                      />
                      <p style={{ color: "#6b7280", fontSize: "12px", margin: 0 }}>
                        Phone, equipment, advances
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total Deductions Summary */}
                <div
                  style={{
                    padding: "24px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    border: "2px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong style={{ color: "#374151", fontSize: "16px" }}>
                        Statutory Deductions:
                      </strong>
                      <strong style={{ color: "#dc2626", fontSize: "16px" }}>
                        Â£
                        {(
                          payrollData.taxDeductions.payeTax +
                          payrollData.taxDeductions.nationalInsurance +
                          payrollData.taxDeductions.pensionContribution +
                          (payrollData.taxDeductions.studentLoan || 0)
                        ).toFixed(2)}
                      </strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong style={{ color: "#374151", fontSize: "16px" }}>
                        Other Deductions:
                      </strong>
                      <strong style={{ color: "#a16207", fontSize: "16px" }}>
                        Â£
                        {(
                          (payrollData.taxDeductions.unionFees || 0) +
                          (payrollData.taxDeductions.salarySacrifice || 0) +
                          (payrollData.taxDeductions.privateMedical || 0) +
                          (payrollData.taxDeductions.childcareVouchers || 0) +
                          (payrollData.taxDeductions.attachmentOfEarnings || 0) +
                          (payrollData.taxDeductions.otherDeductions || 0)
                        ).toFixed(2)}
                      </strong>
                    </div>
                    <hr
                      style={{
                        border: "none",
                        borderTop: "2px solid #e2e8f0",
                        margin: "8px 0",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong style={{ color: "#1f2937", fontSize: "20px" }}>
                        Total Deductions:
                      </strong>
                      <strong style={{ color: "#dc2626", fontSize: "24px" }}>
                        Â£
                        {(
                          payrollData.taxDeductions.payeTax +
                          payrollData.taxDeductions.nationalInsurance +
                          payrollData.taxDeductions.pensionContribution +
                          (payrollData.taxDeductions.studentLoan || 0) +
                          (payrollData.taxDeductions.unionFees || 0) +
                          (payrollData.taxDeductions.salarySacrifice || 0) +
                          (payrollData.taxDeductions.privateMedical || 0) +
                          (payrollData.taxDeductions.childcareVouchers || 0) +
                          (payrollData.taxDeductions.attachmentOfEarnings || 0) +
                          (payrollData.taxDeductions.otherDeductions || 0)
                        ).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Section */}
            {activeSection === "summary" && (
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(20px)",
                  padding: "32px",
                  borderRadius: "12px",
                  boxShadow:
                    "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1f2937",
                    marginBottom: "24px",
                  }}
                >
                  ðŸ“‹ Payroll Summary
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "24px",
                    marginBottom: "32px",
                  }}
                >
                  {/* Earnings */}
                  <div>
                    <h3
                      style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "#059669",
                        marginBottom: "16px",
                      }}
                    >
                      ðŸ’° Earnings
                    </h3>
                    <div
                      style={{
                        padding: "20px",
                        backgroundColor: "#f0fdf4",
                        borderRadius: "8px",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span>Basic Pay:</span>
                        <span>Â£{payrollData.basicPay.toFixed(2)}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span>Overtime:</span>
                        <span>Â£{payrollData.overtime.amount.toFixed(2)}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span>Bonus:</span>
                        <span>Â£{payrollData.bonus.toFixed(2)}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span>Commission:</span>
                        <span>Â£{payrollData.commission.toFixed(2)}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                        }}
                      >
                        <span>Allowances:</span>
                        <span>Â£{payrollData.allowances.toFixed(2)}</span>
                      </div>
                      <hr
                        style={{
                          border: "none",
                          borderTop: "2px solid #bbf7d0",
                          margin: "12px 0",
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontWeight: "bold",
                          fontSize: "18px",
                        }}
                      >
                        <span>Gross Pay:</span>
                        <span style={{ color: "#059669" }}>
                          Â£{payrollData.grossPay.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div>
                    <h3
                      style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "#dc2626",
                        marginBottom: "16px",
                      }}
                    >
                      âž– Deductions
                    </h3>
                    <div
                      style={{
                        padding: "20px",
                        backgroundColor: "#fef2f2",
                        borderRadius: "8px",
                        border: "1px solid #fecaca",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span>PAYE Tax:</span>
                        <span>-Â£{payrollData.taxDeductions.payeTax.toFixed(2)}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span>National Insurance:</span>
                        <span>
                          -Â£{payrollData.taxDeductions.nationalInsurance.toFixed(2)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span>Pension:</span>
                        <span>
                          -Â£{payrollData.taxDeductions.pensionContribution.toFixed(2)}
                        </span>
                      </div>
                      {payrollData.taxDeductions.studentLoan > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "8px",
                          }}
                        >
                          <span>Student Loan:</span>
                          <span>
                            -Â£{payrollData.taxDeductions.studentLoan.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {(payrollData.taxDeductions.unionFees || 0) > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "8px",
                          }}
                        >
                          <span>Union Fees:</span>
                          <span>
                            -Â£{(payrollData.taxDeductions.unionFees || 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {(payrollData.taxDeductions.salarySacrifice || 0) > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "8px",
                          }}
                        >
                          <span>Salary Sacrifice:</span>
                          <span>
                            -Â£
                            {(payrollData.taxDeductions.salarySacrifice || 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <hr
                        style={{
                          border: "none",
                          borderTop: "2px solid #fecaca",
                          margin: "12px 0",
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontWeight: "bold",
                          fontSize: "18px",
                        }}
                      >
                        <span>Total Deductions:</span>
                        <span style={{ color: "#dc2626" }}>
                          -Â£
                          {(
                            payrollData.taxDeductions.payeTax +
                            payrollData.taxDeductions.nationalInsurance +
                            payrollData.taxDeductions.pensionContribution +
                            (payrollData.taxDeductions.studentLoan || 0) +
                            (payrollData.taxDeductions.unionFees || 0) +
                            (payrollData.taxDeductions.salarySacrifice || 0) +
                            (payrollData.taxDeductions.privateMedical || 0) +
                            (payrollData.taxDeductions.childcareVouchers || 0) +
                            (payrollData.taxDeductions.attachmentOfEarnings || 0) +
                            (payrollData.taxDeductions.otherDeductions || 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Pay */}
                <div
                  style={{
                    padding: "32px",
                    backgroundColor: "#f0f9ff",
                    borderRadius: "12px",
                    textAlign: "center",
                    border: "2px solid #3b82f6",
                    marginBottom: "32px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#1e40af",
                      marginBottom: "8px",
                    }}
                  >
                    ðŸ’µ Net Pay
                  </h3>
                  <p
                    style={{
                      fontSize: "48px",
                      fontWeight: "bold",
                      color: "#3b82f6",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Â£{payrollData.netPay.toFixed(2)}
                  </p>
                  <p style={{ fontSize: "16px", color: "#6b7280", margin: 0 }}>
                    Amount to be paid
                  </p>
                </div>

                {/* Action Buttons - NOW WITH FUNCTIONALITY */}
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => {
                      alert(
                        `ðŸ“‹ Payslip Generation\n\nEmployee: ${employee.firstName} ${employee.lastName}\nGross Pay: Â£${payrollData.grossPay.toFixed(
                          2
                        )}\nNet Pay: Â£${payrollData.netPay.toFixed(
                          2
                        )}\n\nPayslip generation feature coming soon!`
                      );
                    }}
                    style={{
                      backgroundColor: "#10b981",
                      color: "white",
                      border: "none",
                      padding: "14px 28px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "16px",
                      cursor: "pointer",
                    }}
                  >
                    ðŸ“‹ Generate Payslip
                  </button>

                  <button
                    onClick={() => {
                      const totalDeductions =
                        payrollData.taxDeductions.payeTax +
                        payrollData.taxDeductions.nationalInsurance +
                        payrollData.taxDeductions.pensionContribution +
                        (payrollData.taxDeductions.studentLoan || 0) +
                        (payrollData.taxDeductions.unionFees || 0) +
                        (payrollData.taxDeductions.salarySacrifice || 0) +
                        (payrollData.taxDeductions.privateMedical || 0) +
                        (payrollData.taxDeductions.childcareVouchers || 0) +
                        (payrollData.taxDeductions.attachmentOfEarnings || 0) +
                        (payrollData.taxDeductions.otherDeductions || 0);

                      const confirmed = window.confirm(
                        `ðŸ’° Process Payment Confirmation\n\n` +
                          `Employee: ${employee.firstName} ${employee.lastName}\n` +
                          `Gross Pay: Â£${payrollData.grossPay.toFixed(2)}\n` +
                          `Total Deductions: Â£${totalDeductions.toFixed(2)}\n` +
                          `Net Pay: Â£${payrollData.netPay.toFixed(
                            2
                          )}\n\n` +
                          `Proceed with payment processing?`
                      );

                      if (confirmed) {
                        alert(
                          `âœ… Payment Processed!\n\nÂ£${payrollData.netPay.toFixed(
                            2
                          )} will be paid to ${employee.firstName} ${
                            employee.lastName
                          }\n\nThis would integrate with your BACS/bank system.`
                        );
                      }
                    }}
                    style={{
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      padding: "14px 28px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "16px",
                      cursor: "pointer",
                    }}
                  >
                    ðŸ’° Process Payment
                  </button>

                  <button
                    onClick={() => {
                      const totalDeductions =
                        payrollData.taxDeductions.payeTax +
                        payrollData.taxDeductions.nationalInsurance +
                        payrollData.taxDeductions.pensionContribution +
                        (payrollData.taxDeductions.studentLoan || 0) +
                        (payrollData.taxDeductions.unionFees || 0) +
                        (payrollData.taxDeductions.salarySacrifice || 0) +
                        (payrollData.taxDeductions.privateMedical || 0) +
                        (payrollData.taxDeductions.childcareVouchers || 0) +
                        (payrollData.taxDeductions.attachmentOfEarnings || 0) +
                        (payrollData.taxDeductions.otherDeductions || 0);

                      const payrollDataExport = {
                        employee: `${employee.firstName} ${employee.lastName}`,
                        employeeNumber: employee.employeeNumber,
                        basicPay: payrollData.basicPay,
                        overtime: payrollData.overtime.amount,
                        bonus: payrollData.bonus,
                        commission: payrollData.commission,
                        allowances: payrollData.allowances,
                        grossPay: payrollData.grossPay,
                        payeTax: payrollData.taxDeductions.payeTax,
                        nationalInsurance:
                          payrollData.taxDeductions.nationalInsurance,
                        pension:
                          payrollData.taxDeductions.pensionContribution,
                        studentLoan: payrollData.taxDeductions.studentLoan,
                        otherDeductions:
                          totalDeductions -
                          (payrollData.taxDeductions.payeTax +
                            payrollData.taxDeductions.nationalInsurance +
                            payrollData.taxDeductions.pensionContribution +
                            (payrollData.taxDeductions.studentLoan || 0)),
                        totalDeductions: totalDeductions,
                        netPay: payrollData.netPay,
                      };

                      console.log("ðŸ“Š Payroll Data Export:", payrollDataExport);
                      alert(
                        `ðŸ“Š Data Exported!\n\nPayroll data for ${employee.firstName} ${employee.lastName} has been logged to browser console.\n\nIn production, this would export to CSV/Excel/PDF.`
                      );
                    }}
                    style={{
                      backgroundColor: "#059669",
                      color: "white",
                      border: "none",
                      padding: "14px 28px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      fontSize: "16px",
                      cursor: "pointer",
                    }}
                  >
                    ðŸ“Š Export Data
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Quick Info */}
          <div>
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                padding: "24px",
                borderRadius: "12px",
                boxShadow:
                  "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                position: "sticky",
                top: "20px",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  marginBottom: "16px",
                }}
              >
                ðŸ‘¤ Employee Info
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>
                    Employee Number:
                  </span>
                  <br />
                  <strong>{employee.employeeNumber}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>
                    Department:
                  </span>
                  <br />
                  <strong>General</strong>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>
                    Start Date:
                  </span>
                  <br />
                  <strong>
                    {new Date(employee.hireDate).toLocaleDateString("en-GB")}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>
                    Status:
                  </span>
                  <br />
                  <strong style={{ color: "#059669" }}>{employee.status}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>
                    Employment Type:
                  </span>
                  <br />
                  <strong>{employee.employmentType}</strong>
                </div>
              </div>

              <hr
                style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "20px 0" }}
              />

              <h4
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  marginBottom: "12px",
                }}
              >
                ðŸ’° Current Pay
              </h4>
              <div
                style={{
                  textAlign: "center",
                  padding: "16px",
                  backgroundColor: "#f0f9ff",
                  borderRadius: "8px",
                  border: "1px solid #bfdbfe",
                }}
              >
                <p
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#3b82f6",
                    margin: "0 0 4px 0",
                  }}
                >
                  Â£{payrollData.netPay.toFixed(2)}
                </p>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                  Net Pay
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "30px",
          }}
        >
          <a
            href="/dashboard/employees"
            style={{ color: "white", textDecoration: "none", fontWeight: "bold" }}
          >
            â† Back to Employees
          </a>

          <a
            href="/dashboard/payroll"
            style={{ color: "white", textDecoration: "none", fontWeight: "bold" }}
          >
            Go to Payroll â†’
          </a>
        </div>
      </div>
    </div>
  );
}

