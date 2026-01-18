/** Create Update Modal Component */
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { communicationsApi } from '../api/client';
import { useApplicationStore } from '../store/applicationStore';
import type { Communication, CommunicationCreate, Application, ApplicationStatus } from '../types';
import { getCurrentEdmontonDateTime, edmontonDateTimeToISO } from '../utils/dateUtils';

interface CreateCommunicationModalProps {
  application: Application;
  onClose: () => void;
  onSuccess: () => void;
}

type InputMode = 'manual' | 'image';

function CreateCommunicationModal({
  application,
  onClose,
  onSuccess,
}: CreateCommunicationModalProps) {
  const [mode, setMode] = useState<InputMode>('manual');
  const [formData, setFormData] = useState<CommunicationCreate>({
    application_id: application.id,
    type: 'Note',
    message: '',
    timestamp: new Date().toISOString(), // Will be displayed in Edmonton time
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateApplication = useApplicationStore((state) => state.updateApplication);

  // Process image file (used by both upload and paste)
  const processImageFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Process image with OCR + AI
    setIsProcessingImage(true);
    try {
      const result = await communicationsApi.processImage(file, application.id);
      
      // Auto-fill form with AI results
      setFormData((prev) => ({
        ...prev,
        type: result.type,
        message: result.message,
      }));
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('Failed to process image. Please try again or use manual entry.');
    } finally {
      setIsProcessingImage(false);
    }
  }, [application.id]);

  // Map communication type to application status
  const getStatusFromCommunicationType = (type: Communication['type']): ApplicationStatus | null => {
    switch (type) {
      case 'Interview Invite':
        return 'Interview';
      case 'Offer':
        return 'Offer';
      case 'Rejection':
        return 'Rejected';
      case 'Note':
        return null; // Don't update status for notes
      default:
        return null;
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
  };

  // Handle paste event for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Only handle paste when in image mode
      if (mode !== 'image') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Check if the pasted item is an image
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            // Convert blob to File
            const file = new File([blob], 'pasted-image.png', { type: blob.type });
            await processImageFile(file);
          }
          break;
        }
      }
    };

    // Add paste event listener
    window.addEventListener('paste', handlePaste);

    // Cleanup
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [mode, processImageFile]);

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If in image mode and no image selected, show error
    if (mode === 'image' && !selectedImage) {
      alert('Please upload an image first.');
      return;
    }

    setIsLoading(true);
    try {
      await communicationsApi.create(formData);
      
      // Update application status if update type is not "Note"
      const newStatus = getStatusFromCommunicationType(formData.type);
      if (newStatus) {
        try {
          await updateApplication(application.id, { status: newStatus });
        } catch (statusError) {
          // If status update fails, log but don't fail the whole operation
          console.error('Failed to update application status:', statusError);
          // Still proceed with success since update was created
        }
      }
      
      onSuccess();
    } catch (error) {
      console.error('Failed to create update:', error);
      alert('Failed to create update. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-100">Log Update</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selection Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-700/50 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === 'manual'
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText size={16} />
            Enter Manually
          </button>
          <button
            type="button"
            onClick={() => setMode('image')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === 'image'
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload size={16} />
            Image Upload
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload Section */}
          {mode === 'image' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload Image
                </label>
                {!selectedImage ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
                  >
                    {isProcessingImage ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-primary-500" size={32} />
                        <p className="text-sm text-gray-400">Processing image...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="text-gray-400" size={32} />
                        <p className="text-sm text-gray-300">Click to upload image</p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        <p className="text-xs text-gray-500 mt-1">or press Ctrl+V / Cmd+V to paste</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={isProcessingImage}
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview || ''}
                      alt="Preview"
                      className="w-full rounded-lg border border-gray-600 max-h-64 object-contain bg-gray-900"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Form fields - shown for both modes, but auto-filled in image mode */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Type {mode === 'image' && <span className="text-xs text-gray-500">(Auto-detected)</span>}
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as Communication['type'] })}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-700 text-gray-100"
              disabled={isProcessingImage}
            >
              <option value="Note">Note</option>
              <option value="Interview Invite">Interview Invite</option>
              <option value="Offer">Offer</option>
              <option value="Rejection">Rejection</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Date & Time <span className="text-xs text-gray-500">(Edmonton time)</span>
            </label>
            <input
              type="datetime-local"
              value={(() => {
                // Convert ISO timestamp to Edmonton time for display
                const date = new Date(formData.timestamp);
                const edmontonTime = date.toLocaleString('en-CA', {
                  timeZone: 'America/Edmonton',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }).replace(', ', 'T');
                return edmontonTime;
              })()}
              onChange={(e) => {
                // Convert Edmonton time input to UTC ISO string
                const edmontonDateTime = e.target.value;
                const isoString = edmontonDateTimeToISO(edmontonDateTime);
                setFormData({ ...formData, timestamp: isoString });
              }}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-700 text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Message {mode === 'image' && <span className="text-xs text-gray-500">(Auto-generated)</span>}
            </label>
            <textarea
              value={formData.message || ''}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder={mode === 'image' ? 'AI-generated summary will appear here...' : 'Add details about this update...'}
              rows={4}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-700 text-gray-100 resize-none"
              disabled={isProcessingImage}
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
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-medium transition-all flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || isProcessingImage || (mode === 'image' && !selectedImage)}
            >
              {isLoading ? 'Logging...' : isProcessingImage ? 'Processing...' : 'Log Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateCommunicationModal;
