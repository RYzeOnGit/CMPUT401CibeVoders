"""AI Chat service for resume critique and technical interviews."""
import os
import base64
from openai import OpenAI
from typing import Optional, List, Dict, Any
from app.models import Resume, Application

# Lazy initialization of OpenAI client
_client = None

def get_openai_client():
    """Get or create OpenAI client instance."""
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set. Please add it to your .env file.")
        try:
            _client = OpenAI(api_key=api_key, timeout=30.0)
        except Exception as e:
            raise ValueError(f"Failed to initialize OpenAI client: {str(e)}. Please check your API key and network connection.")
    return _client


async def extract_resume_text_from_pdf(resume: Resume) -> str:
    """Extract resume text from PDF using a simple text extractor, then clean with LLM."""
    if not resume.file_data or not resume.file_type or 'pdf' not in resume.file_type:
        return "No PDF file available for this resume."
    
    try:
        # Try to extract text using pypdf if available
        try:
            from pypdf import PdfReader
            import io
            
            pdf_file = io.BytesIO(resume.file_data)
            reader = PdfReader(pdf_file)
            raw_text = ""
            for page in reader.pages:
                raw_text += page.extract_text() + "\n"
            
            if raw_text.strip():
                # Clean and structure the extracted text using LLM
                client = get_openai_client()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a resume parser. Clean and structure extracted resume text. Organize it clearly with sections: Contact Info, Summary, Experience, Education, Skills, Projects, etc. Preserve ALL details including dates, company names, technologies, achievements, and metrics."
                        },
                        {
                            "role": "user",
                            "content": f"""Clean and structure this extracted resume text. Preserve all information and organize it clearly:

{raw_text[:3000]}

Return the complete, well-formatted resume text with all sections clearly labeled."""
                        }
                    ],
                    max_tokens=2000
                )
                return response.choices[0].message.content
        except ImportError:
            # pypdf not installed, use LLM to help
            pass
        except Exception as e:
            print(f"PDF extraction error: {e}")
        
        # Fallback: Use LLM to extract from available info
        pdf_size_kb = len(resume.file_data) / 1024
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a resume extraction assistant. Extract all text content from resumes. Return the complete resume text in a clear, structured format."
                },
                {
                    "role": "user",
                    "content": f"""I have a PDF resume file named "{resume.name}" ({pdf_size_kb:.1f} KB).

Since I cannot directly read the PDF binary, please help structure what information should be extracted. If you have any context about this resume, format it clearly with sections: Contact Info, Summary, Experience, Education, Skills, Projects, etc."""
                }
            ],
            max_tokens=1500
        )
        
        extracted = response.choices[0].message.content
        
        # If we have structured content, combine it
        if resume.content:
            structured = format_resume_content(resume.content)
            if structured and structured != "No resume content available.":
                return f"{extracted}\n\n---\n\nStructured Content:\n{structured}"
        
        return extracted
        
    except Exception as e:
        # Final fallback to structured content
        if resume.content:
            return format_resume_content(resume.content)
        return f"Error processing resume: {str(e)}. Please ensure your PDF contains readable text."


