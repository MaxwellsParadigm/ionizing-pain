/**
 * IONIZING PAIN — Character Sheet
 * Anatomical silhouette, door management, balance display
 */

// ─────────────────────────────────────────────
// LAYER DEFINITIONS
// ─────────────────────────────────────────────
const LIMB_LAYERS = {
  head: {
    maxVessels: 3,
    layers: [
      { id: 'skull',  label: 'Skull',  layer: 'BONE', organ: null },
      { id: 'brain',  label: 'Brain',  layer: 'MEAT', organ: null },
      { id: 'scalp',  label: 'Scalp',  layer: 'SKIN', organ: null },
      { id: 'apparatus', label: 'Apparatus', layer: 'APPARATUS', organ: null, sublayers: [
        { id: 'nose',  label: 'Nose' },
        { id: 'earL',  label: 'Ear (L)' },
        { id: 'earR',  label: 'Ear (R)' },
        { id: 'nerves',label: 'Nerves' },
        { id: 'eyeL',  label: 'Eye (L)' },
        { id: 'eyeR',  label: 'Eye (R)' },
        { id: 'mouth', label: 'Mouth' },
      ]},
    ],
  },
  armL: { label: 'Left Arm',  maxVessels: 3, layers: [
    { id: 'bone', label: 'Arm Bones', layer: 'BONE', organ: null },
    { id: 'meat', label: 'Muscle',    layer: 'MEAT', organ: null },
    { id: 'skin', label: 'Arm Skin',  layer: 'SKIN', organ: null },
  ]},
  armR: { label: 'Right Arm', maxVessels: 3, layers: [
    { id: 'bone', label: 'Arm Bones', layer: 'BONE', organ: null },
    { id: 'meat', label: 'Muscle',    layer: 'MEAT', organ: null },
    { id: 'skin', label: 'Arm Skin',  layer: 'SKIN', organ: null },
  ]},
  torso: { maxVessels: 6, layers: [
    { id: 'ribs',    label: 'Ribs',    layer: 'BONE', organ: 'Ribs' },
    { id: 'spine',   label: 'Spine',   layer: 'BONE', organ: 'Spine' },
    { id: 'pelvis',  label: 'Pelvis',  layer: 'BONE', organ: 'Pelvis' },
    { id: 'heart',   label: 'Heart',   layer: 'MEAT', organ: 'Heart' },
    { id: 'lungs',   label: 'Lungs',   layer: 'MEAT', organ: 'Lungs' },
    { id: 'guts',    label: 'Guts',    layer: 'MEAT', organ: 'Guts' },
    { id: 'chest',   label: 'Chest',   layer: 'SKIN', organ: 'Chest' },
    { id: 'back',    label: 'Back',    layer: 'SKIN', organ: 'Back' },
    { id: 'abdomen', label: 'Abdomen', layer: 'SKIN', organ: 'Abdomen' },
  ]},
  legL: { label: 'Left Leg',  maxVessels: 3, layers: [
    { id: 'bone', label: 'Leg Bones', layer: 'BONE', organ: null },
    { id: 'meat', label: 'Muscle',    layer: 'MEAT', organ: null },
    { id: 'skin', label: 'Leg Skin',  layer: 'SKIN', organ: null },
  ]},
  legR: { label: 'Right Leg', maxVessels: 3, layers: [
    { id: 'bone', label: 'Leg Bones', layer: 'BONE', organ: null },
    { id: 'meat', label: 'Muscle',    layer: 'MEAT', organ: null },
    { id: 'skin', label: 'Leg Skin',  layer: 'SKIN', organ: null },
  ]},
};

const LAYER_COLOR = { BONE: '#e8dfc0', MEAT: '#8b2222', SKIN: '#c8885a', APPARATUS: '#4a8fbe' };

// ─────────────────────────────────────────────
// RENDER CHARACTER SHEET
// ─────────────────────────────────────────────
function renderCharSheet(character, container, readonly) {
  if (!character || !container) return;
  container.innerHTML = '';

  // ── Header row ──
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border);background:var(--surface);';

  const nameWrap = document.createElement('div');
  nameWrap.style.flex = '1';
  if (readonly) {
    nameWrap.innerHTML = `<div style="font-family:var(--font-display);font-size:26px;letter-spacing:4px;color:var(--blood-bright);">${character.name || 'Pioneer'}</div>`;
  } else {
    nameWrap.innerHTML = `
      <label class="field-label">PIONEER NAME</label>
      <input id="cs-name" type="text" value="${character.name || ''}" placeholder="PIONEER NAME"
        style="background:transparent;border:none;border-bottom:1px solid var(--border-hot);
               font-family:var(--font-display);font-size:22px;letter-spacing:3px;color:var(--blood-bright);padding:2px 0;">
    `;
  }
  hdr.appendChild(nameWrap);

  // Gene color
  const geneColorWrap = document.createElement('div');
  geneColorWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';
  geneColorWrap.innerHTML = `
    <label class="field-label">GENE COLOR</label>
    <input id="cs-gene-color" type="color" value="${character.geneColor || '#8b1a1a'}"
      ${readonly ? 'disabled' : ''} style="width:36px;height:36px;">
  `;
  hdr.appendChild(geneColorWrap);
  container.appendChild(hdr);

  // ── Main body ──
  const body = document.createElement('div');
  body.style.cssText = 'display:flex;gap:0;height:calc(100% - 54px);overflow:hidden;';

  // Left panel: silhouette
  const leftPane = document.createElement('div');
  leftPane.style.cssText = 'flex:0 0 380px;overflow-y:auto;padding:14px;border-right:1px solid var(--border);background:var(--bg);';
  leftPane.appendChild(buildSilhouette(character, readonly));
  body.appendChild(leftPane);

  // Right panel: balance + gene + doors list
  const rightPane = document.createElement('div');
  rightPane.style.cssText = 'flex:1;overflow-y:auto;padding:14px;';
  rightPane.appendChild(buildRightPanel(character, readonly));
  body.appendChild(rightPane);

  container.appendChild(body);

  // Bind live inputs
  if (!readonly) {
    bindCharSheetInputs(character, container);
  }
}

