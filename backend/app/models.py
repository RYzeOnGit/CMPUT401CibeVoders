"""SQLAlchemy database models."""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Boolean, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import ApplicationsBase, ResumesBase


class Application(ApplicationsBase):
    """Job application model."""
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, nullable=False, index=True)
    role_title = Column(String, nullable=False)
    date_applied = Column(DateTime, default=func.now(), nullable=False)
    status = Column(String, default="Applied", nullable=False)  # Applied | Interview | Offer | Rejected
    source = Column(String)  # LinkedIn, Company Site, Referral, etc.
    location = Column(String)  # Toronto, ON, etc.
    duration = Column(String)  # 12 months, 4 months, Full-time, etc.
    notes = Column(Text)
    resume_id = Column(Integer, nullable=True)  # Reference to resume ID (no FK across databases)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships (within same database)
    communications = relationship("Communication", back_populates="application", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="application", cascade="all, delete-orphan")


class Resume(ResumesBase):
    """Resume model - master and derived versions."""
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    is_master = Column(Boolean, default=False)
    master_resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    content = Column(JSON, nullable=False)  # Store resume structure as JSON
    version_history = Column(JSON, default=list)  # Lightweight version history
    file_data = Column(LargeBinary, nullable=True)  # Store original PDF/DOCX file
    file_type = Column(String, nullable=True)  # Store file MIME type (application/pdf, etc.)
    latex_content = Column(Text, nullable=True)  # Store LaTeX representation of the resume
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Self-referential relationship for derived resumes
    master_resume = relationship("Resume", remote_side=[id], backref="derived_resumes")


class Communication(ApplicationsBase):
    """Communication log for applications."""
    __tablename__ = "communications"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    type = Column(String, nullable=False)  # Interview Invite | Rejection | Offer | Note | Follow-up
    message = Column(Text)
    sender_name = Column(String)  # Name of the person/company who sent the response
    sender_email = Column(String)  # Email of the sender (if available)
    response_date = Column(DateTime)  # Date when the response was received
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    application = relationship("Application", back_populates="communications")


class Reminder(ApplicationsBase):
    """Reminders and follow-ups."""
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    type = Column(String, nullable=False)  # Follow-up | Interview Prep | Other
    message = Column(Text)
    due_date = Column(DateTime, nullable=False)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    application = relationship("Application", back_populates="reminders")


class ChatSession(ApplicationsBase):
    """AI Chat session model for storing chat history."""
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)  # Auto-generated or user-provided title
    mode = Column(String, nullable=False)  # 'critique' or 'interview'
    resume_id = Column(Integer, nullable=True)  # Reference to resume ID
    application_id = Column(Integer, nullable=True)  # Reference to application ID
    messages = Column(JSON, default=list)  # Store conversation history as JSON
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

