// WageFlow Workflow Service
import { supabase } from '../supabase';
import type { WorkflowStatus, WorkflowHistoryEntry } from '../types/workflow';
import { WORKFLOW_TRANSITIONS } from '../types/workflow';

// Minimal shape for a payroll run record we read/write
type PayrollRunRow = {
  payroll_run_id: string;
  workflow_status: WorkflowStatus;
  workflow_history: WorkflowHistoryEntry[] | null;
  created_at?: string;
  updated_at?: string;
  // optional audit timestamps we might update
  processing_started_at?: string | null;
  processing_completed_at?: string | null;
  approved_by_user_id?: string | null;
  approved_at?: string | null;
  submitted_to_hmrc_at?: string | null;
};

// Safe UUID for both browser and server without Node 'crypto' import
function safeUUID(): string {
  try {
    // globalThis works both server and browser
    const g: any = globalThis as any;
    if (g?.crypto?.randomUUID) {
      return g.crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  // Fallback
  const rnd = Math.random().toString(16).slice(2);
  return `${Date.now()}-${rnd}`;
}

export class WorkflowService {
  // Change payroll run status with validation and history tracking
  static async changeStatus(
    payrollRunId: string,
    newStatus: WorkflowStatus,
    userId: string,
    comment?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current payroll run
      const { data: payrollRun, error: fetchError } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('payroll_run_id', payrollRunId)
        .single();

      if (fetchError || !payrollRun) {
        return { success: false, error: 'Payroll run not found' };
      }

      const currentStatus = payrollRun.workflow_status;

      // Validate transition
      const allowedTransitions = WORKFLOW_TRANSITIONS[currentStatus as WorkflowStatus] || [];
      if (!allowedTransitions.includes(newStatus)) {
        return {
          success: false,
          error: `Cannot change from ${currentStatus} to ${newStatus}`
        };
      }

      // Create history entry
      const historyEntry: WorkflowHistoryEntry = {
        id: safeUUID(),
        from_status: currentStatus,
        to_status: newStatus,
        changed_by: userId,
        changed_at: new Date().toISOString(),
        comment,
        automated: false
      };

      // Merge history
      const currentHistory: WorkflowHistoryEntry[] = Array.isArray(payrollRun.workflow_history)
        ? payrollRun.workflow_history
        : [];
      const updatedHistory = [...currentHistory, historyEntry];

      // Build update payload
      const now = new Date().toISOString();
      const updateData: Partial<PayrollRunRow> & { updated_at: string } = {
        workflow_status: newStatus,
        workflow_history: updatedHistory,
        updated_at: now
      };

      // Status-specific timestamps
      switch (newStatus) {
        case 'processing':
          updateData.processing_started_at = now;
          break;
        case 'review':
          updateData.processing_completed_at = now;
          break;
        case 'approved':
          updateData.approved_by_user_id = userId;
          updateData.approved_at = now;
          break;
        case 'submitted':
          updateData.submitted_to_hmrc_at = now;
          break;
        default:
          break;
      }

      const { error: updateError } = await supabase
        .from('payroll_runs')
        .update(updateData)
        .eq('payroll_run_id', payrollRunId);

      if (updateError) {
        return { success: false, error: updateError.message ?? 'Failed to update status' };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  }

  // Get workflow history for a payroll run
  static async getWorkflowHistory(payrollRunId: string): Promise<WorkflowHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('workflow_history')
        .eq('payroll_run_id', payrollRunId)
        .single();

      if (error || !data) {
        return [];
      }

      return Array.isArray(data.workflow_history) ? data.workflow_history : [];
    } catch (err) {
      console.error('Error fetching workflow history:', err);
      return [];
    }
  }

  // Get all payroll runs with their current workflow status
  static async getPayrollRunsWithStatus(): Promise<PayrollRunRow[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select(`
          payroll_run_id,
          workflow_status,
          workflow_history,
          approved_by_user_id,
          approved_at,
          submitted_to_hmrc_at,
          processing_started_at,
          processing_completed_at,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data ?? [];
    } catch (err) {
      console.error('Error fetching payroll runs with status:', err);
      throw err;
    }
  }

  // Bulk status change (for processing multiple runs)
  static async bulkChangeStatus(
    payrollRunIds: string[],
    newStatus: WorkflowStatus,
    userId: string,
    comment?: string
  ): Promise<{ success: boolean; results: Array<{ id: string; success: boolean; error?: string }> }> {
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    let overallSuccess = true;

    for (const id of payrollRunIds) {
      // sequential to avoid rate limits; parallelize if needed
      const result = await this.changeStatus(id, newStatus, userId, comment);
      results.push({ id, ...result });
      if (!result.success) overallSuccess = false;
    }

    return { success: overallSuccess, results };
  }

  // Check if status transition is valid
  static isValidTransition(fromStatus: WorkflowStatus, toStatus: WorkflowStatus): boolean {
    const allowedTransitions = WORKFLOW_TRANSITIONS[fromStatus] || [];
    return allowedTransitions.includes(toStatus);
  }
}