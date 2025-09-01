'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Calculator } from 'lucide-react';

interface OvertimeRate {
  id: string;
  name: string;
  multiplier: number;
  description: string;
}

interface Employee {
  id: string;
  name: string;
  annualSalary: number;
  hourlyRate: number;
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

export default function OvertimeRatesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedRate, setSelectedRate] = useState('');
  const [hours, setHours] = useState('');
  const [calculation, setCalculation] = useState<any>(null);

  const overtimeRates: OvertimeRate[] = [
    { id: 'ot-125', name: 'Time and Quarter', multiplier: 1.25, description: '25% premium - evenings/weekends' },
    { id: 'ot-150', name: 'Time and Half', multiplier: 1.5, description: '50% premium - after normal hours' },
    { id: 'ot-175', name: 'Time and Three Quarters', multiplier: 1.75, description: '75% premium - Sunday/bank holidays' },
    { id: 'ot-200', name: 'Double Time', multiplier: 2.0, description: '100% premium - emergency callouts' }
  ];

  useEffect(() => {
    // Demo employees data
    setEmployees([
      { id: 'emp-001', name: 'Sarah Johnson', annualSalary: 35000, hourlyRate: 16.83 },
      { id: 'emp-002', name: 'James Wilson', annualSalary: 28000, hourlyRate: 13.46 },
      { id: 'emp-003', name: 'Emma Brown', annualSalary: 22000, hourlyRate: 10.58 }
    ]);
  }, []);

  const calculateOvertime = () => {
    if (!selectedEmployee || !selectedRate || !hours) return;
    
    const employee = employees.find(e => e.id === selectedEmployee);
    const rate = overtimeRates.find(r => r.id === selectedRate);
    
    if (!employee || !rate) return;
    
    const overtimeAmount = employee.hourlyRate * rate.multiplier * parseFloat(hours);
    
    setCalculation({
      employee: employee.name,
      hours: parseFloat(hours),
      baseRate: employee.hourlyRate,
      multiplier: rate.multiplier,
      overtimeRate: employee.hourlyRate * rate.multiplier,
      totalAmount: overtimeAmount,
      rateName: rate.name
    });
  };

  useEffect(() => {
    calculateOvertime();
  }, [selectedEmployee, selectedRate, hours]);

  const handleAddToPayroll = () => {
    if (calculation) {
      const currentDate = formatDateUK(new Date().toISOString());
      alert(`✅ Overtime Added Successfully!

${calculation.employee}
${calculation.hours} hours at ${calculation.rateName}
Total: ${formatCurrencyUK(calculation.totalAmount)}
Date: ${currentDate}

This will be included in their next payroll run with:
• PAYE tax deduction
• National Insurance
• Pension contributions (if enrolled)`);
      
      // Reset form
      setSelectedEmployee('');
      setSelectedRate('');
      setHours('');
      setCalculation(null);
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Overtime Rates Management</h1>
        <p className="text-gray-600 mt-2">
          Configure overtime multipliers and calculate overtime payments with automatic UK tax treatment
        </p>
      </div>

      {/* Overtime Rates Display */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Current Overtime Rates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {overtimeRates.map(rate => (
            <div key={rate.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-center mb-3">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-gray-900">{rate.name}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">{rate.description}</p>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">{rate.multiplier}x</span>
                <span className="text-gray-500 ml-2">base rate</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overtime Calculator */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Calculate Overtime Payment</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
            <select 
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({formatCurrencyUK(emp.annualSalary)}/year)
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Overtime Rate</label>
            <select 
              value={selectedRate}
              onChange={(e) => setSelectedRate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select rate...</option>
              {overtimeRates.map(rate => (
                <option key={rate.id} value={rate.id}>
                  {rate.name} ({rate.multiplier}x)
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hours Worked</label>
            <input 
              type="number" 
              placeholder="8"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Base Hourly Rate</label>
            <input 
              type="text" 
              value={selectedEmployee ? formatCurrencyUK(employees.find(e => e.id === selectedEmployee)?.hourlyRate || 0) : 'Select employee first'}
              readOnly
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>
        </div>
        
        {calculation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <Calculator className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-blue-900">Overtime Calculation Preview</h3>
            </div>
            <div className="space-y-2">
              <p className="text-blue-800">
                <strong>{calculation.hours} hours</strong> × {formatCurrencyUK(calculation.baseRate)} × {calculation.multiplier} = 
                <strong className="text-xl ml-2">{formatCurrencyUK(calculation.totalAmount)}</strong> overtime pay
              </p>
              <p className="text-blue-700">
                Overtime rate: {formatCurrencyUK(calculation.overtimeRate)}/hour
              </p>
              <div className="bg-white rounded p-3 mt-4">
                <p className="text-sm text-gray-600 font-medium">UK Tax Treatment:</p>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>✅ Subject to PAYE tax deduction</li>
                  <li>✅ Subject to National Insurance contributions</li>
                  <li>✅ Subject to Pension contributions (if enrolled)</li>
                  <li>✅ Included in RTI submissions to HMRC</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        <button 
          onClick={handleAddToPayroll}
          disabled={!calculation}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            calculation 
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Add Overtime to Next Payroll
        </button>
      </div>

      {/* Navigation */}
      <div className="flex justify-center space-x-4">
        <Link 
          href="/dashboard/payroll" 
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          ← Back to Payroll
        </Link>
        <Link 
          href="/dashboard/payroll/pay-elements" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Manage Pay Elements →
        </Link>
      </div>
    </div>
  );
}