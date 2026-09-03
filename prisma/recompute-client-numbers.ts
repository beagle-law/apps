import { PrismaClient } from "@prisma/client";
import { clientNumberFromCaseNumbers } from "../src/lib/business/caseNumber";

/**
 * 顧客番号の一括補正（v13 3.1）：
 * 顧客番号は、その顧客に紐づく案件の番号（枝番を除いた基本番号）と一致させる。
 * 複数案件の基本番号が一致しない場合は空欄（null）にする。
 * 案件を持たない顧客（顧客No.0の内部レコードを含む）は対象外。
 * 一意制約に抵触する一時衝突を避けるため、数値へ変更する対象はいったん負の仮番号へ退避してから確定させる
 * （空欄にする対象はnull同士が競合しないためそのまま確定できる）。
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

  const targets: { id: string; from: number | null; to: number | null }[] = [];
  for (const client of clients) {
    const caseNumbers = caseNumbersByClient.get(client.id);
    if (!caseNumbers) continue; // 案件を持たない顧客はスキップ
    const derived = clientNumberFromCaseNumbers(caseNumbers);
    if (derived === client.clientNumber) continue;
    targets.push({ id: client.id, from: client.clientNumber, to: derived });
  }

  if (targets.length === 0) {
    console.log("顧客番号の補正対象はありませんでした。");
    return;
  }

  const nullTargets = targets.filter((t) => t.to === null);
  const numericTargets = targets.filter((t): t is { id: string; from: number | null; to: number } => t.to !== null);

  // 空欄にする対象：nullはユニーク制約に抵触しないため、そのまま確定できる
  await Promise.all(nullTargets.map((t) => prisma.client.update({ where: { id: t.id }, data: { clientNumber: null } })));
  console.log(`顧客番号を ${nullTargets.length} 件、空欄に補正しました。`);

  if (numericTargets.length === 0) return;

  // フェーズ1：一時的に負の仮番号へ退避（一意制約の衝突回避）
  await Promise.all(
    numericTargets.map((t, idx) => prisma.client.update({ where: { id: t.id }, data: { clientNumber: -(idx + 1) } }))
  );

  // フェーズ2：本来の番号を確定。重複が残る場合は元の番号に戻す（負の仮番号のまま放置しない）
  let applied = 0;
  const skipped: typeof numericTargets = [];
  const stillNegative: typeof numericTargets = [];
  for (const t of numericTargets) {
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
