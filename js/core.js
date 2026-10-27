/* App core: state, persistence, actions, modals, routing and the lab chrome */

const STORE_KEY = 'aem-practice-lab.v1';
let S = null;
const A = {}; // action handlers: <button data-act="name">
const SUBMIT = {}; // form handlers: <form data-submit="name">
let AFTER = [];
const FRAME_SCROLL = {};

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.v === 1) {
        S = s;
        for (const k of ['author', 'publish']) if (S.instances[k].starting) S.instances[k].starting = false;
        if (upgradeState(S)) save();
        return;
      }
    }
  } catch (e) { /* fall through to a fresh lab */ }
  S = seedState();
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
  } catch (e) {
    toast('Could not save the lab (browser storage is full). Try deleting large uploaded assets.', 'error');
  }
}

function commit() {
  save();
  render();
}

function now() {
  return new Date().toISOString();
}

function uid() {
  return (S.seq++).toString(36) + Date.now().toString(36).slice(-4);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' h ago';
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function flag(name) {
  if (!S.events[name]) S.events[name] = Date.now();
}

function slug(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
}

const AR = () => S.repos.author;
const PR = () => S.repos.publish;

/* ---------- toasts & modals ---------- */

function toast(msg, kind) {
  let box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || 'info');
  el.innerHTML = msg;
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 4200);
  setTimeout(() => el.remove(), 4700);
}

let MODAL = null;

