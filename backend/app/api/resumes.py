"""Resumes API routes."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_resumes_db
from app.models import Resume
from app.schemas import ResumeCreate, ResumeUpdate, Resume as ResumeSchema
from app.services.pdf_to_latex import convert_pdf_to_latex, save_latex_to_resume

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.get("", response_model=List[ResumeSchema])
def get_resumes(db: Session = Depends(get_resumes_db)):
    """Get all resumes."""
    return db.query(Resume).order_by(Resume.created_at.desc()).all()


@router.post("", response_model=ResumeSchema, status_code=201)
def create_resume(resume: ResumeCreate, db: Session = Depends(get_resumes_db)):
    """Create a new resume."""
    resume_data = resume.model_dump()
    
    # If setting as master, ensure no other resume is master
    if resume_data.get('is_master', False):
        # Unset any existing master resume
        existing_master = db.query(Resume).filter(Resume.is_master == True).first()
        if existing_master:
            existing_master.is_master = False
    
    db_resume = Resume(**resume_data)
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume


@router.post("/upload", response_model=ResumeSchema, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    is_master: bool = Form(False),
    db: Session = Depends(get_resumes_db)
):
    """Upload resume file (PDF or DOCX) for inline viewing and LaTeX conversion."""
    # Validate file type - accept PDF and DOCX
    valid_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    
    if file.content_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Supported types: PDF, DOCX. Got: {file.content_type}"
        )
    
    # Check file size (10MB limit)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Minimal content structure (required by Resume model)
    minimal_content = {
        "name": "",
        "email": "",
        "phone": "",
        "summary": "",
        "experience": [],
        "skills": [],
        "education": {}
    }
    
    # Create resume with file storage (no extraction)
    resume_name = name or file.filename.replace(".pdf", "").replace(".docx", "").replace(".doc", "") if file.filename else "Uploaded Resume"
    
    # If setting as master, ensure no other resume is master
    if is_master:
        existing_master = db.query(Resume).filter(Resume.is_master == True).first()
        if existing_master:
            existing_master.is_master = False
    
    db_resume = Resume(
        name=resume_name,
        is_master=is_master,
        content=minimal_content,
        file_data=file_content,  # Store original file
        file_type=file.content_type,  # Store file type
        version_history=[{
            "timestamp": datetime.now().isoformat(),
            "content": {
                "summary": f"File uploaded: {file.filename}"
            }
        }]
    )
    
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    
    # Convert PDF to LaTeX if it's a PDF file
    if file.content_type == "application/pdf" and file_content:
        try:
            latex_content = convert_pdf_to_latex(file_content)
            if latex_content:
                save_latex_to_resume(db_resume, latex_content, db)
        except Exception as e:
            # Log error but don't fail the upload
            print(f"Failed to convert PDF to LaTeX: {e}")
            # Continue without LaTeX conversion - upload still succeeds
    
    return db_resume


# Specific routes must come BEFORE generic {resume_id} routes
@router.get("/{resume_id}/file")
def get_resume_file(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Get the original PDF/DOCX file for a resume."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.file_data:
        raise HTTPException(status_code=404, detail="No file attached to this resume")
    
    # Determine content type and filename
    content_type = resume.file_type or "application/pdf"
    filename = f"{resume.name}.pdf" if "pdf" in content_type else f"{resume.name}.docx"
    
    return Response(
        content=resume.file_data,
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )


@router.patch("/{resume_id}/set-master", response_model=ResumeSchema)
def set_master_resume(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Set a resume as the master resume. Unsets any other master resume."""
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Unset any existing master resume
    existing_master = db.query(Resume).filter(Resume.is_master == True, Resume.id != resume_id).first()
    if existing_master:
        existing_master.is_master = False
    
    # Set this resume as master
    db_resume.is_master = True
    db_resume.updated_at = datetime.now()
    db.commit()
    db.refresh(db_resume)
    return db_resume


@router.patch("/{resume_id}/unset-master", response_model=ResumeSchema)
def unset_master_resume(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Unset a resume as the master resume."""
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    db_resume.is_master = False
    db_resume.updated_at = datetime.now()
    db.commit()
    db.refresh(db_resume)
    return db_resume


# Generic routes come AFTER specific routes
@router.get("/{resume_id}", response_model=ResumeSchema)
def get_resume(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Get a single resume by ID."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.patch("/{resume_id}", response_model=ResumeSchema)
def update_resume(
    resume_id: int,
    resume_update: ResumeUpdate,
    db: Session = Depends(get_resumes_db)
):
    """Update a resume."""
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Store version history before update
    if db_resume.content:
        db_resume.version_history.append({
            "timestamp": datetime.now().isoformat(),
            "content": db_resume.content
        })

    update_data = resume_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_resume, field, value)

    db_resume.updated_at = datetime.now()
    db.commit()
    db.refresh(db_resume)
    return db_resume


@router.delete("/{resume_id}", status_code=204)
def delete_resume(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Delete a resume."""
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    db.delete(db_resume)
    db.commit()
    return None

