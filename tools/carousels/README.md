# Carousel Export

Exports Marp carousel markdown to PDF using the OAT content standards theme.

## Usage

```bash
npm run export:carousel -- path/to/article-carousel.md
```

With local image paths:

```bash
npm run export:carousel -- path/to/article-carousel.md --allow-local-files
```

Dry run:

```bash
npm run export:carousel -- path/to/article-carousel.md --dry-run
```

Defaults:

- Theme: `OAT_STANDARDS_PATH/Applied-Thinking.css`, then
  `~/dev/wraith/standards/Applied-Thinking.css`
- Output: same directory and basename as the input, with `.pdf`
- Marp executable: `MARP_BIN`, then `marp`

This wrapper does not install Marp. It standardizes the command used by the
publishing workflow.
