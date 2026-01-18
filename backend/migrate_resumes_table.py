"""Migration script to add missing latex_content column to resumes table."""
import sqlite3
from pathlib import Path
from app.database import RESUMES_DATABASE_URL

# Get database path
db_path = RESUMES_DATABASE_URL.replace('sqlite:///', '')
print(f"Database location: {db_path}")
print(f"Database exists: {Path(db_path).exists()}")
print()

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Get current table schema
    cursor.execute("PRAGMA table_info(resumes)")
    columns = cursor.fetchall()
    existing_columns = [col[1] for col in columns]
    
    print("Current columns in resumes table:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
    print()
    
    # Column that should exist based on the model
    required_columns = {
        'latex_content': 'TEXT'
    }
    
    # Add missing columns
    added_columns = []
    for col_name, col_type in required_columns.items():
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE resumes ADD COLUMN {col_name} {col_type}")
                added_columns.append(col_name)
                print(f"✓ Added column: {col_name} ({col_type})")
            except sqlite3.OperationalError as e:
                print(f"✗ Failed to add column {col_name}: {e}")
        else:
            print(f"○ Column {col_name} already exists")
    
    # Commit changes
    if added_columns:
        conn.commit()
        print(f"\n✓ Successfully added {len(added_columns)} column(s)")
    else:
        print("\n○ No columns needed to be added")
    
    # Verify final schema
    print("\nFinal table schema:")
    cursor.execute("PRAGMA table_info(resumes)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
    
except Exception as e:
    conn.rollback()
    print(f"\n✗ Error during migration: {e}")
    import traceback
    traceback.print_exc()
finally:
    conn.close()

print("\n✓ Migration completed!")
