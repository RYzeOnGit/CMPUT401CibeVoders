/** TypeScript types for the application */

export type ApplicationStatus = 'Applied' | 'Interview' | 'Offer' | 'Rejected';

export type CommunicationType = 'Interview Invite' | 'Rejection' | 'Offer' | 'Note';

export type ReminderType = 'Follow-up' | 'Interview Prep' | 'Other';

export interface Application {
  id: number;
  company_name: string;
  role_title: string;
  date_applied: string;
  status: ApplicationStatus;
  source?: string;
  location?: string;
  duration?: string;
  notes?: string;
  resume_id?: number;
  created_at: string;
  updated_at: string;
}

export interface ApplicationCreate {
  company_name: string;
  role_title: string;
  date_applied: string;
  status?: ApplicationStatus;
  source?: string;
  location?: string;
  duration?: string;
  notes?: string;
  resume_id?: number;
}

export interface ApplicationUpdate {
  company_name?: string;
  role_title?: string;
  date_applied?: string;
  status?: ApplicationStatus;
  source?: string;
  location?: string;
  duration?: string;
  notes?: string;
  resume_id?: number;
}

export interface Resume {
  id: number;
  name: string;
  is_master: boolean;
  master_resume_id?: number;
  content: ResumeContent;
  version_history: ResumeVersion[];
  file_type?: string;  // MIME type of uploaded file (application/pdf, etc.)
  latex_content?: string;  // LaTeX representation of the resume
  created_at: string;
  updated_at: string;
  derived_resumes?: Resume[];
}

export type SectionType = 'text' | 'bullet-points' | 'list' | 'education';

export type BulletPointType = 'work-experience' | 'projects' | 'generic';

export interface GenericSection {
  id: string; // Unique identifier for the section
  type: SectionType;
  name: string; // User-defined name (e.g., "Work Experience", "Projects", "Summary")
  data: SectionData;
  bulletPointType?: BulletPointType; // Only used when type is 'bullet-points'
}

export type SectionData = 
  | { type: 'text'; content: string }
  | { type: 'bullet-points'; items: BulletPointItem[] }
  | { type: 'list'; items: string[] }
  | { type: 'education'; degree: string; university: string; year: string; description?: string };

export interface BulletPointItem {
  company?: string;
  role?: string;
  duration?: string;
  description?: string;
}

export interface ResumeContent {
  name?: string;
  email?: string;
  phone?: string;
  // Legacy fields for backward compatibility
  summary?: string;
  experience?: Experience[];
  skills?: string[];
  education?: Education;
  // New generic sections system
  sections?: GenericSection[];
  // Section preferences
  activeSections?: string[]; // Array of section IDs that should be displayed
  sectionOrder?: string[]; // Order in which sections should be displayed (by ID)
}

export interface Experience {
  company: string;
  role: string;
  duration: string;
  bullet_points: string[];
}

export interface Education {
  degree: string;
  university: string;
  year: string;
}

export interface ResumeVersion {
  timestamp: string;
  content: ResumeContent;
}

export interface ResumeCreate {
  name: string;
  is_master: boolean;
  master_resume_id?: number;
  content: ResumeContent;
  version_history?: ResumeVersion[];
}

export interface ResumeUpdate {
  name?: string;
  content?: ResumeContent;
}

export interface Communication {
  id: number;
  application_id: number;
  type: CommunicationType;
  message?: string;
  timestamp: string;
  created_at: string;
}

export interface CommunicationCreate {
  application_id: number;
  type: CommunicationType;
  message?: string;
  timestamp: string;
}

export interface Reminder {
  id: number;
  application_id: number;
  type: ReminderType;
  message?: string;
  due_date: string;
  is_completed: boolean;
  created_at: string;
}

export interface ReminderCreate {
  application_id: number;
  type: ReminderType;
  message?: string;
  due_date: string;
  is_completed?: boolean;
}

export interface ReminderUpdate {
  is_completed?: boolean;
  message?: string;
}

export interface AutofillParseRequest {
  url?: string;
  text?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatSession {
  id: number;
  title: string;
  mode: 'critique' | 'interview';
  resume_id?: number;
  application_id?: number;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatSessionCreate {
  title?: string;
  mode: 'critique' | 'interview';
  resume_id?: number;
  application_id?: number;
}

export interface ChatSessionUpdate {
  title?: string;
  messages?: ChatMessage[];
}

// Response Tracking types
export interface ResponseTrackingSummary {
  application_id: number;
  company_name: string;
  role_title: string;
  total_responses: number;
  interview_invites: number;
  rejections: number;
  offers: number;
  latest_response_date?: string;
  latest_response_type?: string;
  status: ApplicationStatus;
}

export interface GlobalResponseStatistics {
  total_applications: number;
  total_communications: number;
  total_interview_invites: number;
  total_rejections: number;
  total_offers: number;
  response_rate: number; // Percentage
  interview_rate: number; // Percentage
  offer_rate: number; // Percentage
}
