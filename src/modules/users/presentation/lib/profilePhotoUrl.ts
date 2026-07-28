/** Build a profile photo URL with cache-busting when stored on disk. */
export function profilePhotoSrc(
  userId: string,
  profilePhotoUrl: string | null | undefined,
): string | null {
  if (!profilePhotoUrl) return null;
  if (profilePhotoUrl.startsWith("storage:")) {
    return `/api/users/${userId}/photo?v=${encodeURIComponent(profilePhotoUrl)}`;
  }
  return profilePhotoUrl;
}
