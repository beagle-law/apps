import type { Prisma } from "@prisma/client";

export const caseInclude = {
  hearings: { orderBy: { date: "asc" } },
  tasks: { orderBy: { createdAt: "asc" } },
  questions: { orderBy: { createdAt: "desc" } },
  documents: true,
  updates: { orderBy: { timestamp: "desc" } },
} satisfies Prisma.CaseInclude;

export type FullCase = Prisma.CaseGetPayload<{ include: typeof caseInclude }>;

export function serializeCase(c: FullCase) {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    deadline: c.deadline ?? "",
    tasks: c.tasks.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
    questions: c.questions.map((q) => ({ ...q, createdAt: q.createdAt.toISOString() })),
    updates: c.updates.map((u) => ({ ...u, timestamp: u.timestamp.toISOString() })),
  };
}
