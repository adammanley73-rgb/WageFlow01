"use client";

import Link from "next/link";
import { useTransition } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { deletePayRun } from "@/app/dashboard/payroll/actions";

export type PayrollRunStatus = "draft" | "processing" | "approved" | "rti_submitted" | "completed";

type Props = {
  runId: string;
  status: PayrollRunStatus;
  editHref: string;
};

const LOCKED: PayrollRunStatus[] = ["approved", "rti_submitted", "completed"];

export default function ActionsCell({ runId, status, editHref }: Props) {
  const [isPending, startTransition] = useTransition();
  const locked = LOCKED.includes(status);

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={locked ? "#" : editHref}
        aria-disabled={locked}
        onClick={(e) => {
          if (locked) e.preventDefault();
        }}
        className={[
          "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold",
          locked ? "bg-green-600/30 text-white/70 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700",
        ].join(" ")}
      >
        Edit
      </Link>

      <ConfirmModal
        disabled={locked}
        title="Delete this pay run?"
        message="You cannot delete approved, RTI submitted, or completed runs."
        confirmText={isPending ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        trigger={(open) => (
          <button
            type="button"
            onClick={open}
            aria-disabled={locked}
            className={[
              "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold",
              locked ? "bg-blue-600/30 text-white/70 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700",
            ].join(" ")}
          >
            Delete
          </button>
        )}
        onConfirm={async () => {
          startTransition(async () => {
            await deletePayRun(runId);
          });
        }}
      />
    </div>
  );
}
