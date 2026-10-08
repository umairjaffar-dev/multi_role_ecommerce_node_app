// PostgreSQL error code for unique constraint violations
const PG_UNIQUE_VIOLATION = "23505";

type PgErrorType = { code?: string; constraint?: string };

function getPgError(err: unknown): PgErrorType | null {
  const candidate = err instanceof Error && err.cause ? err.cause : err;
  return typeof candidate === "object" && candidate !== null
    ? (candidate as PgErrorType)
    : null;
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const pgError = getPgError(err);
  if (!pgError || pgError.code !== PG_UNIQUE_VIOLATION) return false;
  return constraint ? pgError.constraint === constraint : true;
}
