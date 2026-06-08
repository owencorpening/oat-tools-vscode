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
  context.subscriptions.push(
    vscode.commands.registerCommand('oatImages.listPlannedPlacements', () =>
      listPlannedPlacements({ vscode, ...options })
    )
  );
}

async function listOpenNeeds({ vscode, ledgerWriter } = {}) {
  if (!ledgerWriter || !ledgerWriter.listOpenNeeds) {
    vscode.window.showWarningMessage('OAT: Set oatImages.ledgerApiUrl to list image notebook needs.');
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
    vscode.window.showWarningMessage('OAT: Set oatImages.ledgerApiUrl to list staged notebook images.');
    return null;
  }

  const result = await ledgerWriter.listStagedAssets();
  const assets = result.assets || [];
  if (assets.length === 0) {
    vscode.window.showInformationMessage('OAT: No staged notebook images.');
    return [];
  }

  const picked = await vscode.window.showQuickPick(assets.map(assetItem), {
    placeHolder: 'Staged notebook images'
  });
  if (!picked) return assets;

  await vscode.env.clipboard.writeText(JSON.stringify(picked.record, null, 2));
  vscode.window.showInformationMessage('OAT: Staged asset copied as JSON.');
  return picked.record;
}

async function listPlannedPlacements({ vscode, ledgerWriter } = {}) {
  if (!ledgerWriter || !ledgerWriter.listPlannedPlacements) {
    vscode.window.showWarningMessage('OAT: Set oatImages.ledgerApiUrl to list planned image placements.');
    return null;
  }

  const result = await ledgerWriter.listPlannedPlacements();
  const placements = result.placements || [];
  if (placements.length === 0) {
    vscode.window.showInformationMessage('OAT: No planned image placements.');
    return [];
  }

  const picked = await vscode.window.showQuickPick(placements.map(placementItem), {
    placeHolder: 'Planned image placements'
  });
  if (!picked) return placements;

  await vscode.env.clipboard.writeText(JSON.stringify(picked.record, null, 2));
  vscode.window.showInformationMessage('OAT: Planned placement copied as JSON.');
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

function placementItem(record) {
  const label = record.display_name || record.slug || record.asset_id || record.placement_id;
  const description = [record.target, record.figure_number ? `Figure ${record.figure_number}` : null]
    .filter(Boolean)
    .join(' · ');
  const detail = [
    record.draft_path || record.content_draft_id,
    record.saga_status ? `saga: ${record.saga_status}` : null,
    record.placement_id
  ].filter(Boolean).join(' · ');

  return {
    label,
    description,
    detail,
    record
  };
}

module.exports = {
  registerLedgerBrowseCommands,
  listOpenNeeds,
  listStagedAssets,
  listPlannedPlacements,
  needItem,
  assetItem,
  placementItem
};
