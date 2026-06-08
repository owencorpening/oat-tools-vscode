'use strict';

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'image-capture-bookmarklet.js');
const source = fs.readFileSync(sourcePath, 'utf8');

const compact = source
  .split(/\r?\n/)
  .filter(line => !line.trim().startsWith('//'))
  .join(' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/;$/, '');

process.stdout.write(`javascript:void(${compact})\n`);
