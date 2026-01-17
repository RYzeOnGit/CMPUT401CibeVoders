"""PDF to LaTeX conversion service using OpenAI."""
import os
import base64
import tempfile
from datetime import datetime
from typing import Optional
from openai import OpenAI

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, will use system env vars

try:
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


def convert_pdf_to_latex(pdf_bytes: bytes) -> Optional[str]:
    """
    Convert PDF resume to clean, compilable LaTeX using OpenAI.
    
    Uses OpenAI's API to process the PDF and generate LaTeX code.
    No PDF parsing libraries are used - only OpenAI API.
    
    Args:
        pdf_bytes: The PDF file content as bytes
        
    Returns:
        LaTeX code as string, or None if conversion fails
    """
    if not OPENAI_AVAILABLE:
        print("OpenAI library not installed. Run: pip install openai")
        return None
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY not found in environment. Please set it in .env file.")
        return None
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Strategy: Upload PDF to OpenAI, then use it with chat completion
        # We'll use the file upload API and then reference it
        
        # Create a temporary file for upload
        tmp_file_path = None
        uploaded_file = None
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                tmp_file.write(pdf_bytes)
                tmp_file_path = tmp_file.name
            
            # Upload file to OpenAI
            with open(tmp_file_path, 'rb') as f:
                uploaded_file = client.files.create(
                    file=f,
                    purpose='assistants'
                )
            
            # Use OpenAI's Assistants API to process the PDF file
            # This is the most reliable way to handle PDF files with OpenAI
            
            # Create an assistant to process the file
            assistant = client.beta.assistants.create(
                name="PDF to LaTeX Converter",
                instructions="""You are a LaTeX expert. Convert resume PDFs into clean, compilable LaTeX code.

Requirements:
1. Generate complete, compilable LaTeX code (not fragments)
2. Use standard LaTeX packages (documentclass, usepackage, etc.)
3. Preserve all formatting, structure, and content from the original resume
4. Use appropriate LaTeX commands for sections, lists, formatting
5. Ensure the LaTeX compiles without errors
6. Use modern resume LaTeX packages like moderncv, or create a clean custom layout
7. Preserve all text content exactly as it appears
8. Maintain proper structure: header, sections, bullet points, dates, etc.

Output ONLY the LaTeX code, starting with \\documentclass and ending with \\end{document}.
Do not include any explanations or markdown formatting.""",
                model="gpt-4o",
                tools=[{"type": "code_interpreter"}]
            )
            
            latex_code = None
            try:
                # Create an empty thread first
                thread = client.beta.threads.create()
                
                # Add message with file attachment using the correct API format
                # For Assistants API v2, we use attachments parameter
                client.beta.threads.messages.create(
                    thread_id=thread.id,
                    role="user",
                    content="Convert this PDF resume to LaTeX code. Extract all content and formatting, and generate clean, compilable LaTeX.",
                    attachments=[
                        {
                            "file_id": uploaded_file.id,
                            "tools": [{"type": "code_interpreter"}]
                        }
                    ]
                )
                
                # Run the assistant
                run = client.beta.threads.runs.create(
                    thread_id=thread.id,
                    assistant_id=assistant.id
                )
                
                # Wait for completion (with timeout)
                import time
                max_wait_time = 60  # 60 seconds timeout
                start_time = time.time()
                
                while run.status in ['queued', 'in_progress']:
                    if time.time() - start_time > max_wait_time:
                        raise Exception("Timeout waiting for assistant to complete")
                    time.sleep(1)
                    run = client.beta.threads.runs.retrieve(
                        thread_id=thread.id,
                        run_id=run.id
                    )
                
                if run.status == 'completed':
                    # Get the response
                    messages = client.beta.threads.messages.list(thread_id=thread.id)
                    if messages.data and messages.data[0].content:
                        # Extract text from the first message
                        content = messages.data[0].content[0]
                        if hasattr(content, 'text'):
                            raw_response = content.text.value.strip()
                            
                            # Extract LaTeX code from the response
                            # The response might contain explanatory text before/after the LaTeX
                            # Look for LaTeX code blocks or documentclass
                            latex_code = raw_response
                            
                            # Try to extract LaTeX from markdown code blocks
                            import re
                            # Look for ```latex or ``` blocks
                            latex_match = re.search(r'```(?:latex)?\s*\n(.*?)\n```', raw_response, re.DOTALL)
                            if latex_match:
                                latex_code = latex_match.group(1).strip()
                            else:
                                # Look for \documentclass to find the start
                                doc_start = raw_response.find('\\documentclass')
                                if doc_start != -1:
                                    # Find the end (last \end{document})
                                    doc_end = raw_response.rfind('\\end{document}')
                                    if doc_end != -1:
                                        latex_code = raw_response[doc_start:doc_end + len('\\end{document}')].strip()
                                    else:
                                        # Just take from \documentclass to end
                                        latex_code = raw_response[doc_start:].strip()
                                else:
                                    # If no \documentclass found, use the whole response
                                    latex_code = raw_response
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
                try:
                    client.beta.assistants.delete(assistant.id)
                except:
                    pass
            
            if latex_code:
                # Clean up: remove markdown code blocks if present
                if latex_code.startswith("```"):
                    lines = latex_code.split('\n')
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines[-1].startswith("```"):
                        lines = lines[:-1]
                    latex_code = '\n'.join(lines)
                
                return latex_code
            else:
                return None
            
        finally:
            # Clean up uploaded file
            if uploaded_file:
                try:
                    client.files.delete(uploaded_file.id)
                except:
                    pass
            
            # Clean up temp file
            if tmp_file_path:
                try:
                    os.unlink(tmp_file_path)
                except:
                    pass
            
    except Exception as e:
        print(f"PDF to LaTeX conversion failed: {e}")
        return None


def save_latex_to_resume(resume, latex_content: str, db) -> None:
    """
    Save LaTeX content to a resume record.
    
    This is the existing function that saves LaTeX to the database.
    
    Args:
        resume: The Resume model instance
        latex_content: The LaTeX code to save
        db: Database session
    """
    resume.latex_content = latex_content
    resume.updated_at = datetime.now()
    db.commit()
    db.refresh(resume)
