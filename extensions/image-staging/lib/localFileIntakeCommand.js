'use strict';

const crypto = require('crypto');
const path = require('path');
const ledger = require('./assetLedgerD1');
const intake = require('./imageIntake');

const SOURCE_KINDS = [
  { label: 'Downloads file', value: 'downloads' },
  { label: 'AI-generated file', value: 'ai-generated' },
  { label: 'User-provided file', value: 'user-provided' }
];

function registerLocalFileIntakeCommand(context, vscode, options = {}) {
  context.subscriptions.push(
    vscode.commands.registerCommand('oatImages.intakeLocalFile', () =>
      intakeLocalFile({ vscode, ...options })
    )
  );
}

async function intakeLocalFile({ vscode, db, ledgerWriter, assetLedger = ledger, imageIntake = intake, idFactory = defaultIds } = {}) {
  const pickedFile = await pickLocalFile(vscode);
  if (!pickedFile) return null;

  const sourceKind = await pickSourceKind(vscode);
  if (!sourceKind) return null;

  const displayName = await vscode.window.showInputBox({
    prompt: 'Display name',
    value: displayNameFromPath(pickedFile),
    validateInput: value => value && value.trim() ? null : 'Required'
  });
  if (!displayName) return null;

  const sourceUrl = await vscode.window.showInputBox({
    prompt: 'Source URL (optional)'
  });
  const photographer = await vscode.window.showInputBox({
    prompt: 'Photographer / creator',
    value: sourceKind === 'ai-generated' ? 'Owen Corpening' : ''
  });
  const license = await vscode.window.showInputBox({
    prompt: 'License / rights status'
  });
  const intakeSection = await vscode.window.showInputBox({
    prompt: 'Intake section (optional)',
    placeHolder: 'water-series/part-09'
  });

  const assetInput = {
    id: idFactory.assetId({ filePath: pickedFile, displayName }),
    filePath: pickedFile,
    displayName: displayName.trim(),
    sourceUrl: emptyToUndefined(sourceUrl),
    photographer: emptyToUndefined(photographer),
    license: emptyToUndefined(license),
    intakeSection: emptyToUndefined(intakeSection)
  };
  if (sourceKind === 'ai-generated' && !assetInput.photographer) {
    delete assetInput.photographer;
  }
  const asset = await buildAssetFromLocalFile(imageIntake, sourceKind, assetInput);

  if (ledgerWriter) {
    await ledgerWriter.saveAsset({ asset });
    vscode.window.showInformationMessage(`OAT: Staged local asset: ${asset.displayName}.`);
  } else if (db) {
    await assetLedger.createAsset(db, asset);
    vscode.window.showInformationMessage(`OAT: Staged local asset: ${asset.displayName}.`);
  } else {
    await vscode.env.clipboard.writeText(JSON.stringify({ asset }, null, 2));
    vscode.window.showInformationMessage('OAT: Image notebook asset copied as JSON; configure a ledger writer to save it directly.');
  }

  return { asset };
}

async function buildAssetFromLocalFile(imageIntake, sourceKind, input) {
  switch (sourceKind) {
    case 'downloads':
      return imageIntake.fromDownloadsFile(input);
    case 'ai-generated':
      return imageIntake.fromAiGeneratedFile(input);
    case 'user-provided':
      return imageIntake.fromUserFile(input);
    default:
      throw new Error(`Unsupported local file source kind: ${sourceKind}`);
  }
}

async function pickLocalFile(vscode) {
  const uris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      Images: ['png', 'jpg', 'jpeg', 'webp', 'gif']
    },
    title: 'Select image file to intake'
  });
  if (!uris || uris.length === 0) return null;
  return uris[0].fsPath;
}

async function pickSourceKind(vscode) {
  const picked = await vscode.window.showQuickPick(
    SOURCE_KINDS.map(kind => kind.label),
    { placeHolder: 'Local file source' }
  );
  const match = SOURCE_KINDS.find(kind => kind.label === picked);
  return match && match.value;
}

function displayNameFromPath(filePath) {
  return path.basename(filePath).replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, char => char.toUpperCase());
}

function emptyToUndefined(value) {
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  return String(value).trim();
}

const defaultIds = {
  assetId({ filePath, displayName }) {
    return `asset_${shortHash(`${filePath}:${displayName}:${Date.now()}`)}`;
  }
};

function shortHash(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 16);
}

module.exports = {
  registerLocalFileIntakeCommand,
  intakeLocalFile,
  buildAssetFromLocalFile,
  displayNameFromPath,
  emptyToUndefined,
  defaultIds
};
