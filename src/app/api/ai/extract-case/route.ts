import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseVisibilityFilter } from "@/lib/case-access";
import { decryptField } from "@/lib/crypto";
import { getAnthropicClient, AI_MODEL, AI_UNAVAILABLE_MESSAGE, extractText, parseJsonResponse } from "@/lib/ai/anthropic";
import { STAGES, PRIORITIES, BALL_OWNERS } from "@/lib/constants";
import { todayStr } from "@/lib/dates";

interface ExtractResult {
  matchedCaseNumber: string;
  expense: { date: string; category: string; amount: number; origin: string; destination: string; route: string; notes: string };
  title: string;
  clientName: string;
  stage: string;
  priority: string;
  teamMembers: string[];
  deadline: string;
  ballOwner: string;
  summary: string;
  tasks: { description: string; assignee: string; dueDate: string }[];
}

const SYSTEM_TEMPLATE = (caseListText: string) => `あなたは法律事務所の案件管理アシスタントです。ユーザーが自由文で入力した内容を解析し、以下のいずれかに分類してください。

1. 既存案件についての実費報告（交通費・印紙代・郵送費・謄写費用・通信費等の費用報告）
2. 新規の案件相談・受任情報（新しい依頼者・案件の情報）

現在登録されている案件一覧：
${caseListText || "（登録されている案件はありません）"}

判定ルール：
- 入力内容が既存案件の実費報告だと判断した場合、案件一覧の中から該当する案件を案件番号で特定し、matchedCaseNumberに設定してください。一意に特定できない場合はmatchedCaseNumberを空文字にしてください。
- 実費報告でない場合、matchedCaseNumberは空文字にし、expense.categoryも空文字にしてください。
- 日付は今日（${todayStr()}）を基準に、相対的な表現（「来週」等）もYYYY-MM-DD形式に変換してください。
- stageは次のいずれかから選んでください：${STAGES.join("、")}
- priorityは次のいずれかから選んでください：${PRIORITIES.join("、")}
- ballOwnerは次のいずれかから選んでください：${BALL_OWNERS.join("、")}

出力は次のJSON形式のみを、コードブロックなしで返してください：
{"matchedCaseNumber":"","expense":{"date":"","category":"","amount":0,"origin":"","destination":"","route":"","notes":""},"title":"","clientName":"","stage":"","priority":"","teamMembers":[],"deadline":"","ballOwner":"","summary":"","tasks":[{"description":"","assignee":"","dueDate":""}]}`;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const client = getAnthropicClient();
  if (!client) return NextResponse.json({ error: AI_UNAVAILABLE_MESSAGE }, { status: 503 });

  const body = (await req.json()) as { text?: string };
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "入力内容が空です" }, { status: 400 });
  }

  const cases = await prisma.case.findMany({
    where: caseVisibilityFilter(user.id),
    select: { caseNumber: true, title: true, clientName: true },
  });
  const caseListText = cases
    .map((c) => `・No.${c.caseNumber}｜${c.title}｜依頼者：${decryptField(c.clientName)}`)
    .join("\n");

  try {
    const msg = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1200,
      system: SYSTEM_TEMPLATE(caseListText),
      messages: [{ role: "user", content: body.text.trim() }],
    });
    const parsed = parseJsonResponse<ExtractResult>(extractText(msg));

    if (!STAGES.includes(parsed.stage as (typeof STAGES)[number])) parsed.stage = STAGES[0];
    if (!PRIORITIES.includes(parsed.priority)) parsed.priority = "通常";
    if (!BALL_OWNERS.includes(parsed.ballOwner)) parsed.ballOwner = "事務所";

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("AI extract-case failed", e);
    return NextResponse.json(
      { error: "AIによる解析に失敗しました。お手数ですがフォームに手入力してください。" },
      { status: 502 }
    );
  }
}
