'use strict';

const assert = require('assert');
const {
  preparePlannedPlacementRun,
  imagesRepoPath
} = require('../lib/plannedPlacementRunCommand');

async function testPrepareCopiesRunPayload() {
  const copied = [];
  const messages = [];
  const vscode = fakeVscode({
    copied,
    messages,
    imagesRepoPath: '/repo/images'
  });
  const ledgerWriter = {
    listPlannedPlacements: async () => ({
      placements: [
        {
          placement_id: 'placement-1',
          placement_asset_id: 'asset-1',
          target: 'substack',
          figure_number: '3',
          asset_id: 'asset-1',
          slug: 'river-map',
          display_name: 'River Map',
          source_url: 'https://example.com/river.jpg',
          intake_section: 'water-series/part-09',
          saga_id: 'saga-1'
        }
      ]
    })
  };

  const payload = await preparePlannedPlacementRun({ vscode, ledgerWriter });

  assert.strictEqual(payload.repoPath, '/repo/images');
  assert.strictEqual(payload.download, true);
  assert.strictEqual(payload.commit, true);
  assert.strictEqual(payload.sagaId, 'saga-1');
  assert.strictEqual(payload.asset.id, 'asset-1');
  assert.strictEqual(payload.placement.id, 'placement-1');
  assert.strictEqual(JSON.parse(copied[0]).asset.displayName, 'River Map');
  assert.deepStrictEqual(messages.at(-1), ['info', 'OAT: Planned placement run payload copied as JSON.']);
}

async function testEmptyAndMissingWriterStates() {
  const messages = [];
  assert.strictEqual(await preparePlannedPlacementRun({ vscode: fakeVscode({ messages }) }), null);
  assert.deepStrictEqual(messages[0], ['warning', 'OAT: Set oatImages.ledgerApiUrl to prepare D1 placement runs.']);

  const empty = await preparePlannedPlacementRun({
    vscode: fakeVscode({ messages }),
    ledgerWriter: { listPlannedPlacements: async () => ({ placements: [] }) }
  });
  assert.deepStrictEqual(empty, []);
}

function testImagesRepoPath() {
  assert.strictEqual(imagesRepoPath(fakeVscode({ imagesRepoPath: '/custom/images' })), '/custom/images');
  assert.match(imagesRepoPath(fakeVscode({ imagesRepoPath: '' })), /\/dev\/images$/);
}

function fakeVscode(options = {}) {
  const messages = options.messages || [];
  return {
    window: {
      showQuickPick: async items => items[0],
      showWarningMessage: message => messages.push(['warning', message]),
      showInformationMessage: message => messages.push(['info', message])
    },
    workspace: {
      getConfiguration: () => ({
        get: (key, defaultValue) => {
          if (key === 'imagesRepoPath') return options.imagesRepoPath ?? defaultValue;
          return defaultValue;
        }
      })
    },
    env: {
      clipboard: {
        writeText: async text => options.copied && options.copied.push(text)
      }
    }
  };
}

(async () => {
  await testPrepareCopiesRunPayload();
  await testEmptyAndMissingWriterStates();
  testImagesRepoPath();
  console.log('plannedPlacementRunCommand tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
