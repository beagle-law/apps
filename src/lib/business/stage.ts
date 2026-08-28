// ステータス自動遷移ロジック（v10 3.1）
// 受任日（engagementDate）を入力すると「受任前」→「受任・対応中」に、
// 終結日（closedDate）を入力すると「終結」に自動的に切り替わる。
// 既に「終結」の案件は、受任日の編集で巻き戻ることはない。

export interface StageAutoInput {
  stage: string;
  engagementDate: string;
}

export interface StagePatch {
  engagementDate?: string;
  closedDate?: string;
}

export function computeAutoStage(current: StageAutoInput, patch: StagePatch): string | undefined {
  if (patch.closedDate !== undefined && patch.closedDate.trim() !== "") {
    return "終結";
  }
  if (patch.engagementDate !== undefined && patch.engagementDate.trim() !== "" && current.stage === "受任前") {
    return "受任・対応中";
  }
  return undefined;
}
