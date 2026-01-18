"""Check if the latest uploaded resume has LaTeX content."""
from app.database import ResumesSessionLocal
from app.models import Resume
from sqlalchemy import desc

db = ResumesSessionLocal()
try:
    # Get the most recently created resume
    resume = db.query(Resume).order_by(desc(Resume.created_at)).first()
    
    if resume:
        print(f"Latest Resume:")
        print(f"  ID: {resume.id}")
        print(f"  Name: {resume.name}")
        print(f"  File Type: {resume.file_type}")
        print(f"  Created At: {resume.created_at}")
        print(f"  Has LaTeX: {resume.latex_content is not None}")
        
        if resume.latex_content:
            print(f"  LaTeX Length: {len(resume.latex_content)} characters")
            print(f"\n  LaTeX Preview (first 500 chars):")
            print("  " + "="*60)
            print("  " + resume.latex_content[:500].replace('\n', '\n  '))
            if len(resume.latex_content) > 500:
                print("  ...")
            print("  " + "="*60)
        else:
            print("  WARNING: No LaTeX content found for this resume")
    else:
        print("No resumes found in the database")
finally:
    db.close()
