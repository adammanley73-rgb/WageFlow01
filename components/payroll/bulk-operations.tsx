'use client';
import type { CSSProperties } from 'react';
import { useState } from 'react';

// Workflow types
type WorkflowStatus =
  | 'draft'
  | 'processing'
  | 'review'
  | 'approved'
  | 'submitted'
  | 'completed'
  | 'cancelled';

interface PayrollRun {
  id: string;
  runNumber: string;
  name: string;
  workflow_status?: WorkflowStatus;
  status: string;
  employeeCount: number;
  grossPay: number;
  netPay: number;
}

interface BulkOperationsProps {
  payrollRuns: PayrollRun[];
  onBulkAction: (
    action: string,
    selectedRuns: string[],
    newStatus?: WorkflowStatus
  ) => Promise<void>;
  onRefresh: () => void;
}

export function BulkOperations({
  payrollRuns,
  onBulkAction,
  onRefresh
}: BulkOperationsProps) {
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedRuns.length === payrollRuns.length) {
      setSelectedRuns([]);
    } else {
      setSelectedRuns(payrollRuns.map((run) => run.id));
    }
  };

  // Handle individual selection
  const handleSelectRun = (runId: string) => {
    if (selectedRuns.includes(runId)) {
      setSelectedRuns(selectedRuns.filter((id) => id !== runId));
    } else {
      setSelectedRuns([...selectedRuns, runId]);
    }
  };

  // Execute bulk action
  const executeBulkAction = async () => {
    if (selectedRuns.length === 0) {
      alert('Please select at least one payroll run');
      return;
    }

    if (!bulkAction) {
      alert('Please select an action');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to ${bulkAction.replace(/_/g, ' ')} ${selectedRuns.length} payroll run(s)?`
    );
    if (!confirmed) return;

    setProcessing(true);

    try {
      let newStatus: WorkflowStatus | undefined;

      switch (bulkAction) {
        case 'start_processing':
          newStatus = 'processing';
          break;
        case 'move_to_review':
          newStatus = 'review';
          break;
        case 'approve_all':
          newStatus = 'approved';
          break;
        case 'submit_all':
          newStatus = 'submitted';
          break;
        case 'complete_all':
          newStatus = 'completed';
          break;
        case 'cancel_all':
          newStatus = 'cancelled';
          break;
        default:
          newStatus = undefined;
      }

      await onBulkAction(bulkAction, selectedRuns, newStatus);

      setSelectedRuns([]);
      setBulkAction('');
      onRefresh();

      alert(
        `✅ Successfully ${bulkAction.replace(/_/g, ' ')} ${selectedRuns.length} payroll run(s)`
      );
    } finally {
      setProcessing(false);
    }
  };

  const styles: Record<
    | 'container'
    | 'title'
    | 'controls'
    | 'select'
    | 'button'
    | 'buttonSecondary'
    | 'selectedCount'
    | 'checkboxContainer'
    | 'labelText'
    | 'list'
    | 'runRow'
    | 'runInfo'
    | 'runMeta',
    CSSProperties
  > = {
    container: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
      marginBottom: '20px',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    },
    title: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '16px'
    },
    controls: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '16px',
      flexWrap: 'wrap'
    },
    select: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid #d1d5db',
      fontSize: '14px',
      minWidth: '200px'
    },
    button: {
      padding: '8px 16px',
      backgroundColor: '#10b981',
      color: '#000000',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer'
    },
    buttonSecondary: {
      padding: '6px 12px',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      color: '#3b82f6',
      border: '1px solid #3b82f6' // keep color consistent
    },
    selectedCount: {
      fontSize: '14px',
      color: '#2563eb',
      fontWeight: 500,
      padding: '2px 8px',
      backgroundColor: '#e0e7ff',
      borderRadius: '4px'
    },
    checkboxContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    labelText: {
      fontSize: '14px',
      color: '#374151'
    },
    list: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    runRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      borderRadius: '6px',
      cursor: 'pointer'
    },
    runInfo: {
      display: 'flex',
      flexDirection: 'column'
    },
    runMeta: {
      fontSize: '12px',
      color: '#6b7280'
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🔧 Bulk Operations</h3>

      <div style={styles.controls}>
        <div style={styles.checkboxContainer}>
          <input
            type="checkbox"
            id="selectAll"
            checked={
              selectedRuns.length === payrollRuns.length && payrollRuns.length > 0
            }
            onChange={handleSelectAll}
          />
          <label htmlFor="selectAll" style={styles.labelText}>
            Select All ({payrollRuns.length})
          </label>
        </div>

        <div style={styles.selectedCount}>{selectedRuns.length} selected</div>

        <select
          value={bulkAction}
          onChange={(e) => setBulkAction(e.currentTarget.value)}
          style={styles.select}
        >
          <option value="">Choose Action...</option>
          <option value="start_processing">🔄 Start Processing</option>
          <option value="move_to_review">📋 Move to Review</option>
          <option value="approve_all">✅ Approve All</option>
          <option value="submit_all">📤 Submit to HMRC</option>
          <option value="complete_all">🎯 Mark Complete</option>
          <option value="cancel_all">❌ Cancel All</option>
        </select>

        <button
          style={styles.button}
          onClick={executeBulkAction}
          disabled={processing || selectedRuns.length === 0 || !bulkAction}
        >
          {processing ? '⏳ Processing...' : '🚀 Execute'}
        </button>

        {selectedRuns.length > 0 && (
          <button
            style={styles.buttonSecondary}
            onClick={() => setSelectedRuns([])}
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Individual Run Selection */}
      <div style={styles.list}>
        {payrollRuns.map((run) => {
          const isSelected = selectedRuns.includes(run.id);
          return (
            <label
              key={run.id}
              style={{
                ...styles.runRow,
                backgroundColor: isSelected ? '#f0f9ff' : '#f9fafb',
                border: isSelected
                  ? '1px solid #3b82f6'
                  : '1px solid #e5e7eb'
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSelectRun(run.id)}
              />
              <div style={styles.runInfo}>
                <strong>
                  {run.runNumber}
                </strong>{' '}
                - {run.name}
                <div style={styles.runMeta}>
                  Status: {run.workflow_status || run.status} • {run.employeeCount}{' '}
                  employees • £{run.netPay.toFixed(2)}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
