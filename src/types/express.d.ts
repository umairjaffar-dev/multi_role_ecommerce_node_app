import type { UserRoleType } from "../db/schema/users.schema.ts";

export type AuthUserType = {
  id: string;
  role: UserRoleType;
};

declare global {
  namespace Express {
    // Declaration merging only works with `interface`, so this is the one exception to the `type` rule
    interface Request {
      user?: AuthUserType;
    }
  }
}
