export interface Hearing {
  id: string;
  date: string;
  content: string;
  docDeadline: string;
  nextHearingDate: string;
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
  billedInInvoiceId: string | null;
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

export interface CustomField {
  label: string;
  value: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  clientName: string;
  clientId: string;

  stage: string;
  closedDate: string;
  priority: string;
  ballOwner: string;
  ballAssignee: string;
  hidden: boolean;
  deadline: string;
  isTimeChargeCase: boolean;
  timeChargeRate: number | null;
  customFields: CustomField[];

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
  startTime: string;
  endTime: string;
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
  workHours: string;
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
  memo: string;
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
  blobUrl: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  updatedAt: string;
}

export interface CaseClassification {
  id: string;
  name: string;
  createdAt: string;
}

export interface InvoiceSectionItem {
  id: string;
  description: string;
  amount: number;
}

export interface InvoiceSection {
  id: string;
  type: string; // "弁護士報酬" | "実費お預かり金" | "実費ご返金" | "その他"
  customTypeLabel: string;
  applyTax: boolean;
  applyWithholding: boolean;
  items: InvoiceSectionItem[];
}

export interface InvoiceTimeChargeRow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  content: string;
  personName: string;
}

export interface InvoiceExpenseRow {
  id: string;
  date: string;
  category: string;
  amount: number;
  notes: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: number;
  caseId: string;
  clientName: string;
  caseTitle: string;
  issueDate: string;
  honorific: string;
  dueDate: string;
  notes: string;
  paid: boolean;
  paidAt: string;
  createdAt: string;
  sections: InvoiceSection[];
  timeCharges: InvoiceTimeChargeRow[];
  expenses: InvoiceExpenseRow[];
}

export interface User {
  id: string;
  loginId: string;
  email: string;
  displayName: string;
  role: string;
  createdAt?: string;
}
