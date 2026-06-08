# OAT Tools Use Cases

This is the single workflow guide for the OAT VS Code tools. Use it to decide
which extension to use, why that extension exists, and what steps to follow for
the common publishing jobs.

For the shortest image ledger walkthrough, start with
[image-pipeline-quickstart.md](image-pipeline-quickstart.md).

## Tool Map

| Tool | Use it when | Why it exists | Primary VS Code surface |
|------|-------------|---------------|-------------------------|
| `OAT Table Tools` | A draft contains markdown tables that should publish as styled figure embeds. | It turns raw markdown tables into durable Google Sheets plus PNG table images, then replaces the draft tables with publishable `<figure>` markup. | Command Palette command: `OAT Tables: Promote All Tables in Document` |
| `OAT Image Staging` | Images have been captured in the image ledger and need to be reviewed, placed, or discarded. | It keeps image selection, attribution, local image repo files, snippets, and placement status in the same workflow. | Activity bar panel: `OAT Image Staging` |

Use the tools together when an article has both data tables and sourced images:
promote tables from the markdown draft, then place images from the staging panel
into the same draft.

For the working architecture target behind these workflows, including local
files from `~/Downloads`, AI-generated image intake, and table promotion as an
asset pipeline, see
[image-pipeline-architecture.md](image-pipeline-architecture.md).

## Required Local Context

Both tools assume the content workflow has these pieces available:

- A local article draft open in VS Code.
- A local asset repo for final public assets, currently `~/dev/images`.
- Google credentials configured for the relevant workflow.
- Git available for committing and pushing generated image assets.

`OAT Table Tools` additionally requires `oatTables.workerUrl`, because table
promotion calls the Cloudflare Worker that creates styled Google Sheets.

`OAT Image Staging` reads from the image ledger when `oatImages.ledgerApiUrl` is
configured, and falls back to the legacy staging sheet otherwise. In this stack,
the image ledger is backed by Cloudflare D1. Do not add new image workflow
dependencies on Sheets.

## Use Case: Promote Draft Tables

Use `OAT Table Tools` when the article draft still contains plain markdown
tables, but the publishable article should contain figure embeds with a linked
source sheet.

Steps:

1. Open the markdown draft in VS Code.
2. Confirm the tables are valid markdown tables with headers and separator rows.
3. Run `OAT Tables: Promote All Tables in Document` from the Command Palette.
4. Enter the article part number, such as `09`.
5. Enter the series slug, such as `water-series`.
6. Let the command process every table in the document.
7. Review the generated `<figure>` embeds that replaced the original tables.
8. Check any warning notifications for tables that failed and need manual follow-up.

What the tool does:

- Parses every markdown table in the active document.
- Sends each table's headings and rows to the Cloudflare Worker to create a
  styled Google Sheet.
- Renders each table locally as HTML and screenshots it as a PNG.
- Writes the PNG under `generated/<series>/part-<part>/` in the asset repo.
- Commits and pushes the generated PNG.
- Replaces the original markdown table with an image figure and a caption link
  to the full data sheet.

Result:

The draft contains publishable table figures, and each figure points to both a
raw GitHub-hosted PNG and a Google Sheet for the full data table.

Architecture note:

Table promotion creates assets, not just editor text. The target pipeline should
also write table screenshot provenance in the asset repo, with `url.txt`
pointing to the Google Sheet and local metadata files identifying the asset as an
OAT-generated table image.

## Use Case: Intake a Local or AI-Generated Image

Use `OAT Images: Intake Local File` when the image starts outside the asset
ledger, especially in `~/Downloads`.

Common sources:

- Obvious AI-generated files such as `chatgpt*.png`.
- Downloaded images with useful metadata in the filename, such as date,
  timestamp, source, or prompt fragments.
- Local images without provenance.
- A user-provided image that should be placed spontaneously.
- A final-review image hunt triggered by a dense passage in the draft.

Steps:

1. Choose or detect the local image file.
2. Infer a proposed image name and any metadata from the filename.
3. Ask for missing provenance: source URL, creator or photographer, and license.
4. Normalize the image into the same record shape as a ledger asset record.
5. Save the asset to the ledger when `oatImages.ledgerApiUrl` is configured, or
   copy the JSON payload for manual review.
6. Continue through planned placement and local run preparation.

Result:

Images that did not come from the normal capture flow can still enter
the publishing pipeline without losing provenance. The asset repo move and
provenance file writes happen later, when the placement saga is executed.

## Use Case: Add an Image During Final Review

Use `OAT Images: Create Review Image Need` when final review reveals that a
section is too dense and needs a visual anchor before publication.

Steps:

1. Select the dense passage, image placeholder, or insertion point in the draft.
2. Create an image need with a short reason, such as `visual break`,
   `concept diagram`, `map`, `sourced photo`, or `data figure`.
3. Save the image need to the ledger when `oatImages.ledgerApiUrl` is
   configured, or copy the JSON payload for manual review.
4. Choose the intake path later:
   - Use an existing staged asset.
   - Search for and capture a new sourced image.
   - Use a local image from `~/Downloads`.
   - Use or generate an AI image.
   - Promote a markdown table if the need is actually tabular data.
5. Capture or confirm provenance, then create a planned placement.

Result:

Final-review visual gaps become tracked image records instead of ad hoc manual
edits. The draft gets relief from dense text while the ledger and asset repo
preserve source, license, and placement status.

