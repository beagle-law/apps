import type { Prisma } from "@prisma/client";
import { decryptField, encryptField } from "@/lib/crypto";

export const caseInclude = {
  hearings: { orderBy: { date: "asc" } },
  tasks: { orderBy: { createdAt: "asc" } },
  expenses: { orderBy: { date: "asc" } },
  questions: { orderBy: { createdAt: "desc" } },
  documents: true,
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
    opposingCounsel: {
      name: decryptField(c.opposingCounselContactName),
      affiliation: decryptField(c.opposingCounselContactAffiliation),
      phone: decryptField(c.opposingCounselContactPhone),
      fax: decryptField(c.opposingCounselContactFax),
      email: decryptField(c.opposingCounselContactEmail),
    },
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
    opposingCounselName: decryptField(c.opposingCounselName),
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
    questions: c.questions.map((q) => ({ ...q, createdAt: q.createdAt.toISOString() })),
    documents: c.documents,
    updates: c.updates.map((u) => ({ ...u, timestamp: u.timestamp.toISOString() })),
  };
}

/** Fields on Case that are stored encrypted — used by write paths to encrypt before persisting. */
export interface ContactInput {
  name?: string;
  affiliation?: string;
  phone?: string;
  fax?: string;
  email?: string;
}

export function encryptOpposingCounselContact(c: ContactInput) {
  return {
    ...(c.name !== undefined && { opposingCounselContactName: encryptField(c.name) }),
    ...(c.affiliation !== undefined && { opposingCounselContactAffiliation: encryptField(c.affiliation) }),
    ...(c.phone !== undefined && { opposingCounselContactPhone: encryptField(c.phone) }),
    ...(c.fax !== undefined && { opposingCounselContactFax: encryptField(c.fax) }),
    ...(c.email !== undefined && { opposingCounselContactEmail: encryptField(c.email) }),
  };
}
