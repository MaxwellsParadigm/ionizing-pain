/**
 * IONIZING PAIN — App Bootstrap
 * Wires together all modules, handles landing/login flow
 */

// ─────────────────────────────────────────────
// DICE STATE
// ─────────────────────────────────────────────
let checkDice = { BONE: null, MEAT: null, SKIN: null };
let adjUsedCount = 0;
let woundDegree = 'Determined';
const WOUND_TABLE = {
  'Improvised': [[1,6],[7,12],null,null,null],
  'Determined': [[1,4],[5,8],[9,12],null,null],
  'Proficient': [[1,3],[4,6],[7,9],[10,12],null],
  'ionizing':   [null,[1,3],[4,6],[7,9],[10,12]],
};

// ─────────────────────────────────────────────
// LANDING
// ─────────────────────────────────────────────
async function loadCampaigns() {
  const input = el('server-url-input');
  const raw = input.value.trim();

  // Apply server URL — MUST happen before any fetch (fixes HTTPS/mixed-content)
  if (raw) {
    setServerUrl(raw);
    localStorage.setItem('ip_server_url', raw);
    console.info(`[IP] Input: "${raw}"\n[IP] API → ${API_BASE}\n[IP] WS  → ${SERVER_URL}`);
  }

  // If still no API_BASE (hosted on GH Pages, no URL entered yet) show prompt
  if (!API_BASE) {
    el('campaign-list').innerHTML = `
      <div style="color:var(--blood-bright);font-size:10px;padding:6px 0;line-height:1.8;">
        Enter your server address above and click CONNECT.<br>
        <span style="color:var(--text-dim);">e.g. <code>192.168.1.42</code> &nbsp;or&nbsp; <code>abc123.ngrok.io</code></span>
      </div>`;
    return;
  }

  const listEl = el('campaign-list');
  const serverDisplay = API_BASE.replace('/api', '');
  listEl.innerHTML = `<div style="color:var(--text-dim);font-size:10px;padding:6px 0;">Connecting to ${serverDisplay}…</div>`;

  try {
    const campaigns = await apiGet('/campaigns');
    if (!campaigns.length) {
      listEl.innerHTML = '<div style="color:var(--text-dim);font-size:10px;padding:6px 0;">No campaigns yet. Create one below.</div>';
      return;
    }
    listEl.innerHTML = campaigns.map(c => `
      <div class="campaign-item" onclick="selectCampaign('${c.id}')">
        <div>
          <div class="campaign-name">${c.name}</div>
          <div class="campaign-meta">${new Date(c.createdAt).toLocaleDateString()} · ${c.playerCount} profiles</div>
        </div>
        <button class="btn btn-sm" onclick="event.stopPropagation();deleteCampaign('${c.id}')">DELETE</button>
      </div>
    `).join('');
  } catch(e) {
    listEl.innerHTML = `
      <div style="color:var(--blood-bright);font-size:10px;padding:6px 0;line-height:1.9;">
        ✗ Cannot reach <code style="color:var(--ion);">${serverDisplay}</code><br>
        <strong>If using GitHub Pages (HTTPS):</strong><br>
        Plain <code>http://</code> is blocked by browsers. Use ngrok:<br>
        <code style="color:var(--ion);">ngrok http 3000</code><br>
        then paste the <code>https://xxxx.ngrok.io</code> URL here.<br><br>
        <strong>If local:</strong> check server is running (<code>npm start</code>) and IP is correct.
      </div>`;
  }
}

async function createCampaign() {
  const name = el('new-campaign-name').value.trim();
  if (!name) return;
  const result = await apiPost('/campaigns', { name });
  if (result.id) {
    el('new-campaign-name').value = '';
    loadCampaigns();
  }
}

async function deleteCampaign(id) {
  if (!confirm('Delete this campaign? This cannot be undone.')) return;
  await apiDelete(`/campaigns/${id}`);
  loadCampaigns();
}

