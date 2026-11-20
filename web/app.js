/* Archiv – alternative Oberfläche für Paperless-ngx
 * Reines JavaScript ohne Build-Schritt. Spricht über /api (vom nginx-Container weitergeleitet)
 * mit Paperless und meldet sich per Paperless-Token an.
 */
(function () {
  'use strict';

  const CFG = window.ARCHIV_CONFIG || { appName: 'Archiv', areas: [] };
  const $app = document.getElementById('app');
  const $toast = document.getElementById('toast');

  /* ------------------------------------------------------------------ */
  /* Hilfsfunktionen                                                     */
  /* ------------------------------------------------------------------ */

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const fmtDate = (s) => {
    if (!s) return '';
    const d = String(s).slice(0, 10).split('-');
    return d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : s;
  };

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

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
      if (/^#[0-9a-fA-F]{6}$/.test(c)) {
        if (el.classList.contains('swatch')) el.style.backgroundColor = c + '1F';
        else el.style.backgroundColor = c;
      }
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

  const ICON = {
    grid: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    inbox: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    doc: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    upload: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"/></svg>',
    camera: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    download: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"/></svg>',
    open: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    spark: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6-4.6-1.9 4.6-1.9z"/></svg>',
    chevron: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'
  };

  /* ------------------------------------------------------------------ */
  /* API                                                                 */
  /* ------------------------------------------------------------------ */

  const auth = {
    get token() { return localStorage.getItem('archiv.token') || sessionStorage.getItem('archiv.token'); },
    set(token, remember) {
      (remember ? localStorage : sessionStorage).setItem('archiv.token', token);
    },
    clear() { localStorage.removeItem('archiv.token'); sessionStorage.removeItem('archiv.token'); }
  };

  let apiVersion = null;

  async function api(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    if (auth.token) headers.Authorization = 'Token ' + auth.token;
    headers.Accept = apiVersion ? `application/json; version=${apiVersion}` : 'application/json';
    if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.json);
    }
    const res = await fetch('/api' + path, { method: opts.method || 'GET', headers, body: opts.body });
    if (!apiVersion) {
      const v = parseInt(res.headers.get('X-Api-Version') || '', 10);
      if (v > 0) apiVersion = v;
    }
    if (res.status === 401) { auth.clear(); route('#/login'); throw new Error('Nicht angemeldet'); }
    if (!res.ok) {
      let detail = '';
      try { detail = JSON.stringify(await res.json()); } catch (e) { /* egal */ }
      throw new Error(`Fehler ${res.status}${detail ? ': ' + detail.slice(0, 200) : ''}`);
    }
    if (opts.raw) return res;
    if (res.status === 204) return null;
    const ct = res.headers.get('Content-Type') || '';
    return ct.includes('json') ? res.json() : res.text();
  }

  // Ab API-Version 9 ist "created" ein reines Datum, davor gibt es dafür "created_date"
  const dateField = () => (apiVersion && apiVersion >= 9 ? 'created' : 'created_date');

  async function apiBlob(path) {
    const res = await fetch('/api' + path, { headers: { Authorization: 'Token ' + auth.token } });
    if (!res.ok) throw new Error('Fehler ' + res.status);
    return res.blob();
  }

  async function fetchAll(path) {
    const out = [];
    let page = 1;
    for (;;) {
      const sep = path.includes('?') ? '&' : '?';
      const r = await api(`${path}${sep}page_size=500&page=${page}`);
      out.push(...r.results);
      if (!r.next) break;
      page += 1;
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Stammdaten (Tags, Korrespondenten, Typen, Pfade)                    */
  /* ------------------------------------------------------------------ */

  const meta = { loaded: false, tags: new Map(), corr: new Map(), types: new Map(), paths: new Map(), inboxTags: [], user: null };

  async function loadMeta(force) {
    if (meta.loaded && !force) return;
    const [tags, corr, types, paths, ui] = await Promise.all([
      fetchAll('/tags/'), fetchAll('/correspondents/'), fetchAll('/document_types/'), fetchAll('/storage_paths/'),
      api('/ui_settings/').catch(() => null)
    ]);
    meta.tags = new Map(tags.map((t) => [t.id, t]));
    meta.corr = new Map(corr.map((c) => [c.id, c]));
    meta.types = new Map(types.map((t) => [t.id, t]));
    meta.paths = new Map(paths.map((p) => [p.id, p]));
    meta.inboxTags = tags.filter((t) => t.is_inbox_tag).map((t) => t.id);
    meta.user = ui && ui.user ? ui.user : null;
    meta.loaded = true;
  }

  const idOf = (v) => (v && typeof v === 'object' ? v.id : v);
  const corrName = (v) => { const c = meta.corr.get(idOf(v)); return c ? c.name : ''; };
  const typeName = (v) => { const t = meta.types.get(idOf(v)); return t ? t.name : ''; };
  const pathName = (v) => { const p = meta.paths.get(idOf(v)); return p ? p.name : ''; };
  const tagIds = (doc) => (doc.tags || []).map(idOf);

  function areaList() {
    const byName = new Map([...meta.tags.values()].map((t) => [t.name.toLowerCase(), t]));
    return (CFG.areas || [])
      .map((a) => { const t = byName.get(String(a.tag).toLowerCase()); return t ? { id: t.id, name: t.name, count: t.document_count || 0, color: a.color } : null; })
      .filter(Boolean);
  }
  const areaColor = (tagId) => { const a = areaList().find((x) => x.id === tagId); return a ? a.color : null; };

  /* ------------------------------------------------------------------ */
  /* Vorschaubilder (lazy, mit Token)                                    */
  /* ------------------------------------------------------------------ */

  const thumbCache = new Map();
  const thumbObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { thumbObserver.unobserve(e.target); loadThumb(e.target); } });
  }, { rootMargin: '200px' }) : null;

  async function loadThumb(el) {
    const id = el.getAttribute('data-thumb');
    try {
      let url = thumbCache.get(id);
      if (!url) { url = URL.createObjectURL(await apiBlob(`/documents/${id}/thumb/`)); thumbCache.set(id, url); }
      const img = new Image();
      img.alt = '';
      img.src = url;
      el.replaceChildren(img);
    } catch (e) { /* ohne Vorschau weiter */ }
  }
  function watchThumbs(root) {
    root.querySelectorAll('[data-thumb]').forEach((el) => (thumbObserver ? thumbObserver.observe(el) : loadThumb(el)));
  }

  /* ------------------------------------------------------------------ */
  /* Router & Grundgerüst                                                */
  /* ------------------------------------------------------------------ */

  let inboxCount = 0;

  function parseHash() {
    const h = location.hash || '#/';
    const [p, q] = h.slice(1).split('?');
    return { path: p || '/', params: new URLSearchParams(q || '') };
  }
  function route(h) { if (location.hash === h) render(); else location.hash = h; }

  function shell(active, inner) {
    const areas = areaList();
    const nav = (href, key, icon, label, extra = '') =>
      `<a href="${href}" class="${active === key ? 'active' : ''}">${icon}<span>${esc(label)}</span>${extra}</a>`;
    const badge = inboxCount ? `<span class="badge">${inboxCount}</span>` : '';
    const name = meta.user ? (meta.user.first_name || meta.user.username) : '';
    return `
      <div class="shell">
        <aside class="sidebar" aria-label="Navigation">
          <a class="brand" href="#/"><span class="brand-mark">${ICON.doc.replace('stroke="currentColor"', 'stroke="#fff"')}</span>${esc(CFG.appName)}</a>
          <nav class="nav">
            ${nav('#/', 'home', ICON.grid, 'Übersicht')}
            ${nav('#/inbox', 'inbox', ICON.inbox, 'Posteingang', badge)}
            ${nav('#/docs', 'docs', ICON.doc, 'Alle Dokumente')}
            ${nav('#/search', 'search', ICON.search, 'Suche')}
            ${nav('#/upload', 'upload', ICON.upload, 'Hochladen')}
          </nav>
          <nav class="nav" aria-label="Bereiche">
            <span class="nav-label">Bereiche</span>
            ${areas.map((a) => `<a href="#/docs?tag=${a.id}" class="${active === 'tag' + a.id ? 'active' : ''}"><span class="dot" data-color="${esc(a.color)}"></span><span>${esc(a.name)}</span><span class="count">${a.count}</span></a>`).join('')}
          </nav>
          <div class="sidebar-foot">
            ${name ? `<span>Angemeldet als ${esc(name)}</span>` : ''}
            <a href="/" data-action="classic">Klassische Paperless-Oberfläche</a>
            <button type="button" class="linkbtn" data-action="logout">Abmelden</button>
          </div>
        </aside>
        <main class="main" id="main">${inner}</main>
        <nav class="tabbar" aria-label="Tabs">
          <a href="#/" class="${active === 'home' || String(active).startsWith('tag') || active === 'docs' ? 'active' : ''}">${ICON.grid.replace(/18/g, '24')}Übersicht</a>
          <a href="#/inbox" class="${active === 'inbox' ? 'active' : ''}">${ICON.inbox.replace(/18/g, '24')}Posteingang${inboxCount ? `<span class="badge">${inboxCount}</span>` : ''}</a>
          <a href="#/search" class="${active === 'search' ? 'active' : ''}">${ICON.search.replace(/18/g, '24')}Suche</a>
          <a href="#/upload" class="${active === 'upload' ? 'active' : ''}">${ICON.camera.replace(/18/g, '24')}Scannen</a>
        </nav>
      </div>`;
  }

  function mount(active, inner) {
    $app.innerHTML = shell(active, inner);
    const classic = $app.querySelector('[data-action="classic"]');
    if (classic && CFG.classicUrl) classic.href = CFG.classicUrl; else if (classic) classic.remove();
    applyColors($app);
    watchThumbs($app);
    window.scrollTo(0, 0);
  }
  const main = () => document.getElementById('main');
  const loading = () => '<div class="center"><div class="spinner" aria-label="Lädt"></div></div>';

  async function refreshInboxCount() {
    try {
      const r = await api('/documents/?is_in_inbox=true&page_size=1&fields=id');
      inboxCount = r.count || 0;
    } catch (e) { inboxCount = 0; }
  }

  async function render() {
    const { path, params } = parseHash();
    if (!auth.token) { renderLogin(); return; }
    if (path === '/login') { location.hash = '#/'; return; }
    try {
      await loadMeta();
      if (path === '/') return await renderHome();
      if (path === '/inbox') return await renderInbox();
      if (path === '/docs') return await renderDocs(params);
      if (path === '/search') return await renderSearch(params);
      if (path === '/upload') return renderUpload();
      const m = path.match(/^\/doc\/(\d+)$/);
      if (m) return await renderDoc(parseInt(m[1], 10), params.get('edit') === '1');
      route('#/');
    } catch (e) {
      if (!auth.token) return;
      $app.innerHTML = shell('', `<div class="card empty"><p>Das hat nicht geklappt.</p><p class="error">${esc(e.message)}</p><button class="btn" data-action="reload">Erneut versuchen</button></div>`);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Login                                                               */
  /* ------------------------------------------------------------------ */

  function renderLogin(error) {
    $app.innerHTML = `
      <div class="login">
        <form class="card" id="loginForm" autocomplete="on">
          <div class="brand"><span class="brand-mark">${ICON.doc.replace('stroke="currentColor"', 'stroke="#fff"').replace(/18/g, '24')}</span>${esc(CFG.appName)}</div>
          <p class="muted login-sub">Mit deinem Paperless-Konto anmelden</p>
          <div class="field"><label for="u">Benutzername</label><input class="input" id="u" name="username" autocomplete="username" required></div>
          <div class="field"><label for="p">Passwort</label><input class="input" id="p" name="password" type="password" autocomplete="current-password" required></div>
          <label class="check"><input type="checkbox" id="remember" checked> Angemeldet bleiben</label>
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
      } catch (e) {
        renderLogin(e.message);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Listen-Bausteine                                                    */
  /* ------------------------------------------------------------------ */

  function docItem(d, opts = {}) {
    const tids = tagIds(d).filter((t) => !meta.inboxTags.includes(t));
    const firstArea = tids.map((t) => ({ t, c: areaColor(t) })).find((x) => x.c);
    const sub = [corrName(d.correspondent), typeName(d.document_type)].filter(Boolean).join(' · ');
    const hit = opts.hit && d.__search_hit__ && d.__search_hit__.highlights ? safeHighlight(d.__search_hit__.highlights) : '';
    return `
      <a class="item" href="#/doc/${d.id}">
        <span class="thumb" data-thumb="${d.id}"></span>
        <span class="meta">
          <span class="t">${esc(d.title)}</span>
          <span class="s">${esc(sub || '—')}<span class="hide-d"> · ${esc(fmtDate(d.created_date || d.created))}</span></span>
          ${hit ? `<span class="hit">${hit}</span>` : ''}
        </span>
        ${firstArea ? `<span class="chip tag1"><span class="dot" data-color="${esc(firstArea.c)}"></span>${esc(meta.tags.get(firstArea.t).name)}</span>` : ''}
        <span class="date">${esc(fmtDate(d.created_date || d.created))}</span>
      </a>`;
  }
  const docList = (docs, opts) => docs.length
    ? `<div class="card list">${docs.map((d) => docItem(d, opts)).join('')}</div>`
    : '<div class="card empty">Keine Dokumente gefunden.</div>';

  const FIELDS = 'id,title,correspondent,document_type,created,created_date,tags,storage_path';

  /* ------------------------------------------------------------------ */
  /* Übersicht                                                           */
  /* ------------------------------------------------------------------ */

  async function renderHome() {
    mount('home', loading());
    const [recent] = await Promise.all([
      api(`/documents/?ordering=-added&page_size=8&fields=${FIELDS}`),
      refreshInboxCount()
    ]);
    const total = recent.count;
    const h = new Date().getHours();
    const greet = h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
    const name = meta.user ? (meta.user.first_name || meta.user.username) : '';
    const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const areas = areaList();

    mount('home', `
      <div class="row-between">
        <div class="stack tight">
          <span class="eyebrow">${esc(today)}</span>
          <h1 class="title">${esc(greet)}${name ? ', ' + esc(name) : ''}</h1>
        </div>
        <a class="btn hide-m" href="#/upload">${ICON.plus}Dokument hinzufügen</a>
      </div>

      <form class="searchbar" role="search" id="homeSearch">
        ${ICON.search}
        <label class="sr-only" for="hq">Suche</label>
        <input id="hq" type="search" placeholder="Suche in ${total} Dokumenten" autocomplete="off">
        <span class="kbd">/</span>
      </form>

      ${inboxCount ? `
      <section class="card banner" aria-labelledby="ib">
        <div class="ico">${ICON.inbox.replace(/18/g, '26')}</div>
        <div class="txt">
          <h2 id="ib">${inboxCount === 1 ? '1 neues Dokument' : inboxCount + ' neue Dokumente'} im Posteingang</h2>
          <span class="muted">Vorschläge prüfen und mit einem Klick übernehmen.</span>
        </div>
        <a class="btn plain" href="#/inbox">Jetzt sortieren</a>
      </section>` : ''}

      ${areas.length ? `
      <section class="stack" aria-labelledby="ar">
        <h2 class="section" id="ar">Bereiche</h2>
        <div class="areas">
          ${areas.map((a) => `
            <a class="card area" href="#/docs?tag=${a.id}">
              <span class="swatch" data-color="${esc(a.color)}"><span class="dot" data-color="${esc(a.color)}"></span></span>
              <span class="txt"><span class="name">${esc(a.name)}</span><span class="num">${a.count}<span class="hide-m"> Dokumente</span></span></span>
            </a>`).join('')}
        </div>
      </section>` : ''}

      <section class="stack" aria-labelledby="rc">
        <div class="row-between"><h2 class="section" id="rc">Zuletzt hinzugefügt</h2><a href="#/docs">Alle anzeigen</a></div>
        ${docList(recent.results)}
      </section>`);
    fixInlineStyles();
    document.getElementById('homeSearch').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('hq').value.trim();
      route('#/search' + (q ? '?q=' + encodeURIComponent(q) : ''));
    });
  }

  // Einige Templates nutzen style="gap:…" – per CSP blockiert, daher in CSSOM übertragen
  function fixInlineStyles() {
    main().querySelectorAll('[style]').forEach((el) => {
      const s = el.getAttribute('style');
      el.removeAttribute('style');
      s.split(';').forEach((decl) => {
        const i = decl.indexOf(':');
        if (i > 0) el.style.setProperty(decl.slice(0, i).trim(), decl.slice(i + 1).trim());
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Dokumentlisten (alle / Bereich / Korrespondent / Typ)               */
  /* ------------------------------------------------------------------ */

  async function renderDocs(params) {
    const tag = params.get('tag');
    const corr = params.get('corr');
    const type = params.get('type');
    let title = 'Alle Dokumente';
    let active = 'docs';
    const q = ['ordering=-created', `fields=${FIELDS}`];
    if (tag) { q.push('tags__id__all=' + encodeURIComponent(tag)); const t = meta.tags.get(+tag); title = t ? t.name : 'Tag'; active = 'tag' + tag; }
    if (corr) { q.push('correspondent__id=' + encodeURIComponent(corr)); title = corrName(+corr) || 'Korrespondent'; }
    if (type) { q.push('document_type__id=' + encodeURIComponent(type)); title = typeName(+type) || 'Typ'; }
    mount(active, loading());
    let page = 1;
    const first = await api(`/documents/?${q.join('&')}&page_size=50&page=1`);
    mount(active, `
      <div class="stack tight">
        <a href="#/" class="eyebrow">${ICON.back.replace(/18/g, '14')} Übersicht</a>
        <h1 class="title">${esc(title)}</h1>
        <span class="muted">${first.count} Dokumente</span>
      </div>
      <div id="listWrap">${docList(first.results)}</div>
      ${first.next ? '<div class="more"><button class="btn secondary" data-action="more">Mehr laden</button></div>' : ''}`);
    fixInlineStyles();
    const btn = main().querySelector('[data-action="more"]');
    if (btn) btn.addEventListener('click', async () => {
      btn.disabled = true;
      page += 1;
      const r = await api(`/documents/?${q.join('&')}&page_size=50&page=${page}`);
      const list = main().querySelector('#listWrap .list');
      list.insertAdjacentHTML('beforeend', r.results.map((d) => docItem(d)).join(''));
      applyColors(list); watchThumbs(list);
      if (r.next) btn.disabled = false; else btn.parentElement.remove();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Suche                                                               */
  /* ------------------------------------------------------------------ */

  async function renderSearch(params) {
    const q = params.get('q') || '';
    const type = params.get('type') || '';
    const types = [...meta.types.values()].filter((t) => t.document_count > 0).sort((a, b) => b.document_count - a.document_count).slice(0, 10);
    mount('search', `
      <h1 class="title">Suche</h1>
      <form class="searchbar" role="search" id="sform">
        ${ICON.search}
        <label class="sr-only" for="sq">Suchbegriff</label>
        <input id="sq" type="search" value="${esc(q)}" placeholder="Titel, Inhalt, Korrespondent …" autocomplete="off" enterkeyhint="search">
      </form>
      <div class="chips scroll" role="group" aria-label="Dokumenttyp">
        <button type="button" class="chip toggle ${type ? '' : 'on'}" data-type="">Alle</button>
        ${types.map((t) => `<button type="button" class="chip toggle ${String(t.id) === type ? 'on' : ''}" data-type="${t.id}">${esc(t.name)}</button>`).join('')}
      </div>
      <div id="results">${q || type ? loading() : '<div class="card empty">Suchbegriff eingeben – gesucht wird im Volltext aller Dokumente.</div>'}</div>`);
    const input = document.getElementById('sq');
    if (!('ontouchstart' in window)) input.focus();
    const go = (nq, nt) => {
      const p = new URLSearchParams();
      if (nq) p.set('q', nq);
      if (nt) p.set('type', nt);
      const h = '#/search' + (p.toString() ? '?' + p : '');
      history.replaceState(null, '', h);
      runSearch(nq, nt);
    };
    document.getElementById('sform').addEventListener('submit', (e) => { e.preventDefault(); go(input.value.trim(), currentType()); input.blur(); });
    input.addEventListener('input', debounce(() => go(input.value.trim(), currentType()), 350));
    main().querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
      main().querySelectorAll('[data-type]').forEach((x) => x.classList.toggle('on', x === b));
      go(input.value.trim(), b.getAttribute('data-type'));
    }));
    const currentType = () => { const on = main().querySelector('[data-type].on'); return on ? on.getAttribute('data-type') : ''; };
    if (q || type) runSearch(q, type);
  }

  let searchSeq = 0;
  async function runSearch(q, type) {
    const seq = ++searchSeq;
    const box = document.getElementById('results');
    if (!box) return;
    if (!q && !type) { box.innerHTML = '<div class="card empty">Suchbegriff eingeben – gesucht wird im Volltext aller Dokumente.</div>'; return; }
    box.innerHTML = loading();
    const p = [`page_size=40`, `fields=${FIELDS}`];
    if (q) p.push('query=' + encodeURIComponent(q)); else p.push('ordering=-created');
    if (type) p.push('document_type__id=' + encodeURIComponent(type));
    try {
      const r = await api('/documents/?' + p.join('&'));
      if (seq !== searchSeq) return;
      box.innerHTML = `<p class="muted">${r.count} Treffer</p>${docList(r.results, { hit: true })}`;
      applyColors(box); watchThumbs(box);
    } catch (e) {
      if (seq === searchSeq) box.innerHTML = `<div class="card empty error">${esc(e.message)}</div>`;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Dokument                                                            */
  /* ------------------------------------------------------------------ */

  let previewUrl = null;
  const isPhone = () => window.matchMedia('(max-width: 860px)').matches;

  function optionList(map, selected, emptyLabel) {
    const items = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return `<option value="">${esc(emptyLabel)}</option>` + items.map((o) => `<option value="${o.id}" ${idOf(selected) === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('');
  }

  function tagPicker(selectedIds, suggestedIds = []) {
    const sel = new Set(selectedIds);
    const sug = new Set(suggestedIds);
    const all = [...meta.tags.values()].filter((t) => !t.is_inbox_tag)
      .sort((a, b) => (sel.has(b.id) - sel.has(a.id)) || (sug.has(b.id) - sug.has(a.id)) || (b.document_count - a.document_count));
    return `
      <div class="tagpick">
        <label class="sr-only" for="tagfilter">Tags filtern</label>
        <input class="input" id="tagfilter" type="search" placeholder="Tag suchen …" autocomplete="off">
        <div class="chips" id="tagchips">
          ${all.map((t) => `<button type="button" class="chip toggle ${sel.has(t.id) ? 'on' : ''}" data-tag="${t.id}" data-name="${esc(t.name.toLowerCase())}">${sug.has(t.id) && !sel.has(t.id) ? ICON.spark : ''}${esc(t.name)}</button>`).join('')}
        </div>
      </div>`;
  }
  function bindTagPicker(root) {
    root.querySelectorAll('[data-tag]').forEach((b) => b.addEventListener('click', () => b.classList.toggle('on')));
    const f = root.querySelector('#tagfilter');
    if (f) f.addEventListener('input', () => {
      const v = f.value.trim().toLowerCase();
      root.querySelectorAll('[data-tag]').forEach((b) => { b.hidden = v && !b.getAttribute('data-name').includes(v); });
    });
  }
  const pickedTags = (root) => [...root.querySelectorAll('[data-tag].on')].map((b) => +b.getAttribute('data-tag'));

  async function showPreview(doc, box) {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    try {
      if (isPhone()) {
        const blob = await apiBlob(`/documents/${doc.id}/thumb/`);
        previewUrl = URL.createObjectURL(blob);
        box.innerHTML = `<img alt="Vorschau von ${esc(doc.title)}" src="${previewUrl}">
          <button type="button" class="btn secondary" data-action="openpdf">${ICON.open}Ganzes Dokument öffnen</button>`;
      } else {
        const blob = await apiBlob(`/documents/${doc.id}/preview/`);
        previewUrl = URL.createObjectURL(blob);
        box.innerHTML = `<iframe title="Vorschau von ${esc(doc.title)}" src="${previewUrl}"></iframe>`;
      }
    } catch (e) {
      box.innerHTML = '<div class="placeholder">Keine Vorschau verfügbar.</div>';
    }
  }

  async function openOriginal(doc, download) {
    const w = download ? null : window.open('', '_blank');
    try {
      const blob = await apiBlob(`/documents/${doc.id}/${download ? 'download' : 'preview'}/`);
      const url = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement('a');
        a.href = url;
        a.download = (doc.original_file_name || doc.title || 'dokument').replace(/[\\/:*?"<>|]/g, '_');
        if (!/\.[a-z0-9]{2,5}$/i.test(a.download)) a.download += '.pdf';
        document.body.appendChild(a); a.click(); a.remove();
      } else if (w) {
        w.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      if (w) w.close();
      toast('Öffnen fehlgeschlagen');
    }
  }

  async function renderDoc(id, editMode) {
    mount('docs', loading());
    const [doc, notes] = await Promise.all([
      api(`/documents/${id}/`),
      api(`/documents/${id}/notes/`).catch(() => [])
    ]);
    const tids = tagIds(doc).filter((t) => !meta.inboxTags.includes(t));
    const inInbox = tagIds(doc).some((t) => meta.inboxTags.includes(t));
    const created = doc.created_date || doc.created;

    const details = editMode ? `
      <form class="card box" id="editForm">
        <span class="label">Bearbeiten</span>
        <div class="field"><label for="ft">Titel</label><input class="input" id="ft" value="${esc(doc.title)}" required></div>
        <div class="formgrid">
          <div class="field"><label for="fc">Korrespondent</label><select class="input" id="fc">${optionList(meta.corr, doc.correspondent, '—')}</select></div>
          <div class="field"><label for="fy">Dokumenttyp</label><select class="input" id="fy">${optionList(meta.types, doc.document_type, '—')}</select></div>
          <div class="field"><label for="fd">Datum</label><input class="input" id="fd" type="date" value="${esc(String(created || '').slice(0, 10))}"></div>
          <div class="field"><label for="fp">Ablage</label><select class="input" id="fp">${optionList(meta.paths, doc.storage_path, '—')}</select></div>
        </div>
        <div class="field"><span class="sr-only">Tags</span>${tagPicker(tids)}</div>
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
        <div class="kv"><span class="k">Datum</span><span class="v">${esc(fmtDate(created) || '—')}</span></div>
        <div class="kv"><span class="k">Ablage</span><span class="v">${esc(pathName(doc.storage_path) || '—')}</span></div>
        ${doc.page_count ? `<div class="kv"><span class="k">Seiten</span><span class="v">${doc.page_count}</span></div>` : ''}
        <div class="box">
          <span class="k muted">Tags</span>
          <div class="chips">
            ${tids.length ? tids.map((t) => { const tg = meta.tags.get(t); const c = areaColor(t); return tg ? `<a class="chip" href="#/docs?tag=${t}">${c ? `<span class="dot" data-color="${esc(c)}"></span>` : ''}${esc(tg.name)}</a>` : ''; }).join('') : '<span class="muted">Keine</span>'}
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
      </div>`;

    mount('docs', `
      <div class="docbar">
        <button type="button" class="back linkbtn" data-action="back">${ICON.back}Zurück</button>
        <span class="spacer"></span>
        <div class="actions">
          <button type="button" class="iconbtn" aria-label="Original öffnen" data-action="open">${ICON.open}</button>
          <button type="button" class="iconbtn" aria-label="Herunterladen" data-action="download">${ICON.download}</button>
          ${editMode ? '' : `<a class="btn" href="#/doc/${doc.id}?edit=1">Bearbeiten</a>`}
        </div>
      </div>
      <div class="docgrid">
        <section class="preview" aria-label="Vorschau" id="pv">${loading()}</section>
        <aside class="details" aria-label="Details">${details}</aside>
      </div>`);
    fixInlineStyles();
    applyColors(main());
    showPreview(doc, document.getElementById('pv'));

    const m = main();
    m.addEventListener('click', (e) => {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      const act = a.getAttribute('data-action');
      if (act === 'open' || act === 'openpdf') openOriginal(doc, false);
      if (act === 'download') openOriginal(doc, true);
      if (act === 'done') markDone(doc).then(() => renderDoc(doc.id, false));
      if (act === 'back') { if (history.length > 1) history.back(); else route('#/'); }
    });

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
        const body = {
          title: document.getElementById('ft').value.trim(),
          correspondent: +document.getElementById('fc').value || null,
          document_type: +document.getElementById('fy').value || null,
          storage_path: +document.getElementById('fp').value || null,
          tags: [...pickedTags(ef), ...keepInbox]
        };
        const d = document.getElementById('fd').value;
        if (d) body[dateField()] = d;
        try {
          await api(`/documents/${doc.id}/`, { method: 'PATCH', json: body });
          toast('Gespeichert');
          route(`#/doc/${doc.id}`);
        } catch (err) { toast('Speichern fehlgeschlagen'); }
      });
    }
  }

  async function markDone(doc) {
    const tags = tagIds(doc).filter((t) => !meta.inboxTags.includes(t));
    await api(`/documents/${doc.id}/`, { method: 'PATCH', json: { tags } });
    await refreshInboxCount();
    toast('Erledigt');
  }

  /* ------------------------------------------------------------------ */
  /* Posteingang                                                         */
  /* ------------------------------------------------------------------ */

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
    if (inboxPos >= inboxQueue.length) {
      await refreshInboxCount();
      mount('inbox', `
        <h1 class="title">Posteingang</h1>
        <div class="card empty">
          <p><strong>Alles erledigt.</strong></p>
          <p>${inboxCount ? `Noch ${inboxCount} übersprungen.` : 'Keine neuen Dokumente.'}</p>
          ${inboxCount ? '<button class="btn" data-action="restart">Übersprungene ansehen</button>' : '<a class="btn" href="#/">Zur Übersicht</a>'}
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
    const curTags = tagIds(doc).filter((t) => !meta.inboxTags.includes(t));
    const sugTags = (sug.tags || []).filter((t) => !meta.inboxTags.includes(t) && !curTags.includes(t));
    const created = String(doc.created_date || doc.created || '').slice(0, 10);
    const sugDates = (sug.dates || []).filter((d) => d && d !== created).slice(0, 3);
    const pct = inboxTotal ? Math.round((inboxPos / inboxTotal) * 100) : 0;

    mount('inbox', `
      <div class="row-between">
        <h1 class="title">Posteingang</h1>
        <span class="muted">${inboxPos + 1} von ${inboxQueue.length}</span>
      </div>
      <div class="progress"><div id="pg"></div></div>
      <div class="inbox">
        <section class="preview" aria-label="Vorschau" id="ipv">${loading()}</section>
        <form class="card form" id="inboxForm">
          <span class="suggest">${ICON.spark}Vorschlag – bitte prüfen</span>
          <div class="field"><label for="it">Titel</label><input class="input" id="it" value="${esc(doc.title)}" required></div>
          <div class="formgrid">
            <div class="field"><label for="ic">Von</label><select class="input" id="ic">${optionList(meta.corr, corr, '—')}</select></div>
            <div class="field"><label for="iy">Typ</label><select class="input" id="iy">${optionList(meta.types, type, '—')}</select></div>
            <div class="field"><label for="id">Datum</label><input class="input" id="id" type="date" value="${esc(created)}"></div>
            <div class="field"><label for="ip">Ablage</label><select class="input" id="ip">${optionList(meta.paths, path, '—')}</select></div>
          </div>
          ${sugDates.length ? `<div class="chips" aria-label="Datumsvorschläge">${sugDates.map((d) => `<button type="button" class="chip toggle" data-date="${esc(d)}">${ICON.spark}${esc(fmtDate(d))}</button>`).join('')}</div>` : ''}
          <div class="field"><span class="muted">Tags${sugTags.length ? ' – ✦ = vorgeschlagen' : ''}</span>${tagPicker(curTags, sugTags)}</div>
          <button class="btn big" type="submit">Übernehmen</button>
          <div class="btnrow">
            <a class="btn secondary" href="#/doc/${doc.id}?edit=1">Öffnen</a>
            <button class="btn secondary" type="button" data-action="skip">Später</button>
          </div>
        </form>
      </div>`);
    const pg = document.getElementById('pg');
    if (pg) pg.style.width = pct + '%';
    showPreview(doc, document.getElementById('ipv'));
    const f = document.getElementById('inboxForm');
    bindTagPicker(f);
    f.querySelectorAll('[data-date]').forEach((b) => b.addEventListener('click', () => { document.getElementById('id').value = b.getAttribute('data-date'); }));
    f.querySelector('[data-action="skip"]').addEventListener('click', () => { inboxPos += 1; showInboxItem(); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true;
      const body = {
        title: document.getElementById('it').value.trim(),
        correspondent: +document.getElementById('ic').value || null,
        document_type: +document.getElementById('iy').value || null,
        storage_path: +document.getElementById('ip').value || null,
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
      } catch (err) {
        btn.disabled = false;
        toast('Speichern fehlgeschlagen');
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hochladen / Scannen                                                 */
  /* ------------------------------------------------------------------ */

  function renderUpload() {
    mount('upload', `
      <h1 class="title">Hochladen</h1>
      <div class="drop" id="drop">
        <div class="ico">${ICON.upload.replace(/18/g, '28')}</div>
        <div><strong>Dateien hierher ziehen</strong><br><span class="muted">PDF, Bilder oder Office-Dokumente – Paperless erkennt den Text automatisch.</span></div>
        <div class="chips">
          <label class="btn" for="fcam">${ICON.camera}Foto aufnehmen</label>
          <label class="btn secondary" for="ffile">${ICON.doc}Datei wählen</label>
        </div>
        <input class="sr-only" id="fcam" type="file" accept="image/*" capture="environment">
        <input class="sr-only" id="ffile" type="file" multiple accept="application/pdf,image/*,.docx,.xlsx,.odt,.txt,.eml">
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
        const res = await fetch('/api/documents/post_document/', { method: 'POST', headers: { Authorization: 'Token ' + auth.token }, body: fd });
        if (!res.ok) throw new Error('Fehler ' + res.status);
        const taskId = String(await res.json()).replace(/"/g, '');
        status.textContent = 'Wird verarbeitet …';
        pollTask(taskId, status);
      } catch (e) {
        status.className = 'err';
        status.textContent = 'Hochladen fehlgeschlagen';
      }
    });
  }

  async function pollTask(taskId, status, tries = 0) {
    if (tries > 150) { status.textContent = 'Läuft noch – später im Posteingang nachsehen'; return; }
    try {
      const r = await api('/tasks/?task_id=' + encodeURIComponent(taskId));
      const t = Array.isArray(r) ? r[0] : (r.results ? r.results[0] : null);
      if (t && t.status === 'SUCCESS') {
        status.className = 'ok';
        if (t.related_document) {
          status.innerHTML = `<a href="#/doc/${esc(t.related_document)}">Fertig – ansehen</a>`;
        } else status.textContent = 'Fertig';
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

  /* ------------------------------------------------------------------ */
  /* Globale Ereignisse                                                  */
  /* ------------------------------------------------------------------ */

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.getAttribute('data-action');
    if (act === 'logout') { auth.clear(); meta.loaded = false; thumbCache.forEach((u) => URL.revokeObjectURL(u)); thumbCache.clear(); route('#/login'); renderLogin(); }
    if (act === 'reload') render();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault();
      const s = document.getElementById('hq') || document.getElementById('sq');
      if (s) s.focus(); else route('#/search');
    }
  });

  window.addEventListener('hashchange', render);
  if (auth.token) refreshInboxCount().finally(render); else render();
})();
