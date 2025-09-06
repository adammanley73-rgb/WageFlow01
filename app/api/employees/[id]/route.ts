import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

// helper to map DB row -> app shape
const toAppEmployee = (emp: any) => ({
  id: emp.id,
  employeeNumber: emp.employee_id,
  firstName: emp.first_name,
  lastName: emp.last_name,
  email: emp.email,
  phone: emp.phone ?? "",
  annualSalary: Number(emp.annual_salary ?? 0),
  employmentType: emp.employment_type || "full_time",
  status: emp.status || "active",
  hireDate: emp.hire_date,
  address: emp.address ?? { line1: "", city: "", postcode: "" },
});

// GET /api/employees/[id] - Get single employee
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(toAppEmployee(data));
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Basic validation / normalization
    const annualSalaryNum =
      typeof body.annualSalary === "number"
        ? body.annualSalary
        : parseFloat(body.annualSalary ?? "0");

    if (!body.firstName || !body.lastName || !body.email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("employees")
      .update({
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone ?? null,
        annual_salary: isNaN(annualSalaryNum) ? 0 : annualSalaryNum,
        employment_type: body.employmentType ?? "full_time",
        address: {
          line1: body.addressLine1 ?? "",
          city: body.addressCity ?? "",
          postcode: body.addressPostcode ?? "",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: error?.message ?? "Failed to update employee" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      employee: toAppEmployee(data),
    });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id] - Delete employee
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase.from("employees").delete().eq("id", params.id);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
