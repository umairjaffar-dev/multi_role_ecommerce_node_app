import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { env } from "../../config/env.js";
import { db, type DbExecutorType } from "../../db/index.js";
import {
  refreshTokensTable,
  usersTable,
  type UserType,
} from "../../db/schema/index.js";
import { AppError } from "../../utils/AppError.js";
import { isUniqueViolation } from "../../utils/dbErrors.js";
import type {
  LoginUserSchemaType,
  RegisterUserSchemaType,
} from "./auth.validation.js";
import bcrypt from "bcrypt";
import { signAccessToken } from "../../lib/jwt.js";
import { logger } from "../../lib/logger.js";
import {
  generateRefreshToken,
  getRefreshTokenExpiryDate,
  hashRefreshToken,
} from "../../lib/refreshToken.js";

export type PublicUserType = Pick<
  UserType,
  "id" | "name" | "email" | "role" | "createdAt"
>;

// A token revoked this recently was most likely rotated by a parallel request from the same client
// (e.g. two browser tabs refreshing at once), not stolen, so it does not trigger reuse detection
const REUSE_GRACE_PERIOD_MS = 10_000;

// Columns that are safe to return to the client (never passwordHash)
const publicUserColumns = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  role: usersTable.role,
  createdAt: usersTable.createdAt,
} satisfies Record<keyof PublicUserType, unknown>;

export async function userRegisterService(
  input: RegisterUserSchemaType,
): Promise<PublicUserType> {
  const passwordHash = await bcrypt.hash(
    input.password,
    env.security.bcryptSaltRounds,
  );

  try {
    const [user] = await db
      .insert(usersTable)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
      })
      .returning(publicUserColumns);

    if (!user) {
      throw new Error("Insert did not return the created user");
    }

    return user;
  } catch (err) {
    if (isUniqueViolation(err, "users_email_lower_unique")) {
      throw new AppError(
        409,
        "Email is already registered",
        "EMAIL_ALREADY_EXISTS",
      );
    }

    throw err;
  }
}

export type AuthSessionType = {
  user: PublicUserType;
  accessToken: string;
  refreshToken: string;
};

// Compared against when the email does not exist, so both paths take the same time
const dummyPasswordHashPromise = bcrypt.hash(
  "dummy-password-for-timing",
  env.security.bcryptSaltRounds,
);

const authLogger = logger.child({ module: "auth" });

async function createRefreshToken(
  executor: DbExecutorType,
  userId: string,
): Promise<string> {
  const refreshToken = generateRefreshToken();

  await executor.insert(refreshTokensTable).values({
    userId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: getRefreshTokenExpiryDate(),
  });

  return refreshToken;
}

export async function userLoginService(
  input: LoginUserSchemaType,
): Promise<AuthSessionType> {
  const [user] = await db
    .select({
      ...publicUserColumns,
      passwordHash: usersTable.passwordHash,
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = ${input.email}`)
    .limit(1);

  const passwordHash = user?.passwordHash ?? (await dummyPasswordHashPromise);
  const isPasswordValid = await bcrypt.compare(input.password, passwordHash);

  if (!user || !isPasswordValid) {
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new AppError(
      403,
      "This account has been disabled",
      "ACCOUNT_DISABLED",
    );
  }

  const {
    passwordHash: _passwordHash,
    isActive: _isActive,
    ...publicUser
  } = user;

  const accessToken = signAccessToken({
    sub: publicUser.id,
    role: publicUser.role,
  });
  const refreshToken = await createRefreshToken(db, publicUser.id);

  return { user: publicUser, accessToken, refreshToken };
}

async function revokeAllUserRefreshTokens(
  executor: DbExecutorType,
  userId: string,
): Promise<void> {
  await executor
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokensTable.userId, userId),
        isNull(refreshTokensTable.revokedAt),
      ),
    );
}

export async function userRefreshTokenService(
  presentedToken: string,
): Promise<AuthSessionType> {
  const tokenHash = hashRefreshToken(presentedToken);

  const session = await db.transaction(async (tx) => {
    const [revokedToken] = await tx
      .update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokensTable.tokenHash, tokenHash),
          isNull(refreshTokensTable.revokedAt),
          gt(refreshTokensTable.expiresAt, new Date()),
        ),
      )
      .returning({ userId: refreshTokensTable.userId });

    // Nothing was changed; the reason is investigated outside the transaction
    if (!revokedToken) {
      return null;
    }

    const [user] = await tx
      .select({ ...publicUserColumns, isActive: usersTable.isActive })
      .from(usersTable)
      .where(eq(usersTable.id, revokedToken.userId))
      .limit(1);

    // Throwing rolls the transaction back, so the old token is not consumed
    if (!user || !user.isActive) {
      throw new AppError(
        403,
        "This account has been disabled",
        "ACCOUNT_DISABLED",
      );
    }

    const { isActive: _isActive, ...publicUser } = user;

    const accessToken = signAccessToken({
      sub: publicUser.id,
      role: publicUser.role,
    });
    const refreshToken = await createRefreshToken(tx, publicUser.id);

    return { user: publicUser, accessToken, refreshToken };
  });
  if (session) {
    return session;
  }

  // Find out why it failed, only to return a precise error code
  const [existingToken] = await db
    .select({
      userId: refreshTokensTable.userId,
      expiresAt: refreshTokensTable.expiresAt,
      revokedAt: refreshTokensTable.revokedAt,
    })
    .from(refreshTokensTable)
    .where(eq(refreshTokensTable.tokenHash, tokenHash))
    .limit(1);

  if (!existingToken) {
    throw new AppError(401, "Invalid refresh token", "REFRESH_TOKEN_INVALID");
  }
  if (existingToken.revokedAt) {
    const revokedAgoMs = Date.now() - existingToken.revokedAt.getTime();
    if (revokedAgoMs <= REUSE_GRACE_PERIOD_MS) {
      throw new AppError(401, "Invalid refresh token", "REFRESH_TOKEN_INVALID");
    }

    await revokeAllUserRefreshTokens(db, existingToken.userId);

    authLogger.warn(
      { userId: existingToken.userId },
      "Refresh token reuse detected, all sessions revoked",
    );

    throw new AppError(
      401,
      "Refresh token reuse detected, please log in again",
      "REFRESH_TOKEN_REUSED",
    );
  }

  throw new AppError(401, "Refresh token has expired", "REFRESH_TOKEN_EXPIRED");
}

// Idempotent: logging out with a missing, unknown or already revoked token still succeeds
export async function userLogoutService(
  presentedToken: string | undefined,
): Promise<void> {
  if (!presentedToken) {
    return;
  }

  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokensTable.tokenHash, hashRefreshToken(presentedToken)),
        isNull(refreshTokensTable.revokedAt),
      ),
    );
}
