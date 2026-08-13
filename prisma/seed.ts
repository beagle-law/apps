import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encryptField } from "../src/lib/crypto";

const prisma = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - 1000 * 60 * 60 * 24 * n).toISOString();
const plusDaysStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

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

async function seedSampleCase() {
  const existing = await prisma.case.count();
  if (existing > 0) {
    console.log(`既に ${existing} 件の案件が存在するため、サンプル案件の投入をスキップします。`);
    return;
  }

  const client = await prisma.client.create({
    data: {
      clientNumber: 1,
      companyName: "〇〇商事株式会社",
      contactName: encryptField("山田太郎"),
      phone: encryptField("03-1234-5678"),
      email: encryptField("yamada@example.com"),
      contactMethod: "電話",
      source: "紹介",
    },
  });

  await prisma.case.create({
    data: {
      caseNumber: "1",
      title: "〇〇商事 対 △△工業 売買代金請求事件",
      clientName: encryptField(client.companyName),
      clientId: client.id,
      stage: "受任・対応中",
      priority: "至急",
      ballOwner: "裁判所",
      teamMembers: ["宮村", "尾崎"],
      courtCaseNumber: "東京地方裁判所 令和8年(ワ)第1234号",
      poaStatus: "受領済",
      contractStatus: "締結済",
      retainerStatus: "受領済",
      caseClassification: "売買代金請求",
      opposingParty: encryptField("△△工業株式会社"),
      opposingCounselName: encryptField("高橋健二"),
      engagementDate: plusDaysStr(-30),
      litigationEngagementDate: plusDaysStr(-15),
      claimAmount: 3000000,
      retainerFee: 300000,
      createdAt: daysAgo(30),
      hearings: {
        create: [
          {
            date: plusDaysStr(-10),
            content: "第1回口頭弁論期日。訴状陳述、答弁書擬制陳述。",
            nextHearingDate: plusDaysStr(5),
            docDeadline: plusDaysStr(3),
          },
        ],
      },
      tasks: {
        create: [
          { description: "準備書面（1）の起案", assignee: "尾崎", assignedBy: "宮村", status: "対応中", dueDate: plusDaysStr(3), points: 6 },
        ],
      },
      documents: {
        create: [
          { name: "訴状", status: "提出済み" },
          { name: "証拠説明書", status: "作成中" },
        ],
      },
      updates: {
        create: [{ author: "宮村", note: "第2回口頭弁論期日が指定された。準備書面を起案中。", auto: false }],
      },
    },
  });

  console.log("サンプル顧客・案件を投入しました。");
}

async function main() {
  await seedUsers();
  await seedSampleCase();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
