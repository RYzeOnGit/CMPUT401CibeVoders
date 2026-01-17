/** Communications Timeline Panel Component */
import { useState, useEffect } from 'react';
import { MessageSquare, X, Plus, Mail, Phone, FileText, CheckCircle } from 'lucide-react';
import { communicationsApi } from '../api/client';
import type { Communication, CommunicationCreate, Application } from '../types';
import { formatDate } from '../utils/dateUtils';

interface CommunicationsPanelProps {
  application: Application;
  onClose: () => void;
}

function CommunicationsPanel({ application, onClose }: CommunicationsPanelProps) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCommunications();
  }, [application.id]);

  const fetchCommunications = async () => {
    setIsLoading(true);
    try {
      const data = await communicationsApi.getAll(application.id);
      setCommunications(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
      console.error('Failed to fetch communications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center md:justify-center">
        <div className="bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-2xl md:max-h-[80vh] flex flex-col border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="text-blue-400" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-100">Communication Log</h2>
                <p className="text-sm text-gray-400">
                  {application.company_name} - {application.role_title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : communications.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="text-gray-500 mx-auto mb-3" size={48} />
                <p className="text-gray-400">No communications yet</p>
                <p className="text-sm text-gray-500 mt-1">Start logging your interactions with this company</p>
              </div>
            ) : (
              <div className="space-y-4">
                {communications.map((comm) => (
                  <CommunicationCard key={comm.id} communication={comm} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={18} />
              Add Communication
            </button>
          </div>
        </div>
      </div>

      {/* Create Communication Modal */}
      {showCreateModal && (
        <CreateCommunicationModal
          application={application}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCommunications();
          }}
        />
      )}
    </>
  );
}

function CommunicationCard({ communication }: { communication: Communication }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Interview Invite':
        return <Phone className="text-green-400" size={18} />;
      case 'Offer':
        return <CheckCircle className="text-green-400" size={18} />;
      case 'Rejection':
        return <X className="text-red-400" size={18} />;
      default:
        return <Mail className="text-blue-400" size={18} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Interview Invite':
        return 'bg-green-900/30 text-green-300 border-green-700/50';
      case 'Offer':
        return 'bg-green-900/30 text-green-300 border-green-700/50';
      case 'Rejection':
        return 'bg-red-900/30 text-red-300 border-red-700/50';
      default:
        return 'bg-blue-900/30 text-blue-300 border-blue-700/50';
    }
  };

  return (
    <div className={`bg-gray-700/50 rounded-lg p-4 border ${getTypeColor(communication.type)}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getTypeIcon(communication.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-100">{communication.type}</span>
            <span className="text-xs text-gray-400">
              {formatDate(communication.timestamp)}
            </span>
          </div>
          {communication.message && (
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{communication.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateCommunicationModal({
  application,
  onClose,
  onSuccess,
}: {
  application: Application;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<CommunicationCreate>({
    application_id: application.id,
    type: 'Note',
    message: '',
    timestamp: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await communicationsApi.create(formData);
      onSuccess();
    } catch (error) {
      console.error('Failed to create communication:', error);
      alert('Failed to create communication. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-100">Log Communication</h3>
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
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as Communication['type'] })}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-700 text-gray-100"
            >
              <option value="Note">Note</option>
              <option value="Interview Invite">Interview Invite</option>
              <option value="Offer">Offer</option>
              <option value="Rejection">Rejection</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={new Date(formData.timestamp).toISOString().slice(0, 16)}
              onChange={(e) => setFormData({ ...formData, timestamp: new Date(e.target.value).toISOString() })}
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
              placeholder="Add details about this communication..."
              rows={4}
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
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-medium transition-all flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Logging...' : 'Log Communication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CommunicationsPanel;

