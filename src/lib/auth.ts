import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface CurrentUser {
  id: string;
  loginId: string;
  email: string;
  displayName: string;
  role: string;
}

/** Loads the authenticated user for the current request, or null. Node runtime only (used from Route Handlers / Server Components, not middleware). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.uid } });
  if (!user) return null;

  return {
    id: user.id,
    loginId: user.loginId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

export function isAdmin(user: CurrentUser): boolean {
  return user.role === "admin";
}