// opts: { title, body, ok, okLabel, cancelLabel, wide, onMount, hideOk, style }
// style 'dialog' (default): Coral component dialog with ✕ / ✓ icon buttons in the header
// style 'wizard': text buttons in the header (Cancel / Next / Create…)
// style 'alert': confirmation box with buttons at the bottom
function openModal(opts) {
  closeModal();
  const style = opts.style || (opts.okLabel && opts.okLabel !== 'Done' ? 'wizard' : 'dialog');
  const bottom = style === 'alert' || style === 'success';
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  const cancelBtn = style === 'dialog'
    ? `<button class="iconbtn" data-modal="cancel" title="${opts.cancelLabel || 'Cancel'}">${icon('Close')}</button>`
    : `<button class="btn ${bottom ? 'outline' : 'quiet'}" data-modal="cancel">${opts.cancelLabel || 'Cancel'}</button>`;
  const okBtn = opts.hideOk ? '' : style === 'dialog'
    ? `<button class="iconbtn ok" data-modal="ok" title="${opts.okLabel || 'Done'}">${icon('Checkmark')}</button>`
    : `<button class="btn primary" data-modal="ok">${opts.okLabel || 'Done'}</button>`;
  const btns = `<div class="modal-btns">${style === 'dialog' && !opts.noHelp ? '<button class="iconbtn" title="Help" tabindex="-1">' + icon('HelpOutline') + '</button>' : ''}${cancelBtn}${okBtn}</div>`;
  const title = style === 'success' ? `${icon('CheckmarkCircle', 20)} ${opts.title}` : opts.title;
  wrap.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''} m-${style} ${bottom ? 'm-alert' : ''} ${opts.cls || ''}" role="dialog">
    <div class="modal-head"><div class="modal-title">${title}</div>${bottom ? '' : btns}</div>
    <div class="modal-body">${opts.body}</div>${bottom ? `<div class="modal-foot">${btns}</div>` : ''}</div>`;
  document.body.appendChild(wrap);
  MODAL = { el: wrap, opts };
  wrap.addEventListener('click', e => {
    const b = e.target.closest('[data-modal]');
    if (!b) return;
    if (b.dataset.modal === 'cancel') {
      closeModal();
      if (opts.cancel) opts.cancel();
    }
    if (b.dataset.modal === 'ok') {
      const res = opts.ok ? opts.ok(wrap.querySelector('.modal-body')) : true;
      if (res !== false) closeModal();
    }
  });
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
  if (opts.onMount) opts.onMount(wrap.querySelector('.modal-body'));
  const first = wrap.querySelector('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select');
  if (first) first.focus();
}

function closeModal() {
  if (MODAL) MODAL.el.remove();
  MODAL = null;
}

// Coral "success" alert shown after wizards: [Done] [Open]
function successDialog(msg, onDone, onOpen) {
  openModal({
    title: 'Success', style: 'success', body: `<p class="confirm">${msg}</p>`,
    cancelLabel: 'Done', cancel: onDone,
    ...(onOpen ? { okLabel: 'Open', ok: () => { onOpen(); } } : { hideOk: true }),
  });
}

function confirmBox(title, msg, onYes, yesLabel) {
  openModal({ title, style: 'alert', body: `<p class="confirm">${msg}</p>`, okLabel: yesLabel || 'Confirm', ok: () => { onYes(); } });
}

function formData(root) {
  const o = {};
  root.querySelectorAll('[name]').forEach(el => {
    if (el.type === 'checkbox') {
      if (el.dataset.multi) {
        o[el.name] = o[el.name] || [];
        if (el.checked) o[el.name].push(el.value);
      } else o[el.name] = el.checked;
    } else if (el.type === 'radio') {
      if (el.checked) o[el.name] = el.value;
    } else o[el.name] = el.value;
  });
  return o;
}

/* ---------- global event delegation ---------- */

document.addEventListener('click', e => {
  // close open dropdown menus when clicking anywhere
  document.querySelectorAll('details.dd[open]').forEach(d => { if (!d.contains(e.target) || e.target.closest('.dd-menu [data-act]')) d.open = false; });
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = A[el.dataset.act];
  if (fn) {
    e.preventDefault();
    fn(el.dataset, el, e);
  }
});

document.addEventListener('dblclick', e => {
  const el = e.target.closest('[data-dbl]');
  if (el && A[el.dataset.dbl]) A[el.dataset.dbl](el.dataset, el, e);
});

document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-submit]');
  if (!f) return;
  e.preventDefault();
  const fn = SUBMIT[f.dataset.submit];
  if (fn) fn(formData(f), f);
});

document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el && A[el.dataset.change]) A[el.dataset.change](el.dataset, el, e);
});

/* ---------- instances & tabs ---------- */

function inst(k) {
  return S.instances[k];
}

/* Extra browser tabs: { id, srv } in S.ui.xtabs, each with its own url and history.
   srv is the server the tab talks to (author, publish or dispatcher). */
const FIXED_TABS = ['desktop', 'author', 'publish', 'dispatcher'];
const xtabs = () => S.ui.xtabs || (S.ui.xtabs = []);
function srvOf(tab) {
  if (FIXED_TABS.includes(tab)) return tab;
  const x = xtabs().find(t => t.id === tab);
  return x ? x.srv : 'author';
}
// the tab that shows server k right now: the open extra tab when it talks to k
const tabFor = k => (srvOf(S.ui.tab) === k ? S.ui.tab : k);
const homeUrl = srv => (srv === 'author' ? '/aem/start.html' : SITE_ROOT + '.html');

function portOf(tab) {
  tab = srvOf(tab);
  if (tab === 'dispatcher') return 80;
  return inst(tab).port || (tab === 'author' ? 4502 : 4503);
}

function tabRunning(tab) {
  tab = srvOf(tab);
  if (tab === 'dispatcher') return inst('publish').running;
  return inst(tab).running;
}

A.tab = d => {
  S.ui.tab = d.tab;
  commit();
};

function openTab(srv, url, background) {
  if (xtabs().length >= 12) { toast('Close some tabs first (12 extra tabs max).', 'warn'); return; }
  S.ui.xseq = (S.ui.xseq || 0) + 1;
  const id = 'x' + S.ui.xseq;
  xtabs().push({ id, srv });
  S.ui.url[id] = url || homeUrl(srv);
  S.ui.hist[id] = [];
  if (!background) S.ui.tab = id;
  commit();
  if (background) toast('Opened in a new tab.');
}
A.newTab = () => {
  const s = srvOf(S.ui.tab);
  openTab(s === 'desktop' ? 'author' : s);
};
A.closeTab = d => {
  const list = xtabs();
  const i = list.findIndex(t => t.id === d.id);
  if (i < 0) return;
  list.splice(i, 1);
  delete S.ui.url[d.id];
  delete S.ui.hist[d.id];
  // like a browser: the tab on the left becomes active
  if (S.ui.tab === d.id) S.ui.tab = (list[i - 1] || list[i] || { id: 'author' }).id;
  commit();
};
A.dupTab = () => {
  if (S.ui.tab === 'desktop') return;
  openTab(srvOf(S.ui.tab), S.ui.url[S.ui.tab]);
};

// Short tab title from the URL, like the <title> a browser shows
const TAB_TITLES = [
  ['/aem/start.html', 'AEM Start'], ['/sites.html', 'Sites'], ['/editor.html', 'Editor'], ['/crx/de', 'CRXDE Lite'], ['/crx/packmgr', 'Package Manager'],
  ['/aem/experience-fragments.html', 'Experience Fragments'], ['/assets.html', 'Assets'], ['/system/console', 'Web Console'], ['/aem/inbox', 'Inbox'],
  ['/mnt/overlay/wcm/core/content/sites/createpagewizard', 'Create Page'], ['/mnt/overlay/wcm/core/content/sites/createlivecopywizard', 'Create Live Copy'],
  ['/mnt/overlay/wcm/core/content/sites/createsitewizard', 'Create Site'], ['/mnt/overlay/wcm/core/content/sites/createlanguagecopywizard', 'Create Language Copy'],
  ['/libs/cq/workflow', 'Workflow'], ['/libs/msm', 'MSM'], ['/aem/tools', 'Tools'], ['/libs/wcm/core/content/sites/templates', 'Templates'],
];
function tabTitle(tab) {
  const u = String(S.ui.url[tab] || '').split(/[?#]/)[0];
  const hit = TAB_TITLES.find(([p]) => u.startsWith(p));
  if (hit) return hit[1];
  const last = JCR.name(u).replace(/\.html$/, '');
  return last || 'localhost';
}

function go(url, tab, srv) {
  // a link that targets a server stays in the extra tab that shows that server
  if (tab && FIXED_TABS.includes(tab) && srvOf(S.ui.tab) === tab) tab = S.ui.tab;
  tab = tab || S.ui.tab;
  if (tab === 'desktop') return;
  const x = xtabs().find(t => t.id === tab);
  const cur = S.ui.url[tab];
  if (cur !== url || (x && srv && srv !== x.srv)) {
    // extra tabs remember the server too, so Back can return to another host
    S.ui.hist[tab].push(x ? { u: cur, s: x.srv } : cur);
    if (S.ui.hist[tab].length > 50) S.ui.hist[tab].shift();
  }
  if (x && srv) x.srv = srv;
  S.ui.url[tab] = url;
  S.ui.tab = tab;
  commit();
}

A.go = d => go(d.url, d.tab);
A.back = () => {
  const h = S.ui.hist[S.ui.tab];
  if (h && h.length) {
    const e = h.pop();
    const x = xtabs().find(t => t.id === S.ui.tab);
    S.ui.url[S.ui.tab] = typeof e === 'object' ? e.u : e;
    if (x && typeof e === 'object') x.srv = e.s;
    commit();
  }
};
A.reload = () => commit();
SUBMIT.addr = f => {
  let u = String(f.url || '').trim();
  // a full URL picks the server by its port: localhost:4502 author, :4503 publish, no port (80) dispatcher
  const m = u.match(/^(?:https?:\/\/)?localhost(?::(\d+))?(?=\/|$)/i);
  let srv = null;
  if (m) {
    const port = +(m[1] || 80);
    srv = port === portOf('author') ? 'author' : port === portOf('publish') ? 'publish' : port === 80 ? 'dispatcher' : null;
    if (!srv) { toast(`Nothing is listening on <b>localhost:${port}</b> in the lab.`, 'error'); return; }
  }
  u = u.replace(/^(?:https?:\/\/)?[^/]*localhost[^/]*/i, '').replace(/^https?:\/\/[^/]+/, '');
  if (!u.startsWith('/')) u = '/' + u;
  flag('addr:typed');
  const x = xtabs().find(t => t.id === S.ui.tab);
  if (x) go(u, x.id, srv);
  else go(u, srv || undefined);
};

// host picker of an extra tab: same path on another server
document.addEventListener('change', e => {
  const s = e.target.closest('[data-tabsrv]');
  if (!s) return;
  const x = xtabs().find(t => t.id === s.dataset.tabsrv);
  if (x) go(S.ui.url[x.id], x.id, s.value);
});

// Ctrl/Cmd + click or middle click on a link opens it in a new tab, like a browser
function openLinkInTab(e) {
  const el = e.target.closest('[data-act="go"][data-url]');
  if (!el || S.ui.tab === 'desktop') return false;
  e.preventDefault();
  e.stopImmediatePropagation();
  openTab(srvOf(el.dataset.tab ? tabFor(el.dataset.tab) : S.ui.tab), el.dataset.url, true);
  return true;
}
document.addEventListener('click', e => { if (e.ctrlKey || e.metaKey) openLinkInTab(e); }, true);
document.addEventListener('auxclick', e => { if (e.button === 1) openLinkInTab(e); }, true);

A.toggleLessons = () => {
  S.ui.lessonsOpen = !S.ui.lessonsOpen;
  commit();
};

A.resetLab = () => confirmBox('Reset the lab?', 'This deletes everything you did in the lab (pages, templates, progress) and starts from scratch.', () => {
  localStorage.removeItem(STORE_KEY);
  S = seedState();
  commit();
  toast('Lab reset.');
}, 'Reset');

/* ---------- render ---------- */

function labBar() {
  const tabs = [
    ['desktop', '🖥 Desktop (F:\\AEM)', true],
    ['author', `Author :${portOf('author')}`, tabRunning('author')],
    ['publish', `Publish :${portOf('publish')}`, tabRunning('publish')],
    ['dispatcher', 'Dispatcher :80', tabRunning('dispatcher')],
  ];
  return `<div class="labbar">
    <div class="brand">AEM Practice Lab <span>simulated · not real AEM</span></div>
    <div class="tabs">${tabs.map(([k, label, up]) => `<button class="tab ${S.ui.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">
      ${k === 'desktop' ? '' : `<i class="dot ${up ? 'up' : ''}"></i>`}${esc(label)}</button>`).join('')}
      ${xtabs().length ? '<span class="tab-sep"></span>' : ''}
      ${xtabs().map(t => `<button class="tab xtab ${S.ui.tab === t.id ? 'on' : ''}" data-act="tab" data-tab="${t.id}" title="http://localhost${t.srv === 'dispatcher' ? '' : ':' + portOf(t.id)}${esc(S.ui.url[t.id] || '')}">
        <i class="dot ${tabRunning(t.id) ? 'up' : ''}"></i><span class="xt-title">${esc(tabTitle(t.id))}</span><small>:${portOf(t.id)}</small>
        <span class="tab-x" data-act="closeTab" data-id="${t.id}" title="Close tab">✕</span></button>`).join('')}
      <button class="tab tab-new" data-act="newTab" title="New tab">+</button></div>
    <div class="spacer"></div>
    <button class="tab" data-act="toggleLessons">📘 ${S.ui.lessonsOpen ? 'Hide' : 'Show'} lessons</button>
    <button class="tab" data-act="resetLab" title="Start the lab from scratch">↺ Reset</button>
  </div>`;
}

function browserView(tab) {
  const url = S.ui.url[tab];
  const srv = srvOf(tab);
  const hostOf = s => `http://localhost${s === 'dispatcher' ? '' : ':' + portOf(s)}`;
  let body;
  if (!tabRunning(tab)) {
    body = `<div class="refused"><div class="big">😕</div><h2>This site can’t be reached</h2>
      <p><b>localhost</b> refused to connect.</p><p class="muted">ERR_CONNECTION_REFUSED</p>
      <p>The ${srv === 'dispatcher' ? 'Publish instance (behind the dispatcher)' : esc(srv) + ' instance'} is not running.
      Start it from the <a href="#" data-act="tab" data-tab="desktop">Desktop</a> tab.</p></div>`;
  } else {
    body = srv === 'author' ? routeAuthor(url) : srv === 'publish' ? routePublish(url) : routeDispatcher(url);
  }
  // an extra tab can switch its server; the fixed tabs always show their own
  const host = FIXED_TABS.includes(tab)
    ? `<span class="host">${esc(hostOf(srv))}</span>`
    : `<select class="host host-sel" data-tabsrv="${tab}" title="Server">${['author', 'publish', 'dispatcher'].map(s => `<option value="${s}" ${s === srv ? 'selected' : ''}>${esc(hostOf(s))}</option>`).join('')}</select>`;
  return `<div class="browser">
    <form class="addr" data-submit="addr">
      <button type="button" class="ab" data-act="back" title="Back">←</button>
      <button type="button" class="ab" data-act="reload" title="Reload">↻</button>
      ${host}<input name="url" value="${esc(url)}" spellcheck="false" autocomplete="off">
      <button type="button" class="ab" data-act="dupTab" title="Duplicate this tab">⧉</button>
      <button class="ab go">Go</button>
    </form>
    ${srv === 'author' && S.loggedIn && curUser() !== 'admin' ? `<div class="imp-bar">${icon('User', 14)} Impersonating <b>${esc(curUser())}</b> — you see only what this user may see and do. <a href="#" data-act="revertSelf">Revert to Self</a></div>` : ''}
    <div class="viewport" id="vp">${body}</div>
  </div>`;
}

