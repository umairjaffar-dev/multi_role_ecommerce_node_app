// A cursor is an opaque bookmark: "continue after this row".
// base64url keeps it URL-safe; it is NOT a secret, so it is always re-validated on the way back in.

import type { ZodType } from "zod";

export function encodeCursor(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

export function decodeCursor<TCursor>(
  cursor: string,
  schema: ZodType<TCursor>,
): TCursor | null {
  try {
    const json: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    const result = schema.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
