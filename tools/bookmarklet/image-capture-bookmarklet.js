// OAT D1 Image Capture Bookmarklet Source
// Build with: npm run bookmarklet:build

(function () {
  var LEDGER_API_URL = 'YOUR_LEDGER_API_URL_HERE';
  var LEDGER_API_TOKEN = 'YOUR_LEDGER_API_TOKEN_HERE';
  var INTAKE_SECTION_URL = 'http://localhost:9876/';

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function slugName(value) {
    return clean(value)
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map(function (word, index) {
        word = word.toLowerCase();
        return index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('') || 'capturedImage';
  }

  function bestImageSrc() {
    var directImage = /\.(jpe?g|png|webp|gif)(\?|$)/i;
    var imgs = Array.prototype.slice.call(document.querySelectorAll('img'));
    var bestCdn = bestImage(imgs, function (src) {
      return src.indexOf('images.unsplash.com') !== -1 || src.indexOf('images.pexels.com') !== -1;
    });
    if (bestCdn) return bestCdn;

    var og = document.querySelector('meta[property="og:image"], meta[name="twitter:image"]');
    if (og && og.getAttribute('content')) return og.getAttribute('content');

    return bestImage(imgs, function (src) {
      return directImage.test(src);
    });
  }

  function bestImage(imgs, predicate) {
    var bestSrc = '';
    var bestArea = 0;
    imgs.forEach(function (img) {
      imageCandidates(img).forEach(function (src) {
        if (!src || !predicate(src)) return;
        var area = (img.naturalWidth || img.width || 0) * (img.naturalHeight || img.height || 0);
        if (area >= bestArea) {
          bestArea = area;
          bestSrc = src;
        }
      });
    });
    return bestSrc;
  }

  function imageCandidates(img) {
    var firstSrcset = clean(img.getAttribute('srcset')).split(',')[0] || '';
    return [
      img.getAttribute('data-src'),
      img.getAttribute('data-original'),
      img.currentSrc,
      img.src,
      firstSrcset.trim().split(/\s+/)[0]
    ].filter(Boolean);
  }

  function photographerName() {
    var author = document.querySelector(
      'a[rel="author"], a[itemprop="author"] span, [data-testid*="photographer"], [data-testid*="author"], a[href^="/@"]'
    );
    if (author) return clean(author.innerText || author.textContent);

    var byline = document.querySelector('[class*="photographer"], [class*="author"], [class*="byline"]');
    if (byline && /by\s+/i.test(byline.innerText || byline.textContent || '')) {
      return clean((byline.innerText || byline.textContent).replace(/.*by\s+/i, ''));
    }
    return 'UNKNOWN';
  }

  function licenseFor(url) {
    if (/pexels\.com|pixabay\.com|unsplash\.com/i.test(url)) {
      return 'CC0 Equivalent (No Attribution)';
    }
    return 'MANUAL CHECK REQUIRED';
  }

  function configuredToken() {
    return LEDGER_API_TOKEN && LEDGER_API_TOKEN.indexOf('YOUR_') !== 0 ? LEDGER_API_TOKEN : '';
  }

  function configuredLedgerUrl() {
    if (!LEDGER_API_URL || LEDGER_API_URL.indexOf('YOUR_') === 0) {
      throw new Error('Set LEDGER_API_URL before installing the bookmarklet.');
    }
    return LEDGER_API_URL.replace(/\/+$/, '');
  }

  function currentIntakeSection() {
    return fetch(INTAKE_SECTION_URL)
      .then(function (response) { return response.text(); })
      .catch(function () { return ''; });
  }

  function sendCapture(intakeSection) {
    var pageUrl = window.location.href;
    var title = clean(document.title) || 'Captured image';
    var payload = {
      id: 'asset-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10),
      name: slugName(title),
      displayName: title,
      sourceName: title,
      sourceUrl: pageUrl,
      imageSrc: bestImageSrc() || '',
      photographer: photographerName(),
      license: licenseFor(pageUrl),
      intakeSection: clean(intakeSection)
    };
    var token = configuredToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;

    return fetch(configuredLedgerUrl() + '/captures/image', {
      method: 'POST',
      mode: 'cors',
      headers: headers,
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) throw new Error('Ledger returned HTTP ' + response.status);
      return response.json();
    }).then(function () {
      alert(
        'OAT image captured\n\n' +
        'Name: ' + payload.displayName + '\n' +
        'Photographer: ' + payload.photographer + '\n' +
        'Status: staged'
      );
    });
  }

  currentIntakeSection()
    .then(function (intakeSection) { return sendCapture(intakeSection); })
    .catch(function (error) {
      console.error('[OAT image capture]', error);
      alert('OAT image capture failed: ' + error.message);
    });
})();
