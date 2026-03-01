// C:\Projects\wageflow01\lib\services\workflow.service.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowStatus, WorkflowHistoryEntry } from "../types/workflow";
import { WORKFLOW_TRANSITIONS } from "../types/workflow";

type PayrollRunRow = {
  id: string;
  company_id: string;

  // Canonical lifecycle field in your app today
  status: WorkflowStatus;

  // Legacy but kept in-sync for now
  workflow_status: WorkflowStatus;

  workflow_history: WorkflowHistoryEntry[] | null;

  created_at?: string | null;
  updated_at?: string | null;

  processing_started_at?: string | null;
  processing_completed_at?: string | null;

  approved_by_user_id?: string | null;
  approved_at?: string | null;

  submitted_to_hmrc_at?: string | null;
};

function safeUUID(): string {
  try {
    const g: any = globalThis as any;
    if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  } catch {
  }
  const rnd = Math.random().toString(16).slice(2);
  return `${Date.now()}-${rnd}`;
}

function isValidTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  const allowed = WORKFLOW_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export class WorkflowService {
  static async changeStatus(params: {
    client: SupabaseClient;
    runId: string;
    companyId: string;
    newStatus: WorkflowStatus;
    userId: string;
    comment?: string;
    automated?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    const { client, runId, companyId, newStatus, userId, comment, automated } = params;

    try {
      const { data: payrollRun, error: fetchError } = await client
        .from("payroll_runs")
        .select(
          [
            "id",
            "company_id",
            "status",
            "workflow_status",
            "workflow_history",
            "processing_started_at",
            "processing_completed_at",
            "approved_by_user_id",
            "approved_at",
            "submitted_to_hmrc_at",
            "created_at",
            "updated_at",
          ].join(",")
        )
        .eq("id", runId)
        .eq("company_id", companyId)
        .single();

      if (fetchError || !payrollRun) {
        return { success: false, error: fetchError?.message || "Payroll run not found" };
      }

      const currentStatus = String((payrollRun as any).status || "draft") as WorkflowStatus;

      if (currentStatus === newStatus) {
        return { success: true };
      }

      if (!isValidTransition(currentStatus, newStatus)) {
        return {
          success: false,
          error: `Cannot change from ${currentStatus} to ${newStatus}`,
        };
      }

      const now = new Date().toISOString();

      const historyEntry: WorkflowHistoryEntry = {
        id: safeUUID(),
        from_status: currentStatus,
        to_status: newStatus,
        changed_by: userId,
        changed_at: now,
        comment,
        automated: Boolean(automated),
      };

      const currentHistory: WorkflowHistoryEntry[] = Array.isArray((payrollRun as any).workflow_history)
        ? (payrollRun as any).workflow_history
        : [];

      const updatedHistory = [...currentHistory, historyEntry];

      const updateData: Partial<PayrollRunRow> & { updated_at: string } = {
        status: newStatus,
        workflow_status: newStatus,
        workflow_history: updatedHistory,
        updated_at: now,
      };

      // Status-specific timestamps
      if (newStatus === "processing") {
        updateData.processing_started_at = (payrollRun as any).processing_started_at || now;
      }

      // If we are leaving processing, stamp completion if it hasn't been set.
      if (currentStatus === "processing" && newStatus !== "processing") {
        updateData.processing_completed_at = (payrollRun as any).processing_completed_at || now;
      }

      if (newStatus === "approved") {
        updateData.approved_by_user_id = userId;
        updateData.approved_at = now;
      }

      if (newStatus === "rti_submitted") {
        updateData.submitted_to_hmrc_at = now;
      }

      const { error: updateError } = await client
        .from("payroll_runs")
        .update(updateData)
        .eq("id", runId)
        .eq("company_id", companyId);

      if (updateError) {
        return { success: false, error: updateError.message || "Failed to update status" };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: msg };
    }
  }

  static async getWorkflowHistory(params: {
    client: SupabaseClient;
    runId: string;
    companyId: string;
  }): Promise<WorkflowHistoryEntry[]> {
    const { client, runId, companyId } = params;

    try {
      const { data, error } = await client
        .from("payroll_runs")
        .select("workflow_history")
        .eq("id", runId)
        .eq("company_id", companyId)
        .single();

      if (error || !data) return [];
      return Array.isArray((data as any).workflow_history) ? (data as any).workflow_history : [];
    } catch {
      return [];
    }
  }
}