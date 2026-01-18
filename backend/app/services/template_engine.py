"""AI-powered template engine for resume glow-up feature."""
import os
import random
import string
from typing import Optional, Dict, Any
from pathlib import Path
from openai import OpenAI

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


# Template registry - maps template IDs to their file paths
TEMPLATE_REGISTRY = {
    "template-1": "assets/resumes/resumes/template-1/resume.tex",
    "template-2": "assets/resumes/resumes/template-2/mmayer.tex",
    "template-3": "assets/resumes/resumes/template-3/main.tex",
}


def get_template_path(template_id: str) -> Optional[Path]:
    """Get the file path for a template ID."""
    if template_id not in TEMPLATE_REGISTRY:
        return None
    
    template_path = Path(TEMPLATE_REGISTRY[template_id])
    # Try relative to backend directory first
    backend_path = Path(__file__).parent.parent.parent / template_path
    if backend_path.exists():
        return backend_path
    
    # Try relative to project root
    root_path = Path(__file__).parent.parent.parent.parent / template_path
    if root_path.exists():
        return root_path
    
    return None


def load_template(template_id: str) -> Optional[str]:
    """Load a template file by ID."""
    template_path = get_template_path(template_id)
    if not template_path or not template_path.exists():
        return None
    
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading template {template_id}: {e}")
        return None


def generate_random_suffix(length: int = 3) -> str:
    """Generate a random numeric suffix (e.g., '123', '456')."""
    return ''.join(random.choices(string.digits, k=length))


