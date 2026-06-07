# Asset Provenance Validator

Checks final asset folders for required OAT provenance files.

Required files:

- `url.txt`
- `license.txt`
- `photographer.txt`

## Usage

```bash
npm run validate:assets
```

Check a specific asset root:

```bash
npm run validate:assets -- ~/dev/images
```

Check a section:

```bash
npm run validate:assets -- ~/dev/images --section water-series/part-09
```

JSON output:

```bash
npm run validate:assets -- ~/dev/images --json
```

Defaults:

- Asset root: `OAT_ASSET_REPO_PATH`, then `~/dev/images`

The validator only checks directories that contain image files. It exits with a
non-zero status when any asset folder is missing required provenance.
