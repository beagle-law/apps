"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Loader2,
  AlertTriangle,
  LogOut,
  Building2,
  Lock,
  StickyNote,
  Clock,
  LayoutDashboard,
  Database,
  Target,
  BookOpen,
  FileSpreadsheet,
  Settings as SettingsIcon,
} from "lucide-react";
import { COLORS, FONT_MINCHO, FONT_GOTHIC, PERSONAL_TASK_TABS } from "@/lib/constants";
import { suggestedCaseNumber } from "@/lib/business/caseNumber";
import { sortCasesByCaseNumber } from "@/lib/business/caseSort";
import type { Case, User, CaseClassification } from "@/lib/types";
import * as api from "@/lib/api-client";
import CaseListSidebar from "@/components/CaseListSidebar";
import CaseDetailPanel from "@/components/CaseDetailPanel";
import NewCaseModal from "@/components/NewCaseModal";
import ClientsView from "@/components/ClientsView";
import PasswordsView from "@/components/PasswordsView";
import PersonalTaskView from "@/components/PersonalTaskView";
import UpcomingHearingsView from "@/components/UpcomingHearingsView";
import DashboardView from "@/components/DashboardView";
import AnalyticsSummaryView from "@/components/AnalyticsSummaryView";
import GoalsView from "@/components/GoalsView";
import KnowledgeView from "@/components/KnowledgeView";
import BillingView from "@/components/BillingView";
import SettingsView from "@/components/SettingsView";

type View =
  | "list"
  | "clients"
  | "passwords"
  | `person:${string}`
  | "upcoming"
  | "dashboard"
  | "data"
  | "goals"
  | "knowledge"
  | "billing"
  | "settings";

const MAIN_TABS: { key: View; label: string; icon: typeof Briefcase }[] = [
  { key: "list", label: "案件一覧", icon: Briefcase },
  { key: "clients", label: "顧客一覧", icon: Building2 },
  { key: "passwords", label: "パスワード管理", icon: Lock },
  { key: "upcoming", label: "今後の期日", icon: Clock },
  { key: "dashboard", label: "分析", icon: LayoutDashboard },
  { key: "data", label: "データ", icon: Database },
  { key: "goals", label: "目標", icon: Target },
  { key: "knowledge", label: "ノウハウ・ひながた", icon: BookOpen },
  { key: "billing", label: "請求管理", icon: FileSpreadsheet },
  { key: "settings", label: "設定", icon: SettingsIcon },
];

