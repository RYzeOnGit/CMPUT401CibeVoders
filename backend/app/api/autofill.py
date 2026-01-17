"""Autofill API routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import Application
from app.schemas import AutofillParseRequest, Application as ApplicationSchema
from app.services.autofill import parse_autofill

router = APIRouter(prefix="/api/autofill", tags=["autofill"])


@router.post("/parse", response_model=ApplicationSchema)
def parse_and_create_application(
    request: AutofillParseRequest,
    db: Session = Depends(get_db)
):
    """
    Parse job URL/text and automatically create an application entry.
    Simplify-style autofill feature.
    """
    # Parse the input
    parsed = parse_autofill(url=request.url, text=request.text)

    # Create application automatically
    application = Application(
        company_name=parsed.company_name,
        role_title=parsed.role_title,
        date_applied=datetime.now(),
        status="Applied",
        source="Autofill",
        location=parsed.location,
        duration=parsed.duration,
        notes=f"Auto-captured via autofill: {parsed.message}"
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    return application

