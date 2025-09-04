"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getEmployeeById, type Employee } from "../../../../lib/data/employees";

type EmploymentType = "full_time" | "part_time" | "contract" | "temporary" | "apprentice";

export default function EmployeeEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const employeeId = params?.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoEnrollmentStatus, setAutoEnrollmentStatus] = useState("");

  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    nationalInsurance: string;
    hireDate: string;
    employmentType: EmploymentType;
    annualSalary: number;
    address: {
      line1: string;
      line2: string;
      city: string;
      county: string;
      postcode: string;
    };
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    nationalInsurance: "",
    hireDate: "",
    employmentType: "full_time",
    annualSalary: 0,
    address: {
      line1: "",
      line2: "",
      city: "",
      county: "",
      postcode: "",
    },
  });

  const employmentTypes: { value: EmploymentType; label: string }[] = [
    { value: "full_time", label: "Full Time" },
    { value: "part_time", label: "Part Time" },
    { value: "contract", label: "Contract" },
    { value: "temporary", label: "Temporary" },
    { value: "apprentice", label: "Apprentice" },
  ];

  // Styles
  const S = {
    page: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background:
        "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
      minHeight: "100vh",
      padding: "40px 20px",
    } as const,
    smallCenter: { maxWidth: "800px", margin: "0 auto", textAlign: "center" } as const,
    container: { maxWidth: "800px", margin: "0 auto" } as const,
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
    headerTitle: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "#1f2937",
      margin: "0",
    } as const,
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
    card: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",
      borderRadius: "12px",
      boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
      border: "1px solid rgba(255,255,255,0.2)",
      padding: "40px",
    } as const,
    sectionTitle: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "#1f2937",
      margin: "0 0 24px 0",
      borderBottom: "2px solid #f3f4f6",
      paddingBottom: "8px",
    } as const,
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "20px",
    } as const,
    label: {
      display: "block",
      fontSize: "14px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "6px",
    } as const,
    input: {
      width: "100%",
      padding: "12px 16px",
      border: "2px solid #e5e7eb",
      borderRadius: "8px",
      fontSize: "16px",
      outline: "none",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    } as const,
    salaryHint: { fontSize: "14px", color: "#10b981", margin: "8px 0 0 0" } as const,
    aeBox: {
      backgroundColor: "#f0f9ff",
      border: "1px solid #0ea5e9",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "32px",
    } as const,
    aeTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#0f172a",
      margin: "0 0 8px 0",
    } as const,
    aeText: { fontSize: "14px", color: "#1e293b", margin: "0" } as const,
    actions: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: "32px",
      borderTop: "1px solid #e5e7eb",
    } as const,
    cancel: { color: "#6b7280", textDecoration: "none", fontWeight: "500" } as const,
    submit: {
      backgroundColor: "#10b981",
      color: "#000000",
      border: "none",
      borderRadius: "8px",
      padding: "14px 28px",
      fontSize: "16px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "background-color 0.2s",
    } as const,
    helpCard: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",
      borderRadius: "12px",
      boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
      border: "1px solid rgba(255,255,255,0.2)",
      padding: "24px",
      marginTop: "24px",
    } as const,
    helpTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#1f2937",
      margin: "0 0 16px 0",
    } as const,
    helpGrid: { display: "grid", gridTemplateColumns: "1fr", gap: "8px" } as const,
    helpP: { fontSize: "14px", color: "#4b5563", margin: "0" } as const,
  };

  useEffect(() => {
    console.log("Loading employee for edit with ID:", employeeId);

    const timer = setTimeout(() => {
      const foundEmployee = getEmployeeById(employeeId);
      console.log("Found employee for edit:", foundEmployee);

      if (foundEmployee) {
        setEmployee(foundEmployee);
        setFormData({
          firstName: foundEmployee.firstName,
          lastName: foundEmployee.lastName,
          email: foundEmployee.email,
          phone: foundEmployee.phone || "",
          dateOfBirth: foundEmployee.dateOfBirth,
          nationalInsurance: foundEmployee.nationalInsurance || "",
          hireDate: foundEmployee.hireDate,
          employmentType: (foundEmployee as any).employmentType ?? "full_time",
          annualSalary: foundEmployee.annualSalary,
          address: {
            line1: foundEmployee.address?.line1 || "",
            line2: (foundEmployee.address as any)?.line2 || "",
            city: foundEmployee.address?.city || "",
            county: (foundEmployee.address as any)?.county || "",
            postcode: foundEmployee.address?.postcode || "",
          },
        });
        updateAutoEnrollmentStatus(
          foundEmployee.dateOfBirth,
          foundEmployee.annualSalary
        );
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
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const updateAutoEnrollmentStatus = (dateOfBirth: string, annualSalary: number) => {
    if (dateOfBirth && annualSalary > 0) {
      const age = calculateAge(dateOfBirth);

      if (age >= 22 && age < 75 && annualSalary >= 10000) {
        setAutoEnrollmentStatus(
          "✅ Eligible (Auto-enrolled into workplace pension)"
        );
      } else if (age >= 16 && age < 75 && annualSalary >= 6240) {
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

  const handleInputChange = (field: string, value: string | number) => {
    if (field.startsWith("address.")) {
      const addressField = field.split(".")[1] as keyof typeof formData.address;
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

      if (field === "dateOfBirth" || field === "annualSalary") {
        setTimeout(
          () =>
            updateAutoEnrollmentStatus(
              field === "dateOfBirth" ? (value as string) : formData.dateOfBirth,
              field === "annualSalary" ? (value as number) : formData.annualSalary
            ),
          100
        );
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      console.log("Saving employee changes:", formData);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("Employee updated successfully");
      alert("Employee updated successfully!");

      router.push(`/dashboard/employees/${employeeId}`);
    } catch (error) {
      console.error("Failed to update employee:", error);
      alert("Failed to update employee. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
      amount
    );

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.smallCenter}>
          <h1 style={{ color: "#1f2937", margin: "0" }}>Loading Employee...</h1>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={S.page}>
        <div style={S.smallCenter}>
          <h1 style={{ color: "#1f2937", margin: "0" }}>Employee Not Found</h1>
          <p style={{ color: "#6b7280" }}>
            The employee you're trying to edit could not be found.
          </p>
          <a href="/dashboard/employees" style={S.navLink}>
            ← Back to Employees
          </a>
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
              💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Edit Employee
            </h1>
            <p style={S.headerSubtitle}>
              Update employee details for {employee.firstName} {employee.lastName} (
              {employee.employeeNumber})
            </p>
          </div>
          <nav style={S.nav}>
            <a href="/dashboard" style={S.navLink}>
              Dashboard
            </a>
            <a href="/dashboard/employees" style={S.navLink}>
              Employees
            </a>
            <a href={`/dashboard/employees/${employee.id}`} style={S.navLink}>
              ← Back to Details
            </a>
          </nav>
        </div>

        {/* Main Form Card */}
        <div style={S.card}>
          <form onSubmit={handleSubmit}>
            {/* Personal Information Section */}
            <div style={{ marginBottom: "40px" }}>
              <h2 style={S.sectionTitle}>Personal Information</h2>

              <div style={S.grid}>
                <div>
                  <label style={S.label}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    style={S.input}
                  />
                </div>

                <div>
                  <label style={S.label}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    style={S.input}
                  />
                </div>

                <div>
                  <label style={S.label}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    style={S.input}
                  />
                </div>

                <div>
                  <label style={S.label}>Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+44 7700 900123"
                    style={S.input}
                  />
                </div>

                <div>
                  <label style={S.label}>Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      handleInputChange("dateOfBirth", e.target.value)
                    }
                    style={S.input}
                  />
                </div>

                <div>
                  <label style={S.label}>National Insurance Number</label>
                  <input
                    type="text"
                    value={formData.nationalInsurance}
                    onChange={(e) =>
                      handleInputChange("nationalInsurance", e.target.value)
                    }
                    placeholder="AB123456C"
                    style={S.input}
                  />
                </div>
              </div>
            </div>

            {/* Employment Information Section */}
            <div style={{ marginBottom: "40px" }}>
              <h2 style={S.sectionTitle}>Employment Information</h2>

              <div style={S.grid}>
                <div>
                  <label style={S.label}>Employment Type *</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) =>
                      handleInputChange(
                        "employmentType",
                        e.target.value as EmploymentType
                      )
                    }
                    style={S.input as React.CSSProperties}
                  >
                    {employmentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={S.label}>Hire Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.hireDate}
                    onChange={(e) => handleInputChange("hireDate", e.target.value)}
                    style={S.input}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={S.label}>Annual Salary (£) *</label>
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
                    style={S.input}
                  />
                  {formData.annualSalary > 0 && (
                    <p style={S.salaryHint}>
                      Annual Salary: {formatCurrency(formData.annualSalary)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div style={{ marginBottom: "40px" }}>
              <h2 style={S.sectionTitle}>Address Information</h2>

              <div style={S.grid}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={S.label}>Address Line 1 *</label>
                  <input
                    type="text"
                    required
                    value={formData.address.line1}
                    onChange={(e) =>
                      handleInputChange("address.line1", e.target.value)
                    }
                    placeholder="123 Main Street"
                    style={S.input}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={S.label}>Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address.line2}
                    onChange={(e) =>
                      handleInputChange("address.line2", e.target.value)
                    }
                    placeholder="Apartment, suite, etc. (optional)"
                    style={S.input}
                  />
                </div>

                <div>
                  <label style={S.label}>City *</label>
                  <input
                    type="text"
                    required
                    value={formData.address.city}
                    onChange={(e) =>
                      handleInputChange("address.city", e.target.value)
                    }
                    placeholder="London"
                    style={S.input}
                  />
                </div>

                <div>
                  <label style={S.label}>County</label>
                  <input
                    type="text"
                    value={formData.address.county}
                    onChange={(e) =>
                      handleInputChange("address.county", e.target.value)
                    }
                    placeholder="Greater London"
                    style={S.input}
                  />
                </div>

                <div>
                  <label style={S.label}>Postcode *</label>
                  <input
                    type="text"
                    required
                    value={formData.address.postcode}
                    onChange={(e) =>
                      handleInputChange("address.postcode", e.target.value)
                    }
                    placeholder="SW1A 1AA"
                    style={S.input}
                  />
                </div>
              </div>
            </div>

            {/* Auto-Enrollment Status */}
            {autoEnrollmentStatus && (
              <div style={S.aeBox}>
                <h3 style={S.aeTitle}>Auto-Enrollment Status</h3>
                <p style={S.aeText}>{autoEnrollmentStatus}</p>
              </div>
            )}

            {/* Submit Button */}
            <div style={S.actions}>
              <a href={`/dashboard/employees/${employee.id}`} style={S.cancel}>
                Cancel
              </a>
              <button
                type="submit"
                disabled={saving}
                style={{
                  ...S.submit,
                  backgroundColor: saving ? "#9ca3af" : "#10b981",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving Changes..." : "✅ Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Help Information */}
        <div style={S.helpCard}>
          <h3 style={S.helpTitle}>Edit Employee Information</h3>
          <div style={S.helpGrid}>
            <p style={S.helpP}>
              <strong>Required Fields:</strong> Fields marked with * must be completed
              before saving
            </p>
            <p style={S.helpP}>
              <strong>Auto-Enrollment:</strong> Status automatically updates based on
              age and salary
            </p>
            <p style={S.helpP}>
              <strong>Changes:</strong> All changes will be saved and reflected in
              payroll immediately
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
