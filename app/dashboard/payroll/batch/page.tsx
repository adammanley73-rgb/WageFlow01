/* @ts-nocheck */
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  id: string;
  employeeId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  annualSalary: number;
  status: string;
  department?: string;
  payFrequency: "weekly" | "bi-weekly" | "monthly"; // Individual employee pay frequency
};

type PayFrequency = "weekly" | "bi-weekly" | "monthly";

type PayrollEntry = {
  employeeId: string;
  employee: Employee;
  basicPay: number;
  overtime: number;
  bonus: number;
  grossPay: number;
  taxDeductions: number;
  nationalInsurance: number;
  pensionContribution: number;
  totalDeductions: number;
  netPay: number;
  selected: boolean;
  payFrequency: PayFrequency;
};

export default function BatchPayrollPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  // Pay frequency filter selection
  const [selectedPayFrequency, setSelectedPayFrequency] =
    useState<PayFrequency>("monthly");

  const [payPeriod, setPayPeriod] = useState({
    startDate: "",
    endDate: "",
    payDate: "",
  });

  // ---------- Styles ----------
  const styles = {
    container: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background:
        "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
      minHeight: "100vh",
      padding: "40px 20px",
    },
    maxWidth: { maxWidth: "1400px", margin: "0 auto" },

    headerCard: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",
      padding: "24px 32px",
      borderRadius: "12px",
      boxShadow:
        "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
      marginBottom: "24px",
      border: "1px solid rgba(255,255,255,0.2)",
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
    },
    h1: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "#1f2937",
      margin: "0 0 8px 0",
    },
    subtitle: { fontSize: "16px", color: "#6b7280", margin: 0 },
    backBtn: {
      padding: "8px 16px",
      backgroundColor: "#f3f4f6",
      color: "#4b5563",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: 600,
      cursor: "pointer",
    },

    // Filter card
    filterCard: {
      marginBottom: "24px",
      padding: "16px",
      backgroundColor: "#eff6ff",
      borderRadius: "8px",
      border: "1px solid #bfdbfe",
    },
    filterTitle: {
      fontSize: "16px",
      fontWeight: "bold",
      color: "#1e40af",
      margin: "0 0 12px 0",
    },
    radioRow: { display: "flex", gap: "16px", alignItems: "center" },
    radioLabel: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
    },
    radioText: { fontSize: "14px", fontWeight: 600, color: "#1e40af" },
    filterHint: { fontSize: "12px", color: "#6b7280", margin: "8px 0 0 0" },

    // Pay period
    periodGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "16px",
      marginBottom: "24px",
    },
    label: {
      display: "block",
      marginBottom: "4px",
      fontWeight: 500,
      color: "#374151",
    },
    input: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "14px",
      backgroundColor: "#ffffff",
    },

    // Stats
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "16px",
    },
    statCardBlue: {
      textAlign: "center",
      padding: "16px",
      backgroundColor: "#f0f9ff",
      borderRadius: "8px",
      border: "1px solid #bfdbfe",
    },
    statCardGreen: {
      textAlign: "center",
      padding: "16px",
      backgroundColor: "#f0fdf4",
      borderRadius: "8px",
      border: "1px solid #bbf7d0",
    },
    statCardRed: {
      textAlign: "center",
      padding: "16px",
      backgroundColor: "#fef2f2",
      borderRadius: "8px",
      border: "1px solid #fecaca",
    },
    statBig: { fontSize: "24px", fontWeight: "bold", color: "#1f2937" },
    statBigBlue: { fontSize: "20px", fontWeight: "bold", color: "#3b82f6" },
    statBigGreen: { fontSize: "20px", fontWeight: "bold", color: "#059669" },
    statBigRed: { fontSize: "20px", fontWeight: "bold", color: "#dc2626" },
    statLabel: { fontSize: "12px", color: "#6b7280", fontWeight: 600 },

    // Table card
    tableCard: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",
      padding: "24px",
      borderRadius: "12px",
      boxShadow:
        "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
      marginBottom: "24px",
      border: "1px solid rgba(255,255,255,0.2)",
    },
    tableHeader: {
      marginBottom: "16px",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "8px",
    },
    tableHeaderRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    tableTitle: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "#1f2937",
      margin: 0,
    },
    selectAllLabel: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "14px",
      fontWeight: 600,
      color: "#374151",
    },
    selectAllCheckbox: { margin: 0, transform: "scale(1.2)" },

    noEmployeesWrap: {
      padding: "24px",
      textAlign: "center",
      backgroundColor: "#f9fafb",
      borderRadius: "8px",
    },
    noEmployeesTitle: { fontSize: "16px", fontWeight: 700, color: "#374151" },

    thLeft: {
      padding: "12px",
      textAlign: "left" as const,
      fontSize: "12px",
      fontWeight: 700,
      color: "#374151",
      textTransform: "uppercase" as const,
      backgroundColor: "#f9fafb",
      borderBottom: "2px solid #e5e7eb",
    },
    thRight: {
      padding: "12px",
      textAlign: "right" as const,
      fontSize: "12px",
      fontWeight: 700,
      color: "#374151",
      textTransform: "uppercase" as const,
      backgroundColor: "#f9fafb",
      borderBottom: "2px solid #e5e7eb",
    },
    row: { borderBottom: "1px solid #e5e7eb" },
    tdCenter: { padding: "16px", textAlign: "center" as const },
    employeeName: { fontSize: "14px", fontWeight: 600, color: "#1f2937" },
    freqCell: { padding: "16px" },
    freqBadge: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: "999px",
      backgroundColor: "#f3f4f6",
      border: "1px solid #e5e7eb",
      fontSize: "12px",
      fontWeight: 600,
      color: "#374151",
      textTransform: "capitalize" as const,
    },
    tdMoneyRightGreen: {
      padding: "16px",
      textAlign: "right" as const,
      fontSize: "14px",
      fontWeight: 600,
      color: "#059669",
    },
    tdMoneyRightRed: {
      padding: "16px",
      textAlign: "right" as const,
      fontSize: "14px",
      fontWeight: 600,
      color: "#dc2626",
    },
    tdMoneyRightBlue: {
      padding: "16px",
      textAlign: "right" as const,
      fontSize: "14px",
      fontWeight: 700,
      color: "#3b82f6",
    },

    // Footer / process
    processWrap: {
      textAlign: "center" as const,
      marginTop: "16px",
      marginBottom: "24px",
    },
    processBtn: {
      backgroundColor: "#10b981",
      color: "white",
      border: "none",
      padding: "16px 32px",
      borderRadius: "8px",
      fontSize: "16px",
      fontWeight: "bold",
      cursor: "pointer",
      marginBottom: "12px",
    },
    processBtnDisabled: {
      backgroundColor: "#9ca3af",
      color: "white",
      border: "none",
      padding: "16px 32px",
      borderRadius: "8px",
      fontSize: "16px",
      fontWeight: "bold",
      cursor: "not-allowed",
      marginBottom: "12px",
    },
    processHint: { fontSize: "14px", color: "#6b7280", margin: 0 },
  } as const;
  // ---------- End styles ----------

  // Calculate pay based on frequency
  const calculatePayForFrequency = (
    annualSalary: number,
    frequency: PayFrequency
  ) => {
    switch (frequency) {
      case "weekly":
        return annualSalary / 52;
      case "bi-weekly":
        return annualSalary / 26;
      case "monthly":
      default:
        return annualSalary / 12;
    }
  };

  // Load employees with demo pay frequency data
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await fetch("/api/employees");
        if (response.ok) {
          const data = await response.json();

          // Demo: distribute across frequencies (normally comes from DB)
          const employeesWithFrequency: Employee[] = (data as any[]).map(
            (employee: any, index: number) => ({
              ...employee,
              payFrequency:
                index % 3 === 0
                  ? "weekly"
                  : index % 3 === 1
                  ? "bi-weekly"
                  : "monthly",
            })
          );

          setEmployees(employeesWithFrequency);
          calculatePayrollEntries(employeesWithFrequency, selectedPayFrequency);
        }
      } catch (error) {
        console.error("Failed to load employees:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  // Recalculate when pay frequency filter changes
  useEffect(() => {
    if (employees.length > 0) {
      calculatePayrollEntries(employees, selectedPayFrequency);
    }
  }, [selectedPayFrequency, employees]);

  const calculatePayrollEntries = (
    employeeData: Employee[],
    filterFrequency: PayFrequency
  ) => {
    const entries: PayrollEntry[] = employeeData.map((employee) => {
      const isMatchingFrequency = employee.payFrequency === filterFrequency;

      const basicPay = calculatePayForFrequency(
        employee.annualSalary || 0,
        employee.payFrequency
      );
      const taxDeductions = calculateTax(basicPay, employee.payFrequency);
      const nationalInsurance = calculateNI(basicPay, employee.payFrequency);
      const pensionContribution = basicPay * 0.05;
      const totalDeductions =
        taxDeductions + nationalInsurance + pensionContribution;

      return {
        employeeId: employee.id,
        employee,
        basicPay,
        overtime: 0,
        bonus: 0,
        grossPay: basicPay,
        taxDeductions,
        nationalInsurance,
        pensionContribution,
        totalDeductions,
        netPay: basicPay - totalDeductions,
        selected: isMatchingFrequency,
        payFrequency: employee.payFrequency,
      };
    });

    setPayrollEntries(entries);

    const matchingEmployees = entries.filter(
      (entry) => entry.employee.payFrequency === filterFrequency
    );
    setSelectAll(
      matchingEmployees.length > 0 &&
        matchingEmployees.every((entry) => entry.selected)
    );
  };

  // UK tax calculation with frequency adjustment
  const calculateTax = (grossPay: number, frequency: PayFrequency) => {
    const annualGross =
      frequency === "weekly"
        ? grossPay * 52
        : frequency === "bi-weekly"
        ? grossPay * 26
        : grossPay * 12;
    const annualAllowance = 12570; // 2025-26 personal allowance
    const annualTaxableIncome = Math.max(0, annualGross - annualAllowance);
    const annualTax = annualTaxableIncome * 0.2; // 20% basic rate

    return frequency === "weekly"
      ? annualTax / 52
      : frequency === "bi-weekly"
      ? annualTax / 26
      : annualTax / 12;
  };

  // UK National Insurance calculation with frequency adjustment
  const calculateNI = (grossPay: number, frequency: PayFrequency) => {
    const annualGross =
      frequency === "weekly"
        ? grossPay * 52
        : frequency === "bi-weekly"
        ? grossPay * 26
        : grossPay * 12;
    const annualThreshold = 12570; // 2025-26 NI threshold
    const annualNI = Math.max(0, (annualGross - annualThreshold) * 0.12); // 12% rate

    return frequency === "weekly"
      ? annualNI / 52
      : frequency === "bi-weekly"
      ? annualNI / 26
      : annualNI / 12;
  };

  // Toggle individual employee selection (only for matching frequency)
  const toggleEmployeeSelection = (employeeId: string) => {
    const entry = payrollEntries.find((e) => e.employeeId === employeeId);
    if (entry && entry.employee.payFrequency === selectedPayFrequency) {
      setPayrollEntries((prev) =>
        prev.map((e) =>
          e.employeeId === employeeId ? { ...e, selected: !e.selected } : e
        )
      );
    }
  };

  // Toggle select all (only for matching frequency employees)
  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);

    setPayrollEntries((prev) =>
      prev.map((entry) =>
        entry.employee.payFrequency === selectedPayFrequency
          ? { ...entry, selected: newSelectAll }
          : entry
      )
    );
  };

  // Process batch payroll
  const processBatchPayroll = async () => {
    const selectedEntries = payrollEntries.filter((entry) => entry.selected);

    if (selectedEntries.length === 0) {
      alert("Please select at least one employee to process payroll.");
      return;
    }

    if (!payPeriod.startDate || !payPeriod.endDate || !payPeriod.payDate) {
      alert("Please fill in all pay period dates.");
      return;
    }

    setProcessing(true);

    try {
      const payrollRun = {
        type: "batch",
        payFrequency: selectedPayFrequency,
        payPeriod,
        entries: selectedEntries.map((entry) => ({
          employeeId: entry.employeeId,
          employee: {
            name: `${entry.employee.firstName} ${entry.employee.lastName}`,
            employeeNumber: entry.employee.employeeNumber,
            email: entry.employee.email,
          },
          earnings: {
            basicPay: entry.basicPay,
            overtime: entry.overtime,
            bonus: entry.bonus,
            gross: entry.grossPay,
          },
          deductions: {
            incomeTax: entry.taxDeductions,
            nationalInsurance: entry.nationalInsurance,
            pensionEmployee: entry.pensionContribution,
            total: entry.totalDeductions,
          },
          netPay: entry.netPay,
          payFrequency: entry.payFrequency,
        })),
        totals: {
          grossPay: selectedEntries.reduce(
            (sum, entry) => sum + entry.grossPay,
            0
          ),
          totalDeductions: selectedEntries.reduce(
            (sum, entry) => sum + entry.totalDeductions,
            0
          ),
          netPay: selectedEntries.reduce((sum, entry) => sum + entry.netPay, 0),
        },
        employeeCount: selectedEntries.length,
        status: "draft",
        createdAt: new Date().toISOString(),
      };

      const response = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payrollRun),
      });

      if (response.ok) {
        await response.json();
        alert(
          `âœ… ${
            selectedPayFrequency.charAt(0).toUpperCase() +
            selectedPayFrequency.slice(1)
          } Batch Payroll Created!\n\nðŸ“Š Summary:\nâ€¢ Pay Frequency: ${
            selectedPayFrequency.charAt(0).toUpperCase() +
            selectedPayFrequency.slice(1)
          }\nâ€¢ ${selectedEntries.length} employees processed\nâ€¢ Total Net Pay: Â£${payrollRun.totals.netPay.toFixed(
            2
          )}`
        );
        router.push("/dashboard/payroll");
      } else {
        throw new Error("Failed to create batch payroll run");
      }
    } catch (error) {
      console.error("Batch payroll processing failed:", error);
      alert("âŒ Failed to create batch payroll run. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
          padding: "40px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "white" }}>
          <h1>Loading Batch Payroll...</h1>
          <p>Fetching employee data...</p>
        </div>
      </div>
    );
  }

  // Calculate stats for display
  const matchingEmployees = payrollEntries.filter(
    (entry) => entry.employee.payFrequency === selectedPayFrequency
  );
  const selectedCount = matchingEmployees.filter((e) => e.selected).length;
  const selectedTotals = matchingEmployees
    .filter((e) => e.selected)
    .reduce(
      (acc, entry) => ({
        grossPay: acc.grossPay + entry.grossPay,
        totalDeductions: acc.totalDeductions + entry.totalDeductions,
        netPay: acc.netPay + entry.netPay,
      }),
      { grossPay: 0, totalDeductions: 0, netPay: 0 }
    );

  // Count employees by frequency for info
  const frequencyCounts = {
    weekly: employees.filter((emp) => emp.payFrequency === "weekly").length,
    "bi-weekly": employees.filter((emp) => emp.payFrequency === "bi-weekly")
      .length,
    monthly: employees.filter((emp) => emp.payFrequency === "monthly").length,
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.headerCard}>
          <div style={styles.headerRow}>
            <div>
              <h1 style={styles.h1}>ðŸ“Š Batch Payroll Processing</h1>
              <p style={styles.subtitle}>
                Process payroll for employees by their individual pay
                frequencies
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/payroll")}
              style={styles.backBtn}
            >
              â† Back to Payroll
            </button>
          </div>

          {/* Pay Frequency Filter Selection */}
          <div style={styles.filterCard}>
            <h3 style={styles.filterTitle}>ðŸ” Filter by Pay Frequency</h3>
            <div style={styles.radioRow}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="payFrequencyFilter"
                  value="weekly"
                  checked={selectedPayFrequency === "weekly"}
                  onChange={(e) =>
                    setSelectedPayFrequency(e.target.value as PayFrequency)
                  }
                  style={{ margin: 0 }}
                />
                <span style={styles.radioText}>
                  ðŸ“… Weekly ({frequencyCounts.weekly} employees)
                </span>
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="payFrequencyFilter"
                  value="bi-weekly"
                  checked={selectedPayFrequency === "bi-weekly"}
                  onChange={(e) =>
                    setSelectedPayFrequency(e.target.value as PayFrequency)
                  }
                  style={{ margin: 0 }}
                />
                <span style={styles.radioText}>
                  ðŸ“… Bi-Weekly ({frequencyCounts["bi-weekly"]} employees)
                </span>
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="payFrequencyFilter"
                  value="monthly"
                  checked={selectedPayFrequency === "monthly"}
                  onChange={(e) =>
                    setSelectedPayFrequency(e.target.value as PayFrequency)
                  }
                  style={{ margin: 0 }}
                />
                <span style={styles.radioText}>
                  ðŸ—“ï¸ Monthly ({frequencyCounts.monthly} employees)
                </span>
              </label>
            </div>
            <p style={styles.filterHint}>
              Only employees with {selectedPayFrequency} pay frequency will be
              available for selection.
            </p>
          </div>

          {/* Pay Period Settings */}
          <div style={styles.periodGrid}>
            <div>
              <label style={styles.label}>Pay Period Start</label>
              <input
                type="date"
                value={payPeriod.startDate}
                onChange={(e) =>
                  setPayPeriod((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Pay Period End</label>
              <input
                type="date"
                value={payPeriod.endDate}
                onChange={(e) =>
                  setPayPeriod((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Payment Date</label>
              <input
                type="date"
                value={payPeriod.payDate}
                onChange={(e) =>
                  setPayPeriod((prev) => ({
                    ...prev,
                    payDate: e.target.value,
                  }))
                }
                style={styles.input}
              />
            </div>
          </div>

          {/* Summary Stats */}
          <div style={styles.statsGrid}>
            <div style={styles.statCardBlue}>
              <div style={styles.statBig}>{selectedCount}</div>
              <div style={styles.statLabel}>
                Selected ({selectedPayFrequency})
              </div>
            </div>
            <div style={styles.statCardBlue}>
              <div style={styles.statBig}>{matchingEmployees.length}</div>
              <div style={styles.statLabel}>
                Available ({selectedPayFrequency})
              </div>
            </div>
            <div style={styles.statCardGreen}>
              <div style={styles.statBigGreen}>
                Â£
                {selectedTotals.grossPay.toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div style={styles.statLabel}>Total Gross Pay</div>
            </div>
            <div style={styles.statCardBlue}>
              <div style={styles.statBigBlue}>
                Â£
                {selectedTotals.netPay.toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div style={styles.statLabel}>Total Net Pay</div>
            </div>
          </div>
        </div>

        {/* Employee Selection Table */}
        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <div style={styles.tableHeaderRow}>
              <h2 style={styles.tableTitle}>
                {selectedPayFrequency.charAt(0).toUpperCase() +
                  selectedPayFrequency.slice(1)}{" "}
                Employees ({matchingEmployees.length})
              </h2>
              {matchingEmployees.length > 0 && (
                <label style={styles.selectAllLabel}>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    style={styles.selectAllCheckbox}
                  />
                  <span>
                    Select All {selectedPayFrequency} employees
                  </span>
                </label>
              )}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            {matchingEmployees.length === 0 ? (
              <div style={styles.noEmployeesWrap}>
                <div style={styles.noEmployeesTitle}>
                  ðŸ“… No {selectedPayFrequency} employees found
                </div>
                <p style={{ fontSize: "12px", color: "#6b7280" }}>
                  There are no employees with {selectedPayFrequency} pay
                  frequency in your system.
                </p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={styles.thLeft}>Select</th>
                    <th style={styles.thLeft}>Employee</th>
                    <th style={styles.thLeft}>Pay Frequency</th>
                    <th style={styles.thRight}>
                      {selectedPayFrequency.charAt(0).toUpperCase() +
                        selectedPayFrequency.slice(1)}{" "}
                      Gross
                    </th>
                    <th style={styles.thRight}>Deductions</th>
                    <th style={styles.thRight}>
                      {selectedPayFrequency.charAt(0).toUpperCase() +
                        selectedPayFrequency.slice(1)}{" "}
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matchingEmployees.map((entry) => (
                    <tr key={entry.employeeId} style={styles.row}>
                      <td style={styles.tdCenter}>
                        <input
                          type="checkbox"
                          checked={entry.selected}
                          onChange={() =>
                            toggleEmployeeSelection(entry.employeeId)
                          }
                          style={{ margin: 0, transform: "scale(1.2)" }}
                        />
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div>
                          <div style={styles.employeeName}>
                            {entry.employee.firstName} {entry.employee.lastName}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            {entry.employee.employeeNumber} â€¢ Â£
                            {entry.employee.annualSalary?.toLocaleString(
                              "en-GB"
                            ) || 0}
                            /year
                          </div>
                        </div>
                      </td>
                      <td style={styles.freqCell}>
                        <span style={styles.freqBadge}>
                          {entry.employee.payFrequency}
                        </span>
                      </td>
                      <td style={styles.tdMoneyRightGreen}>
                        Â£{entry.grossPay.toFixed(2)}
                      </td>
                      <td style={styles.tdMoneyRightRed}>
                        -Â£{entry.totalDeductions.toFixed(2)}
                      </td>
                      <td style={styles.tdMoneyRightBlue}>
                        Â£{entry.netPay.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Process Button */}
        {matchingEmployees.length > 0 && (
          <div style={styles.processWrap}>
            <button
              onClick={processBatchPayroll}
              disabled={processing || selectedCount === 0}
              style={
                processing || selectedCount === 0
                  ? styles.processBtnDisabled
                  : styles.processBtn
              }
            >
              {processing
                ? "ðŸ”„ Processing..."
                : `ðŸš€ Process ${selectedCount} ${selectedPayFrequency} Employee${
                    selectedCount !== 1 ? "s" : ""
                  }`}
            </button>

            <p style={styles.processHint}>
              This will create a {selectedPayFrequency} payroll run for{" "}
              {selectedCount} selected employees with total net pay of Â£
              {selectedTotals.netPay.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