// ─────────────────────────────────────────────
// SILHOUETTE
// ─────────────────────────────────────────────
function buildSilhouette(character, readonly) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;';

  const title = document.createElement('div');
  title.className = 'sec-title';
  title.textContent = 'MORTISE MAP';
  wrap.appendChild(title);

  // Apparatus arcs above figure
  const apparatus = document.createElement('div');
  apparatus.style.cssText = 'display:flex;justify-content:center;gap:4px;margin-bottom:4px;flex-wrap:wrap;';
  const apparatusParts = ['Nose','Ear L','Nerves','Eye L','Eye R','Ear R','Mouth'];
  apparatusParts.forEach(label => {
    const slotId = 'apparatus_' + label.replace(/\s+/g,'_').toLowerCase();
    const door = (character.doors || []).find(d => d.limb === 'head' && d.organ === label);
    const btn = document.createElement('div');
    btn.dataset.limb = 'head'; btn.dataset.layer = 'APPARATUS'; btn.dataset.organ = label;
    btn.title = label;
    btn.style.cssText = `
      padding:2px 6px;border:1px solid ${door ? 'var(--ion)' : 'var(--border)'};
      font-size:8px;letter-spacing:1px;cursor:pointer;color:${door ? 'var(--ion)' : 'var(--text-dim)'};
      background:${door ? 'rgba(74,143,190,0.1)' : 'transparent'};
      transition:all 0.15s;border-radius:10px;white-space:nowrap;
    `;
    btn.textContent = label.toUpperCase();
    if (!readonly) btn.onclick = () => openDoorSlot(character, 'head', 'APPARATUS', label);
    else btn.onclick = () => previewDoorSlot(character, 'head', 'APPARATUS', label);
    apparatus.appendChild(btn);
  });
  wrap.appendChild(apparatus);

  // SVG silhouette
  const svgContainer = document.createElement('div');
  svgContainer.style.cssText = 'position:relative;display:flex;justify-content:center;';
  svgContainer.innerHTML = buildBodySVG(character, readonly);
  wrap.appendChild(svgContainer);

  // Legend
  const legend = document.createElement('div');
  legend.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:8px;flex-wrap:wrap;';
  [['BONE', 'var(--bone)'], ['MEAT','var(--meat)'], ['SKIN','var(--skin)'], ['FREE','var(--border)']].forEach(([label, color]) => {
    legend.innerHTML += `<div style="display:flex;align-items:center;gap:4px;font-size:9px;color:var(--text-muted);">
      <div style="width:10px;height:10px;background:${color};opacity:0.7;"></div>${label}
    </div>`;
  });
  wrap.appendChild(legend);

  return wrap;
}

