import type { ResumeContent, GenericSection } from '../types';

/**
 * Converts resume content back to LaTeX format
 */
export function generateLatexFromContent(content: ResumeContent): string {
  const sections: string[] = [];

  // Header with contact information
  sections.push(`% Resume generated from editor
\\documentclass[letterpaper,11pt]{article}

\\begin{document}

% Contact Information
\\name{${escapeLatex(content.name)}}
\\email{${escapeLatex(content.email)}}
\\phone{${escapeLatex(content.phone)}}

`);

  // Generate each section
  const orderedSections = content.sectionOrder
    ? content.sectionOrder.map(id => content.sections.find(s => s.id === id)).filter(Boolean) as GenericSection[]
    : content.sections;

  for (const section of orderedSections) {
    sections.push(generateSection(section));
  }

  sections.push('\\end{document}');

  return sections.join('\n');
}

/**
 * Generate LaTeX for a single section
 */
function generateSection(section: GenericSection): string {
  const sectionName = escapeLatex(section.name);
  let content = '';

  switch (section.data.type) {
    case 'text':
      content = generateTextSection(section.data.content);
      break;
    case 'bullet-points':
      content = generateBulletPointsSection(section.data.items);
      break;
    case 'list':
      content = generateListSection(section.data.items);
      break;
    case 'education':
      content = generateEducationSection(section.data);
      break;
  }

  return `\\section{${sectionName}}
${content}

`;
}

/**
 * Generate text section
 */
function generateTextSection(text: string): string {
  return escapeLatex(text);
}

/**
 * Generate bullet points section (work experience or projects)
 */
function generateBulletPointsSection(items: any[]): string {
  const entries: string[] = [];

  for (const item of items) {
    const company = escapeLatex(item.company || '');
    const role = escapeLatex(item.role || '');
    const duration = escapeLatex(item.duration || '');
    
    // Use resumeSubheading format
    entries.push(`  \\resumeSubheading
    {${role}}{${duration}}
    {${company}}{}
    \\resumeItemListStart`);

    // Add description as resume items
    if (item.description) {
      const lines = item.description.split('\n').filter((line: string) => line.trim());
      for (const line of lines) {
        entries.push(`      \\resumeItem{${escapeLatex(line)}}`);
      }
    }

    entries.push(`    \\resumeItemListEnd
`);
  }

  return `  \\resumeSubHeadingListStart
${entries.join('\n')}
  \\resumeSubHeadingListEnd`;
}

/**
 * Generate list section (skills)
 */
function generateListSection(items: string[]): string {
  const bullets = items.map(item => `    \\item ${escapeLatex(item)}`).join('\n');
  return `  \\begin{itemize}
${bullets}
  \\end{itemize}`;
}

/**
 * Generate education section
 */
function generateEducationSection(data: any): string {
  const degree = escapeLatex(data.degree || '');
  const university = escapeLatex(data.university || '');
  const year = escapeLatex(data.year || '');
  const description = data.description ? escapeLatex(data.description) : '';

  return `  \\resumeSubheading
    {${degree}}{${year}}
    {${university}}{}${description ? `
    \\resumeItemListStart
      \\resumeItem{${description}}
    \\resumeItemListEnd` : ''}`;
}

/**
 * Escape special LaTeX characters
 */
function escapeLatex(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}
