/** Zustand store for application state management */
import { create } from 'zustand';
import type { Application } from '../types';
import { applicationsApi } from '../api/client';

interface ApplicationState {
  applications: Application[];
  isLoading: boolean;
  error: string | null;
  fetchApplications: () => Promise<void>;
  addApplication: (application: Application) => void;
  updateApplication: (id: number, updates: Partial<Application>) => Promise<void>;
  deleteApplication: (id: number) => Promise<void>;
  setApplications: (applications: Application[]) => void;
}

export const useApplicationStore = create<ApplicationState>((set) => ({
  applications: [],
  isLoading: false,
  error: null,

  fetchApplications: async () => {
    set({ isLoading: true, error: null });
    try {
      const applications = await applicationsApi.getAll();
      set({ applications, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch applications',
        isLoading: false,
      });
    }
  },

  addApplication: (application) => {
    set((state) => ({
      applications: [application, ...state.applications],
    }));
  },

  updateApplication: async (id, updates) => {
    try {
      const updated = await applicationsApi.update(id, updates);
      set((state) => ({
        applications: state.applications.map((app) =>
          app.id === id ? updated : app
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update application',
      });
    }
  },

  deleteApplication: async (id) => {
    try {
      await applicationsApi.delete(id);
      set((state) => ({
        applications: state.applications.filter((app) => app.id !== id),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete application',
      });
    }
  },

  setApplications: (applications) => {
    set({ applications });
  },
}));

