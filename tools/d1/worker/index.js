'use strict';

const ledger = require('../../../extensions/image-staging/lib/assetLedgerD1');

async function fetch(request, env) {
  return handleRequest(request, env);
}

async function handleRequest(request, env = {}) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    requireDb(env);
    authorize(request, env);

    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/assets') {
      return json(await handleCreateAsset(request, env.DB), 201);
    }
    if (request.method === 'POST' && url.pathname === '/review-image-needs') {
      return json(await handleCreateReviewImageNeed(request, env.DB), 201);
    }
    if (request.method === 'POST' && url.pathname === '/placements') {
      return json(await handleCreatePlacement(request, env.DB), 201);
    }
    const sagaStepMatch = url.pathname.match(/^\/sagas\/([^/]+)\/step$/);
    if (request.method === 'POST' && sagaStepMatch) {
      return json(await handleMarkSagaStep(request, env.DB, sagaStepMatch[1]));
    }
    const sagaFailedMatch = url.pathname.match(/^\/sagas\/([^/]+)\/failed$/);
    if (request.method === 'POST' && sagaFailedMatch) {
      return json(await handleMarkFailed(request, env.DB, sagaFailedMatch[1]));
    }
    const assetPublishingMatch = url.pathname.match(/^\/assets\/([^/]+)\/publishing$/);
    if (request.method === 'POST' && assetPublishingMatch) {
      return json(await handleMarkAssetPublishing(env.DB, assetPublishingMatch[1]));
    }
    const assetPublicationMatch = url.pathname.match(/^\/assets\/([^/]+)\/publication$/);
    if (request.method === 'POST' && assetPublicationMatch) {
      return json(await handleUpdateAssetPublication(request, env.DB, assetPublicationMatch[1]));
    }
    const placementPublishingMatch = url.pathname.match(/^\/placements\/([^/]+)\/publishing$/);
    if (request.method === 'POST' && placementPublishingMatch) {
      return json(await handleMarkPlacementPublishing(env.DB, placementPublishingMatch[1]));
    }
    const placementSnippetMatch = url.pathname.match(/^\/placements\/([^/]+)\/snippet$/);
    if (request.method === 'POST' && placementSnippetMatch) {
      return json(await handleUpdatePlacementSnippet(request, env.DB, placementSnippetMatch[1]));
    }
    const placementPlacedMatch = url.pathname.match(/^\/placements\/([^/]+)\/placed$/);
    if (request.method === 'POST' && placementPlacedMatch) {
      return json(await handleMarkPlaced(request, env.DB, placementPlacedMatch[1]));
    }
    if (request.method === 'GET' && url.pathname === '/image-needs/open') {
      return json({ imageNeeds: await ledger.listOpenNeeds(env.DB, { contentDraftId: url.searchParams.get('contentDraftId') || undefined }) });
    }
    if (request.method === 'GET' && url.pathname === '/assets/staged') {
      return json({ assets: await ledger.listStagedAssets(env.DB) });
    }
    if (request.method === 'GET' && url.pathname === '/placements/planned') {
      return json({ placements: await ledger.listPlannedPlacements(env.DB, { contentDraftId: url.searchParams.get('contentDraftId') || undefined }) });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    const status = error.status || 500;
    return json({ error: error.message }, status);
  }
}

async function handleMarkSagaStep(request, db, sagaId) {
  const body = await readJson(request);
  await ledger.markSagaStep(db, decodeURIComponent(sagaId), body || {});
  return { sagaId: decodeURIComponent(sagaId), ok: true };
}

async function handleMarkFailed(request, db, sagaId) {
  const body = await readJson(request);
  await ledger.markFailed(db, {
    sagaId: decodeURIComponent(sagaId),
    error: body && body.error,
    resolution: body && body.resolution,
    nextRetryAt: body && body.nextRetryAt
  });
  return { sagaId: decodeURIComponent(sagaId), ok: true };
}

async function handleMarkAssetPublishing(db, assetId) {
  await ledger.markAssetPublishing(db, decodeURIComponent(assetId));
  return { assetId: decodeURIComponent(assetId), ok: true };
}

