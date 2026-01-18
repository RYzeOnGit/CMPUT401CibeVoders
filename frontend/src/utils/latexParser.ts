import type { ResumeContent, Experience, GenericSection } from '../types';
import { generateSectionId } from './sectionMigration';

/**
 * Clean LaTeX text by removing commands and formatting
 */
function cleanLatexText(text: string): string {
  return text
    // Remove \item
    .replace(/\\item\s+/g, '')
    // Handle math mode: $...$ -> content
    .replace(/\$([^$]+)\$/g, '$1')
    // Handle escaped special characters
    .replace(/\\&/g, '&')
    .replace(/\\_/g, '_')
    .replace(/\\#/g, '#')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    // Extract content from formatting commands: \textbf{content} -> content
    .replace(/\\textbf\{([^}]+)\}/g, '$1')
    .replace(/\\textit\{([^}]+)\}/g, '$1')
    .replace(/\\emph\{([^}]+)\}/g, '$1')
    .replace(/\\underline\{([^}]+)\}/g, '$1')
    // Extract content from links: \href{url}{text} -> text
    .replace(/\\href\{[^}]+\}\{([^}]+)\}/g, '$1')
    .replace(/\\underlinedLink\{[^}]+\}\{([^}]+)\}/g, '$1')
    .replace(/\\url\{([^}]+)\}/g, '$1')
    // Remove sectionsep and vspace
    .replace(/\\sectionsep/g, '')
    .replace(/\\vspace\{[^}]+\}/g, '')
    .replace(/\\hspace\{[^}]+\}/g, '')
    // Remove line breaks
    .replace(/\\\\/g, ' ')
    .replace(/\\newline/g, ' ')
    // Remove comments
    .replace(/%.*$/gm, '')
    // Remove other common commands
    .replace(/\\noindent/g, '')
    .replace(/\\par\b/g, '')
    // Remove ANY remaining LaTeX commands with arguments: \command{arg1}{arg2}... -> arg1 arg2 ...
    .replace(/\\[a-zA-Z]+\{([^}]*)\}(?:\{([^}]*)\})?(?:\{([^}]*)\})?(?:\{([^}]*)\})?/g, (match, p1, p2, p3, p4) => {
      return [p1, p2, p3, p4].filter(Boolean).join(' ');
    })
    // Remove any remaining backslash commands: \command -> ''
    .replace(/\\[a-zA-Z]+/g, '')
    // Remove stray braces
    .replace(/[{}]/g, '')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Trim
    .trim();
}

/**
 * Parses LaTeX content and extracts structured resume data
 * @param latex - The LaTeX string to parse
 * @returns A ResumeContent object with extracted data
 */
