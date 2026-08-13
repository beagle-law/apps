import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { ensurePrivateMemoCase } from "@/lib/case-access";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const memoCase = await ensurePrivateMemoCase(user.id, user.displayName);
  const full = await prisma.case.findUnique({ where: { id: memoCase.id }, include: caseInclude });
  return NextResponse.json(serializeCase(full!));
}