function buildBodySVG(character, readonly) {
  // Responsive SVG with anatomical regions as clickable zones
  // Zones: head, torso, armL, armR, legL, legR
  // Each zone shows layer slots as small dots/nodes

  const W = 340, H = 520;

  // Limb positions (center, radius-ish)
  const regions = {
    head:  { cx: 170, cy: 60,  rx: 36, ry: 44 },
    torso: { cx: 170, cy: 195, rx: 52, ry: 75 },
    armL:  { cx: 80,  cy: 195, rx: 28, ry: 72 },
    armR:  { cx: 260, cy: 195, rx: 28, ry: 72 },
    legL:  { cx: 140, cy: 380, rx: 26, ry: 80 },
    legR:  { cx: 200, cy: 380, rx: 26, ry: 80 },
  };

  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background body shape -->
  <g opacity="0.18">
    <!-- Head -->
    <ellipse cx="170" cy="60" rx="34" ry="42" fill="#d4c8b8"/>
    <!-- Neck -->
    <rect x="158" y="96" width="24" height="22" fill="#d4c8b8"/>
    <!-- Torso -->
    <path d="M118,118 L118,265 Q118,278 132,280 L208,280 Q222,278 222,265 L222,118 Q210,112 170,112 Q130,112 118,118 Z" fill="#d4c8b8"/>
    <!-- Shoulders -->
    <ellipse cx="100" cy="135" rx="18" ry="14" fill="#d4c8b8"/>
    <ellipse cx="240" cy="135" rx="18" ry="14" fill="#d4c8b8"/>
    <!-- Left arm -->
    <path d="M84,145 Q72,160 68,200 Q65,230 70,260 L90,260 Q95,230 92,200 Q90,165 98,148 Z" fill="#d4c8b8"/>
    <!-- Right arm -->
    <path d="M256,145 Q268,160 272,200 Q275,230 270,260 L250,260 Q245,230 248,200 Q250,165 242,148 Z" fill="#d4c8b8"/>
    <!-- Left forearm -->
    <path d="M70,260 Q68,285 72,310 Q74,325 78,330 L88,330 Q92,325 90,310 Q90,285 90,260 Z" fill="#d4c8b8"/>
    <!-- Right forearm -->
    <path d="M250,260 Q252,285 248,310 Q246,325 242,330 L252,330 Q256,325 258,310 Q262,285 260,260 Z" fill="#d4c8b8"/>
    <!-- Left hand -->
    <ellipse cx="80" cy="340" rx="14" ry="10" fill="#d4c8b8"/>
    <!-- Right hand -->
    <ellipse cx="250" cy="340" rx="14" ry="10" fill="#d4c8b8"/>
    <!-- Pelvis/hip -->
    <path d="M128,278 L128,308 Q130,316 148,318 Q170,320 192,318 Q210,316 212,308 L212,278 Z" fill="#d4c8b8"/>
    <!-- Left thigh -->
    <path d="M132,308 Q125,335 126,365 Q127,390 130,408 L152,408 Q152,390 150,365 Q148,335 148,308 Z" fill="#d4c8b8"/>
    <!-- Right thigh -->
    <path d="M208,308 Q215,335 214,365 Q213,390 210,408 L188,408 Q188,390 190,365 Q192,335 192,308 Z" fill="#d4c8b8"/>
    <!-- Left shin -->
    <path d="M130,408 Q128,438 130,462 Q131,475 135,480 L149,480 Q151,475 150,462 Q150,438 152,408 Z" fill="#d4c8b8"/>
    <!-- Right shin -->
    <path d="M210,408 Q212,438 210,462 Q209,475 205,480 L191,480 Q189,475 190,462 Q190,438 188,408 Z" fill="#d4c8b8"/>
    <!-- Feet -->
    <ellipse cx="140" cy="488" rx="14" ry="8" fill="#d4c8b8"/>
    <ellipse cx="200" cy="488" rx="14" ry="8" fill="#d4c8b8"/>
  </g>

  <!-- Connecting lines between regions -->
  <g stroke="var(--border)" stroke-width="0.5" opacity="0.4" fill="none">
    <line x1="170" y1="102" x2="170" y2="118"/>
    <line x1="118" y1="130" x2="100" y2="135"/>
    <line x1="222" y1="130" x2="240" y2="135"/>
    <line x1="170" y1="278" x2="140" y2="308"/>
    <line x1="170" y1="278" x2="200" y2="308"/>
  </g>
  `;

  // Render layer slots on each limb
  Object.entries(LIMB_LAYERS).forEach(([limb, def]) => {
    if (limb === 'head') {
      // Head layers: skull(bone), brain(meat), scalp(skin)
      const slots = def.layers.filter(l => l.id !== 'apparatus');
      svg += renderLimbSlots(character, limb, slots, readonly, {
        head: { cx: 170, cy: 60 }
      });
    } else if (limb === 'torso') {
      svg += renderTorsoSlots(character, readonly);
    } else {
      const posMap = {
        armL: { cx: 79, cy: 195 },
        armR: { cx: 261, cy: 195 },
        legL: { cx: 140, cy: 385 },
        legR: { cx: 200, cy: 385 },
      };
      svg += renderLimbSlots(character, limb, def.layers, readonly, posMap);
    }
  });

  // HP dice on each region
  svg += renderHPNodes(character);

  svg += '</svg>';
  return svg;
}

function renderLimbSlots(character, limb, slots, readonly, posMap) {
  let out = '';
  const pos = posMap[limb] || { cx: 170, cy: 60 };

  // 3 slots stacked vertically
  slots.forEach((slot, i) => {
    const door = (character.doors || []).find(d =>
      d.limb === limb && d.layer === slot.layer && (!slot.organ || d.organ === slot.organ)
    );
    const color = door ? LAYER_COLOR[slot.layer] : 'var(--border)';
    const filled = !!door;
    const x = pos.cx;
    const y = pos.cy - 18 + i * 18;
    const r = 7;

    out += `<g class="layer-slot" data-limb="${limb}" data-layer="${slot.layer}" data-organ="${slot.organ || ''}"
      style="cursor:pointer;" onclick="handleSilhouetteClick(event,'${limb}','${slot.layer}','${slot.organ || ''}')">
      <circle cx="${x}" cy="${y}" r="${r}" fill="${filled ? color : 'transparent'}"
        stroke="${color}" stroke-width="${filled ? 0 : 1}" opacity="0.85"/>
      ${filled ? `<circle cx="${x}" cy="${y}" r="3" fill="rgba(0,0,0,0.4)"/>` : ''}
      <text x="${x + r + 3}" y="${y + 3}" font-size="7" fill="${color}" font-family="Space Mono, monospace"
        opacity="${filled ? 1 : 0.5}">${slot.label.substring(0,6).toUpperCase()}</text>
    </g>`;
  });
  return out;
}

function renderTorsoSlots(character, readonly) {
  let out = '';
  const torsoLayers = LIMB_LAYERS.torso.layers;
  // Torso: 3 columns (BONE/MEAT/SKIN), each with multiple organs
  const cols = { BONE: [], MEAT: [], SKIN: [] };
  torsoLayers.forEach(s => cols[s.layer].push(s));

  const colX = { BONE: 140, MEAT: 170, SKIN: 200 };

  Object.entries(cols).forEach(([layer, slots]) => {
    slots.forEach((slot, i) => {
      const door = (character.doors || []).find(d =>
        d.limb === 'torso' && d.layer === layer && d.organ === slot.organ
      );
      const color = door ? LAYER_COLOR[layer] : '#2a1f1f';
      const x = colX[layer];
      const y = 160 + i * 24;
      const r = 8;

      out += `<g class="layer-slot" style="cursor:pointer;"
        onclick="handleSilhouetteClick(event,'torso','${layer}','${slot.organ}')">
        <circle cx="${x}" cy="${y}" r="${r}"
          fill="${door ? LAYER_COLOR[layer] : 'transparent'}"
          stroke="${door ? LAYER_COLOR[layer] : '#2a1f1f'}" stroke-width="1" opacity="0.9"/>
        <text x="${x}" y="${y+3}" text-anchor="middle" font-size="6" fill="${door ? '#000' : LAYER_COLOR[layer]}"
          font-family="Space Mono,monospace" opacity="${door ? 1 : 0.6}">${slot.organ.substring(0,3).toUpperCase()}</text>
      </g>`;
    });
  });

  // Column labels
  out += `
    <text x="140" y="148" text-anchor="middle" font-size="7" fill="var(--bone)" font-family="Space Mono,monospace" opacity="0.6">BONE</text>
    <text x="170" y="148" text-anchor="middle" font-size="7" fill="var(--meat)" font-family="Space Mono,monospace" opacity="0.6">MEAT</text>
    <text x="200" y="148" text-anchor="middle" font-size="7" fill="var(--skin)" font-family="Space Mono,monospace" opacity="0.6">SKIN</text>
  `;

  return out;
}

function renderHPNodes(character) {
  // Small d6 nodes showing limb HP
  const positions = {
    head:  { x: 208, y: 38 },
    armL:  { x: 48,  y: 175 },
    armR:  { x: 282, y: 175 },
    torso: { x: 230, y: 195 },
    legL:  { x: 106, y: 380 },
    legR:  { x: 224, y: 380 },
  };

  let out = '';
  Object.entries(positions).forEach(([limb, pos]) => {
    const hp = (character.limbHP || {})[limb] || 6;
    const pct = hp / 6;
    const color = pct > 0.6 ? '#4a9a4a' : pct > 0.3 ? '#b8952a' : '#c92b2b';
    out += `
      <g onclick="adjustHP('${limb}')" style="cursor:pointer;">
        <rect x="${pos.x-10}" y="${pos.y-10}" width="20" height="20" rx="3"
          fill="var(--surface2)" stroke="${color}" stroke-width="1"/>
        <text x="${pos.x}" y="${pos.y+4}" text-anchor="middle" font-size="10"
          fill="${color}" font-weight="bold" font-family="Space Mono,monospace">${hp}</text>
      </g>
    `;
  });
  return out;
}

// ─────────────────────────────────────────────
// SLOT CLICK HANDLERS
// ─────────────────────────────────────────────
let _slotClickChar = null;
let _slotClickReadonly = false;

function handleSilhouetteClick(evt, limb, layer, organ) {
  evt.stopPropagation();
  const character = _slotClickChar;
  if (!character) return;

  const door = (character.doors || []).find(d =>
    d.limb === limb && d.layer === layer && (organ ? d.organ === organ : !d.organ)
  );

  if (_slotClickReadonly || !(State.role === 'gm' || character.profileId === State.profileId)) {
    // Preview only
    if (door) showDoorPreview(door);
    return;
  }

  if (door) {
    showDoorPreview(door, true); // with edit option
  } else {
    openDoorModal(character, limb, layer, organ);
  }
}

function adjustHP(limb) {
  const character = _slotClickChar;
  if (!character) return;
  if (State.role !== 'gm' && character.profileId !== State.profileId) return;
  const current = (character.limbHP || {})[limb] || 6;
  const val = prompt(`Set HP for ${limb} (0-6):`, current);
  if (val === null) return;
  const n = Math.max(0, Math.min(6, parseInt(val) || 0));
  if (!character.limbHP) character.limbHP = {};
  character.limbHP[limb] = n;
  saveCharacter(character);
  refreshCharSheet();
}

// ─────────────────────────────────────────────
// RIGHT PANEL
// ─────────────────────────────────────────────
function buildRightPanel(character, readonly) {
  const wrap = document.createElement('div');

  // Balance
  const { bone, meat, skin } = computeBalance(character);
  const order = getBalanceOrder(character);
  const orderStr = order.map(l => l.name).join(' < ');
  const hasEqual = hasEqualBalance(character);

  wrap.innerHTML = `
    <div class="sec-title">BALANCE</div>
    <div class="balance-row">
      <div class="balance-cell BONE">
        <div class="balance-label">BONE</div>
        <div class="balance-val" style="color:var(--bone);">${bone}</div>
      </div>
      <div class="balance-cell MEAT">
        <div class="balance-label">MEAT</div>
        <div class="balance-val" style="color:var(--meat);">${meat}</div>
      </div>
      <div class="balance-cell SKIN">
        <div class="balance-label">SKIN</div>
        <div class="balance-val" style="color:var(--skin);">${skin}</div>
      </div>
    </div>
    <div class="balance-order-str" id="cs-balance-order">
      ORDER: <span>${orderStr}</span>
      ${hasEqual ? `<button class="btn btn-sm" style="margin-left:8px;" onclick="openPriorityModal()">SET PRIORITY</button>` : ''}
    </div>

    <div class="sec-title" style="margin-top:14px;">GENE</div>
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      ${readonly ? `
        <div style="font-family:var(--font-prose);font-style:italic;color:var(--text-muted);font-size:12px;line-height:1.6;">${character.geneDesc || '<em>No gene described.</em>'}</div>
      ` : `
        <textarea id="cs-gene" rows="3" placeholder="Describe your ionic signature..."
          style="flex:1;">${character.geneDesc || ''}</textarea>
      `}
    </div>

    ${readonly ? '' : `
      <div class="sec-title" style="margin-top:14px;">NOTES</div>
      <textarea id="cs-notes" rows="3" placeholder="Narrative notes...">${character.notes || ''}</textarea>
    `}

    <div class="sec-title" style="margin-top:14px;">DOORS <span style="font-size:10px;font-family:var(--font-mono);color:var(--text-dim);">(${(character.doors||[]).length})</span></div>
    <div id="cs-door-list"></div>
    ${readonly ? '' : `<button class="btn btn-blood btn-full" onclick="openDoorModal(null)">+ OPEN NEW DOOR</button>`}

    <div class="sec-title" style="margin-top:14px;">COMPETENCES</div>
    <div id="cs-comp-list"></div>
    ${readonly ? '' : `<button class="btn btn-blood btn-full" style="margin-top:4px;" onclick="openCompModal()">+ ADD COMPETENCE</button>`}
  `;

  // Render doors list
  const doorListEl = wrap.querySelector('#cs-door-list');
  renderDoorList(character, doorListEl, readonly);

  // Render comps
  const compListEl = wrap.querySelector('#cs-comp-list');
  renderCompList(character, compListEl, readonly);

  return wrap;
}

function renderDoorList(character, el, readonly) {
  if (!el) return;
  const doors = character.doors || [];
  if (!doors.length) {
    el.innerHTML = '<div class="prose" style="font-size:11px;color:var(--text-dim);padding:4px 0;">No Doors yet.</div>';
    return;
  }

  el.innerHTML = doors.map((door, i) => {
    const layerColor = LAYER_COLOR[door.layer] || '#888';
    const vesselUsedCount = door.vesselState ? door.vesselState.filter(Boolean).length : 0;

    return `<div class="card card-blood" style="border-left-color:${layerColor};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
        <div style="font-family:var(--font-display);font-size:14px;letter-spacing:1px;color:${layerColor};">${door.name || 'Unnamed Door'}</div>
        ${readonly ? '' : `<div style="display:flex;gap:4px;">
          <button class="btn-icon" onclick="editDoor(${i})" title="Edit">✎</button>
          <button class="btn-icon" onclick="deleteDoor(${i})" title="Delete">✕</button>
        </div>`}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px;">
        <span class="tag tag-${door.layer?.toLowerCase()}">${door.layer}</span>
        <span class="tag ${door.active==='active'?'tag-active':'tag-passive'}">${door.active}</span>
        <span class="tag" style="border-color:var(--border);color:var(--text-muted);">${door.limb}</span>
        ${door.organ ? `<span class="tag" style="border-color:var(--border);color:var(--text-muted);">${door.organ}</span>` : ''}
      </div>
      ${door.ritual ? `<div style="font-size:9px;color:var(--text-dim);margin-bottom:3px;">RITUAL: ${door.ritual}</div>` : ''}
      ${door.effect ? `<div class="prose" style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">${door.effect}</div>` : ''}
      ${door.pledge ? `<div style="font-size:11px;border-top:1px solid var(--border);padding-top:3px;margin-top:3px;">
        <span style="font-size:9px;letter-spacing:1px;color:var(--text-dim);">PLEDGE: </span>
        <span class="prose" style="color:var(--blood-bright);">${door.pledge}</span>
      </div>` : ''}
      <div style="margin-top:4px;display:flex;align-items:center;gap:4px;">
        <span style="font-size:9px;color:var(--text-dim);">ION:</span>
        ${Array.from({length: door.vessels || 0}, (_, vi) => `
          <div class="vessel ${door.vesselState?.[vi] ? 'filled' : ''} ${door.active==='passive' ? 'blocked' : ''}"
            ${!readonly && door.active==='active' ? `onclick="toggleVessel(${i},${vi})"` : ''}></div>
        `).join('')}
        ${!readonly && door.active === 'active' ? `
          <button class="btn btn-sm btn-blood" style="margin-left:6px;"
            onclick="utilizeDoor(${i})">UTILIZE</button>
        ` : ''}
      </div>
      ${(door.boneMod||0)!==0||(door.meatMod||0)!==0||(door.skinMod||0)!==0 ? `
        <div style="font-size:9px;color:var(--text-dim);margin-top:4px;">
          BALANCE: ${door.boneMod?`<span style="color:var(--bone);">BONE${door.boneMod>0?'+':''}${door.boneMod}</span> `:''}
          ${door.meatMod?`<span style="color:var(--meat);">MEAT${door.meatMod>0?'+':''}${door.meatMod}</span> `:''}
          ${door.skinMod?`<span style="color:var(--skin);">SKIN${door.skinMod>0?'+':''}${door.skinMod}</span>`:''}
        </div>
      ` : ''}
    </div>`;
  }).join('');
}

function renderCompList(character, el, readonly) {
  if (!el) return;
  const comps = character.comps || [];
  if (!comps.length) {
    el.innerHTML = '<div class="prose" style="font-size:11px;color:var(--text-dim);padding:4px 0;">No Competences yet.</div>';
    return;
  }
  el.innerHTML = comps.map((c, i) => `
    <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px dashed var(--border);">
      <div style="width:8px;height:8px;background:var(--${c.layer?.toLowerCase()});border-radius:50%;flex-shrink:0;"></div>
      <div style="flex:1;font-family:var(--font-prose);font-size:12px;">${c.name}</div>
      <div style="font-size:9px;color:var(--text-dim);">${c.narrowness?.[0]}/${c.proficiency?.[0]}</div>
      ${readonly ? '' : `<button class="btn-icon" onclick="deleteComp(${i})">✕</button>`}
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// BIND INPUTS
// ─────────────────────────────────────────────
function bindCharSheetInputs(character, container) {
  const nameEl = container.querySelector('#cs-name');
  const geneEl = container.querySelector('#cs-gene');
  const notesEl = container.querySelector('#cs-notes');
  const colorEl = container.querySelector('#cs-gene-color');

  if (nameEl) nameEl.addEventListener('input', e => { character.name = e.target.value; scheduleSave(character); });
  if (geneEl) geneEl.addEventListener('input', e => { character.geneDesc = e.target.value; scheduleSave(character); });
  if (notesEl) notesEl.addEventListener('input', e => { character.notes = e.target.value; scheduleSave(character); });
  if (colorEl) colorEl.addEventListener('input', e => { character.geneColor = e.target.value; scheduleSave(character); });
}

let _saveTimer = null;
function scheduleSave(character) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => saveCharacter(character), 800);
}

