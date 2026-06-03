"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type BulkAction = {
  label: string;
  action: string;
  variant?: "default" | "destructive" | "outline";
  requireConfirm?: boolean;
};

type Props = {
  selectedCount: number;
  actions: BulkAction[];
  onAction: (action: string) => Promise<void>;
  onClear: () => void;
  className?: string;
};

export function BulkActionBar({ selectedCount, actions, onAction, onClear, className }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

  const handleClick = (bulkAction: BulkAction) => {
    if (bulkAction.requireConfirm) {
      setConfirmAction(bulkAction);
    } else {
      void execute(bulkAction.action);
    }
  };

  const execute = async (action: string) => {
    setPending(action);
    try {
      await onAction(action);
    } finally {
      setPending(null);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-surface-200 bg-white px-5 py-3 shadow-2xl dark:border-surface-700 dark:bg-surface-900",
          className,
        )}
      >
        <span className="text-sm font-semibold text-surface-900 dark:text-white">
          {selectedCount} tanlandi
        </span>
        <div className="mx-2 h-5 w-px bg-surface-200 dark:bg-surface-700" />
        {actions.map((a) => (
          <Button
            key={a.action}
            variant={a.variant ?? "outline"}
            size="sm"
            disabled={!!pending}
            onClick={() => handleClick(a)}
          >
            {pending === a.action && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {a.label}
          </Button>
        ))}
        <button
          onClick={onClear}
          className="ml-1 rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tasdiqlash</DialogTitle>
            <DialogDescription>
              {confirmAction?.label} — {selectedCount} ta yozuv. Davom etasizmi?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmAction) {
                  void execute(confirmAction.action);
                  setConfirmAction(null);
                }
              }}
            >
              Ha, davom eting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
