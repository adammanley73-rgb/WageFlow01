'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import Link from 'next/link';

type AbsenceType = {
  id: string;
  name: string;
  description: string;
  is_paid: boolean;
  requires_medical_cert: boolean;
  color_code: string;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  employmentType: string;
};

type AbsenceEntitlement = {
  absence_type_id: string;
  total_entitlement_days: number;
  used_days: number;
  remaining_days: number;
};

type AbsenceRequest = {
  id: string;
  employee_id: string;
  employeeName: string;
  absence_type_id: string;
  absence_type_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string;
  requested_at: string;
};

const S = {
  page: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    minHeight: '100vh',
    background:
      'linear-gradient(180deg, #10b981 0%, #059669 35%, #1e40af 65%, #3b82f6 100%)',
    padding: '24px',
  } as const,
  max: { maxWidth: '1200px', margin: '0 auto' } as const,
  backLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '16px',
    opacity: 0.9,
    marginBottom: '16px',
    display: 'inline-block',
  } as const,
  headerH1: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    margin: '16px 0 8px 0',
  } as const,
  headerP: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '16px',
    margin: '0 0 32px 0',
  } as const,
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.2), 0 10px 25px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    marginBottom: '24px',
  } as const,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  } as const,
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '20px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '8px',
  } as const,
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    marginBottom: '16px',
  } as const,
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '6px',
  } as const,
  button: {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as const,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
    textAlign: 'left' as const,
    fontWeight: 600,
    color: '#374151',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    color: '#1f2937',
  },
  badge: (status: string): CSSProperties => ({
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor:
      status === 'approved'
        ? '#d1fae5'
        : status === 'pending'
        ? '#fef3c7'
        : status === 'rejected'
        ? '#fee2e2'
        : '#f3f4f6',
    color:
      status === 'approved'
        ? '#065f46'
        : status === 'pending'
        ? '#92400e'
        : status === 'rejected'
        ? '#991b1b'
        : '#374151',
  }),
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
    textAlign: 'center' as const,
  } as const,
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 8px 0',
  } as const,
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  } as const,
    textarea: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    marginBottom: '16px',
    minHeight: '80px',
    resize: 'vertical' as const,
  } as const,

  checkboxRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '16px',
  } as const,
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
  } as const,
  totalDays: {
    backgroundColor: '#f0f9ff',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #bae6fd',
    color: '#0369a1',
  } as const,
  actionRow: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
  } as const,
  cancelBtn: {
    padding: '12px 24px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  } as const,
  noData: {
    textAlign: 'center' as const,
    color: '#6b7280',
    fontStyle: 'italic' as const,
    padding: '40px',
  } as const,
  tableWrapper: {
    overflowX: 'auto' as const,
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  } as const,
};