export function parseLatexToContent(latex: string): ResumeContent {
  const parsed: ResumeContent = {
    name: '',
    email: '',
    phone: '',
    sections: []
  };

  if (!latex) return parsed;
  
  console.log('Parsing LaTeX, length:', latex.length);

  // Extract name - common patterns: \name{}, \author{}, \fullname{}
  const namePatterns = [
    /\\name\{([^}]+)\}/,
    /\\author\{([^}]+)\}/,
    /\\fullname\{([^}]+)\}/,
    /\\newcommand\{\\name\}\{([^}]+)\}/
  ];
  for (const pattern of namePatterns) {
    const match = latex.match(pattern);
    if (match) {
      parsed.name = cleanLatexText(match[1]);
      break;
    }
  }

  // Extract email
  const emailPatterns = [
    /\\email\{([^}]+)\}/,
    /\\href\{mailto:([^}]+)\}/,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  ];
  for (const pattern of emailPatterns) {
    const match = latex.match(pattern);
    if (match) {
      parsed.email = cleanLatexText(match[1]);
      break;
    }
  }

  // Extract phone
  const phonePatterns = [
    /\\phone\{([^}]+)\}/,
    /\\mobile\{([^}]+)\}/,
    /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/
  ];
  for (const pattern of phonePatterns) {
    const match = latex.match(pattern);
    if (match) {
      parsed.phone = cleanLatexText(match[1]);
      break;
    }
  }

  // Extract summary/objective - usually in a section or paragraph
  const summaryPatterns = [
    /\\section\{Summary\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
    /\\section\{Objective\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
    /\\section\{About\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
    /\\section\*?\{Professional Summary\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
    /\\section\*?\{Profile\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i
  ];
  for (const pattern of summaryPatterns) {
    const match = latex.match(pattern);
    if (match) {
      let summaryText = match[1]
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\\textit\{([^}]+)\}/g, '$1')
        .replace(/\\emph\{([^}]+)\}/g, '$1')
        .replace(/\\text\{([^}]+)\}/g, '$1')
        .replace(/\\par/g, '\n')
        .replace(/\{|\}/g, '')
        .trim();
      parsed.summary = summaryText;
      console.log('Found summary:', summaryText.substring(0, 100));
      break;
    }
  }
  console.log('Summary extraction complete:', parsed.summary ? 'Found' : 'Not found');

  // Extract experience
  const experiencePatterns = [
    /\\section\*?\{Experience\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
    /\\section\*?\{Work Experience\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
    /\\section\*?\{Professional Experience\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
    /\\section\*?\{Employment\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i
  ];
  
  let expMatch = null;
  for (const pattern of experiencePatterns) {
    expMatch = latex.match(pattern);
    if (expMatch) {
      console.log('Found experience section with pattern:', pattern);
      break;
    }
  }
  
  if (expMatch) {
    const expContent = expMatch[1];
    
    // Try to find individual experience entries
    const expEntries: Experience[] = [];
    
    // Simpler approach: look for itemize items
    const itemizePattern = /\\begin\{itemize\}[\s\S]*?\\end\{itemize\}/gi;
    const itemizeMatch = expContent.match(itemizePattern);
    
    if (itemizeMatch) {
      const items = itemizeMatch[0].match(/\\item\s*([^\n]+)/g) || [];
      items.forEach((item) => {
        const text = item.replace(/\\item\s*/, '').replace(/\{|\}/g, '').trim();
        // Try to extract company, role, duration from text
        const parts = text.split(/[|•]/).map(p => p.trim());
        if (parts.length >= 2) {
          expEntries.push({
            company: parts[0] || '',
            role: parts[1] || '',
            duration: parts[2] || '',
            bullet_points: []
          });
        }
      });
    }
    
    // If no structured entries found, create one from raw text
    if (expEntries.length === 0) {
      const cleanText = expContent
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\\textit\{([^}]+)\}/g, '$1')
        .replace(/\\emph\{([^}]+)\}/g, '$1')
        .replace(/\\text\{([^}]+)\}/g, '$1')
        .replace(/\\par/g, '\n')
        .replace(/\{|\}/g, '')
        .trim();
      
      if (cleanText) {
        expEntries.push({
          company: '',
          role: '',
          duration: '',
          bullet_points: cleanText.split('\n').filter(l => l.trim()).map(l => l.replace(/^[•\-\*]\s*/, '').trim())
        });
      }
    }
    
    parsed.experience = expEntries;
    console.log('Experience extraction complete:', expEntries.length, 'entries');
  } else {
    console.log('No experience section found');
  }

  // Extract skills
  const skillsPatterns = [
    /\\section\*?\{Skills?\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
    /\\section\*?\{Technical Skills\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
    /\\section\*?\{Core Competencies\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i
  ];
  
  let skillsMatch = null;
  for (const pattern of skillsPatterns) {
    skillsMatch = latex.match(pattern);
    if (skillsMatch) {
      console.log('Found skills section with pattern:', pattern);
      break;
    }
  }
  
  if (skillsMatch) {
    const skillsContent = skillsMatch[1];
    // Extract from itemize or comma-separated
    const itemizeMatch = skillsContent.match(/\\begin\{itemize\}[\s\S]*?\\end\{itemize\}/);
    if (itemizeMatch) {
      const items = itemizeMatch[0].match(/\\item\s*([^\n]+)/g) || [];
      parsed.skills = items.map(item => 
        item.replace(/\\item\s*/, '').replace(/\{|\}/g, '').trim()
      );
    } else {
      // Try comma-separated or other formats
      const skillsText = skillsContent
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\{|\}/g, '')
        .trim();
      parsed.skills = skillsText.split(/[,;]/).map(s => s.trim()).filter(s => s);
    }
    console.log('Skills extraction complete:', parsed.skills.length, 'skills');
  } else {
    console.log('No skills section found');
  }

  // Extract education
  const educationPattern = /\\section\{Education\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i;
  const eduMatch = latex.match(educationPattern);
  if (eduMatch) {
    const eduContent = eduMatch[1];
    const eduText = eduContent
      .replace(/\\textbf\{([^}]+)\}/g, '$1')
      .replace(/\\textit\{([^}]+)\}/g, '$1')
      .replace(/\{|\}/g, '')
      .trim();
    
    // Try to extract degree, university, year
    const yearMatch = eduText.match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : '';
    
    // Common patterns: "Degree from University (Year)" or "University - Degree"
    const parts = eduText.split(/[,\-\(\)]/).map(p => p.trim()).filter(p => p && !p.match(/^\d{4}$/));
    if (parts.length >= 2) {
      parsed.education = {
        degree: parts[0] || '',
        university: parts[1] || '',
        year: year
      };
    } else if (parts.length === 1) {
      parsed.education = {
        degree: parts[0] || '',
        university: '',
        year: year
      };
    }
  }

  // Extract all sections dynamically
  const sectionRegex = /\\section\*?\{([^}]+)\}/g;
  const sectionMatches = Array.from(latex.matchAll(sectionRegex));
  const sections: GenericSection[] = [];
  
  console.log(`Found ${sectionMatches.length} sections in total`);
  
  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const sectionName = match[1].trim();
    
    // Get content from after this section heading to before the next section heading (or end)
    const startIndex = match.index! + match[0].length;
    const nextMatch = sectionMatches[i + 1];
    const endIndex = nextMatch ? nextMatch.index! : latex.length;
    
    let sectionContent = latex.substring(startIndex, endIndex).trim();
    
    // Also check for \end{document} within this content and stop there
    const endDocMatch = sectionContent.match(/\\end\{document\}/);
    if (endDocMatch) {
      sectionContent = sectionContent.substring(0, endDocMatch.index).trim();
    }
    
    console.log(`Found section: "${sectionName}"`);
    console.log(`  -> Content length: ${sectionContent.length}`);
    console.log(`  -> Last 200 chars:`, sectionContent.substring(Math.max(0, sectionContent.length - 200)));
    
    if (!sectionContent) {
      console.log(`  -> Empty section, skipping`);
      continue;
    }
    
    // Parse section content based on structure
    const section = parseSectionContent(sectionName, sectionContent);
    if (section) {
      sections.push(section);
      console.log(`  -> Created section with type: ${section.type}`);
      if (section.type === 'bullet-points') {
        console.log(`  -> Items count: ${section.data.items.length}`, section.data.items);
      } else if (section.type === 'list') {
        console.log(`  -> List items: ${section.data.items.length}`);
      } else if (section.type === 'text') {
        console.log(`  -> Content length: ${section.data.content.length}`);
      }
    }
  }
  
  parsed.sections = sections;
  console.log(`Total sections extracted: ${sections.length}`);
  
  return parsed;
}

