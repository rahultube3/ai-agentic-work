import argparse
import base64
import json
import os
import sys
from pathlib import Path

import anthropic
import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

JIRA_DOMAIN = os.environ["JIRA_DOMAIN"]          # e.g. yourcompany.atlassian.net
JIRA_EMAIL = os.environ["JIRA_EMAIL"]
JIRA_API_TOKEN = os.environ["JIRA_API_TOKEN"]
JIRA_PROJECT_KEY = os.environ["JIRA_PROJECT_KEY"]  # e.g. PROJ
# Jira story points field varies by project type:
#   classic projects  → customfield_10016
#   next-gen projects → customfield_10028
JIRA_STORY_POINTS_FIELD = os.environ.get("JIRA_STORY_POINTS_FIELD", "story_points")

_SYSTEM_PROMPT = """\
You are an expert agile product manager. Convert the given feature description into a \
well-structured Jira user story.

Return a JSON object with exactly these fields:
{
  "summary": "Short action-oriented title (max 100 chars, no 'As a user' prefix)",
  "user_story": "As a [role], I want [feature], so that [benefit].",
  "background": "1-2 sentence context or motivation (empty string if not needed)",
  "acceptance_criteria": ["Criterion 1", "Criterion 2"],
  "technical_notes": [],
  "story_points": 3,
  "priority": "Medium",
  "labels": []
}

Rules:
- acceptance_criteria: 3-7 specific, testable items using Given/When/Then or action verbs
- story_points: fibonacci only — 1, 2, 3, 5, 8, or 13
- priority: Highest | High | Medium | Low | Lowest
- labels: max 3, kebab-case, domain-relevant (empty list if none obvious)
- Return only valid JSON — no markdown fences, no explanation\
"""


def generate_user_story(prompt: str) -> dict:
    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": _SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(response.content[0].text)


def _build_adf(story: dict) -> dict:
    content: list[dict] = []

    def heading(text: str, level: int = 3) -> dict:
        return {"type": "heading", "attrs": {"level": level}, "content": [{"type": "text", "text": text}]}

    def paragraph(text: str) -> dict:
        return {"type": "paragraph", "content": [{"type": "text", "text": text}]}

    def bullet_list(items: list[str]) -> dict:
        return {
            "type": "bulletList",
            "content": [
                {"type": "listItem", "content": [paragraph(item)]}
                for item in items
            ],
        }

    content.append(heading("User Story"))
    content.append(paragraph(story["user_story"]))

    if story.get("background"):
        content.append(heading("Background"))
        content.append(paragraph(story["background"]))

    if story.get("acceptance_criteria"):
        content.append(heading("Acceptance Criteria"))
        content.append(bullet_list(story["acceptance_criteria"]))

    if story.get("technical_notes"):
        content.append(heading("Technical Notes"))
        content.append(bullet_list(story["technical_notes"]))

    return {"version": 1, "type": "doc", "content": content}


def create_jira_issue(story: dict) -> dict:
    auth = base64.b64encode(f"{JIRA_EMAIL}:{JIRA_API_TOKEN}".encode()).decode()
    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    fields: dict = {
        "project": {"key": JIRA_PROJECT_KEY},
        "summary": story["summary"],
        "description": _build_adf(story),
        "issuetype": {"name": "Story"},
        "priority": {"name": story["priority"]},
    }

    if story.get("labels"):
        fields["labels"] = story["labels"]

    if story.get("story_points"):
        fields[JIRA_STORY_POINTS_FIELD] = story["story_points"]

    response = httpx.post(
        f"https://{JIRA_DOMAIN}/rest/api/3/issue",
        headers=headers,
        json={"fields": fields},
        timeout=30.0,
    )
    response.raise_for_status()
    return response.json()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a Jira user story from a plain-text description")
    parser.add_argument("prompt", nargs="?", help="Feature description (reads stdin if omitted)")
    args = parser.parse_args()

    prompt = args.prompt or sys.stdin.read().strip()
    if not prompt:
        print("Error: provide a feature description as an argument or via stdin.", file=sys.stderr)
        sys.exit(1)

    print("Structuring user story with Claude...")
    story = generate_user_story(prompt)

    print(f"\n  Summary      : {story['summary']}")
    print(f"  Priority     : {story['priority']}")
    print(f"  Story Points : {story['story_points']}")
    print(f"  AC items     : {len(story.get('acceptance_criteria', []))}")

    print("\nCreating Jira issue...")
    result = create_jira_issue(story)

    issue_key = result["key"]
    print(f"\nCreated : {issue_key}")
    print(f"URL     : https://{JIRA_DOMAIN}/browse/{issue_key}")


if __name__ == "__main__":
    main()
