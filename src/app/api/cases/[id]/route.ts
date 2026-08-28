import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";
import { ENGAGEMENT_FIELD_LABEL } from "@/lib/constants";

type EngagementField = "poaStatus" | "contractStatus" | "retainerStatus";

interface PatchCaseBody {
  stage?: string;
  priority?: string;
  ballOwner?: string;
  ballAssignee?: string;
  hidden?: boolean;
  deadline?: string;
  courtCaseNumber?: string;
  courtClerk?: { name?: string; affiliation?: string; phone?: string; fax?: string; email?: string };
  poaStatus?: string;
  contractStatus?: string;
  retainerStatus?: string;
  isTimeChargeCase?: boolean;
  timeChargeRate?: number | null;
  autoNote?: string;
  author?: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const c = await getAccessibleCaseOrNull(id, user.id);
  if (!c) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  return NextResponse.json(serializeCase(c));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as PatchCaseBody;

  const data: Prisma.CaseUpdateInput = {};
  if (body.stage !== undefined) data.stage = body.stage;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.ballOwner !== undefined) {
    data.ballOwner = body.ballOwner;
    if (body.ballOwner !== "事務所") data.ballAssignee = "";
  }
  if (body.ballAssignee !== undefined) data.ballAssignee = body.ballAssignee;
  if (body.hidden !== undefined) data.hidden = body.hidden;
  if (body.deadline !== undefined) data.deadline = body.deadline;
  if (body.isTimeChargeCase !== undefined) data.isTimeChargeCase = body.isTimeChargeCase;
  if (body.timeChargeRate !== undefined) data.timeChargeRate = body.timeChargeRate;
  if (body.courtCaseNumber !== undefined) data.courtCaseNumber = body.courtCaseNumber;
  if (body.courtClerk) {
    const cc = body.courtClerk;
    if (cc.name !== undefined) data.courtClerkName = cc.name;
    if (cc.affiliation !== undefined) data.courtClerkAffiliation = cc.affiliation;
    if (cc.phone !== undefined) data.courtClerkPhone = cc.phone;
    if (cc.fax !== undefined) data.courtClerkFax = cc.fax;
    if (cc.email !== undefined) data.courtClerkEmail = cc.email;
  }

  if (body.autoNote?.trim()) {
    data.updates = {
      create: [{ author: body.author?.trim() || user.displayName, note: body.autoNote.trim(), auto: true }],
    };
  }

  // 受任関連チェックのステータス変更（v8：タスク自動生成の連動は廃止、ステータス管理のみ）
  const engagementFields: EngagementField[] = ["poaStatus", "contractStatus", "retainerStatus"];
  const engagementUpdates = engagementFields.filter((f) => body[f] !== undefined && body[f] !== existing[f]);

  await prisma.$transaction(async (tx) => {
    for (const field of engagementUpdates) {
      const status = body[field]!;
      await tx.updateLog.create({
        data: {
          caseId: id,
          author: user.displayName,
          note: `${ENGAGEMENT_FIELD_LABEL[field]}を「${status}」に更新`,
          auto: true,
        },
      });
    }
    if (engagementUpdates.length) {
      const engagementData: Prisma.CaseUpdateInput = {};
      for (const field of engagementUpdates) engagementData[field] = body[field]!;
      await tx.case.update({ where: { id }, data: engagementData });
    }
    if (Object.keys(data).length) {
      await tx.case.update({ where: { id }, data });
    }
  });

  const updated = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  return NextResponse.json(serializeCase(updated!));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  await prisma.case.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
