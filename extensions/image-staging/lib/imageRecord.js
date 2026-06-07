'use strict';

function normalizeImageRecord(input = {}) {
  const sourceName = first(input.sourceName, input.name, input.displayName);
  const displayName = first(input.displayName, input.name, sourceName);
  const sourceUrl = first(input.sourceUrl, input.url);
  const imageSrc = first(input.imageSrc, input.image_src);
  const slug = first(input.slug, slugFromName(displayName));

  return {
    ...input,
    slug,
    displayName,
    sourceName,
    sourcePath: first(input.sourcePath, input.path),
    sourceUrl,
    imageSrc,
    photographer: first(input.photographer),
    license: first(input.license),
    attribution: first(input.attribution),
    status: first(input.status, needsProvenance(input) ? 'needs-provenance' : 'candidate'),
    section: first(input.section),
    target: first(input.target),
    figureNumber: first(input.figureNumber, input.figNum),
    draftContext: first(input.draftContext),

    // Compatibility fields used by the current webview and sheet adapter.
    name: first(input.name, displayName),
    url: first(input.url, sourceUrl)
  };
}

function normalizeImageRecords(records = []) {
  return records.map(normalizeImageRecord);
}

function slugFromName(name = '') {
  return String(name)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function needsProvenance(input) {
  return !first(input.sourceUrl, input.url) || !first(input.photographer) || !first(input.license);
}

function first(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

module.exports = {
  normalizeImageRecord,
  normalizeImageRecords,
  slugFromName
};
