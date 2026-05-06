'use strict';
const https = require('https');

const DIRECT_RE = /\.(jpe?g|png|webp|gif)(\?|$)/i;
const TIMEOUT_MS = 6000;
const UA = 'Mozilla/5.0 (compatible; OATTools/1.0)';

function fetchOgImage(pageUrl) {
  return new Promise(resolve => {
    let url;
    try { url = new URL(pageUrl); } catch { return resolve(null); }
    if (url.protocol !== 'https:') return resolve(null);

    const req = https.get(
      { hostname: url.hostname, path: url.pathname + url.search,
        headers: { 'User-Agent': UA, 'Accept': 'text/html' }, timeout: TIMEOUT_MS },
      res => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          req.destroy();
          return fetchOgImage(res.headers.location).then(resolve);
        }
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          const m = data.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/)
                 || data.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/);
          resolve(m ? m[1] : null);
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function resolveThumbUrl(imageSrc, url) {
  if (imageSrc) return imageSrc;
  if (!url) return null;
  if (DIRECT_RE.test(url)) return url;
  if (url.includes('unsplash.com/photos/') || url.includes('pexels.com/photo/')) {
    return fetchOgImage(url);
  }
  return null;
}

module.exports = { resolveThumbUrl };
