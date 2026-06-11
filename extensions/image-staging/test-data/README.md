# Ad-Hoc Test Data for Image Staging Extension

This folder contains realistic test data for manual testing of the image-staging extension in VSCode.

## Folder Structure

```
test-data/
├── README.md                    # This file
├── downloads/                   # Simulated Downloads folder (copy to ~/Downloads for testing)
│   ├── water-droplet-unsplash.png
│   ├── ocean-wave-pexels.png
│   ├── solar-panel-getty.png
│   ├── wind-turbine-shutterstock.png
│   ├── forest-landscape.png
│   └── ChatGPT Image Jun 10 2026, 03_22_45 PM.png
└── repo/                        # Local test repo structure
    ├── substack-ideas/
    │   ├── water-series/
    │   │   └── part-01-intro.md
    │   └── energy-series/
    │       └── part-02-solar.md
    └── carousels/
        └── ocean-carousel.md
```

## How to Use

### Setup

1. Copy the `repo/` folder structure somewhere on your machine:
   ```bash
   cp -r extensions/image-staging/test-data/repo ~/test-repo-oat
   ```

2. Copy test images to your Downloads folder:
   ```bash
   cp extensions/image-staging/test-data/downloads/* ~/Downloads/
   ```

3. Open VSCode with the test repo:
   ```bash
   code ~/test-repo-oat
   ```

### Manual Test Workflows

#### 1. Search + Stage + Place (Substack)

1. Open `repo/substack-ideas/water-series/part-01-intro.md`
2. In the OAT Images panel, search for "water" or "solar"
3. Click "Stage" on a result from Downloads
4. Verify image appears in "Staged Images" section
5. Click "Place Figure" to insert into the markdown
6. Verify:
   - Figure snippet appears in editor
   - Figure number is "1" (first figure)
   - Success message shows "Placed Figure 1 for..."

#### 2. Multiple Placements

1. Keep the same markdown file open
2. Stage and place another image
3. Verify:
   - Second image gets Figure 2
   - Both snippets are in the document
   - Figure numbers auto-increment

#### 3. Carousel Placement

1. Open `repo/carousels/ocean-carousel.md`
2. Stage an image
3. Click "Place Figure"
4. Verify:
   - Placement target is "carousel" (not "substack")
   - Snippet format is for Marp (different from HTML figure)
   - Figure number is "1"

#### 4. Discard Workflow

1. Stage an image (don't place it)
2. Click "Discard" button
3. Verify:
   - Confirmation dialog appears
   - Image disappears from staged list

#### 5. ChatGPT Image Detection

1. Search for "chatgpt" 
2. Select the "ChatGPT Image Jun 10 2026..." file
3. Verify:
   - Marked as "AI generated"
   - Suggests tool as "ChatGPT"
   - Status shows appropriate provenance hint

### Test Image Files

- `water-droplet-unsplash.png` — Generic image, source hint will suggest Unsplash
- `ocean-wave-pexels.png` — Generic image, source hint will suggest Pexels
- `solar-panel-getty.png` — Generic image, source hint will suggest Getty
- `wind-turbine-shutterstock.png` — Generic image, source hint will suggest Shutterstock
- `forest-landscape.png` — Generic image, no source hint
- `ChatGPT Image Jun 10 2026, 03_22_45 PM.png` — Special case for AI-generated detection

All images are minimal 1x1 PNG files for testing filename parsing, not image display.

### Checklist for Full Workflow Test

- [ ] Search for image in Downloads
- [ ] View search results with provenance hints
- [ ] Stage image from search results
- [ ] Verify staged image appears in panel
- [ ] Place image in Substack article
- [ ] Verify figure snippet in editor
- [ ] Verify figure number is correct
- [ ] Place another image and verify numbering increments
- [ ] Test placement in carousel.md
- [ ] Discard an image
- [ ] Verify ChatGPT image is properly detected

### Cleanup

After testing, remove the test images from your Downloads folder:

```bash
rm ~/Downloads/water-droplet-unsplash.png
rm ~/Downloads/ocean-wave-pexels.png
rm ~/Downloads/solar-panel-getty.png
rm ~/Downloads/wind-turbine-shutterstock.png
rm ~/Downloads/forest-landscape.png
rm "~/Downloads/ChatGPT Image Jun 10 2026, 03_22_45 PM.png"
```

Or remove the entire test repo:

```bash
rm -rf ~/test-repo-oat
```

## Notes

- Images are intentionally minimal (1x1 PNG) to test metadata parsing, not rendering
- File names are realistic and include various provider hints for testing filename analysis
- The repo structure mirrors the actual Substack structure used in the real project
- This test data can be extended with additional files as new workflows are identified
