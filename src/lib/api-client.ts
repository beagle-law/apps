import type {
  Case,
  Contact,
  Client,
  PasswordEntry,
  TimeCharge,
  DailyReport,
  GoalRecord,
  KnowhowEntry,
  Template,
  Invoice,
  User,
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
  teamMember?: string;
  deadline?: string;
  priority?: string;
  initialNote?: string;
  author?: string;
}) => request<Case>("/api/cases", { method: "POST", body: JSON.stringify(payload) });

export const patchCase = (
  id: string,
  payload: Partial<{
    stage: string;
    priority: string;
    ballOwner: string;
    ballAssignee: string;
    hidden: boolean;
    teamMembers: string[];
    deadline: string;
    courtCaseNumber: string;
    courtClerk: Partial<Contact>;
    poaStatus: string;
    contractStatus: string;
    retainerStatus: string;
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
    claimAmount: number | "";
    retainerFee: number | "";
    expectedFee: number | "";
    expectedFeeDate: string;
  }>
) => request<Case>(`/api/cases/${id}/finance`, { method: "PATCH", body: JSON.stringify(payload) });

export const patchClaimMemo = (id: string, claimMemo: string) =>
  request<Case>(`/api/cases/${id}/claim-memo`, { method: "PATCH", body: JSON.stringify({ claimMemo }) });

export const addUpdate = (id: string, note: string) =>
  request<Case>(`/api/cases/${id}/updates`, { method: "POST", body: JSON.stringify({ note }) });

export const addHearing = (
  id: string,
  payload: { date: string; content: string; docDeadline?: string; nextHearingDate?: string }
) => request<Case>(`/api/cases/${id}/hearings`, { method: "POST", body: JSON.stringify(payload) });

export const deleteHearing = (id: string, hearingId: string) =>
  request<Case>(`/api/cases/${id}/hearings/${hearingId}`, { method: "DELETE" });

export const addTask = (
  id: string,
  payload: { description: string; assignee?: string; assignedBy?: string; dueDate?: string; points?: number | null }
) => request<Case>(`/api/cases/${id}/tasks`, { method: "POST", body: JSON.stringify(payload) });

export const patchTaskStatus = (caseId: string, taskId: string, status: string) =>
  request<Case>(`/api/cases/${caseId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ status }) });

export const patchTask = (
  caseId: string,
  taskId: string,
  payload: Partial<{ description: string; assignee: string; dueDate: string; points: number | null }>
) => request<Case>(`/api/cases/${caseId}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(payload) });

export const finishTask = (caseId: string, taskId: string) =>
  request<Case>(`/api/cases/${caseId}/tasks/${taskId}/finish`, { method: "POST" });

export const scoreTask = (caseId: string, taskId: string, score: number) =>
  request<Case>(`/api/cases/${caseId}/tasks/${taskId}/score`, { method: "POST", body: JSON.stringify({ score }) });

export const deleteTask = (caseId: string, taskId: string) =>
  request<Case>(`/api/cases/${caseId}/tasks/${taskId}`, { method: "DELETE" });

export const issueInstruction = (
  caseId: string,
  payload: { assignee: string; content: string; dueDate?: string; points?: number | null }
) => request<Case>(`/api/cases/${caseId}/instructions`, { method: "POST", body: JSON.stringify(payload) });

export const addExpense = (
  id: string,
  payload: { date: string; amount: number; category: string; origin?: string; destination?: string; route?: string; notes?: string }
) => request<Case>(`/api/cases/${id}/expenses`, { method: "POST", body: JSON.stringify(payload) });

export const deleteExpense = (caseId: string, expenseId: string) =>
  request<Case>(`/api/cases/${caseId}/expenses/${expenseId}`, { method: "DELETE" });

export const fetchUnbilledTimeCharges = (caseId: string) =>
  request<TimeCharge[]>(`/api/cases/${caseId}/timecharges/unbilled`);

// ── 顧客 ──────────────────────────────────────────
export const fetchClients = () => request<Client[]>("/api/clients");
export const createClient = (payload: Partial<Omit<Client, "id" | "clientNumber" | "createdAt">> & { companyName: string }) =>
  request<Client>("/api/clients", { method: "POST", body: JSON.stringify(payload) });
