import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useSkillsSection } from '../../hooks/useSkillsSection';
import type { ResumeContent } from '../../types';

interface SkillsSectionFormProps {
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

export default function SkillsSectionForm({
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
}: SkillsSectionFormProps) {
  const { skills, addSkill, updateSkill, removeSkill } = useSkillsSection({ content, setContent });
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
        {skills.map((skill, index) => (
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
        {skills.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No skills added. Click "Add Skill" to add one.</p>
        )}
      </div>
    </div>
  );
}
