'use strict';

const os = require('os');
const path = require('path');
const { buildPlacementRunInput } = require('./plannedPlacementRun');
const { placementItem } = require('./ledgerBrowseCommands');

function registerPlannedPlacementRunCommand(context, vscode, options = {}) {
  context.subscriptions.push(
    vscode.commands.registerCommand('oatImages.preparePlannedPlacementRun', () =>
      preparePlannedPlacementRun({ vscode, ...options })
    )
  );
}

async function preparePlannedPlacementRun({ vscode, ledgerWriter, buildRunInput = buildPlacementRunInput } = {}) {
  if (!ledgerWriter || !ledgerWriter.listPlannedPlacements) {
    vscode.window.showWarningMessage('OAT: Set oatImages.ledgerApiUrl to prepare image placement instructions.');
    return null;
  }

  const result = await ledgerWriter.listPlannedPlacements();
  const placements = result.placements || [];
  if (placements.length === 0) {
    vscode.window.showInformationMessage('OAT: No planned image placements to prepare.');
    return [];
  }

  const picked = await vscode.window.showQuickPick(placements.map(placementItem), {
    placeHolder: 'Planned placement to prepare'
  });
  if (!picked) return placements;

  const payload = buildRunInput(picked.record, {
    repoPath: imagesRepoPath(vscode),
    download: true,
    commit: true
  });

  await vscode.env.clipboard.writeText(JSON.stringify(payload, null, 2));
  vscode.window.showInformationMessage('OAT: Placement instructions copied as JSON.');
  return payload;
}

function imagesRepoPath(vscode) {
  const configured = vscode.workspace
    .getConfiguration('oatImages')
    .get('imagesRepoPath', '');

  return configured || path.join(os.homedir(), 'dev/images');
}

module.exports = {
  registerPlannedPlacementRunCommand,
  preparePlannedPlacementRun,
  imagesRepoPath
};
