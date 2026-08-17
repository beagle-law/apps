import type { Prisma } from "@prisma/client";
import { decryptField, encryptField } from "@/lib/crypto";

export const caseInclude = {
  hearings: { orderBy: { date: "asc" } },
  tasks: { orderBy: { createdAt: "asc" } },
  expenses: { orderBy: { date: "asc" } },
  updates: { orderBy: { timestamp: "desc" } },
} satisfies Prisma.CaseInclude;

export type FullCase = Prisma.CaseGetPayload<{ include: typeof caseInclude }>;

export function serializeCase(c: FullCase) {
  return {
    id: c.id,
    caseNumber: c.caseNumber,
    title: c.title,
    clientName: decryptField(c.clientName),
    clientId: c.clientId ?? "",
    stage: c.stage,
    priority: c.priority,
    ballOwner: c.ballOwner,
    ballAssignee: c.ballAssignee,
    hidden: c.hidden,
    teamMembers: c.teamMembers,
    deadline: c.deadline,
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
    tasks: c.tasks.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
    expenses: c.expenses.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
    updates: c.updates.map((u) => ({ ...u, timestamp: u.timestamp.toISOString() })),
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
