'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PAY_SCHEDULES, getEmployeesByPaySchedule, type PaySchedule } from '../../../../lib/data/employees';

interface PayScheduleWithCount extends PaySchedule {
  employeeCount: number;
}

export default function PaySchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<PayScheduleWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    frequency: 'monthly' as 'weekly' | 'bi_weekly' | 'monthly',
    payDayOfWeek: undefined as number | undefined,
    payDayOfMonth: undefined as number | undefined,
    description: ''
  });

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = () => {
    const schedulesWithCount = PAY_SCHEDULES.map((schedule) => ({
      ...schedule,
      employeeCount: getEmployeesByPaySchedule(schedule.id).length
    }));
    setSchedules(schedulesWithCount);
    setLoading(false);
  };

  const formatPayDay = (schedule: PayScheduleWithCount) => {
    if (schedule.payDayOfMonth) {
      const suffix =
        schedule.payDayOfMonth === 1
          ? 'st'
          : schedule.payDayOfMonth === 2
          ? 'nd'
          : schedule.payDayOfMonth === 3
          ? 'rd'
          : 'th';
      return `${schedule.payDayOfMonth}${suffix} of month`;
    }
    if (schedule.payDayOfWeek) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return days[schedule.payDayOfWeek - 1];
    }
    return 'Not set';
  };

  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return 'Weekly';
      case 'bi_weekly':
        return 'Bi-Weekly';
      case 'monthly':
        return 'Monthly';
      default:
        return frequency;
    }
  };

  const handleCreateSchedule = () => {
    const newId = `sched-${Date.now()}`;
    const createdSchedule: PayScheduleWithCount = {
      id: newId,
      name: newSchedule.name,
      frequency: newSchedule.frequency,
      payDayOfWeek: newSchedule.payDayOfWeek,
      payDayOfMonth: newSchedule.payDayOfMonth,
      description: newSchedule.description,
      isActive: true,
      employeeCount: 0
    };

    setSchedules((prev) => [...prev, createdSchedule]);
    setShowCreateForm(false);
    setNewSchedule({
      name: '',
      frequency: 'monthly',
      payDayOfWeek: undefined,
      payDayOfMonth: undefined,
      description: ''
    });

    alert('Pay schedule created successfully!');
  };

  const navigateToEmployees = (scheduleId: string) => {
    router.push(`/dashboard/employees?schedule=${scheduleId}`);
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <h2>Loading pay schedules...</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px 20px'
      }}
    >
      {/* Header */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          marginBottom: '40px'
        }}
      >
        <Link
          href="/dashboard/payroll"
          style={{
            color: 'white',
            textDecoration: 'none',
            fontSize: '16px',
            display: 'inline-block',
            marginBottom: '20px',
            opacity: '0.9'
          }}
        >
          ← Back to Payroll Dashboard
        </Link>
        <h1
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: 'white',
            margin: '0 0 16px 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          📅 Pay Schedules
        </h1>
        <p
          style={{
            fontSize: '20px',
            color: 'rgba(255,255,255,0.9)',
            margin: '0',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}
        >
          Manage when different employee groups get paid
        </p>
      </div>

      {/* Create Button */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto 40px auto',
          textAlign: 'right'
        }}
      >
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '16px 32px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#059669';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#10b981';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          + Create New Pay Schedule
        </button>
      </div>

      {/* Schedules Grid */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '30px'
        }}
      >
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-5px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 25px 70px rgba(0, 0, 0, 0.2), 0 10px 25px rgba(0, 0, 0, 0.15)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '24px'
              }}
            >
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    margin: '0 0 8px 0'
                  }}
                >
                  {schedule.name}
                </h3>
                <p
                  style={{
                    fontSize: '16px',
                    color: '#6b7280',
                    margin: '0 0 20px 0',
                    lineHeight: '1.5'
                  }}
                >
                  {schedule.description}
                </p>

                {/* Schedule Details */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '20px'
                  }}
                >
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '12px',
                      border: '1px solid #bbf7d0'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        color: '#166534',
                        fontWeight: '600',
                        display: 'block',
                        marginBottom: '4px'
                      }}
                    >
                      Frequency
                    </span>
                    <span
                      style={{
                        fontSize: '16px',
                        color: '#166534',
                        fontWeight: 'bold'
                      }}
                    >
                      {formatFrequency(schedule.frequency)}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#eff6ff',
                      borderRadius: '12px',
                      border: '1px solid #bfdbfe'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        color: '#1d4ed8',
                        fontWeight: '600',
                        display: 'block',
                        marginBottom: '4px'
                      }}
                    >
                      Pay Day
                    </span>
                    <span
                      style={{
                        fontSize: '16px',
                        color: '#1d4ed8',
                        fontWeight: 'bold'
                      }}
                    >
                      {formatPayDay(schedule)}
                    </span>
                  </div>
                </div>

                {/* Employee Count */}
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '12px',
                    border: '1px solid #fcd34d',
                    textAlign: 'center'
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      color: '#92400e',
                      fontWeight: '600',
                      display: 'block',
                      marginBottom: '4px'
                    }}
                  >
                    Employees Assigned
                  </span>
                  <span
                    style={{
                      fontSize: '28px',
                      color: '#92400e',
                      fontWeight: 'bold'
                    }}
                  >
                    {schedule.employeeCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop: '24px'
              }}
            >
              <button
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#6366f1';
                }}
                onClick={() => alert('Edit functionality coming soon!')}
              >
                Edit Schedule
              </button>

              <button
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#047857';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                }}
                onClick={() => navigateToEmployees(schedule.id)}
              >
                View Employees ({schedule.employeeCount})
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '40px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: '0 0 32px 0',
                textAlign: 'center'
              }}
            >
              Create New Pay Schedule
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                Schedule Name
              </label>
              <input
                type="text"
                value={newSchedule.name}
                onChange={(e) => setNewSchedule((prev) => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
                placeholder="e.g., Executive Team"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                Pay Frequency
              </label>
              <select
                value={newSchedule.frequency}
                onChange={(e) =>
                  setNewSchedule((prev) => ({
                    ...prev,
                    frequency: e.target.value as 'weekly' | 'bi_weekly' | 'monthly',
                    payDayOfWeek: undefined,
                    payDayOfMonth: undefined
                  }))
                }
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="weekly">Weekly</option>
                <option value="bi_weekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {newSchedule.frequency === 'monthly' ? (
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}
                >
                  Day of Month
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={newSchedule.payDayOfMonth || ''}
                  onChange={(e) =>
                    setNewSchedule((prev) => ({
                      ...prev,
                      payDayOfMonth: e.target.value ? parseInt(e.target.value) : undefined
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="e.g., 25"
                />
              </div>
            ) : (
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}
                >
                  Day of Week
                </label>
                <select
                  value={newSchedule.payDayOfWeek || ''}
                  onChange={(e) =>
                    setNewSchedule((prev) => ({
                      ...prev,
                      payDayOfWeek: e.target.value ? parseInt(e.target.value) : undefined
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select day...</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                  <option value="7">Sunday</option>
                </select>
              </div>
            )}

            <div style={{ marginBottom: '32px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                Description
              </label>
              <textarea
                value={newSchedule.description}
                onChange={(e) => setNewSchedule((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
                placeholder="Brief description of this pay schedule..."
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'flex-end'
              }}
            >
              <button
                onClick={() => setShowCreateForm(false)}
                style={{
                  padding: '12px 32px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleCreateSchedule}
                disabled={!newSchedule.name || (!newSchedule.payDayOfMonth && !newSchedule.payDayOfWeek)}
                style={{
                  padding: '12px 32px',
                  backgroundColor:
                    newSchedule.name && (newSchedule.payDayOfMonth || newSchedule.payDayOfWeek)
                      ? '#059669'
                      : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor:
                    newSchedule.name && (newSchedule.payDayOfMonth || newSchedule.payDayOfWeek)
                      ? 'pointer'
                      : 'not-allowed',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#047857';
                  }
                }}
                onMouseOut={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }
                }}
              >
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