function render() {
  const app = document.getElementById('app');
  const vp = document.getElementById('vp') || document.querySelector('.desktop');
  const lsb = document.querySelector('.ls-body');
  const keep = { vp: vp ? vp.scrollTop : 0, ls: lsb ? lsb.scrollTop : 0, key: S.ui.tab + S.ui.url[S.ui.tab] };
  // inner scroll panels keep their position when the same screen is re-rendered
  const PANELS = ['.crx-props', '.columns', '.col', '.sp-body', '.pm-list', '.agrid', '.cfm-form', '.cf-form', '.gql-side', '.tool-cards', '.aem-body', '.rail'];
  const panelScroll = PANELS.map(sel => [...document.querySelectorAll(sel)].map(el => [el.scrollTop, el.scrollLeft]));
  const screenKey = S.ui.tab + (S.ui.url[S.ui.tab] || '').split('#')[0];
  const crxTree = document.querySelector('.crx-tree');
  if (crxTree) FRAME_SCROLL['crx:' + S.ui.tab] = crxTree.scrollTop;
  AFTER = [];
  const main = S.ui.tab === 'desktop' ? desktopView() : browserView(S.ui.tab);
  app.innerHTML = labBar() + `<div class="main">${main}${S.ui.lessonsOpen ? lessonsPanel() : ''}</div>`;
  const vp2 = document.getElementById('vp') || document.querySelector('.desktop');
  if (vp2 && keep.key === render.lastKey) vp2.scrollTop = keep.vp;
  const lsb2 = document.querySelector('.ls-body');
  if (lsb2) lsb2.scrollTop = keep.ls;
  render.lastKey = keep.key;
  if (screenKey === render.lastScreen) {
    PANELS.forEach((sel, i) => document.querySelectorAll(sel).forEach((el, j) => {
      const s = panelScroll[i][j];
      if (s) { el.scrollTop = s[0]; el.scrollLeft = s[1]; }
    }));
  }
  render.lastScreen = screenKey;
  AFTER.forEach(fn => fn());
  // keep terminals scrolled to the bottom and the active one focused
  document.querySelectorAll('.term, .pm-log-body').forEach(t => { t.scrollTop = t.scrollHeight; });
  const input = document.querySelector(`.term-in[data-k="${render.termFocus || ''}"] input[name=cmd]`);
  if (input && !MODAL) input.focus();
}

