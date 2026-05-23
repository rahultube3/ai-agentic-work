import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.indexer import load_skills
from backend.models import SearchHit, Skill
from backend.search import search_skills

SKILLS_DIR = Path(os.environ.get("SKILLS_DIR", Path(__file__).resolve().parent.parent / "skills"))

app = FastAPI(title="Skills Search API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

_skills_cache: list[Skill] = []


def _refresh_index() -> list[Skill]:
    global _skills_cache
    _skills_cache = load_skills(SKILLS_DIR)
    return _skills_cache


@app.on_event("startup")
def _startup() -> None:
    _refresh_index()


@app.get("/api/health")
def health() -> dict[str, object]:
    return {"status": "ok", "skills_indexed": len(_skills_cache)}


@app.post("/api/reindex")
def reindex() -> dict[str, int]:
    refreshed = _refresh_index()
    return {"indexed": len(refreshed)}


@app.get("/api/skills", response_model=list[Skill])
def list_skills() -> list[Skill]:
    return _skills_cache


@app.get("/api/skills/{name}", response_model=Skill)
def get_skill(name: str) -> Skill:
    for skill in _skills_cache:
        if skill.name == name:
            return skill
    raise HTTPException(status_code=404, detail=f"Skill '{name}' not found")


@app.get("/api/search", response_model=list[SearchHit])
def search(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=50),
) -> list[SearchHit]:
    return search_skills(_skills_cache, q, limit=limit)
