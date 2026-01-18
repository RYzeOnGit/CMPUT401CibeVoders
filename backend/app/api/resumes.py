"""Resumes API routes."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_resumes_db
from app.models import Resume
from app.schemas import ResumeCreate, ResumeUpdate, Resume as ResumeSchema, TemplateApplyRequest, TemplateApplyResponse
from app.services.pdf_to_latex import convert_pdf_to_latex, save_latex_to_resume
from app.services.template_engine import blend_resume_with_template, generate_random_suffix, get_available_templates

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


# ============ Collection routes (no {resume_id}) ============

@router.get("", response_model=List[ResumeSchema])
def get_resumes(db: Session = Depends(get_resumes_db)):
    """Get all resumes."""
    return db.query(Resume).order_by(Resume.created_at.desc()).all()


@router.post("", response_model=ResumeSchema, status_code=201)
def create_resume(resume: ResumeCreate, db: Session = Depends(get_resumes_db)):
    """Create a new resume."""
    resume_data = resume.model_dump()
    
    # If setting as master, ensure no other resume is master
    if resume_data.get('is_master', False):
        existing_master = db.query(Resume).filter(Resume.is_master == True).first()
        if existing_master:
            existing_master.is_master = False
    
    db_resume = Resume(**resume_data)
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume


@router.post("/upload", response_model=ResumeSchema, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    is_master: bool = Form(False),
    db: Session = Depends(get_resumes_db)
):
    """Upload resume file (PDF or DOCX) for inline viewing and LaTeX conversion."""
    valid_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/x-tex",
        "application/x-latex",
        "text/x-tex",
        "text/plain"
    ]
    
    if file.content_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Supported types: PDF, DOCX, TEX. Got: {file.content_type}"
        )
    
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    minimal_content = {
        "name": "",
        "email": "",
        "phone": "",
        "summary": "",
        "experience": [],
        "skills": [],
        "education": {}
    }
    
    resume_name = name or file.filename.replace(".pdf", "").replace(".docx", "").replace(".doc", "") if file.filename else "Uploaded Resume"
    
    # If setting as master, ensure no other resume is master
    if is_master:
        existing_master = db.query(Resume).filter(Resume.is_master == True).first()
        if existing_master:
            existing_master.is_master = False
    
    db_resume = Resume(
        name=resume_name,
        is_master=is_master,
        content=minimal_content,
        file_data=file_content,
        file_type=file.content_type,
        version_history=[{
            "timestamp": datetime.now().isoformat(),
            "content": {"summary": f"File uploaded: {file.filename}"}
        }]
    )
    
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    
    # Convert PDF to LaTeX if it's a PDF file
    if file.content_type == "application/pdf" and file_content:
        try:
            latex_content = convert_pdf_to_latex(file_content)
            if latex_content:
                save_latex_to_resume(db_resume, latex_content, db)
        except Exception as e:
            print(f"Failed to convert PDF to LaTeX: {e}")
    
    return db_resume


# ============ Specific sub-routes (must come BEFORE generic {resume_id}) ============

@router.get("/{resume_id}/file")
def get_resume_file(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Get the original PDF/DOCX file for a resume."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.file_data:
        raise HTTPException(status_code=404, detail="No file attached to this resume")
    
    content_type = resume.file_type or "application/pdf"
    filename = f"{resume.name}.pdf" if "pdf" in content_type else f"{resume.name}.docx"
    
    return Response(
        content=resume.file_data,
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )


@router.patch("/{resume_id}/file")
def update_resume_file(
    resume_id: int,
    latex_content: str = Form(...),
    db: Session = Depends(get_resumes_db)
):
    """Update the resume file with generated LaTeX content."""
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    latex_bytes = latex_content.encode('utf-8')
    db_resume.file_data = latex_bytes
    db_resume.latex_content = latex_content
    
    if not (db_resume.file_type and 'tex' in db_resume.file_type.lower()):
        db_resume.file_type = 'application/x-tex'
    
    db_resume.updated_at = datetime.now()
    db.commit()
    
    return {"message": "Resume file updated successfully", "file_type": db_resume.file_type}


@router.patch("/{resume_id}/set-master", response_model=ResumeSchema)
def set_master_resume(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Set a resume as the master resume. Unsets any other master resume."""
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Unset any existing master resume
    existing_master = db.query(Resume).filter(Resume.is_master == True, Resume.id != resume_id).first()
    if existing_master:
        existing_master.is_master = False
    
    db_resume.is_master = True
    db_resume.updated_at = datetime.now()
    db.commit()
    db.refresh(db_resume)
    return db_resume


