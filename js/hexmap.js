/**
 * IONIZING PAIN — Hex Map
 * Axial coordinate hex grid, tokens, freehand drawing
 */

const HEX_SIZE = 32; // px radius (flat-top)
const HEX_W = HEX_SIZE * 2;
const HEX_H = Math.sqrt(3) * HEX_SIZE;

// ─────────────────────────────────────────────
// HEX MATH (flat-top axial)
// ─────────────────────────────────────────────
function hexToPixel(q, r, originX, originY) {
  const x = HEX_SIZE * (3/2 * q) + originX;
  const y = HEX_SIZE * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r) + originY;
  return { x, y };
}

function pixelToHex(x, y, originX, originY) {
  const px = x - originX;
  const py = y - originY;
  const q = (2/3 * px) / HEX_SIZE;
  const r = (-1/3 * px + Math.sqrt(3)/3 * py) / HEX_SIZE;
  return hexRound(q, r);
}

function hexRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

function hexCorners(cx, cy) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 180 * (60 * i);
    return { x: cx + HEX_SIZE * Math.cos(angle), y: cy + HEX_SIZE * Math.sin(angle) };
  });
}

// ─────────────────────────────────────────────
// MAP STATE
// ─────────────────────────────────────────────
let mapState = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  tokens: [],      // [{profileId, name, q, r, color, isNPC}]
  drawings: [],    // [{id, ownerId, color, points:[{x,y}], width}]
  gridRadius: 12,  // hex grid radius
  tool: 'move',    // 'move' | 'draw' | 'erase'
  drawing: false,
  currentStroke: null,
  dragToken: null,
  dragOffset: { x: 0, y: 0 },
  isPanning: false,
  panStart: { x: 0, y: 0 },
};

let mapCanvas, drawCanvas, mapCtx, drawCtx;
let mapContainer;

// ─────────────────────────────────────────────
// INIT MAP
// ─────────────────────────────────────────────
function initMap(container) {
  mapContainer = container;
  container.innerHTML = '';
  container.style.cssText = 'position:relative;flex:1;overflow:hidden;background:var(--bg);';

  // Grid canvas (static)
  mapCanvas = document.createElement('canvas');
  mapCanvas.style.cssText = 'position:absolute;inset:0;';
  container.appendChild(mapCanvas);

  // Drawing canvas (interactive)
  drawCanvas = document.createElement('canvas');
  drawCanvas.style.cssText = 'position:absolute;inset:0;cursor:crosshair;';
  container.appendChild(drawCanvas);

  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);

  // Center grid
  mapState.offsetX = container.clientWidth / 2;
  mapState.offsetY = container.clientHeight / 2;

  drawCanvas.addEventListener('mousedown', onMapMouseDown);
  drawCanvas.addEventListener('mousemove', onMapMouseMove);
  drawCanvas.addEventListener('mouseup',   onMapMouseUp);
  drawCanvas.addEventListener('wheel',     onMapWheel, { passive: false });
  drawCanvas.addEventListener('contextmenu', e => e.preventDefault());

  // Touch support
  drawCanvas.addEventListener('touchstart', onTouchStart, { passive: false });
  drawCanvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
  drawCanvas.addEventListener('touchend',   onTouchEnd);

  renderMap();

  // WS events
  on('map:update', (map) => {
    if (map) {
      mapState.tokens   = map.tokens   || [];
      mapState.drawings = map.drawings || [];
      renderMap();
    }
  });

  on('token:move', (msg) => {
    const t = mapState.tokens.find(t => t.profileId === msg.profileId);
    if (t) { t.q = msg.q; t.r = msg.r; renderMap(); }
  });

  on('draw:stroke', (stroke) => {
    mapState.drawings.push(stroke);
    renderDrawings();
  });

  on('draw:erase', (ids) => {
    mapState.drawings = mapState.drawings.filter(s => !ids.includes(s.id));
    renderDrawings();
  });

  // Load existing map data
  if (State.campaign?.activeMap) {
    mapState.tokens   = State.campaign.activeMap.tokens   || [];
    mapState.drawings = State.campaign.activeMap.drawings || [];
    renderMap();
  }
}

