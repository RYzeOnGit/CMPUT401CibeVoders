import type { ResumeContent, GenericSection, SectionType, BulletPointType } from '../types';

/**
 * Migrates old ResumeContent format to new generic sections format
 */
export function migrateToGenericSections(content: ResumeContent): GenericSection[] {
  const sections: GenericSection[] = [];
  let idCounter = 1;

  // Migrate summary - only if it has actual content (not just whitespace)
  if (content.summary && content.summary.trim().length > 0) {
    sections.push({
      id: `section-${idCounter++}`,
      type: 'text',
      name: 'Summary',
      data: { type: 'text', content: content.summary }
    });
  }

  // Migrate experience - only if there are entries with actual content
  if (content.experience && content.experience.length > 0) {
    const hasContent = content.experience.some(exp => 
      exp.company?.trim() || exp.role?.trim() || exp.duration?.trim() || 
      (exp.bullet_points && exp.bullet_points.some(bp => bp.trim()))
    );
    if (hasContent) {
      sections.push({
        id: `section-${idCounter++}`,
        type: 'bullet-points',
        name: 'Experience',
        bulletPointType: 'work-experience',
        data: {
          type: 'bullet-points',
          items: content.experience.map(exp => ({
            company: exp.company,
            role: exp.role,
            duration: exp.duration,
            description: exp.bullet_points ? exp.bullet_points.join('\n') : ''
          }))
        }
      });
    }
  }

  // Migrate skills - only if there are skills with actual content
  if (content.skills && content.skills.length > 0) {
    const hasContent = content.skills.some(skill => skill.trim().length > 0);
    if (hasContent) {
      sections.push({
        id: `section-${idCounter++}`,
        type: 'list',
        name: 'Skills',
        data: { type: 'list', items: content.skills }
      });
    }
  }

  // Migrate education - only if degree has actual content
  if (content.education && content.education.degree && content.education.degree.trim().length > 0) {
    sections.push({
      id: `section-${idCounter++}`,
      type: 'education',
      name: 'Education',
      data: {
        type: 'education',
        degree: content.education.degree,
        university: content.education.university || '',
        year: content.education.year || ''
      }
    });
  }

  return sections;
}

/**
 * Generates a unique section ID
 */
export function generateSectionId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a new empty section of the specified type
 */
export function createEmptySection(type: SectionType, name: string, bulletPointType?: BulletPointType): GenericSection {
  const id = generateSectionId();
  
  switch (type) {
    case 'text':
      return {
        id,
        type: 'text',
        name,
        data: { type: 'text', content: '' }
      };
    case 'bullet-points':
      return {
        id,
        type: 'bullet-points',
        name,
        bulletPointType: bulletPointType || 'generic',
        data: { type: 'bullet-points', items: [{ description: '' }] }
      };
    case 'list':
      return {
        id,
        type: 'list',
        name,
        data: { type: 'list', items: [] }
      };
    case 'education':
      return {
        id,
        type: 'education',
        name,
        data: { type: 'education', degree: '', university: '', year: '' }
      };
  }
}
