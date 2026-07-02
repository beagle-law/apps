export interface Hearing {
  id: string;
  date: string;
  time: string;
  location: string;
  url: string;
  purpose: string;
  notes: string;
}

export interface CaseTask {
  id: string;
  description: string;
  assignee: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

export interface Question {
  id: string;
  text: string;
  status: string;
  createdAt: string;
}

export interface CaseDocument {
  id: string;
  name: string;
  status: string;
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
  email: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  clientName: string;
  caseCategory: string;
  stage: string;
  responseTypes: string[];
  priority: string;
  ballOwner: string;
  teamMembers: string[];
  deadline: string;

  courtCaseNumber: string;
  opposingCounselName: string;
  opposingCounselAffiliation: string;
  opposingCounselPhone: string;
  opposingCounselEmail: string;
  courtClerkName: string;
  courtClerkAffiliation: string;
  courtClerkPhone: string;
  courtClerkEmail: string;

  poaStatus: string;
  contractStatus: string;
  retainerStatus: string;

  createdAt: string;
  updatedAt: string;

  hearings: Hearing[];
  tasks: CaseTask[];
  questions: Question[];
  documents: CaseDocument[];
  updates: UpdateLog[];
}

export const emptyContact = (): Contact => ({ name: "", affiliation: "", phone: "", email: "" });
