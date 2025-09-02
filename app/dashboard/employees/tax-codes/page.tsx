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
  personalAllowance: number;
  lastUpdated: string;
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

// UK Date formatting helper - dd/mm/yyyy
const formatDateUK = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// UK Currency formatting helper
const formatCurrencyUK = (amount: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export default function TaxCodesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [newTaxCode, setNewTaxCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
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
    { code: 'T', description: 'Other items affecting allowance', category: 'Other Codes' }
  ];

  useEffect(() => {
    // Demo data
    setEmployees([
      {
        id: 'emp-001',
        name: 'Sarah Johnson',
        employeeNumber: 'EMP001',
        email: 'sarah.johnson@company.co.uk',
        currentTaxCode: '1257L',
        taxCodeStatus: 'normal',
        personalAllowance: 12570,
        lastUpdated: '2025-04-01',
        annualSalary: 35000
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
        annualSalary: 28000
      },
      {
        id: 'emp-003',
        name: 'Emma Brown',
        employeeNumber: 'EMP003',
        email: 'emma.brown@company.co.uk',
        currentTaxCode: 'K497',
        taxCodeStatus: 'normal',
        personalAllowance: -4970,
        lastUpdated: '2025-04-01',
        annualSalary: 45000
      }
    ]);
    
    // Set default date to today
    const today = new Date();
    setEffectiveDate(today.toISOString().split('T')[0]);
  }, []);

  // Tax calculation for 2025-26
  const calculateTaxImpact = useCallback((): TaxComparison | null => {
    if (!selectedEmployee || !newTaxCode) return null;
    
    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) return null;
    
    const monthlySalary = employee.annualSalary / 12;
    
    // UK tax bands for 2025-26
    const calculateTaxFromTaxableIncome = (annualTaxableIncome: number): number => {
      if (annualTaxableIncome <= 0) return 0;
      
      const basicRateThreshold = 37700;
      const higherRateThreshold = 125140;
      
      let annualTax = 0;
      
      // Basic rate: 20%
      if (annualTaxableIncome > 0) {
        const basicRateTaxable = Math.min(annualTaxableIncome, basicRateThreshold);
        annualTax += basicRateTaxable * 0.20;
      }
      
      // Higher rate: 40%
      if (annualTaxableIncome > basicRateThreshold) {
        const higherRateTaxable = Math.min(
          annualTaxableIncome - basicRateThreshold, 
          higherRateThreshold - basicRateThreshold
        );
        annualTax += higherRateTaxable * 0.40;
      }
      
      // Additional rate: 45%
      if (annualTaxableIncome > higherRateThreshold) {
        const additionalRateTaxable = annualTaxableIncome - higherRateThreshold;
        annualTax += additionalRateTaxable * 0.45;
      }
      
      return annualTax;
    };
    
    // Scottish tax calculation
    const calculateScottishTax = (annualTaxableIncome: number): number => {
      if (annualTaxableIncome <= 0) return 0;
      
      let annualTax = 0;
      
      // Scottish tax bands for 2025-26
      const bands = [
        { limit: 2827, rate: 0.19 },      // Starter rate
        { limit: 14921, rate: 0.20 },     // Basic rate
        { limit: 31092, rate: 0.21 },     // Intermediate rate
        { limit: 125140, rate: 0.42 },    // Higher rate
        { limit: Infinity, rate: 0.47 }   // Additional rate
      ];
      
      let remainingIncome = annualTaxableIncome;
      let previousLimit = 0;
      
      for (const band of bands) {
        if (remainingIncome <= 0) break;
        
        const bandWidth = Math.min(band.limit - previousLimit, remainingIncome);
        annualTax += bandWidth * band.rate;
        
        remainingIncome -= bandWidth;
        previousLimit = band.limit;
      }
      
      return annualTax;
    };
    
    // Main tax calculation function
    const calculateTaxForCode = (taxCode: string, monthlyGross: number): number => {
      const upperTaxCode = taxCode.toUpperCase();
      const annualGross = monthlyGross * 12;
      
      // Emergency tax codes
      if (upperTaxCode === 'BR') return monthlyGross * 0.20;
      if (upperTaxCode === 'D0') return monthlyGross * 0.40;
      if (upperTaxCode === 'D1') return monthlyGross * 0.45;
      if (upperTaxCode === 'NT') return 0;
      if (upperTaxCode === '0T') return calculateTaxFromTaxableIncome(annualGross) / 12;
      
      // K codes - negative allowance
      if (upperTaxCode.startsWith('K')) {
        const kNumber = parseInt(upperTaxCode.substring(1));
        if (!isNaN(kNumber) && kNumber > 0) {
          const annualKAmount = kNumber * 10;
          const adjustedAnnualTaxableIncome = annualGross + annualKAmount;
          
          let calculatedAnnualTax = calculateTaxFromTaxableIncome(adjustedAnnualTaxableIncome);
          let calculatedMonthlyTax = calculatedAnnualTax / 12;
          
          // Apply 50% rule for K codes
          const normalMonthlyTax = calculateTaxFromTaxableIncome(annualGross) / 12;
          const additionalMonthlyTax = calculatedMonthlyTax - normalMonthlyTax;
          const maxAdditionalMonthlyTax = monthlyGross * 0.50;
          
          if (additionalMonthlyTax > maxAdditionalMonthlyTax) {
            calculatedMonthlyTax = normalMonthlyTax + maxAdditionalMonthlyTax;
          }
          
          return Math.round(calculatedMonthlyTax * 100) / 100;
        }
      }
      
      // L and T codes with allowance
      if (upperTaxCode.endsWith('L') || upperTaxCode.endsWith('T')) {
        const isScottish = upperTaxCode.startsWith('S');
        let numericPart = upperTaxCode;
        
        if (isScottish) {
          numericPart = upperTaxCode.substring(1, upperTaxCode.length - 1);
        } else {
          numericPart = upperTaxCode.substring(0, upperTaxCode.length - 1);
        }
        
        const allowanceNumber = parseInt(numericPart) || 1257;
        const annualAllowance = allowanceNumber * 10;
        const annualTaxableIncome = Math.max(0, annualGross - annualAllowance);
        
        const annualTax = isScottish 
          ? calculateScottishTax(annualTaxableIncome)
          : calculateTaxFromTaxableIncome(annualTaxableIncome);
        
        return annualTax / 12;
      }
      
      // Simple T code without number
      if (upperTaxCode === 'T') {
        const standardAllowance = 12570; // 2025-26 standard allowance
        const annualTaxableIncome = Math.max(0, annualGross - standardAllowance);
        return calculateTaxFromTaxableIncome(annualTaxableIncome) / 12;
      }
      
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
        : null
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
    
    const updatedEmployees = employees.map(emp => 
      emp.id === selectedEmployee 
        ? {
            ...emp,
            currentTaxCode: newTaxCode,
            taxCodeStatus: (/^(BR|D0|D1|0T)$/i.test(newTaxCode) ? 'emergency' : 'normal') as 'normal' | 'emergency',
            lastUpdated: effectiveDate
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
    if (/^(BR|D0|D1|0T)$/i.test(code)) return '#dc2626';
    if (code.toUpperCase().startsWith('K')) return '#d97706';
    if (code.toUpperCase().startsWith('S')) return '#7c3aed';
    return '#059669';
  };

  const handleEmployeeRowClick = (employeeId: string) => {
    setSelectedEmployee(employeeId);
  };

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Navigate back to employees');
  };

  return (
    <div className="p-5 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Employees
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Tax Code Management
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-5">
              Update Tax Code
            </h2>

            {/* Employee Selection */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employee *
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose an employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeNumber}) - Current: {emp.currentTaxCode}
                  </option>
                ))}
              </select>
            </div>

            {/* Tax Code Selection */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Tax Code *
              </label>
              <select
                value={newTaxCode}
                onChange={(e) => setNewTaxCode(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    {options.map(option => (
                      <option key={option.code} value={option.code}>
                        {option.code} - {option.description}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Effective Date */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective Date *
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Change Reason */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Change *
              </label>
              <select
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional information..."
                className="w-full p-3 border border-gray-300 rounded-md text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Update Button */}
            <button
              onClick={handleUpdateTaxCode}
              disabled={!selectedEmployee || !newTaxCode || !effectiveDate || !changeReason}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-md text-base disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              Update Tax Code
            </button>
          </div>

          {/* Right Column - Preview & Employee List */}
          <div className="space-y-6">
            {/* Tax Impact Preview */}
            {taxComparison && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator size={20} className="text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Tax Impact Preview
                  </h3>
                </div>

                {/* K Code Warning */}
                {taxComparison.kCodeWarning && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                    <span className="text-sm text-amber-800">
                      {taxComparison.kCodeWarning}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Current */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Current ({taxComparison.currentCode})
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrencyUK(taxComparison.currentMonthlyTax)}
                    </div>
                    <div className="text-xs text-gray-500">per month</div>
                  </div>

                  {/* New */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      New ({taxComparison.newCode})
                    </div>
                    <div 
                      className="text-xl font-bold"
                      style={{ color: getTaxCodeColor(taxComparison.newCode) }}
                    >
                      {formatCurrencyUK(taxComparison.newMonthlyTax)}
                    </div>
                    <div className="text-xs text-gray-500">per month</div>
                  </div>
                </div>

                {/* Difference */}
                <div className="bg-slate-50 p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Monthly Difference:
                    </span>
                    <span 
                      className="text-base font-bold"
                      style={{ color: taxComparison.monthlyDifference >= 0 ? '#dc2626' : '#059669' }}
                    >
                      {taxComparison.monthlyDifference >= 0 ? '+' : ''}
                      {formatCurrencyUK(taxComparison.monthlyDifference)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium text-gray-700">
                      Annual Difference:
                    </span>
                    <span 
                      className="text-base font-bold"
                      style={{ color: taxComparison.annualDifference >= 0 ? '#dc2626' : '#059669' }}
                    >
                      {taxComparison.annualDifference >= 0 ? '+' : ''}
                      {formatCurrencyUK(taxComparison.annualDifference)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Employee List */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Current Employee Tax Codes
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                        Employee
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                        Tax Code
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                        Status
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600 uppercase">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr
                        key={emp.id}
                        className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleEmployeeRowClick(emp.id)}
                      >
                        <td className="py-3 px-2">
                          <div>
                            <div className="font-semibold text-gray-900">{emp.name}</div>
                            <div className="text-xs text-gray-500">{emp.employeeNumber}</div>
                          </div>
                        </td>
                        <td 
                          className="py-3 px-2 text-center font-semibold"
                          style={{ color: getTaxCodeColor(emp.currentTaxCode) }}
                        >
                          {emp.currentTaxCode}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span 
                            className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: emp.taxCodeStatus === 'emergency' ? '#fef2f2' : '#f0fdf4',
                              color: getStatusColor(emp.taxCodeStatus)
                            }}
                          >
                            {emp.taxCodeStatus === 'emergency' ? 'Emergency' : 'Normal'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-sm text-gray-600">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Emergency Tax Codes */}
          <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-red-600">
            <h4 className="text-base font-semibold text-red-600 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} />
              Emergency Tax Codes
            </h4>
            <ul className="text-sm text-gray-700 space-y-1 pl-4">
              <li><strong>BR:</strong> 20% on all income</li>
              <li><strong>D0:</strong> 40% on all income</li>
              <li><strong>D1:</strong> 45% on all income</li>
              <li><strong>0T:</strong> No personal allowance</li>
            </ul>
          </div>

          {/* K Codes Information */}
          <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-amber-600">
            <h4 className="text-base font-semibold text-amber-600 mb-3">
              K Codes (Negative Allowance)
            </h4>
            <ul className="text-sm text-gray-700 space-y-1 pl-4">
              <li>Used when benefits exceed personal allowance</li>
              <li>K497 = £4,970 additional taxable income</li>
              <li>Subject to 50% rule - additional tax capped</li>
              <li>Common for company car/medical benefits</li>
            </ul>
          </div>

          {/* Compliance Notes */}
          <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-green-600">
            <h4 className="text-base font-semibold text-green-600 mb-3 flex items-center gap-2">
              <CheckCircle size={16} />
              HMRC Compliance
            </h4>
            <ul className="text-sm text-gray-700 space-y-1 pl-4">
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