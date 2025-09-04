"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  annualSalary: number;
  employeeNumber: string;
  hireDate: string;
  nationalInsurance: string;
  address: {
    line1: string;
    city: string;
    postcode: string;
  };
};

export default function AddEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Employee>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    annualSalary: 0,
    employeeNumber: "",
    hireDate: new Date().toISOString().split("T")[0],
    nationalInsurance: "",
    address: {
      line1: "",
      city: "",
      postcode: "",
    },
  });

  const [autoEnrollmentStatus, setAutoEnrollmentStatus] = useState("");

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

  const updateAutoEnrollmentStatus = () => {
    if (formData.dateOfBirth && formData.annualSalary > 0) {
      const age = calculateAge(formData.dateOfBirth);

      if (age >= 22 && age < 75 && formData.annualSalary >= 10000) {
        setAutoEnrollmentStatus(
          "✅ Eligible (Auto-enrolled into workplace pension)"
        );
      } else if (age >= 16 && age < 75 && formData.annualSalary >= 6240) {
        setAutoEnrollmentStatus("⚪ Entitled (Can opt-in to workplace pension)");
      } else {
        setAutoEnrollmentStatus(
          "❌ Not Eligible (Below age or salary thresholds)"
        );
      }
    } else {
      setAutoEnrollmentStatus("");
    }
  };

  useEffect(() => {
    updateAutoEnrollmentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.dateOfBirth, formData.annualSalary]);

  const handleInputChange = (field: string, value: string | number) => {
    if (field.startsWith("address.")) {
      const addressField = field.split(".")[1] as keyof Employee["address"];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value as string,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value as never,
      }));
    }
  };

  const generateEmployeeNumber = () => {
    const randomNum = Math.floor(Math.random() * 900) + 100;
    setFormData((prev) => ({
      ...prev,
      employeeNumber: `EMP${randomNum}`,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      if (!formData.firstName.trim()) {
        alert("First name is required");
        setLoading(false);
        return;
      }

      if (!formData.lastName.trim()) {
        alert("Last name is required");
        setLoading(false);
        return;
      }

      if (!formData.email.trim()) {
        alert("Email address is required");
        setLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        alert("Please enter a valid email address");
        setLoading(false);
        return;
      }

      if (!formData.employeeNumber.trim()) {
        alert(
          "Employee number is required. Please click Generate or enter manually."
        );
        setLoading(false);
        return;
      }

      if (!formData.dateOfBirth) {
        alert("Date of birth is required");
        setLoading(false);
        return;
      }

      if (!formData.hireDate) {
        alert("Hire date is required");
        setLoading(false);
        return;
      }

      if (!formData.annualSalary || formData.annualSalary <= 0) {
        alert("Please enter a valid annual salary");
        setLoading(false);
        return;
      }

      if (!formData.address.line1.trim()) {
        alert("Address line 1 is required");
        setLoading(false);
        return;
      }

      if (!formData.address.city.trim()) {
        alert("City is required");
        setLoading(false);
        return;
      }

      if (!formData.address.postcode.trim()) {
        alert("Postcode is required");
        setLoading(false);
        return;
      }

      const age = calculateAge(formData.dateOfBirth);
      if (age < 16) {
        alert("Employee must be at least 16 years old");
        setLoading(false);
        return;
      }

      if (age > 100) {
        alert("Please check the date of birth - age appears to be over 100");
        setLoading(false);
        return;
      }

      const hireDate = new Date(formData.hireDate);
      const today = new Date();
      if (hireDate > today) {
        alert("Hire date cannot be in the future");
        setLoading(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      alert(
        `Employee created successfully!\n\nName: ${formData.firstName} ${formData.lastName}\nEmployee Number: ${formData.employeeNumber}\nAuto-enrollment: ${
          autoEnrollmentStatus || "Not calculated"
        }`
      );

      router.push("/dashboard/employees");
    } catch (error) {
      console.error("Failed to create employee:", error);
      alert("Failed to create employee. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

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
        style={{
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
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
              💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Add Employee
            </h1>
            <p
              style={{
                color: "#6b7280",
                margin: "8px 0 0 0",
              }}
            >
              Create a new employee record with automatic auto-enrollment
              calculation
            </p>
          </div>
          <nav
            style={{
              display: "flex",
              gap: "24px",
            }}
          >
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

        {/* Main Form Card */}
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
          <form onSubmit={handleSubmit}>
            {/* Personal Information Section */}
            <div style={{ marginBottom: "40px" }}>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  margin: "0 0 24px 0",
                  borderBottom: "2px solid #f3f4f6",
                  paddingBottom: "8px",
                }}
              >
                Personal Information
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "20px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      handleInputChange("email", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+44 7700 900123"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      handleInputChange("dateOfBirth", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    National Insurance Number
                  </label>
                  <input
                    type="text"
                    value={formData.nationalInsurance}
                    onChange={(e) =>
                      handleInputChange("nationalInsurance", e.target.value)
                    }
                    placeholder="AB123456C"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Employment Information Section */}
            <div style={{ marginBottom: "40px" }}>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  margin: "0 0 24px 0",
                  borderBottom: "2px solid #f3f4f6",
                  paddingBottom: "8px",
                }}
              >
                Employment Information
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "20px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Employee Number *
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      required
                      value={formData.employeeNumber}
                      onChange={(e) =>
                        handleInputChange("employeeNumber", e.target.value)
                      }
                      placeholder="EMP001"
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "16px",
                        outline: "none",
                        transition: "border-color 0.2s",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={generateEmployeeNumber}
                      style={{
                        padding: "12px 16px",
                        backgroundColor: "#10b981",
                        color: "#000000",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Hire Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.hireDate}
                    onChange={(e) =>
                      handleInputChange("hireDate", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Annual Salary (£) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    value={formData.annualSalary || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "annualSalary",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="25000"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                  />
                  {formData.annualSalary > 0 && (
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#10b981",
                        margin: "8px 0 0 0",
                      }}
                    >
                      Annual Salary: {formatCurrency(formData.annualSalary)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div style={{ marginBottom: "40px" }}>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  margin: "0 0 24px 0",
                  borderBottom: "2px solid #f3f4f6",
                  paddingBottom: "8px",
                }}
              >
                Address Information
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "20px",
                }}
              >
                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.line1}
                    onChange={(e) =>
                      handleInputChange("address.line1", e.target.value)
                    }
                    placeholder="123 Main Street"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.city}
                    onChange={(e) =>
                      handleInputChange("address.city", e.target.value)
                    }
                    placeholder="London"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Postcode *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.postcode}
                    onChange={(e) =>
                      handleInputChange("address.postcode", e.target.value)
                    }
                    placeholder="SW1A 1AA"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "16px",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Auto-Enrollment Status */}
            {autoEnrollmentStatus && (
              <div
                style={{
                  backgroundColor: "#f0f9ff",
                  border: "1px solid #0ea5e9",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "32px",
                }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#0f172a",
                    margin: "0 0 8px 0",
                  }}
                >
                  Auto-Enrollment Status
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#1e293b",
                    margin: "0",
                  }}
                >
                  {autoEnrollmentStatus}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "32px",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <a
                href="/dashboard/employees"
                style={{
                  color: "#6b7280",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
              >
                Cancel
              </a>
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: loading ? "#9ca3af" : "#10b981",
                  color: "#000000",
                  border: "none",
                  borderRadius: "8px",
                  padding: "14px 28px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s",
                }}
              >
                {loading ? "Creating Employee..." : "👤 Create Employee"}
              </button>
            </div>
          </form>
        </div>

        {/* Help Information */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "12px",
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "24px",
            marginTop: "24px",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#1f2937",
              margin: "0 0 16px 0",
            }}
          >
            Auto-Enrollment Information
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "8px",
            }}
          >
            <p style={{ fontSize: "14px", color: "#4b5563", margin: "0" }}>
              <strong>✅ Eligible:</strong> Age 22-74, earning £10,000+ annually
            </p>
            <p style={{ fontSize: "14px", color: "#4b5563", margin: "0" }}>
              <strong>⚪ Entitled:</strong> Age 16-74, earning £6,240+ annually
            </p>
            <p style={{ fontSize: "14px", color: "#4b5563", margin: "0" }}>
              <strong>❌ Not Eligible:</strong> Below age or salary thresholds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
