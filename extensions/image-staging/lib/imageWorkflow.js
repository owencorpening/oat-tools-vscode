'use strict';
const path   = require('path');
const vscode = require('vscode');
const { normalizeImageRecord } = require('./imageRecord');
const { createPlacedAsset, downloadAsset, gitPushAsset, removePlacedAssetBySourceUrl } = require('./imageAssetsRepo');
const { buildSnippet } = require('./snippetBuilder');

function imagesRepo() {
  return getSetting('imagesRepoPath', '')
    || path.join(process.env.HOME, 'dev', 'images');
}

function getSetting(key, defaultValue) {
  const imageValue = vscode.workspace.getConfiguration('oatImages').get(key, undefined);
  if (imageValue !== undefined && imageValue !== '') return imageValue;
  return vscode.workspace.getConfiguration('oat').get(key, defaultValue);
}

// ── Place ────────────────────────────────────────────────────────────────────

async function placeImage({ image, target, partNum, slug, figNum }) {
  const record = normalizeImageRecord({ ...image, slug, target, figureNumber: figNum });
  const series = 'water-series';
  const partDir = `part-${partNum}`;
  const repoPath = imagesRepo();
  const asset = createPlacedAsset({ repoPath, image: record, series, partDir, slug });

  // Attempt download — non-fatal if it fails
  try {
    await downloadAsset({ url: asset.downloadSrc, dest: asset.imagePath });
  } catch {
    vscode.window.showWarningMessage(
      `OAT: Could not download image — add ${path.basename(asset.imagePath)} to the images repo manually.`
    );
  }

  const snippet = buildSnippet({
    target,
    imageUrl: asset.imageUrl,
    displayName: record.displayName,
    figNum,
    attribution: record.attribution,
    photographer: record.photographer,
    license: record.license
  });

  if (target === 'linkedin-post') {
    await vscode.env.clipboard.writeText(snippet);
    vscode.window.showInformationMessage('OAT: LinkedIn snippet copied to clipboard — attach image manually.');
  } else {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await editor.edit(eb => eb.insert(editor.selection.active, snippet + '\n'));
    } else {
      await vscode.env.clipboard.writeText(snippet);
      vscode.window.showInformationMessage('OAT: No active editor — snippet copied to clipboard.');
    }
  }

  try {
    await gitPushAsset(repoPath, asset.relPath, slug);
  } catch (err) {
    vscode.window.showWarningMessage(`OAT: Image placed but git push failed — ${err.message}`);
  }
}

// ── Discard placed ───────────────────────────────────────────────────────────

async function discardPlaced(image) {
  const record = normalizeImageRecord(image);
  const series = 'water-series';
  const result = removePlacedAssetBySourceUrl({
    repoPath: imagesRepo(),
    series,
    placedIn: image.placed_in,
    sourceUrl: record.sourceUrl
  });

  if (result.status === 'missing-part-dir') {
    vscode.window.showWarningMessage(
      `OAT: Part directory not found: ${result.partDir} — remove image folder manually.`
    );
    return;
  }

  if (result.status === 'no-match') {
    vscode.window.showWarningMessage(
      `OAT: No matching folder found in ${result.partDir}. Remove manually.`
    );
    return;
  }

  if (result.status === 'multiple-matches') {
    vscode.window.showWarningMessage(
      `OAT: Multiple matches in ${result.partDir}: ${result.matches.join(', ')}. Remove manually.`
    );
    return;
  }

  vscode.window.showInformationMessage(
    `OAT: Removed ${result.slug} from images repo. Remove the markdown reference from the article manually.`
  );
}

module.exports = { placeImage, discardPlaced };