// ─────────────────────────────────────────────
// DOOR MODAL
// ─────────────────────────────────────────────
let _doorModalChar = null;
let _doorModalEditIdx = null;
let _doorModalLimb = null;
let _doorModalLayer = null;
let _doorModalOrgan = null;

function openDoorModal(character, limb, layer, organ) {
  _doorModalChar = character || _slotClickChar;
  _doorModalEditIdx = null;
  _doorModalLimb = limb || null;
  _doorModalLayer = layer || null;
  _doorModalOrgan = organ || null;
  populateDoorModal(null);
  el('doorModal').classList.add('open');
}

function editDoor(idx) {
  _doorModalChar = _slotClickChar;
  _doorModalEditIdx = idx;
  const door = _doorModalChar.doors[idx];
  _doorModalLimb = door.limb;
  _doorModalLayer = door.layer;
  _doorModalOrgan = door.organ;
  populateDoorModal(door);
  el('doorModal').classList.add('open');
}

function populateDoorModal(door) {
  el('door-name').value  = door?.name  || '';
  el('door-effect').value = door?.effect || '';
  el('door-pledge').value = door?.pledge || '';
  el('door-ritual').value = door?.ritual || '';
  el('door-limb').value   = door?.limb  || _doorModalLimb || 'armL';
  el('door-active').value = door?.active || 'active';
  el('door-vessels').value = door?.vessels || 1;
  el('door-bone-mod').value = door?.boneMod || 0;
  el('door-meat-mod').value = door?.meatMod || 0;
  el('door-skin-mod').value = door?.skinMod || 0;
  updateDoorLayerOptions();
}

