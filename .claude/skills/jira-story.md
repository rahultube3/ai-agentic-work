# Jira Story Writer

Create a properly formatted Jira user story from a plain-text description by running the local agent.

## Steps

1. Extract the feature description from the user's message (everything after `/jira-story`).
   If no description was given, ask: "What feature or requirement do you want to create a Jira story for?"

2. Run from the project root:
   ```
   python jira-agent/agent.py "<description>"
   ```

3. On success, report the issue key and URL exactly as printed by the script.

4. If the script errors with a `KeyError` or `Missing environment variable`, tell the user:
   "Copy `.env.example` to `.env` and fill in `ANTHROPIC_API_KEY`, `JIRA_DOMAIN`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, and `JIRA_PROJECT_KEY`."

5. If the Jira API returns a 400 error mentioning the story points field, tell the user:
   "Set `JIRA_STORY_POINTS_FIELD` in your `.env` — use `customfield_10016` for classic projects or `customfield_10028` for next-gen projects."
