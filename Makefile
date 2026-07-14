.PHONY: setup backend-install frontend-install format format-check lint typecheck test audit check build docker-up docker-down docker-logs

PYTHON ?= python3.12
BACKEND_VENV := backend/.venv

setup: backend-install frontend-install

backend-install:
	$(PYTHON) -m venv $(BACKEND_VENV)
	$(BACKEND_VENV)/bin/python -m pip install --upgrade pip
	$(BACKEND_VENV)/bin/python -m pip install --require-hashes --requirement backend/requirements-dev.txt

frontend-install:
	cd frontend && npm ci

format:
	$(BACKEND_VENV)/bin/ruff format backend
	$(BACKEND_VENV)/bin/ruff check --fix backend
	cd frontend && npm run format

format-check:
	$(BACKEND_VENV)/bin/ruff format --check backend
	cd frontend && npm run format:check

lint:
	$(BACKEND_VENV)/bin/ruff check backend
	cd frontend && npm run lint

typecheck:
	cd backend && ../$(BACKEND_VENV)/bin/mypy app tests
	cd frontend && npm run typecheck

test:
	cd backend && ../$(BACKEND_VENV)/bin/pytest
	cd frontend && npm run test

audit:
	cd backend && ../$(BACKEND_VENV)/bin/pip-audit --cache-dir .cache/pip-audit --requirement requirements.txt --disable-pip
	cd frontend && npm audit --audit-level=high

check: format-check lint typecheck test

build:
	cd frontend && npm run build

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs --tail=100
