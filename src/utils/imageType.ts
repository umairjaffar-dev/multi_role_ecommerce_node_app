// The first bytes of a file ("magic bytes") reveal its real format.
// The file name and the Content-Type header come from the client and can lie; these bytes cannot.
export type DetectedImageType = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

function startsWith(buffer: Buffer, bytes: Array<number>, offset = 0): boolean {
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

// Returns null for anything that is not a JPEG, PNG or WebP (SVG, GIF, PDF, scripts, ...)
export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: "image/png", extension: "png" };
  }
  // WebP: "RIFF" + 4 size bytes + "WEBP"
  if (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}
