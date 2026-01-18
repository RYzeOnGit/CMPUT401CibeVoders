import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Plus, Upload, X, Trash2, Copy, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Sparkles } from 'lucide-react';
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
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedResumeForTemplate, setSelectedResumeForTemplate] = useState<Resume | null>(null);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<{ id: string; name: string } | null>(null);
  const [templatePreviews, setTemplatePreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchResumes();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await resumesApi.getTemplates();
      setTemplates(data);
      // Load template previews
      loadTemplatePreviews(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const loadTemplatePreviews = (templatesData: Record<string, string>) => {
    // Load template descriptions for preview
    const previews: Record<string, string> = {};
    for (const [templateId] of Object.entries(templatesData)) {
      previews[templateId] = getTemplateDescription(templateId);
    }
    setTemplatePreviews(previews);
  };

  const getTemplateDescription = (templateId: string): string => {
    const descriptions: Record<string, string> = {
      'template-1': 'Modern Deedy style with clean typography, centered header, and organized sections. Uses custom commands for easy formatting.',
      'template-2': 'AltaCV style with sidebar layout, professional two-column design, and elegant color scheme. Great for academic/research profiles.',
      'template-3': 'Jake\'s Resume classic style with traditional layout, clear section headers, and ATS-friendly formatting. Simple and professional.'
    };
    return descriptions[templateId] || 'Professional resume template with modern styling.';
  };

  const fetchResumes = async () => {
    try {
      const data = await resumesApi.getAll();
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:63',message:'fetchResumes result',data:{resumesCount:data.length,resumeIds:data.map(r=>r.id),resumeFileTypes:data.map(r=>({id:r.id,name:r.name,fileType:r.file_type}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
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

  const handleApplyTemplate = async (templateId: string) => {
    if (!selectedResumeForTemplate) return;
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:106',message:'handleApplyTemplate entry',data:{templateId,originalResumeId:selectedResumeForTemplate.id,originalResumeName:selectedResumeForTemplate.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    setIsApplyingTemplate(true);
    try {
      const newResume = await resumesApi.applyTemplate(selectedResumeForTemplate.id, templateId);
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:111',message:'API response received',data:{newResumeId:newResume.id,newResumeName:newResume.name,hasFileType:!!newResume.file_type,fileType:newResume.file_type,hasLatex:!!newResume.latex_content},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      await fetchResumes();
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:115',message:'After fetchResumes',data:{resumesCount:resumes.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      setShowTemplateModal(false);
      setSelectedResumeForTemplate(null);
      
      // Use the newResume directly from API response instead of fetching again
      // The API response already contains the complete resume object with file_type
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:120',message:'Using newResume from API response',data:{newResumeId:newResume.id,newResumeName:newResume.name,newResumeFileType:newResume.file_type,newResumeHasPdf:newResume.file_type?.includes('pdf')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Select the new resume directly from API response
      setSelectedResume(newResume);
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:125',message:'setSelectedResume called with newResume',data:{resumeId:newResume.id,resumeFileType:newResume.file_type},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      alert(`Template applied successfully! New resume: ${newResume.name}`);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:127',message:'Template apply error',data:{error:error.message,errorDetail:error.response?.data?.detail},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      alert(error.response?.data?.detail || 'Failed to apply template');
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const openTemplateModal = (resume: Resume) => {
    if (!resume.latex_content) {
      alert('This resume does not have LaTeX content. Please upload a PDF first.');
      return;
    }
    setSelectedResumeForTemplate(resume);
    setShowTemplateModal(true);
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
                      {resume.is_master && <span className="text-xs font-semibold bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded mr-2">Master</span>}
                      <div className="text-sm text-gray-200 truncate">{resume.name}</div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(resume.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-900/30 rounded text-gray-400 hover:text-red-400"
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
                onApplyTemplate={() => openTemplateModal(selectedResume)}
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
      {showTemplateModal && selectedResumeForTemplate && (
        <TemplateModal
          resume={selectedResumeForTemplate}
          templates={templates}
          templatePreviews={templatePreviews}
          onClose={() => {
            setShowTemplateModal(false);
            setSelectedResumeForTemplate(null);
          }}
          onApply={handleApplyTemplate}
          onPreview={(templateId, templateName) => setPreviewTemplate({ id: templateId, name: templateName })}
          isApplying={isApplyingTemplate}
        />
      )}
      {previewTemplate && (
        <TemplatePreviewModal
          templateId={previewTemplate.id}
          templateName={previewTemplate.name}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}

// PDF Viewer Component
function PDFViewer({ resume, onDelete, onCreateDerived, onApplyTemplate }: { resume: Resume; onDelete: () => void; onCreateDerived: () => void; onApplyTemplate: () => void }) {
  const hasPdf = resume.file_type?.includes('pdf');
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showLatex, setShowLatex] = useState(false);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:304',message:'PDFViewer useEffect triggered',data:{resumeId:resume.id,resumeName:resume.name,hasPdf,fileType:resume.file_type},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    if (!hasPdf || !resume.id) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:309',message:'PDFViewer early return',data:{hasPdf,hasResumeId:!!resume.id,reason:!hasPdf?'noPdf':'noId'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setPdfUrl(null);
      return;
    }

    // Fetch PDF as blob
    const loadPdf = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:318',message:'loadPdf start',data:{resumeId:resume.id,fileUrl:resumesApi.getFileUrl(resume.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      try {
        const response = await fetch(resumesApi.getFileUrl(resume.id));
        if (!response.ok) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:323',message:'PDF fetch failed',data:{status:response.status,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          throw new Error('Failed to fetch PDF');
        }
        const blob = await response.blob();
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:328',message:'PDF blob received',data:{blobSize:blob.size,blobType:blob.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/39fec82c-85d4-410b-8895-0feee477743a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ResumesPage.tsx:332',message:'PDF load error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        console.error('Error loading PDF:', error);
        setPdfUrl(null);
      }
    };

    loadPdf();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [resume.id, resume.file_type]); // Changed: depend on resume.file_type directly instead of hasPdf

  if (!hasPdf) {
    // If there's LaTeX content but no PDF, show the LaTeX
    if (resume.latex_content) {
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-100">{resume.name}</h3>
            <div className="flex gap-2">
              <button 
                onClick={onApplyTemplate}
                className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-lg text-sm flex items-center gap-2"
                title="Apply template for visual upgrade"
              >
                <Sparkles size={14} />
                Glow Up
              </button>
              <button onClick={onDelete} className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm flex items-center gap-2">
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>

          {/* Notice about PDF */}
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
            <p className="text-yellow-300 text-sm">
              <strong>Note:</strong> This resume has LaTeX content but no compiled PDF. 
              The PDF compilation may have failed. You can download the LaTeX file and compile it locally.
            </p>
          </div>

          {/* LaTeX Viewer */}
          <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-300">LaTeX Source (Template Applied)</span>
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
            <div className="bg-gray-900 p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
              <pre className="text-gray-200 text-sm font-mono whitespace-pre-wrap break-words">
                <code>{resume.latex_content}</code>
              </pre>
            </div>
          </div>
        </div>
      );
    }
    
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
        <h3 className="text-xl font-semibold text-gray-100">{resume.name}</h3>
        <div className="flex gap-2">
          {resume.latex_content && (
            <>
              <button 
                onClick={() => setShowLatex(!showLatex)}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-sm flex items-center gap-2"
              >
                <FileText size={14} />
                {showLatex ? 'Show PDF' : 'Show LaTeX'}
              </button>
              <button 
                onClick={onApplyTemplate}
                className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-lg text-sm flex items-center gap-2"
                title="Apply template for visual upgrade"
              >
                <Sparkles size={14} />
                Glow Up
              </button>
            </>
          )}
          {resume.is_master && (
            <button onClick={onCreateDerived} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm flex items-center gap-2">
              <Copy size={14} />
              Create Derived
            </button>
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
  const [name, setName] = useState('Master Resume');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await resumesApi.create({
        name,
        is_master: true,
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
          <h3 className="text-lg font-semibold text-gray-100">Create Master Resume</h3>
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
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 flex-1" disabled={creating}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-lg font-medium flex-1" disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Template Selection Modal
function TemplateModal({ 
  resume, 
  templates,
  templatePreviews,
  onClose, 
  onApply,
  onPreview,
  isApplying 
}: { 
  resume: Resume; 
  templates: Record<string, string>;
  templatePreviews: Record<string, string>;
  onClose: () => void; 
  onApply: (templateId: string) => void;
  onPreview: (templateId: string, templateName: string) => void;
  isApplying: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Apply Template</h3>
            <p className="text-sm text-gray-400 mt-1">Choose a template to upgrade "{resume.name}"</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200" disabled={isApplying}>
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-3 mb-6">
          <p className="text-sm text-gray-300">
            AI will intelligently blend your resume content with the selected template, preserving all details while upgrading the visual format.
          </p>
          <p className="text-xs text-gray-400 italic">
            👆 Click on any template card below to apply it
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
          {Object.keys(templates).length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <p>Loading templates...</p>
            </div>
          ) : (
            Object.entries(templates).map(([templateId, templateName]) => (
              <div
                key={templateId}
                className="p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-gray-100 font-medium mb-1">{templateName}</div>
                    <div className="text-xs text-gray-400 mb-2">{templateId}</div>
                    <div className="text-xs text-gray-500 italic">
                      {templatePreviews[templateId] || 'Professional resume template'}
                    </div>
                  </div>
                  <Sparkles size={20} className="text-purple-400 ml-3 flex-shrink-0" />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => onPreview(templateId, templateName)}
                    disabled={isApplying}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => onApply(templateId)}
                    disabled={isApplying}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {isApplying && (
          <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
              <span className="text-sm text-gray-300">Applying template... This may take a minute.</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 mt-4 border-t border-gray-700">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 flex-1" 
            disabled={isApplying}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Template Preview Modal
function TemplatePreviewModal({
  templateId,
  templateName,
  onClose
}: {
  templateId: string;
  templateName: string;
  onClose: () => void;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    // Load PDF preview
    const loadPreview = async () => {
      setIsLoading(true);
      setError(null);
      setPdfUrl(null);
      try {
        const previewUrl = resumesApi.getTemplatePreviewUrl(templateId);
        console.log('Loading preview from:', previewUrl);
        const response = await fetch(previewUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Preview fetch failed:', response.status, errorText);
          throw new Error(errorText || `Failed to load preview (${response.status})`);
        }
        
        const blob = await response.blob();
        console.log('Preview blob loaded, size:', blob.size);
        if (blob.size === 0) {
          throw new Error('Preview file is empty');
        }
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err: any) {
        console.error('Failed to load template preview:', err);
        setError(err.message || 'Preview not available');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPreview();
    
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [templateId]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full p-6 border border-gray-700 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Template Preview</h3>
            <p className="text-sm text-gray-400 mt-1">{templateName} ({templateId})</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-900 rounded-lg p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-400">Generating preview...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-red-400 mb-2">Preview Unavailable</p>
              <p className="text-gray-400 text-sm text-center max-w-md">{error}</p>
              <p className="text-gray-500 text-xs mt-4 text-center">
                The template will still work when applied - this is just a preview limitation.
              </p>
            </div>
          ) : pdfUrl ? (
            <div className="space-y-4">
              {/* PDF Controls */}
              {numPages > 1 && (
                <div className="flex items-center justify-center gap-4 bg-gray-800 p-2 rounded">
                  <button
                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                    className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm text-gray-300">
                    Page {pageNumber} of {numPages}
                  </span>
                  <button
                    onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                    disabled={pageNumber >= numPages}
                    className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-30"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
              
              {/* PDF Viewer */}
              <div className="flex justify-center">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={({ numPages }) => {
                    setNumPages(numPages);
                    setPageNumber(1);
                  }}
                  onLoadError={(error) => {
                    console.error('PDF load error:', error);
                    setError('Failed to load PDF preview');
                  }}
                  loading={<div className="p-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div></div>}
                  error={<div className="text-red-400 p-8 text-center">Failed to load PDF</div>}
                >
                  <Page 
                    pageNumber={pageNumber} 
                    scale={1.2}
                    renderTextLayer 
                    renderAnnotationLayer 
                    className="shadow-xl border border-gray-700"
                  />
                </Document>
              </div>
              
              <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                <p className="text-xs text-gray-300">
                  <strong>Note:</strong> This is a sample preview with placeholder data. When applied, AI will intelligently blend your actual resume content with this template format, preserving all your details while upgrading the visual appearance.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex gap-3 pt-4 mt-4 border-t border-gray-700">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 flex-1"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
