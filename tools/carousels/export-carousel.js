#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function usage() {
  console.log(`Usage:
  node tools/carousels/export-carousel.js <carousel.md> [options]

Options:
  --output <pdf>           Output PDF path. Defaults to <carousel>.pdf.
  --theme <css>            Marp theme CSS. Defaults to OAT standards theme.
  --marp <command>         Marp executable. Defaults to MARP_BIN or marp.
  --allow-local-files      Pass --allow-local-files to Marp.
  --dry-run                Print the Marp command without running it.
  -h, --help               Show this help.

Environment:
  OAT_STANDARDS_PATH       Standards repo path. Defaults to ~/dev/wraith/standards.
  MARP_BIN                 Marp executable override.`);
}

function expandHome(value) {
  if (!value) return value;
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return value;
}

function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
    theme: null,
    marp: process.env.MARP_BIN || 'marp',
    allowLocalFiles: false,
    dryRun: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '--output':
        args.output = argv[++i];
        break;
      case '--theme':
        args.theme = argv[++i];
        break;
      case '--marp':
        args.marp = argv[++i];
        break;
      case '--allow-local-files':
        args.allowLocalFiles = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      default:
        if (arg.startsWith('--')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        if (args.input) {
          throw new Error(`Unexpected extra argument: ${arg}`);
        }
        args.input = arg;
    }
  }

  return args;
}

function defaultThemePath() {
  const standardsPath = process.env.OAT_STANDARDS_PATH
    || path.join(os.homedir(), 'dev', 'wraith', 'standards');
  return path.join(standardsPath, 'Applied-Thinking.css');
}

function defaultOutputPath(input) {
  const parsed = path.parse(input);
  return path.join(parsed.dir, `${parsed.name}.pdf`);
}

function quoteForDisplay(value) {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`OAT carousel export: ${err.message}`);
    usage();
    process.exit(2);
  }

  if (args.help) {
    usage();
    return;
  }

  if (!args.input) {
    usage();
    process.exit(2);
  }

  const input = path.resolve(expandHome(args.input));
  const output = path.resolve(expandHome(args.output || defaultOutputPath(input)));
  const theme = path.resolve(expandHome(args.theme || defaultThemePath()));

  if (!fs.existsSync(input)) {
    console.error(`OAT carousel export: input not found: ${input}`);
    process.exit(1);
  }

  if (!fs.existsSync(theme)) {
    console.error(`OAT carousel export: theme not found: ${theme}`);
    process.exit(1);
  }

  const marpArgs = [
    input,
    '--theme',
    theme,
    '--output',
    output
  ];

  if (args.allowLocalFiles) {
    marpArgs.push('--allow-local-files');
  }

  const display = [args.marp, ...marpArgs].map(quoteForDisplay).join(' ');
  if (args.dryRun) {
    console.log(display);
    return;
  }

  const result = spawnSync(args.marp, marpArgs, { stdio: 'inherit' });
  if (result.error) {
    console.error(`OAT carousel export: failed to run ${args.marp}: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status ?? 0);
}

main();
