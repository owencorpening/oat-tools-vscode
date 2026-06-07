'use strict';

const assert = require('assert');
const {
  intakeUrl,
  displayNameFromUrl,
  optionalHttpUrl,
  isHttpUrl,
  emptyToUndefined
} = require('../lib/urlIntakeCommand');

async function testCopiesJsonWithoutDb() {
  const copied = [];
  const vscode = fakeVscode({
    inputs: [
      'https://example.com/images/river_map.jpg',
      'https://cdn.example.com/river_map.jpg',
      'River Map',
      'A',
      'CC',
      'Photo by A',
      'water-series/part-09'
    ],
    copied
  });

  const result = await intakeUrl({
    vscode,
    idFactory: { assetId: () => 'asset-url' }
  });

  assert.strictEqual(result.asset.id, 'asset-url');
  assert.strictEqual(result.asset.slug, 'river-map');
  assert.strictEqual(result.asset.status, 'candidate');
  assert.strictEqual(result.asset.imageSrc, 'https://cdn.example.com/river_map.jpg');
  assert.strictEqual(JSON.parse(copied[0]).asset.id, 'asset-url');
}

async function testNeedsProvenanceWhenMissingRights() {
  const vscode = fakeVscode({
    inputs: [
      'https://example.com/image.png',
      '',
      'Unprovenanced Image',
      '',
      '',
      '',
      ''
    ],
    copied: []
  });

  const result = await intakeUrl({
    vscode,
    idFactory: { assetId: () => 'asset-needs-provenance' }
  });

  assert.strictEqual(result.asset.status, 'needs-provenance');
  assert.strictEqual(result.asset.photographer, undefined);
  assert.strictEqual(result.asset.license, undefined);
}

async function testWritesToLedgerWithDb() {
  const calls = [];
  const vscode = fakeVscode({
    inputs: [
      'https://example.com/source',
      '',
      'Source Image',
      'Owen',
      'OAT',
      '',
      'standalone/article'
    ]
  });
  const assetLedger = {
    createAsset: async (db, asset) => calls.push(['asset', db.id, asset.id, asset.status, asset.intakeSection])
  };

  const result = await intakeUrl({
    vscode,
    db: { id: 'db-1' },
    assetLedger,
    idFactory: { assetId: () => 'asset-db' }
  });

  assert.strictEqual(result.asset.status, 'candidate');
  assert.deepStrictEqual(calls, [['asset', 'db-1', 'asset-db', 'candidate', 'standalone/article']]);
}

async function testWritesToLedgerWriter() {
  const calls = [];
  const vscode = fakeVscode({
    inputs: [
      'https://example.com/source',
      '',
      'Source Image',
      'Owen',
      'OAT',
      '',
      'standalone/article'
    ]
  });
  const ledgerWriter = {
    saveAsset: async payload => calls.push(payload)
  };

  const result = await intakeUrl({
    vscode,
    ledgerWriter,
    idFactory: { assetId: () => 'asset-writer' }
  });

  assert.strictEqual(result.asset.id, 'asset-writer');
  assert.strictEqual(calls[0].asset.intakeSection, 'standalone/article');
}

function testHelpers() {
  assert.strictEqual(displayNameFromUrl('https://example.com/images/river_map-final.png'), 'River map final');
  assert.strictEqual(isHttpUrl('https://example.com'), true);
  assert.strictEqual(isHttpUrl('file:///tmp/a.png'), false);
  assert.strictEqual(optionalHttpUrl('https://example.com/a.png'), 'https://example.com/a.png');
  assert.strictEqual(optionalHttpUrl('not-a-url'), undefined);
  assert.strictEqual(emptyToUndefined('  x  '), 'x');
  assert.strictEqual(emptyToUndefined(''), undefined);
}

function fakeVscode(options = {}) {
  const inputs = [...(options.inputs || [])];
  return {
    window: {
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

(async () => {
  await testCopiesJsonWithoutDb();
  await testNeedsProvenanceWhenMissingRights();
  await testWritesToLedgerWithDb();
  await testWritesToLedgerWriter();
  testHelpers();
  console.log('urlIntakeCommand tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
