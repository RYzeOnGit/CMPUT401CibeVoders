"""Test OpenAI LaTeX generation directly."""
import os
from app.database import ResumesSessionLocal
from app.models import Resume
from sqlalchemy import desc
from openai import OpenAI

# Load environment
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("ERROR: OPENAI_API_KEY not found")
    exit(1)

print(f"OpenAI API Key: {api_key[:15]}...")
print()

# Get the latest resume
db = ResumesSessionLocal()
try:
    resume = db.query(Resume).order_by(desc(Resume.created_at)).first()
    if not resume or not resume.file_data:
        print("No PDF resume found")
        exit(1)
    
    print(f"Testing with resume: {resume.name}")
    print(f"PDF size: {len(resume.file_data)} bytes")
    print()
    
    client = OpenAI(api_key=api_key)
    
    # Step 1: Upload file
    print("Step 1: Uploading PDF to OpenAI...")
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        tmp_file.write(resume.file_data)
        tmp_file_path = tmp_file.name
    
    try:
        with open(tmp_file_path, 'rb') as f:
            uploaded_file = client.files.create(file=f, purpose='assistants')
        print(f"[OK] File uploaded. File ID: {uploaded_file.id}")
        print()
        
        # Step 2: Create assistant
        print("Step 2: Creating assistant...")
        assistant = client.beta.assistants.create(
            name="PDF to LaTeX Test",
            instructions="""Convert the PDF resume to clean, compilable LaTeX code.
Output ONLY LaTeX code starting with \\documentclass and ending with \\end{document}.""",
            model="gpt-4o",
            tools=[{"type": "code_interpreter"}]
        )
        print(f"[OK] Assistant created. Assistant ID: {assistant.id}")
        print()
        
        # Step 3: Create thread and message
        print("Step 3: Creating thread and adding message with file...")
        thread = client.beta.threads.create()
        print(f"[OK] Thread created. Thread ID: {thread.id}")
        
        # Try different attachment methods
        print("\nTrying to attach file to message...")
        try:
            message = client.beta.threads.messages.create(
                thread_id=thread.id,
                role="user",
                content="Convert this PDF resume to LaTeX code.",
                attachments=[{
                    "file_id": uploaded_file.id,
                    "tools": [{"type": "code_interpreter"}]
                }]
            )
            print(f"[OK] Message created with attachment. Message ID: {message.id}")
        except Exception as e:
            print(f"[ERROR] Failed to create message with attachment: {e}")
            print("\nTrying alternative method...")
            # Alternative: create message first, then attach
            message = client.beta.threads.messages.create(
                thread_id=thread.id,
                role="user",
                content="Convert this PDF resume to LaTeX code."
            )
            print(f"[OK] Message created. Message ID: {message.id}")
            print("Note: File attachment may need different approach")
        
        print()
        
        # Step 4: Run assistant
        print("Step 4: Running assistant...")
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant.id
        )
        print(f"[OK] Run created. Run ID: {run.id}, Status: {run.status}")
        print()
        
        # Step 5: Wait for completion
        print("Step 5: Waiting for completion...")
        import time
        max_wait = 120
        start_time = time.time()
        
        while run.status in ['queued', 'in_progress']:
            elapsed = time.time() - start_time
            if elapsed > max_wait:
                print(f"[ERROR] Timeout after {max_wait} seconds")
                break
            print(f"  Status: {run.status} (elapsed: {int(elapsed)}s)", end='\r')
            time.sleep(2)
            run = client.beta.threads.runs.retrieve(
                thread_id=thread.id,
                run_id=run.id
            )
        print()
        
        if run.status == 'completed':
            print(f"[OK] Run completed!")
            print()
            
            # Step 6: Get response
            print("Step 6: Retrieving response...")
            messages = client.beta.threads.messages.list(thread_id=thread.id)
            if messages.data:
                latest_message = messages.data[0]
                print(f"[OK] Found {len(messages.data)} message(s)")
                print(f"  Role: {latest_message.role}")
                
                if latest_message.content:
                    content = latest_message.content[0]
                    if hasattr(content, 'text'):
                        latex_code = content.text.value
                        print(f"[OK] LaTeX code received!")
                        print(f"  Length: {len(latex_code)} characters")
                        print()
                        print("LaTeX Preview (first 500 chars):")
                        print("="*60)
                        print(latex_code[:500])
                        if len(latex_code) > 500:
                            print("...")
                        print("="*60)
                    else:
                        print(f"[ERROR] Unexpected content type: {type(content)}")
                        print(f"  Content: {content}")
                else:
                    print("[ERROR] No content in message")
            else:
                print("[ERROR] No messages found")
        else:
            print(f"[ERROR] Run failed with status: {run.status}")
            if hasattr(run, 'last_error'):
                print(f"  Error: {run.last_error}")
        
        # Cleanup
        print()
        print("Cleaning up...")
        try:
            client.beta.assistants.delete(assistant.id)
            print("[OK] Assistant deleted")
        except:
            pass
        try:
            client.files.delete(uploaded_file.id)
            print("[OK] File deleted")
        except:
            pass
            
    finally:
        try:
            os.unlink(tmp_file_path)
        except:
            pass
            
finally:
    db.close()
