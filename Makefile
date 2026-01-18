.PHONY: help install install-backend install-frontend run run-backend run-frontend clean clean-backend clean-frontend setup dev

# Default target
help:
	@echo "Jobvibe - Job Application Management Platform"
	@echo ""
	@echo "Available targets:"
	@echo "  make setup          - Set up both backend and frontend (first time setup)"
	@echo "  make install        - Install dependencies for both backend and frontend"
	@echo "  make install-backend - Install Python backend dependencies"
	@echo "  make install-frontend - Install Node.js frontend dependencies"
	@echo "  make dev            - Run both backend and frontend in parallel (Ctrl+C to stop)"
	@echo "  make run            - Run both backend and frontend (alias for dev)"
	@echo "  make run-backend    - Run only the backend server (http://localhost:8000)"
	@echo "  make run-frontend   - Run only the frontend dev server (http://localhost:5173)"
	@echo "  make clean          - Clean build artifacts and dependencies"
	@echo "  make clean-backend  - Clean backend virtual environment and cache"
	@echo "  make clean-frontend - Clean frontend node_modules and build files"
	@echo ""
	@echo "Note: Backend requires OPENAI_API_KEY in backend/.env file"

# Setup everything for first time
setup: install-backend install-frontend
	@echo ""
	@echo "✅ Setup complete!"
	@echo ""
	@echo "⚠️  Don't forget to set up your OpenAI API key:"
	@echo "   Create backend/.env and add: OPENAI_API_KEY=sk-your-key-here"
	@echo ""
	@echo "Run 'make dev' to start both servers"

# Install all dependencies
install: install-backend install-frontend

# Backend setup and installation
install-backend:
	@echo "Setting up backend..."
	@cd backend && \
	if [ ! -d "venv" ]; then \
		echo "Creating Python virtual environment..."; \
		python3 -m venv venv; \
	fi
	@cd backend && \
	. venv/bin/activate && \
	pip install --upgrade pip && \
	pip install -r requirements.txt
	@echo "✅ Backend dependencies installed"

# Frontend setup and installation
install-frontend:
	@echo "Setting up frontend..."
	@cd frontend && npm install
	@echo "✅ Frontend dependencies installed"

# Run both backend and frontend (development mode)
# Note: Runs both servers in background. Use Ctrl+C to stop.
# For better control, run each server in separate terminals:
#   Terminal 1: make run-backend
#   Terminal 2: make run-frontend
dev:
	@echo "Starting both backend and frontend servers..."
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:5173"
	@echo ""
	@echo "Press Ctrl+C to stop both servers"
	@trap 'kill 0' EXIT; \
	cd backend && . venv/bin/activate && uvicorn app.main:app --reload & \
	cd frontend && npm run dev & \
	wait

# Alias for dev
run: dev

# Run backend server only
run-backend:
	@echo "Starting backend server on http://localhost:8000..."
	@cd backend && \
	. venv/bin/activate && \
	uvicorn app.main:app --reload

# Run frontend dev server only
run-frontend:
	@echo "Starting frontend dev server..."
	@cd frontend && npm run dev

# Clean everything
clean: clean-backend clean-frontend

# Clean backend
clean-backend:
	@echo "Cleaning backend..."
	@cd backend && \
	find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true && \
	find . -type f -name "*.pyc" -delete 2>/dev/null || true && \
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	@echo "✅ Backend cleaned (venv kept - use 'rm -rf backend/venv' to remove it)"

# Clean frontend
clean-frontend:
	@echo "Cleaning frontend..."
	@cd frontend && rm -rf node_modules dist .vite 2>/dev/null || true
	@echo "✅ Frontend cleaned"
