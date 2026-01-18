"""Verify LaTeX code location in the database."""
import sqlite3
from pathlib import Path
from app.database import RESUMES_DATABASE_URL
from app.models import Resume
from app.database import ResumesSessionLocal
from sqlalchemy import desc

# Get database path
db_path = RESUMES_DATABASE_URL.replace('sqlite:///', '')
print(f"Database location: {db_path}")
print(f"Database exists: {Path(db_path).exists()}")
print()

# Check using SQLAlchemy ORM
print("="*60)
print("Checking via SQLAlchemy ORM:")
print("="*60)
db = ResumesSessionLocal()
try:
    resume = db.query(Resume).order_by(desc(Resume.created_at)).first()
    if resume:
        print(f"Resume ID: {resume.id}")
        print(f"Resume Name: {resume.name}")
        print(f"Has latex_content field: {hasattr(resume, 'latex_content')}")
        print(f"latex_content is None: {resume.latex_content is None}")
        print(f"latex_content type: {type(resume.latex_content)}")
        
        if resume.latex_content:
            print(f"latex_content length: {len(resume.latex_content)} characters")
            print()
            print("LaTeX Content (first 500 chars):")
            print("-"*60)
            print(resume.latex_content[:500])
            print("-"*60)
        else:
            print("WARNING: latex_content is None or empty")
    else:
        print("No resume found")
finally:
    db.close()

print()
print("="*60)
print("Checking via direct SQLite query:")
print("="*60)

# Direct SQLite query
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get table schema
cursor.execute("PRAGMA table_info(resumes)")
columns = cursor.fetchall()
print("Table columns:")
for col in columns:
    print(f"  - {col[1]} ({col[2]}) - Nullable: {not col[3]}")
print()

# Query the data
cursor.execute("SELECT id, name, file_type, LENGTH(latex_content) as latex_length FROM resumes ORDER BY created_at DESC LIMIT 1")
row = cursor.fetchone()
if row:
    print(f"Latest Resume:")
    print(f"  ID: {row[0]}")
    print(f"  Name: {row[1]}")
    print(f"  File Type: {row[2]}")
    print(f"  LaTeX Content Length: {row[3]} characters")
    print()
    
    # Get full LaTeX content
    cursor.execute("SELECT latex_content FROM resumes WHERE id = ?", (row[0],))
    latex_row = cursor.fetchone()
    if latex_row and latex_row[0]:
        latex_content = latex_row[0]
        print(f"LaTeX Content Preview (first 500 chars):")
        print("-"*60)
        print(latex_content[:500])
        print("-"*60)
        print(f"Full LaTeX length: {len(latex_content)} characters")
    else:
        print("WARNING: latex_content is NULL in database")
else:
    print("No resume found in database")

conn.close()
