"use client";
import { useEffect, useMemo, useState } from "react";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  email: string;
  phone?: string | null;
  annualSalary?: number | null;
  employmentType?: string | null;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to load employees");

      const data: Employee[] = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading employees:", err);
      setError("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return employees.filter((e) => {
      const name = `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim().toLowerCase();
      const num = (e.employeeNumber ?? "").toLowerCase();
      const email = (e.email ?? "").toLowerCase();
      return name.includes(q) || num.includes(q) || email.includes(q);
    });
  }, [employees, searchTerm]);

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
        <h1 style={{ color: "white", fontSize: "24px", textAlign: "center" }}>
          Loading Employees...
        </h1>
      </div>
    );
  }

  if (error) {
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
          <h1>Error Loading Employees</h1>
          <p>{error}</p>
          <button
            onClick={loadEmployees}
            style={{
              backgroundColor: "#059669",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
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
        {/* Header */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            padding: "20px 40px",
            borderRadius: "12px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
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
                  margin: "0",
                }}
              >
                💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Employees
              </h1>
              <p style={{ color: "#6b7280", margin: "8px 0 0 0" }}>
                Manage your employee records and information
              </p>
            </div>
            <nav style={{ display: "flex", gap: "24px" }}>
              <a
                href="/dashboard"
                style={{
                  color: "#6b7280",
                  textDecoration: "none",
                  fontWeight: 500,
                  padding: "8px 16px",
                  borderRadius: "6px",
                  backgroundColor: "#f3f4f6",
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
                  color: "#6b7280",
                  textDecoration: "none",
                  fontWeight: 500,
                  padding: "8px 16px",
                  borderRadius: "6px",
                  backgroundColor: "#f3f4f6",
                }}
              >
                Payroll
              </a>
            </nav>
          </div>

          {/* Search and Add Button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="🔍 Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "16px",
                  backgroundColor: "white",
                }}
              />
            </div>
            <a
              href="/dashboard/employees/new"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                backgroundColor: "#059669",
                color: "white",
                textDecoration: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                border: "1px solid #059669",
              }}
            >
              👤 Add New Employee
            </a>
          </div>
        </div>

        {/* Employee Table */}
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
          {filteredEmployees.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <h3 style={{ color: "#6b7280", fontSize: "18px", marginBottom: "8px" }}>
                No employees found
              </h3>
              <p style={{ color: "#9ca3af", margin: 0 }}>
                {searchTerm
                  ? "No employees found matching your search."
                  : "No employees found."}
              </p>
              <a
                href="/dashboard/employees/new"
                style={{
                  display: "inline-block",
                  marginTop: "20px",
                  padding: "12px 24px",
                  backgroundColor: "#059669",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                }}
              >
                👤 Add First Employee
              </a>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "1px solid #e5e7eb",
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
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Contact
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Employment
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee, index) => (
                  <tr
                    key={employee.id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      backgroundColor: index % 2 === 0 ? "white" : "#fafafa",
                    }}
                  >
                    <td style={{ padding: "16px" }}>
                      <div>
                        <p
                          style={{
                            fontWeight: 600,
                            color: "#111827",
                            margin: "0 0 4px 0",
                          }}
                        >
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                          {employee.employeeNumber}
                        </p>
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div>
                        <p style={{ color: "#111827", margin: "0 0 4px 0" }}>
                          {employee.email}
                        </p>
                        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                          {employee.phone || "No phone"}
                        </p>
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div>
                        <p style={{ color: "#111827", margin: "0 0 4px 0" }}>
                          £{employee.annualSalary?.toLocaleString() ?? "0"}
                        </p>
                        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                          {(employee.employmentType ?? "").replace("_", " ")}
                        </p>
                      </div>
                    </td>
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          justifyContent: "flex-end",
                        }}
                      >
                        <a
                          href={`/dashboard/employees/${employee.id}`}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            textDecoration: "none",
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontWeight: 500,
                          }}
                        >
                          View
                        </a>
                        <a
                          href={`/dashboard/employees/${employee.id}/edit`}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#059669",
                            color: "white",
                            textDecoration: "none",
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontWeight: 500,
                          }}
                        >
                          Edit
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "30px", padding: "20px", textAlign: "center" }}>
          <a
            href="/dashboard"
            style={{ color: "rgba(255, 255, 255, 0.8)", textDecoration: "none", marginRight: "30px" }}
          >
            ← Back to Dashboard
          </a>

          <a
            href="/dashboard/payroll"
            style={{ color: "rgba(255, 255, 255, 0.8)", textDecoration: "none" }}
          >
            Go to Payroll →
          </a>
        </div>
      </div>
    </div>
  );
}
