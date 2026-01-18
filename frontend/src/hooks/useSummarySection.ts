import { useCallback } from 'react';
import type { ResumeContent } from '../types';

interface UseSummarySectionProps {
  content: ResumeContent;
  setContent: React.Dispatch<React.SetStateAction<ResumeContent>>;
}

export function useSummarySection({ content, setContent }: UseSummarySectionProps) {
  const summary = content.summary || '';

  const updateSummary = useCallback((value: string) => {
    setContent(prev => ({ ...prev, summary: value }));
  }, [setContent]);

  return {
    summary,
    updateSummary,
  };
}
