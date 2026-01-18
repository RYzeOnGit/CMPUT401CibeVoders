"""Communications API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Communication, Application
from app.schemas import (
    CommunicationCreate,
    CommunicationUpdate,
    Communication as CommunicationSchema,
    ResponseTrackingSummary,
    GlobalResponseStatistics
)

router = APIRouter(prefix="/api/communications", tags=["communications"])

# Mapping of communication types to application statuses
COMMUNICATION_TO_STATUS = {
    "Interview Invite": "Interview",
    "Rejection": "Rejected",
    "Offer": "Offer",
}


def update_application_status(application_id: int, communication_type: str, db: Session):
    """Automatically update application status based on communication type."""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        return
    
    # Update status based on communication type
    new_status = COMMUNICATION_TO_STATUS.get(communication_type)
    if new_status:
        # Only update if the new status is more advanced than current
        status_priority = {"Applied": 1, "Interview": 2, "Offer": 3, "Rejected": 0}
        current_priority = status_priority.get(application.status, 0)
        new_priority = status_priority.get(new_status, 0)
        
        # Update if it's a rejection (always update) or if new status is more advanced
        if new_status == "Rejected" or new_priority > current_priority:
            application.status = new_status
            application.updated_at = datetime.now()
            db.commit()


@router.get("", response_model=List[CommunicationSchema])
def get_communications(
    application_id: Optional[int] = None,
    communication_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Get all communications with optional filters.
    
    Args:
        application_id: Filter by specific application
        communication_type: Filter by communication type (Interview Invite, Rejection, Offer, Note, Follow-up)
        start_date: Filter communications from this date onwards
        end_date: Filter communications up to this date
    """
    query = db.query(Communication)
    
    if application_id:
        query = query.filter(Communication.application_id == application_id)
    
    if communication_type:
        query = query.filter(Communication.type == communication_type)
    
    if start_date:
        query = query.filter(Communication.timestamp >= start_date)
    
    if end_date:
        query = query.filter(Communication.timestamp <= end_date)
    
    return query.order_by(Communication.timestamp.desc()).all()


@router.get("/{communication_id}", response_model=CommunicationSchema)
def get_communication(communication_id: int, db: Session = Depends(get_db)):
    """Get a single communication by ID."""
    communication = db.query(Communication).filter(Communication.id == communication_id).first()
    if not communication:
        raise HTTPException(status_code=404, detail="Communication not found")
    return communication


@router.post("", response_model=CommunicationSchema, status_code=201)
def create_communication(communication: CommunicationCreate, db: Session = Depends(get_db)):
    """Create a new communication log and automatically update application status."""
    # Verify application exists
    application = db.query(Application).filter(Application.id == communication.application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Set timestamp if not provided
    # Use model_dump with mode='python' to preserve datetime objects
    communication_data = communication.model_dump(mode='python')
    if not communication_data.get("timestamp"):
        # Use response_date as timestamp if provided, otherwise use current time
        if communication.response_date:
            communication_data["timestamp"] = communication.response_date
        else:
            communication_data["timestamp"] = datetime.now()
    
    db_communication = Communication(**communication_data)
    db.add(db_communication)
    db.commit()
    db.refresh(db_communication)
    
    # Automatically update application status based on communication type
    update_application_status(communication.application_id, communication.type, db)
    
    return db_communication


@router.patch("/{communication_id}", response_model=CommunicationSchema)
def update_communication(
    communication_id: int,
    communication_update: CommunicationUpdate,
    db: Session = Depends(get_db)
):
    """Update a communication log."""
    db_communication = db.query(Communication).filter(Communication.id == communication_id).first()
    if not db_communication:
        raise HTTPException(status_code=404, detail="Communication not found")
    
    update_data = communication_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_communication, field, value)
    
    db.commit()
    db.refresh(db_communication)
    
    # Update application status if type was changed
    if "type" in update_data:
        update_application_status(db_communication.application_id, db_communication.type, db)
    
    return db_communication


