'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  intakeLocalFile,
  buildAssetFromLocalFile,
  displayNameFromPath,
  emptyToUndefined
} = require('../lib/localFileIntakeCommand');

async function testBuildAssetFromLocalFile() {
  const filePath = tempImage('hello');
  const asset = await buildAssetFromLocalFile(require('../lib/imageIntake'), 'downloads', {
    id: 'asset-1',
    filePath,
    displayName: 'River Map',
    photographer: 'Owen',
    license: 'OAT',
    sourceUrl: 'https://example.com/source'
  });

  assert.strictEqual(asset.id, 'asset-1');
  assert.strictEqual(asset.slug, 'river-map');
  assert.strictEqual(asset.status, 'candidate');
  assert.strictEqual(asset.contentHash, 'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
}

async function testCopiesJsonWithoutDb() {
  const filePath = tempImage('image bytes');
  const copied = [];
  const vscode = fakeVscode({
    filePath,
    quickPick: 'Downloads file',
    inputs: ['River Map', 'https://example.com/source', 'A', 'CC', 'Image: River Map, by A.', 'water-series/part-09'],
    copied
  });

  const result = await intakeLocalFile({
    vscode,
    idFactory: { assetId: () => 'asset-fixed' }
  });

  assert.strictEqual(result.asset.id, 'asset-fixed');
  assert.strictEqual(result.asset.displayName, 'River Map');
  assert.strictEqual(result.asset.attribution, 'Image: River Map, by A.');
  assert.strictEqual(result.asset.intakeSection, 'water-series/part-09');
  assert.strictEqual(JSON.parse(copied[0]).asset.id, 'asset-fixed');
}

async function testWritesToLedgerWithDb() {
  const filePath = tempImage('image bytes');
  const calls = [];
  const vscode = fakeVscode({
    filePath,
    quickPick: 'AI-generated file',
    inputs: ['AI Canal Diagram', '', '', 'OAT rights', '', 'water-series/part-10']
  });
  const assetLedger = {
    createAsset: async (db, asset) => calls.push(['asset', db.id, asset.id, asset.photographer, asset.status])
  };

  const result = await intakeLocalFile({
    vscode,
    db: { id: 'db-1' },
    assetLedger,
    idFactory: { assetId: () => 'asset-ai' }
  });

  assert.strictEqual(result.asset.photographer, 'Owen Corpening');
  assert.deepStrictEqual(calls, [['asset', 'db-1', 'asset-ai', 'Owen Corpening', 'candidate']]);
}

async function testWritesToLedgerWriter() {
  const filePath = tempImage('image bytes');
  const calls = [];
  const vscode = fakeVscode({
    filePath,
    quickPick: 'Downloads file',
    inputs: ['River Map', 'https://example.com/source', 'A', 'CC', '', 'water-series/part-09']
  });
  const ledgerWriter = {
    saveAsset: async payload => calls.push(payload)
  };

  const result = await intakeLocalFile({
    vscode,
    ledgerWriter,
    idFactory: { assetId: () => 'asset-writer' }
  });

  assert.strictEqual(result.asset.id, 'asset-writer');
  assert.strictEqual(calls[0].asset.id, 'asset-writer');
}

function testHelpers() {
  assert.strictEqual(displayNameFromPath('/tmp/river_map-final.png'), 'River map final');
  assert.strictEqual(emptyToUndefined('  hello  '), 'hello');
  assert.strictEqual(emptyToUndefined('   '), undefined);
}

function fakeVscode(options) {
  const inputs = [...(options.inputs || [])];
  return {
    window: {
      showOpenDialog: async () => [{ fsPath: options.filePath }],
      showQuickPick: async () => options.quickPick,
      showInputBox: async () => inputs.shift(),
      showInformationMessage: () => {},
      showWarningMessage: () => {}
    },
    env: {
      clipboard: {
        writeText: async text => options.copied && options.copied.push(text)
      }
    }
  };
}

function tempImage(contents) {
  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'oat-intake-')), 'river_map-final.png');
  fs.writeFileSync(filePath, contents);
  return filePath;
}

(async () => {
  await testBuildAssetFromLocalFile();
  await testCopiesJsonWithoutDb();
  await testWritesToLedgerWithDb();
  await testWritesToLedgerWriter();
  testHelpers();
  console.log('localFileIntakeCommand tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