// ─────────────────────────────────────────────
// SELECT CAMPAIGN — ultra defensive + debug
async function selectCampaign(id) {
  console.log(`[IP] selectCampaign called for id: ${id}`);

  let campaign;
  try {
    campaign = await apiGet(`/campaigns/${id}`);
    console.log('[IP] Campaign loaded successfully:', campaign);
  } catch(e) {
    console.error('[IP] Failed to load campaign:', e);
    alert('Could not load campaign: ' + e.message);
    return;
  }

  if (!campaign || typeof campaign !== 'object' || !campaign.id) {
    alert('Server returned bad data. Check console.');
    console.error('Bad campaign data:', campaign);
    return;
  }

  campaign.profiles   = campaign.profiles   || [];
  campaign.characters = campaign.characters || {};
  campaign.log        = campaign.log        || [];

  el('picker-campaign-name').textContent = campaign.name || 'Unnamed Campaign';

  if (campaign.profiles.length === 0) {
    console.log("[IP] Fresh campaign → auto GM");
    el('profilePicker').classList.remove('open');
    el('landing').style.display = 'none';
    State.role = 'gm';
    launchApp(campaign, 'gm_' + Date.now(), 'gm');
    return;
  }

  console.log(`[IP] Existing campaign with ${campaign.profiles.length} profiles → rendering picker`);
  renderProfilePicker(campaign);

  // Force open with delay (helps with rendering/tunnel quirks)
  setTimeout(() => {
    const picker = el('profilePicker');
    picker.classList.add('open');
    console.log('[IP] profilePicker .open class added. Current display:', getComputedStyle(picker).display);
  }, 10);
}

// ─────────────────────────────────────────────
// RENDER PROFILE PICKER — always visible GM button
function renderProfilePicker(campaign) {
  const grid = el('profile-grid');
  if (!grid) {
    console.error('[IP] #profile-grid element not found!');
    return;
  }

  grid.innerHTML = '';

  const profiles = campaign.profiles || [];

  if (profiles.length === 0) {
    grid.innerHTML = `
      <div style="color:var(--text-dim);font-size:11px;text-align:center;width:100%;padding:40px 20px;line-height:1.6;">
        No player profiles yet.<br><br>
        <strong style="color:var(--blood-bright);">Join as Gamemaster first.</strong>
      </div>`;
  } else {
    profiles.forEach(profile => {
      const card = document.createElement('div');
      card.className = 'profile-card' + (profile.occupied ? ' occupied' : '');
      card.innerHTML = `
        <div class="profile-card-name">${profile.name}</div>
        <div class="profile-card-status">${profile.occupied ? '● IN USE' : '○ AVAILABLE'}</div>
      `;
      if (!profile.occupied) {
        card.onclick = () => joinAsPlayer(campaign.id, profile.id, campaign);
      }
      grid.appendChild(card);
    });
  }

  el('profilePicker')._campaign = campaign;
  console.log(`[IP] renderProfilePicker done. ${profiles.length} profiles rendered.`);
}

async function joinAsPlayer(campaignId, profileId, campaign) {
  el('profilePicker').classList.remove('open');
  el('landing').style.display = 'none';
  State.role = 'player';
  launchApp(campaign, profileId, 'player');
}

async function joinAsGM() {
  const campaign = el('profilePicker')._campaign;
  if (!campaign) {
    console.error('[IP] joinAsGM called but no campaign attached!');
    alert('No campaign data. Please try clicking the campaign again.');
    return;
  }
  console.log('[IP] Joining as GM...');
  el('profilePicker').classList.remove('open');
  el('landing').style.display = 'none';
  State.role = 'gm';
  launchApp(campaign, 'gm_' + Date.now(), 'gm');
}

