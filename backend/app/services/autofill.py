"""Autofill parsing service - LLM-based extraction."""
import re
from typing import Optional
from app.schemas import AutofillParseResponse

# Import LLM extractor
try:
    from app.services.llm_extractor import extract_with_llm
    LLM_EXTRACTION_AVAILABLE = True
except ImportError:
    LLM_EXTRACTION_AVAILABLE = False
    extract_with_llm = None


def parse_job_url(url: str) -> Optional[AutofillParseResponse]:
    """Extract basic info from URL - works with LinkedIn, company job sites, etc."""
    if not url:
        return None

    company_name = None
    url_lower = url.lower()
    
    # Company job sites pattern: jobs.COMPANY.com or COMPANY.com/careers
    # Extract company from subdomain or domain
    jobs_domain_match = re.search(r'(?:jobs|careers)\.([^.]+)\.com', url_lower)
    if jobs_domain_match:
        domain_company = jobs_domain_match.group(1)
        # Convert to company name (rbc -> RBC, google -> Google)
        company_name = domain_company.upper() if len(domain_company) <= 5 else domain_company.replace('-', ' ').title()
    
    # LinkedIn company page pattern - extract company from /company/COMPANY_NAME/
    if not company_name and 'linkedin.com/company/' in url_lower:
        match = re.search(r'linkedin\.com/company/([^/?]+)', url_lower)
        if match:
            company_slug = match.group(1)
            company_name = company_slug.upper() if len(company_slug) <= 5 and '-' not in company_slug else company_slug.replace('-', ' ').title()
    
    # LinkedIn job posting - try to extract company from URL path
    if not company_name and 'linkedin.com/jobs/view/' in url_lower:
        match = re.search(r'linkedin\.com/jobs/view/.*?-at-(.*?)(?:-|$|\?)', url_lower)
        if match:
            company_name = match.group(1).replace('-', ' ').title()
    
    return AutofillParseResponse(
        company_name=company_name or "Unknown Company",
        role_title="Software Engineer",
        location=None,
        duration=None,
        success=True,
        message="Extracted company from URL"
    )


def parse_autofill(url: Optional[str] = None, text: Optional[str] = None) -> AutofillParseResponse:
    """
    Main parsing function - uses LLM extraction for accurate parsing.
    Falls back to basic URL parsing if LLM unavailable.
    """
    # Combine URL and text for LLM extraction
    combined_text = "\n".join(filter(None, [url, text])) if (url or text) else ""
    
    # Try LLM extraction first (primary method)
    if LLM_EXTRACTION_AVAILABLE and extract_with_llm and combined_text:
        llm_result = extract_with_llm(combined_text)
        if llm_result and llm_result.success:
            return llm_result
    
    # Fallback: Basic URL parsing if LLM not available
    if url:
        return parse_job_url(url) or AutofillParseResponse(
            company_name="Unknown Company",
            role_title="Software Engineer",
            location=None,
            duration=None,
            success=False,
            message="LLM extraction not available. Please set OPENAI_API_KEY in .env file."
        )
    
    # Complete fallback
    return AutofillParseResponse(
        company_name="Unknown Company",
        role_title="Software Engineer",
        location=None,
        duration=None,
        success=False,
        message="LLM extraction not available. Please set OPENAI_API_KEY in .env file."
    )
