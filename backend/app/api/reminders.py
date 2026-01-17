"""Reminders API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Reminder
from app.schemas import ReminderCreate, ReminderUpdate, Reminder

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


@router.get("", response_model=List[Reminder])
def get_reminders(
    is_completed: bool = None,
    db: Session = Depends(get_db)
):
    """Get all reminders, optionally filtered by completion status."""
    query = db.query(Reminder)
    if is_completed is not None:
        query = query.filter(Reminder.is_completed == is_completed)
    return query.order_by(Reminder.due_date.asc()).all()


@router.patch("/{reminder_id}", response_model=Reminder)
def update_reminder(
    reminder_id: int,
    reminder_update: ReminderUpdate,
    db: Session = Depends(get_db)
):
    """Update a reminder (e.g., mark as completed)."""
    db_reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    update_data = reminder_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_reminder, field, value)

    db.commit()
    db.refresh(db_reminder)
    return db_reminder

