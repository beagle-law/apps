"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Briefcase,
  Loader2,
  AlertTriangle,
  LogOut,
  Building2,
  Lock,
  StickyNote,
  LayoutDashboard,
  Target,
  BookOpen,
  FileSpreadsheet,
  Wallet,
  User as UserIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { COLORS, FONT_MINCHO, FONT_GOTHIC, PERSONAL_TASK_TABS } from "@/lib/constants";
import { suggestedCaseNumber } from "@/lib/business/caseNumber";
import { sortCasesByCaseNumber } from "@/lib/business/caseSort";
import type { Case, User, CaseClassification } from "@/lib/types";
import * as api from "@/lib/api-client";
import { getPendingMemos, removePendingMemo, subscribePending, isNetworkFailure } from "@/lib/offline-queue";
import { loadBootCache, saveBootCache, clearBootCache } from "@/lib/boot-cache";
import CaseListSidebar from "@/components/CaseListSidebar";
import CaseDetailPanel from "@/components/CaseDetailPanel";

// v13：初回起動時の読み込みを軽くするため、既定表示の「案件一覧」以外の画面は
// タブを開いたときに初めて読み込む（各画面が個別に抱える重い依存も連動して遅延読み込みされる）。
const NewCaseModal = dynamic(() => import("@/components/NewCaseModal"), { ssr: false });
const ClientsView = dynamic(() => import("@/components/ClientsView"), { ssr: false });
const PasswordsView = dynamic(() => import("@/components/PasswordsView"), { ssr: false });
const PersonalTaskView = dynamic(() => import("@/components/PersonalTaskView"), { ssr: false });
const DashboardView = dynamic(() => import("@/components/DashboardView"), { ssr: false });
const GoalsView = dynamic(() => import("@/components/GoalsView"), { ssr: false });
const KnowledgeView = dynamic(() => import("@/components/KnowledgeView"), { ssr: false });
const BillingView = dynamic(() => import("@/components/BillingView"), { ssr: false });
const ExpenseBoardView = dynamic(() => import("@/components/ExpenseBoardView"), { ssr: false });
const SettingsView = dynamic(() => import("@/components/SettingsView"), { ssr: false });

type View =
  | "list"
  | "clients"
  | "passwords"
  | `person:${string}`
  | "dashboard"
  | "goals"
  | "knowledge"
  | "billing"
  | "expenses"
  | "settings";

