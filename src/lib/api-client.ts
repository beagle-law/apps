import type {
  Case,
  Contact,
  Client,
  ExpenseWithCase,
  PasswordEntry,
  TimeCharge,
  DailyReport,
  GoalRecord,
  KnowhowEntry,
  KnowhowImage,
  Template,
  Invoice,
  User,
  CustomField,
  CaseClassification,
} from "@/lib/types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `リクエストに失敗しました (${res.status})`);
  }
  return res.json();
}

// ── 認証 ──────────────────────────────────────────
export const login = (loginId: string, password: string) =>
  request<{ ok: true; user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ loginId, password }) });
export const logout = () => request<{ ok: true }>("/api/auth/logout", { method: "POST" });
export const fetchMe = () => request<{ user: User }>("/api/auth/me");
export const changePassword = (currentPassword: string, newPassword: string) =>
  request<{ ok: true }>("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });

// ── ユーザー管理（admin）──────────────────────────
export const fetchUsers = () => request<User[]>("/api/users");
export const createUser = (payload: { loginId: string; email: string; displayName: string; password: string; role?: string }) =>
  request<User>("/api/users", { method: "POST", body: JSON.stringify(payload) });
export const deleteUser = (id: string) => request<{ ok: true }>(`/api/users/${id}`, { method: "DELETE" });
export const resetUserPassword = (id: string, newPassword: string) =>
  request<{ ok: true }>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ newPassword }) });

// ── 案件 ──────────────────────────────────────────
export const fetchCases = () => request<Case[]>("/api/cases");

export const createCase = (payload: {
  caseNumber?: string;
  title: string;
  clientName: string;
  clientId?: string;
  deadline?: string;
  priority?: string;
  initialNote?: string;
  author?: string;
  isTimeChargeCase?: boolean;
}) => request<Case>("/api/cases", { method: "POST", body: JSON.stringify(payload) });

