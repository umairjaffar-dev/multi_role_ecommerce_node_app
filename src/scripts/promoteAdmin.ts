import { z } from "zod";
import { closeDatabase, db } from "../db/index.js";
import { usersTable } from "../db/schema/users.schema.js";
import { eq, sql } from "drizzle-orm";

const EmailArgSchema = z.string().trim().toLowerCase().pipe(z.email());

async function promoteAdmin(): Promise<number> {
    const parsed = EmailArgSchema.safeParse(process.argv[2]);
  
    if (!parsed.success) {
      console.error("Usage: npm run admin:promote -- <email>");
      return 1;
    }
  
    const email = parsed.data;
  
    const [user] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${email}`)
      .limit(1);
  
    if (!user) {
      console.error(`No user found with email ${email}. Register the account first.`);
      return 1;
    }
  
    if (user.role === "admin") {
      console.log(`${email} is already an admin.`);
      return 0;
    }
  
    await db
      .update(usersTable)
      .set({ role: "admin" })
      .where(eq(usersTable.id, user.id));
  
    console.log(`${email} is now an admin. Log in again (or refresh) to get a token with the new role.`);
    return 0;
  }

  promoteAdmin()
  .then(async (exitCode) => {
    await closeDatabase();
    process.exit(exitCode);
  })
  .catch(async (err: unknown) => {
    console.error("Failed to promote user:", err);
    await closeDatabase();
    process.exit(1);
  });
