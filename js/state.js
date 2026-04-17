/**
 * IONIZING PAIN — Client State & WebSocket Manager
 */

// ─────────────────────────────────────────────
// CONFIG — edit SERVER_URL to point at your server
// ─────────────────────────────────────────────
const SERVER_URL = window.IP_SERVER_URL || `ws://${window.location.hostname}:3000`;
const API_BASE   = window.IP_API_URL    || `http://${window.location.hostname}:3000/api`;

// ─────────────────────────────────────────────
// APP STATE
// ─────────────────────────────────────────────
const State = {
  campaign: null,
  profileId: null,
  role: 'player', // 'gm' | 'player'
  myCharacter: null,  // live reference
  ws: null,
  wsReady: false,
  listeners: {},      // event -> [fn]
};

// ─────────────────────────────────────────────
// EVENT BUS
// ─────────────────────────────────────────────
function on(event, fn) {
  if (!State.listeners[event]) State.listeners[event] = [];
  State.listeners[event].push(fn);
}

function emit(event, data) {
  (State.listeners[event] || []).forEach(fn => fn(data));
}

// ─────────────────────────────────────────────
// WEBSOCKET
// ─────────────────────────────────────────────
function wsConnect(campaignId, profileId, role) {
  if (State.ws) State.ws.close();
  const ws = new WebSocket(SERVER_URL);
  State.ws = ws;

  ws.onopen = () => {
    State.wsReady = true;
    wsSend({ type: 'JOIN', campaignId, profileId, role });
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    handleServerMsg(msg);
  };

  ws.onclose = () => {
    State.wsReady = false;
    emit('ws:disconnected', {});
    // Reconnect after 3s
    setTimeout(() => {
      if (State.campaign) wsConnect(campaignId, profileId, role);
    }, 3000);
  };

  ws.onerror = (err) => {
    console.error('WS error', err);
  };
}

function wsSend(msg) {
  if (State.ws && State.wsReady) {
    State.ws.send(JSON.stringify(msg));
  }
}

// ─────────────────────────────────────────────
// SERVER MESSAGE HANDLER
// ─────────────────────────────────────────────
function handleServerMsg(msg) {
  switch (msg.type) {

    case 'JOINED':
      State.campaign = msg.campaign;
      State.profileId = msg.profileId;
      State.role = msg.role;
      if (msg.profileId && msg.campaign.characters) {
        State.myCharacter = msg.campaign.characters[msg.profileId];
      }
      emit('joined', msg);
      break;

    case 'CAMPAIGN_UPDATE':
      State.campaign = msg.campaign;
      emit('campaign:update', msg.campaign);
      break;

    case 'CHARACTER_UPDATE':
      if (!State.campaign) break;
      State.campaign.characters[msg.character.profileId] = msg.character;
      if (msg.character.profileId === State.profileId) {
        State.myCharacter = msg.character;
      }
      emit('character:update', msg.character);
      break;

    case 'PROFILE_OCCUPIED':
      if (State.campaign) {
        const p = State.campaign.profiles.find(x => x.id === msg.profileId);
        if (p) p.occupied = true;
      }
      emit('profile:occupied', msg.profileId);
      break;

    case 'PROFILE_FREED':
      if (State.campaign) {
        const p = State.campaign.profiles.find(x => x.id === msg.profileId);
        if (p) p.occupied = false;
      }
      emit('profile:freed', msg.profileId);
      break;

    case 'MAP_UPDATE':
      if (State.campaign) State.campaign.activeMap = msg.map;
      emit('map:update', msg.map);
      break;

    case 'TOKEN_MOVE':
      emit('token:move', msg);
      break;

    case 'DRAW':
      emit('draw:stroke', msg.stroke);
      break;

    case 'ERASE':
      emit('draw:erase', msg.strokeIds);
      break;

    case 'LOG':
      emit('log:entry', msg.entry);
      break;

    case 'INITIATIVE_UPDATE':
      if (State.campaign) State.campaign.initiative = msg.initiative;
      emit('initiative:update', msg.initiative);
      break;

    case 'ERROR':
      console.error('Server error:', msg.error);
      emit('error', msg.error);
      break;
  }
}

// ─────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────
async function apiGet(path) {
  const r = await fetch(API_BASE + path);
  return r.json();
}

