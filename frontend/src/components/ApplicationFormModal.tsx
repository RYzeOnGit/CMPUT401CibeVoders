/** Manual Application Form Modal */
import { useState } from 'react';
import { X } from 'lucide-react';
import { applicationsApi } from '../api/client';
import { useApplicationStore } from '../store/applicationStore';
import type { ApplicationCreate } from '../types';

interface ApplicationFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function ApplicationFormModal({ onClose, onSuccess }: ApplicationFormModalProps) {
  const [formData, setFormData] = useState<ApplicationCreate>({
    company_name: '',
    role_title: '',
    date_applied: new Date().toISOString().split('T')[0],
    status: 'Applied',
    source: '',
    location: '',
    duration: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const addApplication = useApplicationStore((state) => state.addApplication);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Convert date_applied to ISO string
      const applicationData = {
        ...formData,
        date_applied: new Date(formData.date_applied).toISOString(),
      };
      const application = await applicationsApi.create(applicationData);
      addApplication(application);
      onSuccess();
    } catch (error) {
      console.error('Failed to create application:', error);
      alert('Failed to create application. Please try again.');
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof ApplicationCreate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in duration-200 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-100">Add Application</h2>
          <p className="text-sm text-gray-400 mt-1">Manually enter job application details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-700 text-gray-100"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Role Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.role_title}
              onChange={(e) => handleChange('role_title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-700 text-gray-100"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Toronto, ON"
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-700 text-gray-100"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Duration
              </label>
              <input
                type="text"
                value={formData.duration || ''}
                onChange={(e) => handleChange('duration', e.target.value)}
                placeholder="12 months"
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-700 text-gray-100"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Date Applied
            </label>
            <input
              type="date"
              value={formData.date_applied}
              onChange={(e) => handleChange('date_applied', e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-700 text-gray-100"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-700 text-gray-100"
                disabled={isLoading}
              >
                <option value="Applied">Applied</option>
                <option value="Interview">Interview</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Source
              </label>
              <input
                type="text"
                value={formData.source || ''}
                onChange={(e) => handleChange('source', e.target.value)}
                placeholder="LinkedIn, Company Site..."
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-700 text-gray-100"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-700 text-gray-100 resize-none"
              disabled={isLoading}
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
              disabled={isLoading || !formData.company_name || !formData.role_title}
            >
              {isLoading ? 'Creating...' : 'Add Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ApplicationFormModal;

