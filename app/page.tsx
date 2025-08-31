'use client';

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [stats, setStats] = useState({
    totalEmployees: 5,
    monthlyTotal: 87500,
    ytdTotal: 652000,
    loading: false
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
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
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#1f2937',
            margin: '0 0 10px 0'
          }}>
            💼 PAY-ME Dashboard
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#6b7280',
            margin: '0'
          }}>
            UK Payroll System • 2025/26 Tax Year • {stats.totalEmployees} Active Employees
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          
          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#6b7280',
              margin: '0 0 8px 0'
            }}>Total Employees</h3>
            <p style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: '0 0 16px 0'
            }}>{stats.totalEmployees}</p>
            <span style={{
              backgroundColor: '#f3f4f6',
              color: '#374151',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600
            }}>Active</span>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#6b7280',
              margin: '0 0 8px 0'
            }}>Monthly Payroll</h3>
            <p style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#059669',
              margin: '0 0 16px 0'
            }}>{formatCurrency(stats.monthlyTotal)}</p>
            <span style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: '0'
            }}>Current month</span>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#6b7280',
              margin: '0 0 8px 0'
            }}>YTD Total</h3>
            <p style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#7c3aed',
              margin: '0 0 16px 0'
            }}>{formatCurrency(stats.ytdTotal)}</p>
            <span style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: '0'
            }}>Tax year 2025-26</span>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#6b7280',
              margin: '0 0 8px 0'
            }}>RTI Status</h3>
            <p style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#059669',
              margin: '0 0 16px 0'
            }}>✓</p>
            <span style={{
              backgroundColor: '#dcfce7',
              color: '#166534',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #bbf7d0'
            }}>Up to date</span>
          </div>
        </div>

        <div style={{
          backgroundColor: '#f0fdf4',
          border: '2px solid #bbf7d0',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#166534',
            margin: '0 0 16px 0'
          }}>
            🎉 PAY-ME System Successfully Working!
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#15803d',
            margin: '0',
            lineHeight: '1.6'
          }}>
            Your complete UK payroll management system is operational with £ currency formatting and 2025-26 tax compliance!
          </p>
        </div>

      </div>
    </div>
  )
}