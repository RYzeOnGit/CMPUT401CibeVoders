import type { ResumeContent, Experience } from '../types';

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
    summary: '',
    experience: [],
    skills: [],
    education: { degree: '', university: '', year: '' }
  };

  if (!latex) return parsed;

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
      parsed.name = match[1].trim();
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
      parsed.email = match[1].trim();
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
      parsed.phone = match[1].trim();
      break;
    }
  }

  // Extract summary/objective - usually in a section or paragraph
  const summaryPatterns = [
    /\\section\{Summary\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
    /\\section\{Objective\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i,
    /\\section\{About\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i
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
      break;
    }
  }

  // Extract experience
  const experiencePattern = /\\section\{Experience\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i;
  const expMatch = latex.match(experiencePattern);
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
  }

  // Extract skills
  const skillsPattern = /\\section\{Skills?\}([\s\S]*?)(?=\\section|\\end\{document\}|$)/i;
  const skillsMatch = latex.match(skillsPattern);
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

  return parsed;
}