function updateDoorLayerOptions() {
  const limb = el('door-limb').value;
  const layerSel = el('door-layer');
  const organSel = el('door-organ');
  layerSel.innerHTML = '';
  organSel.innerHTML = '<option value="">—</option>';

  const def = LIMB_LAYERS[limb];
  if (!def) return;

  const uniqueLayers = [...new Set(def.layers.map(l => l.layer))];
  uniqueLayers.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l; opt.textContent = l;
    if (_doorModalLayer && l === _doorModalLayer) opt.selected = true;
    layerSel.appendChild(opt);
  });

  updateOrganOptions();
}

function updateOrganOptions() {
  const limb = el('door-limb').value;
  const layer = el('door-layer').value;
  const organSel = el('door-organ');
  organSel.innerHTML = '<option value="">—</option>';

  const def = LIMB_LAYERS[limb];
  if (!def) return;

  const layerSlots = def.layers.filter(l => l.layer === layer && l.organ);
  layerSlots.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.organ; opt.textContent = s.label;
    if (_doorModalOrgan && s.organ === _doorModalOrgan) opt.selected = true;
    organSel.appendChild(opt);
  });

  // Max vessels
  const max = limb === 'torso' ? 6 : 3;
  el('door-vessels').max = max;
}

function saveDoorModal() {
  const character = _doorModalChar;
  if (!character) return;

  const limb    = el('door-limb').value;
  const layer   = el('door-layer').value;
  const organ   = el('door-organ').value || null;
  const vessels = parseInt(el('door-vessels').value) || 1;
  const active  = el('door-active').value;

  // Check vessel capacity
  const max = limbMaxVessels(limb);
  const currentUsed = vesselUsed(character, limb) - (
    _doorModalEditIdx !== null ? (character.doors[_doorModalEditIdx]?.vessels || 0) : 0
  );
  if (currentUsed + vessels > max) {
    alert(`Not enough vessel capacity on ${limb}. Max: ${max}, Used: ${currentUsed}`);
    return;
  }

  // Check layer slot (for arms/legs, one door per layer)
  const isMultiOrgan = limb === 'torso';
  if (!isMultiOrgan && _doorModalEditIdx === null) {
    const conflict = (character.doors || []).find(d =>
      d.limb === limb && d.layer === layer
    );
    if (conflict) {
      alert(`Layer ${layer} on ${limb} is already occupied by "${conflict.name}".`);
      return;
    }
  }

  const door = {
    id: _doorModalEditIdx !== null ? character.doors[_doorModalEditIdx].id : uid(),
    name:    el('door-name').value.trim() || 'Unnamed Door',
    limb, layer, organ,
    vessels,
    active,
    ritual:  el('door-ritual').value,
    effect:  el('door-effect').value,
    pledge:  el('door-pledge').value,
    boneMod: parseInt(el('door-bone-mod').value) || 0,
    meatMod: parseInt(el('door-meat-mod').value) || 0,
    skinMod: parseInt(el('door-skin-mod').value) || 0,
    vesselState: Array(vessels).fill(false),
  };

  if (_doorModalEditIdx !== null) {
    door.vesselState = character.doors[_doorModalEditIdx].vesselState || door.vesselState;
    character.doors[_doorModalEditIdx] = door;
  } else {
    if (!character.doors) character.doors = [];
    character.doors.push(door);
  }

  saveCharacter(character);
  el('doorModal').classList.remove('open');
  sendLog(`📖 Door inscribed: "${door.name}" [${door.limb}/${door.layer}]`);
  refreshCharSheet();
}