// Mounts a full HTML document into an iframe, keeping its scroll position between re-renders
function frameHtml(id) {
  return `<iframe class="frame" id="${id || 'frame'}" title="page"></iframe>`;
}

function mountFrame(doc, onLoad, id) {
  AFTER.push(() => {
    const f = document.getElementById(id || 'frame');
    if (!f) return;
    const key = S.ui.tab + '|' + S.ui.url[S.ui.tab];
    f.onload = () => {
      const w = f.contentWindow;
      w.scrollTo(0, FRAME_SCROLL[key] || 0);
      w.addEventListener('scroll', () => { FRAME_SCROLL[key] = w.scrollY; });
      if (onLoad) onLoad(f.contentDocument, f);
    };
    f.srcdoc = doc;
  });
}

// Links inside a rendered page navigate inside the lab
function wireViewLinks(d, toUrl) {
  d.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    const url = href && href.startsWith('/') ? (toUrl ? toUrl(href) : href) : null;
    if (url) go(url);
  });
}

/* ---------- Desktop: quickstart folders + terminal (video #5) ---------- */

function desktopView() {
  return `<div class="desktop">
    <div class="desk-head">
      <h2>F:\\AEM — your local AEM instances</h2>
      <p>AEM ships as one <code>.jar</code>. The <b>file name</b> decides the instance type (run mode) and the port. Rename the jar, then start it with <code>java -jar</code>.</p>
      <button class="btn quiet small" data-act="quickStartAll" title="Skip lesson #5">⚡ Skip: rename &amp; start both with defaults</button>
    </div>
    <div class="desk-grid">${instancePanel('author')}${instancePanel('publish')}</div>
  </div>`;
}