/**
 * Parse a section's content and determine its structure
 */
function parseSectionContent(sectionName: string, content: string): GenericSection | null {
  // Check if this is an education section
  const hasEducationHeading = /\\educationHeading\{/.test(content);
  if (hasEducationHeading || /education/i.test(sectionName)) {
    return parseEducationSection(sectionName, content);
  }
  
  // Check if this looks like an experience/work section (has \resumeHeading, \resumeSubheading, \projectHeading, or multiple entries)
  const hasResumeHeading = /\\resumeHeading\{/.test(content);
  const hasResumeSubheading = /\\resumeSubheading/.test(content);
  const hasProjectHeading = /\\projectHeading/.test(content);
  const hasResumeProjectHeading = /\\resumeProjectHeading/.test(content);
  const hasItemize = /\\begin\{(bullets|itemize)\}/.test(content);
  
  if (hasResumeHeading || hasResumeSubheading || hasProjectHeading || hasResumeProjectHeading || (hasItemize && /\\textbf\{[^}]+\}.*\\textit\{[^}]+\}/.test(content))) {
    // This is an experience-like section with entries
    return parseExperienceSection(sectionName, content);
  } else if (hasItemize) {
    // This is a list section (skills, etc.)
    return parseListSection(sectionName, content);
  } else {
    // This is a text section (summary, etc.)
    return parseTextSection(sectionName, content);
  }
}

/**
 * Parse experience-like sections (Work Experience, Projects, etc.)
 */
