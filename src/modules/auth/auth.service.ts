import { sql } from "drizzle-orm";
import { env } from "../../config/env.js";
import { db } from "../../db/index.js";
import { usersTable, type UserType } from "../../db/schema/index.js";
import { AppError } from "../../utils/AppError.js";
import { isUniqueViolation } from "../../utils/dbErrors.js";
import {
  type LoginUserSchemaType,
  type RegisterUserSchemaType,
} from "./auth.validation.js";
import bcrypt from "bcrypt";
import { signAccessToken } from "../../lib/jwt.js";

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

export type LoginResultType = {
  user: PublicUserType;
  accessToken: string;
};

const dummyPasswordHashPromise = bcrypt.hash(
  "dummy-password-for-timing",
  env.security.bcryptSaltRounds,
);

export async function userLoginService(
  input: LoginUserSchemaType,
): Promise<LoginResultType> {
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

  return { user: publicUser, accessToken };
}
