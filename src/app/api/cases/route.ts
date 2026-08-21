import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { caseVisibilityFilter } from "@/lib/case-access";
import { computeEngagementTaskChange } from "@/lib/business/engagement";
import { suggestedCaseNumber } from "@/lib/business/caseNumber";
import { recomputeClientNumberFromLinkedCases } from "@/lib/business/recompute-client-number";
import { encryptField } from "@/lib/crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const cases = await prisma.case.findMany({
    where: caseVisibilityFilter(user.id),
    include: caseInclude,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(cases.map(serializeCase));
}

interface CreateCaseBody {
  caseNumber?: string;
  title: string;
  clientName: string;
  clientId?: string;
  teamMember?: string;
  deadline?: string;
  priority?: string;
  initialNote?: string;
  author?: string;
  isTimeChargeCase?: boolean;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = (await req.json()) as CreateCaseBody;
  if (!body.title?.trim() || !body.clientName?.trim()) {
    return NextResponse.json({ error: "案件名と依頼者名は必須です" }, { status: 400 });
  }

  let caseNumber = body.caseNumber?.trim();
  if (!caseNumber) {
    const existing = await prisma.case.findMany({ select: { caseNumber: true } });
    caseNumber = suggestedCaseNumber(existing.map((c) => c.caseNumber));
  }

  const teamMembers = body.teamMember?.trim() ? [body.teamMember.trim()] : [];

  // 受任関連チェックの初期状態（すべて「対応不要」）から、対応タスクを自動生成する
  const initialTaskCreates: {
    description: string;
    kind: string;
    waitingOn: string;
    assignee: string;
    sourceField: string;
    status: string;
  }[] = [];
  for (const field of ["poaStatus", "contractStatus", "retainerStatus"] as const) {
    const action = computeEngagementTaskChange([], teamMembers, field, "対応不要");
    if (action.type === "create") {
      initialTaskCreates.push({ ...action.data, status: "未着手" });
    }
  }

  const created = await prisma.case.create({
    data: {
      caseNumber,
      title: body.title.trim(),
      clientName: encryptField(body.clientName.trim()),
      clientId: body.clientId || null,
      stage: "新規問合せ・紹介",
      priority: body.priority || "通常",
      deadline: body.deadline || "",
      ballOwner: "事務所",
      teamMembers,
      isTimeChargeCase: !!body.isTimeChargeCase,
      tasks: initialTaskCreates.length ? { create: initialTaskCreates } : undefined,
      updates: body.initialNote?.trim()
        ? { create: [{ author: body.author?.trim() || user.displayName, note: body.initialNote.trim(), auto: false }] }
        : undefined,
    },
    include: caseInclude,
  });

  if (created.clientId) {
    await recomputeClientNumberFromLinkedCases(prisma, created.clientId);
  }

  return NextResponse.json(serializeCase(created), { status: 201 });
}
