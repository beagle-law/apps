import { prisma } from "@/lib/prisma";
import { normalizeTimeInput } from "@/lib/business/timecharge";

// v26：同じユーザーのタイムチャージは、案件が同じでも別でも時間帯の重複を許さない。

const DAY = 24 * 60;

function toMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(normalizeTimeInput(time));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function dayNumber(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000);
}

/** 日付＋開始・終了時刻を、基準日からの絶対分に直す（終了が開始より前なら日をまたぐ扱い）。 */
function absoluteRange(date: string, startTime: string, endTime: string): { start: number; end: number } | null {
  const d = dayNumber(date);
  const s = toMinutes(startTime);
  const e = toMinutes(endTime);
  if (d === null || s === null || e === null) return null;
  const start = d * DAY + s;
  const end = d * DAY + e + (e <= s ? DAY : 0);
  return start === end ? null : { start, end };
}

/**
 * 同じ人の既存タイムチャージと時間帯が重なるものを探す。重なりがなければnull。
 * 開始・終了時刻が入っていない過去データ（時間のみ登録）は比較できないため対象外。
 * 境界が接するだけ（10:00〜11:00と11:00〜12:00）は重複としない。
 */
export async function findTimeChargeOverlap(params: {
  personName: string;
  date: string;
  startTime: string;
  endTime: string;
  excludeId?: string;
}): Promise<string | null> {
  const mine = absoluteRange(params.date, params.startTime, params.endTime);
  if (!mine) return null;

  const d = dayNumber(params.date)!;
  const around = [-1, 0, 1].map((delta) => new Date((d + delta) * 86400000).toISOString().slice(0, 10));
  const others = await prisma.timeCharge.findMany({
    where: {
      personName: params.personName,
      date: { in: around },
      startTime: { not: "" },
      endTime: { not: "" },
      ...(params.excludeId && { id: { not: params.excludeId } }),
    },
    include: { case: { select: { caseNumber: true, title: true } } },
  });

  for (const o of others) {
    const theirs = absoluteRange(o.date, o.startTime, o.endTime);
    if (theirs && mine.start < theirs.end && theirs.start < mine.end) {
      const md = o.date.slice(5).replace("-", "/").replace(/^0/, "").replace("/0", "/");
      return `同じ時間帯に登録済みのタイムチャージがあります（${md} ${o.startTime}〜${o.endTime}　No.${o.case.caseNumber} ${o.case.title}）。時間が重複しないように入力してください。`;
    }
  }
  return null;
}
