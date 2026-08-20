export interface Hearing {
  id: string;
  date: string;
  content: string;
  docDeadline: string;
  nextHearingDate: string;
  createdAt: string;
}

export interface CaseTask {
  id: string;
  description: string;
  assignee: string;
  assignedBy: string;
  status: string;
  dueDate: string;
  kind: string; // "task" | "waiting"
  waitingOn: string;
  handedBackFrom: string;
  sourceField: string | null;
  isInstruction: boolean;
  points: number | null;
  executionScore: number | null;
  completedAt: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  origin: string;
  destination: string;
  route: string;
  notes: string;
  createdAt: string;
}

export interface UpdateLog {
  id: string;
  timestamp: string;
  author: string;
  note: string;
  auto: boolean;
}

export interface Contact {
  name: string;
  affiliation: string;
  phone: string;
  fax: string;
  email: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  clientName: string;
  clientId: string;

  stage: string;
  priority: string;
  ballOwner: string;
  ballAssignee: string;
  hidden: boolean;
  teamMembers: string[];
  deadline: string;
  catchAllFor: string;

  ownerId: string;
  isPrivate: boolean;

  courtCaseNumber: string;
  courtClerk: Contact;

  poaStatus: string;
  contractStatus: string;
  retainerStatus: string;

  claimMemo: string;

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

  createdAt: string;
  updatedAt: string;

  hearings: Hearing[];
  tasks: CaseTask[];
  expenses: Expense[];
  updates: UpdateLog[];
}

export const emptyContact = (): Contact => ({ name: "", affiliation: "", phone: "", fax: "", email: "" });

export interface Client {
  id: string;
  clientNumber: number;
  companyName: string;
  clientType: string; // "法人" | "個人"
  address: string;
  contactName: string;
  phone: string;
  email: string;
  contactMethod: string;
  source: string; // "紹介" | "HP経由"
  referrerName: string;
  notes: string;
  createdAt: string;
}

export interface TimeCharge {
  id: string;
  personName: string;
  date: string;
  caseId: string;
  hours: number;
  content: string;
  billed: boolean;
  invoiceId: string | null;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  personName: string;
  date: string;
  caseId: string | null;
  mostImportant: string;
  todayTasks: string;
  waitingCases: string;
  todaySuccess: string;
  createdAt: string;
}

export interface PasswordEntry {
  id: string;
  category: string;
  service: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  createdAt: string;
}

export interface GoalItem {
  id: string;
  text: string;
  result: string;
  note: string;
}

export interface GoalRecord {
  id: string;
  key: string;
  yearMonth: string;
  overallPercent: string;
  items: GoalItem[];
}

export interface KnowhowEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  updatedAt: string;
}

export interface FeeItem {
  id: string;
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: number;
  caseId: string;
  clientName: string;
  caseTitle: string;
  issueDate: string;
  applyTax: boolean;
  applyWithholding: boolean;
  expenseAmount: number;
  notes: string;
  paid: boolean;
  paidAt: string;
  createdAt: string;
  feeItems: FeeItem[];
}

export interface User {
  id: string;
  loginId: string;
  email: string;
  displayName: string;
  role: string;
  createdAt?: string;
}