// ─────────────────────────────────────────────
// APP LAUNCH
// ─────────────────────────────────────────────
function launchApp(campaign, profileId, role) {
  State.campaign = campaign;
  State.profileId = profileId;
  State.role = role;

  if (role !== 'gm') {
    State.myCharacter = campaign.characters?.[profileId] || null;
    _slotClickChar = State.myCharacter;
  }

  el('appShell').style.display = '';
  el('topbar-campaign-name').textContent = campaign.name;
  el('topbar-profile').textContent = role === 'gm'
    ? '⚙ GAMEMASTER'
    : (campaign.characters?.[profileId]?.name || campaign.profiles?.find(p=>p.id===profileId)?.name || profileId);

  // Show GM nav
  if (role === 'gm') {
    el('nav-profiles').style.display = '';
    el('nav-party').style.display = '';
  }

  // Connect WebSocket
  wsConnect(campaign.id, profileId, role);

  // Init map
  initMap(el('map-area'));
  const toolbar = buildMapToolbar();
  el('map-toolbar-wrap').appendChild(toolbar);

  // Setup log
  renderLog(campaign.log || []);

  // Render char sheet
  renderMySheet();

  // Profiles page (GM)
  if (role === 'gm') {
    renderProfilesPage();
    renderPartyPage();
  }

  // Render check dice
  renderCheckDice();

  // Init bar
  renderInitiativeBar(el('init-bar'));

  // WS event: re-render on updates
  on('joined', (msg) => {
    if (msg.role !== 'gm' && msg.profileId) {
      State.myCharacter = msg.campaign.characters?.[msg.profileId] || null;
      _slotClickChar = State.myCharacter;
    }
    renderMySheet();
    if (State.role === 'gm') { renderProfilesPage(); renderPartyPage(); }
    renderLog(msg.campaign.log || []);
    syncTokens();
  });

  on('character:update', (char) => {
    if (char.profileId === State.profileId) {
      State.myCharacter = char;
      _slotClickChar = char;
      renderMySheet();
    }
    if (State.role === 'gm') { renderPartyPage(); }
  });

  on('campaign:update', () => {
    if (State.role === 'gm') { renderProfilesPage(); renderPartyPage(); }
    renderProfilePicker(State.campaign); // refresh picker in case
  });

  on('log:entry', (entry) => {
    appendLogEntry(entry);
  });

  on('charsheet:refresh', () => {
    renderMySheet();
    if (State.role === 'gm') renderPartyPage();
  });

  on('ws:disconnected', () => {
    el('ws-status').style.background = '#c92b2b';
    el('ws-status').title = 'Disconnected — reconnecting...';
  });

  on('joined', () => {
    el('ws-status').style.background = '#4a9a4a';
    el('ws-status').title = 'Connected';
  });
}

// ─────────────────────────────────────────────
// CHARACTER SHEET PAGE
// ─────────────────────────────────────────────
function renderMySheet() {
  const container = el('sheet-container');
  if (!container) return;

  const char = State.myCharacter;
  if (!char) {
    container.innerHTML = '<div style="padding:20px;color:var(--text-dim);font-family:var(--font-prose);font-style:italic;">No character loaded.</div>';
    return;
  }

  _slotClickChar = char;
  renderCharSheet(char, container, false);
}

// ─────────────────────────────────────────────
// PROFILES PAGE (GM)
// ─────────────────────────────────────────────
function renderProfilesPage() {
  const el2 = el('profiles-list');
  if (!el2 || !State.campaign) return;
  const profiles = State.campaign.profiles || [];

  if (!profiles.length) {
    el2.innerHTML = '<div class="prose" style="color:var(--text-dim);font-size:11px;">No profiles yet. Add them above.</div>';
    return;
  }

  el2.innerHTML = profiles.map(p => `
    <div class="card card-blood" style="display:flex;align-items:center;gap:10px;">
      <div style="flex:1;">
        <div style="font-family:var(--font-display);font-size:16px;letter-spacing:2px;color:var(--blood-bright);">${p.name}</div>
        <div style="font-size:9px;color:${p.occupied?'#4a9a4a':'var(--text-dim)'};">${p.occupied ? '● Connected' : '○ Waiting'}</div>
      </div>
      <div style="font-size:9px;color:var(--text-dim);font-family:var(--font-mono);">${p.id.substring(0,8)}...</div>
      <button class="btn btn-sm" onclick="deleteProfile('${p.id}')">REMOVE</button>
    </div>
  `).join('');
}