async function apiPost(path, body) {
  const r = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function apiDelete(path) {
  const r = await fetch(API_BASE + path, { method: 'DELETE' });
  return r.json();
}

// ─────────────────────────────────────────────
// CHARACTER HELPERS
// ─────────────────────────────────────────────

/** Recompute BONE/MEAT/SKIN from all doors */
function computeBalance(character) {
  let bone = 0, meat = 0, skin = 0;
  (character.doors || []).forEach(door => {
    bone += (door.boneMod || 0);
    meat += (door.meatMod || 0);
    skin += (door.skinMod || 0);
  });
  return { bone, meat, skin };
}

/** Get Balance order: array of [{name, val}] sorted ascending */
function getBalanceOrder(character) {
  const { bone, meat, skin } = computeBalance(character);
  const layers = [
    { name: 'BONE', val: bone },
    { name: 'MEAT', val: meat },
    { name: 'SKIN', val: skin },
  ];
  // Apply priority tiebreaking
  const priority = character.balancePriority || [];
  layers.sort((a, b) => {
    if (a.val !== b.val) return a.val - b.val;
    const ai = priority.indexOf(a.name);
    const bi = priority.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    return 0;
  });
  return layers;
}

/** Check if balance has equal values */
function hasEqualBalance(character) {
  const { bone, meat, skin } = computeBalance(character);
  return bone === meat || meat === skin || bone === skin;
}

/** Compute initiative: min adjustments to achieve success */
function computeInitiative(character) {
  const order = getBalanceOrder(character);
  // We need die[i].val < die[i+1].val for all i
  // Minimum adjustments = how far are we from any valid arrangement?
  // Simplified: roll once, find min swaps/pips needed
  // Return as 0–8 heuristic (used for display)
  const { bone, meat, skin } = computeBalance(character);
  const spread = Math.max(bone, meat, skin) - Math.min(bone, meat, skin);
  return spread; // placeholder; actual calc happens at roll time
}

/** Save character to server */
function saveCharacter(character) {
  if (!State.campaign) return;
  character = character || State.myCharacter;
  if (!character) return;
  const bal = computeBalance(character);
  character.bone = bal.bone;
  character.meat = bal.meat;
  character.skin = bal.skin;
  wsSend({ type: 'CHARACTER_UPDATE', character });
}

// ─────────────────────────────────────────────
// DOOR HELPERS
// ─────────────────────────────────────────────

/** Get total vessels available per limb */
function limbMaxVessels(limb) {
  return limb === 'torso' ? 6 : 3;
}

/** Get doors occupying a layer slot */
function doorsAtSlot(character, limb, layer, organ) {
  return (character.doors || []).filter(d =>
    d.limb === limb && d.layer === layer && (organ ? d.organ === organ : true)
  );
}

/** Check if layer slot is free */
function slotFree(character, limb, layer, organ) {
  const occupied = doorsAtSlot(character, limb, layer, organ);
  return occupied.length === 0;
}

/** Vessels used on a limb */
function vesselUsed(character, limb) {
  return (character.doors || [])
    .filter(d => d.limb === limb)
    .reduce((s, d) => s + (d.vessels || 0), 0);
}

// ─────────────────────────────────────────────
// DICE
// ─────────────────────────────────────────────
function d6()  { return Math.floor(Math.random() * 6)  + 1; }
function d12() { return Math.floor(Math.random() * 12) + 1; }

function rollBalanceCheck(character) {
  const order = getBalanceOrder(character); // [{name,val}] low->high
  const dice = { BONE: d6(), MEAT: d6(), SKIN: d6() };
  // Success: die assigned to layer i must be < die assigned to layer i+1
  // (non-strict if equal layer values)
  let success = true;
  for (let i = 0; i < 2; i++) {
    const lo = dice[order[i].name];
    const hi = dice[order[i+1].name];
    const strict = order[i].val !== order[i+1].val;
    if (strict && lo >= hi) { success = false; break; }
    if (!strict && lo > hi) { success = false; break; }
  }
  return { dice, order, success };
}

function rollInitiative(character) {
  // Roll dice, count minimum adjustments to reach success
  const order = getBalanceOrder(character);
  const dice = [d6(), d6(), d6()].sort((a,b) => a-b); // optimal sorted
  const current = [d6(), d6(), d6()];

  let adjustments = 0;
  // Simple heuristic: count inversions
  for (let i = 0; i < 2; i++) {
    if (current[order[i] ? 0 : 0] >= current[i+1]) adjustments++;
  }
  // More accurate: find min swaps to sort
  const sorted = [...current].sort((a,b)=>a-b);
  let swaps = 0;
  const tmp = [...current];
  for (let i = 0; i < 3; i++) {
    if (tmp[i] !== sorted[i]) {
      const j = tmp.indexOf(sorted[i], i);
      [tmp[i], tmp[j]] = [tmp[j], tmp[i]];
      swaps++;
    }
  }
  adjustments = swaps;

  return { rolled: current, adjustments };
}

// ─────────────────────────────────────────────
// LOG
// ─────────────────────────────────────────────
function sendLog(text, author, color) {
  author = author || (State.myCharacter?.name || (State.role === 'gm' ? 'GM' : 'Unknown'));
  color  = color  || (State.myCharacter?.geneColor || '#c92b2b');
  wsSend({ type: 'LOG', text, author, color });
}

// ─────────────────────────────────────────────
// UUID
// ─────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─────────────────────────────────────────────
// DOM HELPERS
// ─────────────────────────────────────────────
function el(id) { return document.getElementById(id); }
function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }

function showPage(name) {
  qsa('.page').forEach(p => p.classList.toggle('active', p.dataset.page === name));
  qsa('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
}
