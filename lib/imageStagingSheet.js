'use strict';
const { apiRequest } = require('./request');

// Actual sheet column layout (A-L, 0-based array indices):
// A=Date  B=Name  C=URL  D=Photographer  E=License
// F=Substack Post Title  G=Attribution String
// H=status  I=placed_in  J=placed_date  K=target  L=image_src
const COL = { url: 2, photographer: 3, license: 4, status: 7, placed_in: 8, placed_date: 9, target: 10, imageSrc: 11 };

async function getAllRows(sheetId, token) {
  console.log('[OAT-SHEET] Sheet fetch start — sheetId:', sheetId);
  let data;
  try {
    data = await apiRequest(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:L`,
      'GET',
      token,
      null
    );
    console.log('[OAT-SHEET] Sheet API response (first 200 chars):', JSON.stringify(data).slice(0, 200));
  } catch (e) {
    console.error('[OAT-SHEET] Sheet fetch FAILED:', e.message);
    throw e;
  }
  const rows = (data.values || []);
  console.log('[OAT-SHEET] Row count (including header):', rows.length);
  if (rows.length < 2) return [];
  return rows.slice(1).map((row, i) => ({
    rowIndex: i + 2, // 1-based sheet row, skip header
    url:          row[COL.url]          || '',
    photographer: row[COL.photographer] || '',
    license:      row[COL.license]      || '',
    status:       row[COL.status]       || '',
    placed_in:    row[COL.placed_in]    || '',
    placed_date:  row[COL.placed_date]  || '',
    target:       row[COL.target]       || '',
    imageSrc:     row[COL.imageSrc]     || ''
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
