import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/case-access";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  await prisma.case.updateMany({
    where: { AND: [{ hidden: true }, caseVisibilityFilter(user.id)] },
    data: { hidden: false },
  });

  return NextResponse.json({ ok: true });
}