export const patchClient = (id: string, payload: Partial<Omit<Client, "id" | "clientNumber" | "createdAt">>) =>
  request<Client>(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteClientApi = (id: string) => request<{ ok: true }>(`/api/clients/${id}`, { method: "DELETE" });

// ── パスワード管理 ──────────────────────────────────
export const fetchPasswords = () => request<PasswordEntry[]>("/api/passwords");
export const createPassword = (payload: Omit<PasswordEntry, "id" | "createdAt">) =>
  request<PasswordEntry>("/api/passwords", { method: "POST", body: JSON.stringify(payload) });
export const patchPassword = (id: string, payload: Partial<Omit<PasswordEntry, "id" | "createdAt">>) =>
  request<PasswordEntry>(`/api/passwords/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deletePassword = (id: string) => request<{ ok: true }>(`/api/passwords/${id}`, { method: "DELETE" });

// ── タイムチャージ・日報 ──────────────────────────
export const addTimeCharge = (payload: { date: string; caseId: string; hours: number; content?: string }) =>
  request<TimeCharge>("/api/timecharges", { method: "POST", body: JSON.stringify(payload) });
export const deleteTimeCharge = (id: string) => request<{ ok: true }>(`/api/timecharges/${id}`, { method: "DELETE" });

export const addDailyReport = (payload: { date: string; content: string }) =>
  request<DailyReport>("/api/dailyreports", { method: "POST", body: JSON.stringify(payload) });
export const deleteDailyReport = (id: string) => request<{ ok: true }>(`/api/dailyreports/${id}`, { method: "DELETE" });

// ── 個人別サマリー ──────────────────────────────────
export interface PersonalSummary {
  personName: string;
  tasks: (Case["tasks"][number] & { case: { id: string; title: string; caseNumber: string } })[];
  waiting: (Case["tasks"][number] & { case: { id: string; title: string; caseNumber: string } })[];
  confirmations: (Case["tasks"][number] & { case: { id: string; title: string; caseNumber: string } })[];
  instructions: (Case["tasks"][number] & { case: { id: string; title: string; caseNumber: string } })[];
  timeCharges: (TimeCharge & { case: { id: string; title: string; caseNumber: string } })[];
  dailyReports: DailyReport[] | null;
}
export const fetchPersonalSummary = (name: string) => request<PersonalSummary>(`/api/personal/${encodeURIComponent(name)}/summary`);

// ── 請求書 ──────────────────────────────────────────
export const fetchInvoices = (caseId?: string) =>
  request<Invoice[]>(`/api/invoices${caseId ? `?caseId=${encodeURIComponent(caseId)}` : ""}`);
export const createInvoice = (payload: {
  caseId: string;
  issueDate: string;
  feeItems: { description: string; amount: number }[];
  applyTax: boolean;
  applyWithholding: boolean;
  expenseAmount: number;
  notes?: string;
  billTimeChargeIds?: string[];
}) => request<Invoice>("/api/invoices", { method: "POST", body: JSON.stringify(payload) });
export const deleteInvoice = (id: string) => request<{ ok: true }>(`/api/invoices/${id}`, { method: "DELETE" });
export const markInvoicePaid = (id: string, paid: boolean) =>
  request<Invoice>(`/api/invoices/${id}/mark-paid`, { method: "POST", body: JSON.stringify({ paid }) });

// ── 目標 ──────────────────────────────────────────
export const fetchGoalRecords = () => request<GoalRecord[]>("/api/goals");
export const ensureGoalRecord = (key: string, yearMonth: string) => request<GoalRecord>(`/api/goals/${key}/${yearMonth}`);
export const setGoalOverallPercent = (key: string, yearMonth: string, overallPercent: string) =>
  request<GoalRecord>(`/api/goals/${key}/${yearMonth}`, { method: "PATCH", body: JSON.stringify({ overallPercent }) });
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
export const deleteKnowhow = (id: string) => request<{ ok: true }>(`/api/knowhow/${id}`, { method: "DELETE" });

export const fetchTemplates = () => request<Template[]>("/api/templates");
export const addTemplate = (name: string) => request<Template>("/api/templates", { method: "POST", body: JSON.stringify({ name }) });
export const saveTemplateContent = (id: string, content: string) =>
  request<Template>(`/api/templates/${id}`, { method: "PATCH", body: JSON.stringify({ content }) });
export const deleteTemplate = (id: string) => request<{ ok: true }>(`/api/templates/${id}`, { method: "DELETE" });

// ── AI ──────────────────────────────────────────────
export interface AiExtractResult {
  matchedCaseNumber: string;
  expense: { date: string; category: string; amount: number; origin: string; destination: string; route: string; notes: string };
  title: string;
  clientName: string;
  stage: string;
  priority: string;
  teamMembers: string[];
  deadline: string;
  ballOwner: string;
  summary: string;
  tasks: { description: string; assignee: string; dueDate: string }[];
}
export const aiExtractCase = (text: string) =>
  request<AiExtractResult>("/api/ai/extract-case", { method: "POST", body: JSON.stringify({ text }) });

export const aiCalculateRoute = (origin: string, destination: string) =>
  request<{ route: string; fare: number; duration_minutes: number }>("/api/ai/calculate-route", {
    method: "POST",
    body: JSON.stringify({ origin, destination }),
  });

export const aiClientReport = (payload: {
  clientName: string;
  title: string;
  reportDate?: string;
  content: string;
  docDeadline?: string;
  nextHearingDate?: string;
}) => request<{ text: string }>("/api/ai/client-report", { method: "POST", body: JSON.stringify(payload) });

// ── 個人メモ案件 ──────────────────────────────────────
export const fetchOrCreateMemoCase = () => request<Case>("/api/memo");

// ── バックアップ ──────────────────────────────────────
export const backupUrl = "/api/backup";