async function createProfile() {
  const name = el('new-profile-name').value.trim();
  if (!name || !State.campaign) return;
  await apiPost(`/campaigns/${State.campaign.id}/profiles`, { name });
  el('new-profile-name').value = '';
  // Server will broadcast campaign update
}

async function deleteProfile(id) {
  if (!confirm('Remove this profile?')) return;
  await apiDelete(`/campaigns/${State.campaign.id}/profiles/${id}`);
}

// ─────────────────────────────────────────────
// PARTY PAGE (GM)
// ─────────────────────────────────────────────
function renderPartyPage() {
  const grid = el('party-grid');
  if (!grid || !State.campaign) return;
  const profiles = State.campaign.profiles || [];

  grid.innerHTML = '';
  profiles.forEach(p => {
    const char = State.campaign.characters?.[p.id];
    if (!char) return;

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-top:2px solid var(--blood);overflow:hidden;cursor:pointer;transition:border-color 0.15s;';
    card.onmouseenter = () => card.style.borderTopColor = 'var(--blood-bright)';
    card.onmouseleave = () => card.style.borderTopColor = 'var(--blood)';

    // Mini header
    const { bone, meat, skin } = computeBalance(char);
    const order = getBalanceOrder(char);
    card.innerHTML = `
      <div style="padding:8px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">
        <div style="width:16px;height:16px;border-radius:50%;background:${char.geneColor||'#8b1a1a'};border:2px solid rgba(255,255,255,0.2);flex-shrink:0;"></div>
        <div style="font-family:var(--font-display);font-size:16px;letter-spacing:2px;color:var(--blood-bright);flex:1;">${char.name||p.name}</div>
        <div style="font-size:9px;color:${p.occupied?'#4a9a4a':'var(--text-dim)'};">${p.occupied?'● LIVE':'○'}</div>
      </div>
      <div style="padding:8px 10px;">
        <div style="display:flex;gap:6px;margin-bottom:6px;">
          <span style="font-size:10px;color:var(--bone);">B:${bone}</span>
          <span style="font-size:10px;color:var(--meat);">M:${meat}</span>
          <span style="font-size:10px;color:var(--skin);">S:${skin}</span>
          <span style="font-size:9px;color:var(--text-dim);margin-left:4px;">${order.map(l=>l.name[0]).join('<')}</span>
        </div>
        <div style="font-size:10px;color:var(--text-dim);">${(char.doors||[]).length} doors · ${(char.comps||[]).length} comps</div>
        ${char.geneDesc ? `<div class="prose" style="font-size:10px;margin-top:4px;color:var(--text-muted);">${char.geneDesc.substring(0,80)}${char.geneDesc.length>80?'…':''}</div>` : ''}
      </div>
    `;

    card.onclick = () => openCharView(char, p);
    grid.appendChild(card);
  });

  if (!profiles.length) {
    grid.innerHTML = '<div class="prose" style="color:var(--text-dim);font-size:11px;padding:20px;">No profiles yet.</div>';
  }
}

// GM opens a full char sheet view for any pioneer
function openCharView(char, profile) {
  _slotClickChar = char;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:800;display:flex;flex-direction:column;';
  overlay.innerHTML = `
    <div style="background:var(--surface);border-bottom:2px solid var(--blood);padding:8px 14px;display:flex;align-items:center;gap:10px;">
      <div style="font-family:var(--font-display);font-size:18px;letter-spacing:3px;color:var(--blood-bright);flex:1;">${char.name||profile.name} — PIONEER SHEET</div>
      <button class="btn btn-sm" onclick="this.closest('div[style]').remove()">✕ CLOSE</button>
    </div>
    <div id="char-view-inner" style="flex:1;overflow:hidden;"></div>
  `;
  document.body.appendChild(overlay);
  renderCharSheet(char, overlay.querySelector('#char-view-inner'), State.role !== 'gm');
}

