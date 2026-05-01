VENV=venv
PYTHON=$(VENV)/bin/python
PIP=$(VENV)/bin/pip
UVICORN=$(VENV)/bin/uvicorn

.PHONY: venv install dev clean

venv:
	python3.11 -m venv $(VENV) 2>/dev/null || python3.11 -m virtualenv $(VENV)

install: venv
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

dev:
	$(UVICORN) app.main:app --reload --host 0.0.0.0 --port 8000

clean:
	rm -rf $(VENV) __pycache__ .pytest_cache solar_dev.db
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
