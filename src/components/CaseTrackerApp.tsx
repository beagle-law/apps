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
  User as UserIcon,
  Clock,
  LayoutDashboard,
  Target,
  BookOpen,
  Receipt,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import { COLORS, FONT_MINCHO, FONT_GOTHIC, STAGE_GROUP, PERSONAL_TASK_TABS } from "@/lib/constants";
import { nextHearing } from "@/lib/business/hearings";
import type { Case, User } from "@/lib/types";
import * as api from "@/lib/api-client";
import CaseListSidebar from "@/components/CaseListSidebar";
import CaseDetailPanel from "@/components/CaseDetailPanel";
import NewCaseModal from "@/components/NewCaseModal";
import AiInputView from "@/components/AiInputView";
import ClientsView from "@/components/ClientsView";
import PasswordsView from "@/components/PasswordsView";
import PersonalTaskView from "@/components/PersonalTaskView";
import UpcomingHearingsView from "@/components/UpcomingHearingsView";
import DashboardView from "@/components/DashboardView";
import GoalsView from "@/components/GoalsView";
import KnowledgeView from "@/components/KnowledgeView";
import BillingView from "@/components/BillingView";
import SettingsView from "@/components/SettingsView";

type View =
  | "ai-input"
  | "list"
  | "clients"
  | "passwords"
  | `person:${string}`
  | "upcoming"
  | "dashboard"
  | "goals"
  | "knowledge"
  | "billing"
  | "settings";

