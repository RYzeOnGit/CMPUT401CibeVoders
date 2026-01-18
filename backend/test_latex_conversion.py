"""Test LaTeX conversion on the latest resume."""
from app.database import ResumesSessionLocal
from app.models import Resume
from app.services.pdf_to_latex import convert_pdf_to_latex, save_latex_to_resume
from sqlalchemy import desc
import os

# Check if OpenAI API key is set
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("ERROR: OPENAI_API_KEY not found in environment")
    print("Please set it in backend/.env file")
else:
    print(f"OpenAI API Key found: {api_key[:10]}...")

db = ResumesSessionLocal()
try:
    # Get the most recently created resume
    resume = db.query(Resume).order_by(desc(Resume.created_at)).first()
    
    if resume and resume.file_data and resume.file_type == "application/pdf":
        print(f"\nTesting LaTeX conversion for resume: {resume.name}")
        print(f"PDF size: {len(resume.file_data)} bytes")
        
        # Try to convert
        print("\nConverting PDF to LaTeX...")
        latex_content = convert_pdf_to_latex(resume.file_data)
        
        if latex_content:
            print(f"✓ Conversion successful! LaTeX length: {len(latex_content)} characters")
            print(f"\nSaving to database...")
            save_latex_to_resume(resume, latex_content, db)
            print("✓ LaTeX saved to database!")
            
            print(f"\nLaTeX Preview (first 500 chars):")
            print("="*60)
            print(latex_content[:500])
            if len(latex_content) > 500:
                print("...")
            print("="*60)
        else:
            print("X Conversion failed - returned None")
    else:
        print("No PDF resume found to convert")
finally:
    db.close()
