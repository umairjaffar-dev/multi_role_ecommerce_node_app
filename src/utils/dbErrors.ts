// PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";

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

export function isForeignKeyViolation(
  err: unknown,
  constraint?: string,
): boolean {
  const pgError = getPgError(err);
  if (!pgError || pgError.code !== PG_FOREIGN_KEY_VIOLATION) return false;
  return constraint ? pgError.constraint === constraint : true;
}