function instancePanel(k) {
  const I = inst(k);
  const files = [
    { name: I.jar, icon: '☕', size: '612 MB', jar: true },
    { name: 'license.properties', icon: '📄', size: '1 KB' },
  ];
  if (I.installed) files.push({ name: 'crx-quickstart', icon: '📁', size: '' });
  const status = I.running
    ? `<span class="pill green">● Running</span> on <a href="#" data-act="openInst" data-k="${k}">http://localhost:${I.port}</a>
       <span class="muted">run modes: ${esc(I.runModes.join(', '))}</span>`
    : I.starting ? '<span class="pill orange">● Starting…</span>' : '<span class="pill grey">● Stopped</span>';
  return `<div class="inst">
    <div class="inst-head"><b>${esc(I.folder)}</b> ${status}</div>
    <table class="files"><tr><th>Name</th><th>Size</th><th></th></tr>
      ${files.map(f => `<tr><td>${f.icon} ${esc(f.name)}</td><td class="muted">${f.size}</td>
        <td>${f.jar && !I.running && !I.starting ? `<button class="btn quiet small" data-act="renameJar" data-k="${k}">Rename</button>` : ''}</td></tr>`).join('')}
    </table>
    <div class="term" id="term-${k}">${I.term.map(l => `<div class="${l.c || ''}">${esc(l.t)}</div>`).join('')}</div>
    <form class="term-in" data-submit="term" data-k="${k}">
      <span>${esc(I.folder)}&gt;</span><input name="cmd" autocomplete="off" spellcheck="false" placeholder="${I.running ? 'type stop to shut the instance down' : 'e.g. dir, ren, java -jar …'}" ${I.starting ? 'disabled' : ''}>
      <input type="hidden" name="k" value="${k}">
    </form>
    <div class="inst-actions">
      ${I.running ? `<button class="btn" data-act="openInst" data-k="${k}">Open in browser</button><button class="btn quiet" data-act="stopInst" data-k="${k}">Stop (Ctrl+C)</button>` : ''}
    </div>
  </div>`;
}

