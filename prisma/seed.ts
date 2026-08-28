import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { importExcelCases } from "./import-excel-cases";
import { linkClientsFromCases } from "./link-clients-from-cases";
import { recomputeAllClientNumbers } from "./recompute-client-numbers";

const prisma = new PrismaClient();

const INITIAL_PASSWORD = "beagle2026";

const INITIAL_USERS = [
  { loginId: "miyamura", email: "ymiyamura@beagle-law.com", displayName: "宮村", role: "admin" },
  { loginId: "ozaki", email: "tozaki@beagle-law.com", displayName: "尾崎", role: "user" },
  { loginId: "iwashita", email: "tetsuya-iwashita@beagle-law.com", displayName: "岩下", role: "user" },
];

// 案件分類の初期値（v10 3.7）。以降は「案件分類」欄の「＋」から拡張可能。
const INITIAL_CASE_CLASSIFICATIONS = [
  "売買代金請求",
  "損害賠償",
  "貸金請求",
  "労働",
  "相続",
  "企業法務",
  "不動産",
  "離婚・家事",
  "その他",
];

async function seedCaseClassifications() {
  for (const name of INITIAL_CASE_CLASSIFICATIONS) {
    await prisma.caseClassification.upsert({ where: { name }, update: {}, create: { name } });
  }
}

async function seedUsers() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log(`既に ${existing} 名のユーザーが存在するため、ユーザー作成をスキップします。`);
    return;
  }
  const passwordHash = await bcrypt.hash(INITIAL_PASSWORD, 12);
  for (const u of INITIAL_USERS) {
    await prisma.user.create({ data: { ...u, passwordHash } });
  }
  console.log(`ユーザーを作成しました（初期パスワード: ${INITIAL_PASSWORD}。必ずログイン後に変更してください）。`);
}

async function main() {
  await seedUsers();
  await seedCaseClassifications();
  await importExcelCases(prisma);
  await linkClientsFromCases(prisma);
  await recomputeAllClientNumbers(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
