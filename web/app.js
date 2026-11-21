/* Docs – alternative Oberfläche für Paperless-ngx
 * Reines JavaScript ohne Build-Schritt. Spricht über /api (vom nginx-Container weitergeleitet)
 * mit Paperless und meldet sich per Paperless-Token an.
 */
(function () {
  'use strict';

  const CFG = window.ARCHIV_CONFIG || { appName: 'Docs', areas: [] };
  const $app = document.getElementById('app');
  const $toast = document.getElementById('toast');
  const PALETTE = ['#A2845E', '#FF9500', '#34C759', '#FF3B30', '#FF2D55', '#5856D6', '#30B0C7', '#FFCC00', '#007AFF', '#8E8E93', '#64D2FF', '#AF52DE'];

  /* ================================================================== */
  /* Hilfsfunktionen                                                     */
  /* ================================================================== */

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : null; };
  const docDate = (d) => String(d.created_date || d.created || '').slice(0, 10);
  const fmtDate = (s) => { if (!s) return ''; const d = String(s).slice(0, 10).split('-'); return d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : s; };
  const monthName = (y, m) => new Date(+y, +m - 1, 1).toLocaleDateString('de-DE', { month: 'long' });
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const initial = (s) => (String(s || '?').trim().match(/[A-Za-zÄÖÜäöü0-9]/) || ['?'])[0].toUpperCase();

  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => $toast.classList.remove('show'), 2600);
  }

  // Farben per CSSOM setzen (Inline-Styles sind per CSP gesperrt)
  function applyColors(root) {
    root.querySelectorAll('[data-color]').forEach((el) => {
      const c = el.getAttribute('data-color');
      if (/^#[0-9a-fA-F]{6}$/.test(c)) el.style.backgroundColor = el.classList.contains('swatch') ? c + '24' : c;
    });
  }

  // Treffer-Ausschnitt aus der Volltextsuche sicher darstellen (nur Markierungen übernehmen)
  function safeHighlight(html) {
    if (!html) return '';
    const parts = String(html).split(/(<(?:b|span[^>]*)>[\s\S]*?<\/(?:b|span)>)/g);
    const parser = new DOMParser();
    const text = (s) => parser.parseFromString(s, 'text/html').body.textContent || '';
    return parts.map((p) => {
      const m = p.match(/^<(?:b|span[^>]*)>([\s\S]*?)<\/(?:b|span)>$/);
      return m ? `<mark>${esc(text(m[1]))}</mark>` : esc(text(p));
    }).join('').replace(/\s+/g, ' ').trim();
  }

  const svg = (d, size = 18, sw = 2) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    docs: '<path d="M15 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V6z"/><path d="M15 2v4h4"/><path d="M3 7v13a2 2 0 0 0 2 2h10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    next: '<path d="m9 18 6-6-6-6"/>',
    download: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"/>',
    open: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    spark: '<path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6-4.6-1.9 4.6-1.9z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    tiles: '<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="10" rx="1.5"/><path d="M3 17h8M13 17h8M3 21h5M13 21h5"/>',
    timeline: '<path d="M6 3v18"/><circle cx="6" cy="7" r="2"/><circle cx="6" cy="17" r="2"/><path d="M11 7h10M11 17h10"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
    filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    select: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    zip: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M10 3v2M10 7v2M10 11v2"/><rect x="9" y="13" width="2" height="3" rx="1"/>',
    sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>'
  };
  const I = (name, size, sw) => svg(P[name], size, sw);
  const LOGO = (size) => `<svg width="${size}" height="${size}" viewBox="86.0 86.0 340 340" aria-hidden="true"><rect x="203.0" y="110.0" width="166" height="232" rx="28" fill="#fff" fill-opacity=".38"/><rect x="173.0" y="140.0" width="166" height="232" rx="28" fill="#fff" fill-opacity=".66"/><path d="M171.0 170.0H251.0L309.0 228.0V374.0a28 28 0 0 1-28 28H171.0a28 28 0 0 1-28-28V198.0a28 28 0 0 1 28-28Z" fill="#fff"/><path d="M251.0 170.0V210.0a18 18 0 0 0 18 18H309.0Z" fill="#B9D9FF"/></svg>`;

  /* ================================================================== */
  /* Einstellungen (lokal im Browser)                                     */
  /* ================================================================== */

  const prefs = (() => {
    let p = {};
    try { p = JSON.parse(localStorage.getItem('archiv.prefs') || '{}'); } catch (e) { p = {}; }
    return Object.assign({ theme: 'light', view: 'list', areas: null, favs: [], recent: [] }, p);
  })();
  const savePrefs = () => { try { localStorage.setItem('archiv.prefs', JSON.stringify(prefs)); } catch (e) { /* voll */ } };
  const applyTheme = () => { document.documentElement.setAttribute('data-theme', prefs.theme || 'light'); };
  applyTheme();

  function rememberDoc(doc) {
    prefs.recent = [{ id: doc.id, title: doc.title }, ...prefs.recent.filter((r) => r.id !== doc.id)].slice(0, 12);
    savePrefs();
  }

  /* ================================================================== */
  /* API                                                                 */
  /* ================================================================== */

  const auth = {
    get token() { return localStorage.getItem('archiv.token') || sessionStorage.getItem('archiv.token'); },
    set(token, remember) { (remember ? localStorage : sessionStorage).setItem('archiv.token', token); },
    clear() { localStorage.removeItem('archiv.token'); sessionStorage.removeItem('archiv.token'); }
  };

  let apiVersion = null;
  // Ab API-Version 9 ist "created" ein reines Datum, davor gibt es dafür "created_date"
  const dateField = () => (apiVersion && apiVersion >= 9 ? 'created' : 'created_date');

  async function api(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    if (auth.token) headers.Authorization = 'Token ' + auth.token;
    headers.Accept = apiVersion ? `application/json; version=${apiVersion}` : 'application/json';
    let body = opts.body;
    if (opts.json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.json); }
    const res = await fetch('/api' + path, { method: opts.method || 'GET', headers, body });
    if (!apiVersion) { const v = parseInt(res.headers.get('X-Api-Version') || '', 10); if (v > 0) apiVersion = v; }
    if (res.status === 401) { auth.clear(); route('#/login'); throw new Error('Nicht angemeldet'); }
    if (!res.ok) {
      let detail = '';
      try { detail = JSON.stringify(await res.json()); } catch (e) { /* egal */ }
      throw new Error(`Fehler ${res.status}${detail ? ': ' + detail.slice(0, 200) : ''}`);
    }
    if (opts.blob) return res.blob();
    if (res.status === 204) return null;
    const ct = res.headers.get('Content-Type') || '';
    return ct.includes('json') ? res.json() : res.text();
  }
  const apiBlob = (path) => api(path, { blob: true });

  async function fetchAll(path) {
    const out = [];
    for (let page = 1; ; page += 1) {
      const sep = path.includes('?') ? '&' : '?';
      const r = await api(`${path}${sep}page_size=500&page=${page}`);
      out.push(...r.results);
      if (!r.next) break;
    }
    return out;
  }

  async function bulkEdit(ids, method, parameters = {}) {
    await api('/documents/bulk_edit/', { method: 'POST', json: { documents: ids, method, parameters } });
  }

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* ================================================================== */
  /* Stammdaten                                                          */
  /* ================================================================== */

  const meta = { loaded: false, tags: new Map(), corr: new Map(), types: new Map(), paths: new Map(), inboxTags: [], user: null, minYear: null };

  async function loadMeta(force) {
    if (meta.loaded && !force) return;
    const [tags, corr, types, paths, ui, oldest] = await Promise.all([
      fetchAll('/tags/'), fetchAll('/correspondents/'), fetchAll('/document_types/'), fetchAll('/storage_paths/'),
      api('/ui_settings/').catch(() => null),
      api('/documents/?ordering=created&page_size=1&fields=id,created,created_date').catch(() => null)
    ]);
    meta.tags = new Map(tags.map((t) => [t.id, t]));
    meta.corr = new Map(corr.map((c) => [c.id, c]));
    meta.types = new Map(types.map((t) => [t.id, t]));
    meta.paths = new Map(paths.map((p) => [p.id, p]));
    meta.inboxTags = tags.filter((t) => t.is_inbox_tag).map((t) => t.id);
    meta.user = ui && ui.user ? ui.user : null;
    const y = oldest && oldest.results && oldest.results[0] ? parseInt(docDate(oldest.results[0]).slice(0, 4), 10) : null;
    meta.minYear = y && y > 1900 ? y : new Date().getFullYear() - 10;
    meta.loaded = true;
  }

  const idOf = (v) => (v && typeof v === 'object' ? v.id : v);
  const corrName = (v) => { const c = meta.corr.get(idOf(v)); return c ? c.name : ''; };
  const typeName = (v) => { const t = meta.types.get(idOf(v)); return t ? t.name : ''; };
  const pathName = (v) => { const p = meta.paths.get(idOf(v)); return p ? p.name : ''; };
  const tagName = (id) => { const t = meta.tags.get(id); return t ? t.name : ''; };
  const tagIds = (doc) => (doc.tags || []).map(idOf);
  const realTags = (doc) => tagIds(doc).filter((t) => !meta.inboxTags.includes(t));
  const userName = () => (meta.user ? (meta.user.first_name || meta.user.username) : '');

  function areaDefs() { return Array.isArray(prefs.areas) ? prefs.areas : (CFG.areas || []); }
  function areaList() {
    const byName = new Map([...meta.tags.values()].map((t) => [t.name.toLowerCase(), t]));
    return areaDefs()
      .map((a) => { const t = byName.get(String(a.tag).toLowerCase()); return t ? { id: t.id, name: t.name, count: t.document_count || 0, color: a.color } : null; })
      .filter(Boolean);
  }
  function tagColor(tagId) {
    const t = meta.tags.get(tagId);
    if (!t) return null;
    const a = areaDefs().find((x) => String(x.tag).toLowerCase() === t.name.toLowerCase());
    return a ? a.color : null;
  }
  const sortedByCount = (map, filterFn) => [...map.values()].filter(filterFn || (() => true)).sort((a, b) => (b.document_count || 0) - (a.document_count || 0) || a.name.localeCompare(b.name, 'de'));

  /* ================================================================== */
  /* Vorschaubilder (lazy, mit Token)                                    */
  /* ================================================================== */

  const thumbCache = new Map();
  const thumbObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { thumbObserver.unobserve(e.target); loadThumb(e.target); } });
  }, { rootMargin: '300px' }) : null;

  async function loadThumb(el) {
    const id = el.getAttribute('data-thumb');
    try {
      let url = thumbCache.get(id);
      if (!url) { url = URL.createObjectURL(await apiBlob(`/documents/${id}/thumb/`)); thumbCache.set(id, url); }
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.src = url;
      el.replaceChildren(img);
    } catch (e) { /* ohne Vorschau weiter */ }
  }
  function watchThumbs(root) {
    root.querySelectorAll('[data-thumb]').forEach((el) => {
      if (el.firstChild) return;
      if (thumbCache.has(el.getAttribute('data-thumb'))) loadThumb(el);
      else if (thumbObserver) thumbObserver.observe(el); else loadThumb(el);
    });
  }

  /* ================================================================== */
  /* Dialoge                                                             */
  /* ================================================================== */

  function openSheet({ title, body, footer, cls, onMount, label }) {
    const d = document.createElement('dialog');
    d.className = 'sheet' + (cls ? ' ' + cls : '');
    d.setAttribute('aria-label', label || title || 'Dialog');
    d.innerHTML = `
      ${title ? `<div class="sheet-h"><h2>${esc(title)}</h2><button type="button" class="iconbtn" data-close aria-label="Schließen">${I('x', 18)}</button></div>` : ''}
      <div class="sheet-b">${body || ''}</div>
      ${footer ? `<div class="sheet-f">${footer}</div>` : ''}`;
    document.body.appendChild(d);
    const close = () => { if (d.open) d.close(); };
    d.addEventListener('close', () => d.remove());
    d.addEventListener('click', (e) => {
      if (e.target === d) close();
      if (e.target.closest('[data-close]')) close();
    });
    applyColors(d);
    d.showModal();
    if (onMount) onMount(d, close);
    return { el: d, close };
  }
  const closeDialogs = () => document.querySelectorAll('dialog[open]').forEach((d) => d.close());

  function confirmSheet(title, text, okLabel, danger) {
    return new Promise((resolve) => {
      let ok = false;
      const s = openSheet({
        title, body: `<p class="muted">${esc(text)}</p>`,
        footer: `<button class="btn plain" data-close>Abbrechen</button><button class="btn ${danger ? 'danger' : ''}" data-ok>${esc(okLabel)}</button>`,
        onMount: (d, close) => { d.querySelector('[data-ok]').addEventListener('click', () => { ok = true; close(); }); }
      });
      s.el.addEventListener('close', () => resolve(ok));
    });
  }

  // Auswahl aus einer Liste (Tag, Typ, Korrespondent …)
  function pickSheet(title, items, opts = {}) {
    return new Promise((resolve) => {
      let picked = null;
      const s = openSheet({
        title,
        body: `
          <label class="sr-only" for="pk">Suchen</label>
          <input class="input" id="pk" type="search" placeholder="Suchen …" autocomplete="off">
          <div class="pickl" id="pkl">
            ${opts.allowNone ? `<button type="button" data-v="">${esc(opts.allowNone)}</button>` : ''}
            ${items.map((it) => `<button type="button" data-v="${it.id}" data-n="${esc(it.name.toLowerCase())}">${it.color ? `<span class="dot" data-color="${esc(it.color)}"></span>` : ''}<span>${esc(it.name)}</span>${it.count != null ? `<span class="num">${it.count}</span>` : ''}</button>`).join('')}
          </div>`,
        onMount: (d, close) => {
          const inp = d.querySelector('#pk');
          if (!('ontouchstart' in window)) inp.focus();
          inp.addEventListener('input', () => {
            const v = inp.value.trim().toLowerCase();
            d.querySelectorAll('[data-n]').forEach((b) => { b.hidden = v && !b.getAttribute('data-n').includes(v); });
          });
          inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); const first = [...d.querySelectorAll('.pickl button')].find((b) => !b.hidden); if (first) first.click(); }
          });
          d.querySelector('#pkl').addEventListener('click', (e) => {
            const b = e.target.closest('button[data-v]');
            if (!b) return;
            picked = b.getAttribute('data-v') === '' ? 0 : +b.getAttribute('data-v');
            close();
          });
        }
      });
      s.el.addEventListener('close', () => resolve(picked));
    });
  }

  function tagPicker(selectedIds, suggestedIds = [], idPrefix = 't') {
    const sel = new Set(selectedIds);
    const sug = new Set(suggestedIds);
    const all = [...meta.tags.values()].filter((t) => !t.is_inbox_tag)
      .sort((a, b) => (sel.has(b.id) - sel.has(a.id)) || (sug.has(b.id) - sug.has(a.id)) || ((b.document_count || 0) - (a.document_count || 0)));
    return `
      <div class="tagpick">
        <label class="sr-only" for="${idPrefix}f">Tags filtern</label>
        <input class="input" id="${idPrefix}f" data-tagfilter type="search" placeholder="Tag suchen …" autocomplete="off">
        <div class="chips">
          ${all.map((t) => { const c = tagColor(t.id); return `<button type="button" class="chip toggle ${sel.has(t.id) ? 'on' : ''}" data-tag="${t.id}" data-name="${esc(t.name.toLowerCase())}">${sug.has(t.id) && !sel.has(t.id) ? I('spark', 14) : ''}${c ? `<span class="dot" data-color="${esc(c)}"></span>` : ''}${esc(t.name)}</button>`; }).join('')}
        </div>
      </div>`;
  }
  function bindTagPicker(root) {
    root.querySelectorAll('[data-tag]').forEach((b) => b.addEventListener('click', () => b.classList.toggle('on')));
    const f = root.querySelector('[data-tagfilter]');
    if (f) f.addEventListener('input', () => {
      const v = f.value.trim().toLowerCase();
      root.querySelectorAll('[data-tag]').forEach((b) => { b.hidden = v && !b.getAttribute('data-name').includes(v); });
    });
  }
  const pickedTags = (root) => [...root.querySelectorAll('[data-tag].on')].map((b) => +b.getAttribute('data-tag'));

  function optionList(map, selected, emptyLabel) {
    const items = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return `<option value="">${esc(emptyLabel)}</option>` + items.map((o) => `<option value="${o.id}" ${idOf(selected) === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('');
  }

  /* ================================================================== */
  /* Schnellsuche (⌘K)                                                    */
  /* ================================================================== */

  function openPalette() {
    if (document.querySelector('dialog.palette')) return;
    const actions = [
      { label: 'Übersicht', href: '#/', icon: 'grid' },
      { label: 'Posteingang', href: '#/inbox', icon: 'inbox' },
      { label: 'Alle Dokumente', href: '#/docs', icon: 'docs' },
      { label: 'Volltextsuche', href: '#/search', icon: 'search' },
      { label: 'Durchstöbern', href: '#/browse', icon: 'compass' },
      { label: 'Hochladen', href: '#/upload', icon: 'upload' },
      { label: 'Einstellungen', href: '#/settings', icon: 'gear' },
      { label: 'Hell/Dunkel umschalten', act: 'theme', icon: 'sun' }
    ];
    let active = 0;
    let docHits = [];
    let seq = 0;
    const s = openSheet({
      cls: 'palette', label: 'Schnellsuche',
      body: '',
      onMount: (d, close) => {
        d.innerHTML = `
          <div class="pin">${I('search', 20)}<label class="sr-only" for="pq">Schnellsuche</label><input id="pq" placeholder="Dokument, Tag, Korrespondent, Befehl …" autocomplete="off"><span class="kbd">esc</span></div>
          <div class="pres" id="pres"></div>
          <div class="pfoot hide-m"><span><span class="kbd">↑</span> <span class="kbd">↓</span> wählen</span><span><span class="kbd">↵</span> öffnen</span><span><span class="kbd">⌘K</span> Schnellsuche</span></div>`;
        const inp = d.querySelector('#pq');
        const res = d.querySelector('#pres');
        const draw = () => {
          const q = inp.value.trim().toLowerCase();
          const groups = [];
          const match = (n) => !q || n.toLowerCase().includes(q);
          const acts = actions.filter((a) => match(a.label));
          if (q) {
            groups.push(['Volltext', [{ label: `Volltextsuche nach „${inp.value.trim()}“`, href: '#/search?q=' + encodeURIComponent(inp.value.trim()), icon: 'search' }]]);
            if (docHits.length) groups.push(['Dokumente', docHits.map((h) => ({ label: h.title, sub: [corrName(h.correspondent), fmtDate(docDate(h))].filter(Boolean).join(' · '), href: '#/doc/' + h.id, icon: 'doc' }))]);
            const tg = sortedByCount(meta.tags, (t) => !t.is_inbox_tag && match(t.name)).slice(0, 5);
            if (tg.length) groups.push(['Tags', tg.map((t) => ({ label: t.name, sub: plural(t.document_count || 0, 'Dokument', 'Dokumente'), href: '#/docs?tags=' + t.id, icon: 'tag' }))]);
            const co = sortedByCount(meta.corr, (c) => match(c.name)).slice(0, 5);
            if (co.length) groups.push(['Korrespondenten', co.map((c) => ({ label: c.name, sub: plural(c.document_count || 0, 'Dokument', 'Dokumente'), href: '#/docs?corr=' + c.id, icon: 'user' }))]);
            const ty = sortedByCount(meta.types, (t) => match(t.name)).slice(0, 4);
            if (ty.length) groups.push(['Typen', ty.map((t) => ({ label: t.name, sub: plural(t.document_count || 0, 'Dokument', 'Dokumente'), href: '#/docs?type=' + t.id, icon: 'docs' }))]);
            if (acts.length) groups.push(['Befehle', acts]);
          } else {
            groups.push(['Befehle', acts]);
            if (prefs.recent.length) groups.push(['Zuletzt angesehen', prefs.recent.slice(0, 6).map((r) => ({ label: r.title, href: '#/doc/' + r.id, icon: 'doc' }))]);
          }
          const flat = [];
          res.innerHTML = groups.map(([g, items]) => `<div class="ph">${esc(g)}</div>` + items.map((it) => {
            const i = flat.push(it) - 1;
            return `<a class="pr" href="${it.href || '#'}" data-i="${i}" ${it.act ? `data-act="${it.act}"` : ''}><span class="ic">${I(it.icon, 16)}</span><span class="tx">${esc(it.label)}</span>${it.sub ? `<span class="sub">${esc(it.sub)}</span>` : ''}</a>`;
          }).join('')).join('') || '<div class="empty">Nichts gefunden.</div>';
          if (active >= flat.length) active = Math.max(0, flat.length - 1);
          highlight();
        };
        const highlight = () => {
          const items = res.querySelectorAll('.pr');
          items.forEach((el, i) => el.classList.toggle('act', i === active));
          const el = items[active];
          if (el) el.scrollIntoView({ block: 'nearest' });
        };
        const searchDocs = debounce(async () => {
          const q = inp.value.trim();
          const my = ++seq;
          if (q.length < 2) { docHits = []; draw(); return; }
          try {
            const r = await api(`/documents/?title_content=${encodeURIComponent(q)}&page_size=7&ordering=-created&fields=id,title,correspondent,created,created_date`);
            if (my === seq) { docHits = r.results; draw(); }
          } catch (e) { /* egal */ }
        }, 220);
        inp.addEventListener('input', () => { active = 0; draw(); searchDocs(); });
        inp.addEventListener('keydown', (e) => {
          const n = res.querySelectorAll('.pr').length;
          if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(1, n); highlight(); }
          if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + n) % Math.max(1, n); highlight(); }
          if (e.key === 'Enter') { e.preventDefault(); const el = res.querySelectorAll('.pr')[active]; if (el) el.click(); }
        });
        res.addEventListener('click', (e) => {
          const a = e.target.closest('.pr');
          if (!a) return;
          if (a.getAttribute('data-act') === 'theme') {
            e.preventDefault();
            prefs.theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            savePrefs(); applyTheme();
          }
          close();
        });
        draw();
        inp.focus();
      }
    });
    return s;
  }

  /* ================================================================== */
  /* Router & Grundgerüst                                                */
  /* ================================================================== */

  let inboxCount = 0;
  let pageKeys = null; // seitenspezifische Tastenkürzel

  function parseHash() {
    const h = location.hash || '#/';
    const i = h.indexOf('?');
    const p = i >= 0 ? h.slice(1, i) : h.slice(1);
    return { path: p || '/', params: new URLSearchParams(i >= 0 ? h.slice(i + 1) : '') };
  }
  function route(h) { if (location.hash === h) render(); else location.hash = h; }

  function shell(active, inner) {
    const areas = areaList();
    const nav = (href, key, icon, label, extra = '') =>
      `<a href="${href}" class="${active === key ? 'active' : ''}">${I(icon)}<span>${esc(label)}</span>${extra}</a>`;
    const badge = inboxCount ? `<span class="badge">${inboxCount}</span>` : '';
    const curHash = location.hash || '#/';
    return `
      <div class="shell">
        <aside class="sidebar" aria-label="Navigation">
          <a class="brand" href="#/"><span class="brand-mark">${LOGO(22)}</span>${esc(CFG.appName)}</a>
          <button type="button" class="quick" data-action="palette">${I('search', 16)}<span>Schnellsuche</span><span class="kbd">⌘K</span></button>
          <nav class="nav">
            ${nav('#/', 'home', 'grid', 'Übersicht')}
            ${nav('#/inbox', 'inbox', 'inbox', 'Posteingang', badge)}
            ${nav('#/docs', 'docs', 'docs', 'Alle Dokumente')}
            ${nav('#/search', 'search', 'search', 'Volltextsuche')}
            ${nav('#/browse', 'browse', 'compass', 'Durchstöbern')}
            ${nav('#/upload', 'upload', 'upload', 'Hochladen')}
          </nav>
          ${prefs.favs.length ? `
          <nav class="nav" aria-label="Merkliste">
            <span class="nav-label">Merkliste</span>
            ${prefs.favs.map((f) => `<a href="${esc(f.hash)}" class="${curHash === f.hash ? 'active' : ''}">${I('star', 16)}<span>${esc(f.label)}</span></a>`).join('')}
          </nav>` : ''}
          <nav class="nav" aria-label="Bereiche">
            <span class="nav-label">Bereiche <a href="#/settings">Anpassen</a></span>
            ${areas.map((a) => `<a href="#/docs?tags=${a.id}" class="${active === 'tag' + a.id ? 'active' : ''}"><span class="dot" data-color="${esc(a.color)}"></span><span>${esc(a.name)}</span><span class="count">${a.count}</span></a>`).join('')}
          </nav>
          <div class="sidebar-foot">
            ${userName() ? `<span>Angemeldet als ${esc(userName())}</span>` : ''}
            <a href="#/settings">Einstellungen</a>
            ${CFG.classicUrl ? `<a href="${esc(CFG.classicUrl)}" target="_blank" rel="noopener">Klassische Paperless-Oberfläche</a>` : ''}
            <button type="button" class="linkbtn" data-action="logout">Abmelden</button>
          </div>
        </aside>
        <main class="main" id="main">${inner}</main>
        <nav class="tabbar" aria-label="Tabs">
          <a href="#/" class="${active === 'home' ? 'active' : ''}">${I('grid', 24)}Übersicht</a>
          <a href="#/inbox" class="${active === 'inbox' ? 'active' : ''}">${I('inbox', 24)}Eingang${inboxCount ? `<span class="badge">${inboxCount}</span>` : ''}</a>
          <a href="#/docs" class="${['docs', 'browse'].includes(active) || String(active).startsWith('tag') ? 'active' : ''}">${I('docs', 24)}Dokumente</a>
          <a href="#/search" class="${active === 'search' ? 'active' : ''}">${I('search', 24)}Suche</a>
          <a href="#/upload" class="${active === 'upload' ? 'active' : ''}">${I('camera', 24)}Scannen</a>
        </nav>
      </div>`;
  }

  function mount(active, inner, keepScroll) {
    $app.innerHTML = shell(active, inner);
    applyColors($app);
    watchThumbs($app);
    if (!keepScroll) window.scrollTo(0, 0);
  }
  const main = () => document.getElementById('main');
  const loading = () => '<div class="center"><div class="spinner" aria-label="Lädt"></div></div>';

  async function refreshInboxCount() {
    try { const r = await api('/documents/?is_in_inbox=true&page_size=1&fields=id'); inboxCount = r.count || 0; } catch (e) { inboxCount = 0; }
  }

  function cleanupPage() {
    closeDialogs();
    pageKeys = null;
    document.querySelectorAll('.selbar').forEach((e) => e.remove());
    document.body.classList.remove('has-selbar');
    if (browserState && browserState.observer) browserState.observer.disconnect();
  }

  async function render() {
    const { path, params } = parseHash();
    cleanupPage();
    if (!auth.token) { renderLogin(); return; }
    if (path === '/login') { location.hash = '#/'; return; }
    try {
      await loadMeta();
      if (path === '/') return await renderHome();
      if (path === '/inbox') return await renderInbox();
      if (path === '/docs') return await renderBrowser(params, false);
      if (path === '/search') return await renderBrowser(params, true);
      if (path === '/browse') return renderBrowse(params);
      if (path === '/upload') return renderUpload();
      if (path === '/settings') return renderSettings();
      const m = path.match(/^\/doc\/(\d+)$/);
      if (m) return await renderDoc(parseInt(m[1], 10), params.get('edit') === '1');
      route('#/');
    } catch (e) {
      if (!auth.token) return;
      $app.innerHTML = shell('', `<div class="card empty"><strong>Das hat nicht geklappt.</strong><span class="error">${esc(e.message)}</span><button class="btn" data-action="reload">Erneut versuchen</button></div>`);
    }
  }

  /* ================================================================== */
  /* Login                                                               */
  /* ================================================================== */

  function renderLogin(error) {
    $app.innerHTML = `
      <div class="login">
        <form class="card" id="loginForm" autocomplete="on">
          <div class="brand"><span class="brand-mark">${LOGO(30)}</span>${esc(CFG.appName)}</div>
          <p class="muted login-sub">Mit deinem Paperless-Konto anmelden</p>
          <div class="field"><label for="u">Benutzername</label><input class="input" id="u" name="username" autocomplete="username" autocapitalize="none" required></div>
          <div class="field"><label for="p">Passwort</label><input class="input" id="p" name="password" type="password" autocomplete="current-password" required></div>
          <label class="checkline"><input type="checkbox" id="remember" checked> Angemeldet bleiben</label>
          ${error ? `<div class="error" role="alert">${esc(error)}</div>` : ''}
          <button class="btn big" type="submit">Anmelden</button>
        </form>
      </div>`;
    $app.querySelector('#loginForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const btn = ev.target.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const res = await fetch('/api/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ username: ev.target.username.value.trim(), password: ev.target.password.value })
        });
        if (!res.ok) throw new Error(res.status === 400 ? 'Benutzername oder Passwort falsch.' : 'Anmeldung fehlgeschlagen (' + res.status + ').');
        const data = await res.json();
        auth.set(data.token, document.getElementById('remember').checked);
        meta.loaded = false;
        await refreshInboxCount();
        location.hash = '#/';
        render();
      } catch (e) { renderLogin(e.message); }
    });
  }

  /* ================================================================== */
  /* Dokument-Bausteine                                                  */
  /* ================================================================== */

  const FIELDS = 'id,title,correspondent,document_type,created,created_date,added,tags,storage_path,page_count';
  const checkMark = () => `<span class="check" aria-hidden="true">${I('check', 14, 3)}</span>`;

  function tagChips(d, max = 3) {
    return realTags(d).slice(0, max).map((t) => { const c = tagColor(t); return `<span class="chip">${c ? `<span class="dot" data-color="${esc(c)}"></span>` : ''}${esc(tagName(t))}</span>`; }).join('');
  }

  function docItem(d, opts = {}) {
    const sub = [corrName(d.correspondent), typeName(d.document_type)].filter(Boolean).join(' · ');
    const hit = opts.hit && d.__search_hit__ && d.__search_hit__.highlights ? safeHighlight(d.__search_hit__.highlights) : '';
    return `
      <a class="item ${opts.sel ? 'sel' : ''}" href="#/doc/${d.id}" data-id="${d.id}">
        ${checkMark()}
        <span class="thumb" data-thumb="${d.id}"></span>
        <span class="meta">
          <span class="t">${esc(d.title)}</span>
          <span class="s">${esc(sub || '—')}<span class="hide-d"> · ${esc(fmtDate(docDate(d)))}</span></span>
          ${hit ? `<span class="hit">${hit}</span>` : ''}
        </span>
        <span class="tags">${tagChips(d, 2)}</span>
        <span class="date">${esc(fmtDate(docDate(d)))}</span>
      </a>`;
  }
  function docTile(d, opts = {}) {
    return `
      <a class="tile ${opts.sel ? 'sel' : ''}" href="#/doc/${d.id}" data-id="${d.id}">
        ${checkMark()}
        <span class="cover" data-thumb="${d.id}"></span>
        <span class="t">${esc(d.title)}</span>
        <span class="s">${esc([corrName(d.correspondent), fmtDate(docDate(d))].filter(Boolean).join(' · '))}</span>
      </a>`;
  }
  const simpleList = (docs) => (docs.length ? `<div class="card list">${docs.map((d) => docItem(d)).join('')}</div>` : '<div class="card empty">Keine Dokumente.</div>');

  /* ================================================================== */
  /* Übersicht                                                           */
  /* ================================================================== */

  async function renderHome() {
    mount('home', loading());
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const [recent, month] = await Promise.all([
      api(`/documents/?ordering=-added&page_size=6&fields=${FIELDS}`),
      api(`/documents/?added__date__gte=${monthStart}&page_size=1&fields=id`).catch(() => null),
      refreshInboxCount()
    ]);
    const h = now.getHours();
    const greet = h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
    const today = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const areas = areaList();
    const topCorr = sortedByCount(meta.corr).slice(0, 10);

    mount('home', `
      <div class="row-between">
        <div class="stack tight">
          <span class="eyebrow">${esc(today)}</span>
          <h1 class="title">${esc(greet)}${userName() ? ', ' + esc(userName()) : ''}</h1>
        </div>
        <div class="row hide-m">
          <a class="btn secondary" href="#/browse">${I('compass', 16)}Durchstöbern</a>
          <a class="btn" href="#/upload">${I('plus', 16, 2.2)}Hinzufügen</a>
        </div>
      </div>

      <form class="searchbar" role="search" id="homeSearch">
        ${I('search')}
        <label class="sr-only" for="hq">Suche</label>
        <input id="hq" type="search" placeholder="Volltextsuche in ${recent.count} Dokumenten" autocomplete="off" enterkeyhint="search">
        <span class="kbd">⌘K</span>
      </form>

      <div class="stats">
        <a class="card stat" href="#/docs"><span class="n">${recent.count}</span><span class="l">Dokumente</span></a>
        <a class="card stat" href="#/docs?sort=-added"><span class="n">${month ? month.count : '–'}</span><span class="l">Neu diesen Monat</span></a>
        <a class="card stat ${inboxCount ? 'hl' : ''}" href="#/inbox"><span class="n">${inboxCount}</span><span class="l">Im Posteingang</span></a>
      </div>

      ${inboxCount ? `
      <section class="card banner" aria-labelledby="ib">
        <div class="ico">${I('inbox', 26)}</div>
        <div class="txt">
          <h2 id="ib">${inboxCount === 1 ? '1 neues Dokument' : inboxCount + ' neue Dokumente'} im Posteingang</h2>
          <span class="muted">Vorschläge prüfen und mit einem Klick übernehmen.</span>
        </div>
        <a class="btn plain" href="#/inbox">Jetzt sortieren</a>
      </section>` : ''}

      ${prefs.favs.length ? `
      <section class="stack" aria-labelledby="fv">
        <h2 class="section" id="fv">Merkliste</h2>
        <div class="chips">${prefs.favs.map((f) => `<a class="chip" href="${esc(f.hash)}">${I('star', 14)}${esc(f.label)}</a>`).join('')}</div>
      </section>` : ''}

      ${areas.length ? `
      <section class="stack" aria-labelledby="ar">
        <div class="row-between"><h2 class="section" id="ar">Bereiche</h2><a href="#/browse">Alle Tags</a></div>
        <div class="areas">
          ${areas.map((a) => `
            <a class="card area" href="#/docs?tags=${a.id}">
              <span class="swatch" data-color="${esc(a.color)}"><span class="dot" data-color="${esc(a.color)}"></span></span>
              <span class="txt"><span class="name">${esc(a.name)}</span><span class="num">${a.count}<span class="hide-m"> Dokumente</span></span></span>
            </a>`).join('')}
        </div>
      </section>` : ''}

      ${prefs.recent.length ? `
      <section class="stack" aria-labelledby="rv">
        <h2 class="section" id="rv">Zuletzt angesehen</h2>
        <div class="chips scroll">${prefs.recent.slice(0, 8).map((r) => `<a class="chip" href="#/doc/${r.id}">${I('doc', 14)}${esc(r.title)}</a>`).join('')}</div>
      </section>` : ''}

      ${topCorr.length ? `
      <section class="stack" aria-labelledby="kc">
        <div class="row-between"><h2 class="section" id="kc">Korrespondenten</h2><a href="#/browse?k=corr">Alle</a></div>
        <div class="chips">${topCorr.map((c) => `<a class="chip" href="#/docs?corr=${c.id}">${esc(c.name)}<span class="muted">${c.document_count || 0}</span></a>`).join('')}</div>
      </section>` : ''}

      <section class="stack" aria-labelledby="rc">
        <div class="row-between"><h2 class="section" id="rc">Zuletzt hinzugefügt</h2><a href="#/docs?sort=-added">Alle anzeigen</a></div>
        ${simpleList(recent.results)}
      </section>`);
    document.getElementById('homeSearch').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('hq').value.trim();
      route('#/search' + (q ? '?q=' + encodeURIComponent(q) : ''));
    });
  }

  /* ================================================================== */
  /* Dokument-Browser (alle Listen + Suche)                              */
  /* ================================================================== */

  const SORTS = [
    ['relevance', 'Relevanz'], ['-created', 'Neueste zuerst'], ['created', 'Älteste zuerst'], ['-added', 'Zuletzt hinzugefügt'],
    ['title', 'Titel A–Z'], ['-title', 'Titel Z–A'], ['correspondent__name', 'Korrespondent A–Z'], ['-modified', 'Zuletzt geändert']
  ];
  const VIEWS = [['list', 'Liste', 'list'], ['tiles', 'Kacheln', 'tiles'], ['timeline', 'Zeitleiste', 'timeline'], ['table', 'Tabelle', 'table']];
  const isPhone = () => window.matchMedia('(max-width: 860px)').matches;
  let browserState = null;

  function stateFromParams(params, isSearch) {
    const tags = (params.get('tags') || params.get('tag') || '').split(',').map(num).filter(Boolean);
    return {
      search: isSearch,
      q: params.get('q') || '',
      sort: params.get('sort') || '',
      view: params.get('view') || prefs.view || 'list',
      tags,
      corr: num(params.get('corr')),
      type: num(params.get('type')),
      path: num(params.get('path')),
      year: num(params.get('year')),
      inbox: params.get('inbox') === '1'
    };
  }
  function stateToHash(s) {
    const p = new URLSearchParams();
    if (s.q) p.set('q', s.q);
    if (s.tags.length) p.set('tags', s.tags.join(','));
    ['corr', 'type', 'path', 'year'].forEach((k) => { if (s[k]) p.set(k, s[k]); });
    if (s.inbox) p.set('inbox', '1');
    if (s.sort) p.set('sort', s.sort);
    if (s.view && s.view !== prefs.view) p.set('view', s.view);
    const qs = p.toString();
    return (s.search ? '#/search' : '#/docs') + (qs ? '?' + qs : '');
  }
  function effSort(s) {
    const so = s.sort || (s.q ? 'relevance' : '-created');
    return (!s.q && so === 'relevance') ? '-created' : so;
  }
  const effView = (s) => (s.view === 'table' && isPhone() ? 'list' : s.view);
  const filterCount = (s) => s.tags.length + ['corr', 'type', 'path', 'year'].filter((k) => s[k]).length + (s.inbox ? 1 : 0);

  function describe(s) {
    const dims = [s.tags.length ? 'tags' : null, s.corr ? 'corr' : null, s.type ? 'type' : null, s.path ? 'path' : null].filter(Boolean);
    if (!s.search && dims.length === 1 && !s.year && !s.inbox) {
      if (dims[0] === 'tags' && s.tags.length === 1) return { kicker: 'Tag', title: tagName(s.tags[0]) || 'Tag', active: 'tag' + s.tags[0] };
      if (dims[0] === 'corr') return { kicker: 'Korrespondent', title: corrName(s.corr) || 'Korrespondent', active: 'docs' };
      if (dims[0] === 'type') return { kicker: 'Dokumenttyp', title: typeName(s.type) || 'Typ', active: 'docs' };
      if (dims[0] === 'path') return { kicker: 'Ablage', title: pathName(s.path) || 'Ablage', active: 'docs' };
    }
    if (s.search) return { kicker: 'Volltext', title: 'Suche', active: 'search' };
    if (!filterCount(s) && !s.q) return { kicker: 'Docs', title: 'Alle Dokumente', active: 'docs' };
    return { kicker: 'Gefiltert', title: 'Dokumente', active: 'docs' };
  }

  function apiQuery(s, page) {
    const p = [`page=${page}`, 'page_size=40', `fields=${FIELDS}`];
    const so = effSort(s);
    if (s.q) p.push((so === 'relevance' ? 'query=' : 'title_content=') + encodeURIComponent(s.q));
    if (so !== 'relevance') p.push('ordering=' + encodeURIComponent(so));
    if (s.tags.length) p.push('tags__id__all=' + s.tags.join(','));
    if (s.corr) p.push('correspondent__id__in=' + s.corr);
    if (s.type) p.push('document_type__id__in=' + s.type);
    if (s.path) p.push('storage_path__id__in=' + s.path);
    if (s.year) p.push('created__year=' + s.year);
    if (s.inbox) p.push('is_in_inbox=true');
    return '/documents/?' + p.join('&');
  }

  async function renderBrowser(params, isSearch) {
    const s = stateFromParams(params, isSearch);
    const st = browserState = { s, docs: [], page: 0, count: 0, hasMore: true, loading: false, selecting: false, sel: new Set(), seq: 0, observer: null };
    const info = describe(s);
    mount(info.active, `
      <div class="bhead">
        <div class="stack tight">
          <span class="eyebrow" id="bkick">${esc(info.kicker)}</span>
          <h1 class="title" id="btitle">${esc(info.title)}</h1>
          <span class="resinfo" id="binfo">&nbsp;</span>
        </div>
        <div class="actions">
          <button type="button" class="iconbtn" data-b="pin" aria-label="Auf die Merkliste">${I('star')}</button>
          <button type="button" class="iconbtn" data-b="select" aria-label="Mehrere auswählen">${I('select')}</button>
        </div>
      </div>
      <div class="toolbar">
        <form class="searchbar" role="search" id="bsearch">
          ${I('search')}
          <label class="sr-only" for="bq">${s.search ? 'Volltextsuche' : 'In dieser Liste suchen'}</label>
          <input id="bq" type="search" value="${esc(s.q)}" placeholder="${s.search ? 'Volltext: Titel, Inhalt, Korrespondent …' : 'In dieser Liste suchen …'}" autocomplete="off" enterkeyhint="search">
          <button type="button" class="clear" data-b="clear" aria-label="Suche leeren" ${s.q ? '' : 'hidden'}>×</button>
        </form>
        <label class="sr-only" for="bsort">Sortierung</label>
        <select class="select" id="bsort"></select>
        <div class="seg" role="group" aria-label="Ansicht">
          ${VIEWS.map(([v, label, icon]) => `<button type="button" data-view="${v}" aria-label="${label}" title="${label}" class="${v === 'table' ? 'hide-m' : ''}">${I(icon)}</button>`).join('')}
        </div>
        <button type="button" class="iconbtn" data-b="filter" aria-label="Filter">${I('filter')}<span class="badge" id="fbadge" hidden></span></button>
      </div>
      <div class="activechips" id="bchips"></div>
      <div id="bres">${loading()}</div>
      <div id="bsent" aria-hidden="true"></div>`);

    const m = main();
    const q = m.querySelector('#bq');
    const refreshControls = () => {
      const so = effSort(s);
      m.querySelector('#bsort').innerHTML = SORTS.filter(([v]) => v !== 'relevance' || s.q).map(([v, l]) => `<option value="${v}" ${v === so ? 'selected' : ''}>${l}</option>`).join('');
      const ev = effView(s);
      m.querySelectorAll('[data-view]').forEach((b) => { b.classList.toggle('on', b.getAttribute('data-view') === ev); b.setAttribute('aria-pressed', b.getAttribute('data-view') === ev); });
      const fc = filterCount(s);
      const fb = m.querySelector('#fbadge'); fb.hidden = !fc; fb.textContent = fc;
      m.querySelector('[data-b="filter"]').classList.toggle('on', !!fc);
      m.querySelector('[data-b="clear"]').hidden = !s.q;
      const isFav = prefs.favs.some((f) => f.hash === stateToHash(s));
      m.querySelector('[data-b="pin"]').classList.toggle('on', isFav);
      const d = describe(s);
      m.querySelector('#btitle').textContent = d.title;
      m.querySelector('#bkick').textContent = d.kicker;
      // aktive Filter als Chips
      const chips = [];
      s.tags.forEach((t) => chips.push(['tags', t, tagName(t), tagColor(t)]));
      if (s.corr) chips.push(['corr', s.corr, 'Von: ' + corrName(s.corr)]);
      if (s.type) chips.push(['type', s.type, 'Typ: ' + typeName(s.type)]);
      if (s.path) chips.push(['path', s.path, 'Ablage: ' + pathName(s.path)]);
      if (s.year) chips.push(['year', s.year, 'Jahr ' + s.year]);
      if (s.inbox) chips.push(['inbox', 1, 'Nur Posteingang']);
      const box = m.querySelector('#bchips');
      box.innerHTML = chips.map(([k, v, l, c]) => `<button type="button" class="chip" data-rm="${k}" data-v="${v}">${c ? `<span class="dot" data-color="${esc(c)}"></span>` : ''}${esc(l)}<span class="x" aria-hidden="true">×</span><span class="sr-only">entfernen</span></button>`).join('')
        + (chips.length > 1 ? '<button type="button" class="linkbtn" data-rm="all">Alle Filter entfernen</button>' : '');
      applyColors(box);
    };
    const changed = (reset = true) => {
      history.replaceState(null, '', stateToHash(s));
      refreshControls();
      if (reset) load(true); else drawResults();
    };

    async function load(reset) {
      if (reset) { st.docs = []; st.page = 0; st.hasMore = true; st.sel.clear(); updateSelbar(); }
      if (!st.hasMore || (st.loading && !reset)) return;
      const my = ++st.seq;
      st.loading = true;
      if (reset) m.querySelector('#bres').innerHTML = loading();
      try {
        const r = await api(apiQuery(s, st.page + 1));
        if (my !== st.seq) return;
        st.page += 1;
        st.count = r.count;
        st.docs.push(...r.results);
        st.hasMore = !!r.next;
        m.querySelector('#binfo').textContent = plural(r.count, 'Dokument', 'Dokumente');
        drawResults();
      } catch (e) {
        if (my === st.seq) m.querySelector('#bres').innerHTML = `<div class="card empty"><strong>Laden fehlgeschlagen</strong><span class="error">${esc(e.message)}</span></div>`;
      } finally {
        if (my === st.seq) st.loading = false;
      }
    }

    function groupKey(d, so, by) {
      const date = (so.includes('added') ? String(d.added || '').slice(0, 10) : docDate(d));
      return by === 'month' ? date.slice(0, 7) : date.slice(0, 4);
    }

    function drawResults() {
      const box = m.querySelector('#bres');
      box.classList.toggle('selecting', st.selecting);
      if (!st.docs.length) {
        box.innerHTML = `<div class="card empty"><strong>Nichts gefunden</strong><span>${s.q || filterCount(s) ? 'Versuch es mit weniger Filtern oder einem anderen Suchbegriff.' : 'Hier liegen noch keine Dokumente.'}</span>${filterCount(s) ? '<button type="button" class="btn plain" data-rm="all">Filter entfernen</button>' : ''}</div>`;
        return;
      }
      const so = effSort(s);
      const view = effView(s);
      const dateSort = /created|added/.test(so);
      const opt = (d) => ({ hit: true, sel: st.sel.has(d.id) });
      let html = '';
      if (view === 'table') {
        const th = (key, label) => `<th><button type="button" data-sortcol="${key}" class="${so.replace('-', '') === key ? 'on' : ''}">${label}${so === key ? ' ↑' : so === '-' + key ? ' ↓' : ''}</button></th>`;
        html = `<div class="card tablewrap"><table class="docs">
          <thead><tr>${st.selecting ? '<th class="ck"></th>' : ''}${th('title', 'Titel')}${th('correspondent__name', 'Korrespondent')}${th('document_type__name', 'Typ')}${th('created', 'Datum')}<th>Tags</th>${th('added', 'Hinzugefügt')}</tr></thead>
          <tbody>${st.docs.map((d) => `<tr data-id="${d.id}" class="${st.sel.has(d.id) ? 'sel' : ''}">
            ${st.selecting ? `<td class="ck">${checkMark()}</td>` : ''}
            <td class="ti"><a href="#/doc/${d.id}">${esc(d.title)}</a></td>
            <td class="nw">${esc(corrName(d.correspondent) || '—')}</td>
            <td class="nw">${esc(typeName(d.document_type) || '—')}</td>
            <td class="nw">${esc(fmtDate(docDate(d)))}</td>
            <td><span class="chips">${tagChips(d, 3)}</span></td>
            <td class="nw">${esc(fmtDate(String(d.added || '').slice(0, 10)))}</td>
          </tr>`).join('')}</tbody></table></div>`;
      } else if (view === 'timeline') {
        const groups = new Map();
        st.docs.forEach((d) => { const k = docDate(d).slice(0, 7) || '—'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(d); });
        html = `<div class="timeline">${[...groups.entries()].map(([k, ds]) => {
          const [y, mo] = k.split('-');
          return `<section class="tl-month"><div class="tl-label"><div class="m">${esc(mo ? monthName(y, mo) : 'Ohne Datum')}</div><div class="y">${esc(y || '')} · ${ds.length}</div></div>
            <div class="tl-items">${ds.map((d) => docItem(d, opt(d))).join('')}</div></section>`;
        }).join('')}</div>`;
      } else {
        const render1 = (ds) => (view === 'tiles' ? `<div class="tiles">${ds.map((d) => docTile(d, opt(d))).join('')}</div>` : `<div class="card list">${ds.map((d) => docItem(d, opt(d))).join('')}</div>`);
        if (dateSort) {
          const groups = new Map();
          st.docs.forEach((d) => { const k = groupKey(d, so, 'year') || '—'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(d); });
          html = [...groups.entries()].map(([k, ds]) => `<div class="group-h">${esc(k)}</div>${render1(ds)}`).join('');
        } else html = render1(st.docs);
      }
      if (st.hasMore) html += `<div class="more"><button type="button" class="btn secondary" data-b="more">Weitere laden</button></div>`;
      box.innerHTML = html;
      applyColors(box);
      watchThumbs(box);
    }

    // Auswahl
    function updateSelbar() {
      let bar = document.querySelector('.selbar');
      if (!st.selecting) { if (bar) bar.remove(); document.body.classList.remove('has-selbar'); return; }
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'selbar';
        bar.setAttribute('role', 'toolbar');
        bar.setAttribute('aria-label', 'Auswahl');
        bar.innerHTML = `
          <span class="n" id="seln"></span>
          <button type="button" data-s="all">Alle</button>
          <button type="button" data-s="tag">${I('tag', 16)}Tag +</button>
          <button type="button" data-s="untag">Tag −</button>
          <button type="button" data-s="type">Typ</button>
          <button type="button" data-s="corr">Von</button>
          <button type="button" data-s="zip">${I('download', 16)}Laden</button>
          <button type="button" data-s="del" class="del">${I('trash', 16)}</button>
          <button type="button" data-s="done">Fertig</button>`;
        document.body.appendChild(bar);
        document.body.classList.add('has-selbar');
        bar.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) selAction(b.getAttribute('data-s')); });
      }
      bar.querySelector('#seln').textContent = `${st.sel.size} ausgewählt`;
      bar.querySelectorAll('[data-s]').forEach((b) => { if (!['all', 'done'].includes(b.getAttribute('data-s'))) b.disabled = !st.sel.size; });
    }

    async function selAction(a) {
      const ids = [...st.sel];
      const after = async (msg) => { toast(msg); st.selecting = false; updateSelbar(); setTimeout(() => { meta.loaded = false; loadMeta().then(() => load(true)); }, 1200); };
      try {
        if (a === 'done') { st.selecting = false; st.sel.clear(); updateSelbar(); drawResults(); return; }
        if (a === 'all') { st.docs.forEach((d) => st.sel.add(d.id)); updateSelbar(); drawResults(); return; }
        if (a === 'tag') {
          const t = await pickSheet('Tag hinzufügen', sortedByCount(meta.tags, (x) => !x.is_inbox_tag).map((x) => ({ id: x.id, name: x.name, count: x.document_count, color: tagColor(x.id) })));
          if (t) { await bulkEdit(ids, 'modify_tags', { add_tags: [t], remove_tags: [] }); after(`Tag „${tagName(t)}“ zu ${ids.length} Dokumenten hinzugefügt`); }
        }
        if (a === 'untag') {
          const present = new Set();
          st.docs.filter((d) => st.sel.has(d.id)).forEach((d) => tagIds(d).forEach((t) => present.add(t)));
          const t = await pickSheet('Tag entfernen', [...present].map((id) => ({ id, name: tagName(id) || '#' + id, color: tagColor(id) })).sort((x, y) => x.name.localeCompare(y.name, 'de')));
          if (t) { await bulkEdit(ids, 'modify_tags', { add_tags: [], remove_tags: [t] }); after(`Tag „${tagName(t)}“ entfernt`); }
        }
        if (a === 'type') {
          const t = await pickSheet('Dokumenttyp setzen', sortedByCount(meta.types).map((x) => ({ id: x.id, name: x.name, count: x.document_count })), { allowNone: 'Ohne Typ' });
          if (t !== null) { await bulkEdit(ids, 'set_document_type', { document_type: t || null }); after('Dokumenttyp gesetzt'); }
        }
        if (a === 'corr') {
          const t = await pickSheet('Korrespondent setzen', sortedByCount(meta.corr).map((x) => ({ id: x.id, name: x.name, count: x.document_count })), { allowNone: 'Ohne Korrespondent' });
          if (t !== null) { await bulkEdit(ids, 'set_correspondent', { correspondent: t || null }); after('Korrespondent gesetzt'); }
        }
        if (a === 'zip') {
          toast('ZIP wird erstellt …');
          const blob = await api('/documents/bulk_download/', { method: 'POST', json: { documents: ids, content: 'archive', follow_formatting: true }, blob: true });
          saveBlob(blob, `docs-${ids.length}-dokumente.zip`);
        }
        if (a === 'del') {
          if (await confirmSheet('Dokumente löschen?', `${plural(ids.length, 'Dokument wird', 'Dokumente werden')} in den Papierkorb von Paperless verschoben.`, 'Löschen', true)) {
            await bulkEdit(ids, 'delete'); after(`${plural(ids.length, 'Dokument', 'Dokumente')} gelöscht`);
          }
        }
      } catch (e) { toast('Aktion fehlgeschlagen: ' + e.message.slice(0, 80)); }
    }

    // Ereignisse
    m.querySelector('#bsearch').addEventListener('submit', (e) => { e.preventDefault(); q.blur(); });
    q.addEventListener('input', debounce(() => { s.q = q.value.trim(); if (!s.q && s.sort === 'relevance') s.sort = ''; changed(); }, 300));
    m.querySelector('#bsort').addEventListener('change', (e) => { s.sort = e.target.value; changed(); });
    m.addEventListener('click', async (e) => {
      const v = e.target.closest('[data-view]');
      if (v) {
        const before = effSort(s);
        s.view = v.getAttribute('data-view');
        if (s.view === 'timeline' && !/created/.test(before)) s.sort = '-created';
        prefs.view = s.view; savePrefs();
        changed(effSort(s) !== before);
        return;
      }
      const rm = e.target.closest('[data-rm]');
      if (rm) {
        const k = rm.getAttribute('data-rm');
        if (k === 'all') { s.tags = []; s.corr = s.type = s.path = s.year = null; s.inbox = false; }
        else if (k === 'tags') s.tags = s.tags.filter((t) => t !== +rm.getAttribute('data-v'));
        else if (k === 'inbox') s.inbox = false;
        else s[k] = null;
        changed(); return;
      }
      const sc = e.target.closest('[data-sortcol]');
      if (sc) { const k = sc.getAttribute('data-sortcol'); const cur = effSort(s); s.sort = cur === k ? '-' + k : (cur === '-' + k ? k : (k === 'created' || k === 'added' ? '-' + k : k)); changed(); return; }
      const b = e.target.closest('[data-b]');
      if (b) {
        const a = b.getAttribute('data-b');
        if (a === 'more') load(false);
        if (a === 'clear') { q.value = ''; s.q = ''; if (s.sort === 'relevance') s.sort = ''; changed(); q.focus(); }
        if (a === 'filter') openFilters();
        if (a === 'select') { st.selecting = !st.selecting; if (!st.selecting) st.sel.clear(); b.classList.toggle('on', st.selecting); updateSelbar(); drawResults(); }
        if (a === 'pin') {
          const h = stateToHash(s);
          const i = prefs.favs.findIndex((f) => f.hash === h);
          if (i >= 0) { prefs.favs.splice(i, 1); savePrefs(); toast('Von der Merkliste entfernt'); render(); return; }
          const def = describe(s).title + (s.q ? ` „${s.q}“` : '');
          openSheet({
            title: 'Auf die Merkliste',
            body: `<div class="field"><label for="fvn">Name</label><input class="input" id="fvn" maxlength="60" value="${esc(def)}"></div><span class="muted">Erscheint auf der Übersicht und in der Seitenleiste – mit allen Filtern, Sortierung und Ansicht.</span>`,
            footer: '<button type="button" class="btn plain" data-close>Abbrechen</button><button type="button" class="btn" data-ok>Merken</button>',
            onMount: (d, close) => {
              const inp = d.querySelector('#fvn'); inp.select();
              const ok = () => { const label = inp.value.trim(); if (!label) return; prefs.favs.push({ label, hash: h }); savePrefs(); close(); toast('Auf der Merkliste'); render(); };
              d.querySelector('[data-ok]').addEventListener('click', ok);
              inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ok(); } });
            }
          });
        }
        return;
      }
      const it = e.target.closest('#bres [data-id]');
      if (it) {
        const id = +it.getAttribute('data-id');
        if (st.selecting) {
          e.preventDefault();
          if (st.sel.has(id)) st.sel.delete(id); else st.sel.add(id);
          it.classList.toggle('sel', st.sel.has(id));
          updateSelbar();
          return;
        }
        sessionStorage.setItem('archiv.nav', JSON.stringify({ ids: st.docs.map((d) => d.id), hash: location.hash, label: describe(s).title }));
        if (it.tagName === 'TR' && !e.target.closest('a')) route('#/doc/' + id);
      }
    });

    function openFilters() {
      const years = [];
      for (let y = new Date().getFullYear(); y >= meta.minYear; y -= 1) years.push(y);
      openSheet({
        title: 'Filter',
        body: `
          <div class="field"><span class="flabel">Tags (alle müssen passen)</span>${tagPicker(s.tags, [], 'ff')}</div>
          <div class="formgrid">
            <div class="field"><label for="fcorr">Korrespondent</label><select class="input" id="fcorr">${optionList(meta.corr, s.corr, 'Alle')}</select></div>
            <div class="field"><label for="ftype">Dokumenttyp</label><select class="input" id="ftype">${optionList(meta.types, s.type, 'Alle')}</select></div>
            <div class="field"><label for="fpath">Ablage</label><select class="input" id="fpath">${optionList(meta.paths, s.path, 'Alle')}</select></div>
            <div class="field"><label for="fyear">Jahr</label><select class="input" id="fyear"><option value="">Alle</option>${years.map((y) => `<option ${s.year === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
          </div>
          <label class="switch"><span>Nur Dokumente im Posteingang</span><input type="checkbox" id="finbox" ${s.inbox ? 'checked' : ''}></label>`,
        footer: '<button type="button" class="btn plain" data-reset>Zurücksetzen</button><button type="button" class="btn" data-apply>Anwenden</button>',
        onMount: (d, close) => {
          bindTagPicker(d);
          d.querySelector('[data-reset]').addEventListener('click', () => {
            d.querySelectorAll('[data-tag].on').forEach((b) => b.classList.remove('on'));
            ['#fcorr', '#ftype', '#fpath', '#fyear'].forEach((sel) => { d.querySelector(sel).value = ''; });
            d.querySelector('#finbox').checked = false;
          });
          d.querySelector('[data-apply]').addEventListener('click', () => {
            s.tags = pickedTags(d);
            s.corr = num(d.querySelector('#fcorr').value);
            s.type = num(d.querySelector('#ftype').value);
            s.path = num(d.querySelector('#fpath').value);
            s.year = num(d.querySelector('#fyear').value);
            s.inbox = d.querySelector('#finbox').checked;
            close(); changed();
          });
        }
      });
    }

    // Endloses Scrollen
    if ('IntersectionObserver' in window) {
      st.observer = new IntersectionObserver((entries) => {
        if (entries.some((x) => x.isIntersecting) && st.hasMore && !st.loading && st.docs.length) load(false);
      }, { rootMargin: '600px' });
      st.observer.observe(m.querySelector('#bsent'));
    }
    pageKeys = (e) => {
      if (e.key === 'f') { e.preventDefault(); openFilters(); return true; }
      if (e.key === 'Escape' && st.selecting) { selAction('done'); return true; }
      return false;
    };

    refreshControls();
    if (s.search && !s.q && !filterCount(s)) {
      m.querySelector('#bres').innerHTML = `<div class="card empty"><strong>Volltextsuche</strong><span>Durchsucht Titel und den erkannten Text aller Dokumente. Ergebnisse erscheinen beim Tippen.</span></div>`;
      m.querySelector('#binfo').textContent = '';
      st.hasMore = false;
      if (!('ontouchstart' in window)) q.focus();
    } else {
      load(true);
    }
  }

  /* ================================================================== */
  /* Dokument                                                            */
  /* ================================================================== */

  let previewUrl = null;

  async function showPreview(doc, box) {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    try {
      if (isPhone()) {
        previewUrl = URL.createObjectURL(await apiBlob(`/documents/${doc.id}/thumb/`));
        box.innerHTML = `<img alt="Vorschau von ${esc(doc.title)}" src="${previewUrl}">
          <button type="button" class="btn secondary" data-action="openpdf">${I('open')}Ganzes Dokument öffnen</button>`;
      } else {
        previewUrl = URL.createObjectURL(await apiBlob(`/documents/${doc.id}/preview/`));
        box.innerHTML = `<iframe title="Vorschau von ${esc(doc.title)}" src="${previewUrl}"></iframe>`;
      }
    } catch (e) { box.innerHTML = '<div class="placeholder">Keine Vorschau verfügbar.</div>'; }
  }

  async function openOriginal(doc, download) {
    const w = download ? null : window.open('', '_blank');
    try {
      const blob = await apiBlob(`/documents/${doc.id}/${download ? 'download' : 'preview'}/`);
      if (download) {
        let name = (doc.original_file_name || doc.title || 'dokument').replace(/[\\/:*?"<>|]/g, '_');
        if (!/\.[a-z0-9]{2,5}$/i.test(name)) name += '.pdf';
        saveBlob(blob, name);
      } else if (w) {
        const url = URL.createObjectURL(blob);
        w.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 120000);
      }
    } catch (e) { if (w) w.close(); toast('Öffnen fehlgeschlagen'); }
  }

  function navContext(id) {
    try {
      const n = JSON.parse(sessionStorage.getItem('archiv.nav') || 'null');
      if (!n || !Array.isArray(n.ids)) return null;
      const i = n.ids.indexOf(id);
      return i >= 0 ? { ...n, i } : null;
    } catch (e) { return null; }
  }

  async function renderDoc(id, editMode) {
    mount('docs', loading());
    const [doc, notes, similar] = await Promise.all([
      api(`/documents/${id}/`),
      api(`/documents/${id}/notes/`).catch(() => []),
      editMode ? Promise.resolve(null) : api(`/documents/?more_like_id=${id}&page_size=6&fields=id,title,correspondent,created,created_date`).catch(() => null)
    ]);
    rememberDoc(doc);
    const tids = realTags(doc);
    const inInbox = tagIds(doc).some((t) => meta.inboxTags.includes(t));
    const created = docDate(doc);
    const nav = navContext(id);
    const prevId = nav && nav.i > 0 ? nav.ids[nav.i - 1] : null;
    const nextId = nav && nav.i < nav.ids.length - 1 ? nav.ids[nav.i + 1] : null;
    const sims = similar && similar.results ? similar.results.filter((s) => s.id !== id).slice(0, 5) : [];

    const details = editMode ? `
      <form class="card box" id="editForm">
        <span class="label">Bearbeiten</span>
        <div class="field"><label for="ft">Titel</label><input class="input" id="ft" value="${esc(doc.title)}" required></div>
        <div class="formgrid">
          <div class="field"><label for="fc">Korrespondent</label><select class="input" id="fc">${optionList(meta.corr, doc.correspondent, '—')}</select></div>
          <div class="field"><label for="fy">Dokumenttyp</label><select class="input" id="fy">${optionList(meta.types, doc.document_type, '—')}</select></div>
          <div class="field"><label for="fd">Datum</label><input class="input" id="fd" type="date" value="${esc(created)}"></div>
          <div class="field"><label for="fp">Ablage</label><select class="input" id="fp">${optionList(meta.paths, doc.storage_path, '—')}</select></div>
          <div class="field full"><label for="fa">Archivnummer (ASN)</label><input class="input" id="fa" type="number" min="0" value="${esc(doc.archive_serial_number == null ? '' : doc.archive_serial_number)}"></div>
        </div>
        <div class="field"><span class="flabel">Tags</span>${tagPicker(tids, [], 'ed')}</div>
        <div class="btnrow">
          <a class="btn plain" href="#/doc/${doc.id}">Abbrechen</a>
          <button class="btn" type="submit">Sichern</button>
        </div>
      </form>` : `
      <div class="card head">
        <span class="kicker">${esc(typeName(doc.document_type) || 'Dokument')}</span>
        <h1>${esc(doc.title)}</h1>
        <span class="muted">${esc([corrName(doc.correspondent), fmtDate(created)].filter(Boolean).join(' · '))}</span>
      </div>
      <div class="card">
        <div class="kv"><span class="k">Korrespondent</span><span class="v">${doc.correspondent ? `<a href="#/docs?corr=${idOf(doc.correspondent)}">${esc(corrName(doc.correspondent))}</a>` : '—'}</span></div>
        <div class="kv"><span class="k">Dokumenttyp</span><span class="v">${doc.document_type ? `<a href="#/docs?type=${idOf(doc.document_type)}">${esc(typeName(doc.document_type))}</a>` : '—'}</span></div>
        <div class="kv"><span class="k">Datum</span><span class="v">${created ? `<a href="#/docs?year=${created.slice(0, 4)}">${esc(fmtDate(created))}</a>` : '—'}</span></div>
        <div class="kv"><span class="k">Ablage</span><span class="v">${doc.storage_path ? `<a href="#/docs?path=${idOf(doc.storage_path)}">${esc(pathName(doc.storage_path))}</a>` : '—'}</span></div>
        ${doc.archive_serial_number != null ? `<div class="kv"><span class="k">ASN</span><span class="v">${esc(doc.archive_serial_number)}</span></div>` : ''}
        ${doc.page_count ? `<div class="kv"><span class="k">Seiten</span><span class="v">${doc.page_count}</span></div>` : ''}
        <div class="kv"><span class="k">Hinzugefügt</span><span class="v">${esc(fmtDate(String(doc.added || '').slice(0, 10)))}</span></div>
        <div class="box">
          <span class="label"><span class="muted">Tags</span><button type="button" class="linkbtn" data-action="edittags">Ändern</button></span>
          <div class="chips">
            ${tids.length ? tids.map((t) => { const c = tagColor(t); return `<a class="chip" href="#/docs?tags=${t}">${c ? `<span class="dot" data-color="${esc(c)}"></span>` : ''}${esc(tagName(t))}</a>`; }).join('') : '<span class="muted">Keine</span>'}
          </div>
        </div>
      </div>
      ${inInbox ? `<div class="card box"><span class="label">Im Posteingang</span><span class="muted">Dieses Dokument ist noch nicht bestätigt.</span><button class="btn" data-action="done">Als erledigt markieren</button></div>` : ''}
      <div class="card box">
        <span class="label">Notizen</span>
        ${(notes || []).map((n) => `<div class="note">${esc(n.note)}<small>${esc(fmtDate(n.created))}${n.user && n.user.username ? ' · ' + esc(n.user.username) : ''}</small></div>`).join('')}
        <form id="noteForm" class="stack gap8">
          <label class="sr-only" for="nt">Neue Notiz</label>
          <textarea class="input" id="nt" rows="2" placeholder="Notiz hinzufügen"></textarea>
          <button class="btn secondary" type="submit">Notiz speichern</button>
        </form>
      </div>
      ${sims.length ? `<div class="card box similar"><span class="label">Ähnliche Dokumente</span>${sims.map((s) => `<a href="#/doc/${s.id}"><span>${esc(s.title)}</span><span>${esc(fmtDate(docDate(s)))}</span></a>`).join('')}</div>` : ''}`;

    mount('docs', `
      <div class="docbar">
        <button type="button" class="linkbtn" data-action="back">${I('back')}${esc(nav && nav.label ? nav.label : 'Zurück')}</button>
        <span class="spacer"></span>
        ${nav ? `<span class="pager">
          <a class="iconbtn" ${prevId ? `href="#/doc/${prevId}"` : 'aria-disabled="true"'} aria-label="Vorheriges Dokument">${I('back')}</a>
          <span>${nav.i + 1} / ${nav.ids.length}</span>
          <a class="iconbtn" ${nextId ? `href="#/doc/${nextId}"` : 'aria-disabled="true"'} aria-label="Nächstes Dokument">${I('next')}</a>
        </span>` : ''}
        <div class="actions">
          <button type="button" class="iconbtn" aria-label="Original öffnen" title="Original öffnen" data-action="open">${I('open')}</button>
          <button type="button" class="iconbtn" aria-label="Herunterladen" title="Herunterladen" data-action="download">${I('download')}</button>
          <button type="button" class="iconbtn hide-m" aria-label="Link kopieren" title="Link kopieren" data-action="copy">${I('link')}</button>
          <button type="button" class="iconbtn" aria-label="Löschen" title="Löschen" data-action="delete">${I('trash')}</button>
          ${editMode ? '' : `<a class="btn" href="#/doc/${doc.id}?edit=1">Bearbeiten</a>`}
        </div>
      </div>
      <div class="docgrid">
        <section class="preview" aria-label="Vorschau" id="pv">${loading()}</section>
        <aside class="details" aria-label="Details">${details}</aside>
      </div>`);
    showPreview(doc, document.getElementById('pv'));

    const goBack = () => { if (nav && nav.hash) route(nav.hash); else if (history.length > 1) history.back(); else route('#/'); };
    const m = main();
    m.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      const act = a.getAttribute('data-action');
      if (act === 'open' || act === 'openpdf') openOriginal(doc, false);
      if (act === 'download') openOriginal(doc, true);
      if (act === 'back') goBack();
      if (act === 'done') { await markDone(doc); renderDoc(doc.id, false); }
      if (act === 'copy') {
        const link = location.origin + '/#/doc/' + doc.id;
        try { await navigator.clipboard.writeText(link); toast('Link kopiert'); } catch (err) { prompt('Link:', link); }
      }
      if (act === 'delete') {
        if (await confirmSheet('Dokument löschen?', `„${doc.title}“ wird in den Papierkorb von Paperless verschoben.`, 'Löschen', true)) {
          try { await api(`/documents/${doc.id}/`, { method: 'DELETE' }); toast('In den Papierkorb verschoben'); prefs.recent = prefs.recent.filter((r) => r.id !== doc.id); savePrefs(); goBack(); }
          catch (err) { toast('Löschen fehlgeschlagen'); }
        }
      }
      if (act === 'edittags') {
        openSheet({
          title: 'Tags', body: tagPicker(tids, [], 'tg'),
          footer: '<button type="button" class="btn plain" data-close>Abbrechen</button><button type="button" class="btn" data-save>Sichern</button>',
          onMount: (d, close) => {
            bindTagPicker(d);
            d.querySelector('[data-save]').addEventListener('click', async () => {
              const keepInbox = tagIds(doc).filter((t) => meta.inboxTags.includes(t));
              try { await api(`/documents/${doc.id}/`, { method: 'PATCH', json: { tags: [...pickedTags(d), ...keepInbox] } }); close(); toast('Tags gespeichert'); renderDoc(doc.id, false); }
              catch (err) { toast('Speichern fehlgeschlagen'); }
            });
          }
        });
      }
    });

    pageKeys = (e) => {
      if (e.key === 'ArrowLeft' && prevId) { route('#/doc/' + prevId); return true; }
      if (e.key === 'ArrowRight' && nextId) { route('#/doc/' + nextId); return true; }
      if (e.key === 'e' && !editMode) { route(`#/doc/${doc.id}?edit=1`); return true; }
      if (e.key === 'Escape') { if (editMode) route('#/doc/' + doc.id); else goBack(); return true; }
      return false;
    };

    const nf = document.getElementById('noteForm');
    if (nf) nf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const txt = document.getElementById('nt').value.trim();
      if (!txt) return;
      try { await api(`/documents/${doc.id}/notes/`, { method: 'POST', json: { note: txt } }); toast('Notiz gespeichert'); renderDoc(doc.id, false); }
      catch (err) { toast('Notiz konnte nicht gespeichert werden'); }
    });

    const ef = document.getElementById('editForm');
    if (ef) {
      bindTagPicker(ef);
      ef.addEventListener('submit', async (e) => {
        e.preventDefault();
        const keepInbox = tagIds(doc).filter((t) => meta.inboxTags.includes(t));
        const asn = document.getElementById('fa').value;
        const body = {
          title: document.getElementById('ft').value.trim(),
          correspondent: num(document.getElementById('fc').value),
          document_type: num(document.getElementById('fy').value),
          storage_path: num(document.getElementById('fp').value),
          archive_serial_number: asn === '' ? null : parseInt(asn, 10),
          tags: [...pickedTags(ef), ...keepInbox]
        };
        const d = document.getElementById('fd').value;
        if (d) body[dateField()] = d;
        try { await api(`/documents/${doc.id}/`, { method: 'PATCH', json: body }); toast('Gespeichert'); route(`#/doc/${doc.id}`); }
        catch (err) { toast('Speichern fehlgeschlagen: ' + err.message.slice(0, 80)); }
      });
    }
  }

  async function markDone(doc) {
    await api(`/documents/${doc.id}/`, { method: 'PATCH', json: { tags: realTags(doc) } });
    await refreshInboxCount();
    toast('Erledigt');
  }

  /* ================================================================== */
  /* Posteingang                                                         */
  /* ================================================================== */

  let inboxQueue = [];
  let inboxPos = 0;
  let inboxTotal = 0;

  async function renderInbox() {
    mount('inbox', loading());
    const r = await api(`/documents/?is_in_inbox=true&ordering=added&page_size=100&fields=${FIELDS},original_file_name`);
    inboxQueue = r.results;
    inboxTotal = r.count;
    inboxPos = 0;
    inboxCount = r.count;
    showInboxItem();
  }

  async function showInboxItem() {
    pageKeys = null;
    if (inboxPos >= inboxQueue.length) {
      await refreshInboxCount();
      mount('inbox', `
        <h1 class="title">Posteingang</h1>
        <div class="card empty">
          <strong>${inboxCount ? 'Für jetzt erledigt' : 'Alles erledigt'}</strong>
          <span>${inboxCount ? `Noch ${plural(inboxCount, 'Dokument', 'Dokumente')} übersprungen.` : 'Keine neuen Dokumente.'}</span>
          <div class="row">${inboxCount ? '<button class="btn" data-action="restart">Übersprungene ansehen</button><a class="btn plain" href="#/docs?inbox=1&view=list">Als Liste</a>' : '<a class="btn" href="#/">Zur Übersicht</a>'}</div>
        </div>`);
      const b = main().querySelector('[data-action="restart"]');
      if (b) b.addEventListener('click', renderInbox);
      return;
    }
    const doc = inboxQueue[inboxPos];
    let sug = {};
    try { sug = await api(`/documents/${doc.id}/suggestions/`); } catch (e) { sug = {}; }
    const first = (arr) => (Array.isArray(arr) && arr.length ? arr[0] : null);
    const corr = idOf(doc.correspondent) || first(sug.correspondents);
    const type = idOf(doc.document_type) || first(sug.document_types);
    const path = idOf(doc.storage_path) || first(sug.storage_paths);
    const curTags = realTags(doc);
    const sugTags = (sug.tags || []).filter((t) => !meta.inboxTags.includes(t) && !curTags.includes(t));
    const created = docDate(doc);
    const sugDates = (sug.dates || []).filter((d) => d && d !== created).slice(0, 3);
    const pct = inboxTotal ? Math.round((inboxPos / inboxTotal) * 100) : 0;

    mount('inbox', `
      <div class="row-between">
        <div class="stack tight"><span class="eyebrow">${esc(doc.original_file_name || '')}</span><h1 class="title">Posteingang</h1></div>
        <div class="row"><span class="muted">${inboxPos + 1} von ${inboxQueue.length}</span><a class="btn plain small hide-m" href="#/docs?inbox=1&view=list">Als Liste</a></div>
      </div>
      <div class="progress"><div id="pg"></div></div>
      <div class="inbox">
        <section class="preview" aria-label="Vorschau" id="ipv">${loading()}</section>
        <form class="card form" id="inboxForm">
          <span class="suggest">${I('spark', 14)}Vorschlag – bitte prüfen</span>
          <div class="field"><label for="it">Titel</label><input class="input" id="it" value="${esc(doc.title)}" required></div>
          <div class="formgrid">
            <div class="field"><label for="ic">Von</label><select class="input" id="ic">${optionList(meta.corr, corr, '—')}</select></div>
            <div class="field"><label for="iy">Typ</label><select class="input" id="iy">${optionList(meta.types, type, '—')}</select></div>
            <div class="field"><label for="id">Datum</label><input class="input" id="id" type="date" value="${esc(created)}"></div>
            <div class="field"><label for="ip">Ablage</label><select class="input" id="ip">${optionList(meta.paths, path, '—')}</select></div>
          </div>
          ${sugDates.length ? `<div class="chips" aria-label="Datumsvorschläge">${sugDates.map((d) => `<button type="button" class="chip toggle" data-date="${esc(d)}">${I('spark', 14)}${esc(fmtDate(d))}</button>`).join('')}</div>` : ''}
          <div class="field"><span class="flabel">Tags${sugTags.length ? ' – ✦ = vorgeschlagen' : ''}</span>${tagPicker(curTags, sugTags, 'ib')}</div>
          <button class="btn big" type="submit">Übernehmen <span class="kbd hide-m">↵</span></button>
          <div class="btnrow">
            <a class="btn secondary" href="#/doc/${doc.id}?edit=1">Öffnen</a>
            <button class="btn secondary" type="button" data-action="skip">Später <span class="kbd hide-m">S</span></button>
          </div>
        </form>
      </div>`);
    const pg = document.getElementById('pg');
    if (pg) pg.style.width = pct + '%';
    showPreview(doc, document.getElementById('ipv'));
    const f = document.getElementById('inboxForm');
    bindTagPicker(f);
    f.querySelectorAll('[data-date]').forEach((b) => b.addEventListener('click', () => { document.getElementById('id').value = b.getAttribute('data-date'); }));
    const skip = () => { inboxPos += 1; showInboxItem(); };
    f.querySelector('[data-action="skip"]').addEventListener('click', skip);
    main().addEventListener('click', (e) => { if (e.target.closest('[data-action="openpdf"]')) openOriginal(doc, false); });
    pageKeys = (e) => { if (e.key === 's') { skip(); return true; } return false; };
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true;
      const body = {
        title: document.getElementById('it').value.trim(),
        correspondent: num(document.getElementById('ic').value),
        document_type: num(document.getElementById('iy').value),
        storage_path: num(document.getElementById('ip').value),
        tags: pickedTags(f)
      };
      const d = document.getElementById('id').value;
      if (d) body[dateField()] = d;
      try {
        await api(`/documents/${doc.id}/`, { method: 'PATCH', json: body });
        toast('Übernommen');
        inboxQueue.splice(inboxPos, 1);
        inboxCount = Math.max(0, inboxCount - 1);
        showInboxItem();
      } catch (err) { btn.disabled = false; toast('Speichern fehlgeschlagen'); }
    });
  }

  /* ================================================================== */
  /* Durchstöbern                                                        */
  /* ================================================================== */

  function renderBrowse(params) {
    const kinds = [['tags', 'Tags', meta.tags, 'tags'], ['corr', 'Korrespondenten', meta.corr, 'corr'], ['types', 'Typen', meta.types, 'type'], ['paths', 'Ablagen', meta.paths, 'path']];
    let kind = params.get('k') || 'tags';
    if (!kinds.some((k) => k[0] === kind)) kind = 'tags';
    let sortBy = 'count';
    mount('browse', `
      <div class="stack tight"><span class="eyebrow">Docs</span><h1 class="title">Durchstöbern</h1></div>
      <div class="toolbar">
        <div class="seg" role="group" aria-label="Art">${kinds.map(([k, l]) => `<button type="button" data-k="${k}">${l}</button>`).join('')}</div>
        <form class="searchbar" role="search" id="brs">${I('search')}<label class="sr-only" for="brq">Filtern</label><input id="brq" type="search" placeholder="Filtern …" autocomplete="off"></form>
        <label class="sr-only" for="brsort">Sortierung</label>
        <select class="select" id="brsort"><option value="count">Nach Anzahl</option><option value="name">Nach Name</option></select>
      </div>
      <div id="brres"></div>`);
    const m = main();
    const draw = () => {
      const [, , map, param] = kinds.find((k) => k[0] === kind);
      m.querySelectorAll('[data-k]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-k') === kind));
      const q = m.querySelector('#brq').value.trim().toLowerCase();
      let items = [...map.values()].filter((x) => !x.is_inbox_tag && (!q || x.name.toLowerCase().includes(q)));
      items.sort(sortBy === 'name' ? (a, b) => a.name.localeCompare(b.name, 'de') : (a, b) => (b.document_count || 0) - (a.document_count || 0) || a.name.localeCompare(b.name, 'de'));
      m.querySelector('#brres').innerHTML = items.length ? `<div class="browse-grid">${items.map((x) => {
        const c = kind === 'tags' ? tagColor(x.id) : null;
        return `<a class="card bcard" href="#/docs?${param}=${x.id}"><span class="ini">${c ? `<span class="dot" data-color="${esc(c)}"></span>` : esc(initial(x.name))}</span><span class="txt"><span class="name">${esc(x.name)}</span><span class="num">${plural(x.document_count || 0, 'Dokument', 'Dokumente')}</span></span>${I('next', 14)}</a>`;
      }).join('')}</div>` : '<div class="card empty">Nichts gefunden.</div>';
      applyColors(m);
      history.replaceState(null, '', '#/browse?k=' + kind);
    };
    m.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { kind = b.getAttribute('data-k'); draw(); }));
    m.querySelector('#brq').addEventListener('input', draw);
    m.querySelector('#brs').addEventListener('submit', (e) => e.preventDefault());
    m.querySelector('#brsort').addEventListener('change', (e) => { sortBy = e.target.value; draw(); });
    draw();
  }

  /* ================================================================== */
  /* Einstellungen                                                       */
  /* ================================================================== */

  function renderSettings() {
    const tags = sortedByCount(meta.tags, (t) => !t.is_inbox_tag);
    const defs = areaDefs();
    const colorOf = (t) => { const a = defs.find((x) => String(x.tag).toLowerCase() === t.name.toLowerCase()); return a ? a.color : null; };
    mount('settings', `
      <div class="stack tight"><span class="eyebrow">${esc(CFG.appName)}</span><h1 class="title">Einstellungen</h1></div>
      <div class="settings">
        <section class="card">
          <h2>Darstellung</h2>
          <div class="seg" role="group" aria-label="Design">
            <button type="button" data-theme="light">Hell</button><button type="button" data-theme="dark">Dunkel</button><button type="button" data-theme="auto">Automatisch</button>
          </div>
          <span class="flabel muted">Standardansicht für Listen</span>
          <div class="seg" role="group" aria-label="Standardansicht">${VIEWS.map(([v, l, ic]) => `<button type="button" data-defview="${v}">${I(ic, 16)}<span class="hide-m">${l}</span></button>`).join('')}</div>
        </section>
        <section class="card">
          <div class="row-between"><h2>Bereiche auf der Übersicht</h2><button type="button" class="linkbtn" data-reset-areas>Standard wiederherstellen</button></div>
          <span class="muted">Einschalten, was als Kachel auf der Übersicht und in der Seitenleiste erscheint. Farbpunkt antippen, um die Farbe zu wechseln.</span>
          <div>${tags.map((t) => { const c = colorOf(t); return `
            <div class="arearow">
              <button type="button" class="colorbtn" data-cycle="${t.id}" data-color="${esc(c || '#AEAEB2')}" aria-label="Farbe für ${esc(t.name)} wechseln"></button>
              <span class="nm">${esc(t.name)}<small>${t.document_count || 0}</small></span>
              <label class="switch"><span class="sr-only">${esc(t.name)} anzeigen</span><input type="checkbox" data-area="${t.id}" ${c ? 'checked' : ''}></label>
            </div>`; }).join('')}</div>
        </section>
        <section class="card">
          <h2>Tastenkürzel</h2>
          <div class="shortcuts">
            <span class="kbd">⌘K</span><span>Schnellsuche (auch Strg+K)</span>
            <span class="kbd">/</span><span>Suchfeld der Seite</span>
            <span class="kbd">← →</span><span>Vorheriges / nächstes Dokument</span>
            <span class="kbd">E</span><span>Dokument bearbeiten</span>
            <span class="kbd">F</span><span>Filter öffnen</span>
            <span class="kbd">S</span><span>Im Posteingang überspringen</span>
            <span class="kbd">Esc</span><span>Zurück / Auswahl beenden</span>
            <span class="kbd">?</span><span>Diese Übersicht</span>
          </div>
        </section>
        <section class="card">
          <h2>Konto</h2>
          <span class="muted">${userName() ? `Angemeldet als ${esc(userName())}` : 'Angemeldet'}${apiVersion ? ` · Paperless-API v${apiVersion}` : ''}</span>
          <div class="row">
            ${CFG.classicUrl ? `<a class="btn plain" href="${esc(CFG.classicUrl)}" target="_blank" rel="noopener">Klassische Oberfläche</a>` : ''}
            <button type="button" class="btn ghost-danger" data-action="logout">Abmelden</button>
          </div>
        </section>
      </div>`);
    const m = main();
    const mark = () => {
      m.querySelectorAll('[data-theme]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-theme') === prefs.theme));
      m.querySelectorAll('[data-defview]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-defview') === prefs.view));
    };
    const saveAreas = () => {
      const list = [];
      m.querySelectorAll('[data-area]').forEach((cb) => {
        if (!cb.checked) return;
        const id = +cb.getAttribute('data-area');
        const btn = m.querySelector(`[data-cycle="${id}"]`);
        list.push({ tag: meta.tags.get(id).name, color: btn.getAttribute('data-color') });
      });
      prefs.areas = list; savePrefs();
      // Seitenleiste aktualisieren, ohne die Einstellungen neu aufzubauen
      const sb = document.querySelector('.sidebar');
      if (sb) { const tmp = document.createElement('div'); tmp.innerHTML = shell('settings', ''); sb.replaceWith(tmp.querySelector('.sidebar')); applyColors(document.querySelector('.sidebar')); }
    };
    m.addEventListener('click', (e) => {
      const th = e.target.closest('[data-theme]');
      if (th) { prefs.theme = th.getAttribute('data-theme'); savePrefs(); applyTheme(); mark(); return; }
      const dv = e.target.closest('[data-defview]');
      if (dv) { prefs.view = dv.getAttribute('data-defview'); savePrefs(); mark(); return; }
      const cy = e.target.closest('[data-cycle]');
      if (cy) {
        const cur = cy.getAttribute('data-color');
        const next = PALETTE[(PALETTE.indexOf(cur) + 1) % PALETTE.length];
        cy.setAttribute('data-color', next); applyColors(cy.parentElement);
        const cb = m.querySelector(`[data-area="${cy.getAttribute('data-cycle')}"]`);
        cb.checked = true; saveAreas(); return;
      }
      if (e.target.closest('[data-reset-areas]')) { prefs.areas = null; savePrefs(); renderSettings(); toast('Standard wiederhergestellt'); }
    });
    m.addEventListener('change', (e) => {
      const cb = e.target.closest('[data-area]');
      if (!cb) return;
      const btn = m.querySelector(`[data-cycle="${cb.getAttribute('data-area')}"]`);
      if (cb.checked && btn.getAttribute('data-color') === '#AEAEB2') {
        const used = new Set(areaDefs().map((a) => a.color));
        const c = PALETTE.find((x) => !used.has(x)) || PALETTE[0];
        btn.setAttribute('data-color', c); applyColors(btn.parentElement);
      }
      saveAreas();
    });
    mark();
  }

  /* ================================================================== */
  /* Hochladen / Scannen                                                 */
  /* ================================================================== */

  function renderUpload() {
    mount('upload', `
      <div class="stack tight"><span class="eyebrow">Neues Dokument</span><h1 class="title">Hochladen</h1></div>
      <div class="drop" id="drop">
        <div class="ico">${I('upload', 28)}</div>
        <div><strong>Dateien hierher ziehen</strong><br><span class="muted">PDF, Bilder oder Office-Dokumente – Paperless erkennt den Text automatisch und legt sie in den Posteingang.</span></div>
        <div class="chips">
          <label class="btn" for="fcam">${I('camera')}Foto aufnehmen</label>
          <label class="btn secondary" for="ffile">${I('doc')}Dateien wählen</label>
        </div>
        <input class="sr-only" id="fcam" type="file" accept="image/*" capture="environment">
        <input class="sr-only" id="ffile" type="file" multiple accept="application/pdf,image/*,.docx,.xlsx,.odt,.ods,.txt,.eml">
      </div>
      <div class="card list" id="uplist" hidden></div>`);
    const drop = document.getElementById('drop');
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => uploadFiles(e.dataTransfer.files));
    document.getElementById('fcam').addEventListener('change', (e) => uploadFiles(e.target.files));
    document.getElementById('ffile').addEventListener('change', (e) => uploadFiles(e.target.files));
  }

  function uploadFiles(files) {
    const list = document.getElementById('uplist');
    if (!list || !files || !files.length) return;
    list.hidden = false;
    [...files].forEach(async (file) => {
      const row = document.createElement('div');
      row.className = 'upl';
      row.innerHTML = `<span>${esc(file.name)}</span><span class="muted">Wird hochgeladen …</span>`;
      list.prepend(row);
      const status = row.lastElementChild;
      try {
        const fd = new FormData();
        fd.append('document', file, file.name);
        const taskId = String(await api('/documents/post_document/', { method: 'POST', body: fd })).replace(/"/g, '');
        status.textContent = 'Wird verarbeitet …';
        pollTask(taskId, status);
      } catch (e) { status.className = 'err'; status.textContent = 'Hochladen fehlgeschlagen'; }
    });
  }

  async function pollTask(taskId, status, tries = 0) {
    if (tries > 150) { status.textContent = 'Läuft noch – später im Posteingang nachsehen'; return; }
    try {
      const r = await api('/tasks/?task_id=' + encodeURIComponent(taskId));
      const t = Array.isArray(r) ? r[0] : (r.results ? r.results[0] : null);
      if (t && t.status === 'SUCCESS') {
        status.className = 'ok';
        if (t.related_document) status.innerHTML = `<a href="#/doc/${esc(t.related_document)}">Fertig – ansehen</a>`;
        else status.textContent = 'Fertig';
        refreshInboxCount();
        return;
      }
      if (t && t.status === 'FAILURE') {
        status.className = 'err';
        status.textContent = /duplicate|Duplikat/i.test(t.result || '') ? 'Schon vorhanden (Duplikat)' : 'Verarbeitung fehlgeschlagen';
        return;
      }
    } catch (e) { /* weiter versuchen */ }
    setTimeout(() => pollTask(taskId, status, tries + 1), 2000);
  }

  /* ================================================================== */
  /* Globale Ereignisse                                                  */
  /* ================================================================== */

  function showShortcuts() {
    openSheet({
      title: 'Tastenkürzel',
      body: `<div class="shortcuts">
        <span class="kbd">⌘K</span><span>Schnellsuche</span><span class="kbd">/</span><span>Suchfeld der Seite</span>
        <span class="kbd">← →</span><span>Vorheriges / nächstes Dokument</span><span class="kbd">E</span><span>Bearbeiten</span>
        <span class="kbd">F</span><span>Filter</span><span class="kbd">S</span><span>Posteingang: später</span><span class="kbd">Esc</span><span>Zurück</span></div>`
    });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.getAttribute('data-action');
    if (act === 'logout') { auth.clear(); meta.loaded = false; thumbCache.forEach((u) => URL.revokeObjectURL(u)); thumbCache.clear(); sessionStorage.removeItem('archiv.nav'); cleanupPage(); location.hash = '#/login'; renderLogin(); }
    if (act === 'reload') render();
    if (act === 'palette') openPalette();
  });

  document.addEventListener('keydown', (e) => {
    if (!auth.token) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    if (e.key === '/') {
      e.preventDefault();
      const s = document.getElementById('bq') || document.getElementById('hq') || document.getElementById('brq');
      if (s) s.focus(); else openPalette();
      return;
    }
    if (e.key === '?') { showShortcuts(); return; }
    if (pageKeys && pageKeys(e)) e.preventDefault();
  });

  window.addEventListener('hashchange', render);
  if (auth.token) refreshInboxCount().finally(render); else render();
})();