export default function CaseTrackerApp() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ballFilter, setBallFilter] = useState("");
  const [showHiddenCases, setShowHiddenCases] = useState(false);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [classifications, setClassifications] = useState<CaseClassification[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const [resizingSidebar, setResizingSidebar] = useState(false);

  // 案件一覧幅の判定はmdブレークポイント（768px）に合わせる（v11 3.1：狭い画面では1列表示になりハンドルは非表示）
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktopLayout(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!resizingSidebar) return;
    const onMove = (e: MouseEvent) => {
      setSidebarWidth(Math.min(600, Math.max(180, e.clientX)));
    };
    const onUp = () => setResizingSidebar(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizingSidebar]);

  useEffect(() => {
    (async () => {
      try {
        const [{ user }, caseList, classificationList] = await Promise.all([
          api.fetchMe(),
          api.fetchCases(),
          api.fetchCaseClassifications(),
        ]);
        setCurrentUser(user);
        setCases(caseList);
        setClassifications(classificationList);
        // ログイン後の初期表示画面は、ログインしたアカウントの個人タスク画面（v6 2.2）
        if (PERSONAL_TASK_TABS.includes(user.displayName)) {
          setView(`person:${user.displayName}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "データの読み込みに失敗しました。再読み込みしてください。");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedCase = cases.find((c) => c.id === selectedId) || null;
  const isAdmin = currentUser?.role === "admin";

  const updateCaseInState = (updated: Case) => setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

  const removeCaseFromState = (id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const addCaseToState = (created: Case) => {
    setCases((prev) => [created, ...prev]);
    setSelectedId(created.id);
    setView("list");
  };

  const toggleCaseHidden = async (id: string) => {
    const target = cases.find((c) => c.id === id);
    if (!target) return;
    try {
      const updated = await api.patchCase(id, { hidden: !target.hidden });
      updateCaseInState(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };

  const filteredCases = useMemo(() => {
    let list = showHiddenCases ? cases.filter((c) => c.hidden) : cases.filter((c) => !c.hidden);
    if (ballFilter) list = list.filter((c) => c.ballOwner === ballFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.clientName.toLowerCase().includes(q) ||
          c.caseNumber.toLowerCase().includes(q)
      );
    }
    return sortCasesByCaseNumber(list);
  }, [cases, ballFilter, showHiddenCases, searchQuery]);

  const openCaseFromElsewhere = (id: string) => {
    setSelectedId(id);
    setShowHiddenCases(false);
    setView("list");
  };

  const openClientFromCase = (clientId: string) => {
    setPendingClientId(clientId);
    setView("clients");
  };

  const addClassification = async (name: string) => {
    const created = await api.addCaseClassification(name);
    setClassifications((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "ja"))));
    return created;
  };

  const doLogout = async () => {
    await api.logout();
    router.push("/login");
    router.refresh();
  };

  const openPrivateMemo = async () => {
    try {
      const memoCase = await api.fetchOrCreateMemoCase();
      setCases((prev) => (prev.some((c) => c.id === memoCase.id) ? prev : [memoCase, ...prev]));
      setShowHiddenCases(false);
      setSelectedId(memoCase.id);
      setView("list");
    } catch (e) {
      setError(e instanceof Error ? e.message : "個人メモの取得に失敗しました");
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: COLORS.paper, fontFamily: FONT_GOTHIC }}>
        <img src="/logo-mark.png" alt="" style={{ width: 64, height: 64 }} />
        <Loader2 className="animate-spin" size={20} color={COLORS.navy} />
        <p className="text-sm" style={{ color: COLORS.slate }}>読み込み中...</p>
      </div>
    );
  }

  const personTabs = PERSONAL_TASK_TABS.filter((name) => isAdmin || currentUser.displayName === name);

  return (
    <div className="flex flex-col" style={{ height: "100vh", overflow: "hidden", backgroundColor: COLORS.paper, fontFamily: FONT_GOTHIC, color: COLORS.ink }}>
      <header className="flex items-center justify-between px-5 py-3 gap-4 flex-shrink-0" style={{ backgroundColor: COLORS.navy }}>
        <div className="flex items-center gap-3">
          <img src="/logo-mark.png" alt="Beagle総合法律事務所" style={{ height: 38, width: 38 }} />
          <div className="hidden sm:block" style={{ borderLeft: `1px solid ${COLORS.brass}`, paddingLeft: 12 }}>
            <h1 className="text-sm leading-tight" style={{ fontFamily: FONT_MINCHO, color: "#fff", letterSpacing: "0.05em" }}>Beagle総合法律事務所</h1>
            <p className="text-xs" style={{ color: COLORS.brassLight, opacity: 0.8 }}>案件進捗管理</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "#fff" }}>{currentUser.displayName}さん{isAdmin ? "（管理者）" : ""}</span>
          <button onClick={openPrivateMemo} className="p-1.5 rounded hover:opacity-80" style={{ color: COLORS.brassLight }} title="個人メモ（自分しか見えません）">
            <StickyNote size={16} />
          </button>
          <button onClick={doLogout} className="p-1.5 rounded hover:opacity-80" style={{ color: COLORS.brassLight }} title="ログアウト">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <nav className="flex items-center gap-1 px-5 flex-shrink-0 overflow-x-auto" style={{ backgroundColor: COLORS.brass }}>
        {personTabs.map((name) => {
          const active = view === `person:${name}`;
          return (
            <button
              key={name}
              onClick={() => setView(`person:${name}`)}
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 transition whitespace-nowrap"
              style={{
                backgroundColor: active ? "#fff" : "transparent",
                color: active ? COLORS.navy : "#fff",
                borderRadius: "6px 6px 0 0",
              }}
            >
              {name}
            </button>
          );
        })}
      </nav>

      <nav className="flex items-center gap-1 px-5 flex-shrink-0 overflow-x-auto" style={{ backgroundColor: COLORS.navyLight }}>
        {MAIN_TABS.map((t) => {
          const Icon = t.icon;
          const active = view === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                if (t.key === "list") setSelectedId(null);
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
        <div className="flex items-center gap-2 px-4 py-2 text-sm flex-shrink-0" style={{ backgroundColor: "#F3DEDC", color: COLORS.vermillion }}>
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError("")} className="ml-auto underline text-xs">閉じる</button>
        </div>
      )}

      {view === "list" && (
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden" style={resizingSidebar ? { cursor: "col-resize", userSelect: "none" } : undefined}>
          <CaseListSidebar
            allCases={cases}
            cases={filteredCases}
            selectedId={selectedId}
            searchQuery={searchQuery}
            ballFilter={ballFilter}
            showHiddenCases={showHiddenCases}
            onSearchChange={setSearchQuery}
            onBallFilterChange={setBallFilter}
            onToggleShowHidden={() => setShowHiddenCases((v) => !v)}
            onSelect={setSelectedId}
            onToggleHidden={toggleCaseHidden}
            onNewCase={() => setShowNewCaseModal(true)}
            widthPx={isDesktopLayout ? sidebarWidth : undefined}
          />
          {isDesktopLayout && (
            <div
              onMouseDown={() => setResizingSidebar(true)}
              className="flex-shrink-0 hidden md:block"
              style={{ width: 5, cursor: "col-resize", backgroundColor: resizingSidebar ? COLORS.brass : COLORS.brassLight }}
              title="ドラッグして案件一覧の幅を調整"
            />
          )}
          <main className="flex-1 overflow-y-auto p-6">
            {!selectedCase ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-20">
                <img src="/logo-mark.png" alt="" style={{ width: 96, height: 96, opacity: 0.9 }} />
                <p style={{ color: COLORS.slate }} className="text-sm max-w-xs">左の一覧から案件を選択するか、「新規案件を登録」から案件を追加してください。</p>
              </div>
            ) : (
              <CaseDetailPanel
                selectedCase={selectedCase}
                onCaseUpdated={updateCaseInState}
                onCaseDeleted={removeCaseFromState}
                onOpenClient={openClientFromCase}
                classifications={classifications}
                onAddClassification={addClassification}
                onError={setError}
              />
            )}
          </main>
        </div>
      )}

      {view === "clients" && (
        <ClientsView cases={cases} onOpenCase={openCaseFromElsewhere} onError={setError} initialClientId={pendingClientId} />
      )}

      {view === "passwords" && <PasswordsView onError={setError} />}

      {PERSONAL_TASK_TABS.map(
        (name) =>
          view === `person:${name}` && (
            <PersonalTaskView key={name} personName={name} cases={cases} onError={setError} />
          )
      )}

      {view === "upcoming" && <UpcomingHearingsView cases={cases} onOpenCase={openCaseFromElsewhere} />}

      {view === "dashboard" && (
        <DashboardView
          cases={cases}
          onGoToActiveCases={() => {
            setSelectedId(null);
            setShowHiddenCases(false);
            setView("list");
          }}
          onOpenCase={openCaseFromElsewhere}
          onCaseUpdated={updateCaseInState}
          onError={setError}
        />
      )}

      {view === "data" && <AnalyticsSummaryView cases={cases} />}

      {view === "goals" && <GoalsView currentUser={currentUser} onError={setError} />}

      {view === "knowledge" && (
        <KnowledgeView classifications={classifications} onAddClassification={addClassification} onError={setError} />
      )}

      {view === "billing" && <BillingView onOpenCase={openCaseFromElsewhere} onOpenClient={openClientFromCase} onError={setError} />}

      {view === "settings" && <SettingsView currentUser={currentUser} onError={setError} />}

      {showNewCaseModal && (
        <NewCaseModal
          suggestedCaseNumber={suggestedCaseNumber(cases.map((c) => c.caseNumber))}
          cases={cases}
          onClose={() => setShowNewCaseModal(false)}
          onCreated={addCaseToState}
          onError={setError}
        />
      )}
    </div>
  );
}
