# OAT Tools Use Cases

This is the single workflow guide for the OAT VS Code tools. Use it to decide
which extension to use, why that extension exists, and what steps to follow for
the common publishing jobs.

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

`OAT Image Staging` currently reads from a Google Sheet, but the target
architecture replaces the image staging sheet with a Cloudflare D1 asset ledger.
Do not add new image workflow dependencies on Sheets.

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

This is a pipeline requirement, not fully implemented in the current panel.
Use it when the image starts outside the D1 asset ledger, especially in
`~/Downloads`.

Common sources:

- Obvious AI-generated files such as `chatgpt*.png`.
- Downloaded images with useful metadata in the filename, such as date,
  timestamp, source, or prompt fragments.
- Local images without provenance.
- A user-provided image that should be placed spontaneously.
- A final-review image hunt triggered by a dense passage in the draft.

Expected steps:

1. Choose or detect the local image file.
2. Infer a proposed image name and any metadata from the filename.
3. Ask for missing provenance: source URL, creator or photographer, and license.
4. Normalize the image into the same record shape as a D1 asset record.
5. Move the image into the correct folder in the asset repo.
6. Write `url.txt`, `license.txt`, and `photographer.txt`.
7. Continue through the normal placement flow for Substack, carousel, or
   LinkedIn handoff.

Result:

Images that did not come from the normal capture flow can still enter
the publishing pipeline without losing provenance or leaving finished assets in
`~/Downloads`.

## Use Case: Add an Image During Final Review

This is a pipeline requirement, not fully implemented in the current panel.
Use it when final review reveals that a section is too dense and needs a visual
anchor before publication.

Expected steps:

1. Select the dense passage, image placeholder, or insertion point in the draft.
2. Create an image need with a short reason, such as `visual break`,
   `concept diagram`, `map`, `sourced photo`, or `data figure`.
3. Choose the intake path:
   - Use an existing staged asset.
   - Search for and capture a new sourced image.
   - Use a local image from `~/Downloads`.
   - Use or generate an AI image.
   - Promote a markdown table if the need is actually tabular data.
4. Capture or confirm provenance.
5. Place the image through the normal Substack, carousel, or LinkedIn flow.

Result:

Final-review visual gaps become tracked image records instead of ad hoc manual
edits. The draft gets relief from dense text while D1 and the asset repo
preserve source, license, and placement status.

## Use Case: Place a Staged Image in a Draft

Use `OAT Image Staging` when an image has already been captured in the image
ledger and is ready to appear in an article, carousel, or LinkedIn handoff.

Steps:

1. Open the target draft in VS Code.
2. Open the `OAT Image Staging` activity bar panel.
3. Click refresh if the staged images do not load automatically.
4. Review the thumbnail, photographer, license, and URL for the image.
5. Click `Place`.
6. Choose the publishing target: `substack`, `carousel`, or `linkedin-post`.
7. Confirm or enter the part number.
8. Confirm or edit the image slug.
9. Enter the figure number.
10. Review the inserted snippet or copied LinkedIn handoff text.

What the tool does:

- Reads the staging ledger and shows records where `status` is `staged`.
- Resolves a thumbnail from `image_src`, a direct image URL, Unsplash, or page
  metadata.
- Creates a folder in the asset repo for the placed image.
- Stores source, photographer, and license metadata files next to the image.
- Downloads the image when possible.
- Creates a target-specific snippet.
- Inserts the snippet into the active editor, or copies it to the clipboard when
  the target requires manual placement.
- Commits and pushes the new image files.
- Marks the asset as `placed`, records `placed_in`, `placed_date`, and records
  the target.

Result:

The draft or clipboard receives the right publishing snippet, the asset repo
contains the placed asset and metadata, and the ledger records that the image has
been handled.

## Use Case: Prepare a LinkedIn Image Handoff

Use `OAT Image Staging` with the `linkedin-post` target when the image should be
tracked and hosted, but the final post must be assembled in LinkedIn manually.

Steps:

1. Open the `OAT Image Staging` panel.
2. Click `Place` on the staged image.
3. Choose `linkedin-post`.
4. Enter the part number, slug, and figure number.
5. Paste the copied handoff text wherever the LinkedIn post is being prepared.
6. Attach the image manually in the LinkedIn editor.

Result:

The image is committed to the asset repo, attribution is copied in a compact
handoff format, and the ledger is updated as placed for LinkedIn.

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

## Legacy Image Staging Sheet Columns

The current image staging panel still expects `Sheet1` columns `A:L`. This is a
migration detail, not the target architecture. New image pipeline work should use
Cloudflare D1 records instead of sheet rows.

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

Rows with `status` set to `staged` appear in the current panel. Placement
updates `status`, `placed_in`, `placed_date`, and `target`. The D1 migration
should import or mirror these fields, then retire the sheet dependency.

## Operational Checks

Use these quick checks when the workflow feels stuck:

- If table promotion does not start, confirm the active editor is markdown and
  `oatTables.workerUrl` is set.
- If table images are missing, confirm the screenshot script path and local
  browser setup are working.
- If generated or placed images are not available through raw GitHub URLs,
  confirm the asset repo commit and push succeeded.
- If the current image panel is empty, confirm the sheet ID and that rows use
  `status = staged`. In the D1 target, confirm the ledger has staged records.
- If image thumbnails do not resolve, confirm `image_src`, the source URL, and
  the optional Unsplash access key.
- If legacy sheet updates fail, confirm the service account credentials can
  access the configured Google Sheet. In the D1 target, this failure mode goes
  away.
