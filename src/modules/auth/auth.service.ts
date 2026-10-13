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
import {
  type LoginUserSchemaType,
  type RegisterUserSchemaType,
} from "./auth.validation.js";
import bcrypt from "bcrypt";
import { signAccessToken } from "../../lib/jwt.js";
import {
  generateRefreshToken,
  getRefreshTokenExpiryDate,
  hashRefreshToken,
} from "../../lib/refreshToken.js";

export type PublicUserType = Pick<
  UserType,
  "id" | "name" | "email" | "role" | "createdAt"
>;

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

const dummyPasswordHashPromise = bcrypt.hash(
  "dummy-password-for-timing",
  env.security.bcryptSaltRounds,
);

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

export async function userRefreshTokenService(
  presentedToken: string,
): Promise<AuthSessionType> {
  const tokenHash = hashRefreshToken(presentedToken);

  return db.transaction(async (tx) => {
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

    if (!revokedToken) {
      // Find out why it failed, only to return a precise error code
      const [existingToken] = await tx
        .select({
          expiresAt: refreshTokensTable.expiresAt,
          revokedAt: refreshTokensTable.revokedAt,
        })
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.tokenHash, tokenHash))
        .limit(1);

      if (
        existingToken &&
        !existingToken.revokedAt &&
        existingToken.expiresAt <= new Date()
      ) {
        throw new AppError(
          401,
          "Refresh token has expired",
          "REFRESH_TOKEN_EXPIRED",
        );
      }

      // Unknown or already revoked (reuse detection comes in Step 9c)
      throw new AppError(401, "Invalid refresh token", "REFRESH_TOKEN_INVALID");
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
}
