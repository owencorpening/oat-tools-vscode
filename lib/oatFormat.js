'use strict';
const { apiRequest } = require('./request');

// Brand palette as Sheets API RGBA (0–1 scale)
const C = {
  headerBg:  { red: 0,     green: 0.373, blue: 0.451 }, // #005f73
  headerFg:  { red: 1,     green: 1,     blue: 1     }, // #ffffff
  border:    { red: 0.580, green: 0.824, blue: 0.741 }, // #94d2bd
  rowEven:   { red: 0.941, green: 0.969, blue: 0.973 }, // #f0f7f8  (sheet rows 2,4,6...)
  rowOdd:    { red: 1,     green: 1,     blue: 1     }, // #ffffff  (sheet rows 3,5,7...)
  black:     { red: 0,     green: 0,     blue: 0     }
};

const ROW_HEIGHT_PX = 43; // 32pt ≈ 43px

async function applyOatFormat(spreadsheetId, sheetId, numCols, totalRows, token) {
  const requests = [];

  // ── Header row formatting ─────────────────────────────────────
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: C.headerBg,
          textFormat: {
            foregroundColor: C.headerFg,
            fontFamily: 'Arial',
            fontSize: 11,
            bold: true
          },
          verticalAlignment: 'MIDDLE'
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
    }
  });

  // ── Data rows — base formatting ───────────────────────────────
  if (totalRows > 1) {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: totalRows },
        cell: {
          userEnteredFormat: {
            textFormat: {
              foregroundColor: C.black,
              fontFamily: 'Arial',
              fontSize: 10,
              bold: false
            },
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(textFormat,verticalAlignment)'
      }
    });

    // ── Alternating row backgrounds ───────────────────────────────
    // 0-indexed row 1 = sheet row 2 = GAS "even" row → tint (#f0f7f8)
    for (let rowIdx = 1; rowIdx < totalRows; rowIdx++) {
      const bg = (rowIdx % 2 === 1) ? C.rowEven : C.rowOdd;
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIdx, endRowIndex: rowIdx + 1 },
          cell: { userEnteredFormat: { backgroundColor: bg } },
          fields: 'userEnteredFormat.backgroundColor'
        }
      });
    }
  }

  // ── Header bottom border (SOLID_MEDIUM ≈ 2px) ─────────────────
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols },
      bottom: { style: 'SOLID_MEDIUM', color: C.border }
    }
  });

  // ── Column dividers (right border, all cols except last) ───────
  for (let col = 0; col < numCols - 1; col++) {
    requests.push({
      updateBorders: {
        range: { sheetId, startRowIndex: 0, endRowIndex: totalRows, startColumnIndex: col, endColumnIndex: col + 1 },
        right: { style: 'SOLID', color: C.border }
      }
    });
  }

  // ── Row heights ───────────────────────────────────────────────
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: totalRows },
      properties: { pixelSize: ROW_HEIGHT_PX },
      fields: 'pixelSize'
    }
  });

  // ── Freeze header row ─────────────────────────────────────────
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount'
    }
  });

  await apiRequest(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    'POST',
    token,
    { requests }
  );
}

module.exports = { applyOatFormat };
