"""Resumes API routes."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_resumes_db
from app.models import Resume
from app.schemas import ResumeCreate, ResumeUpdate, Resume as ResumeSchema

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.get("", response_model=List[ResumeSchema])
def get_resumes(db: Session = Depends(get_resumes_db)):
    """Get all resumes."""
    return db.query(Resume).order_by(Resume.created_at.desc()).all()


@router.get("/{resume_id}", response_model=ResumeSchema)
def get_resume(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Get a single resume by ID."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.post("", response_model=ResumeSchema, status_code=201)
def create_resume(resume: ResumeCreate, db: Session = Depends(get_resumes_db)):
    """Create a new resume."""
    db_resume = Resume(**resume.model_dump())
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume


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


@router.get("/{resume_id}/file")
def get_resume_file(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Get the original .tex file for a resume."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.file_data:
        raise HTTPException(status_code=404, detail="No file attached to this resume")
    
    # Determine content type and filename
    content_type = resume.file_type or "text/x-tex"
    filename = f"{resume.name}.tex"
    
    return Response(
        content=resume.file_data,
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )


@router.post("/upload", response_model=ResumeSchema, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    is_master: bool = Form(False),
    db: Session = Depends(get_resumes_db)
):
    """Upload resume file (.tex only) for inline viewing."""
    # Validate file type - only .tex files
    if not file.filename or not file.filename.lower().endswith('.tex'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .tex files are supported."
        )
    
    # Accept various content types for .tex files
    valid_content_types = [
        "text/x-tex",
        "application/x-tex",
        "text/plain",
        "text/x-latex"
    ]
    
    # If content_type is not recognized but filename is .tex, allow it
    if file.content_type and file.content_type not in valid_content_types:
        # Check if filename is .tex - if so, override content type
        if not file.filename.lower().endswith('.tex'):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Only .tex files are supported. Got: {file.content_type}"
            )
    
    # Check file size (5MB limit for text files)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
    
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
    
    # Create resume with file storage
    resume_name = name or file.filename.replace(".tex", "") if file.filename else "Uploaded Resume"
    
    # Store content type as text/x-tex for consistency
    content_type = file.content_type if file.content_type in valid_content_types else "text/x-tex"
    
    db_resume = Resume(
        name=resume_name,
        is_master=is_master,
        content=minimal_content,
        file_data=file_content,  # Store original .tex file
        file_type=content_type,  # Store file type
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
    
    return db_resume

