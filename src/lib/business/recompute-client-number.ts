import type { PrismaClient } from "@prisma/client";
import { clientNumberFromCaseNumbers } from "./caseNumber";

/**
 * 顧客番号は、その顧客に紐づく案件の番号（枝番を除く）と一致させる（v13 3.1）。
 * 番号の異なる複数案件に紐づく場合は空欄（null）にする。
 * 案件を持たない顧客はここでは触らない（既存の仮番号を維持する）。
 */
export async function recomputeClientNumberFromLinkedCases(prisma: PrismaClient, clientId: string) {
  const cases = await prisma.case.findMany({ where: { clientId }, select: { caseNumber: true } });
  if (cases.length === 0) return;
  const derived = clientNumberFromCaseNumbers(cases.map((c) => c.caseNumber));

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.clientNumber === derived) return;

  try {
    await prisma.client.update({ where: { id: clientId }, data: { clientNumber: derived } });
  } catch {
    // 既に他の顧客がその番号を使用している場合は据え置く（実データの欠番・重複運用のため起こり得る）
  }
}
