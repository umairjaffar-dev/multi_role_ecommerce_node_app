import { env } from "../../config/env.js";
import { db } from "../../db/index.js";
import { usersTable, type UserType } from "../../db/schema/users.schema.js";
import { AppError } from "../../utils/AppError.js";
import { isUniqueViolation } from "../../utils/dbErrors.js";
import { type RegisterInputType } from "./auth.validation.js";
import bcrypt from "bcrypt";

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

export const authService = {
  async registerUser(input: RegisterInputType): Promise<PublicUserType> {
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
  },
};
