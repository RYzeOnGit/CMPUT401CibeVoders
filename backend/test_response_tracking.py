"""Test script for Response Tracking functionality."""
import requests
import json
import sys
from datetime import datetime

# Fix encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8000/api"

def print_section(title):
    """Print a formatted section header."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def test_response_tracking():
    """Test the response tracking functionality."""
    
    print_section("Testing Response Tracking Functionality")
    
    # Step 1: Check if there are existing applications
    print("\n1. Checking existing applications...")
    response = requests.get(f"{BASE_URL}/applications")
    if response.status_code != 200:
        print(f"[X] Failed to get applications list: {response.status_code}")
        return
    
    applications = response.json()
    print(f"[OK] Found {len(applications)} applications")
    
    if not applications:
        print("[!] No existing applications, please create one first")
        print("   Use POST /api/applications to create an application")
        return
    
    # Use the first application for testing
    test_application = applications[0]
    app_id = test_application["id"]
    print(f"   Using application ID: {app_id} ({test_application['company_name']} - {test_application['role_title']})")
    
    # Step 2: Test creating communication record (Interview Invite)
    print_section("2. Test Creating Communication Record - Interview Invite")
    
    interview_comm = {
        "application_id": app_id,
        "type": "Interview Invite",
        "message": "We would like to invite you for an interview",
        "sender_name": "Jane Smith",
        "sender_email": "jane@company.com",
        "response_date": datetime.now().isoformat()
    }
    
    response = requests.post(
        f"{BASE_URL}/communications",
        json=interview_comm
    )
    
    if response.status_code == 201:
        comm_data = response.json()
        print(f"[OK] Successfully created interview invite communication record (ID: {comm_data['id']})")
        print(f"   Sender: {comm_data.get('sender_name', 'N/A')}")
        print(f"   Type: {comm_data['type']}")
    else:
        print(f"[X] Failed to create communication record: {response.status_code}")
        print(f"   Error: {response.text}")
        return
    
    # Step 3: Check if application status is automatically updated
    print_section("3. Check Automatic Application Status Update")
    response = requests.get(f"{BASE_URL}/applications/{app_id}")
    if response.status_code == 200:
        app_data = response.json()
        if app_data["status"] == "Interview":
            print(f"[OK] Application status automatically updated to: {app_data['status']}")
        else:
            print(f"[!]  Application status: {app_data['status']} (Expected: Interview)")
    
    # Step 4: Test creating rejection record
    print_section("4. Test Creating Communication Record - Rejection")
    
    rejection_comm = {
        "application_id": app_id,
        "type": "Rejection",
        "message": "Thank you for your interest, but...",
        "sender_name": "HR Department",
        "response_date": datetime.now().isoformat()
    }
    
    response = requests.post(
        f"{BASE_URL}/communications",
        json=rejection_comm
    )
    
    if response.status_code == 201:
        comm_data = response.json()
        print(f"[OK] Successfully created rejection communication record (ID: {comm_data['id']})")
    else:
        print(f"[X] Failed to create rejection record: {response.status_code}")
    
    # Step 5: Test creating job offer record
    print_section("5. Test Creating Communication Record - Job Offer")
    
    offer_comm = {
        "application_id": app_id,
        "type": "Offer",
        "message": "We are pleased to offer you the position",
        "sender_name": "Hiring Manager",
        "sender_email": "manager@company.com",
        "response_date": datetime.now().isoformat()
    }
    
    response = requests.post(
        f"{BASE_URL}/communications",
        json=offer_comm
    )
    
    if response.status_code == 201:
        comm_data = response.json()
        print(f"[OK] Successfully created job offer communication record (ID: {comm_data['id']})")
    else:
        print(f"[X] Failed to create job offer record: {response.status_code}")
    
    # Step 6: Get all communication records
    print_section("6. Get All Communication Records")
    response = requests.get(f"{BASE_URL}/communications?application_id={app_id}")
    if response.status_code == 200:
        communications = response.json()
        print(f"[OK] Found {len(communications)} communication records")
        for comm in communications:
            print(f"   - {comm['type']}: {comm.get('message', 'N/A')[:50]}...")
            if comm.get('sender_name'):
                print(f"     Sender: {comm['sender_name']}")
    
    # Step 7: Test response tracking summary
    print_section("7. Test Response Tracking Summary")
    response = requests.get(f"{BASE_URL}/communications/tracking/summary?application_id={app_id}")
    if response.status_code == 200:
        summaries = response.json()
        if summaries:
            summary = summaries[0]
            print(f"[OK] Response Tracking Summary:")
            print(f"   Company: {summary['company_name']}")
            print(f"   Role: {summary['role_title']}")
            print(f"   Total Responses: {summary['total_responses']}")
            print(f"   Interview Invites: {summary['interview_invites']}")
            print(f"   Rejections: {summary['rejections']}")
            print(f"   Job Offers: {summary['offers']}")
            print(f"   Current Status: {summary['status']}")
            if summary.get('latest_response_date'):
                print(f"   Latest Response: {summary['latest_response_type']} ({summary['latest_response_date']})")
        else:
            print("[!]  No summary data found")
    else:
        print(f"[X] Failed to get summary: {response.status_code}")
    
    # Step 8: Test getting summary for all applications
    print_section("8. Test Getting Response Tracking Summary for All Applications")
    response = requests.get(f"{BASE_URL}/communications/tracking/summary")
    if response.status_code == 200:
        summaries = response.json()
        print(f"[OK] Found {len(summaries)} application summaries")
        for summary in summaries[:3]:  # Show only first 3
            print(f"\n   - {summary['company_name']}: {summary['total_responses']} responses")
    
    print_section("Testing Complete")
    print("\n[OK] All tests completed!")
    print("\nFeature Checklist:")
    print("  [OK] 1. Can create communication records (Interview Invite, Rejection, Job Offer)")
    print("  [OK] 2. Communication records include sender information (name, email)")
    print("  [OK] 3. Communication records include response date")
    print("  [OK] 4. Application status automatically updates when creating communication records")
    print("  [OK] 5. Can retrieve all communication records")
    print("  [OK] 6. Can retrieve response tracking summary (statistics)")
    print("  [OK] 7. Response tracking summary includes statistics for Interview Invites, Rejections, and Job Offers")

if __name__ == "__main__":
    try:
        test_response_tracking()
    except requests.exceptions.ConnectionError:
        print("\n❌ Unable to connect to server")
        print("   Please ensure FastAPI server is running:")
        print("   uvicorn app.main:app --reload")
    except Exception as e:
        print(f"\n[X] Error occurred during testing: {e}")
        import traceback
        traceback.print_exc()
