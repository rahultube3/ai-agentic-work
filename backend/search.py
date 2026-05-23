from backend.models import SearchHit, Skill


def _score_field(query: str, value: str, weight: float) -> float:
    if not value:
        return 0.0
    v = value.lower()
    q = query.lower()
    if v == q:
        return weight * 3.0
    if v.startswith(q):
        return weight * 2.0
    if q in v:
        return weight * 1.0
    return 0.0


def search_skills(skills: list[Skill], query: str, limit: int = 10) -> list[SearchHit]:
    q = query.strip()
    if not q:
        return []

    hits: list[SearchHit] = []
    for skill in skills:
        matched: list[str] = []
        score = 0.0

        name_score = _score_field(q, skill.name, weight=5.0)
        if name_score > 0:
            score += name_score
            matched.append("name")

        desc_score = _score_field(q, skill.description, weight=2.0)
        if desc_score > 0:
            score += desc_score
            matched.append("description")

        tag_score = max((_score_field(q, t, weight=3.0) for t in skill.tags), default=0.0)
        if tag_score > 0:
            score += tag_score
            matched.append("tags")

        if score > 0:
            hits.append(SearchHit(skill=skill, score=score, matched_fields=matched))

    hits.sort(key=lambda h: (-h.score, h.skill.name))
    return hits[:limit]
