import { useState, useEffect } from 'react';
import { X, Plus, FileText, RefreshCw, ChevronDown } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { resumesApi } from '../api/client';
import type { Resume, ResumeContent, GenericSection, SectionType, BulletPointType } from '../types';
import { parseLatexToContent } from '../utils/latexParser';
import { migrateToGenericSections, createEmptySection } from '../utils/sectionMigration';
import { BULLET_POINT_TYPE_LABELS } from '../utils/bulletPointPlaceholders';
import GenericSectionForm from './resume-sections/GenericSectionForm';
import SortableSection from './resume-sections/SortableSection';

interface EditResumeModalProps {
  resumeId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_SECTIONS = 10;

export default function EditResumeModal({ resumeId, onClose, onSuccess }: EditResumeModalProps) {
  const [resume, setResume] = useState<Resume | null>(null);
  const [content, setContent] = useState<ResumeContent>({
    name: '',
    email: '',
    phone: '',
  });
  const [sections, setSections] = useState<GenericSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'latex'>('form');
  const [latexContent, setLatexContent] = useState<string>('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState<string>('');
  const [showSectionSelector, setShowSectionSelector] = useState(false);
  const [showBulletPointTypes, setShowBulletPointTypes] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const availableSectionTypes: { type: SectionType; label: string; defaultName: string }[] = [
    { type: 'text', label: 'Summary/Text', defaultName: 'Summary' },
    { type: 'bullet-points', label: 'Experience', defaultName: 'Experience' },
    { type: 'list', label: 'List', defaultName: 'Skills' },
    { type: 'education', label: 'Education', defaultName: 'Education' }
  ];

  const bulletPointTypes: BulletPointType[] = ['work-experience', 'projects', 'generic'];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );




  useEffect(() => {
    const loadResume = async () => {
      try {
        const resumeData = await resumesApi.getById(resumeId);
        setResume(resumeData);
        
        let loadedContent = resumeData.content || {
          name: '',
          email: '',
          phone: '',
        };
        
        let loadedLatex = '';
        
        // Load LaTeX content if available
        if (resumeData.latex_content) {
          loadedLatex = resumeData.latex_content;
        } else if (resumeData.file_type?.includes('tex')) {
          try {
            const fileUrl = resumesApi.getFileUrl(resumeId);
            const response = await fetch(fileUrl);
            if (response.ok) {
              loadedLatex = await response.text();
            }
          } catch (error) {
            console.error('Failed to fetch .tex file:', error);
          }
        }
        
        setLatexContent(loadedLatex);
        
        // Parse LaTeX content and merge with existing
        if (loadedLatex) {
          const parsedContent = parseLatexToContent(loadedLatex);
          loadedContent = {
            name: parsedContent.name || loadedContent.name || '',
            email: parsedContent.email || loadedContent.email || '',
            phone: parsedContent.phone || loadedContent.phone || '',
            // Preserve existing sections if they exist
            sections: loadedContent.sections,
            sectionOrder: loadedContent.sectionOrder,
          };
        }
        
        setContent(loadedContent);
        
        // Load or migrate sections
        let loadedSections: GenericSection[] = [];
        if (loadedContent.sections && loadedContent.sections.length > 0) {
          // Use new format sections - filter out any empty sections
          loadedSections = loadedContent.sections.filter(section => {
            // Keep section if it has meaningful content
            switch (section.data.type) {
              case 'text':
                return section.data.content.trim().length > 0;
              case 'bullet-points':
                return section.data.items.length > 0 && section.data.items.some(item => 
                  item.company?.trim() || item.role?.trim() || item.duration?.trim() || item.description?.trim()
                );
              case 'list':
                return section.data.items.length > 0 && section.data.items.some(item => item.trim().length > 0);
              case 'education':
                return section.data.degree.trim().length > 0;
              default:
                return true;
            }
          });
        } else {
          // Migrate from old format
          loadedSections = migrateToGenericSections(resumeData.content || {});
        }
        
        setSections(loadedSections);
        
        // Load section order
        if (loadedContent.sectionOrder && loadedContent.sectionOrder.length > 0) {
          setSectionOrder(loadedContent.sectionOrder);
        } else {
          setSectionOrder(loadedSections.map(s => s.id));
        }
      } catch (error) {
        console.error('Failed to load resume:', error);
        alert('Failed to load resume');
      } finally {
        setLoading(false);
      }
    };
    
    loadResume();
  }, [resumeId]);

  // Close section selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if ((showSectionSelector || showBulletPointTypes) && !target.closest('.section-selector-container')) {
        setShowSectionSelector(false);
        setShowBulletPointTypes(false);
      }
    };

    if (showSectionSelector || showBulletPointTypes) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSectionSelector, showBulletPointTypes]);


  const handleParseLatex = () => {
    if (!latexContent) {
      alert('No LaTeX content available to parse');
      return;
    }
    
    // Parse LaTeX content and convert to generic sections
    const parsed = parseLatexToContent(latexContent);
    const parsedSections = migrateToGenericSections(parsed);
    
    setContent(prev => ({
      ...prev,
      name: parsed.name || prev.name || '',
      email: parsed.email || prev.email || '',
      phone: parsed.phone || prev.phone || '',
    }));
    
    // Merge parsed sections with existing, preserving order
    setSections(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const newSections = parsedSections.filter(s => !existingIds.has(s.id));
      return [...prev, ...newSections];
    });
    
    setViewMode('form');
    alert('LaTeX content parsed and sections updated!');
  };

  const handleSave = async () => {
    if (!resume) return;

    // Validate required contact information
    const missingFields: string[] = [];
    if (!content.name?.trim()) missingFields.push('Full Name');
    if (!content.email?.trim()) missingFields.push('Email');
    if (!content.phone?.trim()) missingFields.push('Phone');

    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields in Contact Information:\n\n• ${missingFields.join('\n• ')}`);
      return;
    }

    setSaving(true);
    try {
      // Filter out empty sections before saving
      const sectionsToSave = sections.filter(section => {
        switch (section.data.type) {
          case 'text':
            return section.data.content.trim().length > 0;
          case 'bullet-points':
            return section.data.items.length > 0 && section.data.items.some(item => 
              item.company?.trim() || item.role?.trim() || item.duration?.trim() || item.description?.trim()
            );
          case 'list':
            return section.data.items.length > 0 && section.data.items.some(item => item.trim().length > 0);
          case 'education':
            return section.data.degree.trim().length > 0;
          default:
            return true;
        }
      });

      // Save content with sections
      const contentToSave: ResumeContent = {
        ...content,
        sections: sectionsToSave,
        sectionOrder: sectionOrder.filter(id => sectionsToSave.some(s => s.id === id)),
      };
      await resumesApi.update(resumeId, { content: contentToSave });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save resume:', error);
      alert('Failed to save resume');
    } finally {
      setSaving(false);
    }
  };


  const addSection = (sectionType: SectionType, bulletPointType?: BulletPointType) => {
    if (sections.length >= MAX_SECTIONS) {
      alert(`Maximum of ${MAX_SECTIONS} sections allowed.`);
      return;
    }
    
    setShowSectionSelector(false);
    setShowBulletPointTypes(false);
    
    const sectionTypeInfo = availableSectionTypes.find(s => s.type === sectionType);
    let defaultName = sectionTypeInfo?.defaultName || 'New Section';
    
    // Use bullet point type label if it's a bullet-points section
    if (sectionType === 'bullet-points' && bulletPointType) {
      defaultName = BULLET_POINT_TYPE_LABELS[bulletPointType];
    }
    
    const newSection = createEmptySection(sectionType, defaultName, bulletPointType);
    
    setSections(prev => [...prev, newSection]);
    setSectionOrder(prev => [...prev, newSection.id]);
  };

  const removeSection = (sectionId: string) => {
    // First clear the section's content
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        // Clear the section's data based on type
        switch (s.data.type) {
          case 'text':
            return { ...s, data: { type: 'text', content: '' } };
          case 'bullet-points':
            return { ...s, data: { type: 'bullet-points', items: [] } };
          case 'list':
            return { ...s, data: { type: 'list', items: [] } };
          case 'education':
            return { ...s, data: { type: 'education', degree: '', university: '', year: '' } };
          default:
            return s;
        }
      }
      return s;
    }));
    
    // Then remove the section from the array
    setTimeout(() => {
      setSections(prev => prev.filter(s => s.id !== sectionId));
      setSectionOrder(prev => prev.filter(id => id !== sectionId));
    }, 0);
  };

  const updateSection = (updatedSection: GenericSection) => {
    setSections(prev => prev.map(s => s.id === updatedSection.id ? updatedSection : s));
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    setSectionOrder((items) => {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  // Get sections in the correct order
  const orderedSections = sectionOrder
    .map(id => sections.find(s => s.id === id))
    .filter((s): s is GenericSection => s !== undefined);

  const handleSectionNameEdit = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      setEditingSectionId(sectionId);
      setEditingSectionName(section.name);
    }
  };

  const handleSectionNameSave = (sectionId: string, newName: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      updateSection({ ...section, name: newName });
    }
    setEditingSectionId(null);
    setEditingSectionName('');
  };

  const handleSectionNameCancel = () => {
    setEditingSectionId(null);
    setEditingSectionName('');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-700">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!resume) {
    return null;
  }



  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full p-8 border border-gray-700 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-gray-100">Edit Resume: {resume.name}</h3>
          <div className="flex items-center gap-3">
            {latexContent && (
              <button
                onClick={handleParseLatex}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                title="Parse LaTeX and fill form fields"
              >
                <RefreshCw size={16} />
                Parse LaTeX
              </button>
            )}
            <button
              onClick={() => setViewMode(viewMode === 'form' ? 'latex' : 'form')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'latex'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FileText size={16} />
              {viewMode === 'latex' ? 'Form View' : 'LaTeX View'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Contact Information Header */}
        <div className="mb-6 pr-8">
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
                Contact Information
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={content.name || ''}
                  onChange={(e) => setContent(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={content.email || ''}
                  onChange={(e) => setContent(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="john.doe@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={content.phone || ''}
                  onChange={(e) => setContent(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content Area - Toggle between Form and LaTeX */}
        <div className="flex-1 min-h-0 flex flex-col">
          {viewMode === 'latex' ? (
            /* LaTeX Viewer */
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
                <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
                  LaTeX Content
                </h4>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <pre className="bg-gray-900 rounded-lg p-4 text-gray-100 font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                  {latexContent || 'No LaTeX content available. LaTeX will be generated when you save the resume.'}
                </pre>
              </div>
            </div>
          ) : (
            /* Form View */
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-8 scrollbar-thin">
                {/* Section Selector */}
                <div className="relative section-selector-container">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">
                      {/* Note: Contact Information section is not included in this count */}
                      Sections: <span className={`font-semibold ${sections.length >= MAX_SECTIONS ? 'text-red-400' : 'text-gray-300'}`}>
                        {sections.length} / {MAX_SECTIONS}
                      </span>
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSectionSelector(!showSectionSelector)}
                    disabled={sections.length >= MAX_SECTIONS}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between gap-2 transition-colors ${
                      sections.length >= MAX_SECTIONS
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Plus size={16} />
                      Add Section
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${showSectionSelector ? 'rotate-180' : ''}`} />
                  </button>
                  {showSectionSelector && !showBulletPointTypes && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden">
                      {availableSectionTypes.map((sectionType) => (
                        <button
                          key={sectionType.type}
                          onClick={() => {
                            if (sectionType.type === 'bullet-points') {
                              setShowBulletPointTypes(true);
                            } else {
                              addSection(sectionType.type);
                            }
                          }}
                          disabled={sections.length >= MAX_SECTIONS}
                          className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between ${
                            sections.length >= MAX_SECTIONS
                              ? 'opacity-50 cursor-not-allowed text-gray-500'
                              : 'text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          <span>{sectionType.label}</span>
                          {sectionType.type === 'bullet-points' && (
                            <ChevronDown size={14} className="text-gray-400" />
                          )}
                          {sections.length >= MAX_SECTIONS && sectionType.type !== 'bullet-points' && (
                            <span className="text-xs text-red-400">Max reached</span>
                          )}
                        </button>
                      ))}
                      {sections.length >= MAX_SECTIONS && (
                        <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-700">
                          Maximum of {MAX_SECTIONS} sections reached
                        </div>
                      )}
                    </div>
                  )}
                  {showBulletPointTypes && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden">
                      <button
                        onClick={() => setShowBulletPointTypes(false)}
                        className="w-full px-4 py-2 text-left text-xs text-gray-400 hover:bg-gray-700 flex items-center gap-2 border-b border-gray-700"
                      >
                        <ChevronDown size={12} className="rotate-90" />
                        Back
                      </button>
                      {bulletPointTypes.map((bulletType) => (
                        <button
                          key={bulletType}
                          onClick={() => addSection('bullet-points', bulletType)}
                          disabled={sections.length >= MAX_SECTIONS}
                          className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                            sections.length >= MAX_SECTIONS
                              ? 'opacity-50 cursor-not-allowed text-gray-500'
                              : 'text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {BULLET_POINT_TYPE_LABELS[bulletType]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <SortableContext
                  items={sectionOrder}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedSections.map((section) => (
                    <SortableSection
                      key={section.id}
                      id={section.id}
                    >
                      <div className="relative group">
                        <button
                          onClick={() => removeSection(section.id)}
                          className="absolute top-2 left-2 z-10 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove section"
                        >
                          <X size={12} />
                        </button>
                        <GenericSectionForm
                          section={section}
                          onUpdate={updateSection}
                          isEditingName={editingSectionId === section.id}
                          onStartEditName={() => handleSectionNameEdit(section.id)}
                          onSaveName={(name) => handleSectionNameSave(section.id, name)}
                          onCancelEditName={handleSectionNameCancel}
                          editingSectionName={editingSectionName}
                          onEditingSectionNameChange={setEditingSectionName}
                        />
                      </div>
                    </SortableSection>
                  ))}
                  {orderedSections.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm">No sections added yet.</p>
                      <p className="text-xs mt-2">Click "Add Section" to get started.</p>
                    </div>
                  )}
                </SortableContext>
              </div>
              <DragOverlay>
                {activeId ? (
                  <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 opacity-90">
                    <div className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
                      {sections.find(s => s.id === activeId)?.name || activeId}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="flex gap-3 pt-5 mt-5 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 flex-1 text-base font-medium"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-lg font-medium flex-1 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
