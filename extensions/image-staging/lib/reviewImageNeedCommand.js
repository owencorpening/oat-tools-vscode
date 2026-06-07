'use strict';

const crypto = require('crypto');
const path = require('path');
const ledger = require('./assetLedgerD1');
const intake = require('./imageIntake');

const NEED_REASONS = [
  'dense prose',
  'needs map',
  'needs concept diagram',
  'needs sourced photo',
  'needs table',
  'visual break',
  'custom'
];

const ASSET_KINDS = ['photo', 'diagram', 'map', 'table', 'ai-image', 'other'];

function registerReviewImageNeedCommand(context, vscode, options = {}) {
  context.subscriptions.push(
    vscode.commands.registerCommand('oatImages.createReviewNeed', () =>
      createReviewImageNeed({ vscode, ...options })
    )
  );
}

async function createReviewImageNeed({ vscode, db, assetLedger = ledger, imageIntake = intake, idFactory = defaultIds } = {}) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('OAT: Open a markdown draft before creating an image need.');
    return null;
  }

  const reason = await pickReason(vscode);
  if (!reason) return null;

  const neededAssetKind = await vscode.window.showQuickPick(ASSET_KINDS, {
    placeHolder: 'Needed asset kind'
  });
  if (!neededAssetKind) return null;

  const draft = buildContentDraftRecord({ vscode, editor, idFactory });
  const need = imageIntake.fromReviewNeed({
    id: idFactory.imageNeedId({ draft, reason, neededAssetKind }),
    contentDraftId: draft.id,
    draftLocation: buildDraftLocation(editor),
    reason,
    neededAssetKind
  });

  if (db) {
    await assetLedger.createContentDraft(db, draft);
    await assetLedger.createImageNeed(db, need);
    vscode.window.showInformationMessage(`OAT: Created image need: ${reason}.`);
  } else {
    await vscode.env.clipboard.writeText(JSON.stringify({ contentDraft: draft, imageNeed: need }, null, 2));
    vscode.window.showInformationMessage('OAT: D1 image need copied as JSON; configure a ledger writer to save it directly.');
  }

  return { contentDraft: draft, imageNeed: need };
}

async function pickReason(vscode) {
  const picked = await vscode.window.showQuickPick(NEED_REASONS, {
    placeHolder: 'Reason for the visual need'
  });
  if (!picked || picked !== 'custom') return picked;

  return vscode.window.showInputBox({
    prompt: 'Reason for the visual need',
    validateInput: value => value && value.trim() ? null : 'Required'
  });
}

function buildContentDraftRecord({ vscode, editor, idFactory = defaultIds }) {
  const documentPath = editor.document.uri.fsPath;
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
  const contentRepoPath = workspaceFolder && workspaceFolder.uri && workspaceFolder.uri.fsPath;
  const draftPath = contentRepoPath
    ? path.relative(contentRepoPath, documentPath)
    : documentPath;

  return {
    id: idFactory.contentDraftId({ contentRepoPath, draftPath }),
    contentRepoPath,
    draftPath,
    title: titleFromDocument(editor.document),
    headingAnchor: headingAnchorFromDocument(editor.document, editor.selection.active.line),
    status: 'active'
  };
}

function buildDraftLocation(editor) {
  const selection = editor.selection;
  const document = editor.document;
  const selectedText = document.getText(selection).trim();
  const heading = headingAnchorFromDocument(document, selection.active.line);

  return {
    path: document.uri.fsPath,
    heading,
    lineStart: selection.start.line + 1,
    lineEnd: selection.end.line + 1,
    selectedText: selectedText || undefined
  };
}

function titleFromDocument(document) {
  for (let i = 0; i < document.lineCount; i++) {
    const text = document.lineAt(i).text.trim();
    const match = text.match(/^#\s+(.+)/);
    if (match) return match[1].trim();
  }
  return path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));
}

function headingAnchorFromDocument(document, line) {
  for (let i = Math.max(0, line); i >= 0; i--) {
    const text = document.lineAt(i).text.trim();
    const match = text.match(/^#{1,6}\s+(.+)/);
    if (match) return slugifyHeading(match[1]);
  }
  return undefined;
}

function slugifyHeading(heading) {
  return String(heading || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const defaultIds = {
  contentDraftId({ contentRepoPath = '', draftPath = '' }) {
    return `draft_${shortHash(`${contentRepoPath}:${draftPath}`)}`;
  },
  imageNeedId({ draft, reason, neededAssetKind }) {
    return `need_${shortHash(`${draft.id}:${reason}:${neededAssetKind}:${Date.now()}`)}`;
  }
};

function shortHash(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 16);
}

module.exports = {
  registerReviewImageNeedCommand,
  createReviewImageNeed,
  buildContentDraftRecord,
  buildDraftLocation,
  headingAnchorFromDocument,
  slugifyHeading,
  defaultIds
};
