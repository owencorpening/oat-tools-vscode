'use strict';
const { apiRequest } = require('./request');

async function createSheet(title, token) {
  const res = await apiRequest(
    'https://sheets.googleapis.com/v4/spreadsheets',
    'POST',
    token,
    { properties: { title } }
  );
  return {
    spreadsheetId: res.spreadsheetId,
    sheetId: res.sheets[0].properties.sheetId
  };
}

async function writeValues(spreadsheetId, values, token) {
  const numCols = Math.max(...values.map(r => r.length));
  const endCol = colToLetter(numCols);
  const range = `Sheet1!A1:${endCol}${values.length}`;
  await apiRequest(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    'PUT',
    token,
    { range, majorDimension: 'ROWS', values }
  );
}

// Makes the sheet readable by anyone with the link
async function publishSheet(spreadsheetId, token) {
  await apiRequest(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`,
    'POST',
    token,
    { role: 'reader', type: 'anyone' }
  );
}

function colToLetter(col) {
  let letter = '';
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

module.exports = { createSheet, writeValues, publishSheet, colToLetter };
