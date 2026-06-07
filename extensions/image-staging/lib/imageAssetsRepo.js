'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const cp = require('child_process');

function createPlacedAsset({ repoPath, image, series = 'water-series', partDir, slug }) {
  const imageDir = path.join(repoPath, series, partDir, slug);
  fs.mkdirSync(imageDir, { recursive: true });

  fs.writeFileSync(path.join(imageDir, 'url.txt'), image.sourceUrl || image.url || '');
  fs.writeFileSync(path.join(imageDir, 'photographer.txt'), image.photographer || '');
  fs.writeFileSync(path.join(imageDir, 'license.txt'), image.license || '');

  const downloadSrc = image.imageSrc || image.thumbUrl || image.sourceUrl || image.url;
  const ext = guessExt(downloadSrc);
  const fileName = `${slug}${ext}`;
  const imagePath = path.join(imageDir, fileName);
  const rawBase = `https://raw.githubusercontent.com/owencorpening/images/main/${series}/${partDir}/${slug}`;

  return {
    imageDir,
    imagePath,
    downloadSrc,
    relPath: `${series}/${partDir}/${slug}`,
    imageUrl: `${rawBase}/${fileName}`
  };
}

async function downloadAsset({ url, dest }) {
  await download(url, dest);
}

function gitPushAsset(repoPath, relPath, slug) {
  return new Promise((resolve, reject) => {
    const cmd = `git add "${relPath}" && git commit -m "add ${slug}" && git push`;
    cp.exec(cmd, { cwd: repoPath }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve();
    });
  });
}

function removePlacedAssetBySourceUrl({ repoPath, series = 'water-series', placedIn, sourceUrl }) {
  const partDir = path.join(repoPath, series, placedIn);

  if (!fs.existsSync(partDir)) {
    return { status: 'missing-part-dir', partDir };
  }

  const matches = fs.readdirSync(partDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => {
      const urlFile = path.join(partDir, d.name, 'url.txt');
      return fs.existsSync(urlFile) &&
        fs.readFileSync(urlFile, 'utf8').trim() === String(sourceUrl || '').trim();
    })
    .map(d => d.name);

  if (matches.length === 0) return { status: 'no-match', partDir };
  if (matches.length > 1) return { status: 'multiple-matches', partDir, matches };

  fs.rmSync(path.join(partDir, matches[0]), { recursive: true, force: true });
  return { status: 'removed', partDir, slug: matches[0] };
}

function guessExt(url) {
  const m = String(url || '').match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
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

module.exports = {
  createPlacedAsset,
  downloadAsset,
  gitPushAsset,
  removePlacedAssetBySourceUrl,
  guessExt
};
