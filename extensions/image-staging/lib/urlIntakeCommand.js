'use strict';

const crypto = require('crypto');
const ledger = require('./assetLedgerD1');
const intake = require('./imageIntake');

function registerUrlIntakeCommand(context, vscode, options = {}) {
  context.subscriptions.push(
    vscode.commands.registerCommand('oatImages.intakeUrl', () =>
      intakeUrl({ vscode, ...options })
    )
  );
}

async function intakeUrl({ vscode, db, assetLedger = ledger, imageIntake = intake, idFactory = defaultIds } = {}) {
  const url = await vscode.window.showInputBox({
    prompt: 'Source URL',
    validateInput: value => isHttpUrl(value) ? null : 'Enter an http(s) URL'
  });
  if (!url) return null;

  const imageSrc = await vscode.window.showInputBox({
    prompt: 'Direct image URL (optional)'
  });
  const displayName = await vscode.window.showInputBox({
    prompt: 'Display name',
    value: displayNameFromUrl(url),
    validateInput: value => value && value.trim() ? null : 'Required'
  });
  if (!displayName) return null;

  const photographer = await vscode.window.showInputBox({
    prompt: 'Photographer / creator (optional)'
  });
  const license = await vscode.window.showInputBox({
    prompt: 'License / rights status (optional)'
  });
  const attribution = await vscode.window.showInputBox({
    prompt: 'Attribution string (optional)'
  });
  const intakeSection = await vscode.window.showInputBox({
    prompt: 'Intake section (optional)',
    placeHolder: 'water-series/part-09'
  });

  const asset = imageIntake.fromUrl({
    id: idFactory.assetId({ url, displayName }),
    url: url.trim(),
    imageSrc: optionalHttpUrl(imageSrc),
    displayName: displayName.trim(),
    photographer: emptyToUndefined(photographer),
    license: emptyToUndefined(license),
    attribution: emptyToUndefined(attribution),
    intakeSection: emptyToUndefined(intakeSection)
  });

  if (db) {
    await assetLedger.createAsset(db, asset);
    vscode.window.showInformationMessage(`OAT: Staged URL asset: ${asset.displayName}.`);
  } else {
    await vscode.env.clipboard.writeText(JSON.stringify({ asset }, null, 2));
    vscode.window.showInformationMessage('OAT: D1 URL intake copied as JSON; configure a ledger writer to save it directly.');
  }

  return { asset };
}

function displayNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname;
    return last.replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, char => char.toUpperCase());
  } catch {
    return '';
  }
}

function optionalHttpUrl(value) {
  const clean = emptyToUndefined(value);
  if (!clean) return undefined;
  return isHttpUrl(clean) ? clean : undefined;
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function emptyToUndefined(value) {
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  return String(value).trim();
}

const defaultIds = {
  assetId({ url, displayName }) {
    return `asset_${shortHash(`${url}:${displayName}:${Date.now()}`)}`;
  }
};

function shortHash(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 16);
}

module.exports = {
  registerUrlIntakeCommand,
  intakeUrl,
  displayNameFromUrl,
  optionalHttpUrl,
  isHttpUrl,
  emptyToUndefined,
  defaultIds
};
