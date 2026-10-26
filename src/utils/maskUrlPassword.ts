// Replaces the password in a URL with "****" so it can be shown in API responses.
// rtsp://admin:secret@10.0.0.5/live -> rtsp://admin:****@10.0.0.5/live
export function maskUrlPassword(rawUrl: string): string {
  const url = new URL(rawUrl);

  if (url.password) {
    url.password = "****";
  }

  return url.toString();
}
