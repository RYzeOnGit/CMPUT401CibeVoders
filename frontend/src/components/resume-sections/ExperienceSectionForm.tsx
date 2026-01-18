import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import type { Experience, ResumeContent } from '../../types';
import { useExperienceSection } from '../../hooks/useExperienceSection';

interface ExperienceSectionFormProps {
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

export default function ExperienceSectionForm({
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
}: ExperienceSectionFormProps) {
  const {
    experiences,
    addExperience,
    updateExperience,
    removeExperience,
    addBulletPoint,
    updateBulletPoint,
    removeBulletPoint,
  } = useExperienceSection({ content, setContent });
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
            <div className="flex items-center gap-2">
              <button
                onClick={onStartEditName}
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
        {experiences.map((exp, index) => (
          <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Company</label>
                  <input
                    type="text"
                    value={exp.company || ''}
                    onChange={(e) => updateExperience(index, 'company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Company/Organization/Project Name"
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
        {experiences.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No experience entries. Click "Add Experience" to add one.</p>
        )}
      </div>
    </div>
  );
}
