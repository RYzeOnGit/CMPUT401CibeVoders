"""Database setup and session management."""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path

# Get absolute path to backend directory
BACKEND_DIR = Path(__file__).parent.parent.absolute()

# Applications database (for applications, communications, reminders)
APPLICATIONS_DATABASE_URL = os.getenv(
    "APPLICATIONS_DATABASE_URL", f"sqlite:///{BACKEND_DIR}/jobflow.db"
)

# Resumes database (separate database for resumes)
RESUMES_DATABASE_URL = os.getenv(
    "RESUMES_DATABASE_URL", f"sqlite:///{BACKEND_DIR}/resumes.db"
)

# Create engines
applications_engine = create_engine(
    APPLICATIONS_DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite specific
)

resumes_engine = create_engine(
    RESUMES_DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite specific
)

# Create session factories
ApplicationsSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=applications_engine)
ResumesSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=resumes_engine)

# Base classes for models
ApplicationsBase = declarative_base()
ResumesBase = declarative_base()

# Legacy Base for backward compatibility (points to ApplicationsBase)
Base = ApplicationsBase


def get_db():
    """Dependency for getting applications database session (legacy)."""
    db = ApplicationsSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_resumes_db():
    """Dependency for getting resumes database session."""
    db = ResumesSessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize all database tables."""
    ApplicationsBase.metadata.create_all(bind=applications_engine)
    ResumesBase.metadata.create_all(bind=resumes_engine)

