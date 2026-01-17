"""Demo data seeding service."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import Application, Communication, Reminder


def seed_demo_data(db: Session):
    """Seed database with demo data for applications, communications, and reminders.
    
    Note: Resumes are now in a separate database (resumes.db) and should be uploaded via the UI.
    """
    # Check if data already exists
    if db.query(Application).count() > 0:
        return  # Already seeded

    # Sample companies and roles
    demo_applications = [
        {
            "company_name": "Google",
            "role_title": "Senior Software Engineer",
            "date_applied": datetime.now() - timedelta(days=5),
            "status": "Interview",
            "source": "LinkedIn",
            "location": "Mountain View, CA",
            "duration": "Full-time",
            "notes": "Initial phone screen went well. Technical interview scheduled for next week.",
        },
        {
            "company_name": "Microsoft",
            "role_title": "Full Stack Engineer",
            "date_applied": datetime.now() - timedelta(days=12),
            "status": "Applied",
            "source": "Company Site",
            "location": "Seattle, WA",
            "duration": "Full-time",
            "notes": "Applied through their careers page. Waiting for response.",
        },
        {
            "company_name": "Amazon",
            "role_title": "Software Development Engineer II",
            "date_applied": datetime.now() - timedelta(days=8),
            "status": "Interview",
            "source": "Referral",
            "location": "Seattle, WA",
            "duration": "Full-time",
            "notes": "Referral from former colleague. Phone interview completed.",
        },
        {
            "company_name": "Meta",
            "role_title": "Frontend Engineer",
            "date_applied": datetime.now() - timedelta(days=3),
            "status": "Applied",
            "source": "LinkedIn",
            "notes": None,
        },
        {
            "company_name": "Apple",
            "role_title": "iOS Developer",
            "date_applied": datetime.now() - timedelta(days=15),
            "status": "Rejected",
            "source": "Company Site",
            "notes": "Received rejection email. Position went to internal candidate.",
        },
        {
            "company_name": "Netflix",
            "role_title": "Backend Engineer",
            "date_applied": datetime.now() - timedelta(days=7),
            "status": "Offer",
            "source": "LinkedIn",
            "location": "Los Gatos, CA",
            "duration": "Full-time",
            "notes": "Received offer! $180k base + $50k signing bonus. Negotiating equity.",
        },
        {
            "company_name": "Stripe",
            "role_title": "Product Engineer",
            "date_applied": datetime.now() - timedelta(days=4),
            "status": "Interview",
            "source": "Referral",
            "notes": "Passed coding challenge. On-site interview scheduled.",
        },
        {
            "company_name": "Airbnb",
            "role_title": "Full Stack Engineer",
            "date_applied": datetime.now() - timedelta(days=10),
            "status": "Applied",
            "source": "LinkedIn",
            "notes": None,
        },
        {
            "company_name": "Uber",
            "role_title": "Senior Software Engineer",
            "date_applied": datetime.now() - timedelta(days=20),
            "status": "Rejected",
            "source": "Company Site",
            "notes": "Did not pass technical interview. Will reapply in 6 months.",
        },
        {
            "company_name": "Spotify",
            "role_title": "Backend Engineer",
            "date_applied": datetime.now() - timedelta(days=2),
            "status": "Applied",
            "source": "LinkedIn",
            "notes": "Just applied today. Excited about this role!",
        },
        {
            "company_name": "DataBricks",
            "role_title": "Data Scientist",
            "date_applied": datetime.now() - timedelta(days=6),
            "status": "Interview",
            "source": "LinkedIn",
            "location": "San Francisco, CA",
            "duration": "Full-time",
            "notes": "Machine learning position. Preparing for technical interview.",
        },
        {
            "company_name": "Netflix",
            "role_title": "Data Scientist - Recommendation Systems",
            "date_applied": datetime.now() - timedelta(days=4),
            "status": "Applied",
            "source": "Company Site",
            "location": "Los Gatos, CA",
            "duration": "Full-time",
            "notes": "Focused on recommendation systems and personalization.",
        },
        {
            "company_name": "Shopify",
            "role_title": "Full Stack Developer",
            "date_applied": datetime.now() - timedelta(days=9),
            "status": "Interview",
            "source": "Referral",
            "location": "Ottawa, ON",
            "duration": "Full-time",
            "notes": "Referred by friend. Technical interview scheduled.",
        },
        {
            "company_name": "AWS",
            "role_title": "DevOps Engineer",
            "date_applied": datetime.now() - timedelta(days=7),
            "status": "Applied",
            "source": "LinkedIn",
            "location": "Seattle, WA",
            "duration": "Full-time",
            "notes": "Cloud infrastructure role. Waiting for response.",
        },
        {
            "company_name": "GitHub",
            "role_title": "Senior DevOps Engineer",
            "date_applied": datetime.now() - timedelta(days=3),
            "status": "Interview",
            "source": "Company Site",
            "location": "San Francisco, CA",
            "duration": "Full-time",
            "notes": "Kubernetes and infrastructure automation focus.",
        }
    ]

    applications = []
    for app_data in demo_applications:
        app = Application(**app_data)
        db.add(app)
        applications.append(app)

    db.flush()

    # Add communications for some applications
    comm1 = Communication(
        application_id=applications[0].id,  # Google
        type="Interview Invite",
        message="Technical interview scheduled for next Tuesday at 2 PM PST",
        timestamp=datetime.now() - timedelta(days=3)
    )
    db.add(comm1)

    comm2 = Communication(
        application_id=applications[2].id,  # Amazon
        type="Interview Invite",
        message="Phone screen completed successfully. Moving to next round.",
        timestamp=datetime.now() - timedelta(days=6)
    )
    db.add(comm2)

    comm3 = Communication(
        application_id=applications[5].id,  # Netflix
        type="Offer",
        message="Congratulations! We're excited to extend an offer. Please review the details.",
        timestamp=datetime.now() - timedelta(days=2)
    )
    db.add(comm3)

    comm4 = Communication(
        application_id=applications[4].id,  # Apple
        type="Rejection",
        message="Thank you for your interest. We've decided to proceed with other candidates.",
        timestamp=datetime.now() - timedelta(days=10)
    )
    db.add(comm4)

    # Add reminders
    reminder1 = Reminder(
        application_id=applications[0].id,  # Google
        type="Interview Prep",
        message="Prepare for technical interview - review system design concepts",
        due_date=datetime.now() + timedelta(days=1)
    )
    db.add(reminder1)

    reminder2 = Reminder(
        application_id=applications[1].id,  # Microsoft
        type="Follow-up",
        message="Follow up on application status",
        due_date=datetime.now() + timedelta(days=3)
    )
    db.add(reminder2)

    db.commit()
