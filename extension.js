'use strict';
const vscode = require('vscode');
const https = require('https');
const { parseTables } = require('./lib/parseTables');
const { createSheet, writeValues, publishSheet, colToLetter } = require('./lib/sheetsApi');
const { applyOatFormat } = require('./lib/oatFormat');

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('oat.promoteAllTables', promoteAllTables)
  );
}

async function promoteAllTables() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('OAT: No active editor.');
    return;
  }
  if (editor.document.languageId !== 'markdown') {
    vscode.window.showErrorMessage('OAT: Active file must be a markdown document.');
    return;
  }

  const token = process.env.GOOGLE_OAUTH_TOKEN ||
    vscode.workspace.getConfiguration('oat').get('googleOAuthToken', '');
  if (!token) {
    vscode.window.showErrorMessage(
      'OAT: Google OAuth token not set. ' +
      'Set GOOGLE_OAUTH_TOKEN env var or oat.googleOAuthToken in VS Code settings.'
    );
    return;
  }

  const gasUrl = process.env.GAS_WEB_APP_URL ||
    vscode.workspace.getConfiguration('oat').get('gasWebAppUrl', '');

  const partNum = await vscode.window.showInputBox({
    prompt: 'Part number (e.g. 09)',
    placeHolder: '09',
    validateInput: v => v && v.trim() ? null : 'Part number is required'
  });
  if (!partNum) return;

  const series = await vscode.window.showInputBox({
    prompt: 'Series slug',
    placeHolder: 'water-series',
    value: 'water-series',
    validateInput: v => v && v.trim() ? null : 'Series is required'
  });
  if (series === undefined) return;

  const text = editor.document.getText();
  const tables = parseTables(text);

  if (tables.length === 0) {
    vscode.window.showInformationMessage('OAT: No markdown tables found in document.');
    return;
  }

  const replacements = [];
  const descriptorCount = {};

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `OAT: Promoting ${tables.length} table${tables.length === 1 ? '' : 's'}`,
      cancellable: false
    },
    async progress => {
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        progress.report({
          message: `${i + 1}/${tables.length} — ${table.headers[0]}`,
          increment: (100 / tables.length)
        });

        let descriptor = generateDescriptor(table.headers);
        descriptorCount[descriptor] = (descriptorCount[descriptor] || 0) + 1;
        if (descriptorCount[descriptor] > 1) {
          descriptor = descriptor + descriptorCount[descriptor];
        }

        const title = `part${partNum.trim()}-table-${descriptor}`;

        try {
          const { spreadsheetId, sheetId } = await createSheet(title, token);
          await writeValues(spreadsheetId, [table.headers, ...table.rows], token);

          if (gasUrl) {
            await callGasWebApp(gasUrl, spreadsheetId);
          } else {
            await applyOatFormat(spreadsheetId, sheetId, table.headers.length, table.rows.length + 1, token);
          }

          await publishSheet(spreadsheetId, token);

          const endCol = colToLetter(table.headers.length);
          const rowCount = table.rows.length + 1;
          const range = `Sheet1!A1:${endCol}${rowCount}`;
          const pngUrl =
            `https://docs.google.com/spreadsheets/d/${spreadsheetId}` +
            `/export?format=png&range=${encodeURIComponent(range)}&gid=${sheetId}&fitw=true`;
          const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

          const embed =
            `[![${descriptor} data table](${pngUrl})](${sheetUrl})\n` +
            `*Tap or click to view full accessible data.*`;

          replacements.push({ startLine: table.startLine, endLine: table.endLine, embed });
        } catch (err) {
          vscode.window.showWarningMessage(`OAT: Table ${i + 1} (${descriptor}) failed — ${err.message}`);
        }
      }
    }
  );

  if (replacements.length === 0) {
    vscode.window.showErrorMessage('OAT: All table promotions failed. Check token and API access.');
    return;
  }

  // Apply bottom-up so earlier line numbers stay valid
  replacements.sort((a, b) => b.startLine - a.startLine);

  const succeeded = await editor.edit(editBuilder => {
    for (const r of replacements) {
      const start = new vscode.Position(r.startLine, 0);
      // endLine + 1 to consume the trailing newline of the last table row
      const end = new vscode.Position(r.endLine + 1, 0);
      editBuilder.replace(new vscode.Range(start, end), r.embed + '\n');
    }
  });

  if (succeeded) {
    vscode.window.showInformationMessage(
      `OAT: ${replacements.length}/${tables.length} table${replacements.length === 1 ? '' : 's'} promoted to Google Sheets.`
    );
  } else {
    vscode.window.showErrorMessage('OAT: Edit failed — document may have changed during processing.');
  }
}

// Descriptor: camelCase of first header cell content
function generateDescriptor(headers) {
  const raw = headers[0]
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'table';
  return words
    .map((w, i) => i === 0
      ? w.toLowerCase()
      : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('');
}

// POST to GAS web app endpoint to apply OAT style
// Deployed Code.gs must expose doPost(e) that calls applyOatStyle by spreadsheetId
function callGasWebApp(url, spreadsheetId) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    target.searchParams.set('spreadsheetId', spreadsheetId);

    const options = {
      hostname: target.hostname,
      path: target.pathname + target.search,
      method: 'POST',
      headers: { 'Content-Length': '0' }
    };

    const req = https.request(options, res => {
      // GAS web apps redirect from /exec to /macros/... — follow once
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return callGasWebApp(res.headers.location, spreadsheetId).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`GAS returned HTTP ${res.statusCode}: ${body}`));
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function deactivate() {}

module.exports = { activate, deactivate };