async function handleUpdateAssetPublication(request, db, assetId) {
  const body = await readJson(request);
  await ledger.updateAssetPublication(db, {
    assetId: decodeURIComponent(assetId),
    assetPath: body && body.assetPath,
    rawAssetUrl: body && body.rawAssetUrl
  });
  return { assetId: decodeURIComponent(assetId), ok: true };
}

async function handleMarkPlacementPublishing(db, placementId) {
  await ledger.markPlacementPublishing(db, decodeURIComponent(placementId));
  return { placementId: decodeURIComponent(placementId), ok: true };
}

async function handleUpdatePlacementSnippet(request, db, placementId) {
  const body = await readJson(request);
  await ledger.updatePlacementSnippet(db, {
    placementId: decodeURIComponent(placementId),
    snippet: body && body.snippet,
    snippetFormat: body && body.snippetFormat
  });
  return { placementId: decodeURIComponent(placementId), ok: true };
}

async function handleMarkPlaced(request, db, placementId) {
  const body = await readJson(request);
  await ledger.markPlaced(db, {
    placementId: decodeURIComponent(placementId),
    assetId: body && body.assetId,
    publishedUrl: body && body.publishedUrl
  });
  return { placementId: decodeURIComponent(placementId), ok: true };
}

async function handleCreateAsset(request, db) {
  const body = await readJson(request);
  if (!body.asset) throw httpError(400, 'Missing asset');
  const asset = await ledger.createAsset(db, body.asset);
  return { asset };
}

async function handleCreateReviewImageNeed(request, db) {
  const body = await readJson(request);
  if (!body.contentDraft) throw httpError(400, 'Missing contentDraft');
  if (!body.imageNeed) throw httpError(400, 'Missing imageNeed');

  await upsertContentDraft(db, body.contentDraft);
  const imageNeed = await ledger.createImageNeed(db, body.imageNeed);
  return { contentDraft: body.contentDraft, imageNeed };
}

async function handleCreatePlacement(request, db) {
  const body = await readJson(request);
  if (!body.placement) throw httpError(400, 'Missing placement');

  if (body.contentDraft) {
    await upsertContentDraft(db, body.contentDraft);
  }

  const placement = await ledger.createPlacement(db, body.placement);
  let saga = null;
  if (body.saga) {
    saga = await ledger.createSaga(db, {
      ...body.saga,
      assetId: body.saga.assetId || body.placement.assetId,
      assetPlacementId: body.saga.assetPlacementId || body.placement.id
    });
  }

  return { placement, saga };
}

async function upsertContentDraft(db, draft) {
  await db.prepare(`
    INSERT INTO content_draft (
      id,
      content_item_id,
      content_repo_path,
      draft_path,
      title,
      heading_anchor,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      content_item_id = excluded.content_item_id,
      content_repo_path = excluded.content_repo_path,
      draft_path = excluded.draft_path,
      title = excluded.title,
      heading_anchor = excluded.heading_anchor,
      status = excluded.status,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).bind(
    draft.id,
    draft.contentItemId || null,
    draft.contentRepoPath || null,
    draft.draftPath,
    draft.title || null,
    draft.headingAnchor || null,
    draft.status || 'active'
  ).run();
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw httpError(400, 'Invalid JSON body');
  }
}

function requireDb(env) {
  if (!env.DB) throw httpError(500, 'Missing D1 DB binding');
}

function authorize(request, env) {
  if (!env.LEDGER_API_TOKEN) return;
  const expected = `Bearer ${env.LEDGER_API_TOKEN}`;
  if (request.headers.get('authorization') !== expected) {
    throw httpError(401, 'Unauthorized');
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json'
    }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  fetch,
  handleRequest,
  handleCreateAsset,
  handleCreateReviewImageNeed,
  handleCreatePlacement,
  handleMarkSagaStep,
  handleMarkFailed,
  handleMarkAssetPublishing,
  handleUpdateAssetPublication,
  handleMarkPlacementPublishing,
  handleUpdatePlacementSnippet,
  handleMarkPlaced,
  upsertContentDraft
};
