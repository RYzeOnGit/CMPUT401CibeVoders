"""FastAPI application main entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import init_db, ApplicationsSessionLocal
from app.api import applications, autofill, resumes, communications, reminders, ai
from app.services.demo_data import seed_demo_data
# Import models to ensure they're registered with metadata before init_db
from app import models  # noqa: F401

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown."""
    # Startup
    init_db()
    db = ApplicationsSessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Jobvibe API",
    description="Job application management platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite default port
        "http://localhost:5174",  # Alternative Vite port
        "http://localhost:3000",  # Alternative dev server port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(applications.router)
app.include_router(autofill.router)
app.include_router(resumes.router)
app.include_router(communications.router)
app.include_router(reminders.router)
app.include_router(ai.router)


@app.get("/")
def root():
    """Root endpoint."""
    return JSONResponse({
        "message": "Jobvibe API",
        "version": "1.0.0",
        "docs": "/docs"
    })


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "healthy"}