function termPrint(k, t, c) {
  const I = inst(k);
  I.term.push({ t, c });
  if (I.term.length > 160) I.term.splice(0, I.term.length - 160);
}

A.openInst = d => {
  S.ui.tab = d.k;
  commit();
};

A.renameJar = d => {
  const I = inst(d.k);
  openModal({
    title: 'Rename file',
    body: `<label class="field"><span>New name</span><input name="name" value="${esc(I.jar)}"></label>
      <p class="hint">Pattern: <code>aem-&lt;runmode&gt;-p&lt;port&gt;.jar</code> — for example <code>aem-${d.k}-p${d.k === 'author' ? 4502 : 4503}.jar</code></p>`,
    okLabel: 'Rename',
    ok: b => {
      const name = formData(b).name.trim();
      if (!/\.jar$/i.test(name)) { toast('The file must keep the .jar extension.', 'error'); return false; }
      termPrint(d.k, `${I.folder}>ren ${I.jar} ${name}`, 'cmd');
      I.jar = name;
      commit();
    },
  });
};

A.stopInst = d => stopInstance(d.k);

function stopInstance(k) {
  const I = inst(k);
  if (!I.running) return;
  termPrint(k, '^C', 'cmd');
  termPrint(k, 'Stopping Quickstart… shutdown complete.');
  I.running = false;
  commit();
}

