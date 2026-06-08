'use strict';

const assert = require('assert');
const {
  listOpenNeeds,
  listStagedAssets,
  listPlannedPlacements,
  needItem,
  assetItem,
  placementItem
} = require('../lib/ledgerBrowseCommands');

async function testListOpenNeedsCopiesSelection() {
  const copied = [];
  const vscode = fakeVscode({ copied, pickIndex: 0 });
  const ledgerWriter = {
    listOpenNeeds: async () => ({
      imageNeeds: [
        { id: 'need-1', reason: 'needs map', needed_asset_kind: 'map', content_draft_id: 'draft-1' }
      ]
    })
  };

  const result = await listOpenNeeds({ vscode, ledgerWriter });

  assert.strictEqual(result.id, 'need-1');
  assert.strictEqual(JSON.parse(copied[0]).id, 'need-1');
}

async function testListStagedAssetsCopiesSelection() {
  const copied = [];
  const vscode = fakeVscode({ copied, pickIndex: 0 });
  const ledgerWriter = {
    listStagedAssets: async () => ({
      assets: [
        { id: 'asset-1', display_name: 'River Map', status: 'staged', intake_section: 'water-series/part-09' }
      ]
    })
  };

  const result = await listStagedAssets({ vscode, ledgerWriter });

  assert.strictEqual(result.id, 'asset-1');
  assert.strictEqual(JSON.parse(copied[0]).display_name, 'River Map');
}

async function testListPlannedPlacementsCopiesSelection() {
  const copied = [];
  const vscode = fakeVscode({ copied, pickIndex: 0 });
  const ledgerWriter = {
    listPlannedPlacements: async () => ({
      placements: [
        {
          placement_id: 'placement-1',
          asset_id: 'asset-1',
          display_name: 'River Map',
          target: 'substack',
          figure_number: '3',
          draft_path: 'part-09.md',
          saga_status: 'running'
        }
      ]
    })
  };

  const result = await listPlannedPlacements({ vscode, ledgerWriter });

  assert.strictEqual(result.placement_id, 'placement-1');
  assert.strictEqual(JSON.parse(copied[0]).display_name, 'River Map');
}

async function testWarningsAndEmptyStates() {
  const messages = [];
  assert.strictEqual(await listOpenNeeds({ vscode: fakeVscode({ messages }) }), null);
  assert.strictEqual(messages[0][0], 'warning');

  const empty = await listStagedAssets({
    vscode: fakeVscode({ messages }),
    ledgerWriter: { listStagedAssets: async () => ({ assets: [] }) }
  });
  assert.deepStrictEqual(empty, []);

  const noPlacements = await listPlannedPlacements({
    vscode: fakeVscode({ messages }),
    ledgerWriter: { listPlannedPlacements: async () => ({ placements: [] }) }
  });
  assert.deepStrictEqual(noPlacements, []);
}

function testItems() {
  assert.deepStrictEqual(needItem({ id: 'n1', reason: 'dense prose', needed_asset_kind: 'diagram', content_draft_id: 'd1' }), {
    label: 'dense prose',
    description: 'n1',
    detail: 'diagram · d1',
    record: { id: 'n1', reason: 'dense prose', needed_asset_kind: 'diagram', content_draft_id: 'd1' }
  });
  assert.strictEqual(assetItem({ id: 'a1', display_name: 'Map', status: 'staged' }).label, 'Map');
  assert.deepStrictEqual(placementItem({
    placement_id: 'p1',
    asset_id: 'a1',
    display_name: 'Map',
    target: 'substack',
    figure_number: '4',
    draft_path: 'part-09.md',
    saga_status: 'running'
  }), {
    label: 'Map',
    description: 'substack · Figure 4',
    detail: 'part-09.md · saga: running · p1',
    record: {
      placement_id: 'p1',
      asset_id: 'a1',
      display_name: 'Map',
      target: 'substack',
      figure_number: '4',
      draft_path: 'part-09.md',
      saga_status: 'running'
    }
  });
}

function fakeVscode(options = {}) {
  const messages = options.messages || [];
  return {
    window: {
      showQuickPick: async items => items[options.pickIndex || 0],
      showWarningMessage: message => messages.push(['warning', message]),
      showInformationMessage: message => messages.push(['info', message])
    },
    env: {
      clipboard: {
        writeText: async text => options.copied && options.copied.push(text)
      }
    }
  };
}

(async () => {
  await testListOpenNeedsCopiesSelection();
  await testListStagedAssetsCopiesSelection();
  await testListPlannedPlacementsCopiesSelection();
  await testWarningsAndEmptyStates();
  testItems();
  console.log('ledgerBrowseCommands tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