export default function AbsenceManagementPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [entitlements, setEntitlements] = useState<AbsenceEntitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    absence_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    half_day_start: false,
    half_day_end: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const employeesRes = await fetch('/api/employees');
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json();
        setEmployees(employeesData);
      }

      const typesRes = await fetch('/api/absence/types');
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setAbsenceTypes(typesData);
      }

      const requestsRes = await fetch('/api/absence/requests');
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setAbsenceRequests(requestsData);
      }

      const entitlementsRes = await fetch('/api/absence/entitlements');
      if (entitlementsRes.ok) {
        const entitlementsData = await entitlementsRes.json();
        setEntitlements(entitlementsData);
      }
    } catch (error) {
      console.error('Error loading absence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const timeDiff = end.getTime() - start.getTime();
    let daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    if (formData.half_day_start) daysDiff -= 0.5;
    if (formData.half_day_end) daysDiff -= 0.5;

    return Math.max(0, daysDiff);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalDays = calculateDays();

    try {
      const response = await fetch('/api/absence/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          total_days: totalDays,
        }),
      });

      if (response.ok) {
        alert('Absence request submitted successfully!');
        setShowForm(false);
        setFormData({
          employee_id: '',
          absence_type_id: '',
          start_date: '',
          end_date: '',
          reason: '',
          half_day_start: false,
          half_day_end: false,
        });
        loadData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error submitting absence request:', error);
      alert('Error submitting request. Please try again.');
    }
  };

  const getEmployeeEntitlement = (employeeId: string, typeId: string) => {
    return entitlements.find(
      (e) =>
        e.absence_type_id === typeId &&
        // placeholder until entitlements keyed by employee
        true
    );
  };

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.max}>
          <div style={S.card}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading absence management...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.max}>
        <Link href="/dashboard" style={S.backLink}>
          ← Back to Dashboard
        </Link>

        <h1 style={S.headerH1}>📅 Absence Management</h1>
        <p style={S.headerP}>Manage employee holidays, sick leave, and other absences</p>

        {/* Quick Stats */}
        <div style={S.grid}>
          <div style={S.card}>
            <h3 style={S.sectionTitle}>📊 Today&apos;s Overview</h3>
            <div style={S.statsGrid}>
              <div>
                <div style={S.statNumber}>
                  {
                    absenceRequests.filter(
                      (r) =>
                        r.status === 'approved' &&
                        new Date(r.start_date) <= new Date() &&
                        new Date(r.end_date) >= new Date()
                    ).length
                  }
                </div>
                <p style={S.statLabel}>On Leave Today</p>
              </div>
              <div>
                <div style={S.statNumber}>
                  {absenceRequests.filter((r) => r.status === 'pending').length}
                </div>
                <p style={S.statLabel}>Pending Requests</p>
              </div>
              <div>
                <div style={S.statNumber}>{employees.length}</div>
                <p style={S.statLabel}>Total Employees</p>
              </div>
            </div>
          </div>

          <div style={S.card}>
            <h3 style={S.sectionTitle}>🎯 Quick Actions</h3>
            <button onClick={() => setShowForm(true)} style={S.button}>
              📝 Record New Absence
            </button>
          </div>
        </div>

        {/* New Absence Form */}
        {showForm && (
          <div style={S.card}>
            <h2 style={S.sectionTitle}>📝 Record New Absence</h2>
            <form onSubmit={handleSubmit}>
              <div style={S.grid}>
                <div>
                  <label style={S.label}>Employee *</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, employee_id: e.target.value }))
                    }
                    style={S.input}
                    required
                  >
                    <option value="">Select employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={S.label}>Absence Type *</label>
                  <select
                    value={formData.absence_type_id}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, absence_type_id: e.target.value }))
                    }
                    style={S.input}
                    required
                  >
                    <option value="">Select type...</option>
                    {absenceTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} {!type.is_paid && '(Unpaid)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={S.label}>Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, start_date: e.target.value }))
                    }
                    style={S.input}
                    required
                  />
                </div>

                <div>
                  <label style={S.label}>End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, end_date: e.target.value }))
                    }
                    style={S.input}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={S.label}>Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData((p) => ({ ...p, reason: e.target.value }))}
                  style={S.textarea}
                  placeholder="Optional reason for absence..."
                />
              </div>

              <div style={S.checkboxRow}>
                <label style={S.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.half_day_start}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, half_day_start: e.target.checked }))
                    }
                  />
                  Half day start
                </label>
                <label style={S.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.half_day_end}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, half_day_end: e.target.checked }))
                    }
                  />
                  Half day end
                </label>
              </div>

              {formData.start_date && formData.end_date && (
                <div style={S.totalDays}>
                  <strong>Total Days: {calculateDays()}</strong>
                </div>
              )}

              <div style={S.actionRow}>
                <button type="submit" style={S.button}>
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={S.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recent Absence Requests */}
        <div style={S.card}>
          <h2 style={S.sectionTitle}>📋 Recent Absence Requests</h2>
          {absenceRequests.length === 0 ? (
            <p style={S.noData}>
              No absence requests yet. Click "Record New Absence" to get started.
            </p>
          ) : (
            <div style={S.tableWrapper}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Employee</th>
                    <th style={S.th}>Type</th>
                    <th style={S.th}>Dates</th>
                    <th style={S.th}>Days</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {absenceRequests.slice(0, 10).map((request) => (
                    <tr key={request.id}>
                      <td style={S.td}>{request.employeeName}</td>
                      <td style={S.td}>{request.absence_type_name}</td>
                      <td style={S.td}>
                        {new Date(request.start_date).toLocaleDateString('en-GB')} -{' '}
                        {new Date(request.end_date).toLocaleDateString('en-GB')}
                      </td>
                      <td style={S.td}>{request.total_days}</td>
                      <td style={S.td}>
                        <span style={S.badge(request.status)}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </td>
                      <td style={S.td}>
                        {new Date(request.requested_at).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
