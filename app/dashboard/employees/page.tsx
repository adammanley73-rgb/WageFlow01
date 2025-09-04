"use client";
import { useState, useEffect } from "react";

type Employee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  hireDate: string;
  annualSalary: number;
  status: "active" | "inactive";
  autoEnrollmentStatus: "eligible" | "entitled" | "non_eligible";
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setEmployees([
        {
          id: "EMP001",
          employeeNumber: "EMP001",
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@company.co.uk",
          phone: "+44 7700 900123",
          dateOfBirth: "1985-03-15",
          hireDate: "2020-01-15",
          annualSalary: 35000,
          status: "active",
          autoEnrollmentStatus: "eligible",
        },
        {
          id: "EMP002",
          employeeNumber: "EMP002",
          firstName: "James",
          lastName: "Wilson",
          email: "james.wilson@company.co.uk",
          phone: "+44 7700 900124",
          dateOfBirth: "1990-07-22",
          hireDate: "2021-03-10",
          annualSalary: 28000,
          status: "active",
          autoEnrollmentStatus: "entitled",
        },
        {
          id: "EMP003",
          employeeNumber: "EMP003",
          firstName: "Emma",
          lastName: "Brown",
          email: "emma.brown@company.co.uk",
          phone: "+44 7700 900125",
          dateOfBirth: "1995-11-08",
          hireDate: "2022-06-20",
          annualSalary: 22000,
          status: "active",
          autoEnrollmentStatus: "non_eligible",
        },
      ]);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  const filteredEmployees = employees.filter(
    (employee) =>
      `${employee.firstName} ${employee.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ---------- Styles (fixing invalid inline syntax; visuals unchanged) ----------
  const page: React.CSSProperties = {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    background:
      "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
    minHeight: "100vh",
    padding: "40px 20px",
  };
  const container: React.CSSProperties = { maxWidth: "1200px", margin: "0 auto" };
  const headerCard: React.CSSProperties = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    padding: "20px 40px",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
    marginBottom: "30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  };
  const title: React.CSSProperties = {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#1f2937",
    margin: 0,
  };
  const navRow: React.CSSProperties = { display: "flex", gap: "24px" };
  const navLink: React.CSSProperties = {
    color: "#000000",
    textDecoration: "none",
    fontWeight: "bold",
    padding: "8px 16px",
    borderRadius: "6px",
    backgroundColor: "#10b981",
    border: "1px solid #059669",
  };

  const cardOuter: React.CSSProperties = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
  };
  const cardHeader: React.CSSProperties = {
    padding: "24px 32px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  };
  const h2: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#1f2937",
    margin: "0 0 8px 0",
  };
  const sub: React.CSSProperties = { color: "#6b7280", margin: 0, fontSize: "14px" };

  const toolbar: React.CSSProperties = {
    padding: "24px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  };
  const searchInput: React.CSSProperties = {
    padding: "12px 16px",
    fontSize: "14px",
    border: "2px solid #e5e7eb",
    borderRadius: "8px",
    outline: "none",
    width: "300px",
    fontFamily: "inherit",
  };
  const primaryLinkBtn: React.CSSProperties = {
    display: "inline-block",
    padding: "12px 24px",
    backgroundColor: "#10b981",
    color: "#000000",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "bold",
    border: "1px solid #059669",
  };

  const tableWrap: React.CSSProperties = { overflowX: "auto" };
  const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse" };
  const th: React.CSSProperties = {
    padding: "16px",
    textAlign: "left",
    fontWeight: 600,
    color: "#374151",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  };
  const td: React.CSSProperties = { padding: "16px" };
  const nameStrong: React.CSSProperties = { fontWeight: 600, color: "#1e293b" };
  const muted: React.CSSProperties = { color: "#64748b", fontSize: "14px" };
  const salary: React.CSSProperties = { fontWeight: 600, color: "#059669" };
  const statusPill = (active: boolean): React.CSSProperties => ({
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 500,
    backgroundColor: active ? "#dcfce7" : "#fee2e2",
    color: active ? "#166534" : "#dc2626",
  });
  const aePill = (s: Employee["autoEnrollmentStatus"]): React.CSSProperties => ({
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 500,
    backgroundColor:
      s === "eligible" ? "#dbeafe" : s === "entitled" ? "#dcfce7" : "#f3f4f6",
    color: s === "eligible" ? "#1e40af" : s === "entitled" ? "#166534" : "#374151",
  });
  const actionsRow: React.CSSProperties = { display: "flex", gap: "8px" };
  const actionLink: React.CSSProperties = {
    color: "#3b82f6",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
  };

  const emptyWrap: React.CSSProperties = { textAlign: "center", padding: "60px 20px" };
  const emptyText: React.CSSProperties = {
    color: "#6b7280",
    fontSize: "16px",
    margin: "0 0 16px 0",
  };

  return (
    <div style={page}>
      <div style={container}>
        {/* Navigation Header */}
        <div style={headerCard}>
          <div>
            <h1 style={title}>
              💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Employee Management
            </h1>
          </div>
          <nav style={navRow}>
            <a href="/dashboard" style={navLink}>
              Dashboard
            </a>
            <a href="/dashboard/payroll" style={navLink}>
              Payroll
            </a>
          </nav>
        </div>

        {/* Main Content Card */}
        <div style={cardOuter}>
          <div style={cardHeader}>
            <h2 style={h2}>Employee Management</h2>
            <p style={sub}>Manage your workforce and track auto-enrollment status</p>
          </div>

          {/* Search and Actions */}
          <div style={toolbar}>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={searchInput}
            />
            <a href="/dashboard/employees/new" style={primaryLinkBtn}>
              👤 Add New Employee
            </a>
          </div>

          {/* Employee Table */}
          {loading ? (
            <div style={emptyWrap}>
              <p style={sub as React.CSSProperties & { fontSize: string; margin: string }}>
                Loading employees...
              </p>
            </div>
          ) : (
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Employee</th>
                    <th style={th}>Contact</th>
                    <th style={th}>Salary</th>
                    <th style={th}>Status</th>
                    <th style={th}>Auto-Enrollment</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={td}>
                        <div>
                          <div style={nameStrong}>
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div style={muted}>{employee.employeeNumber}</div>
                        </div>
                      </td>
                      <td style={td}>
                        <div>
                          <div style={{ color: "#1e293b", fontSize: "14px" }}>{employee.email}</div>
                          <div style={muted}>{employee.phone}</div>
                        </div>
                      </td>
                      <td style={td}>
                        <span style={salary}>£{employee.annualSalary.toLocaleString()}</span>
                      </td>
                      <td style={td}>
                        <span style={statusPill(employee.status === "active")}>
                          {employee.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={td}>
                        <span style={aePill(employee.autoEnrollmentStatus)}>
                          {employee.autoEnrollmentStatus === "eligible"
                            ? "Eligible"
                            : employee.autoEnrollmentStatus === "entitled"
                            ? "Entitled"
                            : "Non-Eligible"}
                        </span>
                      </td>
                      <td style={td}>
                        <div style={actionsRow}>
                          <a href={`/dashboard/employees/${employee.id}`} style={actionLink}>
                            View
                          </a>
                          <a href={`/dashboard/employees/${employee.id}/edit`} style={actionLink}>
                            Edit
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredEmployees.length === 0 && (
                <div style={emptyWrap}>
                  <p style={emptyText}>
                    {searchTerm
                      ? "No employees found matching your search."
                      : "No employees found."}
                  </p>
                  <a href="/dashboard/employees/new" style={primaryLinkBtn}>
                    👤 Add Your First Employee
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
