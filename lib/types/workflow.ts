// C:\Projects\wageflow01\lib\types\workflow.ts

export type WorkflowStatus =
  | "draft" // Initial creation - can edit freely
  | "processing" // Calculations in progress
  | "approved" // Approved for HMRC submission
  | "rti_submitted" // Submitted to HMRC RTI
  | "completed" // Fully processed and paid
  | "cancelled"; // Cancelled/voided

export interface WorkflowHistoryEntry {
  id: string;
  from_status: WorkflowStatus | null;
  to_status: WorkflowStatus;
  changed_by: string;
  changed_at: string;
  comment?: string;
  automated?: boolean;
}

export interface WorkflowTransition {
  from: WorkflowStatus;
  to: WorkflowStatus;
  label: string;
  action: string;
  requiresConfirmation?: boolean;
  buttonVariant: "default" | "destructive" | "outline" | "secondary";
  icon?: string;
}

export const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  draft: ["processing", "approved", "cancelled"],
  processing: ["approved", "draft", "cancelled"],
  approved: ["rti_submitted"],
  rti_submitted: ["completed"],
  completed: [],
  cancelled: ["draft"],
};

export const WORKFLOW_STATUS_CONFIG: Record<
  WorkflowStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    description: string;
    canEdit: boolean;
    canDelete: boolean;
  }
> = {
  draft: {
    label: "Draft",
    color: "#92400e",
    bgColor: "#fef3c7",
    description: "Payroll run is being prepared",
    canEdit: true,
    canDelete: true,
  },
  processing: {
    label: "Processing",
    color: "#1e40af",
    bgColor: "#dbeafe",
    description: "Calculations in progress",
    canEdit: false,
    canDelete: false,
  },
  approved: {
    label: "Approved",
    color: "#166534",
    bgColor: "#dcfce7",
    description: "Approved for HMRC submission",
    canEdit: false,
    canDelete: false,
  },
  rti_submitted: {
    label: "RTI Submitted",
    color: "#7c3aed",
    bgColor: "#f3e8ff",
    description: "Submitted to HMRC",
    canEdit: false,
    canDelete: false,
  },
  completed: {
    label: "Completed",
    color: "#166534",
    bgColor: "#dcfce7",
    description: "Fully processed and paid",
    canEdit: false,
    canDelete: false,
  },
  cancelled: {
    label: "Cancelled",
    color: "#dc2626",
    bgColor: "#fee2e2",
    description: "Cancelled payroll run",
    canEdit: false,
    canDelete: true,
  },
};

const CONFIRM_STATUSES: Readonly<WorkflowStatus[]> = ["cancelled", "rti_submitted", "completed"];

function requiresConfirmationFor(to: WorkflowStatus): boolean {
  return (CONFIRM_STATUSES as readonly WorkflowStatus[]).includes(to);
}

function buttonVariantFor(to: WorkflowStatus): WorkflowTransition["buttonVariant"] {
  return to === "cancelled" ? "destructive" : "default";
}

export function getAvailableTransitions(currentStatus: WorkflowStatus): WorkflowTransition[] {
  const availableStatuses = WORKFLOW_TRANSITIONS[currentStatus] || [];

  return availableStatuses.map((toStatus) => {
    const config = WORKFLOW_STATUS_CONFIG[toStatus];
    return {
      from: currentStatus,
      to: toStatus,
      label: config.label,
      action: `change_to_${toStatus}`,
      requiresConfirmation: requiresConfirmationFor(toStatus),
      buttonVariant: buttonVariantFor(toStatus),
      icon: getStatusIcon(toStatus),
    };
  });
}

function getStatusIcon(status: WorkflowStatus): string {
  const icons: Record<WorkflowStatus, string> = {
    draft: "📝",
    processing: "🔄",
    approved: "✅",
    rti_submitted: "📤",
    completed: "🎯",
    cancelled: "⛔",
  };
  return icons[status] ?? "📄";
}

export function isValidTransition(fromStatus: WorkflowStatus, toStatus: WorkflowStatus): boolean {
  const allowedTransitions = WORKFLOW_TRANSITIONS[fromStatus] || [];
  return allowedTransitions.includes(toStatus);
}

export function getStatusProgress(status: WorkflowStatus): number {
  const progressMap: Record<WorkflowStatus, number> = {
    draft: 10,
    processing: 40,
    approved: 70,
    rti_submitted: 90,
    completed: 100,
    cancelled: 0,
  };
  return progressMap[status] ?? 0;
}

export function canEditInStatus(status: WorkflowStatus): boolean {
  return !!WORKFLOW_STATUS_CONFIG[status]?.canEdit;
}

export function canDeleteInStatus(status: WorkflowStatus): boolean {
  return !!WORKFLOW_STATUS_CONFIG[status]?.canDelete;
}

export function getNextLogicalStatus(currentStatus: WorkflowStatus): WorkflowStatus | null {
  const transitions = WORKFLOW_TRANSITIONS[currentStatus];
  if (!transitions || transitions.length === 0) return null;

  const next = transitions.find((s) => s !== "cancelled");
  return next ?? transitions[0];
}