"use client";

import type { CSSProperties } from "react";

export default function Dashboard() {
  // Styles (converted from invalid inline syntax; visuals unchanged)
  const page: CSSProperties = {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    background:
      "linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)",
    minHeight: "100vh",
    padding: "40px 20px",
  };

  const container: CSSProperties = { maxWidth: "1200px", margin: "0 auto" };

  const headerCard: CSSProperties = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    padding: "20px 40px",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
    marginBottom: "30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  };

  const title: CSSProperties = {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#1f2937",
    margin: 0,
  };

  const nav: CSSProperties = { display: "flex", gap: "24px" };

  const navLink: CSSProperties = {
    color: "#000000",
    textDecoration: "none",
    fontWeight: "bold",
    padding: "8px 16px",
    borderRadius: "6px",
    backgroundColor: "#10b981",
    border: "1px solid #059669",
  };

  const statsGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
    marginBottom: "40px",
  };

  const card: CSSProperties = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    padding: "32px",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  };

  const rowBetween: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  };

  const h3: CSSProperties = {
    fontSize: "14px",
    fontWeight: 500,
    color: "#6b7280",
    margin: "0 0 8px 0",
  };

  const bigNumDark: CSSProperties = {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#1f2937",
    margin: 0,
  };

  const chipLink: CSSProperties = {
    backgroundColor: "#f3f4f6",
    color: "#374151",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
    textDecoration: "none",
    display: "inline-block",
  };

  const quickGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "24px",
  };

  const centerCard: CSSProperties = { ...card, textAlign: "center" };

  const actionBtn: CSSProperties = {
    display: "inline-block",
    padding: "12px 24px",
    backgroundColor: "#10b981",
    color: "#000000",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
    border: "1px solid #059669",
  };

  return (
    <div style={page}>
      <div style={container}>
        {/* Navigation Header */}
        <div style={headerCard}>
          <div>
            <h1 style={title}>
              💼 <span style={{ color: "#3b82f6" }}>WageFlow</span> Dashboard
            </h1>
          </div>
          <nav style={nav}>
            <a href="/dashboard/employees" style={navLink}>
              Employees
            </a>
            <a href="/dashboard/payroll" style={navLink}>
              Payroll
            </a>
            <a href="/dashboard/absence" style={navLink}>
              Absence
            </a>
            <a href="/dashboard/settings" style={navLink}>
              Settings
            </a>
          </nav>
        </div>

        {/* Stats Grid */}
        <div style={statsGrid}>
          <div style={card}>
            <div style={rowBetween}>
              <div>
                <h3 style={h3}>Total Employees</h3>
                <p style={bigNumDark}>3</p>
              </div>
              <div style={{ fontSize: "32px" }}>👥</div>
            </div>
            <a href="/dashboard/employees" style={chipLink}>
              View All
            </a>
          </div>

          <div style={card}>
            <div style={rowBetween}>
              <div>
                <h3 style={h3}>Monthly Payroll</h3>
                <p style={bigNumDark}>£11,083</p>
              </div>
              <div style={{ fontSize: "32px" }}>💷</div>
            </div>
            <a href="/dashboard/payroll" style={chipLink}>
              View Details
            </a>
          </div>

          <div style={card}>
            <div style={rowBetween}>
              <div>
                <h3 style={h3}>On Leave Today</h3>
                <p style={bigNumDark}>0</p>
              </div>
              <div style={{ fontSize: "32px" }}>📅</div>
            </div>
            <a href="/dashboard/absence" style={chipLink}>
              Manage
            </a>
          </div>

          <div style={card}>
            <div style={rowBetween}>
              <div>
                <h3 style={h3}>Company Settings</h3>
                <p style={bigNumDark}>PAYE</p>
              </div>
              <div style={{ fontSize: "32px" }}>🏢</div>
            </div>
            <a href="/dashboard/settings" style={chipLink}>
              Configure
            </a>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={quickGrid}>
          <div style={centerCard}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>👤</div>
            <h3
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#1f2937",
                margin: "0 0 12px 0",
              }}
            >
              Add New Employee
            </h3>
            <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px 0" }}>
              Add a new employee to your payroll system
            </p>
            <a href="/dashboard/employees/new" style={actionBtn}>
              Add Employee
            </a>
          </div>

          <div style={centerCard}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>£</div>
            <h3
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#1f2937",
                margin: "0 0 12px 0",
              }}
            >
              Run Payroll
            </h3>
            <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px 0" }}>
              Process payroll for your employees
            </p>
            <a href="/dashboard/payroll/new" style={actionBtn}>
              Run Payroll
            </a>
          </div>

          <div style={centerCard}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📅</div>
            <h3
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#1f2937",
                margin: "0 0 12px 0",
              }}
            >
              Record Absence
            </h3>
            <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px 0" }}>
              Record employee holidays and sick leave
            </p>
            <a href="/dashboard/absence" style={actionBtn}>
              Manage Absence
            </a>
          </div>

          <div style={centerCard}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏢</div>
            <h3
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#1f2937",
                margin: "0 0 12px 0",
              }}
            >
              Company Settings
            </h3>
            <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px 0" }}>
              Configure PAYE reference and company details
            </p>
            <a href="/dashboard/settings" style={actionBtn}>
              Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