function deleteDoor(idx) {
  const character = _slotClickChar;
  if (!character) return;
  const name = character.doors[idx]?.name;
  character.doors.splice(idx, 1);
  saveCharacter(character);
  sendLog(`🗑 Door removed: "${name}"`);
  refreshCharSheet();
}

function toggleVessel(doorIdx, vesselIdx) {
  const character = _slotClickChar;
  if (!character) return;
  const door = character.doors[doorIdx];
  if (!door || door.active !== 'active') return;
  door.vesselState[vesselIdx] = !door.vesselState[vesselIdx];
  saveCharacter(character);
  renderDoorList(character, el('cs-door-list'), false);
}

function utilizeDoor(doorIdx) {
  const character = _slotClickChar;
  if (!character) return;
  const door = character.doors[doorIdx];
  if (!door || door.active !== 'active') return;
  // Find first empty vessel
  const freeIdx = door.vesselState.findIndex(v => !v);
  if (freeIdx === -1) {
    alert(`No ion remaining for "${door.name}". Restore vessels first.`);
    return;
  }
  door.vesselState[freeIdx] = true;
  saveCharacter(character);
  sendLog(`🔮 "${door.name}" utilized — ${door.vesselState.filter(Boolean).length}/${door.vessels} ion spent`);
  renderDoorList(character, el('cs-door-list'), false);
}

