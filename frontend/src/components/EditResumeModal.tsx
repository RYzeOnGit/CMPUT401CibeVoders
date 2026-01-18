import { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, RefreshCw, Edit2, Save } from 'lucide-react';
import { resumesApi } from '../api/client';
import type { Resume, ResumeContent, Experience } from '../types';

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
  const [sectionNames, setSectionNames] = useState({
    summary: 'Summary',
    experience: 'Experience',
    skills: 'Skills',
    education: 'Education'
  });
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState<string>('');



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
        
        // Parse LaTeX content and populate form fields
        if (loadedLatex) {
          const parsedContent = parseLatexToContent(loadedLatex);
          // Merge parsed content with existing content (parsed takes precedence for empty fields, otherwise merge)
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


  const handleParseLatex = () => {
    if (!latexContent) {
      alert('No LaTeX content available to parse');
      return;
    }
    
    // Parse LaTeX content and populate form fields
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
    setViewMode('form');
    alert('LaTeX content parsed and form fields updated!');
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
                <div className="flex items-center justify-between mb-3">
                  {editingSection === 'summary' ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setSectionNames(prev => ({ ...prev, summary: editingSectionName }));
                            setEditingSection(null);
                            setEditingSectionName('');
                          } else if (e.key === 'Escape') {
                            setEditingSection(null);
                            setEditingSectionName('');
                          }
                        }}
                        className="flex-1 px-3 py-1 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setSectionNames(prev => ({ ...prev, summary: editingSectionName }));
                          setEditingSection(null);
                          setEditingSectionName('');
                        }}
                        className="p-1 text-green-400 hover:text-green-300"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSection(null);
                          setEditingSectionName('');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-300"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="block text-sm font-semibold text-purple-400 uppercase tracking-wider">
                        {sectionNames.summary}
                      </label>
                      <button
                        onClick={() => {
                          setEditingSection('summary');
                          setEditingSectionName(sectionNames.summary);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-300"
                        title="Rename section"
                      >
                        <Edit2 size={14} />
                      </button>
                    </>
                  )}
                </div>
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
                  {editingSection === 'experience' ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setSectionNames(prev => ({ ...prev, experience: editingSectionName }));
                            setEditingSection(null);
                            setEditingSectionName('');
                          } else if (e.key === 'Escape') {
                            setEditingSection(null);
                            setEditingSectionName('');
                          }
                        }}
                        className="flex-1 px-3 py-1 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setSectionNames(prev => ({ ...prev, experience: editingSectionName }));
                          setEditingSection(null);
                          setEditingSectionName('');
                        }}
                        className="p-1 text-green-400 hover:text-green-300"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSection(null);
                          setEditingSectionName('');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-300"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="block text-sm font-semibold text-purple-400 uppercase tracking-wider">
                        {sectionNames.experience}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSection('experience');
                            setEditingSectionName(sectionNames.experience);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-300"
                          title="Rename section"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={addExperience}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-2"
                        >
                          <Plus size={14} />
                          Add Experience
                        </button>
                      </div>
                    </>
                  )}
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
                  {editingSection === 'skills' ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setSectionNames(prev => ({ ...prev, skills: editingSectionName }));
                            setEditingSection(null);
                            setEditingSectionName('');
                          } else if (e.key === 'Escape') {
                            setEditingSection(null);
                            setEditingSectionName('');
                          }
                        }}
                        className="flex-1 px-3 py-1 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setSectionNames(prev => ({ ...prev, skills: editingSectionName }));
                          setEditingSection(null);
                          setEditingSectionName('');
                        }}
                        className="p-1 text-green-400 hover:text-green-300"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSection(null);
                          setEditingSectionName('');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-300"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="block text-sm font-semibold text-purple-400 uppercase tracking-wider">
                        {sectionNames.skills}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSection('skills');
                            setEditingSectionName(sectionNames.skills);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-300"
                          title="Rename section"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={addSkill}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-2"
                        >
                          <Plus size={14} />
                          Add Skill
                        </button>
                      </div>
                    </>
                  )}
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
                <div className="flex items-center justify-between mb-3">
                  {editingSection === 'education' ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setSectionNames(prev => ({ ...prev, education: editingSectionName }));
                            setEditingSection(null);
                            setEditingSectionName('');
                          } else if (e.key === 'Escape') {
                            setEditingSection(null);
                            setEditingSectionName('');
                          }
                        }}
                        className="flex-1 px-3 py-1 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setSectionNames(prev => ({ ...prev, education: editingSectionName }));
                          setEditingSection(null);
                          setEditingSectionName('');
                        }}
                        className="p-1 text-green-400 hover:text-green-300"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSection(null);
                          setEditingSectionName('');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-300"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="block text-sm font-semibold text-purple-400 uppercase tracking-wider">
                        {sectionNames.education}
                      </label>
                      <button
                        onClick={() => {
                          setEditingSection('education');
                          setEditingSectionName(sectionNames.education);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-300"
                        title="Rename section"
                      >
                        <Edit2 size={14} />
                      </button>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Degree</label>
                    <input
                      type="text"
                      value={content.education?.degree || ''}
                      onChange={(e) => setContent(prev => ({
                        ...prev,
                        education: { 
                          degree: e.target.value,
                          university: prev.education?.university || '',
                          year: prev.education?.year || ''
                        }
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
                        education: { 
                          degree: prev.education?.degree || '',
                          university: e.target.value,
                          year: prev.education?.year || ''
                        }
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
                        education: { 
                          degree: prev.education?.degree || '',
                          university: prev.education?.university || '',
                          year: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="2020"
                    />
                  </div>
                </div>
              </div>

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
