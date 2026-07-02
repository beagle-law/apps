import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - 1000 * 60 * 60 * 24 * n);
const plusDaysStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

async function main() {
  const existing = await prisma.case.count();
  if (existing > 0) {
    console.log(`既に ${existing} 件の案件が存在するため、シードをスキップします。`);
    return;
  }

  await prisma.case.create({
    data: {
      caseNumber: "2026-014",
      title: "〇〇商事 対 △△工業 売買代金請求事件",
      clientName: "〇〇商事株式会社",
      caseCategory: "訴訟事件",
      stage: "受任・対応中",
      responseTypes: ["任意交渉", "訴状"],
      priority: "至急",
      ballOwner: "裁判所",
      teamMembers: ["佐藤 一郎", "山田 次郎"],
      courtCaseNumber: "東京地方裁判所 令和8年(ワ)第1234号",
      opposingCounselName: "高橋 健二",
      opposingCounselAffiliation: "高橋総合法律事務所",
      opposingCounselPhone: "03-1234-5678",
      opposingCounselEmail: "takahashi@example-law.jp",
      courtClerkName: "伊藤 真",
      courtClerkAffiliation: "東京地方裁判所民事第3部",
      poaStatus: "回収済み",
      contractStatus: "締結済み",
      retainerStatus: "要（入金済み）",
      createdAt: daysAgo(30),
      hearings: {
        create: [
          {
            date: plusDaysStr(5),
            time: "14:00",
            location: "東京地方裁判所 民事第3部 705号法廷",
            purpose: "第2回口頭弁論期日",
            notes: "準備書面（1）、証拠説明書を提出予定",
          },
          {
            date: plusDaysStr(-10),
            time: "10:30",
            url: "https://meet.example.com/case-2026-014",
            purpose: "第1回口頭弁論期日（WEB会議）",
            notes: "訴状陳述、答弁書擬制陳述",
          },
        ],
      },
      tasks: {
        create: [
          { description: "証拠説明書の作成", assignee: "山田 次郎", status: "対応中", dueDate: plusDaysStr(3), createdAt: daysAgo(2) },
          { description: "準備書面（1）の起案", assignee: "佐藤 一郎", status: "未着手", createdAt: daysAgo(2) },
        ],
      },
      questions: {
        create: [{ text: "示談交渉決裂後、訴訟移行の方針でよいか", status: "反映済み", createdAt: daysAgo(6) }],
      },
      documents: {
        create: [
          { name: "訴状", status: "提出済み" },
          { name: "証拠説明書", status: "作成中" },
          { name: "準備書面（1）", status: "未着手" },
        ],
      },
      updates: {
        create: [
          { timestamp: daysAgo(2), author: "佐藤 一郎", note: "第2回口頭弁論期日が指定された。準備書面を起案中。", auto: false },
          { timestamp: daysAgo(6), author: "佐藤 一郎", note: "任意交渉が決裂したため訴訟提起。訴状を提出。", auto: false },
        ],
      },
    },
  });

  await prisma.case.create({
    data: {
      caseNumber: "2026-009",
      title: "株式会社さくら 顧問契約書レビュー案件",
      clientName: "株式会社さくら",
      caseCategory: "非訟事件",
      stage: "受任・対応中",
      responseTypes: ["その他法律業務"],
      priority: "通常",
      ballOwner: "クライアント",
      teamMembers: ["鈴木 花子"],
      contractStatus: "締結済み",
      createdAt: daysAgo(20),
      tasks: {
        create: [{ description: "修正条項の反映可否についてクライアントへ再度確認", assignee: "鈴木 花子", status: "未着手", createdAt: daysAgo(3) }],
      },
      questions: {
        create: [{ text: "修正条項の反映可否について社内確認中", status: "回答済み・未反映", createdAt: daysAgo(4) }],
      },
      updates: {
        create: [{ timestamp: daysAgo(12), author: "鈴木 花子", note: "契約書レビューを実施し、修正案をクライアントへ送付。先方社内確認待ち。", auto: false }],
      },
    },
  });

  console.log("シードデータを投入しました。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
