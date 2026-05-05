'use strict';
const { apiRequest } = require('./request');

// Sheet column layout (A-G, 1-based positions, 0-based array indices)
// A=url  B=photographer  C=license  D=status  E=placed_in  F=placed_date  G=target
const COL = { url: 0, photographer: 1, license: 2, status: 3, placed_in: 4, placed_date: 5, target: 6 };

async function getAllRows(sheetId, token) {
  const data = await apiRequest(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:G`,
    'GET',
    token,
    null
  );
  const rows = (data.values || []);
  if (rows.length < 2) return [];
  return rows.slice(1).map((row, i) => ({
    rowIndex: i + 2, // 1-based sheet row, skip header
    url:          row[COL.url]          || '',
    photographer: row[COL.photographer] || '',
    license:      row[COL.license]      || '',
    status:       row[COL.status]       || '',
    placed_in:    row[COL.placed_in]    || '',
    placed_date:  row[COL.placed_date]  || '',
    target:       row[COL.target]       || ''
  }));
}

async function getStagedImages(sheetId, token) {
  const rows = await getAllRows(sheetId, token);
  return rows.filter(r => r.status === 'staged');
}

async function updateRow(sheetId, rowIndex, updates, token) {
  // updates: object with any of { status, placed_in, placed_date, target }
  const colMap = { status: 'D', placed_in: 'E', placed_date: 'F', target: 'G' };
  for (const [field, col] of Object.entries(colMap)) {
    if (updates[field] === undefined) continue;
    const range = encodeURIComponent(`Sheet1!${col}${rowIndex}`);
    await apiRequest(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=RAW`,
      'PUT',
      token,
      { range: `Sheet1!${col}${rowIndex}`, majorDimension: 'ROWS', values: [[updates[field]]] }
    );
  }
}

module.exports = { getStagedImages, getAllRows, updateRow };