function parseExperienceSection(sectionName: string, content: string): GenericSection {
  const items: any[] = [];
  
  console.log(`  -> Parsing as experience section, content length: ${content.length}`);
  console.log(`  -> First 300 chars:`, content.substring(0, 300));
  console.log(`  -> Has \\resumeHeading:`, content.includes('\\resumeHeading'));
  console.log(`  -> Has \\resumeSubheading:`, content.includes('\\resumeSubheading'));
  console.log(`  -> Has \\projectHeading:`, content.includes('\\projectHeading'));
  console.log(`  -> Has \\resumeProjectHeading:`, content.includes('\\resumeProjectHeading'));
  console.log(`  -> Has \\textbf:`, content.includes('\\textbf'));
  
  // Try to find \resumeHeading{company}{role}{location}{duration}
  const resumeHeadingRegex = /\\resumeHeading\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g;
  let match;
  let lastIndex = 0;
  
  let headingMatches = Array.from(content.matchAll(resumeHeadingRegex));
  console.log(`  -> Found ${headingMatches.length} resumeHeading entries`);
  
  // Debug: show where each match is
  headingMatches.forEach((m, i) => {
    console.log(`     Match ${i+1} at index ${m.index}: ${m[1]} - ${m[2]}`);
  });
  
  // Try \resumeSubheading{title}{dates}{company}{location}
  if (headingMatches.length === 0) {
    const resumeSubheadingRegex = /\\resumeSubheading\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}/g;
    const subheadingMatches = Array.from(content.matchAll(resumeSubheadingRegex));
    console.log(`  -> Found ${subheadingMatches.length} resumeSubheading entries`);
    
    subheadingMatches.forEach((m, i) => {
      console.log(`     Match ${i+1} at index ${m.index}: ${m[1]} (${m[2]})`);
    });
    
    for (let i = 0; i < subheadingMatches.length; i++) {
      const match = subheadingMatches[i];
      const title = cleanLatexText(match[1]);
      const dates = cleanLatexText(match[2]);
      const company = cleanLatexText(match[3]);
      const location = cleanLatexText(match[4]);
      
      console.log(`  -> SubHeading Entry ${i+1}: ${title} at ${company}`);
      
      // Find content after this heading until next heading
      const startIndex = match.index! + match[0].length;
      const nextMatch = subheadingMatches[i + 1];
      const endIndex = nextMatch ? nextMatch.index! : content.length;
      const itemContent = content.substring(startIndex, endIndex);
      
      // Extract items from \resumeItemListStart...\resumeItemListEnd or \resumeItem{}
      const description = extractResumeItems(itemContent);
      console.log(`  -> SubHeading Description length: ${description.length}`);
      
      items.push({
        company: company || title,
        role: title,
        duration: dates,
        description: description
      });
    }
  }
  
  // Try \resumeProjectHeading
  if (headingMatches.length === 0 && items.length === 0) {
    const resumeProjectHeadingRegex = /\\resumeProjectHeading\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\{([^}]*)\}/g;
    const projectMatches = Array.from(content.matchAll(resumeProjectHeadingRegex));
    console.log(`  -> Found ${projectMatches.length} resumeProjectHeading entries`);
    
    projectMatches.forEach((m, i) => {
      console.log(`     Match ${i+1} at index ${m.index}`);
    });
    
    for (let i = 0; i < projectMatches.length; i++) {
      const match = projectMatches[i];
      const titleAndTech = match[1];
      const dates = cleanLatexText(match[2]);
      
      // Extract title from \textbf{} and tech from \emph{}
      const titleMatch = titleAndTech.match(/\\textbf\{([^}]+)\}/);
      const techMatch = titleAndTech.match(/\\emph\{([^}]+)\}/);
      
      const title = titleMatch ? cleanLatexText(titleMatch[1]) : cleanLatexText(titleAndTech);
      const tech = techMatch ? cleanLatexText(techMatch[1]) : '';
      
      console.log(`  -> Project Entry ${i+1}: ${title}`);
      
      // Find content after this heading until next heading
      const startIndex = match.index! + match[0].length;
      const nextMatch = projectMatches[i + 1];
      const endIndex = nextMatch ? nextMatch.index! : content.length;
      const itemContent = content.substring(startIndex, endIndex);
      
      // Extract items
      const description = extractResumeItems(itemContent);
      console.log(`  -> Project Description length: ${description.length}`);
      
      items.push({
        company: title,
        role: tech,
        duration: dates,
        description: description
      });
    }
  }
  
  // Also try \projectHeading{title}{url}{tech}
  if (headingMatches.length === 0 && items.length === 0) {
    const projectHeadingRegex = /\\projectHeading(?:WithDate)?\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}(?:\{([^}]*)\})?/g;
    const projectMatches = Array.from(content.matchAll(projectHeadingRegex));
    console.log(`  -> Found ${projectMatches.length} projectHeading entries`);
    
    // Debug: show where each match is
    projectMatches.forEach((m, i) => {
      console.log(`     Match ${i+1} at index ${m.index}: ${m[1]}`);
    });
    
    for (let i = 0; i < projectMatches.length; i++) {
      const match = projectMatches[i];
      const title = cleanLatexText(match[1]);
      const url = match[2].trim();
      const tech = cleanLatexText(match[3]);
      const date = match[4] ? cleanLatexText(match[4]) : '';
      
      console.log(`  -> Project Entry ${i+1}: ${title}`);
      
      // Find content after this heading until next heading or \sectionsep
      const startIndex = match.index! + match[0].length;
      const nextMatch = projectMatches[i + 1];
      const endIndex = nextMatch ? nextMatch.index! : content.length;
      const itemContent = content.substring(startIndex, endIndex);
      
      // Extract description (text after the heading, before \sectionsep)
      const description = cleanLatexText(itemContent.replace(/\\sectionsep/g, ''));
      console.log(`  -> Project Description length: ${description.length}`);
      
      if (title || description) {
        items.push({
          company: title,
          role: tech, // Put tech stack in role field
          duration: date,
          description: description
        });
      }
    }
  }
  
  for (let i = 0; i < headingMatches.length; i++) {
    const match = headingMatches[i];
    const company = match[1].trim();
    const role = match[2].trim();
    const location = match[3].trim();
    const duration = match[4].trim();
    
    console.log(`  -> Entry ${i+1}: ${company} - ${role}`);
    
    // Find the content after this heading until the next heading or \sectionsep
    const startIndex = match.index + match[0].length;
    const nextMatch = headingMatches[i + 1];
    const endIndex = nextMatch ? nextMatch.index : content.length;
    const itemContent = content.substring(startIndex, endIndex);
    
    // Extract bullet points from \begin{bullets} or \begin{itemize}
    const description = extractBulletPoints(itemContent);
    console.log(`  -> Description length: ${description.length}`);
    
    items.push({
      company: company || '',
      role: role || '',
      duration: duration || location || '', // Use location as duration if no duration
      description: description
    });
  }
  
  // If no resumeHeading found, try alternative formats (textbf with itemize)
  if (items.length === 0) {
    console.log(`  -> Trying alternative format (textbf/textit/itemize)`);
    
    // Match: \textbf{title} ... followed by content until next \textbf or \vspace or end
    const altFormat = /\\textbf\{([^}]+)\}([\s\S]*?)(?=\\textbf\{|\\vspace|\\section|$)/g;
    const altMatches = Array.from(content.matchAll(altFormat));
    
    console.log(`  -> Found ${altMatches.length} textbf entries`);
    
    for (let i = 0; i < altMatches.length; i++) {
      const match = altMatches[i];
      const title = match[1].trim();
      const itemContent = match[2].trim();
      
      console.log(`  -> Alt Entry ${i+1}: ${title}`);
      
      // Try to extract tech stack or subtitle from \textit{}
      const techStackMatch = itemContent.match(/\\textit\{([^}]+)\}/);
      const subtitle = techStackMatch ? techStackMatch[1].trim() : '';
      
      // Extract bullet points
      const description = extractBulletPoints(itemContent);
      console.log(`  -> Alt Description length: ${description.length}`);
      
      if (description || subtitle) {
        items.push({
          company: title,
          role: subtitle,
          duration: '',
          description: description
        });
      }
    }
  }
  
  console.log(`  -> Total items parsed for ${sectionName}: ${items.length}`);
  items.forEach((item, i) => {
    console.log(`     Item ${i+1}: ${item.company} | ${item.role} | ${item.duration}`);
  });
  
  return {
    id: generateSectionId(),
    type: 'bullet-points',
    name: sectionName,
    bulletPointType: sectionName.toLowerCase().includes('project') ? 'projects' : 'work-experience',
    data: {
      type: 'bullet-points',
      items: items
    }
  };
}

