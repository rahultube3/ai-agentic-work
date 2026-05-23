import re
from pathlib import Path
from typing import Any

import yaml

from backend.models import Skill

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)


def parse_skill_file(path: Path) -> Skill | None:
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(text)
    if not match:
        return None
    raw_meta, body = match.group(1), match.group(2)
    meta: dict[str, Any] = yaml.safe_load(raw_meta) or {}
    name = meta.get("name")
    description = meta.get("description")
    if not name or not description:
        return None
    tags_raw = meta.get("tags") or []
    tags = [str(t) for t in tags_raw] if isinstance(tags_raw, list) else []
    return Skill(
        name=str(name),
        description=str(description),
        tags=tags,
        path=str(path),
        body=body.strip(),
    )


def load_skills(skills_dir: Path) -> list[Skill]:
    skills: list[Skill] = []
    for skill_file in skills_dir.rglob("SKILL.md"):
        parsed = parse_skill_file(skill_file)
        if parsed is not None:
            skills.append(parsed)
    skills.sort(key=lambda s: s.name)
    return skills
