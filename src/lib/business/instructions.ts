export function buildInstructionTaskAndNote(params: {
  assignee: string;
  content: string;
  dueDate: string;
  points: number | null;
  issuerDisplayName: string;
}) {
  const { assignee, content, dueDate, points, issuerDisplayName } = params;
  return {
    task: {
      description: content.trim(),
      assignee,
      assignedBy: issuerDisplayName,
      status: "未着手",
      dueDate: dueDate || "",
      kind: "task",
      waitingOn: "",
      isInstruction: true,
      points: points ?? null,
    },
    note: {
      author: issuerDisplayName,
      note: `${assignee}へ指示：${content.trim()}`,
      auto: true,
    },
  };
}
