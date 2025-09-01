'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

// UK Date formatting helper
const formatDateUK = (dateString: string): string => {
  const date = new Date(dateString);
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
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [newTaxCode, setNewTaxCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [notes, setNotes] = useState('');
  const [taxComparison, setTaxComparison] = useState<any>(null);

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
    
    // Other Codes
    { code: 'K497', description: 'Negative allowance (benefits exceed allowance)', category: 'Other Codes' },
    { code: 'T', description: 'Other items affecting allowance', category: 'Other Codes' }
  ];

  useEffect(() => {
    // Demo data with UK formatting
    setEmployees([
      {
        id: 'emp-001',
        name: 'Sarah Johnson',
        employeeNumber: 'EMP001',
        email: 'sarah.johnson@company.co.uk',
        currentTaxCode: '1257L',
        taxCodeStatus: 'normal',
        personalAllowance: 12570,
        lastUpdated: '2025-04-01', // ISO format for processing
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
        lastUpdated: '2025-08-15', // ISO format for processing
        annualSalary: 28000
      },
      {
        id: 'emp-003',
        name: 'Emma Brown',
        employeeNumber: 'EMP003',
        email: 'emma.brown@company.co.uk',
        currentTaxCode: '1257L',
        taxCodeStatus: 'normal',
        personalAllowance: 12570,
        lastUpdated: '2025-04-01', // ISO format for processing
        annualSalary: 22000
      }
    ]);
    
    // Set default date to today in YYYY-MM-DD format for input
    const today = new Date();
    setEffectiveDate(today.toISOString().split('T')[0]);
  }, []);

  const calculateTaxImpact = () => {
    if (!selectedEmployee || !newTaxCode) return null;
    
    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) return null;
    
    const monthlySalary = employee.annualSalary / 12;
    
    // Current monthly tax calculation
    let currentMonthlyTax = 0;
    if (employee.currentTaxCode === 'BR') {
      currentMonthlyTax = monthlySalary * 0.20;
    } else if (employee.currentTaxCode === 'D0') {
      currentMonthlyTax = monthlySalary * 0.40;
    } else if (employee.currentTaxCode === 'D1') {
      currentMonthlyTax = monthlySalary * 0.45;
    } else if (employee.currentTaxCode === '1257L') {
      const monthlyAllowance = 12570 / 12;
      const taxableIncome = Math.max(0, monthlySalary - monthlyAllowance);
      currentMonthlyTax = taxableIncome * 0.20;
    }
    
    // New monthly tax calculation
    let newMonthlyTax = 0;
    if (newTaxCode === 'BR') {
      newMonthlyTax = monthlySalary * 0.20;
    } else if (newTaxCode === 'D0') {
      newMonthlyTax = monthlySalary * 0.40;
    } else if (newTaxCode === 'D1') {
      newMonthlyTax = monthlySalary * 0.45;
    } else if (newTaxCode === '1257L') {
      const monthlyAllowance = 12570 / 12;
      const taxableIncome = Math.max(0, monthlySalary - monthlyAllowance);
      newMonthlyTax = taxableIncome * 0.20;
    } else if (newTaxCode === 'NT') {
      newMonthlyTax = 0;
    }
    
    const monthlySaving = currentMonthlyTax - newMonthlyTax;
    
    return {
      currentTax: currentMonthlyTax,
      newTax: newMonthlyTax,
      monthlySaving: monthlySaving,
      currentCodeName: employee.currentTaxCode,
      newCodeName: newTaxCode
    };
  };

  useEffect(() => {
    setTaxComparison(calculateTaxImpact());
  }, [selectedEmployee, newTaxCode]);

  const handleUpdateTaxCode = () => {
    if (!selectedEmployee || !newTaxCode || !effectiveDate || !changeReason) {
      alert('Please fill in all required fields');
      return;
    }
    
    const employee = employees.find(e => e.id === selectedEmployee);
    if (employee) {
      // Update the employee's tax code
      setEmployees(prev => prev.map(emp => 
        emp.id === selectedEmployee 
          ? { ...emp, currentTaxCode: newTaxCode, lastUpdated: effectiveDate, taxCodeStatus: ['BR', 'D0', 'D1', '0T'].includes(newTaxCode) ? 'emergency' : 'normal' }
          : emp
      ));
      
      const savingText = taxComparison?.monthlySaving >= 0 ? `save ${formatCurrencyUK(Math.abs(taxComparison.monthlySaving))}` : `pay an additional ${formatCurrencyUK(Math.abs(taxComparison.monthlySaving))}`;
      
      alert(`✅ Tax Code Updated Successfully!

Employee: ${employee.name}
Changed from: ${employee.currentTaxCode} → ${newTaxCode}
Effective: ${formatDateUK(effectiveDate)}
Reason: ${changeReason}

💰 Impact: Employee will ${savingText} per month

This change will:
• Apply to all future payroll runs
• Be included in RTI submissions to HMRC
• Trigger cumulative tax adjustments if needed
• Be recorded for audit purposes`);
      
      // Reset form
      setSelectedEmployee('');
      setNewTaxCode('');
      setChangeReason('');
      setNotes('');
      setTaxComparison(null);
    }
  };

  const getStatusDisplay = (status: string) => {
    return status === 'emergency' 
      ? { icon: <AlertTriangle className="h-4 w-4" />, text: 'Emergency', color: 'text-red-700 bg-red-100' }
      : { icon: <CheckCircle className="h-4 w-4" />, text: 'Normal', color: 'text-green-700 bg-green-100' };
  };

  const getTaxCodeDisplay = (code: string) => {
    return ['BR', 'D0', 'D1', '0T'].includes(code)
      ? { color: 'text-red-700 bg-red-100', urgent: true }
      : { color: 'text-green-700 bg-green-100', urgent: false };
  };

  const emergencyEmployees = employees.filter(emp => emp.taxCodeStatus === 'emergency');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/dashboard/payroll" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payroll Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Tax Code Management</h1>
            <p className="text-gray-600 mt-2">
              Manage and update employee tax codes for accurate PAYE calculations
            </p>
          </div>
          {emergencyEmployees.length > 0 && (
            <div className="bg-red-100 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800 font-semibold">
                  {emergencyEmployees.length} employee{emergencyEmployees.length > 1 ? 's' : ''} on emergency tax codes
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Tax Codes */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Employee Tax Codes</h2>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            🚨 {emergencyEmployees.length} Emergency Tax Codes
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Employee</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Current Tax Code</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Personal Allowance</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Last Updated</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => {
                const statusDisplay = getStatusDisplay(employee.taxCodeStatus);
                const codeDisplay = getTaxCodeDisplay(employee.currentTaxCode);
                return (
                  <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-gray-900">👩‍💼 {employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.employeeNumber} | {employee.email}</div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${codeDisplay.color}`}>
                        {employee.currentTaxCode}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusDisplay.color}`}>
                        {statusDisplay.icon}
                        <span className="ml-1">{statusDisplay.text}</span>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4 font-medium">
                      {formatCurrencyUK(employee.personalAllowance)}
                    </td>
                    <td className="text-center py-4 px-4 text-gray-600">
                      {formatDateUK(employee.lastUpdated)}
                    </td>
                    <td className="text-center py-4 px-4">
                      <button 
                        onClick={() => setSelectedEmployee(employee.id)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          employee.taxCodeStatus === 'emergency' 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {employee.taxCodeStatus === 'emergency' ? 'Fix' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Tax Code */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Employee Tax Code</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
            <select 
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} (Current: {emp.currentTaxCode})
                  {emp.taxCodeStatus === 'emergency' ? ' ⚠️' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Tax Code</label>
            <select 
              value={newTaxCode}
              onChange={(e) => setNewTaxCode(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select new code...</option>
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Effective Date</label>
            <input 
              type="date" 
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Change</label>
            <select 
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select reason...</option>
              <option value="New P45 received">New P45 received</option>
              <option value="HMRC notice received">HMRC notice received</option>
              <option value="New starter (no P45)">New starter (no P45)</option>
              <option value="Employee requested correction">Employee requested correction</option>
              <option value="Benefit/allowance change">Benefit/allowance change</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        
        {taxComparison && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <Calculator className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-yellow-900">Tax Impact Comparison</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded">
                <p className="text-sm text-yellow-700">Current Monthly Tax</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  {formatCurrencyUK(taxComparison.currentTax)}
                </p>
                <small className="text-yellow-600">({taxComparison.currentCodeName})</small>
              </div>
              <div className="text-center p-4 bg-white rounded flex items-center justify-center">
                <p className="text-xl font-bold text-yellow-800">→</p>
              </div>
              <div className="text-center p-4 bg-white rounded">
                <p className="text-sm text-yellow-700">New Monthly Tax</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  {formatCurrencyUK(taxComparison.newTax)}
                </p>
                <small className="text-yellow-600">({taxComparison.newCodeName})</small>
              </div>
            </div>
            <div className="text-center mt-4 pt-4 border-t border-yellow-200">
              <p className={`text-lg font-bold ${
                taxComparison.monthlySaving >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                💰 Employee will {taxComparison.monthlySaving >= 0 ? 'save' : 'pay'} {formatCurrencyUK(Math.abs(taxComparison.monthlySaving))} per month
              </p>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
          <textarea 
            placeholder="Add any notes about this tax code change..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex space-x-4">
          <button 
            onClick={handleUpdateTaxCode}
            disabled={!selectedEmployee || !newTaxCode || !effectiveDate || !changeReason}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              selectedEmployee && newTaxCode && effectiveDate && changeReason
                ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Update Tax Code
          </button>
          <button 
            onClick={() => {
              setSelectedEmployee('');
              setNewTaxCode('');
              setChangeReason('');
              setNotes('');
              setTaxComparison(null);
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Tax Codes Reference */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">UK Tax Codes Reference</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-green-600 mb-4">📗 Standard Codes</h4>
            <div className="space-y-2">
              <p className="text-sm"><strong>1257L</strong> - £12,570 personal allowance (most common)</p>
              <p className="text-sm"><strong>1100L</strong> - £11,000 personal allowance (reduced)</p>
              <p className="text-sm"><strong>S1257L</strong> - Scottish resident with standard allowance</p>
            </div>
          </div>
          
          <div className="border border-red-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-red-600 mb-4">⚠️ Emergency Codes</h4>
            <div className="space-y-2">
              <p className="text-sm"><strong>BR</strong> - 20% tax on all earnings (no allowance)</p>
              <p className="text-sm"><strong>D0</strong> - 40% tax on all earnings</p>
              <p className="text-sm"><strong>D1</strong> - 45% tax on all earnings</p>
              <p className="text-sm"><strong>0T</strong> - No personal allowance</p>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-purple-600 mb-4">📋 Special Codes</h4>
            <div className="space-y-2">
              <p className="text-sm"><strong>K497</strong> - Owes tax from benefits/previous years</p>
              <p className="text-sm"><strong>NT</strong> - No tax to be deducted</p>
              <p className="text-sm"><strong>T</strong> - HMRC needs to review allowances</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-center space-x-4">
        <Link 
          href="/dashboard/payroll/pay-elements" 
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          ← Pay Elements
        </Link>
        <Link 
          href="/dashboard/payroll" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Back to Payroll →
        </Link>
      </div>
    </div>
  );
}