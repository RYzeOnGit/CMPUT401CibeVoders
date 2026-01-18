import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Plus, Upload, X, Trash2, Copy, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Crown } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { resumesApi } from '../api/client';
import type { Resume } from '../types';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs';

export default function ResumesPage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const data = await resumesApi.getAll();
      setResumes(data);
      if (data.length > 0 && !selectedResume) {
        setSelectedResume(data.find(r => r.is_master) || data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this resume?')) return;
    try {
      await resumesApi.delete(id);
      if (selectedResume?.id === id) {
        setSelectedResume(null);
      }
      await fetchResumes();
    } catch (error) {
      alert('Failed to delete resume');
    }
  };

  const handleCreateDerived = async (master: Resume, name?: string) => {
    const resumeName = name || prompt('Resume name (optional):');
    if (resumeName === null) return;
    
    try {
      await resumesApi.create({
        name: `Derived - ${resumeName || new Date().toLocaleDateString()}`,
        is_master: false,
        master_resume_id: master.id,
        content: { ...master.content },
        version_history: [],
      });
      await fetchResumes();
    } catch (error) {
      alert('Failed to create derived resume');
    }
  };

  const handleSetMaster = async (resumeId: number) => {
    try {
      await resumesApi.setMaster(resumeId);
      await fetchResumes();
      // Update selected resume if it was the one changed
      const updatedResumes = await resumesApi.getAll();
      const updatedResume = updatedResumes.find(r => r.id === resumeId);
      if (updatedResume) {
        setSelectedResume(updatedResume);
      }
    } catch (error: any) {
      console.error('Error setting master resume:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to set master resume';
      alert(`Failed to set master resume: ${errorMessage}`);
    }
  };

  const handleUnsetMaster = async (resumeId: number) => {
    try {
      await resumesApi.unsetMaster(resumeId);
      await fetchResumes();
      // Update selected resume if it was the one changed
      const updatedResumes = await resumesApi.getAll();
      const updatedResume = updatedResumes.find(r => r.id === resumeId);
      if (updatedResume) {
        setSelectedResume(updatedResume);
      }
    } catch (error: any) {
      console.error('Error unsetting master resume:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to unset master resume';
      alert(`Failed to unset master resume: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/90 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/table')} className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg">
                <ArrowLeft size={20} />
              </button>
              <FileText className="text-purple-400" size={24} />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-100">Resume Management</h1>
                <p className="text-sm text-gray-400 hidden sm:block">Master resume and derived versions</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowUploadModal(true)} className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                <Upload size={18} />
                <span className="hidden sm:inline">Upload</span>
              </button>
              <button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                <Plus size={18} />
                <span className="hidden sm:inline">Create</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
          {/* Sidebar */}
          <div className="w-full lg:w-64 border border-gray-700 rounded-xl bg-gray-800/50 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Your Resumes</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {isLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                </div>
              ) : resumes.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No resumes yet</div>
              ) : (
                resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedResume?.id === resume.id
                        ? 'bg-purple-600/20 border border-purple-500/50'
                        : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    <button onClick={() => setSelectedResume(resume)} className="w-full text-left">
                      {resume.is_master && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded mr-2">
                          <Crown size={12} />
                          Master
                        </span>
                      )}
                      <div className="text-sm text-gray-200 truncate">{resume.name}</div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(resume.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-900/30 rounded text-gray-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Viewer */}
          <div className="flex-1 bg-gray-800/50 rounded-xl border border-gray-700 p-6 overflow-y-auto">
            {selectedResume ? (
              <PDFViewer
                resume={selectedResume}
                onDelete={() => handleDelete(selectedResume.id)}
                onCreateDerived={() => handleCreateDerived(selectedResume)}
                onSetMaster={() => handleSetMaster(selectedResume.id)}
                onUnsetMaster={() => handleUnsetMaster(selectedResume.id)}
              />
            ) : (
              <div className="text-center py-20">
                <FileText className="text-gray-500 mx-auto mb-4" size={64} />
                <p className="text-gray-400 text-lg">Select a resume to view</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} onSuccess={fetchResumes} />}
      {showCreateModal && <CreateModal onClose={() => setShowCreateModal(false)} onSuccess={fetchResumes} />}
    </div>
  );
}

// PDF Viewer Component
function PDFViewer({ resume, onDelete, onCreateDerived, onSetMaster, onUnsetMaster }: { resume: Resume; onDelete: () => void; onCreateDerived: () => void; onSetMaster: () => void; onUnsetMaster: () => void }) {
  const hasPdf = resume.file_type?.includes('pdf');
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showLatex, setShowLatex] = useState(false);

  useEffect(() => {
    if (!hasPdf || !resume.id) {
      setPdfUrl(null);
      return;
    }

    // Fetch PDF as blob
    const loadPdf = async () => {
      try {
        const response = await fetch(resumesApi.getFileUrl(resume.id));
        if (!response.ok) throw new Error('Failed to fetch PDF');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setPdfUrl(null);
      }
    };

    loadPdf();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [resume.id, hasPdf]);

  if (!hasPdf) {
    return (
      <div className="text-center py-20">
        <Upload className="mx-auto mb-4 text-gray-500" size={64} />
        <h4 className="text-xl font-semibold text-gray-300 mb-2">No PDF Uploaded</h4>
        <p className="text-gray-500">This resume doesn't have a PDF file attached.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-gray-100">{resume.name}</h3>
          {resume.is_master && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-900/30 text-purple-300 px-2 py-1 rounded">
              <Crown size={14} />
              Master Resume
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {resume.latex_content && (
            <button 
              onClick={() => setShowLatex(!showLatex)}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <FileText size={14} />
              {showLatex ? 'Show PDF' : 'Show LaTeX'}
            </button>
          )}
          {!resume.is_master && (
            <button 
              onClick={onSetMaster} 
              className="px-3 py-1.5 bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 rounded-lg text-sm flex items-center gap-2"
            >
              <Crown size={14} />
              Set as Master
            </button>
          )}
          {resume.is_master && (
            <>
              <button 
                onClick={onUnsetMaster} 
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm flex items-center gap-2"
              >
                Unset Master
              </button>
              <button onClick={onCreateDerived} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm flex items-center gap-2">
                <Copy size={14} />
                Create Derived
              </button>
            </>
          )}
          <button onClick={onDelete} className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm flex items-center gap-2">
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* LaTeX Viewer */}
      {showLatex && resume.latex_content ? (
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-300">LaTeX Source (Generated from PDF)</span>
            <button
              onClick={() => {
                const blob = new Blob([resume.latex_content!], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${resume.name}.tex`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
              title="Download LaTeX"
            >
              <Download size={18} />
            </button>
          </div>
          <div className="bg-gray-900 p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
            <pre className="text-gray-200 text-sm font-mono whitespace-pre-wrap break-words">
              <code>{resume.latex_content}</code>
            </pre>
          </div>
        </div>
      ) : (
        /* PDF Viewer */
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
          {/* Toolbar */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between gap-4">
            {/* Download */}
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = resumesApi.getFileUrl(resume.id);
                link.download = `${resume.name}.pdf`;
                link.click();
              }}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
              title="Download"
            >
              <Download size={18} />
            </button>

            {/* Page Navigation */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <span className="text-sm text-gray-300">Page</span>
              <button
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <input
                type="number"
                value={pageNumber}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 1 && val <= numPages) setPageNumber(val);
                }}
                min={1}
                max={numPages}
                className="w-12 px-2 py-1 text-sm text-center bg-gray-700 border border-gray-600 rounded text-gray-100"
              />
              <button
                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
              <span className="text-sm text-gray-400">of {numPages}</span>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300 mr-2">ZOOM</span>
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded">
                <ZoomOut size={18} />
              </button>
              <span className="text-sm text-gray-300 w-10 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(3.0, s + 0.25))} className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded">
                <ZoomIn size={18} />
              </button>
              <button
                onClick={() => document.documentElement.requestFullscreen?.()}
                className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded ml-2"
                title="Fullscreen"
              >
                <Maximize size={18} />
              </button>
            </div>
          </div>

          {/* PDF Content */}
          <div className="bg-gray-900 p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
            <div className="flex justify-center">
              {pdfUrl ? (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={({ numPages }) => {
                    setNumPages(numPages);
                    setPageNumber(1);
                  }}
                  onLoadError={(error) => console.error('PDF error:', error)}
                  loading={<div className="p-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div></div>}
                  error={<div className="text-red-400 p-8 text-center">Failed to load PDF</div>}
                >
                  <Page pageNumber={pageNumber} scale={scale} renderTextLayer renderAnnotationLayer className="shadow-xl" />
                </Document>
              ) : (
                <div className="p-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Upload Modal
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      await resumesApi.upload(file, name || undefined, false);
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-100">Upload Resume</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Resume File (PDF, DOCX)</label>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  if (!name) setName(f.name.replace(/\.(pdf|docx)$/i, ''));
                }
              }}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100"
            />
          </div>
          {file && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Resume Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100"
              />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 flex-1" disabled={uploading}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-lg font-medium flex-1" disabled={uploading || !file}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create Modal
function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [isMaster, setIsMaster] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await resumesApi.create({
        name,
        is_master: isMaster,
        content: { name: '', email: '', phone: '', summary: '', skills: [], experience: [], education: { degree: '', university: '', year: '' } },
        version_history: [],
      });
      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to create resume');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-100">Create Resume</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Resume Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100"
              placeholder="Enter resume name"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isMaster"
              checked={isMaster}
              onChange={(e) => setIsMaster(e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="isMaster" className="text-sm text-gray-300 flex items-center gap-1 cursor-pointer">
              <Crown size={14} />
              Set as master resume
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 flex-1" disabled={creating}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-lg font-medium flex-1" disabled={creating || !name.trim()}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
