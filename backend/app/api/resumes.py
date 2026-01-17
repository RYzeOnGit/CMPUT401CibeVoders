"""Resumes API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import Resume
from app.schemas import ResumeCreate, ResumeUpdate, Resume as ResumeSchema

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.get("", response_model=List[ResumeSchema])
def get_resumes(db: Session = Depends(get_db)):
    """Get all resumes."""
    return db.query(Resume).order_by(Resume.created_at.desc()).all()


@router.get("/{resume_id}", response_model=ResumeSchema)
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    """Get a single resume by ID."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.post("", response_model=ResumeSchema, status_code=201)
def create_resume(resume: ResumeCreate, db: Session = Depends(get_db)):
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
    db: Session = Depends(get_db)
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
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    """Delete a resume."""
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    db.delete(db_resume)
    db.commit()
    return None

