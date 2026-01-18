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
    latex_content: Optional[str] = None  # LaTeX representation of the resume
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Communication schemas
class CommunicationBase(BaseModel):
    application_id: int
    type: str  # Interview Invite | Rejection | Offer | Note | Follow-up
    message: Optional[str] = None
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    response_date: Optional[datetime] = None
    timestamp: Optional[datetime] = None


class CommunicationCreate(BaseModel):
    """Schema for creating a new communication - timestamp is set server-side."""
    model_config = ConfigDict(extra='forbid')
    
    application_id: int
    type: str  # Interview Invite | Rejection | Offer | Note | Follow-up
    message: Optional[str] = None
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    response_date: Optional[datetime] = None
    # Note: timestamp is excluded from create - it's set automatically on server


class CommunicationUpdate(BaseModel):
    type: Optional[str] = None
    message: Optional[str] = None
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    response_date: Optional[datetime] = None


class Communication(CommunicationBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Response Tracking schemas
class ResponseTrackingSummary(BaseModel):
    """Summary of responses for an application."""
    application_id: int
    company_name: str
    role_title: str
    total_responses: int
    interview_invites: int
    rejections: int
    offers: int
    latest_response_date: Optional[datetime] = None
    latest_response_type: Optional[str] = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class GlobalResponseStatistics(BaseModel):
    """Global statistics across all applications."""
    total_applications: int
    total_communications: int
    total_interview_invites: int
    total_rejections: int
    total_offers: int
    response_rate: float  # Percentage of applications with at least one response
    interview_rate: float  # Percentage of applications with interview invites
    offer_rate: float  # Percentage of applications with offers

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


# Chat Session schemas
class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: Optional[datetime] = None


class ChatSessionBase(BaseModel):
    title: str
    mode: str  # 'critique' or 'interview'
    resume_id: Optional[int] = None
    application_id: Optional[int] = None
    messages: List[Dict[str, Any]] = []


class ChatSessionCreate(BaseModel):
    title: Optional[str] = None  # Auto-generated if not provided
    mode: str
    resume_id: Optional[int] = None
    application_id: Optional[int] = None


class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    messages: Optional[List[Dict[str, Any]]] = None


class ChatSession(ChatSessionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

