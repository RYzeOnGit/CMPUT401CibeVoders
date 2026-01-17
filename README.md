# Jobvibe - Job Application Management Platform

A hackathon-winning job application management platform that helps users track applications, manage resumes, and auto-capture applications via an autofill browser flow.

## 🏗️ Architecture

```
CMPUT401CibeVoders/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── models.py      # SQLAlchemy models
│   │   ├── database.py    # Database setup
│   │   ├── schemas.py     # Pydantic schemas
│   │   ├── api/           # API routes
│   │   └── services/      # Business logic
│   └── requirements.txt
├── frontend/         # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React Context/Zustand
│   │   ├── api/           # API client
│   │   └── types/         # TypeScript types
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend will run on `http://localhost:8000` and seed demo data automatically on first startup.

**Required: Set up OpenAI API key for autofill parsing**
```bash
# Edit backend/.env and add your OpenAI API key
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-key-here
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🧩 Features

- ✅ Application tracking with CRUD operations
- ✅ Excel-like table with inline editing & drag-and-drop
- ✅ Kanban pipeline view
- ✅ Master resume management with derived versions
- ✅ Communication tracking & timeline
- ✅ Notifications & follow-up reminders
- ✅ ✨ Simplify-style autofill application capture
  - **LLM-powered extraction**: Uses OpenAI API for accurate parsing of company, role, location, and duration

## 🎨 Tech Stack

- **Frontend**: React + Vite + TypeScript + TailwindCSS + TanStack Table + dnd-kit
- **Backend**: FastAPI (Python)
- **Database**: SQLite (swappable to Postgres)
