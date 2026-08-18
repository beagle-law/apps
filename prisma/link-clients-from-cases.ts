import { PrismaClient } from "@prisma/client";
import { encryptField, decryptField } from "../src/lib/crypto";

// 案件の依頼者名（clientName）から顧客マスタを補完するワンタイム移行処理（v5）。
// clientIdが未設定の案件について、依頼者名ごとに顧客レコードを作成／特定してリンクする。

export async function linkClientsFromCases(prisma: PrismaClient) {
  const orphanCases = await prisma.case.findMany({
    where: { clientId: null },
    select: { id: true, clientName: true },
  });
  const targets = orphanCases
    .map((c) => ({ id: c.id, name: decryptField(c.clientName).trim() }))
    .filter((c) => c.name.length > 0);

  if (targets.length === 0) {
    console.log("顧客未リンクの案件はありません。顧客自動補完をスキップします。");
    return;
  }

  const existingClients = await prisma.client.findMany({ select: { id: true, companyName: true, clientNumber: true } });
  const nameToClientId = new Map(existingClients.map((c) => [c.companyName, c.id]));
  let nextClientNumber = Math.max(0, ...existingClients.map((c) => c.clientNumber)) + 1;

  const uniqueNames = [...new Set(targets.map((t) => t.name))];
  let created = 0;
  for (const name of uniqueNames) {
    if (nameToClientId.has(name)) continue;
    const client = await prisma.client.create({
      data: {
        clientNumber: nextClientNumber++,
        companyName: name,
        contactName: encryptField(""),
        phone: encryptField(""),
        email: encryptField(""),
        address: encryptField(""),
        source: "案件一覧からの自動登録",
      },
    });
    nameToClientId.set(name, client.id);
    created++;
  }

  let linked = 0;
  for (const t of targets) {
    const clientId = nameToClientId.get(t.name);
    if (!clientId) continue;
    await prisma.case.update({ where: { id: t.id }, data: { clientId } });
    linked++;
  }

  console.log(`顧客自動補完：新規顧客 ${created} 件を作成し、案件 ${linked} 件をリンクしました。`);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  linkClientsFromCases(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
