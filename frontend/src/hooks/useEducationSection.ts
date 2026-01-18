import { useCallback } from 'react';
import type { ResumeContent, Education } from '../types';

interface UseEducationSectionProps {
  content: ResumeContent;
  setContent: React.Dispatch<React.SetStateAction<ResumeContent>>;
}

export function useEducationSection({ content, setContent }: UseEducationSectionProps) {
  const education = content.education || { degree: '', university: '', year: '' };

  const updateEducation = useCallback((education: Education) => {
    setContent(prev => ({ ...prev, education }));
  }, [setContent]);

  return {
    education,
    updateEducation,
  };
}