function showDoorPreview(door, editable) {
  const layerColor = LAYER_COLOR[door.layer] || '#888';
  el('preview-door-name').textContent = door.name || 'Door';
  el('preview-door-name').style.color = layerColor;
  el('preview-door-body').innerHTML = `
    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
      <span class="tag tag-${door.layer?.toLowerCase()}">${door.layer}</span>
      <span class="tag ${door.active==='active'?'tag-active':'tag-passive'}">${door.active}</span>
      <span class="tag" style="border-color:var(--border);color:var(--text-muted);">${door.limb}</span>
      ${door.organ ? `<span class="tag" style="border-color:var(--border);color:var(--text-muted);">${door.organ}</span>` : ''}
    </div>
    ${door.ritual ? `<div style="font-size:9px;color:var(--text-dim);margin-bottom:6px;">RITUAL: ${door.ritual}</div>` : ''}
    ${door.effect ? `<div class="prose" style="font-size:12px;color:var(--text);margin-bottom:6px;">${door.effect}</div>` : ''}
    ${door.pledge ? `<div style="padding-top:6px;border-top:1px solid var(--border);">
      <div style="font-size:9px;color:var(--text-dim);margin-bottom:2px;">PLEDGE</div>
      <div class="prose" style="font-size:12px;color:var(--blood-bright);">${door.pledge}</div>
    </div>` : ''}
    ${(door.boneMod||0)||(door.meatMod||0)||(door.skinMod||0) ? `
      <div style="font-size:10px;margin-top:6px;">
        BALANCE MODS:
        ${door.boneMod?`<span style="color:var(--bone);">B${door.boneMod>0?'+':''}${door.boneMod}</span>`:''}
        ${door.meatMod?`<span style="color:var(--meat);">M${door.meatMod>0?'+':''}${door.meatMod}</span>`:''}
        ${door.skinMod?`<span style="color:var(--skin);">S${door.skinMod>0?'+':''}${door.skinMod}</span>`:''}
      </div>` : ''}
  `;
  el('doorPreviewModal').classList.add('open');
}