def blend_resume_with_template(
    existing_latex: str,
    template_id: str,
    original_name: str
) -> Optional[str]:
    """
    Use AI to intelligently blend existing resume LaTeX with a template.
    
    This function:
    1. Extracts all content from the existing LaTeX (preserving details)
    2. Intelligently adapts it to the template's format
    3. Returns the blended LaTeX code
    
    Args:
        existing_latex: The existing resume LaTeX code
        template_id: The template ID to use (template-1, template-2, template-3)
        original_name: Original resume name for context
        
    Returns:
        Blended LaTeX code, or None if blending fails
    """
    if not OPENAI_AVAILABLE:
        print("OpenAI library not installed. Run: pip install openai")
        return None
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY not found in environment. Please set it in .env file.")
        return None
    
    # Load the template
    template_content = load_template(template_id)
    if not template_content:
        print(f"Template {template_id} not found or could not be loaded.")
        return None
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Create an assistant for intelligent blending
        assistant = client.beta.assistants.create(
            name="Resume Template Blender",
            instructions="""You are a LaTeX expert specializing in resume formatting. Your task is to create a beautifully formatted resume using ONLY standard LaTeX.

CRITICAL REQUIREMENTS:

1. USE ONLY STANDARD LATEX:
   - Document class MUST be: \\documentclass[11pt,a4paper]{article}
   - Use ONLY these standard packages: geometry, enumitem, titlesec, hyperref, xcolor, fontenc, inputenc, parskip, fancyhdr
   - DO NOT use custom .cls files (no resume-openfont.cls, altacv.cls, etc.)
   - DO NOT use obscure packages that might not be installed
   - The document MUST compile with a basic pdflatex installation

2. PRESERVE ALL CONTENT from the existing resume:
   - All work experience entries (company, position, dates, bullet points)
   - All education entries (school, degree, dates, coursework, GPA if present)
   - All projects (name, description, technologies, links)
   - All skills (languages, frameworks, tools, etc.)
   - All personal information (name, email, phone, LinkedIn, GitHub, website)
   - Any other sections (certifications, awards, publications, etc.)

3. STYLE INSPIRATION FROM TEMPLATE:
   - Look at the template for visual inspiration (colors, spacing, section styles)
   - Recreate similar visual effects using standard LaTeX commands
   - Use \\titleformat from titlesec for section headers
   - Use xcolor for colors
   - Use geometry for margins
   - Create custom commands with \\newcommand if needed

4. MAINTAIN LATEX VALIDITY:
   - Ensure all braces are balanced
   - Ensure all environments are properly opened and closed
   - The output MUST compile without errors on any standard LaTeX installation

5. OUTPUT FORMAT:
   - Return ONLY the complete LaTeX code
   - Start with \\documentclass[11pt,a4paper]{article}
   - End with \\end{document}
   - No explanations, no markdown, no code blocks

Your goal is to create a professional, visually appealing resume that will compile on ANY LaTeX installation.""",
            model="gpt-4o",
            tools=[{"type": "code_interpreter"}]
        )
        
        blended_latex = None
        try:
            # Create a thread and add both the existing LaTeX and template
            thread = client.beta.threads.create()
            
            # Create a comprehensive prompt
            prompt = f"""Create a professional resume using STANDARD LaTeX only.

ORIGINAL RESUME NAME: {original_name}

EXISTING RESUME CONTENT (extract all details from this):
{existing_latex}

TEMPLATE FOR VISUAL INSPIRATION (do NOT copy its document class or custom packages):
{template_content}

INSTRUCTIONS:
1. Extract ALL content from the existing resume (dates, companies, bullet points, skills, education, projects, etc.)
2. Use the template ONLY for visual inspiration (colors, layout style, section formatting)
3. MUST use: \\documentclass[11pt,a4paper]{{article}}
4. ONLY use these packages: geometry, enumitem, titlesec, hyperref, xcolor, fontenc, inputenc, parskip, fancyhdr
5. DO NOT use any custom .cls files or obscure packages
6. Create a clean, professional resume that will compile on ANY LaTeX installation

Return ONLY the LaTeX code, starting with \\documentclass[11pt,a4paper]{{article}} and ending with \\end{{document}}.
No explanations, no markdown code blocks."""
            
            client.beta.threads.messages.create(
                thread_id=thread.id,
                role="user",
                content=prompt
            )
            
            # Run the assistant
            run = client.beta.threads.runs.create(
                thread_id=thread.id,
                assistant_id=assistant.id
            )
            
            # Wait for completion
            import time
            max_wait_time = 120  # 2 minutes for complex blending
            start_time = time.time()
            
            while run.status in ['queued', 'in_progress']:
                if time.time() - start_time > max_wait_time:
                    raise Exception("Timeout waiting for assistant to complete")
                time.sleep(2)
                run = client.beta.threads.runs.retrieve(
                    thread_id=thread.id,
                    run_id=run.id
                )
            
            if run.status == 'completed':
                # Get the response
                messages = client.beta.threads.messages.list(thread_id=thread.id)
                if messages.data and messages.data[0].content:
                    content = messages.data[0].content[0]
                    if hasattr(content, 'text'):
                        raw_response = content.text.value.strip()
                        
                        # Extract LaTeX code from the response
                        import re
                        # Look for ```latex or ``` blocks
                        latex_match = re.search(r'```(?:latex)?\s*\n(.*?)\n```', raw_response, re.DOTALL)
                        if latex_match:
                            blended_latex = latex_match.group(1).strip()
                        else:
                            # Look for \documentclass to find the start
                            doc_start = raw_response.find('\\documentclass')
                            if doc_start != -1:
                                # Find the end (last \end{document})
                                doc_end = raw_response.rfind('\\end{document}')
                                if doc_end != -1:
                                    blended_latex = raw_response[doc_start:doc_end + len('\\end{document}')].strip()
                                else:
                                    blended_latex = raw_response[doc_start:].strip()
                            else:
                                # If no \documentclass found, use the whole response
                                blended_latex = raw_response
                    else:
                        raise Exception("Unexpected message format from assistant")
                else:
                    raise Exception("No response from assistant")
            else:
                error_msg = f"Assistant run failed with status: {run.status}"
                if hasattr(run, 'last_error') and run.last_error:
                    error_msg += f" - {run.last_error}"
                raise Exception(error_msg)
                
        finally:
            # Clean up assistant
            if assistant:
                try:
                    client.beta.assistants.delete(assistant.id)
                except:
                    pass
        
        if blended_latex:
            # Clean up: remove markdown code blocks if present
            if blended_latex.startswith("```"):
                lines = blended_latex.split('\n')
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                blended_latex = '\n'.join(lines)
            
            return blended_latex
        else:
            return None
            
    except Exception as e:
        print(f"Template blending failed: {e}")
        return None


def get_available_templates() -> Dict[str, str]:
    """Get a dictionary of available template IDs and their display names."""
    return {
        "template-1": "Modern Deedy (OpenFont)",
        "template-2": "AltaCV (Sidebar)",
        "template-3": "Jake's Resume (Classic)"
    }
