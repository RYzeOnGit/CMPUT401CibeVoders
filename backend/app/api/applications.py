"""Applications API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import Application
from app.schemas import ApplicationCreate, ApplicationUpdate, Application as ApplicationSchema

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.get("", response_model=List[ApplicationSchema])
def get_applications(db: Session = Depends(get_db)):
    """Get all applications."""
    return db.query(Application).order_by(Application.date_applied.desc()).all()


@router.get("/{application_id}", response_model=ApplicationSchema)
def get_application(application_id: int, db: Session = Depends(get_db)):
    """Get a single application by ID."""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.post("", response_model=ApplicationSchema, status_code=201)
def create_application(application: ApplicationCreate, db: Session = Depends(get_db)):
    """Create a new application."""
    db_application = Application(**application.model_dump())
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application


@router.patch("/{application_id}", response_model=ApplicationSchema)
def update_application(
    application_id: int,
    application_update: ApplicationUpdate,
    db: Session = Depends(get_db)
):
    """Update an application."""
    db_application = db.query(Application).filter(Application.id == application_id).first()
    if not db_application:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = application_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_application, field, value)

    db_application.updated_at = datetime.now()
    db.commit()
    db.refresh(db_application)
    return db_application


@router.delete("/{application_id}", status_code=204)
def delete_application(application_id: int, db: Session = Depends(get_db)):
    """Delete an application."""
    db_application = db.query(Application).filter(Application.id == application_id).first()
    if not db_application:
        raise HTTPException(status_code=404, detail="Application not found")

    db.delete(db_application)
    db.commit()
    return None

