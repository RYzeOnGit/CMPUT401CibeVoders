"""SQLAlchemy database models."""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Application(Base):
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
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    communications = relationship("Communication", back_populates="application", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="application", cascade="all, delete-orphan")
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    resume = relationship("Resume", foreign_keys=[resume_id])


class Resume(Base):
    """Resume model - master and derived versions."""
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    is_master = Column(Boolean, default=False)
    master_resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    content = Column(JSON, nullable=False)  # Store resume structure as JSON
    version_history = Column(JSON, default=list)  # Lightweight version history
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Self-referential relationship for derived resumes
    master_resume = relationship("Resume", remote_side=[id], backref="derived_resumes")


class Communication(Base):
    """Communication log for applications."""
    __tablename__ = "communications"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    type = Column(String, nullable=False)  # Interview Invite | Rejection | Offer | Note
    message = Column(Text)
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    application = relationship("Application", back_populates="communications")


class Reminder(Base):
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

