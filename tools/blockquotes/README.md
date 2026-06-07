# Blockquote Renderer

Renders body markdown blockquotes into OAT-styled PNG images. This supports the
content standard that body blockquotes are replaced with designed image assets
before publishing to Substack.

## Usage

```bash
python tools/blockquotes/blockquote-renderer.py path/to/post.md
```

Optional target controls:

```bash
python tools/blockquotes/blockquote-renderer.py path/to/post.md \
  --asset-repo ~/dev/images \
  --section water-series/part-09 \
  --slug water-part-09-corridors
```

Defaults:

- Asset repo: `OAT_ASSET_REPO_PATH`, then `~/dev/images`
- Section: `standalone`
- Slug: markdown filename without extension

Output:

```text
[asset repo]/[section]/[slug]/blockquotes/blockquote-01.png
```

After rendering, commit the generated PNGs in the asset repo and replace the
body blockquote in the Substack editor with the raw GitHub image URL. Alt text
should be the verbatim blockquote text.