function resizeCanvases() {
  if (!mapContainer) return;
  const W = mapContainer.clientWidth;
  const H = mapContainer.clientHeight;
  [mapCanvas, drawCanvas].forEach(c => { c.width = W; c.height = H; });
  mapCtx  = mapCanvas.getContext('2d');
  drawCtx = drawCanvas.getContext('2d');
  renderMap();
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────
function renderMap() {
  if (!mapCtx) return;
  const W = mapCanvas.width, H = mapCanvas.height;
  mapCtx.clearRect(0, 0, W, H);

  mapCtx.save();
  mapCtx.translate(mapState.offsetX, mapState.offsetY);
  mapCtx.scale(mapState.zoom, mapState.zoom);

  renderGrid(mapCtx);
  renderTokens(mapCtx);

  mapCtx.restore();
  renderDrawings();
}

function renderGrid(ctx) {
  const r = mapState.gridRadius;
  for (let q = -r; q <= r; q++) {
    const r1 = Math.max(-r, -q - r);
    const r2 = Math.min(r, -q + r);
    for (let ri = r1; ri <= r2; ri++) {
      const { x, y } = hexToPixel(q, ri, 0, 0);
      const corners = hexCorners(x, y);

      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(10,8,8,0.6)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(42,31,31,0.8)';
      ctx.lineWidth = 1 / mapState.zoom;
      ctx.stroke();

      // Coord label (small)
      if (mapState.zoom > 0.7) {
        ctx.fillStyle = 'rgba(58,46,46,0.6)';
        ctx.font = `${7 / mapState.zoom}px Space Mono`;
        ctx.textAlign = 'center';
        ctx.fillText(`${q},${ri}`, x, y + 3 / mapState.zoom);
      }
    }
  }
}

function renderTokens(ctx) {
  mapState.tokens.forEach(token => {
    const { x, y } = hexToPixel(token.q || 0, token.r || 0, 0, 0);
    const r = HEX_SIZE * 0.55;

    // Shadow
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    // Token circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = token.color || '#8b1a1a';
    ctx.fill();
    ctx.strokeStyle = token.profileId === State.profileId ? '#fff' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = token.profileId === State.profileId ? 2 : 1;
    ctx.stroke();

    // Initials
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${14 / mapState.zoom}px Bebas Neue`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((token.name || '?').substring(0, 2).toUpperCase(), x, y);
    ctx.textBaseline = 'alphabetic';

    // Name label below
    ctx.fillStyle = 'rgba(212,200,184,0.8)';
    ctx.font = `${8 / mapState.zoom}px Space Mono`;
    ctx.fillText(token.name || '?', x, y + r + 10 / mapState.zoom);
  });
}

function renderDrawings() {
  if (!drawCtx) return;
  const W = drawCanvas.width, H = drawCanvas.height;
  drawCtx.clearRect(0, 0, W, H);

  drawCtx.save();
  drawCtx.translate(mapState.offsetX, mapState.offsetY);
  drawCtx.scale(mapState.zoom, mapState.zoom);

  mapState.drawings.forEach(stroke => {
    if (!stroke.points || stroke.points.length < 2) return;
    drawCtx.beginPath();
    drawCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      drawCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    drawCtx.strokeStyle = stroke.color || '#c92b2b';
    drawCtx.lineWidth   = (stroke.width || 2) / mapState.zoom;
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';
    drawCtx.globalAlpha = stroke.alpha || 0.85;
    drawCtx.stroke();
    drawCtx.globalAlpha = 1;
  });

  // Current stroke being drawn
  if (mapState.currentStroke?.points?.length > 1) {
    const s = mapState.currentStroke;
    drawCtx.beginPath();
    drawCtx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) drawCtx.lineTo(s.points[i].x, s.points[i].y);
    drawCtx.strokeStyle = s.color;
    drawCtx.lineWidth = (s.width || 2) / mapState.zoom;
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';
    drawCtx.stroke();
  }

  drawCtx.restore();
}

// ─────────────────────────────────────────────
// COORDINATE HELPERS
// ─────────────────────────────────────────────
function canvasToWorld(cx, cy) {
  return {
    x: (cx - mapState.offsetX) / mapState.zoom,
    y: (cy - mapState.offsetY) / mapState.zoom,
  };
}

function getEventPos(e) {
  const rect = drawCanvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// ─────────────────────────────────────────────
// INPUT HANDLERS
// ─────────────────────────────────────────────
function onMapMouseDown(e) {
  const pos = getEventPos(e);
  const world = canvasToWorld(pos.x, pos.y);
  const hex = pixelToHex(world.x, world.y, 0, 0);

  // Right-click = pan
  if (e.button === 2) {
    mapState.isPanning = true;
    mapState.panStart = pos;
    drawCanvas.style.cursor = 'grabbing';
    return;
  }

  if (mapState.tool === 'move') {
    // Check if clicking a token
    const token = mapState.tokens.find(t => t.q === hex.q && t.r === hex.r);
    if (token) {
      const canMove = State.role === 'gm' || token.profileId === State.profileId;
      if (canMove) {
        mapState.dragToken = token;
        mapState.dragOffset = { x: world.x - hexToPixel(token.q, token.r, 0, 0).x,
                                y: world.y - hexToPixel(token.q, token.r, 0, 0).y };
        drawCanvas.style.cursor = 'grabbing';
      }
    } else {
      // Pan
      mapState.isPanning = true;
      mapState.panStart = pos;
      drawCanvas.style.cursor = 'grabbing';
    }
  } else if (mapState.tool === 'draw') {
    const color = State.myCharacter?.geneColor || '#c92b2b';
    mapState.drawing = true;
    mapState.currentStroke = {
      id: uid(),
      ownerId: State.profileId,
      color: State.role === 'gm' ? (mapState.drawColor || color) : color,
      width: mapState.brushSize || 2,
      points: [world],
      alpha: 0.85,
    };
  } else if (mapState.tool === 'erase') {
    eraseAt(world);
  }
}

function onMapMouseMove(e) {
  const pos = getEventPos(e);
  const world = canvasToWorld(pos.x, pos.y);

  if (mapState.isPanning) {
    const dx = pos.x - mapState.panStart.x;
    const dy = pos.y - mapState.panStart.y;
    mapState.offsetX += dx;
    mapState.offsetY += dy;
    mapState.panStart = pos;
    renderMap();
    return;
  }

  if (mapState.dragToken) {
    const hex = pixelToHex(world.x - mapState.dragOffset.x, world.y - mapState.dragOffset.y, 0, 0);
    mapState.dragToken.q = hex.q;
    mapState.dragToken.r = hex.r;
    renderMap();
    return;
  }

  if (mapState.drawing && mapState.currentStroke) {
    mapState.currentStroke.points.push(world);
    renderDrawings();
  }

  if (mapState.tool === 'erase' && e.buttons === 1) {
    eraseAt(world);
  }
}

function onMapMouseUp(e) {
  drawCanvas.style.cursor = mapState.tool === 'draw' ? 'crosshair' : 'default';

  if (mapState.isPanning) {
    mapState.isPanning = false;
    return;
  }

  if (mapState.dragToken) {
    const token = mapState.dragToken;
    mapState.dragToken = null;
    wsSend({ type: 'TOKEN_MOVE', profileId: token.profileId, q: token.q, r: token.r });
    persistMap();
    renderMap();
    return;
  }

  if (mapState.drawing && mapState.currentStroke) {
    mapState.drawing = false;
    if (mapState.currentStroke.points.length > 1) {
      mapState.drawings.push(mapState.currentStroke);
      wsSend({ type: 'DRAW', stroke: mapState.currentStroke });
      persistMap();
    }
    mapState.currentStroke = null;
    renderDrawings();
  }
}

function onMapWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const pos = getEventPos(e);
  // Zoom toward cursor
  mapState.offsetX = pos.x - (pos.x - mapState.offsetX) * delta;
  mapState.offsetY = pos.y - (pos.y - mapState.offsetY) * delta;
  mapState.zoom = Math.max(0.3, Math.min(3, mapState.zoom * delta));
  renderMap();
}

// Touch
let _touches = [];
function onTouchStart(e) {
  e.preventDefault();
  _touches = [...e.touches];
  if (e.touches.length === 1) {
    const pos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    onMapMouseDown({ ...pos, clientX: pos.x, clientY: pos.y, button: 0, buttons: 1 });
  }
}

function onTouchMove(e) {
  e.preventDefault();
  if (e.touches.length === 2) {
    // Pinch zoom
    const d1 = Math.hypot(_touches[1].clientX - _touches[0].clientX, _touches[1].clientY - _touches[0].clientY);
    const d2 = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
    const scale = d2 / d1;
    mapState.zoom = Math.max(0.3, Math.min(3, mapState.zoom * scale));
    _touches = [...e.touches];
    renderMap();
  } else if (e.touches.length === 1) {
    const pos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    onMapMouseMove({ ...pos, clientX: pos.x, clientY: pos.y, buttons: 1 });
  }
}

function onTouchEnd(e) {
  onMapMouseUp({});
}

// ─────────────────────────────────────────────
// ERASE
// ─────────────────────────────────────────────
function eraseAt(world) {
  const threshold = (mapState.brushSize || 10) / mapState.zoom;
  const toErase = mapState.drawings.filter(stroke => {
    if (State.role !== 'gm' && stroke.ownerId !== State.profileId) return false;
    return stroke.points.some(p => Math.hypot(p.x - world.x, p.y - world.y) < threshold);
  }).map(s => s.id);

  if (!toErase.length) return;
  mapState.drawings = mapState.drawings.filter(s => !toErase.includes(s.id));
  wsSend({ type: 'ERASE', strokeIds: toErase });
  persistMap();
  renderDrawings();
}

// ─────────────────────────────────────────────
// TOKEN MANAGEMENT
// ─────────────────────────────────────────────
function syncTokens() {
  // Build tokens from campaign profiles + characters
  if (!State.campaign) return;
  const existing = new Map(mapState.tokens.map(t => [t.profileId, t]));

  mapState.tokens = State.campaign.profiles.map(profile => {
    const char = State.campaign.characters[profile.id];
    const ex = existing.get(profile.id);
    return {
      profileId: profile.id,
      name: char?.name || profile.name,
      color: char?.geneColor || '#8b1a1a',
      q: ex?.q || 0,
      r: ex?.r || 0,
      isNPC: false,
    };
  });

  // Add NPC tokens
  (State.campaign.npcTokens || []).forEach(npc => {
    if (!mapState.tokens.find(t => t.profileId === npc.id)) {
      mapState.tokens.push(npc);
    }
  });

  persistMap();
  renderMap();
}

function addNPCToken() {
  const name = prompt('NPC Token Name:');
  if (!name) return;
  const color = prompt('Token Color (hex):', '#a0522d') || '#a0522d';
  const token = {
    profileId: 'npc_' + uid(),
    name, color, q: 0, r: 0, isNPC: true,
  };
  mapState.tokens.push(token);
  persistMap();
  renderMap();
}

// ─────────────────────────────────────────────
// PERSIST
// ─────────────────────────────────────────────
function persistMap() {
  const map = {
    id: State.campaign?.activeMap?.id || uid(),
    tokens: mapState.tokens,
    drawings: mapState.drawings,
  };
  wsSend({ type: 'MAP_UPDATE', map });
}

function saveMapNamed(name) {
  const map = {
    id: uid(),
    name: name || 'Map',
    tokens: mapState.tokens,
    drawings: mapState.drawings,
  };
  wsSend({ type: 'SAVE_MAP', map });
  sendLog(`🗺 Map saved: "${map.name}"`);
}

function loadSavedMap(mapId) {
  wsSend({ type: 'LOAD_MAP', mapId });
}

// ─────────────────────────────────────────────
// INITIATIVE TRACKER
// ─────────────────────────────────────────────
let initiative = {
  list: [],    // [{id, name, color, score, isNPC, profileId}]
  current: -1,
};

function renderInitiativeBar(container) {
  if (!container) return;
  const list = initiative.list;

  container.innerHTML = list.length ? list.map((e, i) => `
    <div class="init-entry ${i === initiative.current ? 'current' : ''} ${e.isNPC ? 'npc' : ''}"
      draggable="${State.role === 'gm' ? 'true' : 'false'}"
      data-idx="${i}">
      <div class="init-order">${i+1}</div>
      <div class="init-avatar" style="background:${e.color || '#8b1a1a'};border-color:${e.color || '#8b1a1a'};">
        ${(e.name||'?').substring(0,2).toUpperCase()}
      </div>
      <div class="init-name">${e.name}</div>
      <div class="init-score">${e.score} adj</div>
      ${State.role === 'gm' ? `<button class="btn-icon" onclick="removeFromInit(${i})">✕</button>` : ''}
    </div>
  `).join('') : '<div style="font-size:9px;color:var(--text-dim);padding:4px;">No combatants.</div>';

  if (State.role === 'gm') {
    initDragSort(container);
    // Re-attach dragend to sync order
    [...container.children].forEach(item => {
      item.addEventListener('dragend', () => {
        const newOrder = [...container.children].map(c => parseInt(c.dataset.idx));
        initiative.list = newOrder.map(i => initiative.list[i]);
        broadcastInitiative();
        renderInitiativeBar(container);
      });
    });
  }
}

function rollInitiativeForAll(container) {
  if (State.role !== 'gm') return;
  initiative.list = State.campaign.profiles.map(p => {
    const char = State.campaign.characters[p.id];
    const result = rollInitiative(char || {});
    return {
      id: p.id,
      profileId: p.id,
      name: char?.name || p.name,
      color: char?.geneColor || '#8b1a1a',
      score: result.adjustments,
      isNPC: false,
    };
  });
  initiative.list.sort((a, b) => a.score - b.score);
  initiative.current = 0;
  broadcastInitiative();
  renderInitiativeBar(container);
  sendLog(`⚔ Initiative rolled for all. Turn 1: ${initiative.list[0]?.name}`);
}

function nextTurn(container) {
  if (!initiative.list.length) return;
  initiative.current = (initiative.current + 1) % initiative.list.length;
  broadcastInitiative();
  renderInitiativeBar(container);
  sendLog(`▶ Turn: ${initiative.list[initiative.current]?.name}`);
}

function removeFromInit(idx) {
  initiative.list.splice(idx, 1);
  if (initiative.current >= initiative.list.length) initiative.current = initiative.list.length - 1;
  broadcastInitiative();
}

function broadcastInitiative() {
  wsSend({ type: 'INITIATIVE_UPDATE', initiative: { list: initiative.list, current: initiative.current } });
}

on('initiative:update', (data) => {
  initiative.list = data.list || [];
  initiative.current = data.current ?? -1;
  const bar = el('init-bar');
  if (bar) renderInitiativeBar(bar);
});

// ─────────────────────────────────────────────
// MAP TOOLBAR (returns DOM element)
// ─────────────────────────────────────────────
function buildMapToolbar() {
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:4px;align-items:center;padding:6px 10px;background:var(--surface);border-bottom:1px solid var(--border);flex-wrap:wrap;';

  bar.innerHTML = `
    <button class="btn btn-sm ${mapState.tool==='move'?'btn-blood':''}" onclick="setMapTool('move',this)" id="tool-move">MOVE</button>
    <button class="btn btn-sm ${mapState.tool==='draw'?'btn-blood':''}" onclick="setMapTool('draw',this)" id="tool-draw">DRAW</button>
    <button class="btn btn-sm ${mapState.tool==='erase'?'btn-blood':''}" onclick="setMapTool('erase',this)" id="tool-erase">ERASE</button>
    <label class="field-label" style="margin:0 4px 0 8px;">SIZE</label>
    <input type="range" min="1" max="20" value="${mapState.brushSize||2}"
      style="width:60px;" oninput="mapState.brushSize=parseInt(this.value)">
    ${State.role === 'gm' ? `
      <label class="field-label" style="margin:0 4px 0 8px;">COLOR</label>
      <input type="color" value="${mapState.drawColor||'#c92b2b'}"
        style="width:28px;height:22px;padding:1px;" oninput="mapState.drawColor=this.value">
      <div style="width:1px;height:20px;background:var(--border);margin:0 4px;"></div>
      <button class="btn btn-sm" onclick="addNPCToken()">+ NPC</button>
      <button class="btn btn-sm" onclick="syncTokens()">SYNC TOKENS</button>
      <button class="btn btn-sm" onclick="promptSaveMap()">SAVE MAP</button>
    ` : ''}
  `;

  return bar;
}

function setMapTool(tool, btn) {
  mapState.tool = tool;
  qsa('#tool-move,#tool-draw,#tool-erase').forEach(b => b.classList.remove('btn-blood'));
  if (btn) btn.classList.add('btn-blood');
  drawCanvas.style.cursor = tool === 'draw' ? 'crosshair' : tool === 'erase' ? 'cell' : 'default';
}

function promptSaveMap() {
  const name = prompt('Save map as:');
  if (name) saveMapNamed(name);
}
