import { useCallback } from 'react';
import type { ResumeContent } from '../types';

interface UseSkillsSectionProps {
  content: ResumeContent;
  setContent: React.Dispatch<React.SetStateAction<ResumeContent>>;
}

export function useSkillsSection({ content, setContent }: UseSkillsSectionProps) {
  const skills = content.skills || [];

  const addSkill = useCallback(() => {
    setContent(prev => ({
      ...prev,
      skills: [...(prev.skills || []), '']
    }));
  }, [setContent]);

  const updateSkill = useCallback((index: number, value: string) => {
    setContent(prev => {
      const newSkills = [...(prev.skills || [])];
      newSkills[index] = value;
      return { ...prev, skills: newSkills };
    });
  }, [setContent]);

  const removeSkill = useCallback((index: number) => {
    setContent(prev => ({
      ...prev,
      skills: (prev.skills || []).filter((_, i) => i !== index)
    }));
  }, [setContent]);

  return {
    skills,
    addSkill,
    updateSkill,
    removeSkill,
  };
}
