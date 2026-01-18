import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import type { GenericSection, SectionData, BulletPointType } from '../../types';
import { BULLET_POINT_PLACEHOLDERS } from '../../utils/bulletPointPlaceholders';

interface GenericSectionFormProps {
  section: GenericSection;
  onUpdate: (section: GenericSection) => void;
  isEditingName: boolean;
  onStartEditName: () => void;
  onSaveName: (name: string) => void;
  onCancelEditName: () => void;
  editingSectionName: string;
  onEditingSectionNameChange: (name: string) => void;
}

export default function GenericSectionForm({
  section,
  onUpdate,
  isEditingName,
  onStartEditName,
  onSaveName,
  onCancelEditName,
  editingSectionName,
  onEditingSectionNameChange,
}: GenericSectionFormProps) {
  const updateData = (newData: SectionData) => {
    onUpdate({ ...section, data: newData });
  };

  const renderContent = () => {
    switch (section.data.type) {
      case 'text':
        return (
          <textarea
            value={section.data.content}
            onChange={(e) => updateData({ type: 'text', content: e.target.value })}
            className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter text content..."
          />
        );

      case 'bullet-points': {
        if (section.data.type !== 'bullet-points') return null;
        
        const bulletType: BulletPointType = section.bulletPointType || 'generic';
        const placeholders = BULLET_POINT_PLACEHOLDERS[bulletType];
        const bulletData = section.data;
        
        return (
          <div className="space-y-4">
            {bulletData.items.map((item, index) => (
              <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      {bulletType === 'work-experience' ? 'Company/Organization' : 
                       bulletType === 'projects' ? 'Project Name' : 'Title/Name'}
                    </label>
                    <input
                      type="text"
                      value={item.company || ''}
                      onChange={(e) => {
                        const newItems = [...bulletData.items];
                        newItems[index] = { ...item, company: e.target.value };
                        updateData({ type: 'bullet-points', items: newItems });
                      }}
                      className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={placeholders.company}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      {bulletType === 'work-experience' ? 'Job Role/Position' : 
                       bulletType === 'projects' ? 'Your Role' : 'Subtitle/Description'}
                    </label>
                    <input
                      type="text"
                      value={item.role || ''}
                      onChange={(e) => {
                        const newItems = [...bulletData.items];
                        newItems[index] = { ...item, role: e.target.value };
                        updateData({ type: 'bullet-points', items: newItems });
                      }}
                      className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={placeholders.role}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Duration</label>
                    <input
                      type="text"
                      value={item.duration || ''}
                      onChange={(e) => {
                        const newItems = [...bulletData.items];
                        newItems[index] = { ...item, duration: e.target.value };
                        updateData({ type: 'bullet-points', items: newItems });
                      }}
                      className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={placeholders.duration}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-400">Bullet Points</label>
                    <button
                      onClick={() => {
                        const newItems = [...bulletData.items];
                        newItems[index] = {
                          ...item,
                          bullet_points: [...(item.bullet_points || []), '']
                        };
                        updateData({ type: 'bullet-points', items: newItems });
                      }}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Add Point
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(item.bullet_points || []).map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="flex items-start gap-2">
                        <span className="text-gray-400 mt-2">•</span>
                        <input
                          type="text"
                          value={bullet}
                          onChange={(e) => {
                            const newItems = [...bulletData.items];
                            newItems[index] = {
                              ...item,
                              bullet_points: item.bullet_points.map((bp, i) => i === bulletIndex ? e.target.value : bp)
                            };
                            updateData({ type: 'bullet-points', items: newItems });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-600 rounded bg-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder={placeholders.bulletPoint}
                        />
                        <button
                          onClick={() => {
                            const newItems = [...bulletData.items];
                            newItems[index] = {
                              ...item,
                              bullet_points: item.bullet_points.filter((_, i) => i !== bulletIndex)
                            };
                            updateData({ type: 'bullet-points', items: newItems });
                          }}
                          className="p-2 text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newItems = bulletData.items.filter((_, i) => i !== index);
                    updateData({ type: 'bullet-points', items: newItems });
                  }}
                  className="w-full px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  Remove Item
                </button>
              </div>
            ))}
            {bulletData.items.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No items. Click "Add Item" to add one.</p>
            )}
            <button
              onClick={() => {
                updateData({
                  type: 'bullet-points',
                  items: [...bulletData.items, { bullet_points: [] }]
                });
              }}
              className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              Add Item
            </button>
          </div>
        );
      }

      case 'list':
        if (section.data.type !== 'list') return null;
        const listData = section.data;
        
        return (
          <div className="space-y-2">
            {listData.items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newItems = [...listData.items];
                    newItems[index] = e.target.value;
                    updateData({ type: 'list', items: newItems });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Item name"
                />
                <button
                  onClick={() => {
                    const newItems = listData.items.filter((_, i) => i !== index);
                    updateData({ type: 'list', items: newItems });
                  }}
                  className="p-2 text-red-400 hover:text-red-300"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {listData.items.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No items. Click "Add Item" to add one.</p>
            )}
            <button
              onClick={() => {
                updateData({ type: 'list', items: [...listData.items, ''] });
              }}
              className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              Add Item
            </button>
          </div>
        );

      case 'education':
        if (section.data.type !== 'education') return null;
        const eduData = section.data;
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Degree</label>
              <input
                type="text"
                value={eduData.degree || ''}
                onChange={(e) => updateData({ 
                  type: 'education',
                  degree: e.target.value,
                  university: eduData.university || '',
                  year: eduData.year || ''
                })}
                className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Bachelor of Science"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">University</label>
              <input
                type="text"
                value={eduData.university || ''}
                onChange={(e) => updateData({ 
                  type: 'education',
                  degree: eduData.degree || '',
                  university: e.target.value,
                  year: eduData.year || ''
                })}
                className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="University Name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Year</label>
              <input
                type="text"
                value={eduData.year || ''}
                onChange={(e) => updateData({ 
                  type: 'education',
                  degree: eduData.degree || '',
                  university: eduData.university || '',
                  year: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-800 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="2020"
              />
            </div>
          </div>
        );
    }
  };

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
              {section.name}
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
      {renderContent()}
    </div>
  );
}
