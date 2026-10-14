
export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  description: string;
  requirements: string;
  postedDate: string;
  status: 'Open' | 'Closed';
}

export interface AnalysisResult {
  matchScore: number;
  candidateName: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  // Includes Arabic values for the new system
  recommendation: 'Highly Recommended' | 'Recommended' | 'Consider' | 'Not Recommended' | 'موصى به بشدة' | 'موصى به' | 'يستحق النظر' | 'غير موصى به';
  interviewQuestions: string[];
  bestFitJobId?: string; // New field for Auto-Match
  suitableField?: string; // New field for AI suggested specialization
  contactInfo?: {
    email: string;
    phone: string;
  };
  // New Fields for Smart Report
  currentLocation?: string;
  educationLevel?: string;
  // Identity Check
  identityMismatch?: boolean;
  identityMismatchReason?: string;
}

export type CandidateStage = 'New' | 'InterviewWait' | 'InterviewScheduled' | 'FinalReview' | 'Rejected';

export interface LogEntry {
  id: string;
  timestamp: string;
  action: string; // e.g., "Sent Initial Message"
  details: string; // The actual message sent or notes
  channel: 'WhatsApp' | 'Email' | 'System';
  stageBefore: CandidateStage;
  stageAfter: CandidateStage;
}

export interface CandidateInput {
  id: string;
  name: string; // Internal identifier or manual name
  cvFile: File | null;
  appFormFile: File | null;
  externalCvLink?: string; // Link to CV from Google Forms
  status: 'idle' | 'analyzing' | 'success' | 'error';
  result?: AnalysisResult;
  errorMessage?: string;
  // UI-only state: last persistence failure. Do not write this to Firestore.
  saveIssue?: string;
  // New Workflow Fields
  stage: CandidateStage;
  logs: LogEntry[];
  manualContact?: {
    email: string;
    phone: string;
  };
  // Job Info (added for Dashboard view)
  jobId?: string;
  jobTitle?: string;
}

export interface Candidate {
  id: string;
  name: string;
  jobId: string;
  fileName: string;
  analysis?: AnalysisResult;
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: 'initial' | 'interview' | 'rejection' | 'reschedule' | 'cancellation' | 'offer_id_request' | 'offer_review' | 'complete_file';
  subject: string; // For Email
  body: string; // For Email & WhatsApp
  variables: string[]; // e.g. ['{name}', '{job_title}']
}

export enum ReportType {
  PERFORMANCE_REVIEW = 'PERFORMANCE_REVIEW',
  EXCEL_HELPER = 'EXCEL_HELPER',
  DOCUMENT_GENERATION = 'DOCUMENT_GENERATION'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