/**
 * Parse education sections
 */
function parseEducationSection(sectionName: string, content: string): GenericSection {
  console.log(`  -> Parsing as education section`);
  
  // Try to extract \educationHeading{degree}{university}{location}{date}
  const educationHeadingRegex = /\\educationHeading\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/;
  const match = content.match(educationHeadingRegex);
  
  let degree = '';
  let university = '';
  let year = '';
  let description = '';
  
  if (match) {
    degree = cleanLatexText(match[1]);
    university = cleanLatexText(match[2]);
    const location = cleanLatexText(match[3]);
    year = cleanLatexText(match[4]);
    
    console.log(`  -> Extracted: ${degree} from ${university}, ${year}`);
    
    // Extract any additional content after the heading
    const headingEnd = match.index! + match[0].length;
    const remainingContent = content.substring(headingEnd);
    
    // Look for additional descriptions, bullet points, or other content
    description = cleanLatexText(remainingContent);
  } else {
    // Fallback: just clean the entire content
    console.log(`  -> No educationHeading found, using fallback parsing`);
    const cleaned = cleanLatexText(content);
    
    // Try to extract year
    const yearMatch = cleaned.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      year = yearMatch[0];
    }
    
    // Split content and try to identify degree/university
    const parts = cleaned.split(/[,\-]/).map(p => p.trim()).filter(p => p && !p.match(/^\d{4}$/));
    if (parts.length >= 2) {
      degree = parts[0];
      university = parts[1];
    } else if (parts.length === 1) {
      degree = parts[0];
    }
    
    description = cleaned;
  }
  
  return {
    id: generateSectionId(),
    type: 'education',
    name: sectionName,
    data: {
      type: 'education',
      degree: degree,
      university: university,
      year: year,
      description: description
    }
  };
}

