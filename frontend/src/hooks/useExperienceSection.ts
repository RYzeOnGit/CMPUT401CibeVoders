import { useCallback } from 'react';
import type { ResumeContent, Experience } from '../types';

interface UseExperienceSectionProps {
  content: ResumeContent;
  setContent: React.Dispatch<React.SetStateAction<ResumeContent>>;
}

export function useExperienceSection({ content, setContent }: UseExperienceSectionProps) {
  const experiences = content.experience || [];

  const addExperience = useCallback(() => {
    setContent(prev => ({
      ...prev,
      experience: [...(prev.experience || []), { company: '', role: '', duration: '', bullet_points: [] }]
    }));
  }, [setContent]);

  const updateExperience = useCallback((index: number, field: keyof Experience, value: any) => {
    setContent(prev => {
      const newExp = [...(prev.experience || [])];
      newExp[index] = { ...newExp[index], [field]: value };
      return { ...prev, experience: newExp };
    });
  }, [setContent]);

  const removeExperience = useCallback((index: number) => {
    setContent(prev => ({
      ...prev,
      experience: (prev.experience || []).filter((_, i) => i !== index)
    }));
  }, [setContent]);

  const addBulletPoint = useCallback((expIndex: number) => {
    setContent(prev => {
      const newExp = [...(prev.experience || [])];
      newExp[expIndex] = {
        ...newExp[expIndex],
        bullet_points: [...(newExp[expIndex].bullet_points || []), '']
      };
      return { ...prev, experience: newExp };
    });
  }, [setContent]);

  const updateBulletPoint = useCallback((expIndex: number, bulletIndex: number, value: string) => {
    setContent(prev => {
      const newExp = [...(prev.experience || [])];
      newExp[expIndex] = {
        ...newExp[expIndex],
        bullet_points: newExp[expIndex].bullet_points.map((bp, i) => i === bulletIndex ? value : bp)
      };
      return { ...prev, experience: newExp };
    });
  }, [setContent]);

  const removeBulletPoint = useCallback((expIndex: number, bulletIndex: number) => {
    setContent(prev => {
      const newExp = [...(prev.experience || [])];
      newExp[expIndex] = {
        ...newExp[expIndex],
        bullet_points: newExp[expIndex].bullet_points.filter((_, i) => i !== bulletIndex)
      };
      return { ...prev, experience: newExp };
    });
  }, [setContent]);

  return {
    experiences,
    addExperience,
    updateExperience,
    removeExperience,
    addBulletPoint,
    updateBulletPoint,
    removeBulletPoint,
  };
}
