"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getEmployeeById, type Employee } from "../../../../lib/data/employees";

export default function EmployeeDetailsPage() {
  const params = useParams<{ id: string }>();
  const employeeId = params?.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoEnrollmentStatus, setAutoEnrollmentStatus] = useState("");

  useEffect(() => {
    console.log("Loading employee with ID:", employeeId);

    const timer = setTimeout(() => {
      const foundEmployee = getEmployeeById(employeeId);
      console.log("Found employee:", foundEmployee);

      if (foundEmployee) {
        setEmployee(foundEmployee);

        const age = calculateAge(foundEmployee.dateOfBirth);
        if (age >= 22 && age < 75 && foundEmployee.annualSalary >= 10000) {
          setAutoEnrollmentStatus(
            "✅ Eligible (Auto-enrolled into workplace pension)"
          );
        } else if (age >= 16 && age < 75 && foundEmployee.annualSalary >= 6240) {
          setAutoEnrollmentStatus(
            "⚪ Entitled (Can opt-in to workplace pension)"
          );
        } else {
          setAutoEnrollmentStatus(
            "❌ Not Eligible (Below age or salary thresholds)"
          );
        }
      }

      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [employeeId]);

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

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
        <div
          style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}
        >
          <h1 style={{ color: "#1f2937", margin: "0" }}>
            Loading Employee Details...
          </h1>
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
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
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
                💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Employee
                Not Found
              </h1>
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
                ← Back to Employees
              </a>
            </nav>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              borderRadius: "12px",
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              padding: "40px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: "#6b7280",
                fontSize: "16px",
                margin: "0 0 24px 0",
              }}
            >
              The employee you're looking for could not be found.
            </p>
            <a
              href="/dashboard/employees"
              style={{
                backgroundColor: "#10b981",
                color: "#000000",
                padding: "12px 24px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "bold",
                border: "1px solid #059669",
              }}
            >
              ← Back to Employee List
            </a>
          </div>
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
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
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
              ← Back to Employees
            </a>
          </nav>
        </div>

        {/* Employee Details Card */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "12px",
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "32px",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#059669",
                margin: "0",
              }}
            >
              Employee Information
            </h2>
            <a
              href={`/dashboard/employees/${employee.id}/edit`}
              style={{
                backgroundColor: "#10b981",
                color: "#000000",
                padding: "8px 16px",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "14px",
                border: "1px solid #059669",
              }}
            >
              ✏️ Edit Employee
            </a>
          </div>

          {/* Personal Information */}
          <div style={{ marginBottom: "32px" }}>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                color: "#374151",
                margin: "0 0 16px 0",
                paddingBottom: "8px",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              Personal Information
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  Full Name
                </label>
                <p style={{ fontSize: "16px", color: "#1f2937", margin: "0" }}>
                  {employee.firstName} {employee.lastName}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  Employee Number
                </label>
                <p style={{ fontSize: "16px", color: "#1f2937", margin: "0" }}>
                  {employee.employeeNumber}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  Email Address
                </label>
                <p style={{ fontSize: "16px", color: "#1f2937", margin: "0" }}>
                  {employee.email}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  Phone Number
                </label>
                <p style={{ fontSize: "16px", color: "#1f2937", margin: "0" }}>
                  {employee.phone || "Not provided"}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  Date of Birth
                </label>
                <p style={{ fontSize: "16px", color: "#1f2937", margin: "0" }}>
                  {formatDate(employee.dateOfBirth)} (Age:{" "}
                  {calculateAge(employee.dateOfBirth)})
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  National Insurance
                </label>
                <p style={{ fontSize: "16px", color: "#1f2937", margin: "0" }}>
                  {employee.nationalInsurance || "Not provided"}
                </p>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div style={{ marginBottom: "32px" }}>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                color: "#374151",
                margin: "0 0 16px 0",
                paddingBottom: "8px",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              Employment Information
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  Hire Date
                </label>
                <p style={{ fontSize: "16px", color: "#1f2937", margin: "0" }}>
                  {formatDate(employee.hireDate)}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  Annual Salary
                </label>
                <p style={{ fontSize: "16px", color: "#1f2937", margin: "0" }}>
                  {formatCurrency(employee.annualSalary)}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#6b7280",
                    marginBottom: "4px",
                  }}
                >
                  Employment Status
                </label>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    backgroundColor:
                      // @ts-expect-error status shape depends on your Employee type
                      employee.status === "active" ? "#dcfce7" : "#fee2e2",
                    color:
                      // @ts-expect-error status shape depends on your Employee type
                      employee.status === "active" ? "#166534" : "#dc2626",
                  }}
                >
                  {
                    // @ts-expect-error status shape depends on your Employee type
                    employee.status === "active" ? "Active" : "Inactive"
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Address Information */}
          {employee.address && (
            <div style={{ marginBottom: "32px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#374151",
                  margin: "0 0 16px 0",
                  paddingBottom: "8px",
                  borderBottom: "1px solid #f3f4f6",
                }}
              >
                Address Information
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "16px",
                }}
              >
                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    Address Line 1
                  </label>
                  <p style={{ fontSize: "16px", color: "#1f2937", margin: "0" }}>
                    {employee.address.line1}
                  </p>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    City
                  </label>
                  <p style={{ fontSize: "16px", color: "#1f2937", margin: "0" }}>
                    {employee.address.city}
                  </p>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#6b7280",
                      marginBottom: "4px",
                    }}
                  >
                    Postcode
                  </label>
                  <p style={{ fontSize: "16px", color: "#1f2937", margin: "0" }}>
                    {employee.address.postcode}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Auto-Enrollment Status */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                color: "#374151",
                margin: "0 0 8px 0",
              }}
            >
              Auto-Enrollment Status
            </h3>
            <p style={{ fontSize: "16px", color: "#1f2937", margin: "0" }}>
              {autoEnrollmentStatus}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "24px",
          }}
        >
          <a
            href="/dashboard/employees"
            style={{
              color: "#6b7280",
              textDecoration: "none",
              fontWeight: "500",
              padding: "8px 16px",
            }}
          >
            ← Back to Employees
          </a>
          <a
            href={`/dashboard/employees/${employee.id}/edit`}
            style={{
              backgroundColor: "#10b981",
              color: "#000000",
              padding: "8px 16px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "bold",
              border: "1px solid #059669",
            }}
          >
            ✏️ Edit Employee
          </a>
        </div>
      </div>
    </div>
  );
}
