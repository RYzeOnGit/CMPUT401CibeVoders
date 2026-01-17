"""Convert PDF to LaTeX and save to database."""
from app.database import ResumesSessionLocal
from app.models import Resume
from app.services.pdf_to_latex import convert_pdf_to_latex, save_latex_to_resume
from sqlalchemy import desc

db = ResumesSessionLocal()
try:
    resume = db.query(Resume).order_by(desc(Resume.created_at)).first()
    if not resume:
        print("No resume found")
        exit(1)
    
    print(f"Converting resume: {resume.name}")
    print(f"PDF size: {len(resume.file_data)} bytes")
    print()
    
    print("Calling convert_pdf_to_latex...")
    latex = convert_pdf_to_latex(resume.file_data)
    
    if latex:
        print(f"[SUCCESS] LaTeX generated!")
        print(f"Length: {len(latex)} characters")
        print()
        print("LaTeX Preview (first 300 chars):")
        print("="*60)
        print(latex[:300])
        print("="*60)
        print()
        
        print("Saving to database...")
        save_latex_to_resume(resume, latex, db)
        print("[SUCCESS] LaTeX saved to database!")
        
        # Verify it was saved
        db.refresh(resume)
        if resume.latex_content:
            print(f"[VERIFIED] LaTeX content in database: {len(resume.latex_content)} chars")
        else:
            print("[ERROR] LaTeX not found in database after save")
    else:
        print("[ERROR] LaTeX conversion returned None")
        
finally:
    db.close()
