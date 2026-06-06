# OAT Tools VS Code Extensions

Owen's Applied Thinking content production tools for VS Code.

This repo is a monorepo with two separately installable extensions:

- `OAT Table Tools` for markdown table promotion
- `OAT Image Staging` for staged image placement

---

## Extensions

### OAT Table Tools

Location: `extensions/table-tools/`

Command:

- `OAT Tables: Promote All Tables in Document`

Scans the active markdown file, finds every markdown table, and for each one:

1. Calls the Cloudflare Worker (`oat-promote-tables`) to create a styled Google Sheet
2. Screenshots the table as a PNG via a local HTML render and headless browser
3. Commits and pushes the PNG to the `owencorpening/images` repo
4. Replaces the markdown table in the editor with a `<figure>` embed

Settings:

| VS Code setting | Required | Description |
|-----------------|----------|-------------|
| `oatTables.workerUrl` | Yes | Cloudflare Worker URL for sheet creation |
| `oatTables.imagesRepoPath` | No | Local images repo. Defaults to `~/dev/images` |
| `oatTables.screenshotScriptPath` | No | Local screenshot script. Defaults to `scripts/screenshot-html.sh` in the extension if present, then `~/dev/wraith/scripts/screenshot-html.sh` |

For transition, Table Tools also reads the old `oat.*` setting names as fallbacks.

### OAT Image Staging

Location: `extensions/image-staging/`

Activity bar view:

- `OAT Image Staging`

Command:

- `OAT Images: Refresh Image Panel`

The panel reads from the Google Sheet set in `oatImages.sheetId` and shows rows
where column H is `staged`.

The panel can:

1. Resolve thumbnails from `image_src`, direct image URLs, Unsplash, or page metadata
2. Place images into the local images repo
3. Insert Substack and carousel snippets into the active editor
4. Copy LinkedIn image handoff text to the clipboard
5. Mark rows as `placed` or `discarded` in the staging sheet

Settings:

| VS Code setting | Required | Description |
|-----------------|----------|-------------|
| `oatImages.sheetId` | No | Google Sheet ID for image staging |
| `oatImages.imagesRepoPath` | No | Local images repo. Defaults to `~/dev/images` |
| `oatImages.serviceAccountPath` | No | Google service account JSON path |
| `oatImages.unsplashAccessKey` | No | Unsplash API key for thumbnail previews |

For transition, Image Staging also reads the old `oat.*` setting names as fallbacks.
If `oatImages.serviceAccountPath` is not set, it checks for
`credentials/service-account.json` in the extension and then in the monorepo root.

---

## Local Install

Install each extension separately:

```bash
cd ~/.vscode/extensions
ln -s ~/dev/oat-tools-vscode/extensions/table-tools oat-table-tools-0.1.0
ln -s ~/dev/oat-tools-vscode/extensions/image-staging oat-image-staging-0.1.0
```

Reload VS Code. The table command appears in the Command Palette, and the image
staging panel appears in the activity bar.

---

## Cloudflare Worker

The table-promotion Worker lives in `extensions/table-tools/worker/`. It handles
Google Sheets creation and OAT styling, keeping table-promotion credentials out
of the extension.

Table promotion uses an OAuth refresh token so generated Sheets are created as
your Google user and use your Drive quota.

Create or use an OAuth 2.0 Client ID, then run:

```bash
node extensions/table-tools/scripts/get-refresh-token.js
```

The script asks for `client_id` and `client_secret`, opens a browser consent flow,
and sets these Worker secrets automatically:

| Secret | Description |
|--------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Refresh token for Sheets/Drive access |

Deploy:

```bash
cd extensions/table-tools/worker
npx wrangler deploy
```

---

## Tests

```bash
npm test
```

The current automated test coverage is focused on markdown table parsing. VS Code,
Google API, screenshot, and Git workflows should be smoke-tested manually.

---

## File Structure

```text
oat-tools-vscode/
├── extensions/
│   ├── table-tools/
│   │   ├── extension.js
│   │   ├── package.json
│   │   ├── lib/
│   │   ├── scripts/
│   │   ├── test/
│   │   ├── gas/
│   │   └── worker/
│   └── image-staging/
│       ├── extension.js
│       ├── package.json
│       ├── lib/
│       ├── views/
│       ├── media/
│       └── scripts/
├── docs/
│   └── split-plan.md
└── package.json
```

---

## Dependencies

The extensions use only Node.js built-ins and the VS Code API. No `npm install`
is required for extension runtime code.

External workflow dependencies still apply: `git`, `bash`, a screenshot script
and browser setup, `wrangler` for Worker deployment, and Google credentials.
