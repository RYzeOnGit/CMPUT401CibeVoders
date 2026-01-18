import type { BulletPointType } from '../types';

export interface BulletPointPlaceholders {
  company: string;
  role: string;
  duration: string;
  bulletPoint: string;
}

export const BULLET_POINT_PLACEHOLDERS: Record<BulletPointType, BulletPointPlaceholders> = {
  'work-experience': {
    company: 'Company/Organization Name',
    role: 'Job Role/Position',
    duration: 'Jan 2020 - Present',
    bulletPoint: 'Achievement or responsibility...'
  },
  'projects': {
    company: 'Project Name',
    role: 'Your Role',
    duration: 'Jan 2020 - Dec 2020',
    bulletPoint: 'Project detail or accomplishment...'
  },
  'generic': {
    company: 'Title/Name',
    role: 'Subtitle/Description',
    duration: 'Date or Time Period',
    bulletPoint: 'Detail or description...'
  }
};

export const BULLET_POINT_TYPE_LABELS: Record<BulletPointType, string> = {
  'work-experience': 'Work Experience',
  'projects': 'Projects',
  'generic': 'Generic Experience'
};
