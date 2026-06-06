'use strict';

const MIN_TABLE_IMAGE_WIDTH = 700;
const MAX_TABLE_IMAGE_WIDTH = 1600;
const BODY_HORIZONTAL_PADDING = 32;
const CELL_HORIZONTAL_PADDING = 24;
const MIN_COLUMN_WIDTH = 96;
const MAX_COLUMN_WIDTH = 420;
const WIDTH_SAFETY_MULTIPLIER = 1.2;

function estimateTableImageWidth(headers, rows) {
  const columnCount = headers.length;
  if (columnCount === 0) return MIN_TABLE_IMAGE_WIDTH;

  const columnWidths = headers.map((header, columnIndex) => {
    const values = [header, ...rows.map(row => row[columnIndex] ?? '')];
    const contentWidth = Math.max(...values.map(estimateTextWidth));
    return clamp(
      Math.ceil(contentWidth + CELL_HORIZONTAL_PADDING),
      MIN_COLUMN_WIDTH,
      MAX_COLUMN_WIDTH
    );
  });

  const estimatedWidth = columnWidths.reduce((sum, width) => sum + width, BODY_HORIZONTAL_PADDING);

  return clamp(
    Math.ceil(estimatedWidth * WIDTH_SAFETY_MULTIPLIER),
    MIN_TABLE_IMAGE_WIDTH,
    MAX_TABLE_IMAGE_WIDTH
  );
}

function estimateTextWidth(value) {
  return String(value)
    .replace(/\\(.)/g, '$1')
    .split('')
    .reduce((width, char) => width + estimateCharWidth(char), 0);
}

function estimateCharWidth(char) {
  if (char === ' ') return 4;
  if ('il.,:;!|'.includes(char)) return 4;
  if ('mwMW@#%&'.includes(char)) return 12;
  if (/[A-Z0-9$]/.test(char)) return 9;
  return 8;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

module.exports = {
  estimateTableImageWidth,
  MIN_TABLE_IMAGE_WIDTH,
  MAX_TABLE_IMAGE_WIDTH
};
