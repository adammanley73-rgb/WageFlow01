"use client";
import React, { useEffect, useMemo, useState } from "react";
import { DEMO_EMPLOYEES, type Employee } from "../lib/data/employees";

// ---------- Date + calc helpers ----------
function parseDateISO(input: string | Date): Date | null {
  if (input instanceof Date) return isNaN(input.getTime()) ? null : new Date(input.getTime());
  const date = new Date(input);
  return isNaN(date.getTime()) ? null : date;
}

function addDaysUTC(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatDateUK(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function yearsBetweenUTC(dob: Date, ref: Date): number {
  let y = ref.getUTCFullYear() - dob.getUTCFullYear();
  const before =
    ref.getUTCMonth() < dob.getUTCMonth() ||
    (ref.getUTCMonth() === dob.getUTCMonth() && ref.getUTCDate() < dob.getUTCDate());
  if (before) y -= 1;
  return y;
}

function calcEnrollDateFrom(today: Date): string {
  return formatDateUK(addDaysUTC(today, 42)); // 6 weeks
}

function qualifyEarnings(annualSalary: number) {
  const LEL = 6240;
  const UEL = 50270;
  const top = Math.max(LEL, UEL);
  const bottom = Math.min(LEL, UEL);
  const qe = Math.max(0, Math.min(annualSalary, top) - bottom);
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const employee = round2(qe * 0.05);
  const employer = round2(qe * 0.03);
  return {
    qe: round2(qe),
    employee,
    employer,
    total: round2(employee + employer),
  };
}

// ---------- Styles ----------
const S = {
  page: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    background:
      "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
    minHeight: "100vh",
    padding: "40px 20px",
  } as const,
  container: { maxWidth: "1100px", margin: "0 auto" } as const,
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
  headerTitle: { fontSize: "28px", fontWeight: "bold", color: "#1f2937", margin: 0 } as const,
  headerSubtitle: { color: "#6b7280", margin: "8px 0 0 0" } as const,
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

  // Loading
  loadingOuter: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    background:
      "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
    minHeight: "100vh",
    padding: "40px 20px",
  } as const,
  loadingInner: { maxWidth: "800px", margin: "0 auto", textAlign: "center" } as const,

  // Stats grid
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  } as const,
  statCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "16px",
    textAlign: "center" as const,
  },
  statNumber: { fontSize: "28px", fontWeight: 800, color: "#111827" } as const,
  statNumberAlt: { fontSize: "28px", fontWeight: 800, color: "#166534" } as const,
  statNumberWarn: { fontSize: "28px", fontWeight: 800, color: "#92400e" } as const,
  statLabel: { color: "#6b7280", fontSize: "13px" } as const,
  statSub: { color: "#9ca3af", fontSize: "12px" } as const,

  // Dashboard
  dashCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "24px 32px",
  } as const,
  dashHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "12px",
  } as const,
  dashH2: { fontSize: "20px", fontWeight: "bold", color: "#1f2937", margin: 0 } as const,
  dashP: { color: "#6b7280", margin: 0 } as const,

  tableWrap: { overflowX: "auto", marginTop: "12px" } as const,
  table: {
    width: "100%",
    minWidth: "900px",
    borderCollapse: "separate",
    borderSpacing: 0,
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
  } as const,
  th: {
    textAlign: "left",
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: "#6b7280",
    padding: "12px 16px",
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap" as const,
  } as const,
  tr: { cursor: "pointer" } as const,
  trExpanded: { backgroundColor: "#f8fafc", cursor: "pointer" } as const,
  td: { padding: "12px 16px", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" } as const,
  empName: { fontWeight: 600, color: "#111827" } as const,
  empMeta: { fontSize: "12px", color: "#6b7280" } as const,
  link: { color: "#3b82f6", textDecoration: "none", fontWeight: 600 } as const,
  chipAge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "999px",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 600,
  } as const,
  salary: { fontWeight: 600, color: "#111827" } as const,
  enrollBy: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "999px",
    backgroundColor: "#ecfeff",
    color: "#0369a1",
    fontSize: "12px",
    fontWeight: 600,
  } as const,
  amtEmployer: { color: "#0f766e", fontWeight: 600 } as const,
  amtEmployee: { color: "#1e3a8a", fontWeight: 600 } as const,

  detailsOuter: {
    backgroundColor: "#f8fafc",
    borderTop: "1px solid #e5e7eb",
    padding: "16px",
  } as const,
  detailsCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "16px",
  } as const,
  detailsH4: { margin: "0 0 8px 0", color: "#111827" } as const,
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "8px",
    marginBottom: "10px",
  } as const,
  boxEligible: {
    backgroundColor: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "12px",
    marginTop: "8px",
  } as const,
  boxEntitled: {
    backgroundColor: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "12px",
    padding: "12px",
    marginTop: "8px",
  } as const,
  boxNon: {
    backgroundColor: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px",
    marginTop: "8px",
  } as const,
  boxP: { margin: 0, color: "#111827" } as const,
  contribList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "6px",
    marginTop: "8px",
  } as const,
  detailsFooter: { marginTop: "10px" } as const,
  detailsLink: { color: "#3b82f6", textDecoration: "none", fontWeight: 600 } as const,
};

