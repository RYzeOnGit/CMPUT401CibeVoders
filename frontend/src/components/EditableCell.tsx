/** Editable cell component for inline editing */
import { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onSave: (value: string) => void;
}

function EditableCell({ value, placeholder, multiline = false, onSave }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1 border border-primary-500 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none bg-gray-700 text-gray-100 border-gray-600"
          rows={3}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 border border-primary-500 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 bg-gray-700 text-gray-100 border-gray-600"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="px-2 py-1 rounded hover:bg-gray-700/50 cursor-pointer min-h-[24px] text-gray-200"
    >
      {value || <span className="text-gray-500">{placeholder}</span>}
    </div>
  );
}

export default EditableCell;

