import { PrismaClient } from "@prisma/client";
import { EXCEL_IMPORT_CASES } from "./excel-import-data";
import { encryptField } from "../src/lib/crypto";

// 事務所の実際の案件管理Excel（受任シート87件＋終件シート46件、計133件）のワンタイム投入。
// prisma/excel-import-data.ts は legal-case-tracker.jsx から抽出した実データで、手動編集しないこと。

interface RawContact {
  name?: string;
  affiliation?: string;
  phone?: string;
  fax?: string;
  email?: string;
}
interface RawHearing {
  date?: string;
  content?: string;
  docDeadline?: string;
  nextHearingDate?: string;
}
interface RawEngagement {
  poaStatus?: string;
  contractStatus?: string;
  retainerStatus?: string;
}
interface RawUpdate {
  author?: string;
  note?: string;
  auto?: boolean;
}
interface RawCase {
  caseNumber?: string;
  title?: string;
  clientName?: string;
  stage?: string;
  priority?: string;
  deadline?: string;
  ballOwner?: string;
  ballAssignee?: string;
  hidden?: boolean;
  teamMembers?: string[];
  courtCaseNumber?: string;
  opposingCounsel?: RawContact;
  courtClerk?: RawContact;
  hearings?: RawHearing[];
  engagement?: RawEngagement;
  claimMemo?: string;
  caseClassification?: string;
  opposingParty?: string;
  opposingCounselOffice?: string;
  opposingPartyPhone?: string;
  opposingPartyContactMethod?: string;
  opposingCounselPersonName?: string;
  opposingCounselPhone?: string;
  opposingCounselContactMethod?: string;
  engagementDate?: string;
  litigationEngagementDate?: string;
  noticeSentDate?: string;
  filingDate?: string;
  claimAmount?: number | string;
  retainerFee?: number | string;
  expectedFee?: number | string;
  expectedFeeDate?: string;
  updates?: RawUpdate[];
}

function numOrNull(v: number | string | undefined): number | null {
  if (v === undefined || v === "" || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function importExcelCases(prisma: PrismaClient) {
  const existing = await prisma.case.count();
  if (existing > 0) {
    console.log(`既に ${existing} 件の案件が存在するため、Excelインポートをスキップします。`);
    return;
  }

  const importNow = new Date();
  const cases = EXCEL_IMPORT_CASES as unknown as RawCase[];
  let created = 0;

  for (const raw of cases) {
    await prisma.case.create({
      data: {
        caseNumber: raw.caseNumber || "",
        title: raw.title || "",
        clientName: encryptField(raw.clientName || ""),
        stage: raw.stage || "新規問合せ・紹介",
        priority: raw.priority || "通常",
        deadline: raw.deadline || "",
        ballOwner: raw.ballOwner || "事務所",
        ballAssignee: raw.ballAssignee || "",
        hidden: !!raw.hidden,
        courtCaseNumber: raw.courtCaseNumber || "",
        poaStatus: raw.engagement?.poaStatus || "対応不要",
        contractStatus: raw.engagement?.contractStatus || "対応不要",
        retainerStatus: raw.engagement?.retainerStatus || "対応不要",
        claimMemo: raw.claimMemo || "",
        caseClassification: raw.caseClassification || "",
        opposingParty: encryptField(raw.opposingParty || ""),
        opposingPartyPhone: encryptField(raw.opposingPartyPhone || ""),
        opposingPartyContactMethod: raw.opposingPartyContactMethod || "",
        opposingCounselOffice: encryptField(raw.opposingCounselOffice || ""),
        opposingCounselPersonName: encryptField(raw.opposingCounselPersonName || ""),
        opposingCounselPhone: encryptField(raw.opposingCounselPhone || ""),
        opposingCounselContactMethod: raw.opposingCounselContactMethod || "",
        engagementDate: raw.engagementDate || "",
        litigationEngagementDate: raw.litigationEngagementDate || "",
        noticeSentDate: raw.noticeSentDate || "",
        filingDate: raw.filingDate || "",
        claimAmount: numOrNull(raw.claimAmount),
        retainerFee: numOrNull(raw.retainerFee),
        expectedFee: numOrNull(raw.expectedFee),
        expectedFeeDate: raw.expectedFeeDate || "",
        createdAt: importNow,
        hearings: raw.hearings?.length
          ? {
              create: raw.hearings.map((h) => ({
                date: h.date || "",
                content: h.content || "",
                docDeadline: h.docDeadline || "",
                nextHearingDate: h.nextHearingDate || "",
                createdAt: importNow,
              })),
            }
          : undefined,
        updates: raw.updates?.length
          ? {
              create: raw.updates.map((u) => ({
                author: u.author || "インポート",
                note: u.note || "",
                auto: !!u.auto,
                timestamp: importNow,
              })),
            }
          : undefined,
      },
    });
    created += 1;
  }

  console.log(`Excelインポートデータを ${created} 件投入しました。`);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  importExcelCases(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
