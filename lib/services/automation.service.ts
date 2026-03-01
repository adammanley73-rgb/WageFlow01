// C:\Projects\wageflow01\lib\services\automation.service.ts

// WageFlow Automation Service
import type { WorkflowStatus } from "../types/workflow";

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    fromStatus: WorkflowStatus;
    condition?: string;
    timeDelay?: number; // minutes
  };
  action: {
    toStatus: WorkflowStatus;
    requiresApproval?: boolean;
    notifyUsers?: string[];
  };
  enabled: boolean;
}

export class AutomationService {
  private static readonly DEFAULT_RULES: AutomationRule[] = [
    {
      id: "auto-approve-after-processing",
      name: "Auto-approve after processing",
      description: "Automatically move payroll runs to approved after processing completes",
      trigger: {
        fromStatus: "processing",
        condition: "calculations_complete",
      },
      action: {
        toStatus: "approved",
        notifyUsers: ["admin"],
      },
      enabled: true,
    },
    {
      id: "auto-complete-after-rti",
      name: "Auto-complete after RTI confirmation",
      description: "Mark runs as complete when HMRC confirms receipt",
      trigger: {
        fromStatus: "rti_submitted",
        condition: "hmrc_confirmed",
        timeDelay: 30,
      },
      action: {
        toStatus: "completed",
        notifyUsers: ["payroll_team"],
      },
      enabled: true,
    },
    {
      id: "reminder-approved-not-submitted",
      name: "RTI submission reminder",
      description: "Send reminders for approved runs not yet RTI submitted",
      trigger: {
        fromStatus: "approved",
        timeDelay: 1440,
      },
      action: {
        toStatus: "approved",
        notifyUsers: ["managers"],
      },
      enabled: true,
    },
  ];

  static shouldTriggerAutomation(payrollRunId: string, currentStatus: WorkflowStatus, condition?: string): AutomationRule[] {
    return this.DEFAULT_RULES.filter((rule) => {
      if (!rule.enabled) return false;
      if (rule.trigger.fromStatus !== currentStatus) return false;
      if (rule.trigger.condition && rule.trigger.condition !== condition) return false;
      return true;
    });
  }

  static async executeAutomation(
    payrollRunId: string,
    rule: AutomationRule,
    userId: string = "system"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🤖 Executing automation: ${rule.name} for payroll run ${payrollRunId}`);

      // Simulate automation execution
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Future: call the real workflow transition endpoint/service here.
      // await WorkflowService.changeStatus(payrollRunId, rule.action.toStatus, userId, `Automated: ${rule.description}`);

      if (rule.action.notifyUsers?.length) {
        await this.sendNotifications(rule.action.notifyUsers, {
          type: "workflow_automation",
          payrollRunId,
          message: rule.description,
          newStatus: rule.action.toStatus,
        });
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`⛔ Automation failed for rule ${rule.name}:`, message);
      return { success: false, error: message };
    }
  }

  static getWorkflowSuggestions(
    payrollRuns: Array<{ id: string; workflow_status: WorkflowStatus; createdAt: string }>
  ): Array<{
    type: "suggestion";
    message: string;
    action?: () => void;
  }> {
    const suggestions: Array<{
      type: "suggestion";
      message: string;
      action?: () => void;
    }> = [];

    const oldDrafts = payrollRuns.filter((run) => {
      const created = new Date(run.createdAt).getTime();
      if (Number.isNaN(created)) return false;
      const days = (Date.now() - created) / (1000 * 60 * 60 * 24);
      return run.workflow_status === "draft" && days > 3;
    });

    if (oldDrafts.length > 0) {
      suggestions.push({
        type: "suggestion",
        message: `💡 ${oldDrafts.length} draft payroll runs are over 3 days old. Consider processing or cancelling them.`,
      });
    }

    const readyForApproval = payrollRuns.filter((run) => run.workflow_status === "processing").length;
    if (readyForApproval >= 3) {
      suggestions.push({
        type: "suggestion",
        message: `🚀 ${readyForApproval} payroll runs are ready for approval. Use bulk operations to approve them.`,
      });
    }

    const readyForRti = payrollRuns.filter((run) => run.workflow_status === "approved").length;
    if (readyForRti > 0) {
      suggestions.push({
        type: "suggestion",
        message: `📤 ${readyForRti} approved payroll runs are ready to be marked RTI submitted.`,
      });
    }

    return suggestions;
  }

  private static async sendNotifications(
    userIds: string[],
    notification: {
      type: string;
      payrollRunId: string;
      message: string;
      newStatus: WorkflowStatus;
    }
  ): Promise<void> {
    console.log(`📧 Sending notifications to ${userIds.join(", ")}:`, notification);

    for (const userId of userIds) {
      console.log(`📧 Notification sent to ${userId}: ${notification.message}`);
    }
  }

  static getAutomationStatus(): {
    enabled: boolean;
    activeRules: number;
    recentExecutions: number;
    suggestions: string[];
  } {
    const enabledRules = this.DEFAULT_RULES.filter((rule) => rule.enabled);

    return {
      enabled: enabledRules.length > 0,
      activeRules: enabledRules.length,
      recentExecutions: 0,
      suggestions: [
        "Add RTI queue page to trigger sending queued FPS/EPS corrections.",
        "Add daily digest notifications for bureaux and multi-company setups.",
        "Generate payslips automatically after completion.",
      ],
    };
  }
}