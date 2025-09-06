"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  annualSalary: string; // keep as string for input control, parse before submit
  employmentType: "full_time" | "part_time" | "contract" | "temporary" | string;
  hireDate: string; // yyyy-mm-dd
  addressLine1: string;
  addressCity: string;
  addressPostcode: string;
};

export default function AddEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    annualSalary: "",
    employmentType: "full_time",
    hireDate: new Date().toISOString().split("T")[0],
    addressLine1: "",
    addressCity: "",
    addressPostcode: "",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const annualSalaryNumber = Number.parseFloat(formData.annualSalary);
    if (Number.isNaN(annualSalaryNumber) || annualSalaryNumber < 0) {
      setError("Please enter a valid annual salary.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          annualSalary: annualSalaryNumber,
          employmentType: formData.employmentType,
          hireDate: formData.hireDate,
          addressLine1: formData.addressLine1.trim(),
          addressCity: formData.addressCity.trim(),
          addressPostcode: formData.addressPostcode.trim(),
        }),
      });

      if (response.ok) {
        await response.json().catch(() => ({}));
        alert("Employee created successfully!");
        router.push("/dashboard/employees");
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to create employee");
      }
    } catch (err: unknown) {
      console.error("Failed to create employee:", err);
      setError(err instanceof Error ? err.message : "Failed to create employee");
    } finally {
      setLoading(false);
    }
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
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Header */}
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
                💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Add
                Employee
              </h1>
              <p style={{ color: "#6b7280", margin: "8px 0 0 0" }}>
                Create a new employee record
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <p style={{ color: "#dc2626", margin: 0, fontWeight: 500 }}>
              Error: {error}
            </p>
          </div>
        )}

        {/* Add Form */}
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
            Employee Information
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
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, firstName: e.target.value }))
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
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, lastName: e.target.value }))
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
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, email: e.target.value }))
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
                        setFormData((p) => ({ ...p, phone: e.target.value }))
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
                      Annual Salary *
                    </label>
                    <input
                      type="number"
                      value={formData.annualSalary}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, annualSalary: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      required
                      min="0"
                      step="0.01"
                      inputMode="decimal"
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
                        setFormData((p) => ({ ...p, employmentType: e.target.value }))
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

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: 500,
                        color: "#374151",
                      }}
                    >
                      Hire Date
                    </label>
                    <input
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, hireDate: e.target.value }))
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
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={formData.addressLine1}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, addressLine1: e.target.value }))
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
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.addressCity}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, addressCity: e.target.value }))
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
                        Postcode *
                      </label>
                      <input
                        type="text"
                        value={formData.addressPostcode}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            addressPostcode: e.target.value,
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
                onClick={() => router.push("/dashboard/employees")}
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
                disabled={loading}
                style={{
                  padding: "12px 24px",
                  backgroundColor: loading ? "#9ca3af" : "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "16px",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Creating..." : "Create Employee"}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "30px", padding: "20px", textAlign: "center" }}>
          <a
            href="/dashboard/employees"
            style={{ color: "rgba(255, 255, 255, 0.8)", textDecoration: "none" }}
          >
            ← Back to Employees
          </a>
        </div>
      </div>
    </div>
  );
}