async def critique_resume(resume: Resume, user_message: str = "", conversation_history: List[Dict[str, str]] = []) -> str:
    """Get resume critique or continue critique conversation."""
    
    # Build system prompt - Senior Technical Recruiter persona with clean formatting
    system_prompt = """You are a senior technical recruiter + hiring manager who has screened 10,000+ resumes
for software engineering, AI/ML, and startup roles.

Your task is to critique the resume below with extreme honesty and precision. Format your response using clean, skimmable sections with clear visual hierarchy.

CRITICAL FORMATTING RULES:
- Use emojis for section headers (📊, ⚠️, 📉, 🗑, 🧪, 🔥, 🛠, 🧑‍💻, 📈, 🎯, ❌, ✅, 💣)
- Keep bullets to MAX 2 lines
- Use markdown tables for scores
- Use "Before/After" format for weak bullets
- Add white space between sections
- Use callouts for important points
- Make it skimmable in 30 seconds

OUTPUT FORMAT (follow this exactly):

📊 Overall Score
| Category | Score |
|----------|-------|
| Impact | X / 10 |
| Technical Credibility | X / 10 |
| Clarity & Structure | X / 10 |
| ATS Optimization | X / 10 |
| Competitive Strength | X / 10 |

**Summary:** [One sentence summary]

⚠️ Weak Resume Bullets (with Fixes)

**Before:** [weak bullet]
**After:** [strong bullet with metric]

[Repeat for 2-3 weak bullets]

📉 Missing Metrics (High Priority)
- [List what metrics should be added]

🗑 Buzzwords to Delete Immediately
- [List buzzwords]

🧪 Skills That Feel Vague or Inflated
- ❌ [vague skill] → ✅ [specific skill]

🔥 Resume-Winning Bullet Examples
[5 bullets using: Action Verb + Tech + Outcome + Metric]

🛠 Project Section (Stronger Version)
**[Project name]**
- [Improved bullet 1]
- [Improved bullet 2]

🧑‍💻 Experience Section (More Senior)
**[Role] — [Company]**
- [Improved bullet 1]
- [Improved bullet 2]

📈 Candidate Signal
**Current signal:** [Assessment]
**Why:** [Brief explanation]

🎯 Role Fit
**Underqualified for:** [roles]
**Overqualified for:** [roles]

❌ Why a Recruiter Rejects This in 10 Seconds
- [Reason 1]
- [Reason 2]

✅ High-ROI Fix Checklist
1. [Highest priority fix]
2. [Next priority]
3. [etc.]

💣 Brutal Truth
[One hard-hitting truth]

Be direct, honest, and actionable. No sugar-coating. Use the exact format above."""
    
    # Get resume content
    if not resume:
        return "Error: No resume selected. Please select a resume first."
    
    # Try to extract text from PDF first, fallback to structured content
    if resume.file_data and resume.file_type and 'pdf' in resume.file_type:
        resume_text = await extract_resume_text_from_pdf(resume)
    else:
        resume_content = resume.content if resume.content else {}
        resume_text = format_resume_content(resume_content)
        if not resume_text or resume_text.strip() == "No resume content available.":
            return "Error: This resume has no content. Please upload a PDF resume or add content to the resume."
    
    # Build messages
    messages = [{"role": "system", "content": system_prompt}]
    
    if not conversation_history:
        # Initial critique
        initial_prompt = f"""Please review this resume and provide a comprehensive critique following all the instructions:

{resume_text}

Provide your complete analysis now."""
        messages.append({"role": "user", "content": initial_prompt})
    else:
        # Continue conversation
        messages.extend(conversation_history)
        if user_message:
            messages.append({"role": "user", "content": user_message})
    
    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=2000
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating critique: {str(e)}"


async def start_interview(resume: Resume, application: Optional[Application] = None) -> str:
    """Start a technical interview with readiness check."""
    
    system_prompt = """You are a senior Software Engineer and technical interviewer at a top-tier tech company
(Google / Meta / strong AI startup level).

Your task is to conduct a realistic technical interview based strictly on the candidate's resume.

Context:
- Candidate is a Computer Science student targeting SWE / ML Intern roles
- Interview should feel realistic, probing, and slightly skeptical
- Questions must be derived directly from the resume

Rules (IMPORTANT):
- Ask ONLY ONE question at a time
- Do NOT ask the next question until the candidate responds
- After each answer:
  - Score it from 1–10
  - Explain what was strong
  - Explain what was missing or weak
  - Say how a stronger candidate would answer
- Ask follow-up questions if the answer lacks depth
- Be strict and realistic (no default encouragement)

Interview Structure:
Round 1 – Resume Deep Dive
- Ask questions only about projects, skills, and claims listed on the resume

Round 2 – Technical Fundamentals
- Ask DSA / ML / systems questions at the level the resume implies

Round 3 – Practical Engineering
- Ask debugging, optimization, or design tradeoff questions

End of Interview:
- Give an overall interview score
- Pass / Borderline / Fail decision
- Top 3 gaps
- 2-week focused improvement plan

Be professional but probing. Start by asking if they're ready to begin."""
    
    if not resume:
        return "Error: No resume selected. Please select a resume first."
    
    # Try to extract text from PDF first, fallback to structured content
    if resume.file_data and resume.file_type and 'pdf' in resume.file_type:
        resume_text = await extract_resume_text_from_pdf(resume)
    else:
        resume_content = resume.content if resume.content else {}
        resume_text = format_resume_content(resume_content)
        if not resume_text or resume_text.strip() == "No resume content available.":
            return "Error: This resume has no content. Please upload a PDF resume or add content to the resume."
    
    job_context = ""
    if application:
        job_context = f"\n\nJob Application Context:\nCompany: {application.company_name}\nRole: {application.role_title}\nLocation: {application.location or 'Not specified'}"
    
    prompt = f"""Here is the candidate's resume:

{resume_text}
{job_context}

Start the interview by greeting the candidate and asking: "Are you ready to begin the technical interview?"

Wait for their confirmation before proceeding to Round 1 (Resume Deep Dive)."""
    
    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=200
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error starting interview: {str(e)}"


