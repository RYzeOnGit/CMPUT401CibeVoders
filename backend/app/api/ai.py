"""AI Chat API routes for resume critique and technical interview."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.database import get_db, get_resumes_db
from app.models import Resume, Application, ChatSession
from app.schemas import ChatSessionCreate, ChatSessionUpdate, ChatSession as ChatSessionSchema
from app.services.ai_chat import critique_resume, start_interview, continue_interview, rate_answer

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatRequest(BaseModel):
    message: str
    mode: str  # 'critique' or 'interview'
    resume_id: Optional[int] = None
    application_id: Optional[int] = None
    conversation_history: List[Dict[str, str]] = []


class StartInterviewRequest(BaseModel):
    resume_id: int
    application_id: Optional[int] = None


class CritiqueRequest(BaseModel):
    resume_id: int


class RateAnswerRequest(BaseModel):
    question: str
    answer: str
    resume_id: Optional[int] = None


@router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db), resumes_db: Session = Depends(get_resumes_db)):
    """Handle chat messages for both critique and interview modes."""
    try:
        resume = None
        application = None
        
        if request.resume_id:
            resume = resumes_db.query(Resume).filter(Resume.id == request.resume_id).first()
            if not resume:
                raise HTTPException(status_code=404, detail="Resume not found")
        
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
        
        if request.mode == 'critique':
            response = await critique_resume(resume, request.message, request.conversation_history)
        elif request.mode == 'interview':
            response = await continue_interview(resume, application, request.message, request.conversation_history)
        else:
            raise HTTPException(status_code=400, detail="Invalid mode")
        
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/critique-resume")
async def get_resume_critique(request: CritiqueRequest, resumes_db: Session = Depends(get_resumes_db)):
    """Get initial resume critique."""
    try:
        resume = resumes_db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        critique = await critique_resume(resume, "", [])
        return {"critique": critique}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start-interview")
async def start_technical_interview(request: StartInterviewRequest, db: Session = Depends(get_db), resumes_db: Session = Depends(get_resumes_db)):
    """Start a technical interview session."""
    try:
        resume = resumes_db.query(Resume).filter(Resume.id == request.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        application = None
        if request.application_id:
            application = db.query(Application).filter(Application.id == request.application_id).first()
        
        question = await start_interview(resume, application)
        return {"question": question}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rate-answer")
async def rate_interview_answer(request: RateAnswerRequest, resumes_db: Session = Depends(get_resumes_db)):
    """Rate a technical interview answer."""
    try:
        resume = None
        if request.resume_id:
            resume = resumes_db.query(Resume).filter(Resume.id == request.resume_id).first()
        
        rating = await rate_answer(request.question, request.answer, resume)
        return {"rating": rating}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Chat Session Management Endpoints
@router.get("/sessions", response_model=List[ChatSessionSchema])
async def get_chat_sessions(db: Session = Depends(get_db)):
    """Get all chat sessions, ordered by most recent."""
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
    return sessions


@router.get("/sessions/{session_id}", response_model=ChatSessionSchema)
async def get_chat_session(session_id: int, db: Session = Depends(get_db)):
    """Get a specific chat session by ID."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session


@router.post("/sessions", response_model=ChatSessionSchema)
async def create_chat_session(
    request: ChatSessionCreate, 
    db: Session = Depends(get_db),
    resumes_db: Session = Depends(get_resumes_db)
):
    """Create a new chat session."""
    # Generate title if not provided
    title = request.title
    if not title:
        resume_name = "Resume"
        if request.resume_id:
            resume = resumes_db.query(Resume).filter(Resume.id == request.resume_id).first()
            if resume:
                resume_name = resume.name
        
        mode_label = "Critique" if request.mode == "critique" else "Interview"
        title = f"{mode_label} - {resume_name}"
    
    session = ChatSession(
        title=title,
        mode=request.mode,
        resume_id=request.resume_id,
        application_id=request.application_id,
        messages=[]
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.put("/sessions/{session_id}", response_model=ChatSessionSchema)
async def update_chat_session(
    session_id: int,
    request: ChatSessionUpdate,
    db: Session = Depends(get_db)
):
    """Update a chat session (e.g., update messages or title)."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    if request.title is not None:
        session.title = request.title
    if request.messages is not None:
        session.messages = request.messages
    
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


@router.delete("/sessions/{session_id}")
async def delete_chat_session(session_id: int, db: Session = Depends(get_db)):
    """Delete a chat session."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    db.delete(session)
    db.commit()
    return {"message": "Chat session deleted successfully"}

