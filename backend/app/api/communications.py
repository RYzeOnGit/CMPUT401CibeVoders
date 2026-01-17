"""Communications API routes."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import base64
import json

from app.database import get_db
from app.models import Communication
from app.schemas import CommunicationCreate, Communication as CommunicationSchema
from app.services.ai_chat import get_openai_client

router = APIRouter(prefix="/api/communications", tags=["communications"])


@router.get("", response_model=List[CommunicationSchema])
def get_communications(
    application_id: int = None,
    db: Session = Depends(get_db)
):
    """Get all communications, optionally filtered by application_id."""
    query = db.query(Communication)
    if application_id:
        query = query.filter(Communication.application_id == application_id)
    return query.order_by(Communication.timestamp.desc()).all()


@router.post("", response_model=CommunicationSchema, status_code=201)
def create_communication(communication: CommunicationCreate, db: Session = Depends(get_db)):
    """Create a new communication log."""
    db_communication = Communication(**communication.model_dump())
    db.add(db_communication)
    db.commit()
    db.refresh(db_communication)
    return db_communication


@router.post("/process-image")
async def process_communication_image(
    file: UploadFile = File(...),
    application_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Process an image to extract text via OCR and generate a communication summary.
    Returns the communication type and message.
    """
    try:
        # Read image file
        image_data = await file.read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Determine MIME type
        mime_type = file.content_type or "image/jpeg"
        if mime_type not in ["image/jpeg", "image/png", "image/gif", "image/webp"]:
            raise HTTPException(status_code=400, detail="Unsupported image format")
        
        # Use OpenAI Vision API to read the image and generate communication
        client = get_openai_client()
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # gpt-4o-mini supports vision
            messages=[
                {
                    "role": "system",
                    "content": """You are an assistant that analyzes images of job-related communications (emails, messages, letters, etc.) 
and extracts relevant information. Based on the image content, determine:
1. The type of communication: "Note", "Interview Invite", "Offer", or "Rejection"
2. A one-line factual summary of the update

Return a JSON object with:
- "type": one of "Note", "Interview Invite", "Offer", "Rejection"
- "message": a single-line summary of the update (one sentence only)

Rules:
- If it's an interview invitation, use type "Interview Invite"
- If it's a job offer, use type "Offer"
- If it's a rejection, use type "Rejection"
- For any other communication (updates, questions, etc.), use type "Note"
- The message must be exactly one line (one sentence)
- Do not address any person (no "you", "your", "we", etc.)
- State the update factually and objectively
- Example: "Interview scheduled for next Tuesday at 2 PM" not "You have an interview scheduled..." """
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Analyze this image and extract the communication information. Return JSON with 'type' and 'message' fields."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=200
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Validate and return the result
        valid_types = ["Note", "Interview Invite", "Offer", "Rejection"]
        comm_type = result.get("type", "Note")
        if comm_type not in valid_types:
            comm_type = "Note"
        
        return {
            "type": comm_type,
            "message": result.get("message", "Communication extracted from image.")
        }
        
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

