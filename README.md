# OAT Tools — VS Code Extension

Owen's Applied Thinking content production commands.

---

## Commands

### OAT: Promote All Tables in Document

Scans the active markdown file, finds every markdown table, and for each one:

1. Calls the Cloudflare Worker (`oat-promote-tables`) which creates a styled Google Sheet
2. Screenshots the table as a PNG via a local HTML render + headless browser
3. Commits and pushes the PNG to the `owencorpening/images` repo
4. Replaces the markdown table in the editor with a `<figure>` embed:

```html
<figure>
  <img width="560" src="https://raw.githubusercontent.com/owencorpening/images/main/..." alt="...">
  <figcaption><a href="https://docs.google.com/spreadsheets/d/...">View full data table</a></figcaption>
</figure>
```

All tables are promoted in one pass. Replacements are applied bottom-up so line numbers stay valid.

---

## Install

```bash
cd ~/.vscode/extensions
ln -s ~/dev/oat-tools-vscode oat-tools-0.2.0
```

Reload VS Code. Commands appear in the Command Palette.

---

## Configuration

| VS Code setting | Required | Description |
|-----------------|----------|-------------|
| `oat.workerUrl` | Yes | Cloudflare Worker URL for sheet creation |
| `oat.unsplashAccessKey` | No | Unsplash API key for image panel thumbnails |
| `oat.imageStagingSheetId` | No | Google Sheet ID for image staging panel |

Set in `settings.json`:
```json
{
  "oat.workerUrl": "https://oat-promote-tables.owencorpening.workers.dev"
}
```

---

## Setup: Cloudflare Worker

The Worker lives in `worker/` and is deployed to Cloudflare. It handles Google Sheets
creation and OAT styling, keeping credentials out of the extension entirely.

### First-time setup

**Prerequisites:** Cloudflare account, GCP project with Sheets + Drive APIs enabled.

**1. Create OAuth credentials** in GCP Console (project: OAT Tools):
- APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID → Desktop App

**2. Run the auth script** — gets a refresh token and sets all three Worker secrets automatically:
```bash
node scripts/get-refresh-token.js
```
Paste the client ID and secret when prompted, authorize in browser. Done.

**3. Deploy the Worker:**
```bash
cd worker
npx wrangler login   # first time only
npx wrangler deploy
```

### Re-keying (rotate credentials)

Delete the OAuth client in GCP Console, create a new one, then:
```bash
node scripts/get-refresh-token.js
```
The script sets the new secrets automatically. No manual wrangler steps needed.

### Worker secrets

| Secret | Description |
|--------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Desktop App client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GOOGLE_REFRESH_TOKEN` | Long-lived refresh token (never expires unless revoked) |

---

## Image Staging Panel

The camera icon in the activity bar opens the Image Staging panel. Reads from the
Google Sheet set in `oat.imageStagingSheetId` and shows rows where column H is `staged`.

---

## File structure

```
oat-tools-vscode/
├── extension.js              ← command handlers
├── package.json              ← command registration, settings schema
├── lib/
│   ├── parseTables.js        ← markdown table parser
│   └── imageStagingSheet.js  ← image staging sheet reader
├── scripts/
│   └── get-refresh-token.js  ← OAuth flow + auto-sets Worker secrets ★
├── views/
│   └── imagePanelProvider.js ← webview panel for staged images
└── worker/
    ├── index.js              ← Cloudflare Worker (sheet creation + OAT styling)
    └── wrangler.toml         ← Worker config
```

---

## No npm dependencies

Extension uses only Node.js built-ins and the VS Code API. No `npm install` required.
Worker uses only Cloudflare Workers runtime globals (`fetch`, `Response`).
