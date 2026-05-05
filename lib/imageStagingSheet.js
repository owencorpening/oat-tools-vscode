'use strict';
const { apiRequest } = require('./request');

// Actual sheet column layout (A-K, 0-based array indices):
// A=Date  B=Name  C=URL  D=Photographer  E=License
// F=Substack Post Title  G=Attribution String
// H=status  I=placed_in  J=placed_date  K=target
const COL = { url: 2, photographer: 3, license: 4, status: 7, placed_in: 8, placed_date: 9, target: 10 };

async function getAllRows(sheetId, token) {
  const data = await apiRequest(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:K`,
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
  const colMap = { status: 'H', placed_in: 'I', placed_date: 'J', target: 'K' };
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
