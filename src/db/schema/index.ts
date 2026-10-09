// Barrel file: every table schema will be exported from here.
// Drizzle Kit reads this file to generate migrations.
export {
  type UserType,
  type NewUserType,
  type UserRoleType,
  userRoleEnum,
  usersTable,
} from "./users.schema.js";
