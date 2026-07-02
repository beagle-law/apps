"use client";

import { useEffect, useState } from "react";
import {
  X,
  Trash2,
  User,
  Calendar,
  Users,
  Landmark,
  Phone,
  Mail,
  ClipboardList,
  HelpCircle,
  ListChecks,
  MapPin,
  Link2,
  Send,
} from "lucide-react";
import {
  COLORS,
  FONT_MINCHO,
  CASE_CATEGORIES,
  STAGES,
  RESPONSE_TYPES,
  BALL_OWNERS,
  BALL_COLOR,
  STAGE_COLOR,
  POA_STATUSES,
  CONTRACT_STATUSES,
  RETAINER_STATUSES,
  QUESTION_STATUSES,
  DOC_STATUSES,
  TASK_STATUSES,
  cycleValue,
  cycleColor,
} from "@/lib/constants";
import { formatDate, formatDateShort, formatDateTime, relativeDayLabel, todayStr } from "@/lib/dates";
import type { Case, Contact } from "@/lib/types";
import { emptyContact } from "@/lib/types";
import { Badge, FieldLabel, Pill, TextInput } from "@/components/ui";
import * as api from "@/lib/api-client";

interface Props {
  selectedCase: Case;
  userName: string;
  onCaseUpdated: (c: Case) => void;
  onCaseDeleted: (id: string) => void;
  onError: (msg: string) => void;
}

