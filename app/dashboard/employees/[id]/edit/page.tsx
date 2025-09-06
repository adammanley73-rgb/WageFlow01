"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  email: string;
  phone?: string | null;
  annualSalary: number;
  employmentType: "full_time" | "part_time" | "contract" | "temporary" | string;
  address?: {
    line1?: string | null;
    city?: string | null;
    postcode?: string | null;
  } | null;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  annualSalary: number;
  employmentType: Employee["employmentType"];
  address: {
    line1: string;
    city: string;
    postcode: string;
  };
};

export default function EmployeeEditPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = useMemo(() => {
    const raw = (params as Record<string, string | string[] | undefined>)?.id;
    return Array.isArray(raw) ? raw[0] : (raw as string | undefined);
  }, [params]);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    annualSalary: 0,
    employmentType: "full_time",
    address: {
      line1: "",
      city: "",
      postcode: "",
    },
  });

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
          const emp: Employee = await response.json();
          setEmployee(emp);
          setFormData({
            firstName: emp.firstName ?? "",
            lastName: emp.lastName ?? "",
            email: emp.email ?? "",
            phone: emp.phone ?? "",
            annualSalary: Number(emp.annualSalary ?? 0),
            employmentType: (emp.employmentType as FormState["employmentType"]) ?? "full_time",
            address: {
              line1: emp.address?.line1 ?? "",
              city: emp.address?.city ?? "",
              postcode: emp.address?.postcode ?? "",
            },
          });
        } else if (response.status === 404) {
          setEmployee(null);
        } else {
          throw new Error("Failed to load employee");
        }
      } catch (err) {
        console.error("Error loading employee:", err);
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!employeeId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          annualSalary: Number(formData.annualSalary),
          employmentType: formData.employmentType,
          addressLine1: formData.address.line1,
          addressCity: formData.address.city,
          addressPostcode: formData.address.postcode,
        }),
      });

      if (response.ok) {
        await response.json();
        alert("Employee updated successfully!");
        router.push(`/dashboard/employees/${employeeId}`);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(`Failed to update employee: ${err.error ?? response.statusText}`);
      }
    } catch (err) {
      console.error("Failed to update employee:", err);
      alert("Failed to update employee. Please try again.");
    } finally {
      setSaving(false);
    }
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
                💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Edit
                Employee
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
                  color: "#6b7280",
                  textDecoration: "none",
                  fontWeight: 500,
                  padding: "8px 16px",
                  borderRadius: "6px",
                  backgroundColor: "#f3f4f6",
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
                  color: "#000000",
                  textDecoration: "none",
                  fontWeight: "bold",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  backgroundColor: "#10b981",
                  border: "1px solid #059669",
                }}
              >
                Edit
              </a>
            </nav>
          </div>
        </div>

        {/* Edit Form */}
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
            Edit Employee Details
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {/* Personal Information */}
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
                    marginBottom: "16px",
                  }}
                >
                  Personal Information
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "16px",
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
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      required
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
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      required
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "16px",
                    marginTop: "16px",
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
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      required
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
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
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
                </div>
              </div>

              {/* Employment Information */}
              <div
                style={{
                  padding: "24px",
                  backgroundColor: "#f0f9ff",
                  borderRadius: "12px",
                  border: "1px solid #bae6fd",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#0369a1",
                    marginBottom: "16px",
                  }}
                >
                  Employment Information
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "16px",
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
                      Annual Salary
                    </label>
                    <input
                      type="number"
                      value={formData.annualSalary}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          annualSalary: Number(e.target.value) || 0,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      required
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
                      Employment Type
                    </label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          employmentType: e.target.value,
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
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="temporary">Temporary</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div
                style={{
                  padding: "24px",
                  backgroundColor: "#fefce8",
                  borderRadius: "12px",
                  border: "1px solid #fde047",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#a16207",
                    marginBottom: "16px",
                  }}
                >
                  Address Information
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: 500,
                        color: "#374151",
                      }}
                    >
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      value={formData.address.line1}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: { ...prev.address, line1: e.target.value },
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      required
                    />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "16px",
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
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            address: { ...prev.address, city: e.target.value },
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                        required
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
                        Postcode
                      </label>
                      <input
                        type="text"
                        value={formData.address.postcode}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            address: { ...prev.address, postcode: e.target.value },
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                justifyContent: "flex-end",
                marginTop: "32px",
                paddingTop: "24px",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <button
                type="button"
                onClick={() => router.push(`/dashboard/employees/${employeeId}`)}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "16px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "12px 24px",
                  backgroundColor: saving ? "#9ca3af" : "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "16px",
                  fontWeight: 500,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
