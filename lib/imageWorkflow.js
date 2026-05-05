'use strict';
const fs   = require('fs');
const path = require('path');
const https = require('https');
const vscode = require('vscode');

function imagesRepo() {
  return vscode.workspace.getConfiguration('oat').get('imagesRepoPath', '')
    || path.join(process.env.HOME, 'dev', 'images');
}

// ── Place ────────────────────────────────────────────────────────────────────

async function placeImage({ image, target, partNum, slug, altText }) {
  const series = 'water-series';
  const partDir = `part-${partNum}`;
  const imageDir = path.join(imagesRepo(), series, partDir, slug);

  fs.mkdirSync(imageDir, { recursive: true });
  fs.writeFileSync(path.join(imageDir, 'url.txt'),          image.url          || '');
  fs.writeFileSync(path.join(imageDir, 'photographer.txt'), image.photographer || '');
  fs.writeFileSync(path.join(imageDir, 'license.txt'),      image.license      || '');

  const ext = guessExt(image.url);
  const rawBase = `https://raw.githubusercontent.com/owencorpening/images/main/${series}/${partDir}/${slug}`;
  const imageUrl = `${rawBase}/${slug}${ext}`;

  // Attempt download — non-fatal if it fails
  try {
    await download(image.url, path.join(imageDir, `${slug}${ext}`));
  } catch {
    vscode.window.showWarningMessage(
      `OAT: Could not download image — add ${slug}${ext} to the images repo manually.`
    );
  }

  const snippet = buildSnippet({ target, imageUrl, altText, photographer: image.photographer, license: image.license });

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
}

function buildSnippet({ target, imageUrl, altText, photographer, license }) {
  switch (target) {
    case 'substack':
      return `![${altText}](${imageUrl})\n*Photographer: ${photographer} | License: ${license}*`;
    case 'carousel':
      return `![bg left:40%](${imageUrl})`;
    case 'linkedin-post':
      return `Image URL: ${imageUrl}\nPhotographer: ${photographer} | License: ${license}\n(Attach manually in LinkedIn editor.)`;
    default:
      return imageUrl;
  }
}

// ── Discard placed ───────────────────────────────────────────────────────────

async function discardPlaced(image) {
  const series = 'water-series';
  const partDir = path.join(imagesRepo(), series, image.placed_in);

  if (!fs.existsSync(partDir)) {
    vscode.window.showWarningMessage(
      `OAT: Part directory not found: ${partDir} — remove image folder manually.`
    );
    return;
  }

  // Find image folder by matching url.txt content
  const matches = fs.readdirSync(partDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => {
      const urlFile = path.join(partDir, d.name, 'url.txt');
      return fs.existsSync(urlFile) &&
        fs.readFileSync(urlFile, 'utf8').trim() === (image.url || '').trim();
    })
    .map(d => d.name);

  if (matches.length === 0) {
    vscode.window.showWarningMessage(
      `OAT: No matching folder found in ${partDir}. Remove manually.`
    );
    return;
  }

  if (matches.length > 1) {
    vscode.window.showWarningMessage(
      `OAT: Multiple matches in ${partDir}: ${matches.join(', ')}. Remove manually.`
    );
    return;
  }

  fs.rmSync(path.join(partDir, matches[0]), { recursive: true, force: true });
  vscode.window.showInformationMessage(
    `OAT: Removed ${matches[0]} from images repo. Remove the markdown reference from the article manually.`
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function guessExt(url) {
  const m = (url || '').match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  return m ? `.${m[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg';
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = u => https.get(u, res => {
      if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
      if (res.statusCode !== 200) {
        file.destroy();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', err => { fs.unlink(dest, () => {}); reject(err); });
    }).on('error', err => { file.destroy(); reject(err); });
    get(url);
  });
}

module.exports = { placeImage, discardPlaced };
