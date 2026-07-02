import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { caseInclude, serializeCase } from "@/lib/case-query";

export async function GET() {
  const cases = await prisma.case.findMany({
    include: caseInclude,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(cases.map(serializeCase));
}

interface CreateCaseBody {
  caseNumber?: string;
  title: string;
  clientName: string;
  caseCategory: string;
  teamMember?: string;
  deadline?: string;
  priority?: string;
  initialNote?: string;
  author?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateCaseBody;

  if (!body.title?.trim() || !body.clientName?.trim()) {
    return NextResponse.json({ error: "案件名と依頼者名は必須です" }, { status: 400 });
  }

  let caseNumber = body.caseNumber?.trim();
  if (!caseNumber) {
    const year = new Date().getFullYear();
    const count = await prisma.case.count();
    caseNumber = `${year}-${String(count + 1).padStart(3, "0")}`;
  }

  const created = await prisma.case.create({
    data: {
      caseNumber,
      title: body.title.trim(),
      clientName: body.clientName.trim(),
      caseCategory: body.caseCategory || "非訟事件",
      stage: "新規問合せ・紹介",
      priority: body.priority || "通常",
      deadline: body.deadline || "",
      ballOwner: "事務所",
      teamMembers: body.teamMember?.trim() ? [body.teamMember.trim()] : [],
      updates: body.initialNote?.trim()
        ? {
            create: [
              {
                author: body.author?.trim() || "匿名",
                note: body.initialNote.trim(),
                auto: false,
              },
            ],
          }
        : undefined,
    },
    include: caseInclude,
  });

  return NextResponse.json(serializeCase(created), { status: 201 });
}
