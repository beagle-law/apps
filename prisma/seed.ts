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

const CATCH_ALL_STAFF = ["宮村", "尾崎", "岩下"];

/**
 * 内部管理用の特別レコード（要件定義書v6 3.7）：
 * 顧客No.0「Beagle総合法律事務所」と、各スタッフの「とりあえず案件」（案件No.000, catchAllFor）。
 */
async function seedInternalRecords() {
  let officeClient = await prisma.client.findUnique({ where: { clientNumber: 0 } });
  if (!officeClient) {
    officeClient = await prisma.client.create({
      data: {
        clientNumber: 0,
        companyName: "Beagle総合法律事務所",
        clientType: "法人",
        notes: "事務所自身を表す内部顧客レコード",
      },
    });
    console.log("顧客No.0「Beagle総合法律事務所」を作成しました。");
  }

  for (const name of CATCH_ALL_STAFF) {
    const existing = await prisma.case.findFirst({ where: { catchAllFor: name } });
    if (existing) {
      if (!existing.isTimeChargeCase) {
        await prisma.case.update({ where: { id: existing.id }, data: { isTimeChargeCase: true } });
        console.log(`案件No.000「${name}とりあえず」のisTimeChargeCaseをtrueに更新しました。`);
      }
      continue;
    }
    await prisma.case.create({
      data: {
        caseNumber: "000",
        title: `${name}とりあえず`,
        clientName: officeClient.companyName,
        clientId: officeClient.id,
        stage: "受任・対応中",
        catchAllFor: name,
        teamMembers: [name],
        isTimeChargeCase: true,
      },
    });
    console.log(`案件No.000「${name}とりあえず」を作成しました。`);
  }
}

async function main() {
  await seedUsers();
  await importExcelCases(prisma);
  await linkClientsFromCases(prisma);
  await seedInternalRecords();
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
