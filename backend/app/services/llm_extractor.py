"""LLM-based job information extraction using OpenAI."""
import json
import os
from typing import Optional
from app.schemas import AutofillParseResponse

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, will use system env vars

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


def extract_with_llm(text: str) -> Optional[AutofillParseResponse]:
    """
    Extract job information using OpenAI API with structured output.
    Returns None if API key not available or extraction fails.
    """
    if not OPENAI_AVAILABLE:
        print("OpenAI library not installed. Run: pip install openai")
        return None
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY not found in environment. Please set it in .env file.")
        return None
    
    try:
        client = OpenAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Fast and cheap
            messages=[
                {
                    "role": "system",
                    "content": "You are a job information extraction assistant. Extract structured information from job postings."
                },
                {
                    "role": "user",
                    "content": f"""Extract job information from this text. Return a JSON object with exactly these fields:
{{
  "company_name": "RBC" or company name (acronyms like RBC, IBM stay uppercase),
  "role_title": "2026 Summer Student Opportunities - Software Developer" or job title,
  "location": "Toronto, ON" or location (format: "City, Province/State"),
  "duration": "12 months" or "Full-time" or duration
}}

Rules:
- Extract company names accurately (RBC not "LinkedIn", Google not "Google Inc")
- For location, use format "City, Province/State" (e.g., "Toronto, ON", "New York, NY")
- For duration, capture things like "12 months", "4 months", "Full-time", "Part-time"
- If a field is not found, set it to null (not "None" as string)

Text to parse:
{text}"""
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Handle null values from JSON
        def safe_get(key: str, default: str) -> str:
            value = result.get(key)
            return default if not value or value == "null" else value
        
        company_name = safe_get("company_name", "Unknown Company")
        role_title = safe_get("role_title", "Software Engineer")
        location = result.get("location")
        duration = result.get("duration")
        
        # Convert "null" strings or empty strings to None
        location = None if (location == "null" or location == "") else location
        duration = None if (duration == "null" or duration == "") else duration
        
        return AutofillParseResponse(
            company_name=company_name,
            role_title=role_title,
            location=location,
            duration=duration,
            success=True,
            message="Successfully extracted using LLM"
        )
    except Exception as e:
        print(f"LLM extraction failed: {e}")
        return None