// ─────────────────────────────────────────────
// PRIORITY MODAL (equal balance)
// ─────────────────────────────────────────────
function openPriorityModal() {
  const character = _slotClickChar;
  if (!character) return;
  const { bone, meat, skin } = computeBalance(character);
  const current = character.balancePriority || ['BONE','MEAT','SKIN'];

  el('priority-list').innerHTML = current.map((name, i) => `
    <div class="init-entry" draggable="true" data-name="${name}"
      style="margin-bottom:4px;border-left-color:var(--${name.toLowerCase()});">
      <div class="init-order">${i+1}</div>
      <div class="init-name" style="color:var(--${name.toLowerCase()});font-size:12px;">${name} = ${name==='BONE'?bone:name==='MEAT'?meat:skin}</div>
      <div style="font-size:9px;color:var(--text-dim);">drag to reorder</div>
    </div>
  `).join('');

  initDragSort(el('priority-list'));
  el('priorityModal').classList.add('open');
}

function savePriority() {
  const character = _slotClickChar;
  if (!character) return;
  const order = [...el('priority-list').children].map(el => el.dataset.name);
  character.balancePriority = order;
  saveCharacter(character);
  el('priorityModal').classList.remove('open');
  refreshCharSheet();
}

// ─────────────────────────────────────────────
// COMPETENCE MODAL
// ─────────────────────────────────────────────
function openCompModal() {
  el('compModal').classList.add('open');
}

function saveCompModal() {
  const character = _slotClickChar;
  if (!character) return;
  if (!character.comps) character.comps = [];
  character.comps.push({
    name:        el('comp-name').value.trim() || 'Unknown',
    layer:       el('comp-layer').value,
    narrowness:  el('comp-narrowness').value,
    proficiency: el('comp-proficiency').value,
  });
  el('comp-name').value = '';
  saveCharacter(character);
  el('compModal').classList.remove('open');
  refreshCharSheet();
}

function deleteComp(i) {
  const character = _slotClickChar;
  if (!character) return;
  character.comps.splice(i, 1);
  saveCharacter(character);
  refreshCharSheet();
}

// ─────────────────────────────────────────────
// REFRESH HOOK (called after any mutation)
// ─────────────────────────────────────────────
function refreshCharSheet() {
  emit('charsheet:refresh', {});
}

// ─────────────────────────────────────────────
// DRAG SORT
// ─────────────────────────────────────────────
function initDragSort(container) {
  let dragged = null;
  [...container.children].forEach(item => {
    item.addEventListener('dragstart', () => { dragged = item; item.classList.add('dragging'); });
    item.addEventListener('dragend', () => { dragged = null; item.classList.remove('dragging'); });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      if (dragged && dragged !== item) {
        const r = item.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        if (e.clientY < mid) container.insertBefore(dragged, item);
        else container.insertBefore(dragged, item.nextSibling);
      }
    });
  });
}
