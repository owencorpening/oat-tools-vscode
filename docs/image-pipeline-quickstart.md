# Image Notebook Quickstart

Use this when you want the shortest path from an image idea to a planned image
placement.

The image notebook is where the tool tracks possible images, why you need them,
where they should go, and what should happen next.

Current limit: today this flow prepares placement instructions. It does not yet
move files, edit your draft, commit to Git, or mark the image fully placed.

## Setup

1. Ask Codex to start the image notebook service, or point VS Code at an already
   running one.
2. Set `oatImages.ledgerApiUrl` in VS Code.
3. Optionally set `oatImages.ledgerApiToken`.
4. Optionally set `oatImages.imagesRepoPath`; otherwise the prepare command uses
   `~/dev/images`.
5. Open the target markdown draft in VS Code.

## The Short Flow

```mermaid
flowchart LR
  A[Add image] --> B[Review staged image]
  B --> C[Click Place]
  C --> D[Create planned placement]
  D --> E[List planned placements]
  E --> F[Copy placement instructions]
  F --> G[Later: place image in draft and repo]
```

## Seven Frames

Frame 1: Add an image to the notebook.

- For a web image, run `OAT Images: Intake URL`.
- For a local image, run `OAT Images: Intake Local File`.
- For a late-review visual gap, run `OAT Images: Create Review Image Need`.

Frame 2: Open the staging panel.

- Open the `OAT Image Staging` activity bar view.
- Run `OAT Images: Refresh Image Panel` if the panel looks stale.
- With `oatImages.ledgerApiUrl` set, the panel reads staged images from the
  notebook.

Frame 3: Plan a placement.

- Open the target markdown draft.
- In the image panel, click `Place` on a staged image.
- Pick `substack`, `carousel`, or `linkedin-post`.
- Enter the figure number or handoff label.

Frame 4: Confirm the planned work exists.

- Run `OAT Images: List Planned Image Placements`.
- Pick a placement to copy its notebook record if you want to inspect it.

Frame 5: Copy placement instructions.

- Run `OAT Images: Prepare Planned Placement Run`.
- Pick the planned placement.
- The command copies placement instructions to the clipboard.

Frame 6: Know what the instructions are for.

The copied instructions are for the next automation step. They include:

- where the image repo lives
- which image to place
- where it should go
- which planned placement should be updated
- whether the automation should download and commit the image

Frame 7: Stop before side effects.

This is the current safe stopping point. The next implementation step is a
guarded local command that consumes the placement instructions, writes asset
files, commits and pushes them, inserts or replaces the draft snippet, and marks
the placement as done.

## Most Common Path

1. Run `OAT Images: Intake URL`.
2. Open `OAT Image Staging`.
3. Click `Place` on the staged image.
4. Run `OAT Images: Prepare Planned Placement Run`.
5. Keep the copied placement instructions for the next automation step.

## Command Cheat Sheet

| Goal | Command |
|------|---------|
| Add a web image | `OAT Images: Intake URL` |
| Add a local image | `OAT Images: Intake Local File` |
| Record a late visual gap | `OAT Images: Create Review Image Need` |
| Refresh the panel | `OAT Images: Refresh Image Panel` |
| See open needs | `OAT Images: List Open Image Needs` |
| See staged images | `OAT Images: List Staged Notebook Images` |
| See planned placements | `OAT Images: List Planned Image Placements` |
| Copy placement instructions | `OAT Images: Prepare Planned Placement Run` |

## If Something Feels Off

- No staged assets: confirm `oatImages.ledgerApiUrl` is set and the notebook
  service is running.
- Panel is showing legacy sheet records: `oatImages.ledgerApiUrl` is probably
  empty.
- Prepare command has no placements: click `Place` on a staged image first.
- Placement instructions have the wrong repo path: set
  `oatImages.imagesRepoPath`.

## Technical Translation

- Image notebook = the human-facing image ledger.
- The publishing ledger is backed by Cloudflare D1 in this stack.
- The notebook service is the ledger Worker.
- Placement instructions are JSON shaped for `imagePipeline.placeAsset`.
- The final placement automation is still the next thing to build.

## Where To Read More

- [use-cases.md](use-cases.md) explains the workflows in more detail.
- [image-pipeline-architecture.md](image-pipeline-architecture.md) explains the
  data model, saga, and repo boundaries.
- [../tools/d1/README.md](../tools/d1/README.md) explains the Cloudflare D1
  Worker setup.
