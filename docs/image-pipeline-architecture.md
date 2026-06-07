# Image Pipeline Architecture

This note reconciles the running VS Code extensions with the content standards
currently kept in `~/dev/wraith/standards`. It is the working architecture target
for content, asset, and audience-aware publishing workflows.

For the broader plan to split the current mixed `wraith` workspace into repos by
role, see [repo-refactor-plan.md](repo-refactor-plan.md).

## Core Contract

The pipeline uses durable stores by role, not by repo name:

| Store | Role |
|-------|------|
| Content repo | Drafts, standards, templates, source markdown, carousel files, and publish workflow notes. Currently `~/dev/wraith`. |
| Asset repo | Final publishable public assets and provenance files. Currently `~/dev/images`. |
| Tool repo | VS Code extensions, Workers, scripts, tests, and pipeline implementation. Currently this repo. |
| Cloudflare D1 | Preferred transactional ledger for content records, asset records, source intake, placement state, audience relationships, and retry/cleanup status. |
| Raw GitHub URL | Permanent published reference for Substack, carousel, and handoff output. |

VS Code is one interface over this pipeline. The extension should orchestrate the
workflow, but the lifecycle rules should live in reusable pipeline modules.

## Publishing Data Model

The image pipeline is one piece of a larger publishing system. Anticipate an
audience, paid or otherwise, and keep that relationship in the database rather
than in Git.

Core D1 entities:

| Entity | Purpose |
|--------|---------|
| `content_item` | Article, carousel, LinkedIn post, table, or other publishable work. |
| `asset` | Image, table screenshot, generated diagram, source file, or hosted media item. |
| `asset_placement` | Join between a content item and an asset, including figure number, target, URL, and status. |
| `publication_channel` | Substack, LinkedIn, Buffer, raw GitHub, or another distribution surface. |
| `publication_event` | When a content item was published, where, and with which URL. |
| `audience_member` | A person or account known to the system. Store only what is needed. |
| `subscription` | Free, paid, complimentary, trial, cancelled, or external subscription state. |
| `entitlement` | What an audience member can access or receive. |
| `engagement_event` | Optional record of opens, clicks, comments, replies, referrals, or manual notes. |

Git repos should not be named as domain concepts in the data model. Instead,
records should describe roles:

- `content_repo_path`
- `asset_repo_path`
- `tool_repo_path`
- `published_url`
- `raw_asset_url`

This keeps the model stable if the content repo stops being named `wraith`, if
assets move out of Git, or if a second asset backend is added.

Audience and payment rules:

- Do not store audience lists, email addresses, payment records, or private
  customer notes in Git.
- Do not store card details or payment secrets in D1. Use a payment/subscription
  provider as the authority for money movement.
- D1 may store provider IDs, subscription state, entitlement state, timestamps,
  and lightweight relationship notes needed by the publishing workflow.
- Public content and public assets can live in Git. Private audience state lives
  in the ledger.

## Ledger Choice

Cloudflare D1 is the preferred shared ledger because this repo already uses
Cloudflare Workers for table promotion. Keeping the asset ledger in the same
platform gives the pipeline a natural place to handle transactional state and
removes Google Sheets from the image workflow target.

Use D1 for:

- Asset records and immutable asset IDs.
- Intake state for captured URLs, Downloads files, AI-generated files, and
  review-triggered image hunts.
- Provenance fields and manual-check flags.
- Placement transactions and retry status.
- Links to generated table Sheets and screenshots.
- Cleanup queues for abandoned candidates, failed downloads, and orphaned table
  promotion attempts.

Eliminate Google Sheets from the target image pipeline:

- No staging sheet as the image queue.
- No sheet row as the canonical image record.
- No sheet update as the placement/discard transaction.
- No sheet-specific service account path for image workflow state.

During migration, the existing image staging sheet can be imported into D1 and
then treated as legacy data. If a spreadsheet export remains useful for human
review, generate it from D1 rather than making it an operational dependency.

Keep Google Sheets only for promoted tables when the sheet itself is the
reader-facing accessible data artifact.

Keep Git for:

- Final, publishable assets.
- Provenance files required by the content standards.
- Stable raw GitHub URLs referenced by drafts and published posts.

Do not require Git for:

- Candidate images.
- Failed downloads.
- AI experiments.
- Review-hunt scratch assets.
- Temporary render files.

Those should stay in D1-managed staging state and temporary storage until they
are accepted for publication.

## Source Intake

Images can enter the pipeline from several places:

- **Staging sheet rows:** images captured by the bookmarklet or another logging
  path and marked `staged` in the current implementation. Target state: capture
  directly into D1.
- **`~/Downloads`:** local files that may have been generated, downloaded, or
  routed by a watcher.
- **AI-generated files:** obvious generated images such as `chatgpt*.png` or
  similar filenames. These often carry useful filename metadata such as date,
  timestamp, prompt fragments, or generation source.
- **Unprovenanced local files:** images found in `~/Downloads` or supplied by
  the user where source, creator, and license are missing or incomplete.
- **User-provided image:** an image the user spontaneously wants to place, even
  if it was not pre-staged.
- **Review-triggered image hunt:** during final review, the user spots a dense
  stretch of prose and decides the article needs a visual break, such as a
  diagram, map, table, or sourced image at that location.

The pipeline should normalize all of these into an image record before placement.

## Image Record

A normalized image record should carry:

