interface MinimalTask {
  assignee: string;
  assignedBy: string;
  status: string;
}

/**
 * Mirrors the prototype's finishTask(): if the task was assigned BY someone
 * (i.e. it's a delegated instruction), it bounces back to the assigner as a
 * pending-review item instead of completing outright.
 * v7：ステータスは「未着手／完了」の2値のみ（対応中は廃止）。
 */
export function computeFinishTask(task: MinimalTask) {
  if (task.assignedBy.trim()) {
    return {
      assignee: task.assignedBy,
      handedBackFrom: task.assignee,
      status: "未着手",
    };
  }
  return {
    status: "完了",
    handedBackFrom: "",
    completedAt: new Date().toISOString(),
  };
}

export function computeScoreTaskExecution(score: number) {
  return {
    executionScore: score,
    status: "完了",
    completedAt: new Date().toISOString(),
  };
}

export interface CompleteReportTaskInput {
  description: string;
  assignee: string;
  assignedBy: string;
  dueDate: string;
  points: number | null;
}

export interface CompleteReportDraft {
  description?: string;
  assignee: string; // 「タスク編集/終了報告」モーダルで選ばれている現在の担当者
  dueDate?: string;
  points?: number | null;
}

/**
 * 「タスク編集/終了報告」モーダルの「終了報告」ボタン（v7 3.2）：
 * モーダル内の編集内容を保存しつつ、依頼者がいれば差し戻し（未着手・handedBackFrom設定）、
 * いなければ完了にする。差し戻し先の個人タスク画面への遷移先も返す。
 */
export function computeCompleteReport(task: CompleteReportTaskInput, draft: CompleteReportDraft) {
  const returnTo = task.assignedBy.trim() || null;
  const currentAssignee = draft.assignee;
  const fields = {
    description: draft.description?.trim() || task.description,
    dueDate: draft.dueDate !== undefined ? draft.dueDate : task.dueDate,
    points: draft.points !== undefined ? draft.points : task.points,
    assignee: returnTo || currentAssignee,
    status: returnTo ? "未着手" : "完了",
    handedBackFrom: returnTo ? currentAssignee : "",
    completedAt: returnTo ? "" : new Date().toISOString(),
  };
  return { fields, redirectToPerson: returnTo };
}