A.quickStartAll = () => {
  for (const k of ['author', 'publish']) {
    const I = inst(k);
    if (I.running) continue;
    const jar = `aem-${k}-p${k === 'author' ? 4502 : 4503}.jar`;
    I.jar = jar;
    termPrint(k, `${I.folder}>java -jar ${jar}`, 'cmd');
    applyStart(k, k, k === 'author' ? 4502 : 4503, []);
    termPrint(k, `Quickstart started (skipped). http://localhost:${I.port}/`, 'ok');
  }
  processQueue();
  commit();
  toast('Both instances are running. Login on Author with <b>admin / admin</b>.');
};

SUBMIT.term = f => {
  const k = f.k;
  const I = inst(k);
  const cmd = String(f.cmd || '').trim();
  render.termFocus = k;
  if (!cmd) return;
  termPrint(k, `${I.folder}>${cmd}`, 'cmd');
  const parts = cmd.split(/\s+/);
  const c0 = parts[0].toLowerCase();
  if (c0 === 'cls' || c0 === 'clear') I.term = [];
  else if (c0 === 'help') {
    ['Commands: dir | ls, ren <old> <new> | mv <old> <new>, java -version, java -jar <file> [-r <modes>] [-p <port>], stop, cls'].forEach(t => termPrint(k, t));
  } else if (c0 === 'dir' || c0 === 'ls') {
    termPrint(k, ` Directory of ${I.folder}`);
    termPrint(k, `   ${I.jar}`);
    termPrint(k, '   license.properties');
    if (I.installed) termPrint(k, '   <DIR> crx-quickstart');
  } else if (c0 === 'ren' || c0 === 'rename' || c0 === 'mv' || c0 === 'move') {
    const [from, to] = [parts[1], parts[2]];
    if (!from || !to) termPrint(k, 'The syntax of the command is incorrect.', 'err');
    else if (from !== I.jar) termPrint(k, 'The system cannot find the file specified.', 'err');
    else if (!/\.jar$/i.test(to)) termPrint(k, 'Keep the .jar extension (the lab only accepts .jar names).', 'err');
    else if (I.running) termPrint(k, 'The process cannot access the file because it is being used by another process.', 'err');
    else I.jar = to;
  } else if (c0 === 'java' && parts[1] === '-version') {
    termPrint(k, 'openjdk version "11.0.24" 2024-07-16 LTS');
    termPrint(k, 'OpenJDK Runtime Environment Temurin-11.0.24+8 (build 11.0.24+8)');
    termPrint(k, '(AEM 6.5 runs on Java 8/11. The AEM as a Cloud Service SDK uses Java 21.)', 'muted');
  } else if (c0 === 'java' && parts[1] === '-jar') {
    startFromCommand(k, parts.slice(2));
  } else if (c0 === 'stop') {
    stopInstance(k);
    return;
  } else termPrint(k, `'${parts[0]}' is not recognized as an internal or external command, operable program or batch file.`, 'err');
  commit();
};