export default function CaseDetailPanel({ selectedCase, userName, onCaseUpdated, onCaseDeleted, onError }: Props) {
  const [newUpdateText, setNewUpdateText] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newHearing, setNewHearing] = useState({ date: "", time: "", purpose: "", location: "", url: "", notes: "" });
  const [newTaskForm, setNewTaskForm] = useState({ description: "", assignee: "", dueDate: "" });
  const [courtInfoDraft, setCourtInfoDraft] = useState<{
    courtCaseNumber: string;
    opposingCounsel: Contact;
    courtClerk: Contact;
  }>({ courtCaseNumber: "", opposingCounsel: emptyContact(), courtClerk: emptyContact() });
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setCourtInfoDraft({
      courtCaseNumber: selectedCase.courtCaseNumber || "",
      opposingCounsel: {
        name: selectedCase.opposingCounselName,
        affiliation: selectedCase.opposingCounselAffiliation,
        phone: selectedCase.opposingCounselPhone,
        email: selectedCase.opposingCounselEmail,
      },
      courtClerk: {
        name: selectedCase.courtClerkName,
        affiliation: selectedCase.courtClerkAffiliation,
        phone: selectedCase.courtClerkPhone,
        email: selectedCase.courtClerkEmail,
      },
    });
    setConfirmDelete(false);
  }, [selectedCase.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const author = () => userName.trim() || "匿名";

  const run = async (fn: () => Promise<Case>) => {
    try {
      const updated = await fn();
      onCaseUpdated(updated);
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  const changeStage = (stage: string) => {
    if (stage === selectedCase.stage) return;
    run(() => api.patchCase(selectedCase.id, { stage, autoNote: `ステータスを「${stage}」に変更`, author: author() }));
  };

  const changeCategory = (category: string) => {
    if (category === selectedCase.caseCategory) return;
    const note =
      selectedCase.caseCategory === "非訟事件" && category === "訴訟事件"
        ? "非訟事件から訴訟事件に発展（種別を更新）"
        : `種別を「${selectedCase.caseCategory}」から「${category}」に変更`;
    run(() => api.patchCase(selectedCase.id, { caseCategory: category, autoNote: note, author: author() }));
  };

  const toggleResponseType = (type: string) => {
    const has = selectedCase.responseTypes.includes(type);
    const next = has
      ? selectedCase.responseTypes.filter((t) => t !== type)
      : [...selectedCase.responseTypes, type];
    run(() =>
      api.patchCase(selectedCase.id, {
        responseTypes: next,
        autoNote: has ? `対応類型「${type}」を解除` : `対応類型に「${type}」を追加`,
        author: author(),
      })
    );
  };

  const changeBallOwner = (owner: string) => {
    if (owner === selectedCase.ballOwner) return;
    run(() =>
      api.patchCase(selectedCase.id, {
        ballOwner: owner,
        autoNote: `ボール（次のアクション）を「${owner}」に更新`,
        author: author(),
      })
    );
  };

  const cycleEngagement = (
    field: "poaStatus" | "contractStatus" | "retainerStatus",
    list: readonly string[],
    label: string
  ) => {
    const nextVal = cycleValue(list, selectedCase[field]);
    run(() =>
      api.patchCase(selectedCase.id, { [field]: nextVal, autoNote: `${label}を「${nextVal}」に更新`, author: author() })
    );
  };

  const addTeamMember = () => {
    const name = newMemberName.trim();
    if (!name || selectedCase.teamMembers.includes(name)) {
      setNewMemberName("");
      return;
    }
    run(() => api.patchCase(selectedCase.id, { teamMembers: [...selectedCase.teamMembers, name] }));
    setNewMemberName("");
  };
  const removeTeamMember = (name: string) => {
    run(() => api.patchCase(selectedCase.id, { teamMembers: selectedCase.teamMembers.filter((m) => m !== name) }));
  };

  const saveCourtInfo = () => {
    run(() =>
      api.patchCase(selectedCase.id, {
        courtCaseNumber: courtInfoDraft.courtCaseNumber,
        opposingCounsel: courtInfoDraft.opposingCounsel,
        courtClerk: courtInfoDraft.courtClerk,
      })
    );
  };

  const addUpdateEntry = () => {
    if (!newUpdateText.trim()) return;
    run(() => api.addUpdate(selectedCase.id, newUpdateText.trim(), author()));
    setNewUpdateText("");
  };

  const addHearingEntry = () => {
    if (!newHearing.date || !newHearing.purpose.trim()) return;
    run(() => api.addHearing(selectedCase.id, newHearing));
    setNewHearing({ date: "", time: "", purpose: "", location: "", url: "", notes: "" });
  };
  const removeHearing = (hearingId: string) => run(() => api.deleteHearing(selectedCase.id, hearingId));

  const addQuestionEntry = () => {
    if (!newQuestionText.trim()) return;
    run(() => api.addQuestion(selectedCase.id, newQuestionText.trim()));
    setNewQuestionText("");
  };
  const cycleQuestion = (qId: string, current: string) =>
    run(() => api.patchQuestionStatus(selectedCase.id, qId, cycleValue(QUESTION_STATUSES, current)));

  const addDocumentEntry = () => {
    if (!newDocName.trim()) return;
    run(() => api.addDocument(selectedCase.id, newDocName.trim()));
    setNewDocName("");
  };
  const cycleDocument = (docId: string, current: string) =>
    run(() => api.patchDocumentStatus(selectedCase.id, docId, cycleValue(DOC_STATUSES, current)));
  const removeDocument = (docId: string) => run(() => api.deleteDocument(selectedCase.id, docId));

  const addTaskEntry = () => {
    if (!newTaskForm.description.trim()) return;
    run(() => api.addTask(selectedCase.id, newTaskForm));
    setNewTaskForm({ description: "", assignee: "", dueDate: "" });
  };
  const cycleTaskStatus = (taskId: string, current: string) =>
    run(() => api.patchTaskStatus(selectedCase.id, taskId, cycleValue(TASK_STATUSES, current)));
  const removeTask = (taskId: string) => run(() => api.deleteTask(selectedCase.id, taskId));

  const doDeleteCase = async () => {
    try {
      await api.deleteCaseApi(selectedCase.id);
      onCaseDeleted(selectedCase.id);
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">
      {/* Header */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs" style={{ color: COLORS.slate }}>
              案件No. {selectedCase.caseNumber}
            </p>
            <h2 className="text-xl mt-1" style={{ fontFamily: FONT_MINCHO, letterSpacing: "0.02em" }}>
              {selectedCase.title}
            </h2>
          </div>
          {confirmDelete ? (
            <div className="flex items-center gap-1 text-xs flex-shrink-0">
              <button onClick={doDeleteCase} className="underline font-bold" style={{ color: COLORS.vermillion }}>
                削除確定
              </button>
              <button onClick={() => setConfirmDelete(false)} className="underline" style={{ color: COLORS.slate }}>
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded hover:opacity-70 flex-shrink-0"
              style={{ color: COLORS.slate }}
              title="案件を削除"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-sm" style={{ color: COLORS.slate }}>
          <span className="flex items-center gap-1.5">
            <User size={14} /> 依頼者：{selectedCase.clientName}
          </span>
          {selectedCase.deadline && (
            <span className="flex items-center gap-1.5">
              <Calendar size={14} /> 期限：{formatDate(selectedCase.deadline)}
            </span>
          )}
          {selectedCase.priority === "至急" && (
            <Badge color={COLORS.vermillion} filled>
              至急
            </Badge>
          )}
        </div>

        <div className="mt-4">
          <FieldLabel>種別</FieldLabel>
          <div className="flex gap-2">
            {CASE_CATEGORIES.map((cat) => (
              <Pill
                key={cat}
                active={selectedCase.caseCategory === cat}
                color={cat === "訴訟事件" ? COLORS.navy : COLORS.brass}
                onClick={() => changeCategory(cat)}
              >
                {cat}
              </Pill>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <FieldLabel>ステータス</FieldLabel>
          <div className="flex gap-1.5 flex-wrap">
            {STAGES.map((s) => (
              <Pill key={s} active={selectedCase.stage === s} color={STAGE_COLOR[s]} onClick={() => changeStage(s)}>
                {s}
              </Pill>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <FieldLabel>対応類型（複数可）</FieldLabel>
          <div className="flex gap-1.5 flex-wrap">
            {RESPONSE_TYPES.map((t) => (
              <Pill
                key={t}
                active={selectedCase.responseTypes.includes(t)}
                color={COLORS.navy}
                onClick={() => toggleResponseType(t)}
              >
                {t}
              </Pill>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <FieldLabel>担当メンバー</FieldLabel>
          <div className="flex gap-1.5 flex-wrap items-center">
            {selectedCase.teamMembers.map((m) => (
              <span
                key={m}
                className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                style={{ backgroundColor: COLORS.paper, border: `1px solid ${COLORS.brassLight}`, color: COLORS.ink }}
              >
                {m}
                <button onClick={() => removeTeamMember(m)} style={{ color: COLORS.slate }}>
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTeamMember()}
              placeholder="名前を追加"
              className="text-xs p-1.5 rounded outline-none"
              style={{ border: `1px solid ${COLORS.brassLight}`, width: 110 }}
            />
            <button onClick={addTeamMember} className="text-xs font-bold px-2 py-1.5 rounded" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>
              追加
            </button>
          </div>
        </div>

        <div className="mt-5 p-3 rounded" style={{ backgroundColor: COLORS.paper, border: `1px solid ${BALL_COLOR[selectedCase.ballOwner]}` }}>
          <p className="text-xs mb-1.5 font-bold" style={{ color: COLORS.ink }}>
            ボール（次のアクションを持っているのは誰か）
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {BALL_OWNERS.map((o) => (
              <Pill key={o} active={selectedCase.ballOwner === o} color={BALL_COLOR[o]} onClick={() => changeBallOwner(o)}>
                {o}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>
          <ClipboardList size={15} /> タスク
        </h3>
        {selectedCase.teamMembers.length === 0 && (
          <p className="text-xs mb-2" style={{ color: COLORS.slate }}>
            担当メンバーを追加すると、タスクの割り当て先として選べるようになります。
          </p>
        )}
        <div className="mb-2">
          <TextInput
            type="text"
            placeholder="タスク内容（例：証拠説明書の作成）"
            value={newTaskForm.description}
            onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
            className="w-full"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <select
            value={newTaskForm.assignee}
            onChange={(e) => setNewTaskForm({ ...newTaskForm, assignee: e.target.value })}
            className="text-sm p-2 rounded outline-none flex-1"
            style={{ border: `1px solid ${COLORS.brassLight}` }}
          >
            <option value="">担当者（未割当）</option>
            {selectedCase.teamMembers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <TextInput type="date" value={newTaskForm.dueDate} onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })} />
          <button
            onClick={addTaskEntry}
            disabled={!newTaskForm.description.trim()}
            className="text-sm font-bold px-3 rounded disabled:opacity-40"
            style={{ backgroundColor: COLORS.navy, color: "#fff" }}
          >
            追加
          </button>
        </div>
        {selectedCase.tasks.length === 0 ? (
          <p className="text-sm py-2" style={{ color: COLORS.slate }}>
            タスクはありません。
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedCase.tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm p-2.5 rounded" style={{ backgroundColor: COLORS.paper }}>
                <div className="flex-1">
                  <p style={t.status === "完了" ? { textDecoration: "line-through", color: COLORS.slate } : {}}>{t.description}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="text-xs font-bold flex items-center gap-1" style={{ color: t.assignee ? COLORS.navy : COLORS.slate }}>
                      <User size={11} /> {t.assignee || "未割当"}
                    </span>
                    {t.dueDate && (
                      <span
                        className="text-xs flex items-center gap-1"
                        style={{ color: t.status !== "完了" && t.dueDate < todayStr() ? COLORS.vermillion : COLORS.slate }}
                      >
                        <Calendar size={11} /> {formatDateShort(t.dueDate)}まで
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => cycleTaskStatus(t.id, t.status)}
                    className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{ color: "#fff", backgroundColor: cycleColor(TASK_STATUSES, t.status) }}
                  >
                    {t.status}
                  </button>
                  <button onClick={() => removeTask(t.id)} style={{ color: COLORS.slate }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Litigation-specific: court info */}
      {selectedCase.caseCategory === "訴訟事件" && (
        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>
            <Landmark size={15} /> 訴訟関係者情報
          </h3>
          <FieldLabel>事件番号</FieldLabel>
          <TextInput
            type="text"
            value={courtInfoDraft.courtCaseNumber}
            onChange={(e) => setCourtInfoDraft({ ...courtInfoDraft, courtCaseNumber: e.target.value })}
            onBlur={saveCourtInfo}
            placeholder="例：東京地方裁判所 令和8年(ワ)第1234号"
            className="w-full mb-4"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: COLORS.slate }}>
                相手方代理人
              </p>
              <div className="flex flex-col gap-2">
                <TextInput
                  type="text"
                  placeholder="氏名"
                  value={courtInfoDraft.opposingCounsel.name}
                  onChange={(e) => setCourtInfoDraft({ ...courtInfoDraft, opposingCounsel: { ...courtInfoDraft.opposingCounsel, name: e.target.value } })}
                  onBlur={saveCourtInfo}
                  className="w-full"
                />
                <TextInput
                  type="text"
                  placeholder="事務所名"
                  value={courtInfoDraft.opposingCounsel.affiliation}
                  onChange={(e) =>
                    setCourtInfoDraft({ ...courtInfoDraft, opposingCounsel: { ...courtInfoDraft.opposingCounsel, affiliation: e.target.value } })
                  }
                  onBlur={saveCourtInfo}
                  className="w-full"
                />
                <div className="flex items-center gap-1.5">
                  <Phone size={13} color={COLORS.slate} />
                  <TextInput
                    type="text"
                    placeholder="電話番号"
                    value={courtInfoDraft.opposingCounsel.phone}
                    onChange={(e) => setCourtInfoDraft({ ...courtInfoDraft, opposingCounsel: { ...courtInfoDraft.opposingCounsel, phone: e.target.value } })}
                    onBlur={saveCourtInfo}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail size={13} color={COLORS.slate} />
                  <TextInput
                    type="text"
                    placeholder="メールアドレス"
                    value={courtInfoDraft.opposingCounsel.email}
                    onChange={(e) => setCourtInfoDraft({ ...courtInfoDraft, opposingCounsel: { ...courtInfoDraft.opposingCounsel, email: e.target.value } })}
                    onBlur={saveCourtInfo}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: COLORS.slate }}>
                担当書記官
              </p>
              <div className="flex flex-col gap-2">
                <TextInput
                  type="text"
                  placeholder="氏名"
                  value={courtInfoDraft.courtClerk.name}
                  onChange={(e) => setCourtInfoDraft({ ...courtInfoDraft, courtClerk: { ...courtInfoDraft.courtClerk, name: e.target.value } })}
                  onBlur={saveCourtInfo}
                  className="w-full"
                />
                <TextInput
                  type="text"
                  placeholder="所属（部・係）"
                  value={courtInfoDraft.courtClerk.affiliation}
                  onChange={(e) => setCourtInfoDraft({ ...courtInfoDraft, courtClerk: { ...courtInfoDraft.courtClerk, affiliation: e.target.value } })}
                  onBlur={saveCourtInfo}
                  className="w-full"
                />
                <div className="flex items-center gap-1.5">
                  <Phone size={13} color={COLORS.slate} />
                  <TextInput
                    type="text"
                    placeholder="電話番号"
                    value={courtInfoDraft.courtClerk.phone}
                    onChange={(e) => setCourtInfoDraft({ ...courtInfoDraft, courtClerk: { ...courtInfoDraft.courtClerk, phone: e.target.value } })}
                    onBlur={saveCourtInfo}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail size={13} color={COLORS.slate} />
                  <TextInput
                    type="text"
                    placeholder="メールアドレス"
                    value={courtInfoDraft.courtClerk.email}
                    onChange={(e) => setCourtInfoDraft({ ...courtInfoDraft, courtClerk: { ...courtInfoDraft.courtClerk, email: e.target.value } })}
                    onBlur={saveCourtInfo}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hearings */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>
          <Calendar size={15} /> 期日
        </h3>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <TextInput type="date" value={newHearing.date} onChange={(e) => setNewHearing({ ...newHearing, date: e.target.value })} />
          <TextInput type="time" value={newHearing.time} onChange={(e) => setNewHearing({ ...newHearing, time: e.target.value })} />
          <TextInput
            type="text"
            placeholder="用件（例：第2回口頭弁論期日）"
            value={newHearing.purpose}
            onChange={(e) => setNewHearing({ ...newHearing, purpose: e.target.value })}
            className="flex-1"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <TextInput
            type="text"
            placeholder="場所（例：東京地裁705号法廷）"
            value={newHearing.location}
            onChange={(e) => setNewHearing({ ...newHearing, location: e.target.value })}
            className="flex-1"
          />
          <TextInput
            type="text"
            placeholder="WEB期日URL（任意）"
            value={newHearing.url}
            onChange={(e) => setNewHearing({ ...newHearing, url: e.target.value })}
            className="flex-1"
          />
        </div>
        <div className="flex gap-2 mb-3">
          <TextInput
            type="text"
            placeholder="準備・提出物のメモ（任意）"
            value={newHearing.notes}
            onChange={(e) => setNewHearing({ ...newHearing, notes: e.target.value })}
            className="flex-1"
          />
          <button
            onClick={addHearingEntry}
            disabled={!newHearing.date || !newHearing.purpose.trim()}
            className="text-sm font-bold px-3 rounded disabled:opacity-40"
            style={{ backgroundColor: COLORS.navy, color: "#fff" }}
          >
            追加
          </button>
        </div>
        {selectedCase.hearings.length === 0 ? (
          <p className="text-sm py-2" style={{ color: COLORS.slate }}>
            登録された期日はありません。
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...selectedCase.hearings]
              .sort((a, b) => (a.date < b.date ? -1 : 1))
              .map((h) => (
                <div key={h.id} className="flex items-start justify-between gap-2 text-sm p-2.5 rounded" style={{ backgroundColor: COLORS.paper }}>
                  <div>
                    <p className="font-bold" style={{ color: h.date >= todayStr() ? COLORS.vermillion : COLORS.slate }}>
                      {formatDate(h.date)}（{relativeDayLabel(h.date)}）{h.time && ` ${h.time}〜`}
                    </p>
                    <p className="mt-0.5">{h.purpose}</p>
                    {h.location && (
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: COLORS.slate }}>
                        <MapPin size={11} /> {h.location}
                      </p>
                    )}
                    {h.url && (
                      <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-xs mt-0.5 flex items-center gap-1 underline" style={{ color: COLORS.navy }}>
                        <Link2 size={11} /> WEB期日リンク
                      </a>
                    )}
                    {h.notes && (
                      <p className="text-xs mt-0.5" style={{ color: COLORS.slate }}>
                        {h.notes}
                      </p>
                    )}
                  </div>
                  <button onClick={() => removeHearing(h.id)} style={{ color: COLORS.slate }} className="flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Engagement checklist */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-3" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>
          受任関連チェック
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">委任状</span>
            <button
              onClick={() => cycleEngagement("poaStatus", POA_STATUSES, "委任状")}
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ color: "#fff", backgroundColor: cycleColor(POA_STATUSES, selectedCase.poaStatus) }}
            >
              {selectedCase.poaStatus}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">委任契約書</span>
            <button
              onClick={() => cycleEngagement("contractStatus", CONTRACT_STATUSES, "委任契約書")}
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ color: "#fff", backgroundColor: cycleColor(CONTRACT_STATUSES, selectedCase.contractStatus) }}
            >
              {selectedCase.contractStatus}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">預り金</span>
            <button
              onClick={() => cycleEngagement("retainerStatus", RETAINER_STATUSES, "預り金")}
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ color: "#fff", backgroundColor: cycleColor(RETAINER_STATUSES, selectedCase.retainerStatus) }}
            >
              {selectedCase.retainerStatus}
            </button>
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: COLORS.slate }}>
          クリックで状態を切り替えます
        </p>
      </div>

      {/* Client questions */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>
          <HelpCircle size={15} /> クライアントへの質問・確認事項
        </h3>
        <div className="flex gap-2 mb-3">
          <TextInput type="text" value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} placeholder="確認事項を入力..." className="flex-1" />
          <button
            onClick={addQuestionEntry}
            disabled={!newQuestionText.trim()}
            className="text-sm font-bold px-3 rounded disabled:opacity-40"
            style={{ backgroundColor: COLORS.navy, color: "#fff" }}
          >
            追加
          </button>
        </div>
        {selectedCase.questions.length === 0 ? (
          <p className="text-sm py-2" style={{ color: COLORS.slate }}>
            確認事項はありません。
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedCase.questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                <span className="flex-1">{q.text}</span>
                <button
                  onClick={() => cycleQuestion(q.id, q.status)}
                  className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                  style={{ color: "#fff", backgroundColor: cycleColor(QUESTION_STATUSES, q.status) }}
                >
                  {q.status}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Litigation document checklist */}
      {selectedCase.caseCategory === "訴訟事件" && (
        <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>
            <ListChecks size={15} /> 提出書類チェックリスト
          </h3>
          <div className="flex gap-2 mb-3">
            <TextInput type="text" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} placeholder="書類名を入力（例：準備書面(2)）" className="flex-1" />
            <button
              onClick={addDocumentEntry}
              disabled={!newDocName.trim()}
              className="text-sm font-bold px-3 rounded disabled:opacity-40"
              style={{ backgroundColor: COLORS.navy, color: "#fff" }}
            >
              追加
            </button>
          </div>
          {selectedCase.documents.length === 0 ? (
            <p className="text-sm py-2" style={{ color: COLORS.slate }}>
              書類が登録されていません。
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedCase.documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
                  <span className="flex-1">{d.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => cycleDocument(d.id, d.status)}
                      className="text-xs font-bold px-2 py-1 rounded-full"
                      style={{ color: "#fff", backgroundColor: cycleColor(DOC_STATUSES, d.status) }}
                    >
                      {d.status}
                    </button>
                    <button onClick={() => removeDocument(d.id)} style={{ color: COLORS.slate }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="rounded p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}>
        <h3 className="text-sm font-bold mb-4" style={{ fontFamily: FONT_MINCHO, color: COLORS.navy, letterSpacing: "0.05em" }}>
          経過記録
        </h3>
        <div className="flex flex-col gap-2 mb-5">
          <textarea
            value={newUpdateText}
            onChange={(e) => setNewUpdateText(e.target.value)}
            placeholder="進捗・対応内容を記録..."
            rows={3}
            className="text-sm p-2 rounded outline-none resize-none"
            style={{ border: `1px solid ${COLORS.brassLight}` }}
          />
          <button
            onClick={addUpdateEntry}
            disabled={!newUpdateText.trim()}
            className="self-end flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded transition disabled:opacity-40"
            style={{ backgroundColor: COLORS.navy, color: "#fff" }}
          >
            <Send size={13} /> 記録を追加
          </button>
        </div>
        {selectedCase.updates.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: COLORS.slate }}>
            まだ記録がありません。
          </p>
        ) : (
          <div className="flex flex-col gap-4 pl-4" style={{ borderLeft: `2px solid ${COLORS.brassLight}` }}>
            {selectedCase.updates.map((u) => (
              <div key={u.id} className="relative">
                <div
                  className="absolute rounded-full"
                  style={{ width: 9, height: 9, backgroundColor: u.auto ? COLORS.brassLight : COLORS.brass, left: -21, top: 5 }}
                />
                <p className="text-xs" style={{ color: COLORS.slate }}>
                  {formatDateTime(u.timestamp)}　<span className="font-bold">{u.author}</span>
                </p>
                <p className="text-sm mt-0.5 whitespace-pre-wrap" style={u.auto ? { fontStyle: "italic", color: COLORS.slate } : {}}>
                  {u.note}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
