import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAnthropicClient, AI_MODEL, AI_UNAVAILABLE_MESSAGE, extractText } from "@/lib/ai/anthropic";
import { formatDate, todayStr } from "@/lib/dates";

const SYSTEM_PROMPT = `あなたは法律事務所のスタッフです。依頼者へ送る、丁寧で分かりやすい進捗報告メールの本文を作成してください。前置きや説明・コードブロックは不要で、そのまま送信できるメール本文のみを出力してください。`;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const client = getAnthropicClient();
  if (!client) return NextResponse.json({ error: AI_UNAVAILABLE_MESSAGE }, { status: 503 });

  const body = (await req.json()) as {
    clientName?: string;
    title?: string;
    reportDate?: string;
    content?: string;
    docDeadline?: string;
    nextHearingDate?: string;
  };
  if (!body.clientName?.trim() || !body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: "依頼者名・案件名・内容は必須です" }, { status: 400 });
  }

  const userContent = `依頼者名：${body.clientName.trim()}
案件名：${body.title.trim()}
報告日：${formatDate(body.reportDate || todayStr())}
内容：${body.content.trim()}
書面提出期限：${body.docDeadline ? formatDate(body.docDeadline) : "未定"}
次回裁判期日：${body.nextHearingDate ? formatDate(body.nextHearingDate) : "未定"}`;

  try {
    const msg = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
    return NextResponse.json({ text: extractText(msg) });
  } catch (e) {
    console.error("AI client-report failed", e);
    return NextResponse.json({ error: "報告文の作成に失敗しました。手入力してください。" }, { status: 502 });
  }
}
