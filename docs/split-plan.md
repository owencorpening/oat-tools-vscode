# OAT Tools Extension Split Plan

Plan and implementation notes for splitting the former combined `oat-tools` VS
Code extension into two separately installable extensions inside this monorepo.

Status: implemented in the monorepo layout. Keep this doc as the migration map
and follow-up checklist.

## Goal

End with two independent VS Code extensions:

1. `OAT Table Tools`
   - Promotes markdown tables into styled Google Sheets and PNG figure embeds.
   - Owns the Cloudflare Worker and table screenshot pipeline.
2. `OAT Image Staging`
   - Shows staged image rows from the image staging sheet.
   - Places, discards, and tracks publishing images.

Both extensions should be installable side by side without command, setting, or
view ID collisions.

## Proposed Monorepo Shape

```text
oat-tools-vscode/
├── extensions/
│   ├── table-tools/
│   │   ├── package.json
│   │   ├── extension.js
│   │   ├── lib/
│   │   ├── scripts/
│   │   ├── test/
│   │   └── worker/
│   └── image-staging/
│       ├── package.json
│       ├── extension.js
│       ├── lib/
│       ├── views/
│       ├── media/
│       └── credentials/
├── docs/
│   └── split-plan.md
└── README.md
```

Avoid creating shared code until duplication becomes painful. A little duplicated
Node helper code is cheaper than coupling the two extensions too early.

## Ownership Map

### Table Tools

Files owned by `extensions/table-tools/`:

- `extensions/table-tools/extension.js`
- `extensions/table-tools/lib/parseTables.js`
- `extensions/table-tools/test/parseTables.test.js`
- `extensions/table-tools/worker/index.js`
- `extensions/table-tools/worker/wrangler.toml`
- `extensions/table-tools/scripts/get-refresh-token.js`
- table screenshot/render scripts and helpers

Settings renamed:

- `oat.workerUrl` -> `oatTables.workerUrl`
- `oat.imagesRepoPath` -> `oatTables.imagesRepoPath`
- `oat.screenshotScriptPath` -> `oatTables.screenshotScriptPath`

Command renamed:

- `oat.promoteAllTables` -> `oatTables.promoteAllTables`

### Image Staging

Files owned by `extensions/image-staging/`:

- `extensions/image-staging/views/imagePanelProvider.js`
- `extensions/image-staging/media/camera.svg`
- `extensions/image-staging/lib/imageStagingSheet.js`
- `extensions/image-staging/lib/imageWorkflow.js`
- `extensions/image-staging/lib/serviceAccountAuth.js`
- `extensions/image-staging/lib/thumbResolver.js`
- `extensions/image-staging/lib/request.js`
- `credentials/service-account.json` remains ignored at the monorepo root for local development
- image staging sheet setup helpers

Settings renamed:

- `oat.imageStagingSheetId` -> `oatImages.sheetId`
- `oat.unsplashAccessKey` -> `oatImages.unsplashAccessKey`
- `oat.imagesRepoPath` -> `oatImages.imagesRepoPath`

Command/view IDs renamed:

- `oat.refreshImagePanel` -> `oatImages.refreshPanel`
- `oat-images` -> `oat-image-staging`
- `oatImagePanel` -> `oatImages.panel`

## Migration Sequence

Completed:

1. Moved table files into `extensions/table-tools/`.
2. Moved image staging files into `extensions/image-staging/`.
3. Gave each extension its own `package.json`.
4. Converted the root `package.json` into monorepo metadata.
5. Updated the root README to describe both install paths.

Remaining manual validation:

1. Install both extension folders with separate symlinks.
2. Confirm Table Tools command registration in VS Code.
3. Confirm Image Staging activity bar registration in VS Code.
4. Smoke-test table promotion and image placement against live credentials.

## Test Plan

Automated tests should stay focused on pure logic:

- Keep `parseTables` coverage.
- Add tests when moving or extracting descriptor, path, or snippet generation.
- Avoid mocking the full VS Code host unless a regression makes it worthwhile.

Manual smoke tests are more valuable for the VS Code, Google, screenshot, and Git
integration paths:

- Table Tools command appears in the Command Palette.
- Table Tools rejects non-markdown editors.
- Table Tools promotes a sample markdown table end to end.
- Image Staging activity bar icon appears.
- Image Staging panel loads staged rows.
- Place creates the expected image repo files and snippet.
- Discard marks the sheet row and handles placed images as expected.

## Benchmarks

No benchmarks needed for the split. Runtime is dominated by network calls,
Google APIs, screenshot rendering, and Git pushes. Reliability and clean extension
boundaries matter more than speed.

## Open Questions

- Should local credentials remain at the monorepo root, move into the Image
  Staging extension, or always be supplied through `oatImages.serviceAccountPath`?
- Should the hard-coded `water-series` image path become a setting during the split?
- Should `gas/promote-tables.gs` stay with Table Tools, or be archived if the Worker
  is now the canonical table-promotion backend?
- When can the old `oat.*` setting fallbacks be removed?