async def continue_interview(
    resume: Resume, 
    application: Optional[Application], 
    user_answer: str, 
    conversation_history: List[Dict[str, str]]
) -> str:
    """Continue the interview with rating and next question."""
    
    system_prompt = """You are a senior Software Engineer and technical interviewer at a top-tier tech company
(Google / Meta / strong AI startup level).

Your task is to conduct a realistic technical interview based strictly on the candidate's resume.

Context:
- Candidate is a Computer Science student targeting SWE / ML Intern roles
- Interview should feel realistic, probing, and slightly skeptical
- Questions must be derived directly from the resume

Rules (IMPORTANT):
- Ask ONLY ONE question at a time
- Do NOT ask the next question until the candidate responds
- After each answer:
  - Score it from 1–10
  - Explain what was strong
  - Explain what was missing or weak
  - Say how a stronger candidate would answer
- Ask follow-up questions if the answer lacks depth
- Be strict and realistic (no default encouragement)

Interview Structure:
Round 1 – Resume Deep Dive
- Ask questions only about projects, skills, and claims listed on the resume

Round 2 – Technical Fundamentals
- Ask DSA / ML / systems questions at the level the resume implies

Round 3 – Practical Engineering
- Ask debugging, optimization, or design tradeoff questions

End of Interview:
- Give an overall interview score
- Pass / Borderline / Fail decision
- Top 3 gaps
- 2-week focused improvement plan

Response Format:
After each answer, format your response as:

**Rating: X/10**

**What was strong:**
[Specific strengths]

**What was missing or weak:**
[Specific weaknesses]

**How a stronger candidate would answer:**
[Comparison]

**Next Question:**
[Only ONE question - wait for their response before asking another]

If the candidate says they're ready, start Round 1 with a question about a specific project or skill from their resume."""
    
    if not resume:
        return "Error: No resume selected. Please select a resume first."
    
    # Try to extract text from PDF first, fallback to structured content
    if resume.file_data and resume.file_type and 'pdf' in resume.file_type:
        resume_text = await extract_resume_text_from_pdf(resume)
    else:
        resume_content = resume.content if resume.content else {}
        resume_text = format_resume_content(resume_content)
        if not resume_text or resume_text.strip() == "No resume content available.":
            return "Error: This resume has no content. Please upload a PDF resume or add content to the resume."
    
    job_context = ""
    if application:
        job_context = f"\n\nJob Application Context:\nCompany: {application.company_name}\nRole: {application.role_title}\nLocation: {application.location or 'Not specified'}"
    
    # Build messages
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_history)
    messages.append({"role": "user", "content": user_answer})
    
    # Add resume context for better questions
    context_prompt = f"\n\nResume for reference:\n{resume_text}{job_context}\n\nBased on the conversation history and resume, provide your response following the format above. Ask ONLY ONE question and wait for their response."
    messages.append({"role": "user", "content": context_prompt})
    
    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=800
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error continuing interview: {str(e)}"


async def rate_answer(question: str, answer: str, resume: Optional[Resume] = None) -> str:
    """Rate a specific answer to a technical question."""
    
    system_prompt = """You are a technical interviewer rating an answer. Provide:
    1. A numerical rating (1-10)
    2. Detailed feedback on correctness, completeness, and clarity
    3. What they did well
    4. What could be improved
    5. Suggestions for a better answer"""
    
    resume_context = ""
    if resume:
        resume_text = format_resume_content(resume.content)
        resume_context = f"\n\nResume context:\n{resume_text}"
    
    prompt = f"""Question: {question}

Answer: {answer}
{resume_context}

Provide a detailed rating and feedback."""
    
    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=400
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error rating answer: {str(e)}"


def format_resume_content(content: Dict[str, Any]) -> str:
    """Format resume content dictionary into readable text."""
    if not content:
        return "No resume content available."
    
    text_parts = []
    
    # Basic Info
    if content.get("name"):
        text_parts.append(f"Name: {content['name']}")
    if content.get("email"):
        text_parts.append(f"Email: {content['email']}")
    if content.get("phone"):
        text_parts.append(f"Phone: {content['phone']}")
    
    # Summary
    if content.get("summary"):
        text_parts.append(f"\nSUMMARY:\n{content['summary']}")
    
    # Experience
    if content.get("experience") and len(content["experience"]) > 0:
        text_parts.append("\nEXPERIENCE:")
        for exp in content["experience"]:
            role = exp.get('role', 'N/A')
            company = exp.get('company', 'N/A')
            duration = exp.get('duration', 'N/A')
            text_parts.append(f"\n{role} | {company} | {duration}")
            if exp.get("bullet_points"):
                for point in exp["bullet_points"]:
                    text_parts.append(f"  • {point}")
    
    # Skills
    if content.get("skills") and len(content["skills"]) > 0:
        text_parts.append(f"\nSKILLS:\n{', '.join(content['skills'])}")
    
    # Education
    if content.get("education"):
        edu = content["education"]
        degree = edu.get('degree', '')
        university = edu.get('university', '')
        year = edu.get('year', '')
        if degree or university:
            text_parts.append(f"\nEDUCATION:\n{degree} from {university} ({year})")
    
    result = "\n".join(text_parts)
    return result if result.strip() else "Resume content is minimal. Please ensure the resume has been properly uploaded with content."

