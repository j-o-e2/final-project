"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  confirmLabel?: string;
}

export default function ConfirmModal({ open, title = "Confirm", message = "Are you sure?", onConfirm, onClose, confirmLabel = "Confirm" }: Props) {
  const [loading, setLoading] = React.useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-card p-6 rounded shadow-lg">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={async () => {
              try {
                setLoading(true);
                await onConfirm();
              } finally {
                setLoading(false);
                onClose();
              }
            }}
            disabled={loading}
          >
            {loading ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
