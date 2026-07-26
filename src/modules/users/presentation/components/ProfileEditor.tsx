"use client";

import { useActionState } from "react";
import type { UserDto } from "../../application/dto/UserDto";
import {
  removeOwnProfilePhotoAction,
  updateOwnProfileAction,
  uploadOwnProfilePhotoAction,
  type ProfileFormState,
} from "../controllers/profile.action";

const initial: ProfileFormState = {};

export function ProfileEditor({ user }: { user: UserDto }) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateOwnProfileAction,
    initial,
  );
  const [photoState, photoAction, photoPending] = useActionState(
    uploadOwnProfilePhotoAction,
    initial,
  );

  const photoSrc = user.profilePhotoUrl
    ? user.profilePhotoUrl.startsWith("storage:")
      ? `/api/users/${user.id}/photo`
      : user.profilePhotoUrl
    : null;

  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoSrc} alt="" className="size-14 rounded-full object-cover" />
        ) : (
          <div className="bg-accent/15 text-accent flex size-14 items-center justify-center rounded-full text-sm font-semibold">
            {initials}
          </div>
        )}
        <div className="space-y-2">
          <form action={photoAction} className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              className="text-xs"
              required
            />
            <button type="submit" className="mx-btn mx-btn-secondary mx-btn-sm" disabled={photoPending}>
              {photoPending ? "Uploading…" : "Upload photo"}
            </button>
          </form>
          {user.profilePhotoUrl ? (
            <form action={removeOwnProfilePhotoAction}>
              <button type="submit" className="text-muted text-xs hover:underline">
                Remove photo
              </button>
            </form>
          ) : null}
          {photoState.error ? <p className="text-danger text-xs">{photoState.error}</p> : null}
          {photoState.success ? <p className="text-success text-xs">{photoState.success}</p> : null}
        </div>
      </div>

      <form action={profileAction} className="grid gap-3">
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
