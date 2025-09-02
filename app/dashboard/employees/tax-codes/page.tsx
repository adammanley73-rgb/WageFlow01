'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, AlertTriangle, CheckCircle, Calculator } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  employeeNumber: string;
  email: string;
  currentTaxCode: string;
  taxCodeStatus: 'normal' | 'emergency';
  personalAllowance: number; // annual
  lastUpdated: string; // ISO yyyy-mm-dd
  annualSalary: number;
}

interface TaxCodeOption {
  code: string;
  description: string;
  category: string;
}

interface TaxComparison {
  currentCode: string;
  newCode: string;
  currentMonthlyTax: number;
  newMonthlyTax: number;
  monthlyDifference: number;
  annualDifference: number;
  monthlySalary: number;
  isKCode: boolean;
  kCodeWarning: string | null;
}

// UK Date formatting helper -> dd-mm-yyyy
const formatDateUK = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};

// UK Currency formatting helper (£)
const formatCurrencyUK = (amount: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function TaxCodesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [newTaxCode, setNewTaxCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(''); // yyyy-mm-dd (HTML input value)
  const [changeReason, setChangeReason] = useState('');
  const [notes, setNotes] = useState('');
  const [taxComparison, setTaxComparison] = useState<TaxComparison | null>(null);

  const taxCodeOptions: TaxCodeOption[] = [
    // Standard Codes
    { code: '1257L', description: 'Standard personal allowance', category: 'Standard Codes' },
    { code: '1100L', description: 'Reduced personal allowance', category: 'Standard Codes' },
    { code: '1000L', description: 'Further reduced allowance', category: 'Standard Codes' },

    // Emergency Codes
    { code: 'BR', description: 'Basic rate (20%) on all income', category: 'Emergency Codes' },
    { code: 'D0', description: 'Higher rate (40%) on all income', category: 'Emergency Codes' },
    { code: 'D1', description: 'Additional rate (45%) on all income', category: 'Emergency Codes' },
    { code: '0T', description: 'No personal allowance', category: 'Emergency Codes' },
    { code: 'NT', description: 'No tax deduction', category: 'Emergency Codes' },

    // Scottish Codes
    { code: 'S1257L', description: 'Scottish standard rate', category: 'Scottish Codes' },
    { code: 'S1100L', description: 'Scottish reduced allowance', category: 'Scottish Codes' },

    // K Codes
    { code: 'K497', description: 'Negative allowance (benefits exceed allowance)', category: 'K Codes' },
    { code: 'K500', description: 'Higher negative allowance', category: 'K Codes' },
    { code: 'K600', description: 'Substantial negative allowance', category: 'K Codes' },

    // Other Codes
    { code: 'T', description: 'Other items affecting allowance', category: 'Other Codes' },
  ];

  useEffect(() => {
    // Demo data with ISO dates (display uses dd-mm-yyyy)
    setEmployees([
      {
        id: 'emp-001',
        name: 'Sarah Johnson',
        employeeNumber: 'EMP001',
        email: 'sarah.johnson@company.co.uk',
        currentTaxCode: '1257L',
        taxCodeStatus: 'normal',
        personalAllowance: 12_570,
        lastUpdated: '2025-04-01',
        annualSalary: 35_000,
      },
      {
        id: 'emp-002',
        name: 'James Wilson',
        employeeNumber: 'EMP002',
        email: 'james.wilson@company.co.uk',
        currentTaxCode: 'BR',
        taxCodeStatus: 'emergency',
        personalAllowance: 0,
        lastUpdated: '2025-08-15',
        annualSalary: 28_000,
      },
      {
        id: 'emp-003',
        name: 'Emma Brown',
        employeeNumber: 'EMP003',
        email: 'emma.brown@company.co.uk',
        currentTaxCode: 'K497',
        taxCodeStatus: 'normal',
        personalAllowance: -4_970,
        lastUpdated: '2025-04-01',
        annualSalary: 45_000,
      },
    ]);

    // Default effective date to today (yyyy-mm-dd for input)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setEffectiveDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  // Calculate PAYE for 2025-26
  const calculateTaxImpact = useCallback((): TaxComparison | null => {
    if (!selectedEmployee || !newTaxCode) return null;

    const employee = employees.find((e) => e.id === selectedEmployee);
    if (!employee) return null;

    const monthlySalary = employee.annualSalary / 12;

    // rUK tax bands (taxable income after allowance) 2025-26
    const RUK_BASIC_LIMIT = 37_700; // end of 20%
    const RUK_ADDITIONAL_LIMIT = 125_140; // start 45%

    const calculateTaxFromTaxableIncome = (annualTaxableIncome: number): number => {
      if (annualTaxableIncome <= 0) return 0;
      let annualTax = 0;

      // 20%
      const basic = Math.min(Math.max(annualTaxableIncome, 0), RUK_BASIC_LIMIT);
      annualTax += basic * 0.2;

      // 40%
      if (annualTaxableIncome > RUK_BASIC_LIMIT) {
        const higher = Math.min(
          annualTaxableIncome - RUK_BASIC_LIMIT,
          RUK_ADDITIONAL_LIMIT - RUK_BASIC_LIMIT
        );
        annualTax += higher * 0.4;
      }

      // 45%
      if (annualTaxableIncome > RUK_ADDITIONAL_LIMIT) {
        const additional = annualTaxableIncome - RUK_ADDITIONAL_LIMIT;
        annualTax += additional * 0.45;
      }

      return annualTax;
    };

    // Scottish bands 2025-26 (taxable after allowance)
    // 19% to 2,827; 20% to 14,921; 21% to 31,092; 42% to 125,140; 47% above
    const calculateScottishTax = (annualTaxableIncome: number): number => {
      if (annualTaxableIncome <= 0) return 0;
      let annualTax = 0;

      const STARTER_END = 2_827;
      const BASIC_END = 14_921;
      const INTERMEDIATE_END = 31_092;
      const TOP_START = 125_140;

      const starter = Math.min(annualTaxableIncome, STARTER_END);
      annualTax += starter * 0.19;

      if (annualTaxableIncome > STARTER_END) {
        const basic = Math.min(annualTaxableIncome - STARTER_END, BASIC_END - STARTER_END);
        annualTax += basic * 0.2;
      }

      if (annualTaxableIncome > BASIC_END) {
        const inter = Math.min(annualTaxableIncome - BASIC_END, INTERMEDIATE_END - BASIC_END);
        annualTax += inter * 0.21;
      }

      if (annualTaxableIncome > INTERMEDIATE_END) {
        const higher = Math.min(annualTaxableIncome - INTERMEDIATE_END, TOP_START - INTERMEDIATE_END);
        annualTax += higher * 0.42;
      }

      if (annualTaxableIncome > TOP_START) {
        const top = annualTaxableIncome - TOP_START;
        annualTax += top * 0.47;
      }

      return annualTax;
    };

    const calculateTaxForCode = (taxCode: string, monthlyGross: number): number => {
      const code = taxCode.toUpperCase();
      const annualGross = monthlyGross * 12;

      // Emergency bases
      if (code === 'BR') return monthlyGross * 0.2;
      if (code === 'D0') return monthlyGross * 0.4;
      if (code === 'D1') return monthlyGross * 0.45;
      if (code === 'NT') return 0;
      if (code === '0T') return calculateTaxFromTaxableIncome(annualGross) / 12;

      // K codes: negative allowance, 50% cap per period
      if (code.startsWith('K')) {
        const kNum = parseInt(code.slice(1), 10);
        if (!Number.isNaN(kNum) && kNum > 0) {
          const annualNegAllowance = kNum * 10; // tens of pounds
          const adjustedAnnualTaxable = annualGross + annualNegAllowance;

          const annualTaxWithK = calculateTaxFromTaxableIncome(adjustedAnnualTaxable);
          const monthlyTaxWithK = annualTaxWithK / 12;
          const normalMonthlyTax = calculateTaxFromTaxableIncome(annualGross) / 12;

          const additionalMonthly = monthlyTaxWithK - normalMonthlyTax;
          const maxAdditionalMonthly = monthlyGross * 0.5; // 50% rule

          const cappedMonthlyTax =
            additionalMonthly > maxAdditionalMonthly
              ? normalMonthlyTax + maxAdditionalMonthly
              : monthlyTaxWithK;

          return Math.round(cappedMonthlyTax * 100) / 100;
        }
      }

      // L and T codes (with allowance). Scottish starts with S
      if (code.endsWith('L') || code.endsWith('T')) {
        // Scottish? e.g., S1257L
        const isScottish = code.startsWith('S');
        const numericPart = isScottish ? code.slice(1, -1) : code.slice(0, -1);
        const allowanceNumber = Number.parseInt(numericPart, 10) || 1257; // default for 2025-26
        const annualAllowance = allowanceNumber * 10;
        const annualTaxable = Math.max(0, annualGross - annualAllowance);

        const annualTax = isScottish
          ? calculateScottishTax(annualTaxable)
          : calculateTaxFromTaxableIncome(annualTaxable);

        return annualTax / 12;
      }

      // Default fallback
      return 0;
    };

    const currentMonthlyTax = calculateTaxForCode(employee.currentTaxCode, monthlySalary);
    const newMonthlyTax = calculateTaxForCode(newTaxCode, monthlySalary);

    const monthlyDifference = newMonthlyTax - currentMonthlyTax;
    const annualDifference = monthlyDifference * 12;

    return {
      currentCode: employee.currentTaxCode,
      newCode: newTaxCode,
      currentMonthlyTax: Math.round(currentMonthlyTax * 100) / 100,
      newMonthlyTax: Math.round(newMonthlyTax * 100) / 100,
      monthlyDifference: Math.round(monthlyDifference * 100) / 100,
      annualDifference: Math.round(annualDifference * 100) / 100,
      monthlySalary: Math.round(monthlySalary * 100) / 100,
      isKCode: newTaxCode.toUpperCase().startsWith('K'),
      kCodeWarning: newTaxCode.toUpperCase().startsWith('K')
        ? 'K codes collect additional tax for benefits/state pension. 50% limit applies.'
        : null,
    };
  }, [selectedEmployee, newTaxCode, employees]);

  useEffect(() => {
    const comparison = calculateTaxImpact();
    setTaxComparison(comparison);
  }, [calculateTaxImpact]);

  const handleUpdateTaxCode = () => {
    if (!selectedEmployee || !newTaxCode || !effectiveDate || !changeReason) {
      alert('Please fill in all required fields');
      return;
    }

    const updatedEmployees = employees.map((emp) =>
      emp.id === selectedEmployee
        ? {
            ...emp,
            currentTaxCode: newTaxCode,
            taxCodeStatus: /^(BR|D0|D1|0T)$/i.test(newTaxCode) ? 'emergency' : 'normal',
            lastUpdated: effectiveDate, // ISO date
          }
        : emp
    );

    setEmployees(updatedEmployees);
    setSelectedEmployee('');
    setNewTaxCode('');
    setChangeReason('');
    setNotes('');
    setTaxComparison(null);

    alert('Tax code updated successfully');
  };

  const getStatusColor = (status: string) => {
    return status === 'emergency' ? '#dc2626' : '#059669';
  };

  const getTaxCodeColor = (code: string) => {
    if (/^(BR|D0|D1|0T)$/i.test(code)) return '#dc2626'; // emergency -> red
    if (code.toUpperCase().startsWith('K')) return '#d97706'; // K -> orange
    if (code.toUpperCase().startsWith('S')) return '#7c3aed'; // Scottish -> purple
    return '#059669'; // normal -> green
  };

  const handleEmployeeRowClick = (employeeId: string) => {
    setSelectedEmployee(employeeId);
  };

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // In a real Next.js app, this would navigate back
    console.log('Navigate back to employees');
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={handleBackClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6b7280',
                textDecoration: 'none',
                fontSize: '14px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <ArrowLeft size={16} />
              Back to Employees
            </button>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1f2937',
                margin: 0,
              }}
            >
              Tax Code Management
            </h1>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left Column - Form */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#1f2937',
                marginBottom: '20px',
              }}
            >
              Update Tax Code
            </h2>

            {/* Employee Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Select Employee *
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">Choose an employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeNumber}) - Current: {emp.currentTaxCode}
                  </option>
                ))}
              </select>
            </div>

            {/* Tax Code Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                New Tax Code *
              </label>
              <select
                value={newTaxCode}
                onChange={(e) => setNewTaxCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">Choose a tax code...</option>
                {Object.entries(
                  taxCodeOptions.reduce((acc, option) => {
                    if (!acc[option.category]) acc[option.category] = [];
                    acc[option.category].push(option);
                    return acc;
                  }, {} as Record<string, TaxCodeOption[]>)
                ).map(([category, options]) => (
                  <optgroup key={category} label={category}>
                    {options.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} - {option.description}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Effective Date */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Effective Date *
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* Change Reason */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Reason for Change *
              </label>
              <select
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">Select reason...</option>
                <option value="P45_received">P45 received from previous employer</option>
                <option value="P46_submitted">P46 submitted - new employee</option>
                <option value="hmrc_notification">HMRC tax code notification</option>
                <option value="benefits_change">Company benefits change</option>
                <option value="emergency_basis">Emergency tax basis</option>
                <option value="state_pension">State pension adjustment</option>
                <option value="other">Other (specify in notes)</option>
              </select>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional information..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Update Button */}
            <button
              onClick={handleUpdateTaxCode}
              disabled={!selectedEmployee || !newTaxCode || !effectiveDate || !changeReason}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor:
                  !selectedEmployee || !newTaxCode || !effectiveDate || !changeReason
                    ? '#9ca3af'
                    : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 600,
                cursor:
                  !selectedEmployee || !newTaxCode || !effectiveDate || !changeReason
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Update Tax Code
            </button>
          </div>

          {/* Right Column - Preview & Employee List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Tax Impact Preview */}
            {taxComparison && (
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <Calculator size={20} style={{ color: '#2563eb' }} />
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#1f2937',
                      margin: 0,
                    }}
                  >
                    Tax Impact Preview
                  </h3>
                </div>

                {/* K Code Warning */}
                {taxComparison.kCodeWarning && (
                  <div
                    style={{
                      backgroundColor: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: '14px', color: '#92400e' }}>
                      {taxComparison.kCodeWarning}
                    </span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Current */}
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      Current ({taxComparison.currentCode})
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#374151' }}>
                      {formatCurrencyUK(taxComparison.currentMonthlyTax)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>per month</div>
                  </div>

                  {/* New */}
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      New ({taxComparison.newCode})
                    </div>
                    <div
                      style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: getTaxCodeColor(taxComparison.newCode),
                      }}
                    >
                      {formatCurrencyUK(taxComparison.newMonthlyTax)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>per month</div>
                  </div>
                </div>

                {/* Difference */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '16px',
                    borderRadius: '6px',
                    marginTop: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                      Monthly Difference:
                    </span>
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: taxComparison.monthlyDifference >= 0 ? '#dc2626' : '#059669',
                      }}
                    >
                      {taxComparison.monthlyDifference >= 0 ? '+' : ''}
                      {formatCurrencyUK(taxComparison.monthlyDifference)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '8px',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                      Annual Difference:
                    </span>
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: taxComparison.annualDifference >= 0 ? '#dc2626' : '#059669',
                      }}
                    >
                      {taxComparison.annualDifference >= 0 ? '+' : ''}
                      {formatCurrencyUK(taxComparison.annualDifference)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Employee List */}
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#1f2937',
                  marginBottom: '16px',
                }}
              >
                Current Employee Tax Codes
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '12px 8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                        }}
                      >
                        Employee
                      </th>
                      <th
                        style={{
                          textAlign: 'center',
                          padding: '12px 8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                        }}
                      >
                        Tax Code
                      </th>
                      <th
                        style={{
                          textAlign: 'center',
                          padding: '12px 8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                        }}
                      >
                        Status
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: '12px 8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                        }}
                      >
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr
                        key={emp.id}
                        style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                        onClick={() => handleEmployeeRowClick(emp.id)}
                      >
                        <td style={{ padding: '12px 8px' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1f2937' }}>{emp.name}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{emp.employeeNumber}</div>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '12px 8px',
                            textAlign: 'center',
                            fontWeight: 600,
                            color: getTaxCodeColor(emp.currentTaxCode),
                          }}
                        >
                          {emp.currentTaxCode}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 500,
                              backgroundColor:
                                emp.taxCodeStatus === 'emergency' ? '#fef2f2' : '#f0fdf4',
                              color: getStatusColor(emp.taxCodeStatus),
                            }}
                          >
                            {emp.taxCodeStatus === 'emergency' ? 'Emergency' : 'Normal'}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '12px 8px',
                            textAlign: 'right',
                            fontSize: '14px',
                            color: '#6b7280',
                          }}
                        >
                          {formatDateUK(emp.lastUpdated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
            marginTop: '24px',
          }}
        >
          {/* Emergency Tax Codes */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              borderLeft: '4px solid #dc2626',
            }}
          >
            <h4
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#dc2626',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              Emergency Tax Codes
            </h4>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px', color: '#374151' }}>
              <li>
                <strong>BR:</strong> 20% on all income
              </li>
              <li>
                <strong>D0:</strong> 40% on all income
              </li>
              <li>
                <strong>D1:</strong> 45% on all income
              </li>
              <li>
                <strong>0T:</strong> No personal allowance
              </li>
            </ul>
          </div>

          {/* K Codes Information */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              borderLeft: '4px solid #d97706',
            }}
          >
            <h4
              style={{ fontSize: '16px', fontWeight: 600, color: '#d97706', marginBottom: '12px' }}
            >
              K Codes (Negative Allowance)
            </h4>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px', color: '#374151' }}>
              <li>Used when benefits exceed personal allowance</li>
              <li>K497 = £4,970 additional taxable income</li>
              <li>Subject to 50% rule - additional tax capped</li>
              <li>Common for company car/medical benefits</li>
            </ul>
          </div>

          {/* Compliance Notes */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              borderLeft: '4px solid #059669',
            }}
          >
            <h4
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#059669',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle size={16} />
              HMRC Compliance
            </h4>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px', color: '#374151' }}>
              <li>All changes logged for audit trail</li>
              <li>RTI submissions updated automatically</li>
              <li>P45/P46 integration ready</li>
              <li>Real-time tax impact calculations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}