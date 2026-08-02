"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/shared/ui/Dialog";
import { Button } from "@/shared/ui/Button";

const AUTO_CLOSE_SECONDS = 10;

export function MobileAppCallRequiredDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(AUTO_CLOSE_SECONDS);
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    const timeout = window.setTimeout(() => {
      onClose();
    }, AUTO_CLOSE_SECONDS * 1000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [open, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Use the mobile app"
      size="sm"
      footer={
        <Button type="button" variant="primary" onClick={onClose}>
          Okay
        </Button>
      }
    >
      <p className="text-sm">
        You have to use the mobile app to place this call. Calling from the web CRM is not
        available.
      </p>
      <p className="text-muted mt-2 text-xs" role="status">
        This message closes in {secondsLeft}s.
      </p>
    </Dialog>
  );
}
