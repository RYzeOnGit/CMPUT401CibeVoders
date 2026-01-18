/** Main Dashboard component */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApplicationsTable from './ApplicationsTable';
import KanbanBoard from './KanbanBoard';
import AutofillModal from './AutofillModal';
import ApplicationFormModal from './ApplicationFormModal';
import { useApplicationStore } from '../store/applicationStore';
import { Plus, Table2, LayoutGrid, Bell, FileText, Sparkles, BarChart3 } from 'lucide-react';
import type { Application } from '../types';

type ViewMode = 'table' | 'kanban';

interface DashboardProps {
  viewMode: ViewMode;
}

function Dashboard({ viewMode }: DashboardProps) {
  const navigate = useNavigate();
  const [showAutofillModal, setShowAutofillModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const { applications, isLoading, error } = useApplicationStore();

  const handleViewModeChange = (mode: ViewMode) => {
    navigate(`/${mode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/90 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">JF</span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Jobvibe
                </h1>
              </div>
              <span className="hidden sm:inline px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-primary-100 to-primary-50 text-primary-700 rounded-full border border-primary-200">
                Demo Mode
              </span>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              {/* Mobile: Icon buttons only */}
              <div className="flex items-center gap-1 md:hidden">
                {/* Response Tracking Button - Mobile: Click to open response tracking statistics page */}
                <button
                  onClick={() => navigate('/response-tracking')}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Response Tracking"
                >
                  <BarChart3 size={18} />
                </button>
                <button
                  onClick={() => navigate('/reminders')}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors relative"
                  title="Reminders"
                >
                  <Bell size={18} />
                </button>
                <button
                  onClick={() => navigate('/resumes')}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Resumes"
                >
                  <FileText size={18} />
                </button>
                <button
                  onClick={() => navigate('/ai-chat')}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                  title="AI Assistant"
                >
                  <Sparkles size={18} />
                </button>
                <button
                  onClick={() => navigate('/analytics')}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Analytics"
                >
                  <BarChart3 size={18} />
                </button>
              </div>
              {/* Desktop: Full buttons */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => setShowFormModal(true)}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
                >
                  <Plus size={16} />
                  Add Manually
                </button>
                <button
                  onClick={() => setShowAutofillModal(true)}
                  className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 text-sm"
                >
                  <Plus size={16} />
                  Capture
                </button>
                <button
                  onClick={() => navigate('/reminders')}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm relative"
                  title="Reminders"
                >
                  <Bell size={16} />
                  <span className="hidden lg:inline">Reminders</span>
                </button>
                <button
                  onClick={() => navigate('/resumes')}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
                  title="Resume Manager"
                >
                  <FileText size={16} />
                  <span className="hidden lg:inline">Resumes</span>
                </button>
                {/* Response Tracking Button - Desktop: Click to open response tracking statistics page */}
                <button
                  onClick={() => navigate('/response-tracking')}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
                  title="Response Tracking"
                >
                  <BarChart3 size={16} />
                  <span className="hidden lg:inline">Response Tracking</span>
                </button>
                <button
                  onClick={() => navigate('/ai-chat')}
                  className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
                  title="AI Assistant"
                >
                  <Sparkles size={16} />
                  <span className="hidden lg:inline">AI Assistant</span>
                </button>
                <button
                  onClick={() => navigate('/analytics')}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
                  title="Analytics"
                >
                  <BarChart3 size={16} />
                  <span className="hidden lg:inline">Analytics</span>
                </button>
              </div>
              {/* Mobile: Add buttons */}
              <div className="flex items-center gap-1 md:hidden">
                <button
                  onClick={() => setShowFormModal(true)}
                  className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                  title="Add Manually"
                >
                  <Plus size={18} />
                </button>
                <button
                  onClick={() => setShowAutofillModal(true)}
                  className="p-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-lg transition-colors"
                  title="Capture Application"
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1">
                <button
                  onClick={() => handleViewModeChange('table')}
                  className={`px-2 md:px-3 py-1.5 rounded-md transition-all duration-200 ${
                    viewMode === 'table'
                      ? 'bg-gray-700 text-gray-100 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                  }`}
                  title="Table View"
                >
                  <Table2 size={18} />
                </button>
                <button
                  onClick={() => handleViewModeChange('kanban')}
                  className={`px-2 md:px-3 py-1.5 rounded-md transition-all duration-200 ${
                    viewMode === 'kanban'
                      ? 'bg-gray-700 text-gray-100 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                  }`}
                  title="Kanban View"
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-red-900/20 border-red-700/50 rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="text-red-600 text-xl">⚠️</div>
              <div>
                <h3 className="font-semibold text-red-900">Connection Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <p className="text-xs text-red-600 mt-2">
                  Make sure the backend is running on <code className="bg-red-100 px-1 rounded">http://localhost:8000</code>
                </p>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {viewMode === 'table' ? (
              <ApplicationsTable 
                applications={applications} 
              />
            ) : (
              <KanbanBoard 
                applications={applications}
              />
            )}
          </>
        )}
      </main>

      {/* Autofill Modal */}
      {showAutofillModal && (
        <AutofillModal
          onClose={() => setShowAutofillModal(false)}
          onSuccess={() => {
            setShowAutofillModal(false);
            useApplicationStore.getState().fetchApplications();
          }}
        />
      )}

      {/* Manual Application Form Modal */}
      {showFormModal && (
        <ApplicationFormModal
          onClose={() => setShowFormModal(false)}
          onSuccess={() => {
            setShowFormModal(false);
            useApplicationStore.getState().fetchApplications();
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;

