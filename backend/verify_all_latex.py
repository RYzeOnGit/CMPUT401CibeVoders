"""Verify LaTeX code for all resumes in the database."""
from app.database import ResumesSessionLocal
from app.models import Resume
from sqlalchemy import desc

db = ResumesSessionLocal()
try:
    # Get all resumes
    all_resumes = db.query(Resume).order_by(desc(Resume.created_at)).all()
    
    print("="*80)
    print("LATEX CODE VERIFICATION FOR ALL RESUMES")
    print("="*80)
    print()
    
    if not all_resumes:
        print("No resumes found in the database")
    else:
        print(f"Total resumes in database: {len(all_resumes)}")
        print()
        
        resumes_with_latex = 0
        resumes_without_latex = 0
        
        for idx, resume in enumerate(all_resumes, 1):
            print(f"{'='*80}")
            print(f"Resume #{idx}")
            print(f"{'='*80}")
            print(f"ID: {resume.id}")
            print(f"Name: {resume.name}")
            print(f"File Type: {resume.file_type}")
            print(f"Created At: {resume.created_at}")
            print(f"Is Master: {resume.is_master}")
            print()
            
            # Check LaTeX content
            has_latex = resume.latex_content is not None and len(resume.latex_content.strip()) > 0
            
            if has_latex:
                resumes_with_latex += 1
                latex_length = len(resume.latex_content)
                print(f"[HAS LATEX] Yes")
                print(f"LaTeX Length: {latex_length} characters")
                print()
                print("LaTeX Content Preview (first 600 chars):")
                print("-"*80)
                print(resume.latex_content[:600])
                if latex_length > 600:
                    print("...")
                    print(f"(showing first 600 of {latex_length} characters)")
                print("-"*80)
                
                # Show LaTeX structure
                print()
                print("LaTeX Structure Analysis:")
                if "\\documentclass" in resume.latex_content:
                    doc_start = resume.latex_content.find("\\documentclass")
                    doc_line = resume.latex_content[doc_start:resume.latex_content.find("\n", doc_start)]
                    print(f"  Document Class: {doc_line}")
                
                if "\\begin{document}" in resume.latex_content:
                    print("  Has \\begin{document}: Yes")
                else:
                    print("  Has \\begin{document}: No")
                
                if "\\end{document}" in resume.latex_content:
                    print("  Has \\end{document}: Yes")
                else:
                    print("  Has \\end{document}: No")
                
                # Count sections
                section_count = resume.latex_content.count("\\section{")
                print(f"  Number of sections: {section_count}")
                
            else:
                resumes_without_latex += 1
                print(f"[NO LATEX] LaTeX content is missing or empty")
                if resume.file_type == "application/pdf":
                    print(f"  WARNING: This is a PDF file but has no LaTeX conversion")
                else:
                    print(f"  Note: File type is {resume.file_type} (LaTeX conversion only for PDFs)")
            
            print()
        
        # Summary
        print("="*80)
        print("SUMMARY")
        print("="*80)
        print(f"Total Resumes: {len(all_resumes)}")
        print(f"Resumes WITH LaTeX: {resumes_with_latex}")
        print(f"Resumes WITHOUT LaTeX: {resumes_without_latex}")
        print()
        
        if resumes_with_latex > 0:
            print("Files with LaTeX code:")
            for resume in all_resumes:
                if resume.latex_content:
                    print(f"  [OK] {resume.name} (ID: {resume.id}) - {len(resume.latex_content)} chars")
        
        if resumes_without_latex > 0:
            print()
            print("Files without LaTeX code:")
            for resume in all_resumes:
                if not resume.latex_content or len(resume.latex_content.strip()) == 0:
                    file_type_note = f" ({resume.file_type})" if resume.file_type else ""
                    print(f"  [MISSING] {resume.name} (ID: {resume.id}){file_type_note}")
        
finally:
    db.close()