## Use Case: Place a Staged Image in a Draft

Use `OAT Image Staging` when an image has already been captured in the image
ledger and is ready to be planned for an article, carousel, or LinkedIn handoff.

Steps:

1. Open the target draft in VS Code.
2. Open the `OAT Image Staging` activity bar panel.
3. Click refresh if the staged images do not load automatically.
4. Review the thumbnail, photographer, license, and URL for the image.
5. Click `Place`.
6. Choose the publishing target: `substack`, `carousel`, or `linkedin-post`.
7. Enter the figure number or handoff label.
8. Confirm the planned placement was recorded.
9. Run `OAT Images: Prepare Planned Placement Run` and select the planned
   placement.
10. Review the copied placement instructions.
11. Run `OAT Images: Execute Planned Placement Run` when the draft is open and
    you are ready for local side effects.

What the tool does:

- Reads ledger staged assets when `oatImages.ledgerApiUrl` is configured, otherwise
  falls back to the legacy sheet-backed panel.
- Resolves a thumbnail from `image_src`, a direct image URL, Unsplash, or page
  metadata.
- Creates a ledger `asset_placement` with `status = planned`.
- Creates an `asset_saga` row for local execution.
- Lists planned placements through `OAT Images: List Planned Image Placements`.
- Copies placement instructions through `OAT Images: Prepare Planned Placement
  Run`.
- Executes a guarded local placement through `OAT Images: Execute Planned
  Placement Run`.

Result:

The ledger knows which asset should go where. The prepare command can stop
before side effects, and the execute command can write the asset files, commit
and push them, edit the draft, and mark the placement done.

## Use Case: Prepare a LinkedIn Image Handoff

Use `OAT Image Staging` with the `linkedin-post` target when the image should be
tracked and hosted, but the final post must be assembled in LinkedIn manually.

Steps:

1. Open the `OAT Image Staging` panel.
2. Click `Place` on the staged image.
3. Choose `linkedin-post`.
4. Enter the handoff label.
5. Run `OAT Images: Prepare Planned Placement Run` if you want a dry handoff.
6. Run `OAT Images: Execute Planned Placement Run` when you are ready to host
   the image and copy or insert the handoff text.

Result:

The LinkedIn placement is tracked in the ledger as planned. Final hosting, attribution
handoff text, and the placed status are completed by the local placement saga.

## Use Case: Discard an Image

Use `OAT Image Staging` when a staged image is no longer needed and should be
removed from the active queue.

Steps:

1. Open the `OAT Image Staging` panel.
2. Find the image record.
3. Click `Discard`.
4. Confirm the discard prompt.

What the tool does:

- Marks the record as `discarded`.
- Removes the record from the active staged queue after refresh.

Result:

The ledger no longer presents the image as active work. If the image was
already in an article, the draft still needs a manual content review.

## Use Case: Refresh the Image Queue

Use `OAT Images: Refresh Image Panel` when the image ledger changed while VS Code
was already open, or when the panel appears stale.

Steps:

1. Open the `OAT Image Staging` panel.
2. Run `OAT Images: Refresh Image Panel` from the Command Palette, or click the
   refresh button in the panel.
3. Confirm the visible queue reflects the current staged asset records.

Result:

The panel reloads staged records and thumbnail previews from the configured
ledger.

## Image Ledger Commands

Use these commands when `oatImages.ledgerApiUrl` points at the ledger Worker:

- `OAT Images: Intake URL`
- `OAT Images: Intake Local File`
- `OAT Images: Create Review Image Need`
- `OAT Images: List Open Image Needs`
- `OAT Images: List Staged Notebook Images`
- `OAT Images: List Planned Image Placements`
- `OAT Images: Prepare Planned Placement Run`
- `OAT Images: Execute Planned Placement Run`

The prepare command copies placement instructions. It does not yet execute the
file, Git, or editor side effects.

## Legacy Image Staging Sheet Columns

When `oatImages.ledgerApiUrl` is not configured, the image staging panel can
still fall back to the legacy sheet path and expects `Sheet1` columns `A:L`.
This is a compatibility path, not the target architecture. New image pipeline
work should use ledger records instead of sheet rows.

| Column | Field |
|--------|-------|
| A | Date |
| B | Name |
| C | URL |
| D | Photographer |
| E | License |
| F | Substack Post Title |
| G | Attribution String |
| H | status |
| I | placed_in |
| J | placed_date |
| K | target |
| L | image_src |

Rows with `status` set to `staged` appear in the legacy panel. Legacy placement
updates `status`, `placed_in`, `placed_date`, and `target`. The ledger-native path
uses `asset`, `asset_placement`, and `asset_saga` records instead.

## Operational Checks

Use these quick checks when the workflow feels stuck:

- If table promotion does not start, confirm the active editor is markdown and
  `oatTables.workerUrl` is set.
- If table images are missing, confirm the screenshot script path and local
  browser setup are working.
- If generated or placed images are not available through raw GitHub URLs,
  confirm the asset repo commit and push succeeded.
- If the current image panel is empty, confirm the sheet ID and that rows use
  `status = staged`. In the ledger target, confirm the ledger has staged records.
- If image thumbnails do not resolve, confirm `image_src`, the source URL, and
  the optional Unsplash access key.
- If legacy sheet updates fail, confirm the service account credentials can
  access the configured Google Sheet. In the ledger target, this failure mode goes
  away.
