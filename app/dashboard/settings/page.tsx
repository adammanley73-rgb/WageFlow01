'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

type CompanySettings = {
  companyName: string;
  companyNumber: string;
  payeReference: string;
  accountsOfficeReference: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    county: string;
    postcode: string;
  };
  contactEmail: string;
  contactPhone: string;
};

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
    padding: '24px',
  } as React.CSSProperties,
  max: { maxWidth: '800px', margin: '0 auto' } as React.CSSProperties,
  backLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '16px',
    opacity: 0.9,
    marginBottom: '16px',
    display: 'inline-block',
  } as React.CSSProperties,
  headerH1: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    margin: '16px 0 8px 0',
  } as React.CSSProperties,
  headerP: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '16px',
    margin: '0 0 32px 0',
  } as React.CSSProperties,
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.2), 0 10px 25px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '20px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '8px',
  } as React.CSSProperties,
  gridAuto: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '6px',
  } as React.CSSProperties,
  helpText: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  } as React.CSSProperties,
  errorList: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  } as React.CSSProperties,
  errorTitle: {
    color: '#dc2626',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
  } as React.CSSProperties,
  errorItems: {
    color: '#dc2626',
    margin: 0,
    paddingLeft: '20px',
  } as React.CSSProperties,
  successMessage: {
    backgroundColor: '#d1fae5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    color: '#065f46',
    fontWeight: '500',
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    borderTop: '2px solid #e5e7eb',
    paddingTop: '24px',
  } as React.CSSProperties,
  saveBtn: (loading: boolean): React.CSSProperties => ({
    padding: '12px 24px',
    backgroundColor: loading ? '#9ca3af' : '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  } as React.CSSProperties,
  loadingContainer: {
    textAlign: 'center' as const,
    padding: '40px',
  },
  loadingText: {
    marginTop: '16px',
    color: '#6b7280',
  } as React.CSSProperties,
  singleColumn: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px',
  } as React.CSSProperties,
};

