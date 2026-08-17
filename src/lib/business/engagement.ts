import { ENGAGEMENT_TASK_META } from "@/lib/constants";

export type EngagementField = "poaStatus" | "contractStatus" | "retainerStatus";

interface MinimalTask {
  id: string;
  sourceField: string | null;
}

export type EngagementTaskAction =
  | { type: "none" }
  | { type: "delete"; taskId: string }
  | { type: "update"; taskId: string; data: { kind: string; waitingOn: string; description: string } }
  | { type: "create"; data: { description: string; kind: string; waitingOn: string; assignee: string; sourceField: EngagementField } };

/**
 * Mirrors the prototype's syncEngagementTask(): a given 受任関連チェック
 * status implies at most one linked task per field (tracked via
 * task.sourceField). Ported faithfully from the v3 prototype spec:
 *   対応不要 / 未対応  -> ordinary task
 *   発送済 / 請求済    -> waiting-on-client task
 *   受領済 / 締結済    -> no task needed (checklist satisfied)
 */
export function computeEngagementTaskChange(
  existingTasks: MinimalTask[],
  teamMembers: string[],
  field: EngagementField,
  status: string
): EngagementTaskAction {
  const meta = ENGAGEMENT_TASK_META[field];
  const existing = existingTasks.find((t) => t.sourceField === field);

  let desired: { kind: string; waitingOn: string; description: string } | null = null;
  if (status === "対応不要" || status === "未対応") {
    desired = { kind: "task", waitingOn: "", description: meta.taskDesc };
  } else if (status === "発送済" || status === "請求済") {
    desired = { kind: "waiting", waitingOn: "顧客", description: meta.waitDesc };
  }
  // "受領済" / "締結済" -> desired stays null

  if (desired === null) {
    return existing ? { type: "delete", taskId: existing.id } : { type: "none" };
  }
  if (existing) {
    return { type: "update", taskId: existing.id, data: desired };
  }
  return {
    type: "create",
    data: { ...desired, assignee: teamMembers[0] || "", sourceField: field },
  };
}
