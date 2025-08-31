'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    annualSalary: 0,
    employeeNumber: '',
    hireDate: new Date().toISOString().split('T')[0],
    nationalInsurance: '',
    address: {
      line1: '',
      city: '',
      postcode: ''
    }
  });

  const [autoEnrollmentStatus, setAutoEnrollmentStatus] = useState('');

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

  const updateAutoEnrollmentStatus = () => {
    if (formData.dateOfBirth && formData.annualSalary > 0) {
      const age = calculateAge(formData.dateOfBirth);
      
      if (age >= 22 && age < 75 && formData.annualSalary >= 10000) {
        setAutoEnrollmentStatus('✅ Eligible (Auto-enrolled into workplace pension)');
      } else if (age >= 16 && age < 75 && formData.annualSalary >= 6240) {
        setAutoEnrollmentStatus('⚪ Entitled (Can opt-in to workplace pension)');
      } else {
        setAutoEnrollmentStatus('❌ Not Eligible (Below age or salary thresholds)');
      }
    } else {
      setAutoEnrollmentStatus('');
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      
      // Update auto-enrollment status when relevant fields change
      if (field === 'dateOfBirth' || field === 'annualSalary') {
        setTimeout(updateAutoEnrollmentStatus, 100);
      }
    }
  };

  const generateEmployeeNumber = () => {
    const randomNum = Math.floor(Math.random() * 900) + 100;
    setFormData(prev => ({
      ...prev,
      employeeNumber: `EMP${randomNum}`
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Success - redirect to employees list
      router.push('/dashboard/employees');
    } catch (error) {
      console.error('Failed to create employee:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  return (
      <div style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        padding: '40px 20px'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          
          {/* Header */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px 40px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: '0 0 8px 0'
              }}>
                👤 Add New Employee
              </h1>
              <p style={{
                color: '#6b7280',
                margin: '0'
              }}>
                Create a new employee record with automatic auto-enrollment calculation
              </p>
            </div>
            <a 
              href="/dashboard/employees"
              style={{
                color: '#4b5563',
                textDecoration: 'none',
                fontWeight: '500',
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}
            >
              ← Back to Employees
            </a>
          </div>

        {/* Form */}
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <form onSubmit={handleSubmit}>
            
            {/* Personal Information */}
            <div style={{ marginBottom: '40px' }} >
              <h2 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: '0 0 24px 0',
                borderBottom: '2px solid #f3f4f6',
                paddingBottom: '8px'
              }}>
                Personal Information
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+44 7700 900000"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    National Insurance Number
                  </label>
                  <input
                    type="text"
                    value={formData.nationalInsurance}
                    onChange={(e) => handleInputChange('nationalInsurance', e.target.value.toUpperCase())}
                    placeholder="AB123456C"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div style={{ marginBottom: '40px' }} >
              <h2 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: '0 0 24px 0',
                borderBottom: '2px solid #f3f4f6',
                paddingBottom: '8px'
              }}>
                Employment Information
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Employee Number *
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }} >
                    <input
                      type="text"
                      required
                      value={formData.employeeNumber}
                      onChange={(e) => handleInputChange('employeeNumber', e.target.value)}
                      style={{
                        flex: '1',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={generateEmployeeNumber}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Generate
                    </button>
                  </div>
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Hire Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.hireDate}
                    onChange={(e) => handleInputChange('hireDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Annual Salary (£) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    value={formData.annualSalary || ''}
                    onChange={(e) => handleInputChange('annualSalary', parseInt(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                  {formData.annualSalary > 0 && (
                    <p style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      margin: '6px 0 0 0'
                    }}>
                      Annual: {formatCurrency(formData.annualSalary)} | Monthly: {formatCurrency(formData.annualSalary / 12)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div style={{ marginBottom: '40px' }} >
              <h2 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: '0 0 24px 0',
                borderBottom: '2px solid #f3f4f6',
                paddingBottom: '8px'
              }}>
                Address Information
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.line1}
                    onChange={(e) => handleInputChange('address.line1', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Postcode *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.postcode}
                    onChange={(e) => handleInputChange('address.postcode', e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Auto-Enrollment Status */}
            {autoEnrollmentStatus && (
              <div style={{
                backgroundColor: '#f0f9ff',
                border: '2px solid #bae6fd',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '40px'
              }}>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#0369a1',
                  margin: '0 0 12px 0'
                }}>
                  🎯 Auto-Enrollment Status
                </h2>
                <p style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#0369a1',
                  margin: '0 0 16px 0'
                }}>
                  {autoEnrollmentStatus}
                </p>
                <div style={{
                  fontSize: '14px',
                  color: '#0369a1',
                  lineHeight: '1.5'
                }}>
                  <p style={{ margin: '0 0 8px 0' }} >
                    <strong>Current Details:</strong> Age {formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : 'N/A'}, 
                    Annual Salary: {formatCurrency(formData.annualSalary || 0)}
                  </p>
                  <p style={{ margin: '0' }} >
                    <strong>UK Requirements:</strong> Auto-enrollment applies to workers aged 22-74 earning £10,000+ per year
                  </p>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '24px',
              borderTop: '2px solid #f3f4f6'
            }}>
              <a 
                href="/dashboard/employees"
                style={{
                  color: '#6b7280',
                  textDecoration: 'none',
                  fontWeight: '500',
                  padding: '12px 24px'
                }}
              >
                Cancel
              </a>
              
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Creating Employee...' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>

        {/* Help Information */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1f2937',
            margin: '0 0 16px 0'
          }}>
            💡 Auto-Enrollment Help
          </h3>
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: '0 0 12px 0' }} >
              <strong>Eligible (Auto-enrolled):</strong> Workers aged 22-74 earning £10,000+ per year are automatically enrolled into the workplace pension scheme.
            </p>
            <p style={{ margin: '0 0 12px 0' }} >
              <strong>Entitled (Can opt-in):</strong> Workers aged 16-74 earning £6,240+ per year can choose to join the workplace pension scheme.
            </p>
            <p style={{ margin: '0' }} >
              <strong>Not Eligible:</strong> Workers below the age or salary thresholds are not eligible for automatic enrollment but may still be able to join.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}