// ---------- Statistics Component ----------
function StatsGrid({ employees }: { employees: Employee[] }) {
  const stats = useMemo(() => {
    const today = new Date();
    let eligible = 0,
      entitled = 0,
      nonEligible = 0;
    let totalContributions = 0;

    employees.forEach((e) => {
      const dob = parseDateISO(e.dateOfBirth);
      const age = dob ? yearsBetweenUTC(dob, today) : 0;
      const isEligible = age >= 22 && age < 75 && e.annualSalary >= 10000;

      if (isEligible) {
        eligible++;
        const contributions = qualifyEarnings(e.annualSalary);
        totalContributions += contributions.employer;
      } else if (e.annualSalary >= 6240 && age >= 16 && age < 75) {
        entitled++;
      } else {
        nonEligible++;
      }
    });

    return { eligible, entitled, nonEligible, totalContributions: totalContributions / 12 };
  }, [employees]);

  return (
    <div style={S.statsGrid}>
      <div style={S.statCard}>
        <div style={S.statNumber}>{employees.length}</div>
        <div style={S.statLabel}>Total Employees</div>
      </div>
      <div style={S.statCard}>
        <div style={S.statNumberAlt}>{stats.eligible}</div>
        <div style={S.statLabel}>Eligible Jobholders</div>
        <div style={S.statSub}>Must enroll</div>
      </div>
      <div style={S.statCard}>
        <div style={S.statNumberWarn}>{stats.entitled}</div>
        <div style={S.statLabel}>Entitled Workers</div>
        <div style={S.statSub}>Can opt in</div>
      </div>
      <div style={S.statCard}>
        <div style={S.statNumber}>{stats.nonEligible}</div>
        <div style={S.statLabel}>Non-Eligible</div>
        <div style={S.statSub}>No action required</div>
      </div>
    </div>
  );
}