export default function CompanySettingsPage(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState<CompanySettings>({
    companyName: '',
    companyNumber: '',
    payeReference: '',
    accountsOfficeReference: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
    },
    contactEmail: '',
    contactPhone: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/company');
      if (response.ok) {
        const settings = await response.json();
        setFormData(settings);
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.companyName.trim()) newErrors.push('Company name is required');

    if (!formData.payeReference.trim()) {
      newErrors.push('PAYE reference is required');
    } else if (!/^\d{3}\/[A-Z]{2}\d{5}$/.test(formData.payeReference)) {
      newErrors.push('PAYE reference must be in format: 123/AB12345');
    }

    if (!formData.accountsOfficeReference.trim()) {
      newErrors.push('Accounts Office reference is required');
    } else if (!/^\d{3}P[A-Z]{8}\d{5}$/.test(formData.accountsOfficeReference)) {
      newErrors.push('Accounts Office reference must be in format: 123PABCDEFGH12345');
    }

    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.push('Valid email address is required');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setSuccessMessage('');

    try {
      const response = await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccessMessage('Company settings saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const error = await response.json();
        setErrors([error.message || 'Failed to save settings']);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrors(['Failed to save settings. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.max}>
          <div style={S.card}>
            <div style={S.loadingContainer}>
              <div style={S.spinner} />
              <p style={S.loadingText}>Loading company settings...</p>
            </div>
          </div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.max}>
        <Link href="/dashboard" style={S.backLink}>
          ← Back to Dashboard
        </Link>

        <h1 style={S.headerH1}>🏢 Company Settings</h1>
        <p style={S.headerP}>
          Configure your company details for UK payroll compliance and HMRC submissions
        </p>

        <div style={S.card}>
          {errors.length > 0 && (
            <div style={S.errorList}>
              <h3 style={S.errorTitle}>Please fix the following errors:</h3>
              <ul style={S.errorItems}>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {successMessage && <div style={S.successMessage}>✅ {successMessage}</div>}

          <form onSubmit={handleSubmit}>
            {/* Company Details */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={S.sectionTitle}>🏭 Company Details</h2>
              <div style={S.gridAuto}>
                <div>
                  <label style={S.label}>Company Name *</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData((p) => ({ ...p, companyName: e.target.value }))}
                    style={S.input}
                    placeholder="Your Company Ltd"
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Companies House Number</label>
                  <input
                    type="text"
                    value={formData.companyNumber}
                    onChange={(e) => setFormData((p) => ({ ...p, companyNumber: e.target.value }))}
                    style={S.input}
                    placeholder="12345678"
                  />
                  <div style={S.helpText}>Optional - 8 digit company registration number</div>
                </div>
              </div>
            </div>

            {/* HMRC References */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={S.sectionTitle}>🏛️ HMRC References</h2>
              <div style={S.gridAuto}>
                <div>
                  <label style={S.label}>PAYE Reference *</label>
                  <input
                    type="text"
                    value={formData.payeReference}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, payeReference: e.target.value.toUpperCase() }))
                    }
                    style={S.input}
                    placeholder="123/AB12345"
                    required
                  />
                  <div style={S.helpText}>
                    Format: 123/AB12345 (from your PAYE scheme registration)
                  </div>
                </div>
                <div>
                  <label style={S.label}>Accounts Office Reference *</label>
                  <input
                    type="text"
                    value={formData.accountsOfficeReference}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        accountsOfficeReference: e.target.value.toUpperCase(),
                      }))
                    }
                    style={S.input}
                    placeholder="123PABCDEFGH12345"
                    required
                  />
                  <div style={S.helpText}>Format: 123PABCDEFGH12345 (17 characters from HMRC)</div>
                </div>
              </div>
            </div>

            {/* Company Address */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={S.sectionTitle}>📍 Company Address</h2>
              <div style={S.singleColumn}>
                <div>
                  <label style={S.label}>Address Line 1</label>
                  <input
                    type="text"
                    value={formData.address.line1}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, address: { ...p.address, line1: e.target.value } }))
                    }
                    style={S.input}
                    placeholder="123 Business Street"
                  />
                </div>
                <div>
                  <label style={S.label}>Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address.line2}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, address: { ...p.address, line2: e.target.value } }))
                    }
                    style={S.input}
                    placeholder="Suite 100 (optional)"
                  />
                </div>
                <div style={S.gridAuto}>
                  <div>
                    <label style={S.label}>City</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, address: { ...p.address, city: e.target.value } }))
                      }
                      style={S.input}
                      placeholder="London"
                    />
                  </div>
                  <div>
                    <label style={S.label}>County</label>
                    <input
                      type="text"
                      value={formData.address.county}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, address: { ...p.address, county: e.target.value } }))
                      }
                      style={S.input}
                      placeholder="Greater London"
                    />
                  </div>
                  <div>
                    <label style={S.label}>Postcode</label>
                    <input
                      type="text"
                      value={formData.address.postcode}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          address: { ...p.address, postcode: e.target.value.toUpperCase() },
                        }))
                      }
                      style={S.input}
                      placeholder="SW1A 1AA"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={S.sectionTitle}>📞 Contact Information</h2>
              <div style={S.gridAuto}>
                <div>
                  <label style={S.label}>Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData((p) => ({ ...p, contactEmail: e.target.value }))}
                    style={S.input}
                    placeholder="payroll@yourcompany.com"
                  />
                </div>
                <div>
                  <label style={S.label}>Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData((p) => ({ ...p, contactPhone: e.target.value }))}
                    style={S.input}
                    placeholder="020 7123 4567"
                  />
                </div>
              </div>
            </div>

            <div style={S.actions}>
              <button type="submit" disabled={saving} style={S.saveBtn(saving)}>
                {saving ? (
                  <>
                    <div style={S.spinner} />
                    Saving Settings...
                  </>
                ) : (
                  <>💾 Save Company Settings</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}