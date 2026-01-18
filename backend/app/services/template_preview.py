"""Get static PDF previews for templates."""
from pathlib import Path
from typing import Optional

# Template registry - maps to template directories
TEMPLATE_DIRS = {
    "template-1": "assets/resumes/resumes/template-1",
    "template-2": "assets/resumes/resumes/template-2",
    "template-3": "assets/resumes/resumes/template-3",
}


def get_template_dir_path(template_id: str) -> Optional[Path]:
    """Get the template directory path."""
    if template_id not in TEMPLATE_DIRS:
        return None
    
    template_dir_path = Path(TEMPLATE_DIRS[template_id])
    
    # Get backend directory (similar to database.py pattern)
    backend_dir = Path(__file__).parent.parent.parent.absolute()
    project_root = backend_dir.parent
    
    # Try multiple path resolution strategies
    possible_paths = [
        # From project root (most common)
        project_root / template_dir_path,
        # From backend directory
        backend_dir / template_dir_path,
        # From current working directory (in case server runs from project root)
        Path.cwd() / template_dir_path,
        # Absolute path from project root
        project_root.absolute() / template_dir_path,
    ]
    
    for path in possible_paths:
        if path.exists() and path.is_dir():
            print(f"Found template directory for {template_id}: {path}")
            return path
    
    print(f"Template directory not found for {template_id}. Tried:")
    for path in possible_paths:
        print(f"  - {path} (exists: {path.exists()})")
    
    return None


def get_template_preview_pdf(template_id: str) -> Optional[bytes]:
    """
    Get PDF preview bytes from static PDF file in template directory.
    Looks for {template_id}.pdf (e.g., template-1.pdf) or preview.pdf.
    
    Returns:
        PDF bytes if PDF file exists, None otherwise
    """
    template_dir = get_template_dir_path(template_id)
    if not template_dir:
        print(f"Template directory not found for {template_id}")
        return None
    
    # Try {template_id}.pdf first (e.g., template-1.pdf)
    preview_path = template_dir / f"{template_id}.pdf"
    if preview_path.exists():
        try:
            print(f"Found preview PDF: {preview_path}")
            with open(preview_path, 'rb') as f:
                return f.read()
        except Exception as e:
            print(f"Error reading preview PDF {preview_path}: {e}")
    
    # Fallback to preview.pdf
    preview_path = template_dir / "preview.pdf"
    if preview_path.exists():
        try:
            print(f"Found preview PDF (fallback): {preview_path}")
            with open(preview_path, 'rb') as f:
                return f.read()
        except Exception as e:
            print(f"Error reading preview PDF {preview_path}: {e}")
    
    print(f"No preview PDF found for {template_id} in {template_dir}")
    # Debug: list files in directory
    if template_dir.exists():
        files = list(template_dir.glob("*.pdf"))
        print(f"PDF files found in {template_dir}: {[f.name for f in files]}")
    
    return None
