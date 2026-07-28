"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { FilePickButton } from "@/shared/ui/FilePickButton";
import {
  removeProfilePhotoAction,
  uploadProfilePhotoAction,
} from "@/modules/users/presentation/controllers/profilePhoto.action";

export function ProfilePhotoForm({
  userId,
  hasPhoto,
}: {
  userId: string;
  hasPhoto: boolean;
}) {
  const router = useRouter();
  const boundUpload = uploadProfilePhotoAction.bind(null, userId);
  const [state, formAction, pending] = useActionState(boundUpload, {});
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeSuccess, setRemoveSuccess] = useState<string | null>(null);
  const [removing, startTransition] = useTransition();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <div className="space-y-2 border-t border-border/60 pt-3">
      <span className="mx-label block">Update profile photo</span>
      <form action={formAction}>
        <FilePickButton
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={pending}
          buttonLabel="Choose photo"
          changeLabel="Change photo"
        >
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "Uploading…" : "Upload photo"}
          </Button>
        </FilePickButton>
      </form>
      {hasPhoto ? (
        <Button
          variant="ghost"
          size="sm"
          className="!px-0"
          disabled={removing}
          onClick={() => {
            setRemoveError(null);
            setRemoveSuccess(null);
            startTransition(async () => {
              const result = await removeProfilePhotoAction(userId);
              if (result.error) {
                setRemoveError(result.error);
                return;
              }
              setRemoveSuccess(result.success ?? "Profile photo removed.");
              router.refresh();
            });
          }}
        >
          {removing ? "Removing…" : "Remove photo"}
        </Button>
      ) : null}
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
      {removeError ? <p className="text-sm text-danger">{removeError}</p> : null}
      {removeSuccess ? <p className="text-sm text-success">{removeSuccess}</p> : null}
    </div>
  );
}