// ---------- Enhanced Dashboard ----------
function BeautifulDashboard({
  employees,
  isLiveData,
}: {
  employees: Employee[];
  isLiveData: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const today = new Date();
    return employees.map((e) => {
      const dob = parseDateISO(e.dateOfBirth);
      const age = dob ? yearsBetweenUTC(dob, today) : 0;
      const isEligible = age >= 22 && age < 75 && e.annualSalary >= 10000;
      const isEntitled = e.annualSalary >= 6240 && age >= 16 && age < 75;

      let status = "Non-Eligible";
      let badgeStyle: React.CSSProperties = {
        display: "inline-block",
        padding: "4px 8px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: 500,
        background: "#f3f4f6",
        color: "#374151",
      };

      if (isEligible) {
        status = "Eligible";
        badgeStyle = {
          ...badgeStyle,
          background: "#dcfce7",
          color: "#166534",
        };
      } else if (isEntitled) {
        status = "Entitled";
        badgeStyle = {
          ...badgeStyle,
          background: "#fef3c7",
          color: "#92400e",
        };
      }

      const enrollDate = isEligible ? calcEnrollDateFrom(today) : null;
      const contributions = qualifyEarnings(e.annualSalary);

      return {
        ...e,
        age,
        status,
        badgeStyle,
        enrollDate,
        contributions,
        formattedDob: dob ? formatDateUK(dob) : "Invalid",
        formattedSalary: `£${e.annualSalary.toLocaleString()}`,
      };
    });
  }, [employees]);

  return (
    <div style={S.dashCard}>
      <div style={S.dashHeader}>
        <h2 style={S.dashH2}>Auto-Enrollment Assessment ({rows.length} employees)</h2>
        <p style={S.dashP}>
          {isLiveData ? "Live database connection" : "Demo data - Connect your database to see real employees"}
        </p>
      </div>

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Employee</th>
              <th style={S.th}>Age</th>
              <th style={S.th}>Annual Salary</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Action Date</th>
              <th style={S.th}>Monthly Contribution</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr
                  style={expandedId === row.id ? S.trExpanded : S.tr}
                  onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                >
                  <td style={S.td}>
                    <div>
                      <div style={S.empName}>
                        <a href={`/dashboard/employees/${row.id}`} style={S.link} onClick={(e) => e.stopPropagation()}>
                          {row.firstName} {row.lastName}
                        </a>
                      </div>
                      <div style={S.empMeta}>ID: {row.id}</div>
                    </div>
                  </td>
                  <td style={S.td}>
                    <span style={S.chipAge}>{row.age} years</span>
                  </td>
                  <td style={S.td}>
                    <span style={S.salary}>{row.formattedSalary}</span>
                  </td>
                  <td style={S.td}>
                    <span style={row.badgeStyle}>{row.status}</span>
                  </td>
                  <td style={S.td}>
                    {row.enrollDate ? (
                      <span style={S.enrollBy}>Enroll by {row.enrollDate}</span>
                    ) : (
                      <span style={S.empMeta}>No action required</span>
                    )}
                  </td>
                  <td style={S.td}>
                    {row.contributions.employer > 0 ? (
                      <div>
                        <div style={S.amtEmployer}>Employer: £{(row.contributions.employer / 12).toFixed(2)}</div>
                        <div style={S.amtEmployee}>Employee: £{(row.contributions.employee / 12).toFixed(2)}</div>
                      </div>
                    ) : (
                      <span style={S.empMeta}>Not applicable</span>
                    )}
                  </td>
                </tr>

                {expandedId === row.id && (
                  <tr>
                    <td colSpan={6}>
                      <div style={S.detailsOuter}>
                        <div style={S.detailsCard}>
                          <h4 style={S.detailsH4}>
                            Detailed Assessment for {row.firstName} {row.lastName}
                          </h4>
                          <div style={S.detailsGrid}>
                            <div>
                              <strong>Date of Birth:</strong> {row.formattedDob}
                            </div>
                            <div>
                              <strong>Annual Salary:</strong> {row.formattedSalary}
                            </div>
                            <div>
                              <strong>Qualifying Earnings:</strong> £{row.contributions.qe.toLocaleString()}
                            </div>
                          </div>

                          {row.status === "Eligible" && (
                            <div style={S.boxEligible}>
                              <p style={S.boxP}>
                                <strong>✅ Action Required:</strong> This employee must be auto-enrolled into your
                                workplace pension scheme by {row.enrollDate}.
                              </p>
                              <div style={S.contribList}>
                                <div>Annual Employee Contribution: £{row.contributions.employee.toFixed(2)}</div>
                                <div>Annual Employer Contribution: £{row.contributions.employer.toFixed(2)}</div>
                                <div>
                                  <strong>Total Annual: £{row.contributions.total.toFixed(2)}</strong>
                                </div>
                              </div>
                            </div>
                          )}

                          {row.status === "Entitled" && (
                            <div style={S.boxEntitled}>
                              <p style={S.boxP}>
                                <strong>⚪ Optional:</strong> This employee can opt-in to your workplace pension scheme if
                                they wish.
                              </p>
                            </div>
                          )}

                          {row.status === "Non-Eligible" && (
                            <div style={S.boxNon}>
                              <p style={S.boxP}>
                                <strong>❌ No Action:</strong> This employee does not meet the auto-enrollment criteria.
                              </p>
                            </div>
                          )}

                          <div style={S.detailsFooter}>
                            <a href={`/dashboard/employees/${row.id}`} style={S.detailsLink}>
                              View Employee Details
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Main Dashboard Component ----------
export default function AutoEnrollmentPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Loading employees for auto-enrollment assessment...");

    const timer = setTimeout(() => {
      console.log("Using shared employee data:", DEMO_EMPLOYEES);
      setEmployees(DEMO_EMPLOYEES);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div style={S.loadingOuter}>
        <div style={S.loadingInner}>
          <h1 style={{ color: "#1f2937", margin: 0 }}>Loading Auto-Enrollment Dashboard...</h1>
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
            <h1 style={S.headerTitle}>
              💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Auto-Enrollment
            </h1>
            <p style={S.headerSubtitle}>Workplace pension auto-enrollment compliance dashboard</p>
          </div>
          <nav style={S.nav}>
            <a href="/dashboard" style={S.navLink}>
              Dashboard
            </a>
            <a href="/dashboard/employees" style={S.navLink}>
              Employees
            </a>
          </nav>
        </div>

        {/* Statistics Grid */}
        <StatsGrid employees={employees} />

        {/* Employee Assessment */}
        <BeautifulDashboard employees={employees} isLiveData={false} />
      </div>
    </div>
  );
}
