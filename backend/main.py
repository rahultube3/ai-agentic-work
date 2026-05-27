import logging
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.github_indexer import load_skills_from_github
from backend.indexer import load_skills
from backend.models import SearchHit, Skill
from backend.search import search_skills

SKILLS_DIR = Path(os.environ.get("SKILLS_DIR", Path(__file__).resolve().parent.parent / "skills"))
SKILLS_REPO = os.environ.get("SKILLS_REPO", "").strip()
SKILLS_BRANCH = os.environ.get("SKILLS_BRANCH", "main").strip() or "main"
SKILLS_REPO_PATH = os.environ.get("SKILLS_REPO_PATH", "skills").strip() or "skills"
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN") or None

logger = logging.getLogger("skills-search")

app = FastAPI(title="Skills Search API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_skills_cache: list[Skill] = []
_source: str = "local"


def _refresh_index() -> list[Skill]:
    global _skills_cache, _source
    if SKILLS_REPO:
        _skills_cache = load_skills_from_github(
            repo=SKILLS_REPO,
            branch=SKILLS_BRANCH,
            root=SKILLS_REPO_PATH,
            token=GITHUB_TOKEN,
        )
        _source = f"github:{SKILLS_REPO}@{SKILLS_BRANCH}/{SKILLS_REPO_PATH}"
    else:
        _skills_cache = load_skills(SKILLS_DIR)
        _source = f"local:{SKILLS_DIR}"
    logger.info("Indexed %d skills from %s", len(_skills_cache), _source)
    return _skills_cache


@app.on_event("startup")
def _startup() -> None:
    try:
        _refresh_index()
    except Exception as exc:
        logger.exception("Initial index failed: %s", exc)


@app.get("/api/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "skills_indexed": len(_skills_cache),
        "source": _source,
    }


@app.post("/api/reindex")
def reindex() -> dict[str, object]:
    try:
        refreshed = _refresh_index()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"reindex failed: {exc}") from exc
    return {"indexed": len(refreshed), "source": _source}


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
