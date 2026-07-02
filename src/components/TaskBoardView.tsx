"use client";

import { User, Calendar } from "lucide-react";
import { COLORS, FONT_MINCHO, TASK_STATUSES, cycleColor, cycleValue } from "@/lib/constants";
import { formatDateShort, todayStr } from "@/lib/dates";
import type { Case } from "@/lib/types";
import * as api from "@/lib/api-client";

interface FlatTask {
  id: string;
  description: string;
  assignee: string;
  status: string;
  dueDate: string;
  case: Case;
}

interface Props {
  cases: Case[];
  onOpenCase: (id: string) => void;
  onCaseUpdated: (c: Case) => void;
  onError: (msg: string) => void;
}

export default function TaskBoardView({ cases, onOpenCase, onCaseUpdated, onError }: Props) {
  const openTasks: FlatTask[] = cases.flatMap((c) =>
    (c.tasks || []).filter((t) => t.status !== "完了").map((t) => ({ ...t, case: c }))
  );
  const groups: Record<string, FlatTask[]> = {};
  openTasks.forEach((t) => {
    const key = t.assignee && t.assignee.trim() ? t.assignee : "未割当";
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  Object.values(groups).forEach((list) =>
    list.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return 0;
    })
  );
  const entries = Object.entries(groups).sort((a, b) => {
    if (a[0] === "未割当") return 1;
    if (b[0] === "未割当") return -1;
    return b[1].length - a[1].length;
  });

  const cycleStatus = async (t: FlatTask) => {
    try {
      const updated = await api.patchTaskStatus(t.case.id, t.id, cycleValue(TASK_STATUSES, t.status));
      onCaseUpdated(updated);
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg mb-1" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy }}>
          担当者別タスク
        </h2>
        <p className="text-xs mb-5" style={{ color: COLORS.slate }}>
          未完了のタスクを担当者ごとに表示しています（完了済みは各案件内でのみ確認できます）
        </p>
        {entries.length === 0 ? (
          <p className="text-sm py-10 text-center rounded" style={{ color: COLORS.slate, backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
            未完了のタスクはありません。
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {entries.map(([assignee, tasks]) => (
              <div key={assignee} className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
                <h3
                  className="text-sm font-bold mb-3 flex items-center gap-1.5"
                  style={{ fontFamily: FONT_MINCHO, color: assignee === "未割当" ? COLORS.slate : COLORS.navy }}
                >
                  <User size={15} /> {assignee}{" "}
                  <span className="text-xs font-normal" style={{ color: COLORS.slate }}>
                    （{tasks.length}件）
                  </span>
                </h3>
                <div className="flex flex-col gap-2">
                  {tasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onOpenCase(t.case.id)}
                      className="w-full text-left flex items-center justify-between gap-2 text-sm p-2.5 rounded transition hover:opacity-90"
                      style={{ backgroundColor: COLORS.paper }}
                    >
                      <div className="flex-1">
                        <p>{t.description}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className="text-xs" style={{ color: COLORS.slate }}>
                            {t.case.title}（No. {t.case.caseNumber}）
                          </span>
                          {t.dueDate && (
                            <span className="text-xs flex items-center gap-1" style={{ color: t.dueDate < todayStr() ? COLORS.vermillion : COLORS.slate }}>
                              <Calendar size={11} /> {formatDateShort(t.dueDate)}まで
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          cycleStatus(t);
                        }}
                        className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                        style={{ color: "#fff", backgroundColor: cycleColor(TASK_STATUSES, t.status) }}
                      >
                        {t.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
