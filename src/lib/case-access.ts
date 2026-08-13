import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { caseInclude, serializeCase } from "@/lib/case-query";

/**
 * Prisma `where` fragment enforcing private-memo-case visibility:
 * a case is visible if it isn't private, or if the current user owns it.
 * Must be AND-ed into every Case list/detail query.
 */
export function caseVisibilityFilter(userId: string): Prisma.CaseWhereInput {
  return {
    OR: [{ isPrivate: false }, { ownerId: userId }],
  };
}

/**
 * Fetches a case by id, but returns null (not just unauthorized) if the
 * case is a private memo case owned by someone else — callers should treat
 * null the same as "not found" so a private case's existence never leaks.
 */
export async function getAccessibleCaseOrNull(caseId: string, userId: string) {
  const c = await prisma.case.findUnique({ where: { id: caseId }, include: caseInclude });
  if (!c) return null;
  if (c.isPrivate && c.ownerId !== userId) return null;
  return c;
}

export async function getAccessibleCaseOrNullSerialized(caseId: string, userId: string) {
  const c = await getAccessibleCaseOrNull(caseId, userId);
  return c ? serializeCase(c) : null;
}

/**
 * Lazily provisions and returns the user's single private "memo" case
 * (one per account, per requirement 2.3).
 */
export async function ensurePrivateMemoCase(userId: string, displayName: string) {
  const existing = await prisma.case.findFirst({ where: { ownerId: userId, isPrivate: true } });
  if (existing) return existing;

  const year = new Date().getFullYear();
  return prisma.case.create({
    data: {
      caseNumber: `個人-${year}`,
      title: `${displayName}さんの個人メモ`,
      clientName: "",
      stage: "受任・対応中",
      ownerId: userId,
      isPrivate: true,
      hidden: false,
    },
  });
}
