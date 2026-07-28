"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserDto } from "../../application/dto/UserDto";
import {
  removeOwnProfilePhotoAction,
  updateOwnProfileAction,
  uploadOwnProfilePhotoAction,
  type ProfileFormState,
} from "../controllers/profile.action";
import { Button } from "@/shared/ui/Button";
import { FilePickButton } from "@/shared/ui/FilePickButton";
import { profilePhotoSrc } from "../lib/profilePhotoUrl";

const initial: ProfileFormState = {};

export function ProfileEditor({ user }: { user: UserDto }) {
  const router = useRouter();
  const [profileState, profileAction, profilePending] = useActionState(
    updateOwnProfileAction,
    initial,
  );
  const [photoState, photoAction, photoPending] = useActionState(
    uploadOwnProfilePhotoAction,
    initial,
  );
  const [removeState, setRemoveState] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    if (profileState.success) router.refresh();
  }, [profileState.success, router]);

  useEffect(() => {
    if (photoState.success) router.refresh();
  }, [photoState.success, router]);

  const photoSrc = profilePhotoSrc(user.id, user.profilePhotoUrl);

  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt=""
            className="size-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="bg-accent/15 text-accent flex size-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <span className="mx-label block">Profile photo</span>
          <form action={photoAction} className="space-y-2">
            <FilePickButton
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              required
              disabled={photoPending}
              buttonLabel="Choose photo"
              changeLabel="Change photo"
            >
              <Button type="submit" variant="secondary" size="sm" disabled={photoPending}>
                {photoPending ? "Uploading…" : "Upload photo"}
              </Button>
            </FilePickButton>
          </form>
          {user.profilePhotoUrl ? (
            <button
              type="button"
              className="text-muted text-xs hover:underline"
              disabled={removeState}
              onClick={() => {
                setRemoveError(null);
                setRemoveState(async () => {
                  const result = await removeOwnProfilePhotoAction();
                  if (result.error) {
                    setRemoveError(result.error);
                    return;
                  }
                  router.refresh();
                });
              }}
            >
              {removeState ? "Removing…" : "Remove photo"}
            </button>
          ) : null}
          {removeError ? <p className="text-danger text-xs">{removeError}</p> : null}
          {photoState.error ? <p className="text-danger text-xs">{photoState.error}</p> : null}
          {photoState.success ? <p className="text-success text-xs">{photoState.success}</p> : null}
        </div>
      </div>

      <form action={profileAction} className="grid gap-3 border-t border-border/60 pt-4">
        {profileState.error ? (
          <p className="text-danger text-sm">{profileState.error}</p>
        ) : null}
        {profileState.success ? (
          <p className="text-success text-sm">{profileState.success}</p>
        ) : null}
        <label className="flex flex-col gap-1.5">
          <span className="mx-label">Full name</span>
          <input
            name="fullName"
            required
            maxLength={200}
            defaultValue={user.fullName}
            className="mx-input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mx-label">Phone</span>
          <input
            name="phone"
            type="tel"
            required
            maxLength={20}
            defaultValue={user.phone ?? ""}
            className="mx-input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mx-label">Email</span>
          <input className="mx-input" value={user.email} disabled readOnly />
          <span className="text-muted text-xs">Email changes are handled by an administrator.</span>
        </label>
        <button type="submit" className="mx-btn mx-btn-primary self-start" disabled={profilePending}>
          {profilePending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
