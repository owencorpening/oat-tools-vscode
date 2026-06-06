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

// Returns { thumbUrl, url } — url is the canonical attribution URL when updated by API.
function fetchUnsplashThumb(photoId, accessKey) {
  return new Promise(resolve => {
    const fail = { thumbUrl: null, url: null };
    const req = https.get(
      { hostname: 'api.unsplash.com', path: `/photos/${photoId}`,
        headers: { 'Authorization': `Client-ID ${accessKey}`,
                   'Accept-Version': 'v1', 'User-Agent': UA },
        timeout: TIMEOUT_MS },
      res => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              thumbUrl: (json.urls  && json.urls.small)  || null,
              url:      (json.links && json.links.html)  || null
            });
          } catch { resolve(fail); }
        });
      }
    );
    req.on('error', () => resolve(fail));
    req.on('timeout', () => { req.destroy(); resolve(fail); });
  });
}

// Returns { thumbUrl, url } where url is non-null only when the Unsplash API
// provides a canonical attribution URL to replace the sheet value.
async function resolveThumbUrl(imageSrc, url, unsplashKey) {
  const none = { thumbUrl: null, url: null };
  if (imageSrc) return { thumbUrl: imageSrc, url: null };
  if (!url) return none;
  if (DIRECT_RE.test(url)) return { thumbUrl: url, url: null };

  if (url.includes('unsplash.com/photos/')) {
    if (unsplashKey) {
      const slug    = url.split('/photos/')[1].split('?')[0].split('#')[0].split('/')[0];
      const photoId = slug.split('-').pop();
      return fetchUnsplashThumb(photoId, unsplashKey);
    }
    return { thumbUrl: await fetchOgImage(url), url: null };
  }

  if (url.includes('pexels.com/photo/')) {
    return { thumbUrl: await fetchOgImage(url), url: null };
  }

  return none;
}

module.exports = { resolveThumbUrl };
