/** API client for backend communication */
import axios from 'axios';
import type {
  Application,
  ApplicationCreate,
  ApplicationUpdate,
  Resume,
  ResumeCreate,
  ResumeUpdate,
  Communication,
  ChatSession,
  ChatSessionCreate,
  ChatSessionUpdate,
  CommunicationCreate,
  Reminder,
  ReminderCreate,
  ReminderUpdate,
  AutofillParseRequest,
  ResponseTrackingSummary,
  GlobalResponseStatistics,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Applications API
export const applicationsApi = {
  getAll: async (): Promise<Application[]> => {
    const response = await api.get<Application[]>('/api/applications');
    return response.data;
  },

  getById: async (id: number): Promise<Application> => {
    const response = await api.get<Application>(`/api/applications/${id}`);
    return response.data;
  },

  create: async (data: ApplicationCreate): Promise<Application> => {
    const response = await api.post<Application>('/api/applications', data);
    return response.data;
  },

  update: async (id: number, data: ApplicationUpdate): Promise<Application> => {
    const response = await api.patch<Application>(`/api/applications/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/applications/${id}`);
  },
};

// Autofill API
export const autofillApi = {
  parse: async (data: AutofillParseRequest): Promise<Application> => {
    const response = await api.post<Application>('/api/autofill/parse', data);
    return response.data;
  },
};

// Resumes API
export const resumesApi = {
  getAll: async (): Promise<Resume[]> => {
    const response = await api.get<Resume[]>('/api/resumes');
    return response.data;
  },

  getById: async (id: number): Promise<Resume> => {
    const response = await api.get<Resume>(`/api/resumes/${id}`);
    return response.data;
  },

  create: async (data: ResumeCreate): Promise<Resume> => {
    const response = await api.post<Resume>('/api/resumes', data);
    return response.data;
  },

  update: async (id: number, data: ResumeUpdate): Promise<Resume> => {
    const response = await api.patch<Resume>(`/api/resumes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/resumes/${id}`);
  },

  upload: async (file: File, name?: string, isMaster: boolean = false): Promise<Resume> => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) {
      formData.append('name', name);
    }
    formData.append('is_master', String(isMaster));

    const response = await api.post<Resume>('/api/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getFileUrl: (id: number): string => {
    return `${API_BASE_URL}/api/resumes/${id}/file`;
  },

  updateFile: async (id: number, latexContent: string): Promise<{ message: string; file_type: string }> => {
    const formData = new FormData();
    formData.append('latex_content', latexContent);

    const response = await api.patch<{ message: string; file_type: string }>(
      `/api/resumes/${id}/file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  setMaster: async (id: number): Promise<Resume> => {
    const response = await api.patch<Resume>(`/api/resumes/${id}/set-master`);
    return response.data;
  },

  unsetMaster: async (id: number): Promise<Resume> => {
    const response = await api.patch<Resume>(`/api/resumes/${id}/unset-master`);
    return response.data;
  getLatexUrl: (id: number): string => {
    return `${API_BASE_URL}/api/resumes/${id}/latex`;
  },

  getTemplates: async (): Promise<Record<string, string>> => {
    const response = await api.get<{ templates: Record<string, string> }>('/api/resumes/templates/list');
    return response.data.templates;
  },

  getTemplatePreviewUrl: (templateId: string): string => {
    return `${API_BASE_URL}/api/resumes/templates/${templateId}/preview`;
  },

  applyTemplate: async (id: number, templateId: string): Promise<Resume> => {
    const response = await api.post<{ success: boolean; message: string; new_resume_id: number; new_resume: Resume }>(
      `/api/resumes/${id}/apply-template`,
      { template_id: templateId }
    );
    return response.data.new_resume;
  },
};

// Communications API
export const communicationsApi = {
  getAll: async (applicationId?: number): Promise<Communication[]> => {
    const params = applicationId ? { application_id: applicationId } : {};
    const response = await api.get<Communication[]>('/api/communications', { params });
    return response.data;
  },

  create: async (data: CommunicationCreate): Promise<Communication> => {
    const response = await api.post<Communication>('/api/communications', data);
    return response.data;
  },

  // Response Tracking API - Get response tracking statistics summary
  // Usage: const summaries = await communicationsApi.getTrackingSummary();
  // Or get statistics for a specific application: const summary = await communicationsApi.getTrackingSummary(applicationId);
  getTrackingSummary: async (applicationId?: number): Promise<ResponseTrackingSummary[]> => {
    const params = applicationId ? { application_id: applicationId } : {};
    const response = await api.get<ResponseTrackingSummary[]>('/api/communications/tracking/summary', { params });
    return response.data;
  },

  // Get global response statistics
  // Usage: const stats = await communicationsApi.getGlobalStatistics();
  getGlobalStatistics: async (): Promise<GlobalResponseStatistics> => {
    const response = await api.get<GlobalResponseStatistics>('/api/communications/tracking/statistics');
    return response.data;
  },
};

// Reminders API
export const remindersApi = {
  getAll: async (isCompleted?: boolean): Promise<Reminder[]> => {
    const params = isCompleted !== undefined ? { is_completed: isCompleted } : {};
    const response = await api.get<Reminder[]>('/api/reminders', { params });
    return response.data;
  },

  create: async (data: ReminderCreate): Promise<Reminder> => {
    const response = await api.post<Reminder>('/api/reminders', data);
    return response.data;
  },

  update: async (id: number, data: ReminderUpdate): Promise<Reminder> => {
    const response = await api.patch<Reminder>(`/api/reminders/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/reminders/${id}`);
  },
};

// AI Chat API
export const aiApi = {
  chat: async (data: {
    message: string;
    mode: 'critique' | 'interview';
    resume_id?: number;
    application_id?: number;
    conversation_history: Array<{ role: string; content: string }>;
  }): Promise<{ response: string }> => {
    const response = await api.post<{ response: string }>('/api/ai/chat', data);
    return response.data;
  },

  critiqueResume: async (resume_id: number): Promise<{ critique: string }> => {
    const response = await api.post<{ critique: string }>('/api/ai/critique-resume', { resume_id });
    return response.data;
  },

  startInterview: async (resume_id: number, application_id?: number): Promise<{ question: string }> => {
    const response = await api.post<{ question: string }>('/api/ai/start-interview', { resume_id, application_id });
    return response.data;
  },

  rateAnswer: async (question: string, answer: string, resume_id?: number): Promise<{ rating: string }> => {
    const response = await api.post<{ rating: string }>('/api/ai/rate-answer', { question, answer, resume_id });
    return response.data;
  },
};

// Chat Session API
export const chatSessionsApi = {
  getAll: async (): Promise<ChatSession[]> => {
    const response = await api.get<ChatSession[]>('/api/ai/sessions');
    return response.data;
  },

  get: async (id: number): Promise<ChatSession> => {
    const response = await api.get<ChatSession>(`/api/ai/sessions/${id}`);
    return response.data;
  },

  create: async (data: ChatSessionCreate): Promise<ChatSession> => {
    const response = await api.post<ChatSession>('/api/ai/sessions', data);
    return response.data;
  },

  update: async (id: number, data: ChatSessionUpdate): Promise<ChatSession> => {
    const response = await api.put<ChatSession>(`/api/ai/sessions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/ai/sessions/${id}`);
  },
};

