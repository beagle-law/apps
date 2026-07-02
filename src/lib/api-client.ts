import type { Case, Contact } from "@/lib/types";

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

export const fetchCases = () => request<Case[]>("/api/cases");

export const createCase = (payload: {
  caseNumber?: string;
  title: string;
  clientName: string;
  caseCategory: string;
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
    caseCategory: string;
    responseTypes: string[];
    priority: string;
    ballOwner: string;
    teamMembers: string[];
    deadline: string;
    courtCaseNumber: string;
    opposingCounsel: Partial<Contact>;
    courtClerk: Partial<Contact>;
    poaStatus: string;
    contractStatus: string;
    retainerStatus: string;
    autoNote: string;
    author: string;
  }>
) => request<Case>(`/api/cases/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

export const deleteCaseApi = (id: string) =>
  request<{ ok: true }>(`/api/cases/${id}`, { method: "DELETE" });

export const addUpdate = (id: string, note: string, author: string) =>
  request<Case>(`/api/cases/${id}/updates`, { method: "POST", body: JSON.stringify({ note, author }) });

export const addHearing = (
  id: string,
  payload: { date: string; time?: string; purpose: string; location?: string; url?: string; notes?: string }
) => request<Case>(`/api/cases/${id}/hearings`, { method: "POST", body: JSON.stringify(payload) });

export const deleteHearing = (id: string, hearingId: string) =>
  request<Case>(`/api/cases/${id}/hearings/${hearingId}`, { method: "DELETE" });

export const addTask = (
  id: string,
  payload: { description: string; assignee?: string; dueDate?: string }
) => request<Case>(`/api/cases/${id}/tasks`, { method: "POST", body: JSON.stringify(payload) });

export const patchTaskStatus = (caseId: string, taskId: string, status: string) =>
  request<Case>(`/api/cases/${caseId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const deleteTask = (caseId: string, taskId: string) =>
  request<Case>(`/api/cases/${caseId}/tasks/${taskId}`, { method: "DELETE" });

export const addQuestion = (id: string, text: string) =>
  request<Case>(`/api/cases/${id}/questions`, { method: "POST", body: JSON.stringify({ text }) });

export const patchQuestionStatus = (caseId: string, questionId: string, status: string) =>
  request<Case>(`/api/cases/${caseId}/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const addDocument = (id: string, name: string) =>
  request<Case>(`/api/cases/${id}/documents`, { method: "POST", body: JSON.stringify({ name }) });

export const patchDocumentStatus = (caseId: string, documentId: string, status: string) =>
  request<Case>(`/api/cases/${caseId}/documents/${documentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const deleteDocument = (caseId: string, documentId: string) =>
  request<Case>(`/api/cases/${caseId}/documents/${documentId}`, { method: "DELETE" });

export const logout = () => request<{ ok: true }>("/api/auth/logout", { method: "POST" });
