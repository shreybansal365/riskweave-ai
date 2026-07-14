.PHONY: setup backend-install frontend-install format format-check lint typecheck test test-e2e test-e2e-chromium test-e2e-headed test-e2e-visual audit check build migrate migration-check seed-users seed-data reset-data scenario benchmark docker-up docker-down docker-logs

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
	cd backend && ../$(BACKEND_VENV)/bin/mypy app risk_engine tests
	cd frontend && npm run typecheck

test:
	cd backend && ../$(BACKEND_VENV)/bin/pytest
	cd frontend && npm run test

test-e2e:
	cd frontend && npm run test:e2e

test-e2e-chromium:
	cd frontend && npm run test:e2e:chromium

test-e2e-headed:
	cd frontend && npm run test:e2e:headed

test-e2e-visual:
	cd frontend && npm run test:e2e:visual

audit:
	cd backend && ../$(BACKEND_VENV)/bin/pip-audit --cache-dir .cache/pip-audit --requirement requirements.txt --disable-pip
	cd frontend && npm audit --audit-level=high

check: format-check lint typecheck test

build:
	cd frontend && npm run build

migrate:
	cd backend && ../$(BACKEND_VENV)/bin/alembic upgrade head

migration-check:
	cd backend && ../$(BACKEND_VENV)/bin/alembic check

seed-users:
	cd backend && ../$(BACKEND_VENV)/bin/python -m app.cli.seed_demo_users

seed-data:
	cd backend && ../$(BACKEND_VENV)/bin/python -m app.cli.seed_demo_data

reset-data:
	cd backend && ../$(BACKEND_VENV)/bin/python -m app.cli.reset_demo_data

scenario:
	cd backend && ../$(BACKEND_VENV)/bin/python -m app.cli.run_scenario $(SCENARIO)

benchmark:
	cd backend && ../$(BACKEND_VENV)/bin/python -m app.cli.run_benchmark

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs --tail=100
