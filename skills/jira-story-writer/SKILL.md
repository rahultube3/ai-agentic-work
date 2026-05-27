---
name: jira-story-writer
description: Generate a structured Jira user story from a plain-text feature description, including acceptance criteria, story points, and priority.
tags: [jira, agile, product-management, user-story]
---

# Jira Story Writer

Turn any feature description into a complete, ready-to-groom Jira story.

## Capabilities
- Generates "As a / I want / So that" user story format
- Produces 3–7 testable acceptance criteria
- Estimates story points on the Fibonacci scale (1, 2, 3, 5, 8, 13)
- Assigns priority (Highest → Lowest) based on description context
- Attaches relevant kebab-case labels for discoverability
- Creates the issue directly via Jira REST API v3 — no copy-paste required

## Usage
Invoke via Claude Code slash command:
```
/jira-story Add OAuth2 login with Google so users don't need a separate password
```

## Setup
Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key |
| `JIRA_DOMAIN` | e.g. `yourcompany.atlassian.net` |
| `JIRA_EMAIL` | Your Atlassian account email |
| `JIRA_API_TOKEN` | Generate at id.atlassian.com → Security → API tokens |
| `JIRA_PROJECT_KEY` | e.g. `PROJ` |
| `JIRA_STORY_POINTS_FIELD` | `customfield_10016` (classic) or `customfield_10028` (next-gen) |
