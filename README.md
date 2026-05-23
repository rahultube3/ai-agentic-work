# Skills Search

Type-ahead search over a folder of skill files. FastAPI backend indexes `skills/*/SKILL.md`, Angular frontend provides the type-ahead UI.

## Layout

```
ai-agentic-work/
├── skills/              # Skill files (SKILL.md with YAML frontmatter)
├── backend/             # FastAPI search API
│   ├── main.py          # Routes
│   ├── indexer.py       # Frontmatter parser + loader
│   ├── search.py        # Ranking
│   ├── models.py        # Pydantic models
│   └── tests/
├── frontend/            # Angular 17 standalone-component app
│   └── src/app/
├── requirements.txt     # pinned runtime deps
├── requirements-dev.txt # pinned dev deps
└── pyproject.toml
```

## Skill file format

Each skill lives at `skills/<slug>/SKILL.md`:

```markdown
---
name: pdf-extractor
description: Extract text, tables, and metadata from PDF documents.
tags: [pdf, extraction, ocr]
---

# PDF Extractor
...body...
```

## Run the backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt        # runtime only
# or: pip install -r requirements-dev.txt  # adds pytest, ruff, mypy
uvicorn backend.main:app --reload --port 8000
```

API at `http://localhost:8000`:
- `GET /api/health`
- `GET /api/skills`
- `GET /api/skills/{name}`
- `GET /api/search?q=<query>&limit=10`
- `POST /api/reindex`

Override the skills directory with `SKILLS_DIR=/path/to/skills`.

## Run the frontend

```bash
cd frontend
npm install
npm start
```

App at `http://localhost:4200`. Talks to backend at `http://localhost:8000` (CORS allowed for `localhost:4200`).

## Tests

```bash
pytest backend/tests/
```

## Ranking

Each skill is scored against the query across three fields:

| Field       | Weight | Exact | Prefix | Contains |
|-------------|-------:|------:|-------:|---------:|
| name        |    5.0 |  3x   |   2x   |    1x    |
| tags (best) |    3.0 |  3x   |   2x   |    1x    |
| description |    2.0 |  3x   |   2x   |    1x    |
