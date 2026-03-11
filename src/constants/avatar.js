export const DEFAULT_AVATAR_URL =
  "https://static.vecteezy.com/system/resources/thumbnails/009/292/244/small/default-avatar-icon-of-social-media-user-vector.jpg";

export function resolveAvatarUrl(avatar) {
  if (typeof avatar === "string" && avatar.trim()) {
    return avatar.trim();
  }
  return DEFAULT_AVATAR_URL;
}
