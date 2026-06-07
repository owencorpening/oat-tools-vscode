'use strict';

const assert = require('assert');
const {
  createReviewImageNeed,
  buildContentDraftRecord,
  buildDraftLocation,
  headingAnchorFromDocument,
  slugifyHeading
} = require('../lib/reviewImageNeedCommand');

async function testBuildRecordsFromEditor() {
  const document = fakeDocument('/repo/water/part-09.md', [
    '# Water Part IX',
    '',
    '## A Dense Section',
    'This paragraph needs a visual anchor.'
  ]);
  const editor = fakeEditor(document, 3, 3, 'This paragraph needs a visual anchor.');
  const vscode = fakeVscode(editor, { workspacePath: '/repo' });
  const idFactory = fixedIds();

  const draft = buildContentDraftRecord({ vscode, editor, idFactory });
  const location = buildDraftLocation(editor);

  assert.deepStrictEqual(draft, {
    id: 'draft-fixed',
    contentRepoPath: '/repo',
    draftPath: 'water/part-09.md',
    title: 'Water Part IX',
    headingAnchor: 'a-dense-section',
    status: 'active'
  });
  assert.strictEqual(location.path, '/repo/water/part-09.md');
  assert.strictEqual(location.heading, 'a-dense-section');
  assert.strictEqual(location.lineStart, 4);
  assert.strictEqual(location.lineEnd, 4);
  assert.strictEqual(location.selectedText, 'This paragraph needs a visual anchor.');
}

async function testCreateNeedCopiesJsonWithoutDb() {
  const document = fakeDocument('/repo/water/part-09.md', [
    '# Water Part IX',
    'Dense text.'
  ]);
  const editor = fakeEditor(document, 1, 1, 'Dense text.');
  const copied = [];
  const vscode = fakeVscode(editor, {
    workspacePath: '/repo',
    picks: ['dense prose', 'diagram'],
    copied
  });

  const result = await createReviewImageNeed({
    vscode,
    idFactory: fixedIds()
  });

  assert.strictEqual(result.contentDraft.id, 'draft-fixed');
  assert.strictEqual(result.imageNeed.id, 'need-fixed');
  assert.strictEqual(result.imageNeed.reason, 'dense prose');
  assert.strictEqual(result.imageNeed.neededAssetKind, 'diagram');
  assert.strictEqual(JSON.parse(copied[0]).imageNeed.id, 'need-fixed');
}

async function testCreateNeedWritesToLedgerWithDb() {
  const document = fakeDocument('/repo/water/part-09.md', ['# Title', 'Needs map.']);
  const editor = fakeEditor(document, 1, 1, 'Needs map.');
  const vscode = fakeVscode(editor, {
    workspacePath: '/repo',
    picks: ['needs map', 'map']
  });
  const calls = [];
  const assetLedger = {
    createContentDraft: async (db, draft) => calls.push(['draft', db.id, draft.id]),
    createImageNeed: async (db, need) => calls.push(['need', db.id, need.id, need.reason])
  };

  const result = await createReviewImageNeed({
    vscode,
    db: { id: 'db-1' },
    assetLedger,
    idFactory: fixedIds()
  });

  assert.strictEqual(result.imageNeed.neededAssetKind, 'map');
  assert.deepStrictEqual(calls, [
    ['draft', 'db-1', 'draft-fixed'],
    ['need', 'db-1', 'need-fixed', 'needs map']
  ]);
}

function testHelpers() {
  assert.strictEqual(slugifyHeading('A Dense Section!'), 'a-dense-section');
  const document = fakeDocument('/tmp/a.md', ['# Title', 'body', '### Later Heading']);
  assert.strictEqual(headingAnchorFromDocument(document, 2), 'later-heading');
  assert.strictEqual(headingAnchorFromDocument(document, 1), 'title');
}

function fixedIds() {
  return {
    contentDraftId: () => 'draft-fixed',
    imageNeedId: () => 'need-fixed'
  };
}

function fakeVscode(editor, options = {}) {
  const picks = [...(options.picks || [])];
  return {
    window: {
      activeTextEditor: editor,
      showQuickPick: async () => picks.shift(),
      showInputBox: async () => options.input,
      showWarningMessage: message => options.messages && options.messages.push(['warning', message]),
      showInformationMessage: message => options.messages && options.messages.push(['info', message])
    },
    workspace: {
      getWorkspaceFolder: () => options.workspacePath
        ? { uri: { fsPath: options.workspacePath } }
        : undefined
    },
    env: {
      clipboard: {
        writeText: async text => options.copied && options.copied.push(text)
      }
    }
  };
}

function fakeEditor(document, startLine, endLine, selectedText = '') {
  return {
    document,
    selection: {
      start: { line: startLine },
      end: { line: endLine },
      active: { line: endLine }
    },
    _selectedText: selectedText
  };
}

function fakeDocument(fsPath, lines) {
  return {
    uri: { fsPath },
    lineCount: lines.length,
    lineAt: index => ({ text: lines[index] }),
    getText: selection => {
      if (selection && selection.start && selection.end && selection.start.line === selection.end.line) {
        return lines[selection.start.line];
      }
      return lines.slice(selection.start.line, selection.end.line + 1).join('\n');
    }
  };
}

(async () => {
  await testBuildRecordsFromEditor();
  await testCreateNeedCopiesJsonWithoutDb();
  await testCreateNeedWritesToLedgerWithDb();
  testHelpers();
  console.log('reviewImageNeedCommand tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
