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
  CommunicationCreate,
  Reminder,
  ReminderUpdate,
  AutofillParseRequest,
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
};

// Reminders API
export const remindersApi = {
  getAll: async (isCompleted?: boolean): Promise<Reminder[]> => {
    const params = isCompleted !== undefined ? { is_completed: isCompleted } : {};
    const response = await api.get<Reminder[]>('/api/reminders', { params });
    return response.data;
  },

  update: async (id: number, data: ReminderUpdate): Promise<Reminder> => {
    const response = await api.patch<Reminder>(`/api/reminders/${id}`, data);
    return response.data;
  },
};

