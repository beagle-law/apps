import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { caseInclude, serializeCase } from "@/lib/case-query";

interface Contact {
  name?: string;
  affiliation?: string;
  phone?: string;
  email?: string;
}

interface PatchCaseBody {
  stage?: string;
  caseCategory?: string;
  responseTypes?: string[];
  priority?: string;
  ballOwner?: string;
  teamMembers?: string[];
  deadline?: string;
  courtCaseNumber?: string;
  opposingCounsel?: Contact;
  courtClerk?: Contact;
  poaStatus?: string;
  contractStatus?: string;
  retainerStatus?: string;
  autoNote?: string;
  author?: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.case.findUnique({ where: { id }, include: caseInclude });
  if (!c) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  return NextResponse.json(serializeCase(c));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as PatchCaseBody;

  const data: Prisma.CaseUpdateInput = {};
  if (body.stage !== undefined) data.stage = body.stage;
  if (body.caseCategory !== undefined) data.caseCategory = body.caseCategory;
  if (body.responseTypes !== undefined) data.responseTypes = body.responseTypes;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.ballOwner !== undefined) data.ballOwner = body.ballOwner;
  if (body.teamMembers !== undefined) data.teamMembers = body.teamMembers;
  if (body.deadline !== undefined) data.deadline = body.deadline;
  if (body.courtCaseNumber !== undefined) data.courtCaseNumber = body.courtCaseNumber;
  if (body.poaStatus !== undefined) data.poaStatus = body.poaStatus;
  if (body.contractStatus !== undefined) data.contractStatus = body.contractStatus;
  if (body.retainerStatus !== undefined) data.retainerStatus = body.retainerStatus;
  if (body.opposingCounsel) {
    if (body.opposingCounsel.name !== undefined) data.opposingCounselName = body.opposingCounsel.name;
    if (body.opposingCounsel.affiliation !== undefined)
      data.opposingCounselAffiliation = body.opposingCounsel.affiliation;
    if (body.opposingCounsel.phone !== undefined) data.opposingCounselPhone = body.opposingCounsel.phone;
    if (body.opposingCounsel.email !== undefined) data.opposingCounselEmail = body.opposingCounsel.email;
  }
  if (body.courtClerk) {
    if (body.courtClerk.name !== undefined) data.courtClerkName = body.courtClerk.name;
    if (body.courtClerk.affiliation !== undefined) data.courtClerkAffiliation = body.courtClerk.affiliation;
    if (body.courtClerk.phone !== undefined) data.courtClerkPhone = body.courtClerk.phone;
    if (body.courtClerk.email !== undefined) data.courtClerkEmail = body.courtClerk.email;
  }

  if (body.autoNote?.trim()) {
    data.updates = {
      create: [{ author: body.author?.trim() || "システム", note: body.autoNote.trim(), auto: true }],
    };
  }

  const updated = await prisma.case.update({ where: { id }, data, include: caseInclude });
  return NextResponse.json(serializeCase(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.case.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
