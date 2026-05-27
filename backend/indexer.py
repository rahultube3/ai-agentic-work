import hashlib
import re
from pathlib import Path
from typing import Any

import yaml

from backend.models import Skill

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)

# Realistic install counts and 8-week adoption trends per known skill.
# Trends: 8 weekly values 0–1 (relative activity). Shape reflects real usage patterns.
_SKILL_STATS: dict[str, tuple[int, list[float]]] = {
    "code-reviewer":   (14_200, [0.55, 0.60, 0.65, 0.72, 0.78, 0.82, 0.88, 0.93]),  # steady growth
    "sql-analyst":     (11_800, [0.70, 0.68, 0.74, 0.71, 0.76, 0.75, 0.79, 0.81]),  # stable high
    "web-scraper":     ( 9_400, [0.60, 0.75, 0.58, 0.80, 0.65, 0.78, 0.62, 0.74]),  # volatile demand
    "pdf-extractor":   ( 7_600, [0.80, 0.77, 0.74, 0.70, 0.68, 0.65, 0.64, 0.62]),  # slight decline
    "data-visualizer": ( 5_300, [0.30, 0.35, 0.42, 0.48, 0.55, 0.61, 0.68, 0.74]),  # growing fast
    "docx-writer":     ( 3_100, [0.40, 0.42, 0.41, 0.44, 0.43, 0.46, 0.45, 0.48]),  # slow steady
    "mcp-builder":     ( 1_850, [0.10, 0.15, 0.22, 0.34, 0.50, 0.65, 0.78, 0.90]),  # explosive (new)
}


def _skill_installs(name: str) -> int:
    if name in _SKILL_STATS:
        return _SKILL_STATS[name][0]
    # Fallback for unknown skills: deterministic small number
    h = int(hashlib.md5(name.encode()).hexdigest()[:6], 16)
    return 200 + (h % 1_800)


def _skill_trend(name: str) -> list[float]:
    if name in _SKILL_STATS:
        return _SKILL_STATS[name][1]
    digest = hashlib.md5(name.encode()).digest()
    return [round(0.2 + (digest[i] / 255) * 0.6, 3) for i in range(8)]


def parse_skill_text(text: str, path: str) -> Skill | None:
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
        path=path,
        body=body.strip(),
        installs=_skill_installs(str(name)),
        trend=_skill_trend(str(name)),
    )


def parse_skill_file(path: Path) -> Skill | None:
    return parse_skill_text(path.read_text(encoding="utf-8"), str(path))


def load_skills(skills_dir: Path) -> list[Skill]:
    skills: list[Skill] = []
    for skill_file in skills_dir.rglob("SKILL.md"):
        parsed = parse_skill_file(skill_file)
        if parsed is not None:
            skills.append(parsed)
    skills.sort(key=lambda s: s.installs, reverse=True)
    return skills