const MAIN_TABS: { key: View; label: string; icon: typeof Briefcase }[] = [
  { key: "list", label: "案件一覧", icon: Briefcase },
  { key: "clients", label: "顧客一覧", icon: Building2 },
  { key: "passwords", label: "パスワード管理", icon: Lock },
  { key: "dashboard", label: "分析", icon: LayoutDashboard },
  { key: "goals", label: "目標", icon: Target },
  { key: "knowledge", label: "ノウハウ・ひながた", icon: BookOpen },
  { key: "billing", label: "請求管理", icon: FileSpreadsheet },
  { key: "expenses", label: "経費入力", icon: Wallet },
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
  const [newCaseClientId, setNewCaseClientId] = useState<string | null>(null);
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

  // ── 起動時の読み込み（v32：スマホでは段階的に表示して、操作できるまでの時間を短くする）──
  // ・パソコン：従来どおり、ユーザー・案件一覧・分類をそろえてから表示
  // ・スマホ：個人メモを最優先で読み込み（ユーザー情報・個人メモ・案件一覧を並列で取得）、個人メモが届いた時点で表示を始め、
  //   容量の大きい案件一覧は裏で読み込む。前回の内容を端末に保存してあれば、通信を待たずにすぐ表示する。
  const [casesLoading, setCasesLoading] = useState(false);
  const bootCached = useRef(false);
  useEffect(() => {
    const isPhone = window.matchMedia("(max-width: 767px)").matches;

    if (isPhone) {
      const boot = loadBootCache();
      if (boot) {
        bootCached.current = true;
        setCurrentUser(boot.user);
        setCases([boot.memoCase]);
        setSelectedId(boot.memoCase.id);
        setView("list");
        setLoading(false);
      }
    }

    (async () => {
      try {
        const mePromise = api.fetchMe();
        const casesPromise = api.fetchCases();
        const classPromise = api.fetchCaseClassifications();
        const memoPromise = isPhone ? api.fetchOrCreateMemoCase().catch(() => null) : null;

        const { user } = await mePromise;
        setCurrentUser(user);
        // ログイン後の初期表示画面は、ログインしたアカウントの個人タスク画面（v6 2.2）
        if (!bootCached.current && PERSONAL_TASK_TABS.includes(user.displayName)) {
          setView(`person:${user.displayName}`);
        }

        if (isPhone && memoPromise) {
          setCasesLoading(true);
          const memoCase = await memoPromise;
          if (memoCase) {
            setCases((prev) => [memoCase, ...prev.filter((c) => c.id !== memoCase.id)]);
            if (!bootCached.current) {
              setSelectedId(memoCase.id); // スマホ幅（768px未満）で開いたときの初期表示は個人メモ（v26）
              setView("list");
            }
            saveBootCache(user, memoCase);
          }
          setLoading(false); // 個人メモが届いたら、案件一覧を待たずに表示を始める
        }

        const [caseList, classificationList] = await Promise.all([casesPromise, classPromise]);
        // 読み込み中に個人メモへ追加・編集していても失われないよう、すでに手元にある案件は手元の内容を優先する
        setCases((prev) => {
          const local = new Map(prev.map((c) => [c.id, c]));
          const merged = caseList.map((c) => local.get(c.id) ?? c);
          const extra = prev.filter((c) => !caseList.some((x) => x.id === c.id));
          return [...extra, ...merged];
        });
        setClassifications(classificationList);
      } catch (e) {
        if (e instanceof Error && /認証/.test(e.message)) clearBootCache();
        setError(e instanceof Error ? e.message : "データの読み込みに失敗しました。再読み込みしてください。");
      } finally {
        setCasesLoading(false);
        setLoading(false);
      }
    })();
  }, []);

  // スマホでは、個人メモの最新の内容を端末に保存しておく（次回の起動を速くするため。個人メモのみ）
  useEffect(() => {
    if (!currentUser || !window.matchMedia("(max-width: 767px)").matches) return;
    const memo = cases.find((c) => c.isPrivate);
    if (!memo) return;
    const t = window.setTimeout(() => saveBootCache(currentUser, memo), 1000);
    return () => window.clearTimeout(t);
  }, [cases, currentUser]);

  const selectedCase = cases.find((c) => c.id === selectedId) || null;

  // ── 未送信の個人メモの自動送信（v29）──
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(true);
  const flushing = useRef(false);
  useEffect(() => {
    setOnline(navigator.onLine);
    const refresh = () => setPendingCount(getPendingMemos().length);
    refresh();
    const unsub = subscribePending(refresh);
    const flush = async () => {
      if (flushing.current || !navigator.onLine) return;
      const list = getPendingMemos();
      if (list.length === 0) return;
      flushing.current = true;
      try {
        for (const m of list) {
          try {
            const updated = await api.addClaimMemo(m.caseId, m.content, m.lane);
            removePendingMemo(m.id);
            setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          } catch (e) {
            if (isNetworkFailure(e)) break; // まだつながらない。次の機会に再送する
            removePendingMemo(m.id); // 送信先が見つからない等、再送しても通らないものは取り除き、内容を通知する
            setError(`未送信だったメモを送信できませんでした。内容：${m.content.slice(0, 60)}`);
          }
        }
      } finally {
        flushing.current = false;
      }
    };
    const onOnline = () => {
      setOnline(true);
      flush();
    };
    const onOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") flush();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(flush, 20000); // 電波が弱くonlineイベントが来ない場合に備えて定期的に再送する
    flush();
    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);
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

  const unhideAllCases = async () => {
    try {
      await api.unhideAllCases();
      setCases((prev) => prev.map((c) => (c.hidden ? { ...c, hidden: false } : c)));
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
    const sorted = sortCasesByCaseNumber(list);
    // v14：自分の個人メモはよく使うため、一覧の先頭に固定表示する
    const myMemoIdx = sorted.findIndex((c) => c.isPrivate && c.ownerId === currentUser?.id);
    if (myMemoIdx > 0) {
      const [memo] = sorted.splice(myMemoIdx, 1);
      sorted.unshift(memo);
    }
    return sorted;
  }, [cases, ballFilter, showHiddenCases, searchQuery, currentUser]);

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
    clearBootCache(); // 端末に保存した個人メモを消してからログアウトする
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

  // スマホ用メニュー（プルダウン／よく使うボタン）の選択処理
  const isMemoActive = view === "list" && !!selectedCase?.isPrivate;
  const mobileMenuValue = isMemoActive ? "memo" : view;
  const goMobile = (value: string) => {
    if (value === "memo") {
      openPrivateMemo();
      return;
    }
    if (value === "list") setSelectedId(null);
    setView(value as View);
  };

  return (
    <div className="app-shell flex flex-col" style={{ overflow: "hidden", backgroundColor: COLORS.paper, fontFamily: FONT_GOTHIC, color: COLORS.ink }}>
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
          <button onClick={doLogout} className="p-1.5 rounded hover:opacity-80" style={{ color: COLORS.brassLight }} title="ログアウト">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* スマホ用メニュー：横スクロールをやめ、よく使う画面のボタンとプルダウンにまとめる */}
      <nav className="md:hidden flex flex-col gap-2 px-3 py-2 flex-shrink-0" style={{ backgroundColor: COLORS.brass }}>
        <div className="grid grid-cols-3 gap-2">
          {[
            ...(personTabs.length > 0 ? [{ id: `person:${currentUser.displayName}`, label: personTabs.includes(currentUser.displayName) ? currentUser.displayName : personTabs[0], icon: UserIcon, active: view.startsWith("person:") }] : []),
            { id: "memo", label: "個人メモ", icon: StickyNote, active: isMemoActive },
            { id: "expenses", label: "経費入力", icon: Wallet, active: view === "expenses" },
          ].map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.id}
                onClick={() => goMobile(q.id === `person:${currentUser.displayName}` && !personTabs.includes(currentUser.displayName) ? `person:${personTabs[0]}` : q.id)}
                className="flex items-center justify-center gap-1.5 text-sm font-bold py-2.5 rounded"
                style={{ backgroundColor: q.active ? "#fff" : "rgba(255,255,255,0.18)", color: q.active ? COLORS.navy : "#fff" }}
              >
                <Icon size={15} /> {q.label}
              </button>
            );
          })}
        </div>
        <select
          value={mobileMenuValue}
          onChange={(e) => goMobile(e.target.value)}
          className="w-full rounded px-3 py-2.5 font-bold outline-none"
          style={{ backgroundColor: COLORS.navyLight, color: "#fff", border: "none" }}
          aria-label="メニュー"
        >
          <optgroup label="個人">
            {personTabs.map((name) => <option key={name} value={`person:${name}`}>{name}</option>)}
            <option value="memo">個人メモ</option>
          </optgroup>
          <optgroup label="メニュー">
            {MAIN_TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </optgroup>
        </select>
      </nav>

      <nav className="hidden md:flex items-center gap-1 px-5 flex-shrink-0 overflow-x-auto" style={{ backgroundColor: COLORS.brass }}>
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
        <button
          onClick={openPrivateMemo}
          className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 transition whitespace-nowrap"
          style={{ color: "#fff", opacity: 0.85 }}
          title="個人メモ（自分しか見えません）"
        >
          <StickyNote size={15} /> 個人メモ
        </button>
      </nav>

      <nav className="hidden md:flex items-center gap-1 px-5 flex-shrink-0 overflow-x-auto" style={{ backgroundColor: COLORS.navyLight }}>
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

      {casesLoading && (
        <div className="px-4 py-1.5 text-xs flex-shrink-0 flex items-center gap-2" style={{ backgroundColor: COLORS.paper, color: COLORS.slate, borderBottom: `1px solid ${COLORS.brassLight}` }}>
          <Loader2 className="animate-spin" size={12} /> 案件データを読み込み中です。個人メモはすぐにご利用いただけます。
        </div>
      )}

      {(!online || pendingCount > 0) && (
        <div className="px-4 py-1.5 text-xs flex-shrink-0" style={{ backgroundColor: "#FBF3E0", color: COLORS.amber }}>
          {!online ? "オフラインです。個人メモは端末に一時保存され、電波がつながると自動で送信されます。" : ""}
          {pendingCount > 0 ? `未送信のメモが${pendingCount}件あります。電波がつながると自動で送信します。` : ""}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm flex-shrink-0" style={{ backgroundColor: "#F3DEDC", color: COLORS.vermillion }}>
          <AlertTriangle size={16} />
          {error}
          <button onClick={() => setError("")} className="ml-auto underline text-xs">閉じる</button>
        </div>
      )}

      {view === "list" && (
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden" style={resizingSidebar ? { cursor: "col-resize", userSelect: "none" } : undefined}>
          {/* スマホで個人メモを開いているときは、上半分の案件一覧は出さず個人メモだけを表示する */}
          {(isDesktopLayout || !isMemoActive) && (
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
              onUnhideAll={unhideAllCases}
              onNewCase={() => {
                setNewCaseClientId(null);
                setShowNewCaseModal(true);
              }}
              widthPx={isDesktopLayout ? sidebarWidth : undefined}
            />
          )}
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
        <ClientsView
          cases={cases}
          onOpenCase={openCaseFromElsewhere}
          onNewCaseForClient={(clientId) => {
            setNewCaseClientId(clientId);
            setShowNewCaseModal(true);
          }}
          onError={setError}
          initialClientId={pendingClientId}
        />
      )}

      {view === "passwords" && <PasswordsView onError={setError} />}

      {PERSONAL_TASK_TABS.map(
        (name) =>
          view === `person:${name}` && (
            <PersonalTaskView key={name} personName={name} cases={cases} onError={setError} onOpenCase={openCaseFromElsewhere} currentUserName={currentUser.displayName} isAdmin={isAdmin} />
          )
      )}

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

      {view === "goals" && <GoalsView currentUser={currentUser} onError={setError} />}

      {view === "knowledge" && (
        <KnowledgeView classifications={classifications} onAddClassification={addClassification} onError={setError} />
      )}

      {view === "billing" && <BillingView onOpenCase={openCaseFromElsewhere} onOpenClient={openClientFromCase} onError={setError} />}

      {view === "expenses" && (
        <ExpenseBoardView cases={cases} onOpenCase={openCaseFromElsewhere} onCaseUpdated={updateCaseInState} onError={setError} currentUserName={currentUser.displayName} isAdmin={isAdmin} />
      )}

      {view === "settings" && <SettingsView currentUser={currentUser} onError={setError} />}

      {showNewCaseModal && (
        <NewCaseModal
          suggestedCaseNumber={suggestedCaseNumber(cases.map((c) => c.caseNumber))}
          cases={cases}
          initialClientId={newCaseClientId ?? undefined}
          onClose={() => {
            setShowNewCaseModal(false);
            setNewCaseClientId(null);
          }}
          onCreated={addCaseToState}
          onError={setError}
        />
      )}
    </div>
  );
}
