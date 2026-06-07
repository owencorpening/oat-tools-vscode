#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const IMAGE_EXTS = new Set([
  '.apng', '.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'
]);

const REQUIRED_PROVENANCE = ['url.txt', 'license.txt', 'photographer.txt'];

function usage() {
  console.log(`Usage:
  node tools/assets/validate-provenance.js [asset-root] [options]

Options:
  --section <path>         Limit scan to a section under the asset root.
  --json                   Print JSON report.
  --quiet                  Only print summary.
  -h, --help               Show this help.

Environment:
  OAT_ASSET_REPO_PATH      Asset repo root. Defaults to ~/dev/images.`);
}

function expandHome(value) {
  if (!value) return value;
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return value;
}

function parseArgs(argv) {
  const args = {
    root: process.env.OAT_ASSET_REPO_PATH || path.join(os.homedir(), 'dev', 'images'),
    section: null,
    json: false,
    quiet: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '--section':
        args.section = argv[++i];
        break;
      case '--json':
        args.json = true;
        break;
      case '--quiet':
        args.quiet = true;
        break;
      default:
        if (arg.startsWith('--')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        if (args.rootFromArg) {
          throw new Error(`Unexpected extra argument: ${arg}`);
        }
        args.root = arg;
        args.rootFromArg = true;
    }
  }

  return args;
}

function isImageFile(fileName) {
  return IMAGE_EXTS.has(path.extname(fileName).toLowerCase());
}

function isIgnoredDir(name) {
  return name === '.git' || name === 'node_modules' || name === '__pycache__';
}

function readDirSafe(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return [];
  }
}

function scan(root) {
  const assetDirs = [];

  function visit(dir) {
    const entries = readDirSafe(dir);
    if (entries.length === 0) return;

    const imageFiles = entries
      .filter(entry => entry.isFile() && isImageFile(entry.name))
      .map(entry => entry.name);

    if (imageFiles.length > 0) {
      const present = new Set(
        entries
          .filter(entry => entry.isFile())
          .map(entry => entry.name)
      );
      const missing = REQUIRED_PROVENANCE.filter(file => !present.has(file));
      assetDirs.push({
        path: dir,
        relPath: path.relative(root, dir) || '.',
        imageFiles,
        missing
      });
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || isIgnoredDir(entry.name)) continue;
      visit(path.join(dir, entry.name));
    }
  }

  visit(root);
  return assetDirs;
}

function printTextReport(root, records, quiet) {
  const checked = records.length;
  const failing = records.filter(record => record.missing.length > 0);

  if (!quiet) {
    for (const record of records) {
      if (record.missing.length === 0) continue;
      console.log(`${record.relPath}`);
      console.log(`  images: ${record.imageFiles.join(', ')}`);
      console.log(`  missing: ${record.missing.join(', ')}`);
    }
  }

  console.log(
    `Checked ${checked} asset folder${checked === 1 ? '' : 's'} under ${root}. ` +
    `${failing.length} missing provenance.`
  );
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`OAT asset provenance: ${err.message}`);
    usage();
    process.exit(2);
  }

  if (args.help) {
    usage();
    return;
  }

  const assetRoot = path.resolve(expandHome(args.root));
  const scanRoot = path.resolve(assetRoot, expandHome(args.section || ''));

  if (!fs.existsSync(scanRoot)) {
    console.error(`OAT asset provenance: path not found: ${scanRoot}`);
    process.exit(1);
  }

  const records = scan(scanRoot);
  const failing = records.filter(record => record.missing.length > 0);
  const report = {
    assetRoot,
    scanRoot,
    checkedAssetFolders: records.length,
    failingAssetFolders: failing.length,
    failures: failing
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(scanRoot, records, args.quiet);
  }

  process.exit(failing.length > 0 ? 1 : 0);
}

main();