function startFromCommand(k, args) {
  const I = inst(k);
  const jar = args[0];
  if (I.running || I.starting) return termPrint(k, 'Quickstart is already running in this folder.', 'err');
  if (!jar) return termPrint(k, 'Error: -jar requires jar file specification', 'err');
  if (jar !== I.jar) return termPrint(k, `Error: Unable to access jarfile ${jar}`, 'err');
  let role = /publish/i.test(jar) ? 'publish' : 'author';
  const pm = jar.match(/-p(\d{2,5})(?=[-.])/i);
  let port = pm ? +pm[1] : 4502;
  let extra = [];
  for (let i = 1; i < args.length; i++) {
    if ((args[i] === '-r' || args[i] === '-runmode') && args[i + 1]) {
      const modes = args[++i].split(',').map(s => s.trim()).filter(Boolean);
      if (modes.includes('publish')) role = 'publish';
      else if (modes.includes('author')) role = 'author';
      extra = modes.filter(m => m !== 'author' && m !== 'publish');
    } else if ((args[i] === '-p' || args[i] === '-port') && args[i + 1]) port = +args[++i];
  }
  if (role !== k) {
    termPrint(k, `This jar would start a ${role.toUpperCase()} instance.`, 'err');
    termPrint(k, `In this lab the ${I.folder} folder must run as ${k}. Rename it, e.g. aem-${k}-p${k === 'author' ? 4502 : 4503}.jar`, 'err');
    return;
  }
  if (I.installed && I.role && I.role !== role) {
    termPrint(k, `Installation run modes are fixed after the first start (this one was installed as ${I.role}).`, 'err');
    return;
  }
  const other = inst(k === 'author' ? 'publish' : 'author');
  if ((other.running || other.starting) && other.port === port) {
    termPrint(k, `java.net.BindException: Address already in use: bind (port ${port} is used by the ${other.key} instance)`, 'err');
    return;
  }
  const lines = [
    ['Loading quickstart properties: default'],
    ['Low-memory action set to fork'],
    ['Using 64bit VM settings, min.heap=1024MB, default fork arguments=[-Xmx1024m]'],
    [`Setting properties from filename '${jar}'`],
    pm ? [`Option '-quickstart.server.port' set to '${pm[1]}' from filename ${jar}`] : ['No port in file name — using the default port 4502'],
    /publish|author/i.test(jar) ? [`Option '-runmode' set to '${role}' from filename ${jar}`] : ['No run mode in file name — defaulting to author'],
    I.installed ? ['crx-quickstart found — starting existing installation'] : ['Extracting files to crx-quickstart… (first start: 5–15 min in real life)'],
    ['Starting Apache Felix OSGi framework…'],
    [`Sling run modes: [${[role, 'crx3', 'crx3tar', 'samplecontent', ...extra].join(', ')}]`],
    ['Starting Jetty HTTP service…'],
    [`Quickstart started. http://localhost:${port}/`, 'ok'],
  ];
  I.starting = true;
  render.termFocus = k;
  let i = 0;
  const tick = () => {
    if (!inst(k).starting) return;
    const [t, c] = lines[i++];
    termPrint(k, t, c);
    if (i < lines.length) {
      commit();
      setTimeout(tick, 280);
    } else {
      applyStart(k, role, port, extra);
      processQueue();
      commit();
      toast(`${k === 'author' ? 'Author' : 'Publish'} is up on <b>http://localhost:${port}</b>${k === 'author' ? ' — login with admin / admin' : ''}.`);
    }
  };
  setTimeout(tick, 200);
}

function applyStart(k, role, port, extra) {
  const I = inst(k);
  Object.assign(I, { role, port, running: true, starting: false, installed: true, runModes: [role, 'crx3', 'crx3tar', 'samplecontent', ...extra] });
  flag(`start:${k}`);
  if (k === 'author' && port === 4502) flag('start:author:4502');
  if (k === 'publish' && port === 4503) flag('start:publish:4503');
  if (extra.length) flag('runmode:extra');
  if (k === 'publish') {
    const a = JCR.get(AR(), '/etc/replication/agents.author/publish/jcr:content');
    if (a && !String(a.props.transportUri).includes(':' + port + '/')) {
      toast(`Note: the replication agent still points to <code>${esc(a.props.transportUri)}</code>. Publish runs on port ${port}.`, 'warn');
    }
  }
}
