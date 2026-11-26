/* ============================================================
   The Forest Gate — game engine, scene art, sound.
   ============================================================ */
(function () {
  'use strict';

  const SAVE_KEY = 'forestGateSave_v1';
  const $ = id => document.getElementById(id);
  const el = {
    scene: $('scene'), gate: $('gatePanel'), bag: $('bagBtn'), bagPop: $('bagPop'), mute: $('muteBtn'),
    dialogue: $('dialogue'), locName: $('locName'), text: $('text'), choices: $('choices'),
    veil: $('veil'), veilText: $('veilText'), title: $('title'), endCard: $('endCard'),
    eyeCard: $('eyeCard'), figure: $('figure'), endingsPage: $('endingsPage'), endGrid: $('endGrid'), endCount: $('endCount'), endNote: $('endNote'), btnEndings: $('btnEndings'), btnEndBack: $('btnEndBack'), btnSound: $('btnSound'), btnLang: $('btnLang'), loreBtn: $('loreBtn'), lorePop: $('lorePop'), toast: $('toast'), btnContinue: $('btnContinue'), btnNew: $('btnNew'), btnAgain: $('btnAgain')
  };
  const LEVERS = ['oak', 'river', 'shrine'];
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const HAUNT = new Set(['clearing', 'gate', 'oak', 'river', 'river_far', 'hut', 'hut_in', 'shrine', 'stone']);
  // ----- language helpers (English text is the key; falls back to English) -----
  let lang = 'en';
  try { const l = localStorage.getItem('forestGateLang'); if (l === 'fr' || l === 'zh') lang = l; } catch (e) {}
  function tr(s) {
    if (lang === 'en' || !s || typeof I18N === 'undefined') return s;
    const d = I18N[lang];
    return (d && d[s]) || s;
  }
  function trf(s, vars) {
    let out = tr(s);
    Object.keys(vars).forEach(k => { out = out.replace('{' + k + '}', vars[k]); });
    return out;
  }

  let state = null;
  let busy = true;             // blocks input during sequences / title
  let typer = null;             // active typewriter (has .skip())
  let currentChoices = [];
  let skipFn = null;            // for skippable waits

  function newState() {
    return {
      location: 'clearing', node: 'intro', noteRead: false,
      levers: { oak: false, river: false, shrine: false },
      shrineUnlocked: false, oakOpen: false, planked: false, plankTaken: false,
      journalRead: false, runesRead: false, prophecyRead: false, pageRead: false, lore: [], ghostMet: false, ghostAsked: [], ghostWish: false, ghostOffered: false, scares: 0, trailFound: false, steps: 0, riddleWrong: [], hasBag: false, inventory: [], visited: {}
    };
  }

  /* ---------------- Save / load ---------------- */
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = Object.assign(newState(), JSON.parse(raw));
      s.levers = Object.assign({ oak: false, river: false, shrine: false }, s.levers);
      return STORY.nodes[s.node] ? s : null;
    } catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  /* ---------------- Public API used by story.js ---------------- */
  window.Game = {
    state: () => state,
    readNote() { state.noteRead = true; syncGate(); },
    learn(id) {                                     // unlock a lore log entry
      if (state.lore.includes(id)) return;
      const entry = STORY.lore.find(x => x.id === id);
      if (!entry) return;
      state.lore.push(id);
      syncLore();
      showToast(trf('New lore entry: {a}', { a: tr(entry.title) }));
      Snd.chime();
      save();
    },
    ask(id) { if (!state.ghostAsked.includes(id)) state.ghostAsked.push(id); },
    pull(k) {
      state.levers[k] = true;
      Snd.clunk();
      syncGate(k);
      if (state.noteRead) setTimeout(() => Snd.chime(), 0);
      if (Object.values(state.levers).every(Boolean)) Snd.urgentCue();
    },
    addItem(id) {
      if (!state.inventory.includes(id)) state.inventory.push(id);
      if (id === 'plank') state.plankTaken = true;
      state.hasBag = true; syncBag();
    },
    removeItem(id) { state.inventory = state.inventory.filter(i => i !== id); syncBag(); }
  };

  /* ---------------- HUD ---------------- */
  function syncGate(pulse) {
    el.gate.classList.toggle('hidden', !state.noteRead);
    LEVERS.forEach(k => {
      const g = $('gem-' + k);
      g.classList.toggle('lit', !!state.levers[k]);
      if (pulse === k && state.noteRead) {
        g.classList.remove('pulse'); void g.getBoundingClientRect(); g.classList.add('pulse');
      }
    });
  }
  function syncBag() {
    el.bag.classList.toggle('hidden', !state.hasBag);
    if (!state.hasBag) el.bagPop.classList.add('hidden');
    el.bagPop.innerHTML = state.inventory.length
      ? state.inventory.map(id => `<div class="item"><b>${tr(STORY.items[id].name)}</b><div class="desc">${tr(STORY.items[id].desc)}</div></div>`).join('')
      : tr('Nothing yet.');
  }
  function syncLore() {
    const have = state.lore.length, total = STORY.lore.length;
    el.loreBtn.classList.toggle('hidden', have === 0);
    if (have === 0) el.lorePop.classList.add('hidden');
    let html = '<div class="loreHead">' + trf('Lore: {a} of {b}', { a: have, b: total }) + '</div>';
    STORY.lore.forEach(e => {
      html += state.lore.includes(e.id)
        ? '<div class="item"><b>' + tr(e.title) + '</b><div class="desc">' + tr(e.text) + '</div></div>'
        : '<div class="item locked"><b>???</b></div>';
    });
    el.lorePop.innerHTML = html;
  }
  let toastTimer = null;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 4000);
  }
  el.bag.addEventListener('click', e => { e.stopPropagation(); el.lorePop.classList.add('hidden'); el.bagPop.classList.toggle('hidden'); });
  el.loreBtn.addEventListener('click', e => { e.stopPropagation(); el.bagPop.classList.add('hidden'); el.lorePop.classList.toggle('hidden'); });
  document.addEventListener('click', e => {
    if (!el.bagPop.contains(e.target)) el.bagPop.classList.add('hidden');
    if (!el.lorePop.contains(e.target)) el.lorePop.classList.add('hidden');
  });

  /* ---------------- Typewriter + choices ---------------- */
  function typeSegments(segs, done) {
    el.text.innerHTML = '';
    el.choices.innerHTML = '';
    el.choices.classList.remove('show');
    currentChoices = [];
    el.dialogue.scrollTop = 0;

    const items = segs.map(sg => {
      const e = document.createElement(sg.k === 'note' ? 'div' : 'p');
      e.className = sg.k === 'note' ? 'note' : sg.k;
      e.style.display = 'none';
      el.text.appendChild(e);
      const s = tr(sg.s);
      return { e, full: (sg.k === 't' || sg.k === 'w' || sg.k === 'gh') ? '“' + s + '”' : s };
    });
    const total = items.reduce((a, i) => a + i.full.length, 0);
    const start = performance.now();

    function paint(count) {
      let rem = count;
      items.forEach(it => {
        const k = Math.max(0, Math.min(it.full.length, rem));
        rem -= k;
        if (k > 0) { it.e.style.display = ''; it.e.textContent = it.full.slice(0, k); }
      });
    }
    const iv = setInterval(() => {
      const c = Math.floor((performance.now() - start) * (lang === 'zh' ? 0.013 : 0.03)); // ~30 chars/sec (Chinese carries more per character)
      paint(c);
      if (c >= total) finish();
    }, 30);
    function finish() {
      clearInterval(iv);
      paint(total);
      typer = null;
      done();
    }
    typer = { skip: finish };
  }

  function renderChoices(node) {
    const list = node.choices(state).filter(c => !c.if || c.if(state));
    currentChoices = list;
    el.choices.innerHTML = '';
    list.forEach((c, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<span class="num">${i + 1}</span>`;
      b.appendChild(document.createTextNode(tr(c.label)));
      b.addEventListener('click', () => { if (!busy && !typer) choose(c); });
      el.choices.appendChild(b);
    });
    requestAnimationFrame(() => el.choices.classList.add('show'));
  }

  function choose(c) {
    if (c.do) c.do(state);
    const dest = typeof c.go === 'function' ? c.go(state) : c.go;
    if (dest.startsWith('@end')) { ending(dest.split(':')[1] || 'leave'); return; }
    show(dest);
  }

  function show(id, opts) {
    opts = opts || {};
    const node = STORY.nodes[id];
    state.node = id;
    state.location = node.loc;
    if (!opts.resume && node.enter) node.enter(state);
    const first = !!node.visit && !state.visited[node.visit];
    const segs = node.text(state, first);
    // The feeling of being watched: every third scene, an uneasy thought.
    const lv = Object.values(state.levers).filter(Boolean).length;
    el.scene.dataset.t = String(Math.min(3, lv));          // forest darkens as levers are pulled
    if (!opts.resume && HAUNT.has(id)) {
      state.steps = (state.steps || 0) + 1;
      const due = (lv >= 2 && state.scares === 0) || (lv === 3 && state.scares === 1);
      if (due) {                                           // rare scripted scare
        segs.push({ k: 'n', s: STORY.scares[state.scares] });
        const which = state.scares;
        state.scares++;
        setTimeout(() => { if (state.node === id && !busy) scare(which); }, 2200);
      } else if (state.steps % 3 === 0) {
        const pool = STORY.watching[lv];
        const line = pool[Math.floor(state.steps / 3) % pool.length];
        segs.push({ k: 't', s: line });
        if (line.includes('footsteps')) setTimeout(() => Snd.steps(), 600);
      }
    }
    // the heartbeat quickens with every lever; the stone clearing is the worst
    Snd.setUrgent(lv === 3);
    Snd.setTension(Object.values(state.levers).filter(Boolean).length + (node.loc === 'stone' ? 1 : 0));
    if (node.visit) state.visited[node.visit] = true;

    const loc = STORY.locations[node.loc];
    el.locName.textContent = tr(node.locName || loc.name);
    $('game').style.setProperty('--accent', loc.accent);
    renderScene(node.loc);
    if (node.whisper && !opts.resume) setTimeout(() => Snd.whisper(), 500);
    typeSegments(segs, () => renderChoices(node));
    save();
  }

  /* ---------------- Input ---------------- */
  el.dialogue.addEventListener('click', () => { if (typer && !busy) typer.skip(); });
  document.addEventListener('pointerdown', () => { if (skipFn) skipFn(); });
  document.addEventListener('keydown', e => {
    if (skipFn) { skipFn(); e.preventDefault(); return; }
    if (busy || !state) return;
    const act = e.key === ' ' || e.key === 'Enter';
    if (act && typer) { typer.skip(); e.preventDefault(); return; }
    if (typer) return;
    if (e.key >= '1' && e.key <= '4') {
      const c = currentChoices[Number(e.key) - 1];
      if (c) choose(c);
    } else if (act && currentChoices.length === 1) {
      e.preventDefault();
      choose(currentChoices[0]);
    }
  });
  document.addEventListener('keyup', e => { if (e.key === ' ') e.preventDefault(); });

  /* ---------------- Veil / sequences ---------------- */
  function wait(ms) {            // skippable by click / key
    return new Promise(res => {
      const tm = setTimeout(done, ms);
      function done() { clearTimeout(tm); skipFn = null; res(); }
      skipFn = done;
    });
  }
  function setVeil(opacity, color) {
    el.veil.style.transition = 'none';
    el.veil.style.backgroundColor = color;
    el.veil.style.opacity = opacity;
    void el.veil.offsetWidth;
  }
  function veilTo(opacity, ms, color) {
    el.veil.style.transition = `opacity ${ms}ms linear, background-color ${ms}ms linear`;
    if (color) el.veil.style.backgroundColor = color;
    el.veil.style.opacity = opacity;
    return sleep(ms);
  }
  function veilText(txt, opacity, ms, color) {
    el.veilText.style.transition = `opacity ${ms}ms ease`;
    if (txt != null) el.veilText.textContent = txt;
    if (color) el.veilText.style.color = color;
    void el.veilText.offsetWidth;
    el.veilText.style.opacity = opacity;
    return sleep(ms);
  }
  function resetVeilText() {
    el.veilText.style.transition = 'none';
    el.veilText.style.opacity = 0;
    el.veilText.style.color = '#fff';
    void el.veilText.offsetWidth;
  }

  async function startNew() {
    busy = true;
    el.title.classList.add('hidden');
    el.endCard.classList.add('hidden');
    clearSave();
    state = newState();
    curKey = null;
    layers.forEach(l => l.classList.remove('on'));
    el.dialogue.classList.add('hidden');
    syncGate(); syncBag(); syncLore();
    resetVeilText();
    setVeil(1, '#000');

    await sleep(1000);                                    // black, nothing
    await veilText(tr(STORY.opening), 1, 1500, '#fff');       // fade in
    await wait(2500);                                     // hold (skippable)
    await veilText(null, 0, 1200);                        // fade out
    renderScene('clearing');
    await sleep(400);
    await veilTo(0, 2000, '#000');                        // forest fades in
    el.dialogue.classList.remove('hidden');
    busy = false;
    Snd.setMode('game');
    show('intro');
  }

  async function continueGame() {
    state = load();
    if (!state) { startNew(); return; }
    busy = false;
    el.title.classList.add('hidden');
    el.endCard.classList.add('hidden');
    curKey = null;
    resetVeilText();
    syncGate(); syncBag(); syncLore();
    el.dialogue.classList.remove('hidden');
    Snd.setMode('game');
    show(state.node, { resume: true });
    veilTo(0, 1500, '#000');
  }

  async function ending(kind) {
    busy = true;
    Snd.setMode('off');
    Snd.setUrgent(false);
    const E = STORY.endings[kind];
    const beats = E.beats.slice();
    if (E.extra) beats.splice(1, 0, ...E.extra(state));   // bonus beats for players who found every clue
    for (const beat of beats) {
      await veilTo(1, 1800, beat.from);
      await veilText(tr(beat.text), 1, 1400, beat.color);
      await wait(3200);
      await veilText(null, 0, 1000);
    }
    if (E.eye) {                                          // the watcher reveals itself
      await veilTo(1, 800, '#000');
      Snd.setTension(4);
      Snd.setMode('eye');
      $('eyeMsg').textContent = tr(E.eye);
      el.eyeCard.classList.remove('hidden');
      await sleep(6500);
      await wait(5000);
      el.eyeCard.classList.add('hidden');
      Snd.setMode('off');
      Snd.setTension(0);
    }
    const got = addEnding(kind);
    $('endTitle').textContent = tr(E.title);
    el.endNote.textContent = trf('Endings found: {a} of {b}', { a: got.length, b: Object.keys(STORY.endings).length });
    el.endCard.classList.remove('hidden');
  }

  /* ---------------- Scripted scare ---------------- */
  function scare(n) {
    Game.learn('watchers');
    const fig = el.figure;
    fig.style.left = n === 0 ? '6%' : '';
    fig.style.right = n === 0 ? '' : '24%';
    fig.style.height = n === 0 ? '62%' : '82%';
    el.scene.classList.remove('flicker'); void el.scene.offsetWidth;
    el.scene.classList.add('flicker');
    Snd.stinger(n);
    setTimeout(() => { fig.style.opacity = 1; }, 250);
    setTimeout(() => { fig.style.opacity = 0; }, n === 0 ? 1500 : 2100);
    setTimeout(() => el.scene.classList.remove('flicker'), 1000);
    save();
  }

  /* ---------------- Eyes that watch back ---------------- */
  let eyeTick = 0;
  el.scene.addEventListener('pointermove', e => {
    const now = performance.now();
    if (now - eyeTick < 50 || topLayer < 0) return;
    eyeTick = now;
    layers[topLayer].querySelectorAll('.eyeWrap').forEach(w => {
      const r = w.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), dist = Math.hypot(dx, dy) || 1;
      w.querySelectorAll('.pup').forEach(p => { p.style.transform = `translate(${(dx / dist) * 1.7}px,${(dy / dist) * 1}px)`; });
      if (dist < 60 && !w._gone) {                         // look straight at it and it vanishes…
        w._gone = true;
        w.style.opacity = 0;
        setTimeout(() => {                                 // …then watches again from somewhere else
          const nx = (Math.random() < .5 ? 30 + Math.random() * 200 : 570 + Math.random() * 200), ny = 150 + Math.random() * 150;
          w.setAttribute('transform', `translate(${Math.round(nx - w.dataset.x)} ${Math.round(ny - w.dataset.y)})`);
          w.style.opacity = 1;
          w._gone = false;
        }, 2500 + Math.random() * 2000);
      }
    });
  });

  /* ---------------- Endings gallery ---------------- */
  const END_KEY = 'forestGateEndings';
  function getEndings() { try { return JSON.parse(localStorage.getItem(END_KEY)) || []; } catch (e) { return []; } }
  function addEnding(k) {
    const a = getEndings();
    if (!a.includes(k)) { a.push(k); try { localStorage.setItem(END_KEY, JSON.stringify(a)); } catch (e) {} }
    return a;
  }
  function renderEndings() {
    const got = getEndings(), kinds = Object.keys(STORY.endings);
    el.endGrid.innerHTML = '';
    kinds.forEach(k => {
      const E = STORY.endings[k], ok = got.includes(k);
      const box = document.createElement('div'); box.className = 'endBox ' + (ok ? 'got' : 'locked');
      const h = document.createElement('h3'); h.textContent = ok ? tr(E.title) : '???';
      box.appendChild(h);
      if (ok) { const p = document.createElement('p'); p.textContent = tr(E.blurb); box.appendChild(p); }
      el.endGrid.appendChild(box);
    });
    el.endCount.textContent = trf('{a} of {b} endings found', { a: got.filter(k => kinds.includes(k)).length, b: kinds.length });
  }
  el.btnEndings.addEventListener('click', () => { renderEndings(); el.endingsPage.classList.remove('hidden'); });
  el.btnEndBack.addEventListener('click', () => el.endingsPage.classList.add('hidden'));

  /* ---------------- Sound preference ---------------- */
  const SOUND_PREF = 'forestGateSound';
  function getPref() { try { return localStorage.getItem(SOUND_PREF) === '1'; } catch (e) { return false; } }
  function setPref(v) { try { localStorage.setItem(SOUND_PREF, v ? '1' : '0'); } catch (e) {} }
  function updateSoundUI() {
    const on = Snd.on || getPref();
    el.mute.textContent = Snd.on ? '🔊' : '🔇';
    el.btnSound.textContent = tr('Sound: ' + (on ? 'on' : 'off'));
  }
  function toggleSound() {
    if (!Snd.on && getPref()) setPref(false);            // saved "on" that hasn't started yet: turn it off
    else { Snd.toggle(); setPref(Snd.on); }
    updateSoundUI();
  }
  function applyPref() {                                  // called from a click, so audio is allowed
    if (getPref() && !Snd.on) Snd.toggle();
    updateSoundUI();
  }

  function updateTitle() {
    const has = !!load();
    el.btnContinue.classList.toggle('hidden', !has);
    el.btnNew.textContent = tr(has ? 'New game' : 'Click to start');
  }
  function showTitle() {
    updateTitle();
    el.title.classList.remove('hidden');
    updateSoundUI();
  }

  /* ---------------- Language (English default, French, Mandarin) ---------------- */
  const LANG_KEY = 'forestGateLang';
  const LANG_NAMES = { en: 'English', fr: 'Français', zh: '中文' };
  const LANG_CODES = { en: 'en', fr: 'fr', zh: 'zh-CN' };
  function applyLang() {
    document.documentElement.lang = LANG_CODES[lang];
    document.title = tr('The Forest Gate');
    document.body.classList.toggle('lang-zh', lang === 'zh');
    document.querySelectorAll('[data-i18n]').forEach(e => {
      if (!e.dataset.en) e.dataset.en = e.textContent.trim();
      e.textContent = tr(e.dataset.en);
    });
    el.btnLang.textContent = '🌐 ' + LANG_NAMES[lang];
    updateTitle();
    updateSoundUI();
  }
  el.btnLang.addEventListener('click', () => {
    const order = ['en', 'fr', 'zh'];
    lang = order[(order.indexOf(lang) + 1) % order.length];
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyLang();
  });

  el.btnNew.addEventListener('click', () => { applyPref(); startNew(); });
  el.btnContinue.addEventListener('click', () => { applyPref(); continueGame(); });
  el.btnSound.addEventListener('click', toggleSound);
  el.btnAgain.addEventListener('click', () => { applyPref(); startNew(); });
  $('btnHome').addEventListener('click', () => {
    el.endCard.classList.add('hidden');
    el.dialogue.classList.add('hidden');
    Snd.setMode('off');
    showTitle();
  });

  /* ---------------- Sound (Web Audio, off by default) ---------------- */
  const Snd = {
    ctx: null, master: null, windGain: null, on: false,
    mode: 'off',            // 'off' (title / end card) | 'game' | 'eye'
    tension: 0, loops: false, urgent: false, padGain: null, pad: [], lfo: null, send: null,
    init() {
      if (this.ctx) return;
      try {
        const C = window.AudioContext || window.webkitAudioContext;
        const ctx = this.ctx = new C();
        this.master = ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(ctx.destination);
        // very soft, muffled wind: brown noise through a low-pass, kept quiet
        const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
        this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
        src.connect(lp); lp.connect(this.windGain); this.windGain.connect(this.master);
        src.start();
        // echo bus: whispers, wails and bells bounce around like a cave
        this.send = ctx.createGain(); this.send.gain.value = 0.6;
        const dl = ctx.createDelay(1.0); dl.delayTime.value = 0.38;
        const fb = ctx.createGain(); fb.gain.value = 0.45;
        const elp = ctx.createBiquadFilter(); elp.type = 'lowpass'; elp.frequency.value = 1800;
        this.send.connect(dl); dl.connect(elp); elp.connect(fb); fb.connect(dl); elp.connect(this.master);
        // haunted pad (clashing minor seconds, wavering), only heard once all three levers are pulled
        this.padGain = ctx.createGain(); this.padGain.gain.value = 0;
        const plp = ctx.createBiquadFilter(); plp.type = 'lowpass'; plp.frequency.value = 800;
        const trem = ctx.createGain(); trem.gain.value = 0.7;                       // tremolo stage, separate from the on/off gain
        plp.connect(trem); trem.connect(this.padGain); this.padGain.connect(this.master);
        this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 1.2;
        const lfoDepth = ctx.createGain(); lfoDepth.gain.value = 0.3;
        this.lfo.connect(lfoDepth); lfoDepth.connect(trem.gain); this.lfo.start();
        const vib = ctx.createOscillator(); vib.frequency.value = 5.2;              // vibrato
        const vibDepth = ctx.createGain(); vibDepth.gain.value = 22; vib.connect(vibDepth); vib.start();
        [[110, 'sine'], [116.5, 'sine'], [165, 'triangle'], [174.6, 'triangle']].forEach(([fq, ty]) => {
          const o = ctx.createOscillator(); o.type = ty; o.frequency.value = fq;
          vibDepth.connect(o.detune); o.connect(plp); o.start();
          this.pad.push({ o, fq });
        });
        // white noise for whispers
        const wl = ctx.sampleRate * 3;
        this.noiseBuf = ctx.createBuffer(1, wl, ctx.sampleRate);
        const wd = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < wl; i++) wd[i] = Math.random() * 2 - 1;
      } catch (e) { this.ctx = null; }
    },
    // Sound only plays while a game is running (never on the title screen or end card).
    setMode(m) { this.mode = m; this.apply(); },
    apply() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(this.on && this.mode !== 'off' ? 0.8 : 0, t, 0.3);
      this.windGain.gain.setTargetAtTime(this.on && this.mode === 'game' ? 0.06 : 0, t, 0.8);
      this.padGain.gain.setTargetAtTime(this.on && this.mode === 'game' && this.urgent ? 0.08 : 0, t, 1.5);
    },
    setTension(n) { this.tension = n; },
    // All three levers pulled: the forest turns hostile and the player feels hunted and hurried.
    setUrgent(u) {
      if (!this.ctx || u === this.urgent) { this.urgent = u; return; }
      this.urgent = u;
      const t = this.ctx.currentTime;
      this.lfo.frequency.cancelScheduledValues(t);
      this.pad.forEach(p => p.o.frequency.cancelScheduledValues(t));
      if (u) {                                   // the wavering quickens and the pitch creeps up
        this.lfo.frequency.setValueAtTime(1.2, t); this.lfo.frequency.linearRampToValueAtTime(7, t + 90);
        this.pad.forEach(p => { p.o.frequency.setValueAtTime(p.fq, t); p.o.frequency.linearRampToValueAtTime(p.fq * 1.22, t + 90); });
      } else {
        this.lfo.frequency.setValueAtTime(1.2, t);
        this.pad.forEach(p => p.o.frequency.setValueAtTime(p.fq, t));
      }
      this.apply();
    },
    urgentCue() {                                // a rushing swell of whispers, then a distant bell tolls
      this.noise(1.8, 250, 2600, 0.5, 0.9, true, 1.5);
      this.bell(2.7);
    },
    bell(delay) { [[196, 0.5], [294, 0.25], [523, 0.12], [740, 0.08]].forEach(([f, v]) => this.osc('sine', f, f, 5, v, delay, true)); },
    creak() { this.osc('sawtooth', 90, 150, 0.9, 0.14, 0, true, 420); },
    wail() {                                     // a far-off ghostly voice
      const f = 480 + Math.random() * 220;
      this.osc('sine', f, f * 1.45, 2.6, 0.09, 0, true);
      this.osc('sine', f * 1.01, f * 1.47, 2.6, 0.06, 0, true);
    },
    // generic sweeping oscillator (optional echo and band-pass colouring)
    osc(type, f0, f1, dur, vol, delay, echo, bpf) {
      if (!this.on || !this.ctx || this.mode === 'off') return;
      const ctx = this.ctx, t0 = ctx.currentTime + (delay || 0);
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t0);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.08, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      let n = o;
      if (bpf) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = bpf; b.Q.value = 6; o.connect(b); n = b; }
      n.connect(g); g.connect(this.master);
      if (echo) g.connect(this.send);
      o.start(t0); o.stop(t0 + dur + 0.05);
    },
    // filtered noise swell (breath, rush, thump)
    noise(dur, f0, f1, vol, delay, echo, q) {
      if (!this.on || !this.ctx || !this.noiseBuf || this.mode === 'off') return;
      const ctx = this.ctx, t0 = ctx.currentTime + (delay || 0);
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = q || 2;
      b.frequency.setValueAtTime(f0, t0); b.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(b); b.connect(g); g.connect(this.master);
      if (echo) g.connect(this.send);
      src.start(t0); src.stop(t0 + Math.min(dur + 0.05, 2.9));
    },
    startLoops() {
      if (this.loops) return;
      this.loops = true;
      let n = 0;
      const beat = () => {                       // heartbeat: faster and louder as tension rises
        if (this.on && this.mode !== 'off' && this.tension >= 1) {
          const v = 0.35 + 0.15 * Math.min(this.tension, 4) + (this.urgent ? 0.15 : 0);
          this.tone(100, 0.2, 'sine', v);        // "lub" (high enough for laptop speakers)
          this.tone(200, 0.12, 'triangle', v * 0.25);
          this.tone(82, 0.24, 'sine', v * 0.85, 0.2);   // "dub"
        }
        if (this.on && this.mode === 'game' && this.urgent) {   // creaks and far-off wails between heartbeats
          n++;
          if (n % 14 === 0) this.creak();
          if (n % 29 === 0) this.wail();
        }
        setTimeout(beat, this.urgent ? 420 : Math.max(560, 1500 - this.tension * 250));
      };
      const whisper = () => {                    // breathy whisper somewhere in the dark
        if (this.on && this.mode === 'game') {
          this.whisper();
          if (this.urgent) setTimeout(() => this.whisper(), 700);   // overlapping voices
        }
        setTimeout(whisper, this.urgent ? 3500 + Math.random() * 2500 : Math.max(5000, 12000 + Math.random() * 10000 - this.tension * 2500));
      };
      beat();
      setTimeout(whisper, 5000);
    },
    whisper() {
      if (!this.ctx || !this.noiseBuf) return;
      const ctx = this.ctx, t0 = ctx.currentTime;
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
      src.playbackRate.value = 0.9 + Math.random() * 0.3;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200 + Math.random() * 1800; bp.Q.value = 2.5;
      const g = ctx.createGain(), vol = 0.3 + 0.1 * this.tension + (this.urgent ? 0.15 : 0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.7);
      g.gain.linearRampToValueAtTime(vol * 0.5, t0 + 1.3);
      g.gain.linearRampToValueAtTime(0, t0 + 2.2);
      src.connect(bp); bp.connect(g);
      let out = g;
      if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.random() * 1.6 - 0.8; g.connect(p); out = p; }
      out.connect(this.master);
      if (this.send) out.connect(this.send);
      src.start(t0); src.stop(t0 + 2.4);
    },
    stinger(n) {
      if (!this.on || this.mode !== 'game') return;
      if (n === 0) {                             // first sighting: a shriek tears down the scale
        this.osc('sawtooth', 1500, 520, 0.9, 0.3, 0, true);
        this.osc('sawtooth', 1580, 540, 0.9, 0.25, 0, true);
        this.osc('sine', 110, 62, 0.9, 0.9, 0, false);
        this.noise(0.5, 300, 200, 0.7, 0, false, 0.7);
        setTimeout(() => this.whisper(), 400);
      } else {                                   // second sighting: closer, heavier, with a breathing growl
        this.osc('sine', 110, 55, 1.4, 1.0, 0, false);
        this.noise(0.6, 250, 180, 0.9, 0, false, 0.7);
        this.osc('sawtooth', 300, 1900, 1.8, 0.28, 0.1, true);
        this.osc('sawtooth', 312, 1960, 1.8, 0.22, 0.1, true);
        this.osc('sawtooth', 60, 45, 1.8, 0.5, 0.2, false, 180);
        this.noise(1.8, 500, 300, 0.45, 0.3, true, 1.2);
        setTimeout(() => this.whisper(), 300);
        setTimeout(() => this.whisper(), 1000);
      }
    },
    steps() { [0, 0.55, 1.1, 1.65].forEach((d, i) => this.tone(i % 2 ? 140 : 115, 0.14, 'triangle', 0.5, d)); },
    toggle() {
      this.init();
      if (!this.ctx) return false;
      this.on = !this.on;
      if (this.on) this.startLoops();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.apply();
      return this.on;
    },
    tone(freq, dur, type, vol, delay) {
      if (!this.on || !this.ctx || this.mode === 'off') return;
      const t0 = this.ctx.currentTime + (delay || 0);
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur);
    },
    clunk() { this.tone(90, 0.5, 'square', 0.3); this.tone(55, 0.7, 'sine', 0.5, 0.02); },
    chime() { this.tone(880, 1.2, 'sine', 0.2, 0.4); this.tone(1320, 1.5, 'sine', 0.14, 0.55); }
  };
  // Silence everything while the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (!Snd.ctx) return;
    if (document.hidden) Snd.ctx.suspend(); else if (Snd.on) Snd.ctx.resume();
  });
  el.mute.addEventListener('click', toggleSound);

  /* ============================================================
     Scene art — inline SVG built from simple shapes
     ============================================================ */
  const layers = [$('layerA'), $('layerB')];
  let topLayer = -1, curKey = null;

  // Always show the picture's full height. On wide, short windows the extra width is filled with dark forest
  // (see sideFill), so nothing at the top (gems) or bottom (levers) is ever cropped.
  function sceneViewBox() {
    const w = el.scene.clientWidth || 800, h = el.scene.clientHeight || 450;
    const a = w / h;
    if (a <= 800 / 450) return '0 0 800 450';              // narrower than 16:9: sides are trimmed instead
    const vw = 450 * a;
    return `${(400 - vw / 2).toFixed(1)} 0 ${vw.toFixed(1)} 450`;
  }
  const SIDE_COLORS = { clearing: '#050f0b', gate: '#0a1016', oak: '#07120b', river: '#091218', hut: '#100a07', shrine: '#0b0817', stone: '#060a0e' };
  function sideFill(loc) {
    const c = SIDE_COLORS[loc] || '#050a08';
    let o = rect(-1400, 400, 1400, 60, c) + rect(800, 400, 1400, 60, c);
    o += pines(900 + loc.length, 16, 470, 220, 340, c, 1, -1400, -40, 0);
    o += pines(950 + loc.length, 16, 470, 220, 340, c, 1, 840, 2200, 0);
    return o;
  }
  window.addEventListener('resize', () => {
    layers.forEach(l => { const s = l.querySelector('svg'); if (s) s.setAttribute('viewBox', sceneViewBox()); });
  });

  function renderScene(loc) {
    const s = state;
    const key = loc + JSON.stringify([s.levers, s.planked, s.oakOpen, s.plankTaken, s.shrineUnlocked, s.noteRead, s.journalRead]);
    if (key === curKey) return;
    curKey = key;
    const art = ART[loc](s);
    art.svg = sideFill(loc) + art.svg + eyes(loc, loc === 'stone' ? 6 : 1 + Object.values(s.levers).filter(Boolean).length);
    const next = layers[topLayer === 0 ? 1 : 0];
    const old = topLayer >= 0 ? layers[topLayer] : null;
    next.style.background = art.bg;
    next.innerHTML = `<svg viewBox="${sceneViewBox()}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${art.svg}</svg>`;
    next.style.zIndex = 2;
    if (old) old.style.zIndex = 1;
    next.classList.add('on');
    if (old) setTimeout(() => { if (layers[topLayer] !== old) old.classList.remove('on'); }, 700);
    topLayer = topLayer === 0 ? 1 : 0;
  }

  function rng(seed) {
    let a = seed;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f = Math.round;

  function pines(seed, n, base, hmin, hmax, fill, op, x0, x1, blur) {
    const r = rng(seed);
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), h = hmin + r() * (hmax - hmin), w = h * 0.17;
      d += `M${f(x - w * .1)} ${f(base)}L${f(x - w * .1)} ${f(base - h * .3)}L${f(x + w * .1)} ${f(base - h * .3)}L${f(x + w * .1)} ${f(base)}Z`;
      for (let k = 0; k < 4; k++) {
        const apex = base - h + k * h * .19, bot = apex + h * .32, hw = w * (.45 + k * .22);
        d += `M${f(x)} ${f(apex)}L${f(x + hw)} ${f(bot)}L${f(x - hw)} ${f(bot)}Z`;
      }
    }
    return `<path d="${d}" fill="${fill}" opacity="${op}"${blur ? ` style="filter:blur(${blur}px)"` : ''}/>`;
  }
  const glow = (x, y, r, c, op) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${op * .35}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * .6}" fill="${c}" opacity="${op * .4}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * .3}" fill="${c}" opacity="${op}"/>`;
  const rect = (x, y, w, h, fill, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra || ''}/>`;

  function lever(x, y, down, col, knob) {
    const ex = x + (down ? 20 : 14), ey = y + (down ? 26 : -40);
    return rect(x - 14, y - 4, 28, 10, '#3a3a3a', 'rx="3"') +
      `<line x1="${x}" y1="${y}" x2="${ex}" y2="${ey}" stroke="${col}" stroke-width="6" stroke-linecap="round"/>` +
      `<circle cx="${ex}" cy="${ey}" r="7" fill="${knob}"/>`;
  }

  // Pairs of pale eyes watching from the dark between the trees.
  // Deterministic per place; more of them appear as levers are pulled.
  function eyes(loc, count) {
    const r = rng(loc.length * 977 + loc.charCodeAt(0) * 31);
    let o = '';
    for (let i = 0; i < count; i++) {
      const left = r() < .5;
      const x = left ? 30 + r() * 200 : 570 + r() * 200, y = 150 + r() * 150, d = (i * 1.7 + r() * 3).toFixed(1);
      o += `<g class="eyeWrap" data-x="${f(x)}" data-y="${f(y)}"><g class="eyes" style="animation-delay:${d}s">` +
        `<circle cx="${f(x)}" cy="${f(y)}" r="9" fill="#e8e0a0" opacity=".10"/>` +
        `<ellipse cx="${f(x - 5)}" cy="${f(y)}" rx="3" ry="1.8" fill="#f1ecb0"/>` +
        `<ellipse cx="${f(x + 5)}" cy="${f(y)}" rx="3" ry="1.8" fill="#f1ecb0"/>` +
        `<circle class="pup" cx="${f(x - 5)}" cy="${f(y)}" r="1.1" fill="#1a1500"/>` +
        `<circle class="pup" cx="${f(x + 5)}" cy="${f(y)}" r="1.1" fill="#1a1500"/></g></g>`;
    }
    return o;
  }

  const ART = {
    stone(s) {
      let o = '';
      o += glow(400, 120, 220, '#bfe0dc', .10);
      o += pines(61, 14, 320, 150, 250, '#0b1217', .95, 0, 800, 1.5);
      // bare, twisted trees
      [[90, 450, 120, 120], [700, 450, 690, 110], [210, 400, 190, 150], [600, 400, 620, 140]].forEach(t => {
        o += `<path d="M${t[0]} ${t[1]}L${t[0] + 4} ${t[3] + 60}M${t[0] + 3} ${t[3] + 90}l-34 -40M${t[0] + 3} ${t[3] + 70}l30 -45M${t[0] + 2} ${t[3] + 120}l-26 -22" stroke="#06090c" stroke-width="7" stroke-linecap="round" fill="none"/>`;
      });
      o += `<ellipse cx="400" cy="420" rx="560" ry="90" fill="#142026"/>`;
      o += `<ellipse cx="400" cy="372" rx="190" ry="34" fill="#2a3a3a"/>`;
      // steps up to the mound
      o += rect(300, 362, 200, 14, '#4b5a5a') + rect(325, 350, 150, 14, '#586868') + rect(350, 338, 100, 14, '#667777');
      // the tall stone
      o += `<path d="M362 338L366 120Q400 86 434 120L438 338Z" fill="#7d8a8c" stroke="#3a4648" stroke-width="3"/>`;
      o += `<path d="M366 120Q400 86 434 120" fill="#9aa8aa" opacity=".5"/>`;
      for (let i = 0; i < 7; i++) o += rect(380, 150 + i * 24, 40 - (i % 3) * 8, 3, '#2d3a3c', 'opacity=".7"');
      o += glow(400, 200, 50, '#9fe0d6', .25);
      o += pines(62, 3, 470, 320, 420, '#04070a', 1, 0, 150, 0) + pines(63, 3, 470, 320, 420, '#04070a', 1, 650, 800, 0);
      return { bg: 'linear-gradient(#0f151b,#1d2b31 55%,#0b1114)', svg: o };
    },

    clearing() {
      let o = '';
      o += `<polygon points="330,0 470,0 600,450 200,450" fill="#d6f0c8" opacity=".08"/>`;
      o += `<polygon points="365,0 435,0 490,450 310,450" fill="#e6ffd8" opacity=".09"/>`;
      o += pines(1, 16, 300, 130, 210, '#0e2a22', .85, 0, 800, 2);
      o += pines(2, 11, 345, 190, 290, '#0a1f19', .95, 0, 800, 1);
      o += `<ellipse cx="400" cy="420" rx="560" ry="110" fill="#143826"/>`;
      o += `<ellipse cx="400" cy="385" rx="250" ry="42" fill="#2a5a3a" opacity=".85"/>`;
      o += `<ellipse cx="400" cy="385" rx="140" ry="24" fill="#e6ffd0" opacity=".14"/>`;
      o += pines(3, 4, 470, 320, 430, '#040d09', 1, 0, 170, 0);
      o += pines(4, 4, 470, 320, 430, '#040d09', 1, 630, 800, 0);
      return { bg: 'linear-gradient(#0b1f1a,#15382d 55%,#0a1a14)', svg: o };
    },

    gate(s) {
      const open = Object.values(s.levers).filter(Boolean).length === 3;
      let o = '';
      o += pines(11, 12, 335, 150, 230, '#16202a', .9, 0, 800, 1.5);
      o += rect(0, 360, 800, 90, '#10171d');
      o += rect(280, 140, 240, 225, '#fff', `opacity="${open ? .95 : .42}"`);
      if (open) o += glow(400, 260, 200, '#fff', .5);
      const pillar = x => rect(x, 100, 50, 270, '#5b6670') + rect(x - 6, 90, 62, 14, '#7a8590') + rect(x - 6, 362, 62, 12, '#3f4852') +
        rect(x + 8, 130, 3, 200, '#47515a', 'opacity=".6"');
      o += pillar(230) + pillar(520);
      if (!open) {
        for (let x = 292; x <= 508; x += 16) o += rect(x, 140, 5, 225, '#2b3138');
        o += rect(280, 190, 240, 7, '#2b3138') + rect(280, 300, 240, 7, '#2b3138');
        if (!s.noteRead) o += `<g transform="rotate(-6 338 245)">${rect(326, 228, 24, 32, '#e0d0a0', 'stroke="#8a7440"')}${rect(330, 236, 16, 2, '#7a6a3a')}${rect(330, 242, 16, 2, '#7a6a3a')}${rect(330, 248, 12, 2, '#7a6a3a')}</g>`;
      } else {
        [284, 292, 504, 512].forEach(x => { o += rect(x, 140, 5, 225, '#2b3138'); });
      }
      o += rect(280, 112, 240, 28, '#4a535d', 'rx="4"');
      [[346, 'oak', '#ff4d5e'], [400, 'river', '#4dff8a'], [454, 'shrine', '#4da6ff']].forEach(([x, k, c]) => {
        o += `<circle cx="${x}" cy="126" r="12" fill="#1c2127" stroke="#788" stroke-width="2"/>`;
        if (s.levers[k]) o += glow(x, 126, 40, c, .75) + `<circle cx="${x}" cy="126" r="9" fill="${c}"/>`;
      });
      o += pines(12, 3, 470, 300, 400, '#05090d', 1, 0, 150, 0) + pines(13, 3, 470, 300, 400, '#05090d', 1, 650, 800, 0);
      return { bg: 'linear-gradient(#1a2430,#2e3b4a 60%,#141b22)', svg: o };
    },

    oak(s) {
      let o = '';
      o += pines(21, 10, 320, 120, 200, '#0c1812', .9, 0, 800, 2);
      o += `<ellipse cx="400" cy="445" rx="500" ry="75" fill="#162a1c"/>`;
      o += glow(400, 260, 260, '#e0a060', .12);
      [[300, 445, 200, 425, 110, 448], [500, 445, 600, 425, 690, 448], [330, 440, 280, 458, 220, 462], [470, 440, 520, 458, 590, 462]]
        .forEach(r => { o += `<path d="M${r[0]} ${r[1]}Q${r[2]} ${r[3]} ${r[4]} ${r[5]}" stroke="#3b2a1a" stroke-width="22" stroke-linecap="round" fill="none"/>`; });
      o += `<path d="M285 450C320 330 328 160 345 20L455 20C472 160 482 330 515 450Z" fill="#4a3320"/>`;
      [[360, 120, 350, 300], [395, 60, 392, 230], [440, 90, 452, 260], [425, 340, 440, 430]]
        .forEach(l => { o += `<path d="M${l[0]} ${l[1]}Q${l[0] + 10} ${(l[1] + l[3]) / 2} ${l[2]} ${l[3]}" stroke="#2e1f12" stroke-width="4" fill="none" opacity=".7"/>`; });
      o += `<ellipse cx="400" cy="320" rx="50" ry="80" fill="#0b0604" stroke="#2a1a0e" stroke-width="6"/>`;
      if (s.oakOpen) {
        if (s.levers.oak) o += glow(414, 350, 60, '#ff4d5e', .5);
        o += lever(400, 345, s.levers.oak, '#9a5a2a', s.levers.oak ? '#ff4d5e' : '#b86a30');
        [[338, 190, 395], [464, 190, 395]].forEach(v => { o += `<path d="M${v[0]} ${v[1]}Q${v[0] - 12} 290 ${v[0] + 4} ${v[2]}" stroke="#2d5a2c" stroke-width="8" fill="none"/>`; });
      } else {
        [352, 376, 400, 424, 448].forEach((x, i) => {
          o += `<path d="M${x} 190Q${x + 16} 250 ${x - 12} 310T${x + 6} 420" stroke="#2d5a2c" stroke-width="8" fill="none"/>`;
          o += `<ellipse cx="${x + 4}" cy="${260 + i * 14}" rx="9" ry="5" fill="#3d7a3a"/>`;
        });
      }
      o += `<ellipse cx="400" cy="0" rx="470" ry="95" fill="#08130d"/><ellipse cx="150" cy="30" rx="200" ry="70" fill="#0a170f"/><ellipse cx="650" cy="30" rx="200" ry="70" fill="#0a170f"/>`;
      [[250, 440], [262, 446], [560, 448], [575, 442]].forEach(m => { o += `<circle cx="${m[0]}" cy="${m[1]}" r="6" fill="#d9a87a"/>`; });
      return { bg: 'linear-gradient(#17261a,#2b2a1a 55%,#17120a)', svg: o };
    },

    river(s) {
      let o = '';
      o += pines(31, 12, 250, 120, 200, '#18232d', .85, 0, 800, 2);
      o += rect(0, 240, 800, 50, '#1e2d27');
      o += pines(32, 6, 262, 60, 110, '#12201c', .95, 0, 800, 0);
      o += rect(0, 285, 800, 95, '#4d6b80');
      for (let i = 0; i < 12; i++) {
        const x = (i * 83) % 800, y = 295 + (i % 4) * 22;
        o += `<path d="M${x} ${y}q20 -8 40 0t40 0" stroke="#b5ccd8" stroke-width="2" fill="none" opacity=".4"/>`;
      }
      o += `<ellipse cx="400" cy="440" rx="520" ry="70" fill="#1a2620"/>`;
      o += rect(0, 380, 800, 70, '#1a2620');
      // broken bridge: near stub + far stub, gap in the middle
      [345, 355, 365, 375].forEach(y => { o += rect(368, y, 64, 7, '#7a5a38'); });
      [288, 297, 306].forEach(y => { o += rect(368, y, 64, 7, '#7a5a38'); });
      o += rect(362, 340, 7, 45, '#4a3420') + rect(431, 340, 7, 45, '#4a3420');
      o += rect(362, 283, 7, 32, '#4a3420') + rect(431, 283, 7, 32, '#4a3420');
      if (s.planked) o += rect(386, 308, 28, 40, '#a98250', 'stroke="#5a3e20"');
      // far-bank lever
      if (s.levers.river) o += glow(540, 262, 50, '#4dff8a', .5);
      o += lever(540, 262, s.levers.river, '#8a8f80', s.levers.river ? '#4dff8a' : '#b0b0a0');
      o += `<ellipse cx="540" cy="268" rx="26" ry="8" fill="#3a5a3a"/>`;
      o += pines(33, 3, 470, 300, 400, '#050c0f', 1, 0, 140, 0) + pines(34, 3, 470, 300, 400, '#050c0f', 1, 660, 800, 0);
      return { bg: 'linear-gradient(#27323d,#3b4b59 55%,#1d2830)', svg: o };
    },

    hut(s) {
      let o = '';
      o += glow(400, 250, 300, '#d08a40', .08);
      o += pines(41, 12, 320, 130, 210, '#1d1712', .9, 0, 800, 2);
      o += `<ellipse cx="400" cy="440" rx="520" ry="80" fill="#2a2016"/>`;
      o += rect(470, 175, 26, 60, '#4a3426');
      o += rect(300, 245, 220, 125, '#5a3d28');
      for (let y = 262; y < 370; y += 18) o += rect(300, y, 220, 2, '#3a2418', 'opacity=".6"');
      o += `<polygon points="276,250 410,165 544,250" fill="#3a2418"/>`;
      o += rect(395, 295, 42, 75, '#2a1a10');
      o += glow(350, 298, 40, '#e0953c', .45) + rect(332, 282, 38, 32, '#e0a050', 'opacity=".85"') + rect(349, 282, 3, 32, '#4a2e18') + rect(332, 297, 38, 3, '#4a2e18');
      if (s.journalRead) o += glow(351, 300, 22, '#aac8ff', .35) + '<g opacity=".7"><circle cx="351" cy="294" r="5" fill="#d8e8ff"/><path d="M341 314Q342 300 351 300Q360 300 361 314Z" fill="#d8e8ff"/></g>';
      // woodpile
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5 - r; c++) o += `<circle cx="${570 + c * 22 + r * 11}" cy="${360 - r * 20}" r="10" fill="#6b4a2e" stroke="#3a2a1a" stroke-width="2"/>`;
      if (!s.plankTaken) o += rect(548, 308, 110, 9, '#b08a58', 'rx="2" transform="rotate(-4 600 312)"');
      o += pines(42, 3, 470, 320, 420, '#0a0705', 1, 0, 150, 0) + pines(43, 3, 470, 320, 420, '#0a0705', 1, 650, 800, 0);
      return { bg: 'linear-gradient(#2a1e18,#44301f 55%,#1a120d)', svg: o };
    },

    shrine(s) {
      let o = '';
      o += glow(400, 290, 240, '#a070f0', .12) + glow(400, 290, 130, '#b890ff', .12);
      o += pines(51, 10, 300, 120, 190, '#150f26', .8, 0, 800, 2);
      o += `<ellipse cx="400" cy="400" rx="520" ry="90" fill="#1b1530"/>`;
      o += `<ellipse cx="400" cy="345" rx="330" ry="66" fill="#271e42" opacity=".8"/>`;
      const stones = back => {
        let out = '';
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2, sn = Math.sin(a);
          if ((sn < 0) !== back) continue;
          const x = 400 + Math.cos(a) * 310, y = 345 + sn * 62, sc = .75 + .3 * (sn + 1) / 2;
          const w = 32 * sc, h = (i % 4 === 1 ? 34 : 56 + (i % 3) * 14) * sc;
          out += `<path d="M${f(x - w / 2)} ${f(y)}L${f(x - w / 2)} ${f(y - h)}${i % 4 === 1 ? `L${f(x + w / 2)} ${f(y - h * .7)}` : `L${f(x + w / 2)} ${f(y - h)}`}L${f(x + w / 2)} ${f(y)}Z" fill="${back ? '#5a596a' : '#767586'}" stroke="#2a2938" stroke-width="2"/>`;
        }
        return out;
      };
      o += stones(true);
      o += rect(350, 300, 100, 62, '#8a8a98') + rect(338, 290, 124, 14, '#a6a6b4') + rect(350, 345, 100, 4, '#6a6a78', 'opacity=".6"');
      if (s.levers.shrine) o += glow(400, 262, 60, '#4da6ff', .5);
      if (!s.shrineUnlocked && !s.levers.shrine) {
        o += `<circle cx="400" cy="262" r="30" fill="none" stroke="#7a7a88" stroke-width="9"/>`;
        o += `<circle cx="400" cy="262" r="30" fill="none" stroke="#c8b8ff" stroke-width="2" stroke-dasharray="3 5" opacity=".7"/>`;
      } else {
        o += `<path d="M370 262A30 30 0 0 1 385 236" stroke="#7a7a88" stroke-width="9" fill="none"/><path d="M430 262A30 30 0 0 0 415 236" stroke="#7a7a88" stroke-width="9" fill="none"/>`;
        o += rect(330, 296, 20, 8, '#7a7a88') + rect(452, 296, 22, 8, '#7a7a88');
      }
      o += lever(400, 286, s.levers.shrine, '#b0b0c0', s.levers.shrine ? '#4da6ff' : '#8a7ad0');
      o += stones(false);
      [[250, 300], [560, 280], [330, 230], [480, 210]].forEach(p => { o += glow(p[0], p[1], 10, '#c8a8ff', .5); });
      return { bg: 'linear-gradient(#1c1530,#2e2450 55%,#120d1f)', svg: o };
    }
  };

  /* ---------------- Boot ---------------- */
  setVeil(1, '#000');
  applyLang();
  showTitle();
})();
