import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { getAccessibleCaseOrNull } from "@/lib/case-access";
import { encryptField } from "@/lib/crypto";

interface FinanceBody {
  caseClassification?: string;
  opposingParty?: string;
  opposingCounselName?: string;
  engagementDate?: string;
  litigationEngagementDate?: string;
  noticeSentDate?: string;
  filingDate?: string;
  claimAmount?: number | "" | null;
  retainerFee?: number | "" | null;
  expectedFee?: number | "" | null;
  expectedFeeDate?: string;
}

function toNullableInt(v: number | "" | null | undefined): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === "" || v === null) return null;
  return Math.round(Number(v));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { id } = await params;
  const existing = await getAccessibleCaseOrNull(id, user.id);
  if (!existing) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });

  const body = (await req.json()) as FinanceBody;
  const data: Prisma.CaseUpdateInput = {};
  if (body.caseClassification !== undefined) data.caseClassification = body.caseClassification;
  if (body.opposingParty !== undefined) data.opposingParty = encryptField(body.opposingParty);
  if (body.opposingCounselName !== undefined) data.opposingCounselName = encryptField(body.opposingCounselName);
  if (body.engagementDate !== undefined) data.engagementDate = body.engagementDate;
  if (body.litigationEngagementDate !== undefined) data.litigationEngagementDate = body.litigationEngagementDate;
  if (body.noticeSentDate !== undefined) data.noticeSentDate = body.noticeSentDate;
  if (body.filingDate !== undefined) data.filingDate = body.filingDate;
  const claimAmount = toNullableInt(body.claimAmount);
  if (claimAmount !== undefined) data.claimAmount = claimAmount;
  const retainerFee = toNullableInt(body.retainerFee);
  if (retainerFee !== undefined) data.retainerFee = retainerFee;
  const expectedFee = toNullableInt(body.expectedFee);
  if (expectedFee !== undefined) data.expectedFee = expectedFee;
  if (body.expectedFeeDate !== undefined) data.expectedFeeDate = body.expectedFeeDate;

  const updated = await prisma.case.update({ where: { id }, data, include: caseInclude });
  return NextResponse.json(serializeCase(updated));
}
