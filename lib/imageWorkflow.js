'use strict';
const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const cp     = require('child_process');
const vscode = require('vscode');

function imagesRepo() {
  return vscode.workspace.getConfiguration('oat').get('imagesRepoPath', '')
    || path.join(process.env.HOME, 'dev', 'images');
}

// ── Place ────────────────────────────────────────────────────────────────────

async function placeImage({ image, target, partNum, slug, figNum }) {
  const series = 'water-series';
  const partDir = `part-${partNum}`;
  const imageDir = path.join(imagesRepo(), series, partDir, slug);

  fs.mkdirSync(imageDir, { recursive: true });
  fs.writeFileSync(path.join(imageDir, 'url.txt'),          image.url          || '');
  fs.writeFileSync(path.join(imageDir, 'photographer.txt'), image.photographer || '');
  fs.writeFileSync(path.join(imageDir, 'license.txt'),      image.license      || '');

  const downloadSrc = image.imageSrc || image.thumbUrl || image.url;
  const ext = guessExt(downloadSrc);
  const rawBase = `https://raw.githubusercontent.com/owencorpening/images/main/${series}/${partDir}/${slug}`;
  const imageUrl = `${rawBase}/${slug}${ext}`;

  // Attempt download — non-fatal if it fails
  try {
    await download(downloadSrc, path.join(imageDir, `${slug}${ext}`));
  } catch {
    vscode.window.showWarningMessage(
      `OAT: Could not download image — add ${slug}${ext} to the images repo manually.`
    );
  }

  const snippet = buildSnippet({ target, imageUrl, name: image.name, figNum, attribution: image.attribution, photographer: image.photographer, license: image.license });

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
    await gitPush(imagesRepo(), slug, series, partDir);
  } catch (err) {
    vscode.window.showWarningMessage(`OAT: Image placed but git push failed — ${err.message}`);
  }
}

function buildSnippet({ target, imageUrl, name, figNum, attribution, photographer, license }) {
  const desc = humanize(name);
  const attr = attribution || `Image by ${photographer}, ${license}.`;
  switch (target) {
    case 'substack':
      return `<figure>\n  <img src="${imageUrl}" width="700" alt="${desc}">\n  <figcaption>Figure ${figNum}: ${attr}</figcaption>\n</figure>`;
    case 'carousel':
      return `![bg left:40%](${imageUrl})`;
    case 'linkedin-post':
      return `Image URL: ${imageUrl}\nPhotographer: ${photographer} | License: ${license}\n(Attach manually in LinkedIn editor.)`;
    default:
      return imageUrl;
  }
}

function humanize(s) {
  return (s || '').replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
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

function gitPush(repoPath, slug, series, partDir) {
  return new Promise((resolve, reject) => {
    const relPath = `${series}/${partDir}/${slug}`;
    const cmd = `git add "${relPath}" && git commit -m "add ${slug}" && git push`;
    cp.exec(cmd, { cwd: repoPath }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve();
    });
  });
}

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
