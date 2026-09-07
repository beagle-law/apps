import type { Prisma } from "@prisma/client";
import { decryptField, encryptField } from "@/lib/crypto";

export const caseInclude = {
  hearings: { orderBy: { date: "asc" } },
  expenses: { orderBy: { date: "asc" } },
  updates: { orderBy: { timestamp: "desc" } },
  claimMemos: { orderBy: { createdAt: "desc" }, include: { images: { orderBy: { createdAt: "asc" } } } },
  plans: { orderBy: { date: "asc" } },
  // v14：案件一覧に顧客No.・顧客名（最新）を表示するため、顧客を軽く同時取得する（⑥⑦）。
  client: { select: { clientNumber: true, companyName: true } },
} satisfies Prisma.CaseInclude;

export type FullCase = Prisma.CaseGetPayload<{ include: typeof caseInclude }>;

export function serializeCase(c: FullCase) {
  return {
    id: c.id,
    caseNumber: c.caseNumber,
    title: c.title,
    // 顧客に紐づいている場合は顧客名の最新値を表示する（過去に依頼者名を編集しても
    // 案件側に反映されなかった不具合の修正、v14）。未紐付けの案件は登録時のスナップショットを使う。
    // Client.companyNameは暗号化していないフィールドのため、Case.clientName（暗号化）と異なり復号しない。
    clientName: c.client ? c.client.companyName : decryptField(c.clientName),
    clientNumber: c.client?.clientNumber ?? null,
    clientId: c.clientId ?? "",
    stage: c.stage,
    closedDate: c.closedDate,
    priority: c.priority,
    ballOwner: c.ballOwner,
    ballAssignee: c.ballAssignee,
    hidden: c.hidden,
    deadline: c.deadline,
    isTimeChargeCase: c.isTimeChargeCase,
    timeChargeRate: c.timeChargeRate ?? null,
    customFields: Array.isArray(c.customFields) ? c.customFields : [],
    ownerId: c.ownerId ?? "",
    isPrivate: c.isPrivate,

    courtCaseNumber: c.courtCaseNumber,
    courtClerk: {
      name: c.courtClerkName,
      affiliation: c.courtClerkAffiliation,
      phone: c.courtClerkPhone,
      fax: c.courtClerkFax,
      email: c.courtClerkEmail,
    },

    poaStatus: c.poaStatus,
    contractStatus: c.contractStatus,
    retainerStatus: c.retainerStatus,

    claimMemo: c.claimMemo,
    claimMemos: c.claimMemos.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      images: m.images.map((img) => ({ ...img, createdAt: img.createdAt.toISOString() })),
    })),

    caseClassification: c.caseClassification,
    opposingParty: decryptField(c.opposingParty),
    opposingPartyPhone: decryptField(c.opposingPartyPhone),
    opposingPartyContactMethod: c.opposingPartyContactMethod,
    opposingCounselOffice: decryptField(c.opposingCounselOffice),
    opposingCounselPersonName: decryptField(c.opposingCounselPersonName),
    opposingCounselPhone: decryptField(c.opposingCounselPhone),
    opposingCounselFax: decryptField(c.opposingCounselFax),
    opposingCounselEmail: decryptField(c.opposingCounselEmail),
    opposingCounselContactMethod: c.opposingCounselContactMethod,
    engagementDate: c.engagementDate,
    litigationEngagementDate: c.litigationEngagementDate,
    noticeSentDate: c.noticeSentDate,
    filingDate: c.filingDate,
    claimAmount: c.claimAmount ?? "",
    retainerFee: c.retainerFee ?? "",
    expectedFee: c.expectedFee ?? "",
    expectedFeeDate: c.expectedFeeDate,

    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),

    hearings: c.hearings,
    expenses: c.expenses.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
    updates: c.updates.map((u) => ({ ...u, timestamp: u.timestamp.toISOString() })),
    plans: c.plans.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
  };
}

/** 相手方代理人情報（v4で1セットに統合）の書き込み用ヘルパー。未指定のキーは更新しない。 */
export interface OpposingCounselInput {
  office?: string;
  personName?: string;
  phone?: string;
  fax?: string;
  email?: string;
  contactMethod?: string;
}

export function encryptOpposingCounsel(c: OpposingCounselInput) {
  return {
    ...(c.office !== undefined && { opposingCounselOffice: encryptField(c.office) }),
    ...(c.personName !== undefined && { opposingCounselPersonName: encryptField(c.personName) }),
    ...(c.phone !== undefined && { opposingCounselPhone: encryptField(c.phone) }),
    ...(c.fax !== undefined && { opposingCounselFax: encryptField(c.fax) }),
    ...(c.email !== undefined && { opposingCounselEmail: encryptField(c.email) }),
    ...(c.contactMethod !== undefined && { opposingCounselContactMethod: c.contactMethod }),
  };
}
