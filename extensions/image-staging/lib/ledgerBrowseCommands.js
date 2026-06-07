'use strict';

function registerLedgerBrowseCommands(context, vscode, options = {}) {
  context.subscriptions.push(
    vscode.commands.registerCommand('oatImages.listOpenNeeds', () =>
      listOpenNeeds({ vscode, ...options })
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('oatImages.listStagedAssets', () =>
      listStagedAssets({ vscode, ...options })
    )
  );
}

async function listOpenNeeds({ vscode, ledgerWriter } = {}) {
  if (!ledgerWriter || !ledgerWriter.listOpenNeeds) {
    vscode.window.showWarningMessage('OAT: Set oatImages.ledgerApiUrl to list D1 image needs.');
    return null;
  }

  const result = await ledgerWriter.listOpenNeeds();
  const needs = result.imageNeeds || [];
  if (needs.length === 0) {
    vscode.window.showInformationMessage('OAT: No open image needs.');
    return [];
  }

  const picked = await vscode.window.showQuickPick(needs.map(needItem), {
    placeHolder: 'Open image needs'
  });
  if (!picked) return needs;

  await vscode.env.clipboard.writeText(JSON.stringify(picked.record, null, 2));
  vscode.window.showInformationMessage('OAT: Image need copied as JSON.');
  return picked.record;
}

async function listStagedAssets({ vscode, ledgerWriter } = {}) {
  if (!ledgerWriter || !ledgerWriter.listStagedAssets) {
    vscode.window.showWarningMessage('OAT: Set oatImages.ledgerApiUrl to list D1 staged assets.');
    return null;
  }

  const result = await ledgerWriter.listStagedAssets();
  const assets = result.assets || [];
  if (assets.length === 0) {
    vscode.window.showInformationMessage('OAT: No staged D1 assets.');
    return [];
  }

  const picked = await vscode.window.showQuickPick(assets.map(assetItem), {
    placeHolder: 'Staged D1 assets'
  });
  if (!picked) return assets;

  await vscode.env.clipboard.writeText(JSON.stringify(picked.record, null, 2));
  vscode.window.showInformationMessage('OAT: Staged asset copied as JSON.');
  return picked.record;
}

function needItem(record) {
  const detail = [record.needed_asset_kind, record.content_draft_id].filter(Boolean).join(' · ');
  return {
    label: record.reason || record.id,
    description: record.id,
    detail,
    record
  };
}

function assetItem(record) {
  const label = record.display_name || record.slug || record.id;
  const detail = [record.status, record.intake_section].filter(Boolean).join(' · ');
  return {
    label,
    description: record.id,
    detail,
    record
  };
}

module.exports = {
  registerLedgerBrowseCommands,
  listOpenNeeds,
  listStagedAssets,
  needItem,
  assetItem
};
