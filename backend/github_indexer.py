import httpx

from backend.indexer import parse_skill_text
from backend.models import Skill

GITHUB_API = "https://api.github.com"
RAW_BASE = "https://raw.githubusercontent.com"


def _auth_headers(token: str | None) -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _list_skill_paths(
    client: httpx.Client,
    owner: str,
    repo: str,
    branch: str,
    root: str,
    token: str | None,
) -> list[str]:
    url = f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
    response = client.get(url, headers=_auth_headers(token), timeout=15.0)
    response.raise_for_status()
    data = response.json()
    if data.get("truncated"):
        raise RuntimeError(
            f"Tree for {owner}/{repo}@{branch} is truncated; "
            "recursive listing skipped entries"
        )
    prefix = f"{root.strip('/')}/" if root.strip("/") else ""
    paths: list[str] = []
    for entry in data.get("tree", []):
        path = str(entry.get("path", ""))
        if entry.get("type") != "blob":
            continue
        if not path.endswith("/SKILL.md") and path != "SKILL.md":
            continue
        if prefix and not path.startswith(prefix):
            continue
        paths.append(path)
    return paths


def _fetch_raw(
    client: httpx.Client,
    owner: str,
    repo: str,
    branch: str,
    path: str,
    token: str | None,
) -> str:
    url = f"{RAW_BASE}/{owner}/{repo}/{branch}/{path}"
    headers: dict[str, str] = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = client.get(url, headers=headers, timeout=15.0)
    response.raise_for_status()
    return response.text


def load_skills_from_github(
    repo: str,
    branch: str = "main",
    root: str = "skills",
    token: str | None = None,
) -> list[Skill]:
    if "/" not in repo:
        raise ValueError(f"SKILLS_REPO must be 'owner/repo', got {repo!r}")
    owner, repo_name = repo.split("/", 1)

    with httpx.Client() as client:
        paths = _list_skill_paths(client, owner, repo_name, branch, root, token)
        skills: list[Skill] = []
        for path in paths:
            text = _fetch_raw(client, owner, repo_name, branch, path, token)
            parsed = parse_skill_text(text, f"github://{repo}@{branch}/{path}")
            if parsed is not None:
                skills.append(parsed)

    skills.sort(key=lambda s: s.name)
    return skills
