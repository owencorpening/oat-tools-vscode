'use strict';

function parseTables(text) {
  const lines = text.split('\n');
  const tables = [];
  let i = 0;

  while (i < lines.length) {
    if (!isTableLine(lines[i])) { i++; continue; }

    const startLine = i;
    const block = [];
    while (i < lines.length && isTableLine(lines[i])) {
      block.push(lines[i]);
      i++;
    }
    const endLine = i - 1;

    const nonSep = block.filter(l => !isSeparatorLine(l));
    if (nonSep.length < 1) continue;

    const headers = parseCells(nonSep[0]);
    if (headers.length === 0) continue;

    const rows = nonSep.slice(1).map(parseCells);

    tables.push({ startLine, endLine, headers, rows });
  }

  return tables;
}

function isTableLine(line) {
  return line.trimStart().startsWith('|');
}

// Separator row: | --- | :---: | ---: | etc.
function isSeparatorLine(line) {
  const stripped = line.trim();
  if (!stripped.startsWith('|')) return false;
  // Remove the pipes and check that all content is dashes/colons/spaces
  const inner = stripped.replace(/^\||\|$/g, '');
  return inner.split('|').every(cell => /^[\s\-:]+$/.test(cell));
}

function parseCells(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map(c => c.trim().replace(/\*\*/g, ''))
    .filter(c => c.length > 0 || true); // keep all (including empty cells)
}

module.exports = { parseTables };
