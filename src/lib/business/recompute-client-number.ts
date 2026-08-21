import type { PrismaClient } from "@prisma/client";
import { clientNumberFromCaseNumbers } from "./caseNumber";

/**
 * 顧客番号は、その顧客に紐づく案件の実番号（数字のみのもの）のうち最小値を採用する（v7 3.7）。
 * 案件を持たない顧客はここでは触らない（7章の未確定事項として運用開始前の見直し対象）。
 */
export async function recomputeClientNumberFromLinkedCases(prisma: PrismaClient, clientId: string) {
  const cases = await prisma.case.findMany({ where: { clientId }, select: { caseNumber: true } });
  const min = clientNumberFromCaseNumbers(cases.map((c) => c.caseNumber));
  if (min === null) return;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.clientNumber === min) return;

  try {
    await prisma.client.update({ where: { id: clientId }, data: { clientNumber: min } });
  } catch {
    // 既に他の顧客がその番号を使用している場合は据え置く（実データの欠番・重複運用のため起こり得る）
  }
}