| Field | Purpose |
|-------|---------|
| `slug` | Canonical kebab-case asset slug used for new published paths. |
| `displayName` | Human-readable name for captions, alt text, and review UI. |
| `sourceName` | Original captured name or filename before normalization. |
| `sourcePath` | Local file path when the image starts on disk. |
| `sourceUrl` | Original web/source URL when known. |
| `imageSrc` | Direct downloadable image URL when known. |
| `photographer` | Photographer, creator, or `Owen Corpening` for originals. |
| `license` | License string or explicit manual-check status. |
| `attribution` | Caption-ready attribution string. |
| `status` | `candidate`, `staged`, `placed`, `discarded`, or `needs-provenance`. |
| `section` | Asset repo section, such as `water-series/part-09` or `standalone/<article>`. |
| `target` | `substack`, `carousel`, `linkedin-post`, or another placement target. |
| `figureNumber` | Figure number for article placement. |
| `draftContext` | Optional note about why the image is needed and where it belongs in the draft. |

If the pipeline cannot prove provenance, it should keep the image in
`needs-provenance` rather than silently treating it as publishable.

## Transaction Model

D1 can make the ledger transactional, but it cannot make filesystem writes, Git
commits, table Google Sheet creation, and editor edits part of one database
transaction. Model those steps as a saga:

1. Create or update an asset record with `status = publishing`.
2. Write or move files into a staging location.
3. Promote accepted files into the asset repo.
4. Write provenance files and optional `asset.json`.
5. Commit and push final assets.
6. Insert or replace the draft snippet.
7. Mark the asset `placed`.

If any step fails, keep the current step and error in D1 so the pipeline can
retry or clean up deliberately. This is safer than scattering half-finished
state across `~/Downloads`, `/tmp`, legacy image sheets, and the asset repo.

## Review-Triggered Image Hunt

The image need often appears late, during final review. The user sees a dense
block of text and decides the article needs a visual anchor before it publishes.

That should be modeled as a pipeline entry point:

1. Capture the current draft location or selected text.
2. Record the reason for the image need, such as `dense prose`, `needs map`,
   `needs concept diagram`, `needs sourced photo`, or `needs table`.
3. Create a candidate image record with `draftContext`.
4. Let the user choose an intake path:
   - Search/source a web image and capture it directly to D1.
   - Use an existing staged image.
   - Use a local image from `~/Downloads`.
   - Provide or generate an AI image.
   - Promote a nearby markdown table if the visual need is really data.
5. Continue through normal provenance, placement, and snippet generation.

This keeps final-review image hunts from becoming an undocumented side path.

## Downloads Handling

`~/Downloads` should be treated as an intake buffer, not storage.

For local source files:

1. Detect likely image files and sidecar metadata.
2. Infer useful fields from the filename when possible, especially for
   AI-generated images with timestamped names.
3. Ask for or record missing provenance before placement.
4. Move the image into the asset repo at `[section]/[slug]/`.
5. Write provenance files alongside the image:
   - `url.txt`
   - `license.txt`
   - `photographer.txt`
6. Remove or move sidecar/source files so `~/Downloads` is not left carrying
   finished assets.

This follows the content standard that `~/Downloads` should be empty of processed
assets when the pipeline is done.

## Placement Outputs

For a publishable image, placement creates:

- An asset folder in the asset repo.
- The image file.
- Provenance files.
- A raw GitHub URL.
- A target-specific snippet.
- A D1 ledger transition to `placed`.

For Substack body images, the snippet should be an HTML figure:

```html
<figure>
  <img src="IMAGE_URL" width="400" style="display:block" alt="DESCRIPTION">
  <figcaption>Figure N: ATTRIBUTION_STRING</figcaption>
</figure>
```

For carousels, the output should be Marp-aware and reuse the same raw GitHub URL.

For LinkedIn handoff, the output should be clipboard text with image URL and
attribution instructions, because the image is attached manually in LinkedIn.

## Table Promotion Pipeline

Table promotion is an asset pipeline too. It starts from markdown table source
inside a draft and produces both a Google Sheet and a generated image asset.

Current behavior:

1. Parse markdown tables from the active markdown editor.
2. Create a styled Google Sheet from the table headings and rows through the
   Cloudflare Worker.
3. Render the table locally as HTML.
4. Take a headless screenshot of the rendered table.
5. Save the PNG into the asset repo.
6. Commit and push the generated PNG.
7. Replace the original markdown table with a figure embed whose caption links
   readers to the full data sheet.

Architecture target:

- Treat generated table screenshots as first-class assets in the same asset repo.
- Store table provenance metadata:
  - `url.txt` = Google Sheet URL
  - `photographer.txt` = `Owen Corpening`
  - `license.txt` = OAT rights/license string
- Reconcile naming with the content table standard:
  `part[NN]-table-[descriptor]-preview.png`.
- Keep the accessible data link in the caption or linked figure consistently
  across article and carousel outputs.

## Suggested Module Boundaries

```text
extensions/image-staging/lib/
├── imageRecord.js        # normalize and validate records
├── imageIntake.js        # URL capture, Downloads, AI file, and user-provided intake
├── assetLedgerD1.js      # D1 asset records, state transitions, retry log
├── imageAssetsRepo.js    # asset repo paths, provenance files, raw URLs, git
├── imagePipeline.js      # place/discard/orchestrate
├── snippetBuilder.js     # substack, carousel, linkedin-post snippets
└── thumbResolver.js      # preview resolution

extensions/table-tools/lib/
├── tableRecord.js        # parsed table descriptor and naming
├── tableAssetsRepo.js    # screenshot paths, metadata, raw URLs, git
└── tableEmbedBuilder.js  # article/carousel embed output
```

The goal is for VS Code views and commands to call pipeline functions instead of
embedding workflow rules directly in UI handlers.