// ─────────────────────────────────────────────
// LOG
// ─────────────────────────────────────────────
function renderLog(entries) {
  const log = el('combat-log');
  if (!log) return;
  log.innerHTML = '';
  (entries || []).forEach(appendLogEntry);
}

function appendLogEntry(entry) {
  const log = el('combat-log');
  if (!log) return;
  const div = document.createElement('div');
  div.className = 'log-entry';
  const t = new Date(entry.ts);
  const time = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
  div.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-author" style="color:${entry.color||'#c92b2b'};">${entry.author||'?'}</span>
    <span class="log-text">${entry.text}</span>
  `;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function sendChat() {
  const input = el('chat-input');
  const text = input.value.trim();
  if (!text) return;
  sendLog(text);
  input.value = '';
}

// ─────────────────────────────────────────────
// DICE — BALANCE CHECK
// ─────────────────────────────────────────────
function renderCheckDice() {
  const row = el('check-dice-row');
  if (!row) return;

  const char = State.myCharacter;
  const order = char ? getBalanceOrder(char) : [
    { name: 'BONE', val: 0 },
    { name: 'MEAT', val: 0 },
    { name: 'SKIN', val: 0 },
  ];

  row.innerHTML = order.map(layer => {
    const cls = `die die-${layer.name.toLowerCase()}`;
    const val = checkDice[layer.name];
    return `
      <div style="text-align:center;position:relative;">
        <div class="${cls}" id="die-${layer.name}" onclick="rollSingleDie('${layer.name}')">
          <span>${val !== null ? val : '—'}</span>
          <span class="die-label">${layer.name}</span>
        </div>
      </div>
    `;
  }).join('');
}

function rollSingleDie(layerName) {
  const val = d6();
  checkDice[layerName] = val;
  const dieEl = el(`die-${layerName}`);
  if (dieEl) {
    dieEl.classList.add('rolling');
    setTimeout(() => { dieEl.classList.remove('rolling'); dieEl.querySelector('span').textContent = val; }, 400);
  }
  if (Object.values(checkDice).every(v => v !== null)) evaluateCheck();
}

function doBalanceCheck() {
  const char = State.myCharacter;
  if (!char) return;

  const order = getBalanceOrder(char);
  order.forEach(layer => { checkDice[layer.name] = d6(); });
  adjUsedCount = 0;
  el('adj-count').textContent = '';

  renderCheckDice();
  setTimeout(() => {
    qsa('.die').forEach(d => { d.classList.add('rolling'); setTimeout(() => d.classList.remove('rolling'), 400); });
    setTimeout(evaluateCheck, 400);
  }, 50);
}

function evaluateCheck() {
  const char = State.myCharacter;
  if (!char) return;
  const order = getBalanceOrder(char);
  if (order.some(l => checkDice[l.name] === null)) return;

  let success = true;
  for (let i = 0; i < 2; i++) {
    const lo = checkDice[order[i].name];
    const hi = checkDice[order[i+1].name];
    const strict = order[i].val !== order[i+1].val;
    if (strict ? lo >= hi : lo > hi) { success = false; break; }
  }

  const resultEl = el('check-result');
  resultEl.style.display = 'block';
  const orderStr = order.map(l => `${l.name}[${checkDice[l.name]}]`).join(' < ');

  if (success) {
    resultEl.innerHTML = `<div style="color:var(--success);font-family:var(--font-display);font-size:22px;letter-spacing:3px;">SUCCESS</div>
      <div style="font-size:9px;color:var(--text-muted);">${orderStr}</div>`;
    sendLog(`✓ Balance Check: SUCCESS — ${orderStr}`);
  } else {
    resultEl.innerHTML = `<div style="color:var(--blood-bright);font-family:var(--font-display);font-size:22px;letter-spacing:3px;">FAILURE</div>
      <div style="font-size:9px;color:var(--text-muted);">Required: ${order.map(l=>l.name+'('+l.val+')').join('<')} | Got: ${orderStr}</div>`;
    sendLog(`✗ Balance Check: FAILURE — ${orderStr}`);
  }
}

// ─────────────────────────────────────────────
// ADJUSTMENTS
// ─────────────────────────────────────────────
function resetAdj() {
  adjUsedCount = 0;
  el('adj-count').textContent = '';
}

function openAdjModal(type) {
  if (Object.values(checkDice).every(v => v === null)) {
    alert('Roll dice first!'); return;
  }
  const modal = el('adjModal');
  const body = el('adj-modal-body');
  const confirmBtn = el('adj-confirm-btn');
  const title = el('adj-modal-title');

  const char = State.myCharacter;
  const order = char ? getBalanceOrder(char) : [];
  const dieOptions = order.map(l =>
    `<option value="${l.name}">${l.name} (current: ${checkDice[l.name] ?? '?'})</option>`
  ).join('');

  if (type === 'associative') {
    title.textContent = 'ASSOCIATIVE ADVANTAGE';
    body.innerHTML = `
      <p class="prose" style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">±1 pip on a specific Layer's die.</p>
      <div class="row">
        <div class="field"><label class="field-label">Layer Die</label>
          <select id="adj-layer">${dieOptions}</select></div>
        <div class="field"><label class="field-label">Direction</label>
          <select id="adj-dir"><option value="1">+1 pip</option><option value="-1">-1 pip</option></select></div>
      </div>`;
    confirmBtn.onclick = () => {
      const die = el('adj-layer').value;
      const dir = parseInt(el('adj-dir').value);
      checkDice[die] = Math.max(1, Math.min(6, checkDice[die] + dir));
      adjUsedCount++;
      el('adj-count').textContent = `${adjUsedCount} used`;
      renderCheckDice(); evaluateCheck();
      modal.classList.remove('open');
    };
  } else if (type === 'situative') {
    title.textContent = 'SITUATIVE ADVANTAGE';
    body.innerHTML = `
      <p class="prose" style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">±1 pip on any die.</p>
      <div class="row">
        <div class="field"><label class="field-label">Die</label>
          <select id="adj-sit-die">${dieOptions}</select></div>
        <div class="field"><label class="field-label">Direction</label>
          <select id="adj-sit-dir"><option value="1">+1</option><option value="-1">-1</option></select></div>
      </div>`;
    confirmBtn.onclick = () => {
      const die = el('adj-sit-die').value;
      const dir = parseInt(el('adj-sit-dir').value);
      checkDice[die] = Math.max(1, Math.min(6, checkDice[die] + dir));
      adjUsedCount++; el('adj-count').textContent = `${adjUsedCount} used`;
      renderCheckDice(); evaluateCheck(); modal.classList.remove('open');
    };
  } else if (type === 'radical') {
    title.textContent = 'RADICAL ADVANTAGE';
    body.innerHTML = `
      <p class="prose" style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">Reroll a particular die.</p>
      <div class="field"><label class="field-label">Die to Reroll</label>
        <select id="adj-rad-die">${dieOptions}</select></div>`;
    confirmBtn.onclick = () => {
      const die = el('adj-rad-die').value;
      checkDice[die] = d6();
      adjUsedCount++; el('adj-count').textContent = `${adjUsedCount} used`;
      renderCheckDice(); evaluateCheck(); modal.classList.remove('open');
    };
  } else if (type === 'odd') {
    title.textContent = 'SOMETHING ODD';
    body.innerHTML = `
      <p class="prose" style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">Swap the values of two dice.</p>
      <div class="row">
        <div class="field"><label class="field-label">Die A</label>
          <select id="adj-swap-a">${dieOptions}</select></div>
        <div class="field"><label class="field-label">Die B</label>
          <select id="adj-swap-b">${dieOptions}</select></div>
      </div>`;
    confirmBtn.onclick = () => {
      const a = el('adj-swap-a').value;
      const b = el('adj-swap-b').value;
      [checkDice[a], checkDice[b]] = [checkDice[b], checkDice[a]];
      adjUsedCount++; el('adj-count').textContent = `${adjUsedCount} used`;
      renderCheckDice(); evaluateCheck(); modal.classList.remove('open');
    };
  }

  modal.classList.add('open');
}

// ─────────────────────────────────────────────
// WOUND DIE
// ─────────────────────────────────────────────
function setWoundDeg(btn) {
  qsa('#wound-degree-btns button').forEach(b => b.classList.remove('btn-blood'));
  btn.classList.add('btn-blood');
  woundDegree = btn.dataset.deg;
}

function doWoundRoll() {
  const val = d12();
  const table = WOUND_TABLE[woundDegree];
  let degree = 0;
  table.forEach((range, i) => {
    if (range && val >= range[0] && val <= range[1]) degree = i;
  });

  const colors = ['var(--text-muted)', 'var(--success)', 'var(--gold)', 'var(--skin)', 'var(--blood-bright)'];
  const resultEl = el('wound-result');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div style="font-family:var(--font-display);font-size:12px;letter-spacing:2px;color:var(--text-muted);">${woundDegree}</div>
    <div style="font-family:var(--font-display);font-size:28px;color:${colors[degree]};">WOUND ${degree}</div>
    <div style="font-size:9px;color:var(--text-dim);">D12 = ${val}</div>
  `;
  sendLog(`💥 Wound (${woundDegree}): D12=${val} → WOUND ${degree}`);
}

