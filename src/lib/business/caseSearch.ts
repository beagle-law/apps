import type { Case } from "@/lib/types";

/** 事件番号の表記ゆれ（全角半角・括弧・「第」「号」「年」・空白）をそろえる。「令和8年（ワ）第2139号」と「令和8年ワ2139号」「2139」を同じ扱いにする */
const normalizeCourtNumber = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s()第号年]/g, "");

const normalizeText = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s/g, "");

/** 案件一覧の検索：案件名・顧客名・案件番号に加えて、裁判所の事件番号と書記官（氏名・係属部）でも探せる */
export const caseMatchesQuery = (c: Case, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (c.title.toLowerCase().includes(q) || c.clientName.toLowerCase().includes(q) || c.caseNumber.toLowerCase().includes(q)) return true;
  const courtQ = normalizeCourtNumber(query);
  if (courtQ && normalizeCourtNumber(c.courtCaseNumber ?? "").includes(courtQ)) return true;
  const textQ = normalizeText(query);
  return !!textQ && (normalizeText(c.courtClerk?.name ?? "").includes(textQ) || normalizeText(c.courtClerk?.affiliation ?? "").includes(textQ));
};
