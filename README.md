# aso-audit-mcp

**Model Context Protocol (MCP) server for App Store Optimization.** Score your App Store / Google Play listing metadata, check character limits, and clean up the iOS keyword field — right inside Claude, Cursor, or any MCP client.

Built by **[ASO Agency](https://asoagency.io)** · free ASO audits, keyword research & App Store / Google Play growth tools at **https://asoagency.io**

## Install

Add it to your MCP client. No install step — `npx` fetches it on demand.

**Claude Desktop / Cursor / generic** (`mcpServers` config):

```json
{
  "mcpServers": {
    "aso-audit": {
      "command": "npx",
      "args": ["-y", "aso-audit-mcp"]
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add aso-audit -- npx -y aso-audit-mcp
```

## Tools

| Tool | What it does |
|---|---|
| `audit_metadata` | Scores a full iOS or Android listing 0–100 and returns prioritized fixes. |
| `check_field` | Checks one field's character usage against its store limit. |
| `keyword_field_check` | Cleans the iOS 100-char keyword field: strips comma spaces, de-dupes, reports chars saved. |
| `get_limits` | Returns the official App Store / Google Play character limits. |

### Example

> "Audit this iOS listing: title 'Habit Tracker: Daily Goals', subtitle 'Routine planner & streak coach', keywords 'habit,routine,streak,goal,planner,daily,reminder,tracker,productivity', and this description…"

```
ASO score: 94/100  (Grade A)  —  Apple App Store

Fields:
  • Title: 26/30
  • Subtitle: 30/30
  • Keywords: 68/100
  • Description: 1200/4000
  • Distinct keywords across fields: 12

No issues found — this listing follows ASO best practices.

More free ASO tools & audits: https://asoagency.io
```

## Store limits it enforces

- **iOS** — title 30, subtitle 30, keywords 100, promo text 170, description 4000
- **Android** — title 30, short description 80, full description 4000

## Run / develop locally

```bash
npm install
npm test          # engine checks
npm start         # run the server over stdio
```

## License

MIT © [ASO Agency](https://asoagency.io)
