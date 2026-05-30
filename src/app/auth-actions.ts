"use server";

import { createAdminClient } from "@/lib/supabase/admin";

function isAlreadyRegistered(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("already registered") ||
    m.includes("already exists") ||
    m.includes("already been registered") ||
    m.includes("user already")
  );
}

export type SignUpAccountResult =
  | { ok: true; method: "admin" | "client" }
  | { error: string; alreadyRegistered?: boolean };

/**
 * Creates an account without email confirmation when the service role key is set.
 * Otherwise returns { ok: true, method: "client" } and the browser should call signUp.
 */
export async function signUpAccount(
  email: string,
  password: string
): Promise<SignUpAccountResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || password.length < 6) {
    return { error: "Enter a valid email and a password of at least 6 characters." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { ok: true, method: "client" };
  }

  const { error } = await admin.auth.admin.createUser({
    email: trimmedEmail,
    password,
    email_confirm: true,
  });

  if (error) {
    if (isAlreadyRegistered(error.message)) {
      return {
        error: "This email already has an account. Sign in with your password below.",
        alreadyRegistered: true,
      };
    }
    return { error: error.message };
  }

  return { ok: true, method: "admin" };
}