export const patchCase = (
  id: string,
  payload: Partial<{
    title: string;
    caseNumber: string;
    stage: string;
    priority: string;
    ballOwner: string;
    ballAssignee: string;
    hidden: boolean;
    deadline: string;
    courtCaseNumber: string;
    courtClerk: Partial<Contact>;
    poaStatus: string;
    contractStatus: string;
    retainerStatus: string;
    isTimeChargeCase: boolean;
    timeChargeRate: number | null;
    autoNote: string;
    author: string;
  }>
) => request<Case>(`/api/cases/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

export const deleteCaseApi = (id: string) => request<{ ok: true }>(`/api/cases/${id}`, { method: "DELETE" });

export const patchFinance = (
  id: string,
  payload: Partial<{
    caseClassification: string;
    opposingParty: string;
    opposingPartyPhone: string;
    opposingPartyContactMethod: string;
    opposingCounselOffice: string;
    opposingCounselPersonName: string;
    opposingCounselPhone: string;
    opposingCounselFax: string;
    opposingCounselEmail: string;
    opposingCounselContactMethod: string;
    engagementDate: string;
    litigationEngagementDate: string;
    noticeSentDate: string;
    filingDate: string;
    closedDate: string;
    claimAmount: number | "";
    retainerFee: number | "";
    expectedFee: number | "";
    expectedFeeDate: string;
    customFields: CustomField[];
  }>
) => request<Case>(`/api/cases/${id}/finance`, { method: "PATCH", body: JSON.stringify(payload) });

// v13：主張予定メモを単一テキストから積み重ね式の一覧に変更（経過記録と同様のパターン）。
export const addClaimMemo = (id: string, content: string) =>
  request<Case>(`/api/cases/${id}/claim-memos`, { method: "POST", body: JSON.stringify({ content }) });

export const updateClaimMemo = (id: string, memoId: string, content: string) =>
  request<Case>(`/api/cases/${id}/claim-memos/${memoId}`, { method: "PATCH", body: JSON.stringify({ content }) });

export const deleteClaimMemo = (id: string, memoId: string) =>
  request<Case>(`/api/cases/${id}/claim-memos/${memoId}`, { method: "DELETE" });

export const addUpdate = (id: string, note: string) =>
  request<Case>(`/api/cases/${id}/updates`, { method: "POST", body: JSON.stringify({ note }) });

export const deleteUpdate = (id: string, updateId: string) =>
  request<Case>(`/api/cases/${id}/updates/${updateId}`, { method: "DELETE" });

export const addHearing = (
  id: string,
  payload: { date: string; content: string; docDeadline?: string; nextHearingDate?: string }
) => request<Case>(`/api/cases/${id}/hearings`, { method: "POST", body: JSON.stringify(payload) });

export const updateHearing = (
  id: string,
  hearingId: string,
  payload: Partial<{ date: string; content: string; docDeadline: string; nextHearingDate: string }>
) => request<Case>(`/api/cases/${id}/hearings/${hearingId}`, { method: "PATCH", body: JSON.stringify(payload) });

export const deleteHearing = (id: string, hearingId: string) =>
  request<Case>(`/api/cases/${id}/hearings/${hearingId}`, { method: "DELETE" });

export const addExpense = (
  id: string,
  payload: { date: string; amount: number; category: string; origin?: string; destination?: string; route?: string; notes?: string }
) => request<Case>(`/api/cases/${id}/expenses`, { method: "POST", body: JSON.stringify(payload) });

export const deleteExpense = (caseId: string, expenseId: string) =>
  request<Case>(`/api/cases/${caseId}/expenses/${expenseId}`, { method: "DELETE" });

export const setExpenseCheckedForBilling = (caseId: string, expenseId: string, checkedForBilling: boolean) =>
  request<Case>(`/api/cases/${caseId}/expenses/${expenseId}`, { method: "PATCH", body: JSON.stringify({ checkedForBilling }) });

export const fetchCaseTimeCharges = (caseId: string) =>
  request<TimeCharge[]>(`/api/cases/${caseId}/timecharges`);

// ── 案件分類 ──────────────────────────────────────────
export const fetchCaseClassifications = () => request<CaseClassification[]>("/api/case-classifications");
export const addCaseClassification = (name: string) =>
  request<CaseClassification>("/api/case-classifications", { method: "POST", body: JSON.stringify({ name }) });

// ── 顧客 ──────────────────────────────────────────
export const fetchClients = () => request<Client[]>("/api/clients");
export const createClient = (payload: Partial<Omit<Client, "id" | "clientNumber" | "createdAt">> & { companyName: string }) =>
  request<Client>("/api/clients", { method: "POST", body: JSON.stringify(payload) });
export const patchClient = (id: string, payload: Partial<Omit<Client, "id" | "clientNumber" | "createdAt">>) =>
  request<Client>(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteClientApi = (id: string) => request<{ ok: true }>(`/api/clients/${id}`, { method: "DELETE" });

// v12 4.1：顧客詳細の実費履歴・タイムチャージ合算（請求書機能の顧客紐づけ化）
export const fetchClientExpenseHistory = (clientId: string) =>
  request<ExpenseWithCase[]>(`/api/clients/${clientId}/expenses`);
export const selectAllClientExpenses = (clientId: string, checked: boolean) =>
  request<{ ok: true }>(`/api/clients/${clientId}/expenses/select-all`, { method: "POST", body: JSON.stringify({ checked }) });
export const fetchClientUnbilledTimeCharges = (clientId: string) =>
  request<TimeCharge[]>(`/api/clients/${clientId}/timecharges/unbilled`);

// ── パスワード管理 ──────────────────────────────────
export const fetchPasswords = () => request<PasswordEntry[]>("/api/passwords");
export const createPassword = (payload: Omit<PasswordEntry, "id" | "createdAt">) =>
  request<PasswordEntry>("/api/passwords", { method: "POST", body: JSON.stringify(payload) });
export const patchPassword = (id: string, payload: Partial<Omit<PasswordEntry, "id" | "createdAt">>) =>
  request<PasswordEntry>(`/api/passwords/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deletePassword = (id: string) => request<{ ok: true }>(`/api/passwords/${id}`, { method: "DELETE" });

// ── タイムチャージ・日報 ──────────────────────────
export const addTimeCharge = (payload: { date: string; caseId: string; startTime?: string; endTime?: string; hours: number; content?: string }) =>
  request<TimeCharge>("/api/timecharges", { method: "POST", body: JSON.stringify(payload) });
export const deleteTimeCharge = (id: string) => request<{ ok: true }>(`/api/timecharges/${id}`, { method: "DELETE" });

export const addDailyReport = (payload: {
  date: string;
  caseId?: string;
  mostImportant: string;
  todayTasks: string;
  waitingCases: string;
  workHours: string;
  remainingTasks: string;
  todaySuccess: string;
}) => request<DailyReport>("/api/dailyreports", { method: "POST", body: JSON.stringify(payload) });
export const deleteDailyReport = (id: string) => request<{ ok: true }>(`/api/dailyreports/${id}`, { method: "DELETE" });
export const updateDailyReport = (
  id: string,
  payload: Partial<{ mostImportant: string; todayTasks: string; waitingCases: string; workHours: string; remainingTasks: string; todaySuccess: string }>
) => request<DailyReport>(`/api/dailyreports/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

// ── 個人別サマリー ──────────────────────────────────
export interface PersonalSummary {
  personName: string;
  timeCharges: (TimeCharge & { case: { id: string; title: string; caseNumber: string } })[];
  dailyReports: DailyReport[] | null;
}
export const fetchPersonalSummary = (name: string) => request<PersonalSummary>(`/api/personal/${encodeURIComponent(name)}/summary`);

// ── 請求書（v12：顧客に紐づけて作成） ──────────────────
export const fetchInvoices = (opts?: { clientId?: string; caseId?: string }) => {
  const params = new URLSearchParams();
  if (opts?.clientId) params.set("clientId", opts.clientId);
  if (opts?.caseId) params.set("caseId", opts.caseId);
  const qs = params.toString();
  return request<Invoice[]>(`/api/invoices${qs ? `?${qs}` : ""}`);
};
export const createInvoice = (payload: {
  clientId: string;
  addressee?: string;
  issueDate: string;
  billingMonth?: string;
  honorific?: string;
  dueDate?: string;
  sections: {
    type: string;
    customTypeLabel?: string;
    applyTax?: boolean;
    applyWithholding?: boolean;
    items: { description: string; amount: number }[];
  }[];
  notes?: string;
  billTimeChargeIds?: string[];
  billExpenseIds?: string[];
}) => request<Invoice>("/api/invoices", { method: "POST", body: JSON.stringify(payload) });
export const deleteInvoice = (id: string) => request<{ ok: true }>(`/api/invoices/${id}`, { method: "DELETE" });
export const markInvoicePaid = (id: string, paid: boolean) =>
  request<Invoice>(`/api/invoices/${id}/mark-paid`, { method: "POST", body: JSON.stringify({ paid }) });

// ── 目標 ──────────────────────────────────────────
export const fetchGoalRecords = () => request<GoalRecord[]>("/api/goals");
export const ensureGoalRecord = (key: string, yearMonth: string) => request<GoalRecord>(`/api/goals/${key}/${yearMonth}`);
export const setGoalOverallPercent = (key: string, yearMonth: string, overallPercent: string) =>
  request<GoalRecord>(`/api/goals/${key}/${yearMonth}`, { method: "PATCH", body: JSON.stringify({ overallPercent }) });
export const setGoalMemo = (key: string, yearMonth: string, memo: string) =>
  request<GoalRecord>(`/api/goals/${key}/${yearMonth}`, { method: "PATCH", body: JSON.stringify({ memo }) });
export const addGoalItem = (key: string, yearMonth: string, text: string) =>
  request<GoalRecord["items"][number]>(`/api/goals/${key}/${yearMonth}/items`, { method: "POST", body: JSON.stringify({ text }) });
export const removeGoalItem = (key: string, yearMonth: string, itemId: string) =>
  request<{ ok: true }>(`/api/goals/${key}/${yearMonth}/items/${itemId}`, { method: "DELETE" });
export const updateGoalItem = (key: string, yearMonth: string, itemId: string, payload: { result?: string; note?: string }) =>
  request<GoalRecord["items"][number]>(`/api/goals/${key}/${yearMonth}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

// ── ノウハウ・ひながた ──────────────────────────────
export const fetchKnowhow = () => request<KnowhowEntry[]>("/api/knowhow");
export const addKnowhow = (payload: { category: string; title: string; content?: string }) =>
  request<KnowhowEntry>("/api/knowhow", { method: "POST", body: JSON.stringify(payload) });
export const updateKnowhow = (id: string, payload: Partial<{ category: string; title: string; content: string }>) =>
  request<KnowhowEntry>(`/api/knowhow/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteKnowhow = (id: string) => request<{ ok: true }>(`/api/knowhow/${id}`, { method: "DELETE" });

// v13：ノウハウへのスクリーンショット等の画像添付
export const uploadKnowhowImage = async (knowhowId: string, file: File): Promise<KnowhowImage> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/knowhow/${knowhowId}/images`, { method: "POST", body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `アップロードに失敗しました (${res.status})`);
  }
  return res.json();
};
export const deleteKnowhowImage = (knowhowId: string, imageId: string) =>
  request<{ ok: true }>(`/api/knowhow/${knowhowId}/images/${imageId}`, { method: "DELETE" });

export const fetchTemplates = () => request<Template[]>("/api/templates");
export const addTemplate = (name: string) => request<Template>("/api/templates", { method: "POST", body: JSON.stringify({ name }) });
export const uploadTemplateFile = async (id: string, file: File): Promise<Template> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/templates/${id}/upload`, { method: "POST", body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `アップロードに失敗しました (${res.status})`);
  }
  return res.json();
};
export const deleteTemplate = (id: string) => request<{ ok: true }>(`/api/templates/${id}`, { method: "DELETE" });

// ── AI（経路自動計算） ────────────────────────────────
export const aiCalculateRoute = (origin: string, destination: string) =>
  request<{ route: string; fare: number; duration_minutes: number }>("/api/ai/calculate-route", {
    method: "POST",
    body: JSON.stringify({ origin, destination }),
  });

// ── 個人メモ案件 ──────────────────────────────────────
export const fetchOrCreateMemoCase = () => request<Case>("/api/memo");

// ── バックアップ ──────────────────────────────────────
export const backupUrl = "/api/backup";
