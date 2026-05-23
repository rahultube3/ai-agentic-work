from pathlib import Path

from backend.indexer import load_skills
from backend.search import search_skills

SKILLS_DIR = Path(__file__).resolve().parent.parent.parent / "skills"


def test_index_loads_all_skills() -> None:
    skills = load_skills(SKILLS_DIR)
    assert len(skills) >= 6
    names = {s.name for s in skills}
    assert "pdf-extractor" in names
    assert "sql-analyst" in names


def test_search_exact_name_ranks_first() -> None:
    skills = load_skills(SKILLS_DIR)
    hits = search_skills(skills, "pdf-extractor")
    assert hits
    assert hits[0].skill.name == "pdf-extractor"
    assert "name" in hits[0].matched_fields


def test_search_by_tag() -> None:
    skills = load_skills(SKILLS_DIR)
    hits = search_skills(skills, "ocr")
    assert any(h.skill.name == "pdf-extractor" for h in hits)


def test_search_prefix() -> None:
    skills = load_skills(SKILLS_DIR)
    hits = search_skills(skills, "pdf")
    assert hits[0].skill.name == "pdf-extractor"


def test_search_empty_query_returns_empty() -> None:
    skills = load_skills(SKILLS_DIR)
    assert search_skills(skills, "") == []
