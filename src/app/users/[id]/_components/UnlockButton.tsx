"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";

export function UnlockButton({
  userId,
  unlockAction,
}: {
  userId: string;
  unlockAction: (userId: string) => Promise<{ error?: string; success?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await unlockAction(userId);
          router.refresh();
        });
      }}
    >
      Unlock account
    </Button>
  );
}
