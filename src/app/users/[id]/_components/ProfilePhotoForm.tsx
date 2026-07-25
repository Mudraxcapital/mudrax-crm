"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
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
  const [removing, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
          <span className="text-muted">Profile photo</span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className="mx-input text-xs"
            required
          />
        </label>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </form>
      {hasPhoto ? (
        <Button
          variant="ghost"
          disabled={removing}
          onClick={() => {
            startTransition(async () => {
              await removeProfilePhotoAction(userId);
              router.refresh();
            });
          }}
        >
          Remove photo
        </Button>
      ) : null}
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
    </div>
  );
}
