"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Loader2,
  AlertTriangle,
  User,
  LayoutDashboard,
  Clock,
  Archive,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { COLORS, FONT_MINCHO, FONT_GOTHIC, STAGE_GROUP } from "@/lib/constants";
import { plusDaysStr, todayStr } from "@/lib/dates";
import type { Case } from "@/lib/types";
import * as api from "@/lib/api-client";
import CaseListSidebar from "@/components/CaseListSidebar";
import CaseDetailPanel from "@/components/CaseDetailPanel";
import TaskBoardView from "@/components/TaskBoardView";
import UpcomingHearingsView from "@/components/UpcomingHearingsView";
import DashboardView from "@/components/DashboardView";
import NewCaseModal from "@/components/NewCaseModal";

type View = "list" | "archived" | "tasks" | "upcoming" | "dashboard";

const USER_NAME_KEY = "legal-case-tracker-username";

export default function CaseTrackerApp() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("すべて");
  const [userName, setUserName] = useState("");
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(USER_NAME_KEY);
    if (stored) setUserName(stored);
  }, []);

  useEffect(() => {
    if (userName) window.localStorage.setItem(USER_NAME_KEY, userName);
  }, [userName]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.fetchCases();
        setCases(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "データの読み込みに失敗しました。再読み込みしてください。");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedCase = cases.find((c) => c.id === selectedId) || null;

  const updateCaseInState = (updated: Case) => {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };
  const removeCaseFromState = (id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const addCaseToState = (created: Case) => {
    setCases((prev) => [created, ...prev]);
    setSelectedId(created.id);
    setView("list");
  };

  function nextHearing(c: Case) {
    const t = todayStr();
    const future = (c.hearings || []).filter((h) => h.date >= t).sort((a, b) => (a.date < b.date ? -1 : 1));
    return future.length ? future[0] : null;
  }

  const filteredCases = useMemo(() => {
    let list = cases.filter((c) => (view === "archived" ? STAGE_GROUP[c.stage] === "終了" : STAGE_GROUP[c.stage] !== "終了"));
    if (view === "list" && groupFilter !== "すべて") list = list.filter((c) => STAGE_GROUP[c.stage] === groupFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.clientName.toLowerCase().includes(q) ||
          c.caseNumber.toLowerCase().includes(q) ||
          (c.teamMembers || []).some((m) => m.toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => {
      if (a.priority === "至急" && b.priority !== "至急") return -1;
      if (b.priority === "至急" && a.priority !== "至急") return 1;
      const aOurs = a.ballOwner === "事務所";
      const bOurs = b.ballOwner === "事務所";
      if (aOurs && !bOurs) return -1;
      if (bOurs && !aOurs) return 1;
      const aH = nextHearing(a);
      const bH = nextHearing(b);
      const aDate = aH ? aH.date : a.deadline;
      const bDate = bH ? bH.date : b.deadline;
      if (aDate && bDate) return aDate < bDate ? -1 : 1;
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [cases, view, groupFilter, searchQuery]);

  const upcomingCount = useMemo(() => {
    const t = todayStr();
    const t7 = plusDaysStr(7);
    return cases.flatMap((c) => (c.hearings || []).filter((h) => h.date >= t && h.date <= t7)).length;
  }, [cases]);

  const openTasksTotal = useMemo(
    () => cases.flatMap((c) => (c.tasks || []).filter((t) => t.status !== "完了")).length,
    [cases]
  );

  const suggestedCaseNumber = () => {
    const year = new Date().getFullYear();
    return `${year}-${String(cases.length + 1).padStart(3, "0")}`;
  };

  const openCaseFromElsewhere = (id: string) => {
    const c = cases.find((cs) => cs.id === id);
    setSelectedId(id);
    setView(c && STAGE_GROUP[c.stage] === "終了" ? "archived" : "list");
  };

  const doLogout = async () => {
    await api.logout();
    router.push("/login");
    router.refresh();
  };

  const clearAllCases = async () => {
    try {
      await Promise.all(cases.map((c) => api.deleteCaseApi(c.id)));
      setCases([]);
      setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setConfirmClearAll(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: COLORS.paper, fontFamily: FONT_GOTHIC }}>
        <Loader2 className="animate-spin" size={28} color={COLORS.navy} />
        <p className="text-sm" style={{ color: COLORS.slate }}>
          読み込み中...
        </p>
      </div>
    );
  }

  const TABS: { key: View; label: string; icon: typeof Briefcase }[] = [
    { key: "list", label: "案件一覧", icon: Briefcase },
    { key: "tasks", label: `タスク${openTasksTotal ? `（${openTasksTotal}）` : ""}`, icon: ClipboardList },
    { key: "archived", label: "終了案件", icon: Archive },
    { key: "upcoming", label: `今後の期日${upcomingCount ? `（${upcomingCount}）` : ""}`, icon: Clock },
    { key: "dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.paper, fontFamily: FONT_GOTHIC, color: COLORS.ink }}>
      <header className="flex items-center justify-between px-5 py-3 gap-4 sticky top-0 z-10" style={{ backgroundColor: COLORS.navy }}>
        <div className="flex items-center gap-3">
          <Briefcase size={22} color={COLORS.brassLight} />
          <div>
            <h1 className="text-lg leading-tight" style={{ fontFamily: FONT_MINCHO, color: "#fff", letterSpacing: "0.05em" }}>
              案件進捗管理
            </h1>
            <p className="text-xs" style={{ color: COLORS.brassLight, opacity: 0.8 }}>
              Matter Progress Tracker
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <User size={16} color={COLORS.brassLight} />
          <input
            type="text"
            placeholder="あなたの名前"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="text-sm px-2 py-1 rounded outline-none"
            style={{ backgroundColor: COLORS.navyLight, color: "#fff", border: `1px solid ${COLORS.brass}`, width: 140 }}
          />
          <button onClick={doLogout} className="p-1.5 rounded hover:opacity-80" style={{ color: COLORS.brassLight }} title="ログアウト">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <nav className="flex items-center gap-1 px-5 overflow-x-auto" style={{ backgroundColor: COLORS.navyLight }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = view === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                if (t.key === "list" || t.key === "archived") setSelectedId(null);
                setView(t.key);
              }}
              className="flex items-center gap-1.5 text-sm px-3 py-2 transition whitespace-nowrap"
              style={{
                color: active ? "#fff" : COLORS.brassLight,
                borderBottom: active ? `2px solid ${COLORS.brassLight}` : "2px solid transparent",
                opacity: active ? 1 : 0.75,
              }}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </nav>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm" style={{ backgroundColor: "#F3DEDC", color: COLORS.vermillion }}>
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError("")} className="ml-auto underline text-xs">
            閉じる
          </button>
        </div>
      )}

      {(view === "list" || view === "archived") && (
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div className="flex flex-col">
            <CaseListSidebar
              view={view}
              cases={filteredCases}
              selectedId={selectedId}
              searchQuery={searchQuery}
              groupFilter={groupFilter}
              onSearchChange={setSearchQuery}
              onGroupFilterChange={setGroupFilter}
              onSelect={setSelectedId}
              onNewCase={() => setShowNewCaseModal(true)}
            />
            {view === "list" && (
              <div className="p-3 border-t md:w-80" style={{ borderColor: COLORS.brassLight, backgroundColor: "#EAE4D6" }}>
                {!confirmClearAll ? (
                  <button onClick={() => setConfirmClearAll(true)} className="text-xs underline" style={{ color: COLORS.slate }}>
                    すべてのデータを削除
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <span style={{ color: COLORS.vermillion }}>本当に削除しますか？</span>
                    <button onClick={clearAllCases} className="underline font-bold" style={{ color: COLORS.vermillion }}>
                      削除する
                    </button>
                    <button onClick={() => setConfirmClearAll(false)} className="underline" style={{ color: COLORS.slate }}>
                      やめる
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <main className="flex-1 overflow-y-auto p-6">
            {!selectedCase ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-20">
                <div style={{ transform: "rotate(-6deg)" }}>
                  <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center" style={{ borderColor: COLORS.brass, color: COLORS.brass }}>
                    <Briefcase size={28} />
                  </div>
                </div>
                <p style={{ color: COLORS.slate }} className="text-sm max-w-xs">
                  左の一覧から案件を選択するか、「新規案件を登録」から案件を追加してください。
                </p>
              </div>
            ) : (
              <CaseDetailPanel
                selectedCase={selectedCase}
                userName={userName}
                onCaseUpdated={updateCaseInState}
                onCaseDeleted={removeCaseFromState}
                onError={setError}
              />
            )}
          </main>
        </div>
      )}

      {view === "tasks" && (
        <TaskBoardView cases={cases} onOpenCase={openCaseFromElsewhere} onCaseUpdated={updateCaseInState} onError={setError} />
      )}

      {view === "upcoming" && <UpcomingHearingsView cases={cases} onOpenCase={openCaseFromElsewhere} />}

      {view === "dashboard" && <DashboardView cases={cases} />}

      {showNewCaseModal && (
        <NewCaseModal
          suggestedCaseNumber={suggestedCaseNumber()}
          userName={userName}
          onClose={() => setShowNewCaseModal(false)}
          onCreated={addCaseToState}
          onError={setError}
        />
      )}
    </div>
  );
}
