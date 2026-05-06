# OAT Tools — VS Code Extension

Owen's Applied Thinking content production commands.

---

## Commands

### OAT: Promote All Tables in Document

Scans the active markdown file, finds every markdown table, and for each one:

1. Creates a Google Sheet in Drive with the table data
2. Applies OAT brand formatting (via Apps Script web app or direct Sheets API)
3. Publishes the sheet to web (read-only, anyone with link)
4. Replaces the markdown table in the editor with the standard embed snippet:

```markdown
[![descriptor data table](PNG_EXPORT_URL)](SHEET_URL)
*Tap or click to view full accessible data.*
```

All tables in the document are promoted in one pass. Replacements are applied
bottom-up so line numbers stay valid.

---

## Install

```bash
cd ~/.vscode/extensions
ln -s ~/dev/oat-tools-vscode oat-tools-0.1.0
```

Reload VS Code. The command appears in the Command Palette as
**OAT: Promote All Tables in Document**.

---

## Configuration

Two settings, each checked as env var first, then VS Code setting:

| Env var | VS Code setting | Required | Notes |
|---------|-----------------|----------|-------|
| `GOOGLE_OAUTH_TOKEN` | `oat.googleOAuthToken` | Yes | Drive + Sheets scopes |
| `GAS_WEB_APP_URL` | `oat.gasWebAppUrl` | No | If blank, Sheets API formats directly |

Set in `settings.json`:
```json
{
  "oat.googleOAuthToken": "ya29.your-token-here",
  "oat.gasWebAppUrl": "https://script.google.com/macros/s/YOUR_ID/exec"
}
```

Or export before launching VS Code:
```bash
export GOOGLE_OAUTH_TOKEN=$(gcloud auth print-access-token)
export GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

---

## Manual Steps Required

### 1 — Google OAuth Token

The token needs two scopes:
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive`

**Easiest path (gcloud CLI):**
```bash
gcloud auth login
gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive
gcloud auth print-access-token
```

Copy the output token into the VS Code setting or env var.

Tokens expire after 1 hour. Re-run `gcloud auth print-access-token` to refresh.

**Alternative — OAuth Playground:**
1. Go to https://developers.google.com/oauthplayground
2. Select "Google Sheets API v4" and "Google Drive API v3" scopes
3. Authorize and exchange for an access token
4. Copy the access token

---

### 2 — GAS Web App URL (optional but preferred for formatting)

If `GAS_WEB_APP_URL` is not set, formatting is applied directly via the
Sheets API batchUpdate — same visual result, no GAS deployment required.

To use the GAS web app instead:

1. Open `~/dev/wraith/standards/sheets-oat-style/Code.gs` in Apps Script
2. Click **Deploy → New deployment**
3. Type: **Web app**
4. Execute as: **Me (ocorpening@gmail.com)**
5. Who has access: **Anyone**
6. Click **Deploy**, copy the web app URL
7. Set `GAS_WEB_APP_URL` to that URL

The `doPost(e)` function in Code.gs receives the spreadsheetId and applies
the full OAT style to all sheets. No auth is required from the extension side —
the web app runs as Owen's account.

---

## Descriptor generation

The sheet title and embed alt text use a camelCase descriptor derived from
the first header cell of each table:

| First header cell | Descriptor |
|-------------------|------------|
| `Component` | `component` |
| `Revenue Stream` | `revenueStream` |
| `Year` | `year` |
| `Context` | `context` |

If multiple tables share the same descriptor, a counter suffix is appended:
`component`, `component2`, `component3`, etc.

Final sheet title format: `part{NN}-table-{descriptor}`
Example: `part09-table-component`

---

## Image Staging Panel

The camera icon in the activity bar opens the Image Staging panel. It reads
from the Google Sheet set in `oat.imageStagingSheetId` and shows all rows
where column H (`status`) is `staged`.

### Sheet column layout

| Col | Field | Notes |
|-----|-------|-------|
| A | Date | |
| B | Name | |
| C | URL | Attribution/source page URL — shown in panel, used for attribution |
| D | Photographer | |
| E | License | |
| F | Substack Post Title | |
| G | Attribution String | |
| H | status | `staged`, `placed`, or `discarded` |
| I | placed_in | e.g. `part-09` |
| J | placed_date | ISO date |
| K | target | `substack`, `carousel`, `linkedin-post` |
| L | image_src | **Direct image URL for thumbnail preview** |

### Enabling thumbnails

To enable thumbnails, paste the direct image URL (ending in `.jpg`, `.png`,
`.webp`, etc.) into **column L** for each row. Column C retains the
attribution/source page URL and is unaffected.

If column L is empty, the panel shows "No preview" for that row.

---

## File structure

```
oat-tools-vscode/
├── package.json              ← command registration, settings schema
├── extension.js              ← command handler, GAS web app caller
├── lib/
│   ├── request.js            ← https API helper with redirect follow
│   ├── parseTables.js        ← markdown table parser
│   ├── sheetsApi.js          ← Drive/Sheets REST API (create, write, publish)
│   ├── oatFormat.js          ← OAT formatting via Sheets API batchUpdate
│   ├── serviceAccountAuth.js ← service account JWT + token exchange
│   ├── imageStagingSheet.js  ← reads/updates the image staging sheet (A:L)
│   └── imageWorkflow.js      ← place/discard image file operations
└── views/
    └── imagePanelProvider.js ← webview panel for staged images
```

---

## No dependencies

Uses only Node.js built-ins (`https`, `url`) and the VS Code API.
No `npm install` required.
