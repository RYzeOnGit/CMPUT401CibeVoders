import { Edit2, Save, X } from 'lucide-react';
import { useEducationSection } from '../../hooks/useEducationSection';
import type { ResumeContent } from '../../types';

interface EducationSectionFormProps {
  content: ResumeContent;
  setContent: React.Dispatch<React.SetStateAction<ResumeContent>>;
  sectionName: string;
  onSectionNameChange: (name: string) => void;
  isEditingName: boolean;
  onStartEditName: () => void;
  onSaveName: (name: string) => void;
  onCancelEditName: () => void;
  editingSectionName: string;
  onEditingSectionNameChange: (name: string) => void;
}

export default function EducationSectionForm({
  content,
  setContent,
  sectionName,
  onSectionNameChange,
  isEditingName,
  onStartEditName,
  onSaveName,
  onCancelEditName,
  editingSectionName,
  onEditingSectionNameChange,
}: EducationSectionFormProps) {
  const { education, updateEducation } = useEducationSection({ content, setContent });
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        {isEditingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editingSectionName}
              onChange={(e) => onEditingSectionNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSaveName(editingSectionName);
                } else if (e.key === 'Escape') {
                  onCancelEditName();
                }
              }}
              className="flex-1 px-3 py-1 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
            <button
              onClick={() => onSaveName(editingSectionName)}
              className="p-1 text-green-400 hover:text-green-300"
            >
              <Save size={14} />
            </button>
            <button
              onClick={onCancelEditName}
              className="p-1 text-gray-400 hover:text-gray-300"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <label className="block text-sm font-semibold text-purple-400 uppercase tracking-wider">
              {sectionName}
            </label>
            <button
              onClick={onStartEditName}
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
            value={education?.degree || ''}
            onChange={(e) => updateEducation({ 
              degree: e.target.value,
              university: education?.university || '',
              year: education?.year || ''
            })}
            className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Bachelor of Science"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">University</label>
          <input
            type="text"
            value={education?.university || ''}
            onChange={(e) => updateEducation({ 
              degree: education?.degree || '',
              university: e.target.value,
              year: education?.year || ''
            })}
            className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="University Name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Year</label>
          <input
            type="text"
            value={education?.year || ''}
            onChange={(e) => updateEducation({ 
              degree: education?.degree || '',
              university: education?.university || '',
              year: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="2020"
          />
        </div>
      </div>
    </div>
  );
}
