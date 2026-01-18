import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Trash2, FileText, GripVertical, RefreshCw, Edit2, Save } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { resumesApi } from '../api/client';
import type { Resume, ResumeContent, Experience, Education } from '../types';

interface EditResumeModalProps {
  resumeId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditResumeModal({ resumeId, onClose, onSuccess }: EditResumeModalProps) {
  const [resume, setResume] = useState<Resume | null>(null);
  const [content, setContent] = useState<ResumeContent>({
    name: '',
    email: '',
    phone: '',
    summary: '',
    experience: [],
    skills: [],
    education: { degree: '', university: '', year: '' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'latex'>('form');
  const [latexContent, setLatexContent] = useState<string>('');
  const [sections, setSections] = useState<Array<{ id: string; name: string; content: string }>>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Parse LaTeX to extract all sections dynamically
  const parseLatexSections = (latex: string): Array<{ id: string; name: string; content: string }> => {
    const sections: Array<{ id: string; name: string; content: string }> = [];
    
    if (!latex) return sections;
    
    // Extract all \section{Name}... patterns
    const sectionPattern = /\\section\{([^}]+)\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/gi;
    let match;
    let sectionIndex = 0;
    
    while ((match = sectionPattern.exec(latex)) !== null) {
      const sectionName = match[1].trim();
      let sectionContent = match[2].trim();
      
      // Clean up LaTeX commands
      sectionContent = sectionContent
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\\textit\{([^}]+)\}/g, '$1')
        .replace(/\\emph\{([^}]+)\}/g, '$1')
        .replace(/\\text\{([^}]+)\}/g, '$1')
        .replace(/\\par/g, '\n')
        .replace(/\\item\s*/g, '• ')
        .replace(/\\begin\{itemize\}[\s\S]*?\\end\{itemize\}/g, (m) => {
          return m.replace(/\\begin\{itemize\}|\{|\}|\\end\{itemize\}/g, '')
            .replace(/\\item\s*/g, '• ')
            .trim();
        })
        .replace(/\{|\}/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      sections.push({
        id: `section-${sectionIndex++}`,
        name: sectionName,
        content: sectionContent
      });
    }
    
    return sections;
  };

  // Parse LaTeX content and extract structured data
  const parseLatexToContent = (latex: string): ResumeContent => {
    const parsed: ResumeContent = {
      name: '',
      email: '',
      phone: '',
      summary: '',
      experience: [],
      skills: [],
      education: { degree: '', university: '', year: '' }
    };

    if (!latex) return parsed;

    // Extract name - common patterns: \name{}, \author{}, \fullname{}
    const namePatterns = [
      /\\name\{([^}]+)\}/,
      /\\author\{([^}]+)\}/,
      /\\fullname\{([^}]+)\}/,
      /\\newcommand\{\\name\}\{([^}]+)\}/
    ];
    for (const pattern of namePatterns) {
      const match = latex.match(pattern);
      if (match) {
        parsed.name = match[1].trim();
        break;
      }
    }

    // Extract email
    const emailPatterns = [
      /\\email\{([^}]+)\}/,
      /\\href\{mailto:([^}]+)\}/,
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
    ];
    for (const pattern of emailPatterns) {
      const match = latex.match(pattern);
      if (match) {
        parsed.email = match[1].trim();
        break;
      }
    }

    // Extract phone
    const phonePatterns = [
      /\\phone\{([^}]+)\}/,
      /\\mobile\{([^}]+)\}/,
      /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/
    ];
    for (const pattern of phonePatterns) {
      const match = latex.match(pattern);
      if (match) {
        parsed.phone = match[1].trim();
        break;
      }
    }

    // Extract summary/objective - usually in a section or paragraph
    const summaryPatterns = [
      /\\section\{Summary\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
      /\\section\{Objective\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
      /\\section\{About\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i
    ];
    for (const pattern of summaryPatterns) {
      const match = latex.match(pattern);
      if (match) {
        let summaryText = match[1]
          .replace(/\\textbf\{([^}]+)\}/g, '$1')
          .replace(/\\textit\{([^}]+)\}/g, '$1')
          .replace(/\\emph\{([^}]+)\}/g, '$1')
          .replace(/\\text\{([^}]+)\}/g, '$1')
          .replace(/\\par/g, '\n')
          .replace(/\{|\}/g, '')
          .trim();
        parsed.summary = summaryText;
        break;
      }
    }

    // Extract experience
    const experiencePattern = /\\section\{Experience\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i;
    const expMatch = latex.match(experiencePattern);
    if (expMatch) {
      const expContent = expMatch[1];
      
      // Try to find individual experience entries
      const expEntries: Experience[] = [];
      
      // Simpler approach: look for itemize items
      const itemizePattern = /\\begin\{itemize\}[\s\S]*?\\end\{itemize\}/gi;
      const itemizeMatch = expContent.match(itemizePattern);
      
      if (itemizeMatch) {
        const items = itemizeMatch[0].match(/\\item\s*([^\n]+)/g) || [];
        items.forEach((item) => {
          const text = item.replace(/\\item\s*/, '').replace(/\{|\}/g, '').trim();
          // Try to extract company, role, duration from text
          const parts = text.split(/[|•]/).map(p => p.trim());
          if (parts.length >= 2) {
            expEntries.push({
              company: parts[0] || '',
              role: parts[1] || '',
              duration: parts[2] || '',
              bullet_points: []
            });
          }
        });
      }
      
      // If no structured entries found, create one from raw text
      if (expEntries.length === 0) {
        const cleanText = expContent
          .replace(/\\textbf\{([^}]+)\}/g, '$1')
          .replace(/\\textit\{([^}]+)\}/g, '$1')
          .replace(/\\emph\{([^}]+)\}/g, '$1')
          .replace(/\\text\{([^}]+)\}/g, '$1')
          .replace(/\\par/g, '\n')
          .replace(/\{|\}/g, '')
          .trim();
        
        if (cleanText) {
          expEntries.push({
            company: '',
            role: '',
            duration: '',
            bullet_points: cleanText.split('\n').filter(l => l.trim()).map(l => l.replace(/^[•\-\*]\s*/, '').trim())
          });
        }
      }
      
      parsed.experience = expEntries;
    }

    // Extract skills
    const skillsPattern = /\\section\{Skills?\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i;
    const skillsMatch = latex.match(skillsPattern);
    if (skillsMatch) {
      const skillsContent = skillsMatch[1];
      // Extract from itemize or comma-separated
      const itemizeMatch = skillsContent.match(/\\begin\{itemize\}[\s\S]*?\\end\{itemize\}/);
      if (itemizeMatch) {
        const items = itemizeMatch[0].match(/\\item\s*([^\n]+)/g) || [];
        parsed.skills = items.map(item => 
          item.replace(/\\item\s*/, '').replace(/\{|\}/g, '').trim()
        );
      } else {
        // Try comma-separated or other formats
        const skillsText = skillsContent
          .replace(/\\textbf\{([^}]+)\}/g, '$1')
          .replace(/\{|\}/g, '')
          .trim();
        parsed.skills = skillsText.split(/[,;]/).map(s => s.trim()).filter(s => s);
      }
    }

    // Extract education
    const educationPattern = /\\section\{Education\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i;
    const eduMatch = latex.match(educationPattern);
    if (eduMatch) {
      const eduContent = eduMatch[1];
      const eduText = eduContent
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\\textit\{([^}]+)\}/g, '$1')
        .replace(/\{|\}/g, '')
        .trim();
      
      // Try to extract degree, university, year
      const yearMatch = eduText.match(/(\d{4})/);
      const year = yearMatch ? yearMatch[1] : '';
      
      // Common patterns: "Degree from University (Year)" or "University - Degree"
      const parts = eduText.split(/[,\-\(\)]/).map(p => p.trim()).filter(p => p && !p.match(/^\d{4}$/));
      if (parts.length >= 2) {
        parsed.education = {
          degree: parts[0] || '',
          university: parts[1] || '',
          year: year
        };
      } else if (parts.length === 1) {
        parsed.education = {
          degree: parts[0] || '',
          university: '',
          year: year
        };
      }
    }

    return parsed;
  };

  useEffect(() => {
    const loadResume = async () => {
      try {
        const resumeData = await resumesApi.getById(resumeId);
        setResume(resumeData);
        
        let loadedContent = resumeData.content || {
          name: '',
          email: '',
          phone: '',
          summary: '',
          experience: [],
          skills: [],
          education: { degree: '', university: '', year: '' }
        };
        
        let loadedLatex = '';
        
        // Load LaTeX content if available
        if (resumeData.latex_content) {
          loadedLatex = resumeData.latex_content;
        } else if (resumeData.file_type?.includes('tex')) {
          // Fetch .tex file content
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
        
        // Parse LaTeX sections dynamically
        if (loadedLatex) {
          const parsedSections = parseLatexSections(loadedLatex);
          if (parsedSections.length > 0) {
            setSections(parsedSections);
          }
          
          // If content is empty/minimal, parse LaTeX to fill content
          if (!loadedContent.name && !loadedContent.email && !loadedContent.summary) {
            const parsedContent = parseLatexToContent(loadedLatex);
            // Merge parsed content with existing content (parsed takes precedence for empty fields)
            loadedContent = {
              name: parsedContent.name || loadedContent.name || '',
              email: parsedContent.email || loadedContent.email || '',
              phone: parsedContent.phone || loadedContent.phone || '',
              summary: parsedContent.summary || loadedContent.summary || '',
              experience: parsedContent.experience?.length ? parsedContent.experience : loadedContent.experience || [],
              skills: parsedContent.skills?.length ? parsedContent.skills : loadedContent.skills || [],
              education: parsedContent.education?.degree ? parsedContent.education : loadedContent.education || { degree: '', university: '', year: '' }
            };
          }
        }
        
        setContent(loadedContent);
      } catch (error) {
        console.error('Failed to load resume:', error);
        alert('Failed to load resume');
      } finally {
        setLoading(false);
      }
    };
    
    loadResume();
  }, [resumeId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRenameSection = (sectionId: string, newName: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, name: newName } : section
    ));
    setEditingSectionId(null);
    setEditingSectionName('');
  };

  const startEditingSection = (sectionId: string, currentName: string) => {
    setEditingSectionId(sectionId);
    setEditingSectionName(currentName);
  };

  const updateSectionContent = useCallback((sectionId: string, newContent: string) => {
    setSections(prev => {
      // Create a new array with updated section
      return prev.map(section => {
        if (section.id === sectionId) {
          return { ...section, content: newContent };
        }
        return section;
      });
    });
  }, []);

  const handleParseLatex = () => {
    if (!latexContent) {
      alert('No LaTeX content available to parse');
      return;
    }
    
    // Parse sections from LaTeX
    const parsedSections = parseLatexSections(latexContent);
    if (parsedSections.length > 0) {
      setSections(parsedSections);
      setViewMode('form');
      alert(`Parsed ${parsedSections.length} sections from LaTeX!`);
    } else {
      // Fallback to old parsing method
      const parsed = parseLatexToContent(latexContent);
      setContent(prev => ({
        name: parsed.name || prev.name || '',
        email: parsed.email || prev.email || '',
        phone: parsed.phone || prev.phone || '',
        summary: parsed.summary || prev.summary || '',
        experience: parsed.experience?.length ? parsed.experience : prev.experience || [],
        skills: parsed.skills?.length ? parsed.skills : prev.skills || [],
        education: parsed.education?.degree ? parsed.education : prev.education || { degree: '', university: '', year: '' }
      }));
      alert('LaTeX content parsed and form fields updated!');
    }
  };

  const handleSave = async () => {
    if (!resume) return;

    setSaving(true);
    try {
      await resumesApi.update(resumeId, { content });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save resume:', error);
      alert('Failed to save resume');
    } finally {
      setSaving(false);
    }
  };

  const addExperience = () => {
    setContent(prev => ({
      ...prev,
      experience: [...(prev.experience || []), { company: '', role: '', duration: '', bullet_points: [] }]
    }));
  };

  const updateExperience = (index: number, field: keyof Experience, value: any) => {
    setContent(prev => {
      const newExp = [...(prev.experience || [])];
      newExp[index] = { ...newExp[index], [field]: value };
      return { ...prev, experience: newExp };
    });
  };

  const removeExperience = (index: number) => {
    setContent(prev => ({
      ...prev,
      experience: (prev.experience || []).filter((_, i) => i !== index)
    }));
  };

  const addBulletPoint = (expIndex: number) => {
    setContent(prev => {
      const newExp = [...(prev.experience || [])];
      newExp[expIndex] = {
        ...newExp[expIndex],
        bullet_points: [...(newExp[expIndex].bullet_points || []), '']
      };
      return { ...prev, experience: newExp };
    });
  };

  const updateBulletPoint = (expIndex: number, bulletIndex: number, value: string) => {
    setContent(prev => {
      const newExp = [...(prev.experience || [])];
      newExp[expIndex] = {
        ...newExp[expIndex],
        bullet_points: newExp[expIndex].bullet_points.map((bp, i) => i === bulletIndex ? value : bp)
      };
      return { ...prev, experience: newExp };
    });
  };

  const removeBulletPoint = (expIndex: number, bulletIndex: number) => {
    setContent(prev => {
      const newExp = [...(prev.experience || [])];
      newExp[expIndex] = {
        ...newExp[expIndex],
        bullet_points: newExp[expIndex].bullet_points.filter((_, i) => i !== bulletIndex)
      };
      return { ...prev, experience: newExp };
    });
  };

  const addSkill = () => {
    setContent(prev => ({
      ...prev,
      skills: [...(prev.skills || []), '']
    }));
  };

  const updateSkill = (index: number, value: string) => {
    setContent(prev => {
      const newSkills = [...(prev.skills || [])];
      newSkills[index] = value;
      return { ...prev, skills: newSkills };
    });
  };

  const removeSkill = (index: number) => {
    setContent(prev => ({
      ...prev,
      skills: (prev.skills || []).filter((_, i) => i !== index)
    }));
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

  // Section Textarea Component - isolated to prevent drag interference
  function SectionTextarea({ sectionId, content, onUpdate }: { sectionId: string; content: string; onUpdate: (id: string, value: string) => void }) {
    const [localValue, setLocalValue] = useState(content);
    const isInternalUpdate = useRef(false);
    
    useEffect(() => {
      // Only update if the change came from outside (not from our own onChange)
      if (!isInternalUpdate.current) {
        setLocalValue(content);
      }
      isInternalUpdate.current = false;
    }, [content]);
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      isInternalUpdate.current = true;
      setLocalValue(value);
      onUpdate(sectionId, value);
    };
    
    return (
      <textarea
        value={localValue}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm resize-y min-h-[200px] font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Section content..."
      />
    );
  }

  // Sortable Section Component
  function SortableSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ 
      id,
      disabled: false,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-gray-900 rounded-lg border border-gray-700 p-4 flex flex-col"
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
          <div className="flex items-center gap-2 flex-1">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 touch-none select-none"
            >
              <GripVertical size={16} />
            </div>
            <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
              {title}
            </h4>
          </div>
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-7xl w-full p-8 border border-gray-700 max-h-[95vh] flex flex-col">
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
        <div className="mb-4 pb-4 border-b border-gray-700">
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
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
              <div className="flex-1 overflow-y-auto">
                <pre className="bg-gray-900 rounded-lg p-4 text-gray-100 font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                  {latexContent || 'No LaTeX content available. LaTeX will be generated when you save the resume.'}
                </pre>
              </div>
            </div>
          ) : (
            /* Form View */
            <div className="flex-1 overflow-y-auto min-h-0 space-y-6">
              {/* Summary Section */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                <label className="block text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">
                  Summary
                </label>
                <textarea
                  value={content.summary || ''}
                  onChange={(e) => setContent(prev => ({ ...prev, summary: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Professional summary or objective..."
                />
              </div>

              {/* Experience Section */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-purple-400 uppercase tracking-wider">
                    Experience
                  </label>
                  <button
                    onClick={addExperience}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Add Experience
                  </button>
                </div>
                <div className="space-y-4">
                  {(content.experience || []).map((exp, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Company</label>
                          <input
                            type="text"
                            value={exp.company || ''}
                            onChange={(e) => updateExperience(index, 'company', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Company Name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Role</label>
                          <input
                            type="text"
                            value={exp.role || ''}
                            onChange={(e) => updateExperience(index, 'role', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Job Title"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Duration</label>
                          <input
                            type="text"
                            value={exp.duration || ''}
                            onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Jan 2020 - Present"
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-medium text-gray-400">Bullet Points</label>
                          <button
                            onClick={() => addBulletPoint(index)}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs flex items-center gap-1"
                          >
                            <Plus size={12} />
                            Add Point
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(exp.bullet_points || []).map((bullet, bulletIndex) => (
                            <div key={bulletIndex} className="flex items-start gap-2">
                              <span className="text-gray-400 mt-2">•</span>
                              <input
                                type="text"
                                value={bullet}
                                onChange={(e) => updateBulletPoint(index, bulletIndex, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-600 rounded bg-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Achievement or responsibility..."
                              />
                              <button
                                onClick={() => removeBulletPoint(index, bulletIndex)}
                                className="p-2 text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => removeExperience(index)}
                        className="w-full px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm flex items-center justify-center gap-2"
                      >
                        <Trash2 size={14} />
                        Remove Experience
                      </button>
                    </div>
                  ))}
                  {(!content.experience || content.experience.length === 0) && (
                    <p className="text-gray-500 text-sm text-center py-4">No experience entries. Click "Add Experience" to add one.</p>
                  )}
                </div>
              </div>

              {/* Skills Section */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-purple-400 uppercase tracking-wider">
                    Skills
                  </label>
                  <button
                    onClick={addSkill}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Add Skill
                  </button>
                </div>
                <div className="space-y-2">
                  {(content.skills || []).map((skill, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={skill}
                        onChange={(e) => updateSkill(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Skill name"
                      />
                      <button
                        onClick={() => removeSkill(index)}
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {(!content.skills || content.skills.length === 0) && (
                    <p className="text-gray-500 text-sm text-center py-4">No skills added. Click "Add Skill" to add one.</p>
                  )}
                </div>
              </div>

              {/* Education Section */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                <label className="block text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">
                  Education
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Degree</label>
                    <input
                      type="text"
                      value={content.education?.degree || ''}
                      onChange={(e) => setContent(prev => ({
                        ...prev,
                        education: { ...prev.education, degree: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Bachelor of Science"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">University</label>
                    <input
                      type="text"
                      value={content.education?.university || ''}
                      onChange={(e) => setContent(prev => ({
                        ...prev,
                        education: { ...prev.education, university: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="University Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Year</label>
                    <input
                      type="text"
                      value={content.education?.year || ''}
                      onChange={(e) => setContent(prev => ({
                        ...prev,
                        education: { ...prev.education, year: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="2020"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic LaTeX Sections (if any) */}
              {sections.length > 0 && (
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-purple-400 uppercase tracking-wider">
                      Additional Sections (from LaTeX)
                    </label>
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sections.map((section) => (
                          <SortableSection key={section.id} id={section.id} title={section.name}>
                            <div className="space-y-2">
                              {/* Editable Section Name */}
                              <div className="flex items-center gap-2">
                                {editingSectionId === section.id ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <input
                                      type="text"
                                      value={editingSectionName}
                                      onChange={(e) => setEditingSectionName(e.target.value)}
                                      onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') {
                                          handleRenameSection(section.id, editingSectionName);
                                        } else if (e.key === 'Escape') {
                                          setEditingSectionId(null);
                                          setEditingSectionName('');
                                        }
                                      }}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-1 px-2 py-1 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleRenameSection(section.id, editingSectionName)}
                                      className="p-1 text-green-400 hover:text-green-300"
                                    >
                                      <Save size={14} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingSectionId(null);
                                        setEditingSectionName('');
                                      }}
                                      className="p-1 text-gray-400 hover:text-gray-300"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <h5 className="text-xs font-semibold text-purple-300 flex-1">
                                      {section.name}
                                    </h5>
                                    <button
                                      onClick={() => startEditingSection(section.id, section.name)}
                                      className="p-1 text-gray-400 hover:text-gray-300"
                                      title="Rename section"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                              {/* Section Content */}
                              <SectionTextarea
                                sectionId={section.id}
                                content={section.content || ''}
                                onUpdate={updateSectionContent}
                              />
                            </div>
                          </SortableSection>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>
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
