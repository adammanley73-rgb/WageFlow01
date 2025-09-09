// WageFlow Status Badge Component
import React from 'react';
import { WorkflowStatus, WORKFLOW_STATUS_CONFIG } from '../../lib/types/workflow';

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
  showDescription?: boolean;
  className?: string;
}

export function WorkflowStatusBadge({ 
  status, 
  showDescription = false, 
  className = '' 
}: WorkflowStatusBadgeProps) {
  
  const config = WORKFLOW_STATUS_CONFIG[status];
  
  if (!config) {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 ${className}`}>
        Unknown
      </span>
    );
  }
  
  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span 
        className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.color}`}
        title={config.description}
      >
        {config.label}
      </span>
      {showDescription && (
        <span className="text-xs text-gray-500 mt-1">
          {config.description}
        </span>
      )}
    </div>
  );
}