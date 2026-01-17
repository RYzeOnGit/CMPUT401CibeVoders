/** Reminders Page Component */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Plus, Calendar, Clock, Search, ArrowLeft, X, Trash2 } from 'lucide-react';
import { remindersApi } from '../api/client';
import { useApplicationStore } from '../store/applicationStore';
import type { Reminder, ReminderCreate, Application } from '../types';
import { formatDate } from '../utils/dateUtils';

function RemindersPage() {
  const navigate = useNavigate();
  const { applications } = useApplicationStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    setIsLoading(true);
    try {
      const data = await remindersApi.getAll(false); // Get incomplete reminders
      setReminders(data);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (reminderId: number) => {
    try {
      await remindersApi.update(reminderId, { is_completed: true });
      await fetchReminders();
    } catch (error) {
      console.error('Failed to complete reminder:', error);
    }
  };

  const handleDelete = async (reminderId: number) => {
    try {
      await remindersApi.delete(reminderId);
      await fetchReminders();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      alert('Failed to delete reminder. Please try again.');
    }
  };

  const activeReminders = reminders.filter((r) => !r.is_completed && new Date(r.due_date) >= new Date());
  const overdueReminders = reminders.filter((r) => !r.is_completed && new Date(r.due_date) < new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/90 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/table')}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
                <Bell className="text-primary-400" size={20} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-100">Reminders & Notifications</h1>
                <p className="text-sm text-gray-400">
                  {activeReminders.length + overdueReminders.length} active reminders
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Create Reminder</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overdue Reminders */}
            {overdueReminders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                  <Clock size={20} /> Overdue ({overdueReminders.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {overdueReminders.map((reminder) => {
                    const app = applications.find((a) => a.id === reminder.application_id);
                    return (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        application={app}
                        onComplete={() => handleComplete(reminder.id)}
                        onDelete={() => handleDelete(reminder.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Reminders */}
            {activeReminders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <Calendar size={20} /> Upcoming ({activeReminders.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeReminders
                    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                    .map((reminder) => {
                      const app = applications.find((a) => a.id === reminder.application_id);
                      return (
                        <ReminderCard
                          key={reminder.id}
                          reminder={reminder}
                          application={app}
                          onComplete={() => handleComplete(reminder.id)}
                          onDelete={() => handleDelete(reminder.id)}
                        />
                      );
                    })}
                </div>
              </div>
            )}

            {reminders.length === 0 && (
              <div className="text-center py-20">
                <Bell className="text-gray-500 mx-auto mb-4" size={64} />
                <p className="text-gray-400 text-lg mb-2">No reminders yet</p>
                <p className="text-sm text-gray-500">Create reminders to track follow-ups and important dates</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Reminder Modal */}
      {showCreateModal && (
        <CreateReminderModal
          applications={applications}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchReminders();
          }}
        />
      )}
    </div>
  );
}

function ReminderCard({
  reminder,
  application,
  onComplete,
  onDelete,
}: {
  reminder: Reminder;
  application?: Application;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const isOverdue = new Date(reminder.due_date) < new Date();
  const daysUntil = Math.ceil(
    (new Date(reminder.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      className={`bg-gray-800/50 rounded-xl p-4 border ${
        isOverdue ? 'border-red-500/50 bg-red-900/10' : 'border-gray-700/50'
      } hover:border-primary-500/50 transition-all`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-semibold px-2 py-1 rounded ${getReminderTypeColor(reminder.type)}`}>
              {reminder.type}
            </span>
          </div>
          {application && (
            <div className="mb-2">
              <p className="font-semibold text-gray-100 text-sm">{application.company_name}</p>
              <p className="text-xs text-gray-400">{application.role_title}</p>
            </div>
          )}
          {reminder.message && (
            <p className="text-sm text-gray-300 mb-3 line-clamp-2">{reminder.message}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(reminder.due_date)}
            </span>
            {!isOverdue && (
              <span>{daysUntil === 0 ? 'Today' : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`}</span>
            )}
            {isOverdue && <span className="text-red-400 font-semibold">Overdue</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onComplete}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-green-400"
            title="Mark as complete"
          >
            <Check size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to delete this reminder?')) {
                onDelete();
              }
            }}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-red-400"
            title="Delete reminder"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateReminderModal({
  applications,
  onClose,
  onSuccess,
}: {
  applications: Application[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<ReminderCreate>({
    application_id: applications[0]?.id || 0,
    type: 'Follow-up',
    message: '',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 7 days from now
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.application_id) {
      alert('Please select an application');
      return;
    }
    setIsLoading(true);
    try {
      const data = {
        ...formData,
        due_date: new Date(formData.due_date).toISOString(),
      };
      await remindersApi.create(data);
      onSuccess();
    } catch (error) {
      console.error('Failed to create reminder:', error);
      alert('Failed to create reminder. Please try again.');
      setIsLoading(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.company_name.toLowerCase().includes(query) ||
      app.role_title.toLowerCase().includes(query) ||
      app.location?.toLowerCase().includes(query)
    );
  });

  const selectedApplication = applications.find((app) => app.id === formData.application_id);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-100">Create Reminder</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Application
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-700 text-gray-100 text-left flex items-center justify-between"
              >
                <span className={selectedApplication ? 'text-gray-100' : 'text-gray-400'}>
                  {selectedApplication
                    ? `${selectedApplication.company_name} - ${selectedApplication.role_title}`
                    : 'Select an application...'}
                </span>
                <Search size={16} className="text-gray-400" />
              </button>
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                    <div className="sticky top-0 bg-gray-800 border-b border-gray-600 p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search applications..."
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-700 text-gray-100 placeholder-gray-400"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="py-1">
                      {filteredApplications.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-400 text-center">
                          No applications found
                        </div>
                      ) : (
                        filteredApplications.map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, application_id: app.id });
                              setSearchQuery('');
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                              formData.application_id === app.id
                                ? 'bg-primary-900/30 text-primary-300'
                                : 'text-gray-300'
                            }`}
                          >
                            <div className="font-medium">{app.company_name}</div>
                            <div className="text-xs text-gray-400">{app.role_title}</div>
                            {app.location && (
                              <div className="text-xs text-gray-500">📍 {app.location}</div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as Reminder['type'] })}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-700 text-gray-100"
            >
              <option value="Follow-up">Follow-up</option>
              <option value="Interview Prep">Interview Prep</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Due Date
            </label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-700 text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Message (optional)
            </label>
            <textarea
              value={formData.message || ''}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Add a note about this reminder..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-700 text-gray-100 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors flex-1"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-lg font-medium transition-all flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getReminderTypeColor(type: string): string {
  switch (type) {
    case 'Follow-up':
      return 'bg-blue-900/30 text-blue-300';
    case 'Interview Prep':
      return 'bg-yellow-900/30 text-yellow-300';
    default:
      return 'bg-gray-700 text-gray-300';
  }
}

export default RemindersPage;

