// WageFlow Automation Service
import type { WorkflowStatus } from '../types/workflow';

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
  // Default automation rules
  private static readonly DEFAULT_RULES: AutomationRule[] = [
    {
      id: 'auto-review-after-processing',
      name: 'Auto-move to Review',
      description: 'Automatically move payroll runs to review after processing completes',
      trigger: {
        fromStatus: 'processing',
        condition: 'calculations_complete'
      },
      action: {
        toStatus: 'review',
        notifyUsers: ['admin']
      },
      enabled: true
    },
    {
      id: 'auto-complete-after-submission',
      name: 'Auto-complete after HMRC confirmation',
      description: 'Mark runs as complete when HMRC confirms receipt',
      trigger: {
        fromStatus: 'submitted',
        condition: 'hmrc_confirmed',
        timeDelay: 30 // 30 minutes after submission
      },
      action: {
        toStatus: 'completed',
        notifyUsers: ['payroll_team']
      },
      enabled: true
    },
    {
      id: 'reminder-pending-approval',
      name: 'Approval Reminder',
      description: 'Send reminders for runs pending approval',
      trigger: {
        fromStatus: 'review',
        timeDelay: 1440 // 24 hours
      },
      action: {
        toStatus: 'review', // Stay in same status but send notification
        notifyUsers: ['managers']
      },
      enabled: true
    }
  ];

  // Check if automation should trigger
  static shouldTriggerAutomation(
    payrollRunId: string, // kept for future audit/log use
    currentStatus: WorkflowStatus,
    condition?: string
  ): AutomationRule[] {
    return this.DEFAULT_RULES.filter((rule) => {
      if (!rule.enabled) return false;
      if (rule.trigger.fromStatus !== currentStatus) return false;
      if (rule.trigger.condition && rule.trigger.condition !== condition) return false;
      return true;
    });
  }

  // Execute automation rule
  static async executeAutomation(
    payrollRunId: string,
    rule: AutomationRule,
    userId: string = 'system'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🤖 Executing automation: ${rule.name} for payroll run ${payrollRunId}`);

      // Simulate automation execution
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Here you would call your WorkflowService.changeStatus
      // await WorkflowService.changeStatus(payrollRunId, rule.action.toStatus, userId, `Automated: ${rule.description}`);

      // Send notifications if required
      if (rule.action.notifyUsers?.length) {
        await this.sendNotifications(rule.action.notifyUsers, {
          type: 'workflow_automation',
          payrollRunId,
          message: rule.description,
          newStatus: rule.action.toStatus
        });
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Automation failed for rule ${rule.name}:`, message);
      return { success: false, error: message };
    }
  }

  // Smart workflow suggestions
  static getWorkflowSuggestions(
    payrollRuns: Array<{ id: string; workflow_status: WorkflowStatus; createdAt: string }>
  ): Array<{
    type: 'suggestion';
    message: string;
    action?: () => void;
  }> {
    const suggestions: Array<{
      type: 'suggestion';
      message: string;
      action?: () => void;
    }> = [];

    // Find runs stuck in draft for too long
    const oldDrafts = payrollRuns.filter((run) => {
      const created = new Date(run.createdAt).getTime();
      if (Number.isNaN(created)) return false;
      const daysSinceDraft = (Date.now() - created) / (1000 * 60 * 60 * 24);
      return run.workflow_status === 'draft' && daysSinceDraft > 3;
    });

    if (oldDrafts.length > 0) {
      suggestions.push({
        type: 'suggestion',
        message: `💡 ${oldDrafts.length} draft payroll runs are over 3 days old. Consider processing or archiving them.`
      });
    }

    // Find runs ready for bulk review (those in processing)
    const readyForReview = payrollRuns.filter((run) => run.workflow_status === 'processing').length;
    if (readyForReview >= 3) {
      suggestions.push({
        type: 'suggestion',
        message: `🚀 ${readyForReview} payroll runs are ready for review. Use bulk operations to review them all at once.`
      });
    }

    // Find runs that should be submitted
    const readyForSubmission = payrollRuns.filter((run) => run.workflow_status === 'approved').length;
    if (readyForSubmission > 0) {
      suggestions.push({
        type: 'suggestion',
        message: `📤 ${readyForSubmission} approved payroll runs are ready for HMRC submission.`
      });
    }

    return suggestions;
  }

  // Send notifications
  private static async sendNotifications(
    userIds: string[],
    notification: {
      type: string;
      payrollRunId: string;
      message: string;
      newStatus: WorkflowStatus;
    }
  ): Promise<void> {
    // Simulate notification sending
    console.log(`📧 Sending notifications to ${userIds.join(', ')}:`, notification);

    // Integrate with your notification system here
    for (const userId of userIds) {
      console.log(`📧 Notification sent to ${userId}: ${notification.message}`);
    }
  }

  // Get automation status dashboard
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
      recentExecutions: 0, // Pull from audit log if available
      suggestions: [
        'Consider enabling HMRC auto-submission for trusted payroll runs',
        'Set up Slack notifications for status changes',
        'Configure automatic payslip generation after completion'
      ]
    };
  }
}
