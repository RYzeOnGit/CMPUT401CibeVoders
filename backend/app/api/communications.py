"""Communications API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Communication
from app.schemas import CommunicationCreate, Communication as CommunicationSchema

router = APIRouter(prefix="/api/communications", tags=["communications"])


@router.get("", response_model=List[CommunicationSchema])
def get_communications(
    application_id: int = None,
    db: Session = Depends(get_db)
):
    """Get all communications, optionally filtered by application_id."""
    query = db.query(Communication)
    if application_id:
        query = query.filter(Communication.application_id == application_id)
    return query.order_by(Communication.timestamp.desc()).all()


@router.post("", response_model=CommunicationSchema, status_code=201)
def create_communication(communication: CommunicationCreate, db: Session = Depends(get_db)):
    """Create a new communication log."""
    db_communication = Communication(**communication.model_dump())
    db.add(db_communication)
    db.commit()
    db.refresh(db_communication)
    return db_communication

