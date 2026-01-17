/** Autofill modal component - Simplify-style application capture */
import { useState } from 'react';
import { X, Link, FileText, Sparkles } from 'lucide-react';
import { autofillApi } from '../api/client';
import { useApplicationStore } from '../store/applicationStore';

interface AutofillModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AutofillModal({ onClose, onSuccess }: AutofillModalProps) {
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const addApplication = useApplicationStore((state) => state.addApplication);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const request = mode === 'url' ? { url: input } : { text: input };
      const application = await autofillApi.parse(request);
      addApplication(application);
      
      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error('Failed to parse application:', error);
      alert('Failed to parse application. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in duration-200 border border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        {showSuccess ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 animate-bounce">
              <Sparkles className="text-green-600" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-gray-100 mb-2">
              ✨ Application Captured!
            </h3>
            <p className="text-gray-300">Your application has been automatically added to the tracker.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-primary-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-100">
                Capture Application
              </h2>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMode('url')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  mode === 'url'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Link size={18} className="mx-auto mb-1" />
                <div className="text-sm">Job URL</div>
              </button>
              <button
                onClick={() => setMode('text')}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  mode === 'text'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <FileText size={18} className="mx-auto mb-1" />
                <div className="text-sm">Screenshot Text</div>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {mode === 'url' ? 'Paste Job URL' : 'Paste Text from Screenshot/Email'}
                </label>
                {mode === 'url' ? (
                  <input
                    type="url"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="https://linkedin.com/jobs/view/..."
                    className="input-field w-full bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
                    disabled={isLoading}
                  />
                ) : (
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Thank you for applying to Company Name..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-700 text-gray-100 placeholder-gray-400 resize-none"
                    disabled={isLoading}
                  />
                )}
              </div>

              <div className="flex gap-3">
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
                  className="btn-primary flex-1"
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? 'Processing...' : 'Capture Application'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default AutofillModal;

