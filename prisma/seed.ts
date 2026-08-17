import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { importExcelCases } from "./import-excel-cases";

const prisma = new PrismaClient();

const INITIAL_PASSWORD = "beagle2026";

const INITIAL_USERS = [
  { loginId: "miyamura", email: "ymiyamura@beagle-law.com", displayName: "宮村", role: "admin" },
  { loginId: "ozaki", email: "tozaki@beagle-law.com", displayName: "尾崎", role: "user" },
  { loginId: "iwashita", email: "tetsuya-iwashita@beagle-law.com", displayName: "岩下", role: "user" },
];

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
  await importExcelCases(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
