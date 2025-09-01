'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, PoundSterling, Settings, CheckCircle } from 'lucide-react';

interface PayElement {
  id: string;
  name: string;
  type: 'earnings' | 'deduction' | 'benefit';
  calculation: 'fixed' | 'percentage' | 'hourly_rate_multiple';
  value: number;
  subjectToPAYE: boolean;
  subjectToNI: boolean;
  subjectToPension: boolean;
  description?: string;
}

interface Employee {
  id: string;
  name: string;
  annualSalary: number;
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

export default function PayElementsPage() {
  const router = useRouter();
  const [payElements, setPayElements] = useState<PayElement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedElement, setSelectedElement] = useState('');
  const [elementAmount, setElementAmount] = useState('');
  
  // Form state for creating new elements
  const [newElement, setNewElement] = useState({
    name: '',
    type: 'earnings' as 'earnings' | 'deduction' | 'benefit',
    calculation: 'fixed' as 'fixed' | 'percentage' | 'hourly_rate_multiple',
    value: 0,
    subjectToPAYE: true,
    subjectToNI: true,
    subjectToPension: false,
    description: ''
  });

  useEffect(() => {
    // Demo data with UK examples
    setPayElements([
      {
        id: 'pe-001',
        name: 'Car Allowance',
        type: 'earnings',
        calculation: 'fixed',
        value: 400,
        subjectToPAYE: true,
        subjectToNI: true,
        subjectToPension: false,
        description: 'Monthly car allowance - taxable benefit'
      },
      {
        id: 'pe-002',
        name: 'Private Medical Insurance',
        type: 'benefit',
        calculation: 'fixed',
        value: 85,
        subjectToPAYE: true,
        subjectToNI: true,
        subjectToPension: false,
        description: 'Private healthcare insurance - P11D benefit'
      },
      {
        id: 'pe-003',
        name: 'Commission',
        type: 'earnings',
        calculation: 'fixed',
        value: 0,
        subjectToPAYE: true,
        subjectToNI: true,
        subjectToPension: true,
        description: 'Sales commission payments - variable amount'
      },
      {
        id: 'pe-004',
        name: 'Student Loan Plan 2',
        type: 'deduction',
        calculation: 'percentage',
        value: 9,
        subjectToPAYE: false,
        subjectToNI: false,
        subjectToPension: false,
        description: 'Student loan repayments - post-tax deduction'
      }
    ]);
    
    setEmployees([
      { id: 'emp-001', name: 'Sarah Johnson', annualSalary: 35000 },
      { id: 'emp-002', name: 'James Wilson', annualSalary: 28000 },
      { id: 'emp-003', name: 'Emma Brown', annualSalary: 22000 }
    ]);
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'earnings': return 'bg-blue-100 text-blue-800';
      case 'benefit': return 'bg-yellow-100 text-yellow-800';
      case 'deduction': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earnings': return '💰';
      case 'benefit': return '🏥';
      case 'deduction': return '➖';
      default: return '📋';
    }
  };

  const handleCreateElement = () => {
    if (!newElement.name || !newElement.type) {
      alert('Please fill in required fields');
      return;
    }
    
    const element: PayElement = {
      ...newElement,
      id: `pe-${Date.now()}`
    };
    setPayElements([...payElements, element]);
    
    // Reset form
    setNewElement({
      name: '',
      type: 'earnings',
      calculation: 'fixed',
      value: 0,
      subjectToPAYE: true,
      subjectToNI: true,
      subjectToPension: false,
      description: ''
    });
    setShowCreateForm(false);
    
    const currentDate = formatDateUK(new Date().toISOString());
    alert(`✅ Pay element created successfully!\n\nElement: ${element.name}\nType: ${element.type}\nDefault value: ${formatCurrencyUK(element.value)}\nCreated: ${currentDate}`);
  };

  const handleApplyToEmployee = () => {
    if (!selectedEmployee || !selectedElement || !elementAmount) {
      alert('Please fill in all fields');
      return;
    }
    
    const employee = employees.find(e => e.id === selectedEmployee);
    const element = payElements.find(e => e.id === selectedElement);
    
    if (employee && element) {
      const currentDate = formatDateUK(new Date().toISOString());
      alert(`✅ Pay Element Applied Successfully!\n\n${element.name}: ${formatCurrencyUK(parseFloat(elementAmount))}\nApplied to: ${employee.name}\nDate: ${currentDate}\n\nUK Tax Treatment:\n• PAYE: ${element.subjectToPAYE ? 'Yes' : 'No'}\n• National Insurance: ${element.subjectToNI ? 'Yes' : 'No'}\n• Pension: ${element.subjectToPension ? 'Yes' : 'No'}\n\nThis will appear in their next payroll run and RTI submission.`);
      setSelectedEmployee('');
      setSelectedElement('');
      setElementAmount('');
    }
  };

  const calculateTaxImpact = () => {
    if (!elementAmount) return null;
    
    const amount = parseFloat(elementAmount);
    const selectedEl = payElements.find(e => e.id === selectedElement);
    
    if (!selectedEl) return null;
    
    // UK tax rates for 2025/26 tax year
    const paye = selectedEl.subjectToPAYE ? amount * 0.20 : 0; // Basic rate 20%
    const ni = selectedEl.subjectToNI ? amount * 0.12 : 0; // Employee NI 12%
    const netImpact = amount - paye - ni;
    
    return { paye, ni, netImpact };
  };

