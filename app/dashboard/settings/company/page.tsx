// app/dashboard/settings/company/page.tsx

import React from "react";
import HeaderBanner from "@components/ui/HeaderBanner";

const S = {
  page: { padding: "0.5rem" },
  wrap: { margin: "0 auto", maxWidth: "72rem" },
  panel: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "0.75rem",
    padding: "1.5rem",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  } as React.CSSProperties,
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginTop: "1rem",
  },
  label: { display: "block", fontWeight: 600, marginBottom: "0.25rem" },
  input: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
  },
  saveRow: { marginTop: "1rem", display: "flex", justifyContent: "flex-end" },
  btn: {
    border: "1px solid #d1d5db",
    borderRadius: "0.5rem",
    padding: "0.5rem 1rem",
    background: "#f9fafb",
    cursor: "pointer",
  },
};

export default function CompanySettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-500 to-blue-700 px-4 py-6 md:px-8 lg:px-12">
      <HeaderBanner title="Settings" currentSection="settings" />

      <main style={S.page}>
        <div style={S.wrap}>
          <div style={S.panel}>
            <h2 style={{ marginTop: 0 }}>Company details</h2>

            <div style={S.row}>
              <div>
                <label style={S.label} htmlFor="company_name">
                  Company name
                </label>
                <input id="company_name" name="company_name" style={S.input} placeholder="The Business Consortium Ltd" />
              </div>

              <div>
                <label style={S.label} htmlFor="company_number">
                  Company number
                </label>
                <input id="company_number" name="company_number" style={S.input} placeholder="12345678" />
              </div>

              <div>
                <label style={S.label} htmlFor="paye_reference">
                  PAYE reference
                </label>
                <input id="paye_reference" name="paye_reference" style={S.input} placeholder="123/AB12345" />
              </div>

              <div>
                <label style={S.label} htmlFor="accounts_office_ref">
                  Accounts office reference
                </label>
                <input id="accounts_office_ref" name="accounts_office_ref" style={S.input} placeholder="123PA00123456" />
              </div>
            </div>

            <div style={S.saveRow}>
              <button type="button" style={S.btn}>Save</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