/**
 * Extract items from \resumeItem{} or \resumeItemListStart...\resumeItemListEnd
 */
function extractResumeItems(content: string): string {
  // First try to extract from \resumeItemListStart...\resumeItemListEnd
  const resumeItemListMatch = content.match(/\\resumeItemListStart([\s\S]*?)\\resumeItemListEnd/);
  const itemContent = resumeItemListMatch ? resumeItemListMatch[1] : content;
  
  // Extract all \resumeItem{...} entries
  const resumeItemRegex = /\\resumeItem\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  const itemMatches = Array.from(itemContent.matchAll(resumeItemRegex));
  
  console.log(`    -> Found ${itemMatches.length} resumeItem entries`);
  
  if (itemMatches.length > 0) {
    const cleanedItems = itemMatches
      .map(match => cleanLatexText(match[1]))
      .filter(item => item.length > 0);
    
    console.log(`    -> Cleaned items: ${cleanedItems.length}`);
    return cleanedItems.join('\n');
  }
  
  // Fallback to regular bullet points extraction
  return extractBulletPoints(content);
}

/**
 * Extract bullet points from bullets/itemize environment
 */
function extractBulletPoints(content: string): string {
  // Match \begin{bullets} or \begin{itemize}
  const bulletMatch = content.match(/\\begin\{(bullets|itemize)\}([\s\S]*?)\\end\{\1\}/);
  if (!bulletMatch) {
    console.log('    -> No bullet/itemize environment found');
    return '';
  }
  
  const bulletContent = bulletMatch[2];
  console.log('    -> Found bullet environment, content length:', bulletContent.length);
  
  // Match \item ... until next \item or end
  const items = bulletContent.match(/\\item\s+([^\n]*(?:\n(?!\\item).*)*)/g) || [];
  console.log('    -> Extracted items:', items.length);
  
  const cleanedItems = items
    .map(item => cleanLatexText(item))
    .filter(item => item.length > 0);
  
  console.log('    -> Cleaned items:', cleanedItems.length);
  return cleanedItems.join('\n');
}

/**
 * Parse list sections (Skills, etc.)
 */
function parseListSection(sectionName: string, content: string): GenericSection {
  const description = extractBulletPoints(content);
  const items = description ? description.split('\n') : [];
  
  // Also try comma-separated format
  if (items.length === 0) {
    const cleanText = cleanLatexText(content);
    const commaSeparated = cleanText.split(/[,;]/).map(s => s.trim()).filter(s => s);
    if (commaSeparated.length > 0) {
      items.push(...commaSeparated);
    }
  }
  
  return {
    id: generateSectionId(),
    type: 'list',
    name: sectionName,
    data: {
      type: 'list',
      items: items
    }
  };
}

/**
 * Parse text sections (Summary, etc.)
 */
function parseTextSection(sectionName: string, content: string): GenericSection {
  const cleanText = cleanLatexText(content);
  
  return {
    id: generateSectionId(),
    type: 'text',
    name: sectionName,
    data: {
      type: 'text',
      content: cleanText
    }
  };
}
