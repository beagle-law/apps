import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessGoalKey } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const records = await prisma.goalRecord.findMany({
    include: { items: true },
    orderBy: [{ yearMonth: "desc" }],
  });
  return NextResponse.json(records.filter((r) => canAccessGoalKey(user, r.key)));
}
