import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase, type FullCase } from "@/lib/case-query";
import { caseVisibilityFilter } from "@/lib/case-access";
import { suggestedCaseNumber } from "@/lib/business/caseNumber";
import { encryptField } from "@/lib/crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  // v33：一覧の取得量を減らすため、個人メモ以外の案件は「主張予定メモ」「経過記録」（容量が大きい）を省く。
  // これらは案件を開いたときに /api/cases/[id] で読み込む（detailLoaded=false の間は画面側で読み込み中の表示）。
  // 個人メモは、スマホで最初に表示するため、全文を含める。
  const { claimMemos: _memos, updates: _updates, ...slimInclude } = caseInclude;
  void _memos;
  void _updates;
  const visible = caseVisibilityFilter(user.id);
  const [normal, privateCases] = await Promise.all([
    prisma.case.findMany({ where: { AND: [visible, { isPrivate: false }] }, include: slimInclude }),
    prisma.case.findMany({ where: { AND: [visible, { isPrivate: true }] }, include: caseInclude }),
  ]);
  const slim = normal.map((c) => ({ ...serializeCase({ ...c, claimMemos: [], updates: [] } as FullCase), detailLoaded: false }));
  const full = privateCases.map(serializeCase);
  const all = [...slim, ...full].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return NextResponse.json(all);
}

interface CreateCaseBody {
  caseNumber?: string;
  title: string;
  clientName: string;
  clientId?: string;
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

  const created = await prisma.case.create({
    data: {
      caseNumber,
      title: body.title.trim(),
      clientName: encryptField(body.clientName.trim()),
      clientId: body.clientId || null,
      stage: "受任前",
      priority: body.priority || "通常",
      deadline: body.deadline || "",
      ballOwner: "事務所",
      isTimeChargeCase: !!body.isTimeChargeCase,
      updates: body.initialNote?.trim()
        ? { create: [{ author: body.author?.trim() || user.displayName, note: body.initialNote.trim(), auto: false }] }
        : undefined,
    },
    include: caseInclude,
  });

  return NextResponse.json(serializeCase(created), { status: 201 });
}