// ─────────────────────────────────────────────
// INITIATIVE ROLL (personal)
// ─────────────────────────────────────────────
function doInitRoll() {
  const char = State.myCharacter;
  const result = rollInitiative(char || {});
  const resultEl = el('init-result');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div style="font-family:var(--font-display);font-size:18px;color:var(--blood-bright);">
      ${result.adjustments} ADJUSTMENTS
    </div>
    <div style="font-size:9px;color:var(--text-dim);">Rolled: [${result.rolled.join(', ')}]</div>
  `;

  const name = char?.name || (State.role === 'gm' ? 'GM' : 'Pioneer');
  sendLog(`⚔ ${name} initiative: ${result.adjustments} adjustments`);

  // If GM, offer to add to tracker
  if (State.role === 'gm') {
    const existing = initiative.list.find(e => e.profileId === State.profileId);
    if (!existing) {
      initiative.list.push({
        id: uid(), profileId: State.profileId, name: 'GM',
        color: '#b8952a', score: result.adjustments, isNPC: true,
      });
      initiative.list.sort((a, b) => a.score - b.score);
      broadcastInitiative();
      renderInitiativeBar(el('init-bar'));
    }
  }
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Restore saved server URL into input field
  const saved = localStorage.getItem('ip_server_url');
  if (saved) {
    el('server-url-input').value = saved;
  }

  // Auto-connect only if we already have a valid URL
  // (either localhost default or restored from localStorage)
  if (API_BASE) {
    loadCampaigns();
  } else {
    // Show "enter server address" prompt immediately
    el('campaign-list').innerHTML = `
      <div style="color:var(--text-muted);font-size:10px;padding:6px 0;line-height:1.8;">
        Enter your server address below and click <strong style="color:var(--text);">CONNECT</strong>.<br>
        <span style="color:var(--text-dim);">Local: <code style="color:var(--ion);">192.168.1.42</code>
        &nbsp;·&nbsp; Via ngrok: <code style="color:var(--ion);">abc123.ngrok.io</code></span>
      </div>`;
  }

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
});
