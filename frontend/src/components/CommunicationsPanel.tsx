/** Updates Timeline Panel Component */
import { useState, useEffect } from 'react';
import { MessageSquare, X, Plus, Mail, Phone, FileText, CheckCircle } from 'lucide-react';
import { communicationsApi } from '../api/client';
import type { Communication, Application } from '../types';
import { formatDate } from '../utils/dateUtils';
import CreateCommunicationModal from './CreateCommunicationModal';

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
                <h2 className="text-xl font-semibold text-gray-100">Update Log</h2>
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
                <p className="text-gray-400">No updates yet</p>
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
              Add Update
            </button>
          </div>
        </div>
      </div>

      {/* Create Update Modal */}
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

export default CommunicationsPanel;

