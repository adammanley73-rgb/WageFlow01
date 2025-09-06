import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

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
  address: emp.address || { line1: "", city: "", postcode: "" },
});

// GET /api/employees - Get all employees
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const employees = (data ?? []).map(toAppEmployee);
    return NextResponse.json(employees);
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/employees - Create new employee
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Basic validation / normalization
    const annualSalaryNum =
      typeof body.annualSalary === "number"
        ? body.annualSalary
        : parseFloat(body.annualSalary ?? "0");

    if (!body.firstName || !body.lastName || !body.email || !annualSalaryNum) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Count existing employees (head: true avoids fetching rows)
    const { count, error: countError } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Count error:", countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const empNumber = `EMP${String((Number(count) || 0) + 1).padStart(3, "0")}`;

    const { data, error } = await supabase
      .from("employees")
      .insert({
        employee_id: empNumber,
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone ?? null,
        annual_salary: annualSalaryNum,
        employment_type: body.employmentType ?? "full_time",
        hire_date: body.hireDate ?? new Date().toISOString(),
        status: "active",
        address: {
          line1: body.addressLine1 ?? "",
          city: body.addressCity ?? "",
          postcode: body.addressPostcode ?? "",
        },
      })
      .select("*")
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
