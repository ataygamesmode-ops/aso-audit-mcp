# Publishing aso-audit-mcp (repo-only — not shipped to npm)

Goal: get this package onto npm and the MCP directories, each linking back to **asoagency.io**. The npm `homepage` field (→ asoagency.io) is what feeds the scraper ecosystem.

## 0. Before you publish

- **Check the name is free:** `npm view aso-audit-mcp` → if it returns 404, the name is available. If taken, rename in `package.json` (e.g. `asoagency-aso-mcp`) and everywhere it appears.
- **Create the GitHub repo** `github.com/ataygamesmode-ops/aso-audit-mcp` (or update `repository`/`bugs` in `package.json` to the real URL). **Glama and Smithery index from GitHub**, so a public repo is required for those two — and the repo README is another asoagency.io link.

## 1. Publish to npm

```bash
cd mcp
npm login                 # one-time
npm publish --access public
```

Verify: `npm view aso-audit-mcp homepage` should print `https://asoagency.io`.

**Why this matters for DR:** npm listing links are `nofollow`, but scrapers that read `homepage` build pages that often link out `dofollow`:
- **Libraries.io** — auto-indexes; shows the homepage link.
- **Socket.dev** (`socket.dev/npm/package/aso-audit-mcp`) — auto-generates a page.
- **Snyk Advisor** (`snyk.io/advisor/npm-package/aso-audit-mcp`) — auto-generates a page.
These appear within days of publishing; no submission needed.

## 2. Submit to MCP directories

These are young but growing fast, and most show the project homepage.

| Directory | How to submit | Indexes from |
|---|---|---|
| **Glama** (glama.ai/mcp/servers) | Auto-crawls public GitHub repos with an MCP server; can also submit the repo URL. | GitHub |
| **Smithery** (smithery.ai) | Connect the GitHub repo; `smithery.yaml` is already included. | GitHub |
| **PulseMCP** (pulsemcp.com) | "Submit a server" form — paste the GitHub/npm URL and homepage. | Form |
| **mcp.so** | "Submit" form on the site — paste name, GitHub/npm URL, homepage. | Form |
| **modelcontextprotocol servers list** | Open a PR adding it to the community servers section of github.com/modelcontextprotocol/servers. | GitHub PR |

For every form, set the **Website / Homepage = https://asoagency.io**.

## 3. Close the loop

- Link the npm package and each directory listing from a `/tools` page on asoagency.io so crawlers discover them fast.
- Bump `version` in `package.json` for any future `npm publish` (npm rejects re-publishing the same version).

## Verify the package contents before publishing

```bash
npm pack --dry-run     # lists exactly what will be published
```
Should include only: `src/`, `README.md`, `LICENSE`, `package.json`.
