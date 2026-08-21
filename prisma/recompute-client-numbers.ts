import { PrismaClient } from "@prisma/client";
import { clientNumberFromCaseNumbers } from "../src/lib/business/caseNumber";

/**
 * 顧客番号の一括補正（要件定義書v7 3.7）：
 * 顧客番号は、その顧客に紐づく案件の実番号（数字のみのもの）のうち最小値を採用する。
 * 案件を持たない顧客（顧客No.0の内部レコードを含む）は対象外（7章の未確定事項）。
 * 一意制約に抵触する一時衝突を避けるため、いったん負の仮番号へ退避してから確定させる。
 */
export async function recomputeAllClientNumbers(prisma: PrismaClient) {
  const clients = await prisma.client.findMany({
    where: { clientNumber: { not: 0 } },
    select: { id: true, clientNumber: true },
  });

  const cases = await prisma.case.findMany({
    where: { clientId: { not: null } },
    select: { clientId: true, caseNumber: true },
  });
  const caseNumbersByClient = new Map<string, string[]>();
  for (const c of cases) {
    if (!c.clientId) continue;
    const list = caseNumbersByClient.get(c.clientId) ?? [];
    list.push(c.caseNumber);
    caseNumbersByClient.set(c.clientId, list);
  }

  const targets: { id: string; from: number; to: number }[] = [];
  for (const client of clients) {
    const caseNumbers = caseNumbersByClient.get(client.id);
    if (!caseNumbers) continue; // 案件を持たない顧客はスキップ
    const min = clientNumberFromCaseNumbers(caseNumbers);
    if (min === null || min === client.clientNumber) continue;
    targets.push({ id: client.id, from: client.clientNumber, to: min });
  }

  if (targets.length === 0) {
    console.log("顧客番号の補正対象はありませんでした。");
    return;
  }

  // フェーズ1：一時的に負の仮番号へ退避（一意制約の衝突回避）
  await Promise.all(
    targets.map((t, idx) => prisma.client.update({ where: { id: t.id }, data: { clientNumber: -(idx + 1) } }))
  );

  // フェーズ2：本来の番号を確定。重複が残る場合は元の番号に戻す（負の仮番号のまま放置しない）
  let applied = 0;
  const skipped: typeof targets = [];
  const stillNegative: typeof targets = [];
  for (const t of targets) {
    try {
      await prisma.client.update({ where: { id: t.id }, data: { clientNumber: t.to } });
      applied++;
    } catch {
      skipped.push(t);
      try {
        await prisma.client.update({ where: { id: t.id }, data: { clientNumber: t.from } });
      } catch {
        stillNegative.push(t);
      }
    }
  }
  if (stillNegative.length > 0) {
    console.log(
      `⚠️⚠️ ${stillNegative.length} 件は元の番号にも戻せず、負の仮番号のままです（要手動確認）：` +
        stillNegative.map((t) => `${t.from}→${t.to}`).join(", ")
    );
  }

  console.log(`顧客番号を ${applied} 件補正しました。`);
  if (skipped.length > 0) {
    console.log(
      `⚠️ ${skipped.length} 件は番号が他の顧客と重複するため補正をスキップしました（要目視確認）：` +
        skipped.map((t) => `${t.from}→${t.to}`).join(", ")
    );
  }
}

if (require.main === module) {
  const prisma = new PrismaClient();
  recomputeAllClientNumbers(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
