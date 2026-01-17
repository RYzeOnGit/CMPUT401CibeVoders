"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any


# Application schemas
class ApplicationBase(BaseModel):
    company_name: str
    role_title: str
    date_applied: datetime
    status: str = "Applied"
    source: Optional[str] = None
    location: Optional[str] = None
    duration: Optional[str] = None
    notes: Optional[str] = None
    resume_id: Optional[int] = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    role_title: Optional[str] = None
    date_applied: Optional[datetime] = None
    status: Optional[str] = None
    source: Optional[str] = None
    location: Optional[str] = None
    duration: Optional[str] = None
    notes: Optional[str] = None
    resume_id: Optional[int] = None


class Application(ApplicationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Resume schemas
class ResumeBase(BaseModel):
    name: str
    is_master: bool = False
    master_resume_id: Optional[int] = None
    content: Dict[str, Any]
    version_history: List[Dict[str, Any]] = []


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[Dict[str, Any]] = None


class Resume(ResumeBase):
    id: int
    file_type: Optional[str] = None  # Include file_type to indicate PDF exists
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Communication schemas
class CommunicationBase(BaseModel):
    application_id: int
    type: str
    message: Optional[str] = None
    timestamp: datetime


class CommunicationCreate(CommunicationBase):
    pass


class Communication(CommunicationBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Reminder schemas
class ReminderBase(BaseModel):
    application_id: int
    type: str
    message: Optional[str] = None
    due_date: datetime
    is_completed: bool = False


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    is_completed: Optional[bool] = None
    message: Optional[str] = None


class Reminder(ReminderBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Autofill schemas
class AutofillParseRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None  # For screenshot/email text extraction


class AutofillParseResponse(BaseModel):
    company_name: str
    role_title: str
    location: Optional[str] = None
    duration: Optional[str] = None
    success: bool
    message: str

