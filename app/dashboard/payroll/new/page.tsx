"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEMO_EMPLOYEES } from "../../../lib/data/employees";

type Employee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  annualSalary: number;
  status: string;
  selected?: boolean;
};

type PayrollCalculation = {
  employeeId: string;
  employeeName: string;
  grossPay: number;
  taxDeduction: number;
  niDeduction: number;
  pensionDeduction: number;
  netPay: number;
};

export default function NewPayrollRunPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calculations, setCalculations] = useState<PayrollCalculation[]>([]);

  const [formData, setFormData] = useState({
    payrollName: "",
    payPeriodStart: "",
    payPeriodEnd: "",
    payDate: "",
    payFrequency: "monthly",
  });

  useEffect(() => {
    console.log("Loading employees for payroll run...");

    const timer = setTimeout(() => {
      // Convert shared employee data for payroll use
      const payrollEmployees = DEMO_EMPLOYEES.map((emp) => ({
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        annualSalary: emp.annualSalary,
        status: emp.status,
        selected: true, // Default to selected for payroll
      }));

      console.log("Loaded employees for payroll:", payrollEmployees);
      setEmployees(payrollEmployees);

      // Auto-generate payroll details
      const now = new Date();
      const year = now.getFullYear();
      const month = now.toLocaleDateString("en-GB", { month: "long" });
      setFormData((prev) => ({
        ...prev,
        payrollName: `Monthly Payroll - ${month} ${year}`,
        payPeriodStart: new Date(year, now.getMonth(), 1)
          .toISOString()
          .split("T")[0],
        payPeriodEnd: new Date(year, now.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0],
        payDate: new Date(year, now.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0],
      }));

      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const calculatePayroll = async () => {
    setCalculating(true);
    console.log("Starting payroll calculation...");

    const selectedEmployees = employees.filter((emp) => emp.selected);
    console.log("Selected employees for calculation:", selectedEmployees);

    // Simulate calculation delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const calculatedPayroll: PayrollCalculation[] = selectedEmployees.map(
      (employee) => {
        const monthlyGross = employee.annualSalary / 12;
        const personalAllowance = 12570; // 2025/26 tax year
        const taxableIncome = Math.max(
          0,
          employee.annualSalary - personalAllowance
        );
        const monthlyTaxableIncome = taxableIncome / 12;
        const taxDeduction = monthlyTaxableIncome * 0.2; // Basic rate 20%

        const niThreshold = 12570; // Lower earnings limit
        const niableIncome = Math.max(0, employee.annualSalary - niThreshold);
        const monthlyNiableIncome = niableIncome / 12;
        const niDeduction = monthlyNiableIncome * 0.12; // Employee NI rate 12%

        const pensionDeduction = monthlyGross * 0.05; // 5% auto-enrollment
        const netPay =
          monthlyGross - taxDeduction - niDeduction - pensionDeduction;

        return {
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          grossPay: Math.round(monthlyGross * 100) / 100,
          taxDeduction: Math.round(taxDeduction * 100) / 100,
          niDeduction: Math.round(niDeduction * 100) / 100,
          pensionDeduction: Math.round(pensionDeduction * 100) / 100,
          netPay: Math.round(netPay * 100) / 100,
        };
      }
    );

    console.log("Payroll calculations completed:", calculatedPayroll);
    setCalculations(calculatedPayroll);
    setCalculating(false);
  };

  const submitPayrollRun = async () => {
    setSubmitting(true);
    console.log("Submitting payroll run...");

    try {
      const payrollData = {
        ...formData,
        calculations,
        selectedEmployees: employees.filter((emp) => emp.selected).length,
        totalGross: calculations.reduce((sum, calc) => sum + calc.grossPay, 0),
        totalNet: calculations.reduce((sum, calc) => sum + calc.netPay, 0),
      };

      console.log("Payroll run data:", payrollData);

      // Simulate API submission
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("Payroll run created successfully");
      alert("Payroll run created successfully!");

      // Success - redirect to payroll dashboard
      router.push("/dashboard/payroll");
    } catch (error) {
      console.error("Failed to create payroll run:", error);
      alert("Failed to create payroll run. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const getTotals = () => {
    return calculations.reduce(
      (acc, calc) => ({
        grossPay: acc.grossPay + calc.grossPay,
        taxDeduction: acc.taxDeduction + calc.taxDeduction,
        niDeduction: acc.niDeduction + calc.niDeduction,
        pensionDeduction: acc.pensionDeduction + calc.pensionDeduction,
        netPay: acc.netPay + calc.netPay,
      }),
      {
        grossPay: 0,
        taxDeduction: 0,
        niDeduction: 0,
        pensionDeduction: 0,
        netPay: 0,
      }
    );
  };

  const selectedCount = employees.filter((emp) => emp.selected).length;
  const totals = getTotals();

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
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <h1 style={{ color: "#1f2937", margin: "0" }}>
            Loading New Payroll Run...
          </h1>
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
              💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> New Payroll
              Run
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "8px 0 0 0",
              }}
            >
              Set up and process payroll for your employees
            </p>
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

        {/* Payroll Details Form */}
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
            Payroll Details
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "24px",
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
                Payroll Name *
              </label>
              <input
                type="text"
                required
                value={formData.payrollName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    payrollName: e.target.value,
                  }))
                }
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
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Pay Frequency
              </label>
              <select
                value={formData.payFrequency}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    payFrequency: e.target.value,
                  }))
                }
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
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
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
                Pay Period Start *
              </label>
              <input
                type="date"
                required
                value={formData.payPeriodStart}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    payPeriodStart: e.target.value,
                  }))
                }
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
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Pay Period End *
              </label>
              <input
                type="date"
                required
                value={formData.payPeriodEnd}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    payPeriodEnd: e.target.value,
                  }))
                }
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
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Pay Date *
              </label>
              <input
                type="date"
                required
                value={formData.payDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, payDate: e.target.value }))
                }
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
        </div>

        {/* Employee Selection */}
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
              Select Employees ({selectedCount} selected)
            </h2>
            <button
              type="button"
              onClick={calculatePayroll}
              disabled={selectedCount === 0 || calculating}
              style={{
                backgroundColor:
                  selectedCount === 0 || calculating ? "#9ca3af" : "#10b981",
                color: "#000000",
                fontWeight: "bold",
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                fontSize: "16px",
                cursor:
                  selectedCount === 0 || calculating
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {calculating ? "Calculating..." : "£ Calculate Payroll"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {employees.map((employee) => (
              <div
                key={employee.id}
                style={{
                  backgroundColor: "#f8fafc",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={employee.selected || false}
                    onChange={(e) => {
                      console.log(
                        `Toggling employee ${employee.id} selection:`,
                        e.target.checked
                      );
                      setEmployees((prev) =>
                        prev.map((emp) =>
                          emp.id === employee.id
                            ? { ...emp, selected: e.target.checked }
                            : emp
                        )
                      );
                    }}
                    style={{
                      width: "16px",
                      height: "16px",
                      marginTop: "2px",
                    }}
                  />
                  <div>
                    <div
                      style={{ fontWeight: 600, color: "#1f2937" }}
                    >{`${employee.firstName} ${employee.lastName}`}</div>
                    <div style={{ fontSize: "14px", color: "#6b7280" }}>
                      {employee.employeeNumber} •{" "}
                      {formatCurrency(employee.annualSalary)} annually
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>

          {employees.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <p style={{ fontSize: "16px", color: "#6b7280" }}>
                No employees found. Please add employees before creating a
                payroll run.
              </p>
              <a
                href="/dashboard/employees/new"
                style={{
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                  fontWeight: "bold",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "16px",
                }}
              >
                👤 Add Employee
              </a>
            </div>
          )}
        </div>

        {/* Payroll Calculations */}
        {calculations.length > 0 && (
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
              Payroll Calculations
            </h2>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{ width: "100%", borderCollapse: "collapse" }}
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
                      Employee
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
                      Gross Pay
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
                      Tax
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
                      National Insurance
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
                      Pension
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
                      Net Pay
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.map((calc) => (
                    <tr key={calc.employeeId}>
                      <td
                        style={{
                          padding: "16px",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <div
                          style={{ fontWeight: 500, color: "#1f2937" }}
                        >
                          {calc.employeeName}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "16px",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <span
                          style={{ fontWeight: 600, color: "#059669" }}
                        >
                          {formatCurrency(calc.grossPay)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "16px",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <span style={{ color: "#dc2626" }}>
                          {formatCurrency(calc.taxDeduction)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "16px",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <span style={{ color: "#dc2626" }}>
                          {formatCurrency(calc.niDeduction)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "16px",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <span style={{ color: "#92400e" }}>
                          {formatCurrency(calc.pensionDeduction)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "16px",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <span
                          style={{ fontWeight: 600, color: "#059669" }}
                        >
                          {formatCurrency(calc.netPay)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr
                    style={{
                      backgroundColor: "#f8fafc",
                      fontWeight: "bold",
                    }}
                  >
                    <td
                      style={{
                        padding: "16px",
                        fontWeight: "bold",
                        color: "#1f2937",
                      }}
                    >
                      TOTALS
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{ fontWeight: "bold", color: "#059669" }}
                      >
                        {formatCurrency(totals.grossPay)}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{ fontWeight: "bold", color: "#dc2626" }}
                      >
                        {formatCurrency(totals.taxDeduction)}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{ fontWeight: "bold", color: "#dc2626" }}
                      >
                        {formatCurrency(totals.niDeduction)}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{ fontWeight: "bold", color: "#92400e" }}
                      >
                        {formatCurrency(totals.pensionDeduction)}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{ fontWeight: "bold", color: "#059669" }}
                      >
                        {formatCurrency(totals.netPay)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Submit Button */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                justifyContent: "flex-end",
                marginTop: "24px",
              }}
            >
              <a
                href="/dashboard/payroll"
                style={{
                  backgroundColor: "#6b7280",
                  color: "#ffffff",
                  fontWeight: "bold",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "16px",
                }}
              >
                Cancel
              </a>
              <button
                type="button"
                onClick={submitPayrollRun}
                disabled={submitting}
                style={{
                  backgroundColor: submitting ? "#9ca3af" : "#10b981",
                  color: "#000000",
                  fontWeight: "bold",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "16px",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Creating Payroll Run..." : "£ Create Payroll Run"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
