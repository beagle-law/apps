import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAnthropicClient, AI_MODEL, AI_UNAVAILABLE_MESSAGE, extractText, parseJsonResponse } from "@/lib/ai/anthropic";

interface RouteResult {
  route: string;
  fare: number;
  duration_minutes: number;
}

const SYSTEM_PROMPT = `あなたは日本の公共交通機関に詳しい経路案内アシスタントです。出発地と到着地を受け取り、一般的な公共交通機関（電車・バス等）を利用した場合の標準的な経路、片道の大人運賃（円）、およその所要時間（分）を、Web検索を使って調べてください。
出力は次のJSON形式のみを、コードブロックなしで返してください：
{"route": "経路の説明", "fare": 0, "duration_minutes": 0}`;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const client = getAnthropicClient();
  if (!client) return NextResponse.json({ error: AI_UNAVAILABLE_MESSAGE }, { status: 503 });

  const body = (await req.json()) as { origin?: string; destination?: string };
  if (!body.origin?.trim() || !body.destination?.trim()) {
    return NextResponse.json({ error: "出発地と到着地は必須です" }, { status: 400 });
  }

  try {
    const msg = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: `出発地: ${body.origin.trim()}\n到着地: ${body.destination.trim()}` }],
    });
    const parsed = parseJsonResponse<RouteResult>(extractText(msg));
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("AI calculate-route failed", e);
    return NextResponse.json({ error: "経路の自動計算に失敗しました。手入力してください。" }, { status: 502 });
  }
}
