import { z } from "zod";

export const RegisterUserSchema = z
  .object({
    name: z
      .string({ error: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters"),
    email: z
      .string({ error: "Email is required" })
      .trim()
      .toLowerCase()
      .pipe(z.email("Invalid email address").max(255)),
    password: z
      .string({ error: "Password is required" })
      .min(8, "Password must be at least 8 characters")
      // bcrypt only uses the first 72 bytes of the input
      .max(72, "Password must be at most 72 characters")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string({ error: "Confirm password is required" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterUserSchemaType = z.infer<typeof RegisterUserSchema>;

// Login only checks presence: password rules may change after a user registered
export const LoginUserSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .pipe(z.email("Invalid email address")),
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required"),
});

export type LoginUserSchemaType = z.infer<typeof LoginUserSchema>;