@router.patch("/{resume_id}/unset-master", response_model=ResumeSchema)
def unset_master_resume(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Unset a resume as the master resume."""
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    db_resume.is_master = False
    db_resume.updated_at = datetime.now()
    db.commit()
    db.refresh(db_resume)
    return db_resume


# ============ Generic {resume_id} routes (must come AFTER specific routes) ============

@router.get("/{resume_id}", response_model=ResumeSchema)
def get_resume(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Get a single resume by ID."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.patch("/{resume_id}", response_model=ResumeSchema)
def update_resume(
    resume_id: int,
    resume_update: ResumeUpdate,
    db: Session = Depends(get_resumes_db)
):
    """Update a resume."""
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if db_resume.content:
        db_resume.version_history.append({
            "timestamp": datetime.now().isoformat(),
            "content": db_resume.content
        })

    update_data = resume_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_resume, field, value)

    db_resume.updated_at = datetime.now()
    db.commit()
    db.refresh(db_resume)
    return db_resume


@router.delete("/{resume_id}", status_code=204)
def delete_resume(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Delete a resume."""
    db_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    db.delete(db_resume)
    db.commit()
    return None


@router.get("/{resume_id}/latex")
def get_resume_latex(resume_id: int, db: Session = Depends(get_resumes_db)):
    """Get the LaTeX content for a resume as a downloadable .tex file."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.latex_content:
        raise HTTPException(status_code=404, detail="No LaTeX content available for this resume")
    
    filename = f"{resume.name}.tex"
    
    return Response(
        content=resume.latex_content,
        media_type="application/x-tex",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/templates/list")
def list_templates():
    """Get list of available templates."""
    templates = get_available_templates()
    return {"templates": templates}


@router.get("/templates/{template_id}/preview")
def get_template_preview(template_id: str):
    """Get PDF preview for a template from static PDF file."""
    from app.services.template_preview import get_template_preview_pdf, get_template_dir_path
    
    # Debug: check if directory exists
    template_dir = get_template_dir_path(template_id)
    if template_dir:
        pdf_files = list(template_dir.glob("*.pdf"))
        print(f"Debug: Looking for PDFs in {template_dir}")
        print(f"Debug: Found PDF files: {[f.name for f in pdf_files]}")
    
    pdf_bytes = get_template_preview_pdf(template_id)
    if not pdf_bytes:
        raise HTTPException(
            status_code=404,
            detail=f"Preview not available for template {template_id}. Please add {template_id}.pdf or preview.pdf to assets/resumes/resumes/{template_id}/"
        )
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{template_id}_preview.pdf"'}
    )


@router.post("/{resume_id}/apply-template", response_model=TemplateApplyResponse)
def apply_template(
    resume_id: int,
    request: TemplateApplyRequest,
    db: Session = Depends(get_resumes_db)
):
    """
    Apply a template to an existing resume to create a visually upgraded version.
    
    This uses AI to intelligently blend the resume content with the chosen template,
    preserving all details while upgrading the visual format.
    """
    # Get the original resume
    original_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not original_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Check if original resume has LaTeX content
    if not original_resume.latex_content:
        raise HTTPException(
            status_code=400,
            detail="Original resume does not have LaTeX content. Please upload a PDF first to generate LaTeX."
        )
    
    # Validate template ID
    available_templates = get_available_templates()
    if request.template_id not in available_templates:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid template ID. Available templates: {list(available_templates.keys())}"
        )
    
    try:
        # Use AI to blend the resume with the template
        blended_latex = blend_resume_with_template(
            existing_latex=original_resume.latex_content,
            template_id=request.template_id,
            original_name=original_resume.name
        )
        
        if not blended_latex:
            raise HTTPException(
                status_code=500,
                detail="Failed to blend resume with template. Please try again."
            )
        
        # Compile the blended LaTeX to PDF
        from app.services.latex_to_pdf import compile_latex_to_pdf
        from app.services.template_preview import get_template_dir_path
        
        # #region agent log
        import json
        log_data = {"location": "resumes.py:201", "message": "Starting PDF compilation", "data": {"template_id": request.template_id, "latex_length": len(blended_latex)}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "B"}
        with open(r"c:\Users\anony\Desktop\Others\Studies\Confidential\Software Engineer\CMPUT401CibeVoders\.cursor\debug.log", "a") as f:
            f.write(json.dumps(log_data) + "\n")
        # #endregion
        
        template_dir = get_template_dir_path(request.template_id)
        pdf_bytes = compile_latex_to_pdf(blended_latex, template_dir)
        
        # #region agent log
        log_data = {"location": "resumes.py:207", "message": "PDF compilation result", "data": {"pdf_bytes_size": len(pdf_bytes) if pdf_bytes else 0, "compilation_success": pdf_bytes is not None}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "B"}
        with open(r"c:\Users\anony\Desktop\Others\Studies\Confidential\Software Engineer\CMPUT401CibeVoders\.cursor\debug.log", "a") as f:
            f.write(json.dumps(log_data) + "\n")
        # #endregion
        
        if not pdf_bytes:
            # If PDF compilation fails, still save the LaTeX (user can compile manually)
            print(f"Warning: Failed to compile blended LaTeX to PDF for template {request.template_id}")
            pdf_bytes = None
        
        # Generate a new name: original name + 3 random letters
        random_suffix = generate_random_suffix(3)
        new_name = f"{original_resume.name}-{random_suffix}"
        
        # Create a new resume record with both blended LaTeX AND PDF
        # Copy the minimal content structure from original
        new_resume = Resume(
            name=new_name,
            is_master=False,  # Don't make template-applied resumes master by default
            master_resume_id=original_resume.id,  # Link to original
            content=original_resume.content,  # Copy JSON content structure
            latex_content=blended_latex,  # Store the blended LaTeX
            file_data=pdf_bytes,  # Store the compiled PDF
            file_type="application/pdf" if pdf_bytes else None,  # Set file type if PDF exists
            version_history=[{
                "timestamp": datetime.now().isoformat(),
                "content": {
                    "summary": f"Template applied: {request.template_id}",
                    "original_resume_id": original_resume.id,
                    "template_id": request.template_id
                }
            }]
        )
        
        db.add(new_resume)
        db.commit()
        db.refresh(new_resume)
        
        # #region agent log
        log_data = {"location": "resumes.py:238", "message": "New resume saved to DB", "data": {"new_resume_id": new_resume.id, "new_resume_name": new_resume.name, "has_file_data": new_resume.file_data is not None, "file_type": new_resume.file_type, "file_data_size": len(new_resume.file_data) if new_resume.file_data else 0}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "B"}
        with open(r"c:\Users\anony\Desktop\Others\Studies\Confidential\Software Engineer\CMPUT401CibeVoders\.cursor\debug.log", "a") as f:
            f.write(json.dumps(log_data) + "\n")
        # #endregion
        
        return TemplateApplyResponse(
            success=True,
            message=f"Successfully applied template {request.template_id}" + (" and compiled to PDF" if pdf_bytes else " (PDF compilation pending)"),
            new_resume_id=new_resume.id,
            new_resume=new_resume
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error applying template: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply template: {str(e)}"
        )