export default function CaseTrackerApp() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("すべて");
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ user }, caseList] = await Promise.all([api.fetchMe(), api.fetchCases()]);
        setCurrentUser(user);
        setCases(caseList);
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

  const filteredCases = useMemo(() => {
    let list = cases;
    if (groupFilter === "非表示") {
      list = list.filter((c) => c.hidden);
    } else {
      list = list.filter((c) => !c.hidden);
      if (groupFilter !== "すべて") list = list.filter((c) => STAGE_GROUP[c.stage] === groupFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.clientName.toLowerCase().includes(q) ||
          c.caseNumber.toLowerCase().includes(q) ||
          c.teamMembers.some((m) => m.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (a.priority === "至急" && b.priority !== "至急") return -1;
      if (b.priority === "至急" && a.priority !== "至急") return 1;
      const aOurs = a.ballOwner === "事務所";
      const bOurs = b.ballOwner === "事務所";
      if (aOurs && !bOurs) return -1;
      if (bOurs && !aOurs) return 1;
      const aH = nextHearing(a);
      const bH = nextHearing(b);
      const aDate = aH ? aH.nextHearingDate : a.deadline;
      const bDate = bH ? bH.nextHearingDate : b.deadline;
      if (aDate && bDate) return aDate < bDate ? -1 : 1;
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [cases, groupFilter, searchQuery]);

  const suggestedCaseNumber = () => {
    const year = new Date().getFullYear();
    return `${year}-${String(cases.length + 1).padStart(3, "0")}`;
  };

  const openCaseFromElsewhere = (id: string) => {
    setSelectedId(id);
    setView("list");
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
      setGroupFilter("すべて");
      setSelectedId(memoCase.id);
      setView("list");
    } catch (e) {
      setError(e instanceof Error ? e.message : "個人メモの取得に失敗しました");
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: COLORS.paper, fontFamily: FONT_GOTHIC }}>
        <Loader2 className="animate-spin" size={28} color={COLORS.navy} />
        <p className="text-sm" style={{ color: COLORS.slate }}>読み込み中...</p>
      </div>
    );
  }

  const TABS: { key: View; label: string; icon: typeof Briefcase }[] = [
    { key: "ai-input", label: "AI入力", icon: Sparkles },
    { key: "list", label: "案件一覧", icon: Briefcase },
    { key: "clients", label: "顧客一覧", icon: Building2 },
    { key: "passwords", label: "パスワード管理", icon: Lock },
    ...PERSONAL_TASK_TABS.filter((name) => isAdmin || currentUser.displayName === name).map((name) => ({
      key: `person:${name}` as View,
      label: name,
      icon: UserIcon,
    })),
    { key: "upcoming", label: "今後の期日", icon: Clock },
    { key: "dashboard", label: "ダッシュボード", icon: LayoutDashboard },
    { key: "goals", label: "目標", icon: Target },
    { key: "knowledge", label: "ノウハウ・ひながた", icon: BookOpen },
    { key: "billing", label: "請求管理", icon: Receipt },
    { key: "settings", label: "設定", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.paper, fontFamily: FONT_GOTHIC, color: COLORS.ink }}>
      <header className="flex items-center justify-between px-5 py-3 gap-4 sticky top-0 z-10" style={{ backgroundColor: COLORS.navy }}>
        <div className="flex items-center gap-3">
          <Briefcase size={22} color={COLORS.brassLight} />
          <div>
            <h1 className="text-lg leading-tight" style={{ fontFamily: FONT_MINCHO, color: "#fff", letterSpacing: "0.05em" }}>CenMOZO</h1>
            <p className="text-xs" style={{ color: COLORS.brassLight, opacity: 0.8 }}>Matter Progress Tracker</p>
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

      <nav className="flex items-center gap-1 px-5 overflow-x-auto" style={{ backgroundColor: COLORS.navyLight }}>
        {TABS.map((t) => {
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
        <div className="flex items-center gap-2 px-4 py-2 text-sm" style={{ backgroundColor: "#F3DEDC", color: COLORS.vermillion }}>
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError("")} className="ml-auto underline text-xs">閉じる</button>
        </div>
      )}

      {view === "list" && (
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <CaseListSidebar
            cases={filteredCases}
            selectedId={selectedId}
            searchQuery={searchQuery}
            groupFilter={groupFilter}
            onSearchChange={setSearchQuery}
            onGroupFilterChange={setGroupFilter}
            onSelect={setSelectedId}
            onNewCase={() => setShowNewCaseModal(true)}
          />
          <main className="flex-1 overflow-y-auto p-6">
            {!selectedCase ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-20">
                <div style={{ transform: "rotate(-6deg)" }}>
                  <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center" style={{ borderColor: COLORS.brass, color: COLORS.brass }}>
                    <Briefcase size={28} />
                  </div>
                </div>
                <p style={{ color: COLORS.slate }} className="text-sm max-w-xs">左の一覧から案件を選択するか、「新規案件を登録」から案件を追加してください。</p>
              </div>
            ) : (
              <CaseDetailPanel
                selectedCase={selectedCase}
                onCaseUpdated={updateCaseInState}
                onCaseDeleted={removeCaseFromState}
                onError={setError}
              />
            )}
          </main>
        </div>
      )}

      {view === "ai-input" && (
        <AiInputView cases={cases} onCaseCreated={addCaseToState} onCaseUpdated={updateCaseInState} onOpenCase={openCaseFromElsewhere} onError={setError} />
      )}

      {view === "clients" && <ClientsView cases={cases} onOpenCase={openCaseFromElsewhere} onError={setError} />}

      {view === "passwords" && <PasswordsView onError={setError} />}

      {PERSONAL_TASK_TABS.map(
        (name) =>
          view === `person:${name}` && (
            <PersonalTaskView key={name} personName={name} isAdmin={isAdmin} cases={cases} onOpenCase={openCaseFromElsewhere} onError={setError} />
          )
      )}

      {view === "upcoming" && <UpcomingHearingsView cases={cases} onOpenCase={openCaseFromElsewhere} />}

      {view === "dashboard" && (
        <DashboardView
          cases={cases}
          onGoToActiveCases={() => {
            setGroupFilter("対応中");
            setSelectedId(null);
            setView("list");
          }}
          onOpenCase={openCaseFromElsewhere}
        />
      )}

      {view === "goals" && <GoalsView cases={cases} onError={setError} />}

      {view === "knowledge" && <KnowledgeView onError={setError} />}

      {view === "billing" && <BillingView onOpenCase={openCaseFromElsewhere} onError={setError} />}

      {view === "settings" && <SettingsView currentUser={currentUser} onError={setError} />}

      {showNewCaseModal && (
        <NewCaseModal suggestedCaseNumber={suggestedCaseNumber()} onClose={() => setShowNewCaseModal(false)} onCreated={addCaseToState} onError={setError} />
      )}
    </div>
  );
}
