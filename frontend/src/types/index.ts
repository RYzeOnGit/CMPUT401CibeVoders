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
  created_at: string;
  updated_at: string;
  derived_resumes?: Resume[];
}

export interface ResumeContent {
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  experience?: Experience[];
  skills?: string[];
  education?: Education;
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