  const taxImpact = calculateTaxImpact();

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
        <h1 className="text-3xl font-bold text-gray-900">Custom Pay Elements</h1>
        <p className="text-gray-600 mt-2">
          Create and manage custom earnings, deductions, and benefits with flexible UK tax treatment
        </p>
      </div>

      {/* Current Pay Elements */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Active Pay Elements</h2>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Element
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Element Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">PAYE</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">NI</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Pension</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Default Amount</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payElements.map(element => (
                <tr key={element.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">{getTypeIcon(element.type)}</span>
                      <div>
                        <div className="font-medium text-gray-900">{element.name}</div>
                        {element.description && (
                          <div className="text-sm text-gray-500">{element.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(element.type)}`}>
                      {element.type}
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    {element.subjectToPAYE ? '✅' : '❌'}
                  </td>
                  <td className="text-center py-4 px-4">
                    {element.subjectToNI ? '✅' : '❌'}
                  </td>
                  <td className="text-center py-4 px-4">
                    {element.subjectToPension ? '✅' : '❌'}
                  </td>
                  <td className="text-right py-4 px-4 font-medium">
                    {element.calculation === 'fixed' ? formatCurrencyUK(element.value) : 
                     element.calculation === 'percentage' ? `${element.value}%` : 'Variable'}
                  </td>
                  <td className="text-center py-4 px-4">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Element Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Add Custom Pay Element</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Element Name *</label>
              <input 
                type="text" 
                placeholder="e.g., Bonus Payment, Travel Allowance, London Weighting"
                value={newElement.name}
                onChange={(e) => setNewElement({...newElement, name: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Element Type *</label>
              <select 
                value={newElement.type}
                onChange={(e) => setNewElement({...newElement, type: e.target.value as any})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="earnings">💰 Earnings (Adds to gross pay)</option>
                <option value="deduction">➖ Deduction (Reduces net pay)</option>
                <option value="benefit">🎁 Benefit (Taxable benefit - P11D)</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Calculation Method</label>
              <select 
                value={newElement.calculation}
                onChange={(e) => setNewElement({...newElement, calculation: e.target.value as any})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage of Salary</option>
                <option value="hourly_rate_multiple">Hourly Rate Multiple</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Amount (£)</label>
              <input 
                type="number" 
                placeholder="0.00" 
                step="0.01"
                value={newElement.value}
                onChange={(e) => setNewElement({...newElement, value: parseFloat(e.target.value) || 0})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">UK Tax Treatment Options</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={newElement.subjectToPAYE}
                  onChange={(e) => setNewElement({...newElement, subjectToPAYE: e.target.checked})}
                  className="w-4 h-4 text-blue-600 mr-3"
                />
                <span className="text-sm">📊 Subject to PAYE</span>
              </label>
              <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={newElement.subjectToNI}
                  onChange={(e) => setNewElement({...newElement, subjectToNI: e.target.checked})}
                  className="w-4 h-4 text-blue-600 mr-3"
                />
                <span className="text-sm">🏛️ Subject to National Insurance</span>
              </label>
              <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={newElement.subjectToPension}
                  onChange={(e) => setNewElement({...newElement, subjectToPension: e.target.checked})}
                  className="w-4 h-4 text-blue-600 mr-3"
                />
                <span className="text-sm">🏦 Subject to Pension</span>
              </label>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <textarea 
              placeholder="Describe when and how this pay element should be used..."
              value={newElement.description}
              onChange={(e) => setNewElement({...newElement, description: e.target.value})}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-4">
            <button 
              onClick={handleCreateElement}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Create Pay Element
            </button>
            <button 
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Apply Pay Element */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Add Pay Element to Employee</h2>
        
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
                  {emp.name} ({formatCurrencyUK(emp.annualSalary)}/year)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pay Element</label>
            <select 
              value={selectedElement}
              onChange={(e) => setSelectedElement(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose element...</option>
              {payElements.map(el => (
                <option key={el.id} value={el.id}>
                  {el.name} ({el.calculation === 'fixed' ? formatCurrencyUK(el.value) : `${el.value}%`})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount for This Employee (£)</label>
            <input 
              type="number" 
              placeholder="400.00" 
              step="0.01"
              value={elementAmount}
              onChange={(e) => setElementAmount(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Monthly (ongoing)</option>
              <option>One-off payment</option>
              <option>Annual</option>
            </select>
          </div>
        </div>
        
        {taxImpact && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <PoundSterling className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-blue-900">UK Tax Impact Preview</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-blue-700">PAYE Tax (20%)</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrencyUK(taxImpact.paye)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-blue-700">National Insurance (12%)</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrencyUK(taxImpact.ni)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-blue-700">Net Pay Impact</p>
                <p className="text-xl font-bold text-green-700">{formatCurrencyUK(taxImpact.netImpact)}</p>
              </div>
            </div>
          </div>
        )}
        
        <button 
          onClick={handleApplyToEmployee}
          disabled={!selectedEmployee || !selectedElement || !elementAmount}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            selectedEmployee && selectedElement && elementAmount 
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Add to Employee's Payroll
        </button>
      </div>

      {/* Navigation */}
      <div className="flex justify-center space-x-4">
        <Link 
          href="/dashboard/payroll/overtime-rates" 
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          ← Overtime Rates
        </Link>
        <Link 
          href="/dashboard/employees/tax-codes" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Tax Codes →
        </Link>
      </div>
    </div>
  );
}