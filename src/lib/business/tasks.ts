interface MinimalTask {
  assignee: string;
  assignedBy: string;
  status: string;
}

/**
 * Mirrors the prototype's finishTask(): if the task was assigned BY someone
 * (i.e. it's a delegated instruction), it bounces back to the assigner as a
 * pending-review item instead of completing outright.
 */
export function computeFinishTask(task: MinimalTask) {
  if (task.assignedBy.trim()) {
    return {
      assignee: task.assignedBy,
      handedBackFrom: task.assignee,
      status: "対応中",
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