@router.delete("/{communication_id}", status_code=204)
def delete_communication(communication_id: int, db: Session = Depends(get_db)):
    """Delete a communication log."""
    db_communication = db.query(Communication).filter(Communication.id == communication_id).first()
    if not db_communication:
        raise HTTPException(status_code=404, detail="Communication not found")
    
    db.delete(db_communication)
    db.commit()
    return None


@router.get("/tracking/summary", response_model=List[ResponseTrackingSummary])
def get_response_tracking_summary(
    application_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get response tracking summary for all applications or a specific application."""
    # Build base query for statistics
    query = db.query(
        Application.id.label("application_id"),
        Application.company_name,
        Application.role_title,
        Application.status,
        func.count(Communication.id).label("total_responses"),
        func.sum(case((Communication.type == "Interview Invite", 1), else_=0)).label("interview_invites"),
        func.sum(case((Communication.type == "Rejection", 1), else_=0)).label("rejections"),
        func.sum(case((Communication.type == "Offer", 1), else_=0)).label("offers"),
        func.max(Communication.timestamp).label("latest_response_date")
    ).outerjoin(
        Communication, Application.id == Communication.application_id
    )
    
    if application_id:
        query = query.filter(Application.id == application_id)
    
    results = query.group_by(
        Application.id,
        Application.company_name,
        Application.role_title,
        Application.status
    ).all()
    
    # Get latest response type for each application using a separate query
    summaries = []
    for result in results:
        latest_response_type = None
        if result.latest_response_date:
            # Get the type of the communication with the latest timestamp
            latest_comm = db.query(Communication.type).filter(
                Communication.application_id == result.application_id,
                Communication.timestamp == result.latest_response_date
            ).first()
            if latest_comm:
                latest_response_type = latest_comm[0]
        
        summaries.append(ResponseTrackingSummary(
            application_id=result.application_id,
            company_name=result.company_name,
            role_title=result.role_title,
            total_responses=result.total_responses or 0,
            interview_invites=int(result.interview_invites or 0),
            rejections=int(result.rejections or 0),
            offers=int(result.offers or 0),
            latest_response_date=result.latest_response_date,
            latest_response_type=latest_response_type,
            status=result.status
        ))
    
    return summaries


@router.get("/tracking/statistics", response_model=GlobalResponseStatistics)
def get_global_response_statistics(db: Session = Depends(get_db)):
    """Get global response statistics across all applications."""
    # Get total applications
    total_applications = db.query(func.count(Application.id)).scalar() or 0
    
    # Get communication statistics
    comm_stats = db.query(
        func.count(Communication.id).label("total_communications"),
        func.sum(case((Communication.type == "Interview Invite", 1), else_=0)).label("interview_invites"),
        func.sum(case((Communication.type == "Rejection", 1), else_=0)).label("rejections"),
        func.sum(case((Communication.type == "Offer", 1), else_=0)).label("offers")
    ).first()
    
    total_communications = comm_stats.total_communications or 0
    total_interview_invites = int(comm_stats.interview_invites or 0)
    total_rejections = int(comm_stats.rejections or 0)
    total_offers = int(comm_stats.offers or 0)
    
    # Get applications with at least one response
    applications_with_responses = db.query(func.count(func.distinct(Communication.application_id))).scalar() or 0
    
    # Get applications with interview invites
    applications_with_interviews = db.query(
        func.count(func.distinct(Communication.application_id))
    ).filter(Communication.type == "Interview Invite").scalar() or 0
    
    # Get applications with offers
    applications_with_offers = db.query(
        func.count(func.distinct(Communication.application_id))
    ).filter(Communication.type == "Offer").scalar() or 0
    
    # Calculate rates
    response_rate = (applications_with_responses / total_applications * 100) if total_applications > 0 else 0.0
    interview_rate = (applications_with_interviews / total_applications * 100) if total_applications > 0 else 0.0
    offer_rate = (applications_with_offers / total_applications * 100) if total_applications > 0 else 0.0
    
    return GlobalResponseStatistics(
        total_applications=total_applications,
        total_communications=total_communications,
        total_interview_invites=total_interview_invites,
        total_rejections=total_rejections,
        total_offers=total_offers,
        response_rate=round(response_rate, 2),
        interview_rate=round(interview_rate, 2),
        offer_rate=round(offer_rate, 2)
    )

