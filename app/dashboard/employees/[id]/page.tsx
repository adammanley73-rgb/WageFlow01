"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  email: string;
  phone?: string | null;
  annualSalary?: number | null;
  employmentType?: string | null;
  hireDate?: string | null;
  status?: string | null;
  address?: {
    line1?: string | null;
    city?: string | null;
    postcode?: string | null;
  } | null;
};

export default function EmployeeDetailsPage() {
  const params = useParams();
  const employeeId = useMemo(() => {
    const raw = (params as Record<string, string | string[] | undefined>)?.id;
    return Array.isArray(raw) ? raw[0] : (raw as string | undefined);
  }, [params]);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!employeeId) {
        setEmployee(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/employees/${employeeId}`);
        if (response.ok) {
          const data: Employee = await response.json();
          setEmployee(data ?? null);
        } else if (response.status === 404) {
          console.error("Employee not found:", employeeId);
          setEmployee(null);
        } else {
          throw new Error("Failed to load employee");
        }
      } catch (error) {
        console.error("Error loading employee:", error);
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId]);

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
          Loading Employee Details...
        </h1>
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
          <h1>Employee Not Found</h1>
          <a
            href="/dashboard/employees"
            style={{ color: "white", textDecoration: "underline" }}
          >
            ← Back to Employees
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
                💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Employee
                Details
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
                  backgroundColor: "#10b981",
                  border: "1px solid #059669",
                }}
              >
                Details
              </a>
              <a
                href={`/dashboard/employees/${employee.id}/payroll`}
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
              <a
                href={`/dashboard/employees/${employee.id}/edit`}
                style={{
                  color: "#6b7280",
                  textDecoration: "none",
                  fontWeight: 500,
                  padding: "8px 16px",
                  borderRadius: "6px",
                  backgroundColor: "#f3f4f6",
                }}
              >
                Edit
              </a>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: "30px",
          }}
        >
          {/* Left Column - Employee Details */}
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
              👤 Employee Information
            </h2>

            {/* Personal Details */}
            <div style={{ marginBottom: "32px" }}>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#059669",
                  marginBottom: "16px",
                }}
              >
                Personal Details
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                }}
              >
                <div>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    Full Name:
                  </span>
                  <br />
                  <strong>
                    {employee.firstName} {employee.lastName}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    Employee Number:
                  </span>
                  <br />
                  <strong>{employee.employeeNumber}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    Email:
                  </span>
                  <br />
                  <strong>{employee.email}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    Phone:
                  </span>
                  <br />
                  <strong>{employee.phone || "Not provided"}</strong>
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div style={{ marginBottom: "32px" }}>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#059669",
                  marginBottom: "16px",
                }}
              >
                Employment Details
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                }}
              >
                <div>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    Annual Salary:
                  </span>
                  <br />
                  <strong>
                    £{employee.annualSalary?.toLocaleString() ?? "0"}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    Employment Type:
                  </span>
                  <br />
                  <strong>
                    {(employee.employmentType ?? "Full Time").replace("_", " ")}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    Hire Date:
                  </span>
                  <br />
                  <strong>
                    {employee.hireDate
                      ? new Date(employee.hireDate).toLocaleDateString("en-GB")
                      : "Not set"}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    Status:
                  </span>
                  <br />
                  <strong style={{ color: "#059669" }}>
                    {employee.status ?? "Active"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Address */}
            {employee.address && (
              <div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#059669",
                    marginBottom: "16px",
                  }}
                >
                  Address
                </h3>

                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    {employee.address?.line1 ?? ""}
                    <br />
                    {employee.address?.city ?? ""}
                    <br />
                    {employee.address?.postcode ?? ""}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Quick Actions */}
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
                marginBottom: "20px",
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
                🚀 Quick Actions
              </h3>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "12px" }}
              >
                <a
                  href={`/dashboard/employees/${employee.id}/payroll`}
                  style={{
                    display: "block",
                    padding: "12px 16px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "6px",
                    fontWeight: 500,
                    textAlign: "center",
                  }}
                >
                  💰 Manage Payroll
                </a>

                <a
                  href={`/dashboard/employees/${employee.id}/edit`}
                  style={{
                    display: "block",
                    padding: "12px 16px",
                    backgroundColor: "#059669",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "6px",
                    fontWeight: 500,
                    textAlign: "center",
                  }}
                >
                  ✏️ Edit Details
                </a>

                <a
                  href="/dashboard/employees"
                  style={{
                    display: "block",
                    padding: "12px 16px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "6px",
                    fontWeight: 500,
                    textAlign: "center",
                  }}
                >
                  📋 All Employees
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div
          style={{ marginTop: "30px", padding: "20px", textAlign: "center" }}
        >
          <a
            href="/dashboard/employees"
            style={{
              color: "rgba(255, 255, 255, 0.8)",
              textDecoration: "none",
              marginRight: "30px",
            }}
          >
            ← Back to Employees
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
