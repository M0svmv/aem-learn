/* Publish & dispatcher routes, Sling URL handling, replication, versions, workflow, web console, CRXDE Lite */

/* ---------- Sling URL resolution ---------- */

function resolveUrl(r, path) {
  if (JCR.get(r, path)) return { res: path, ext: '' };
  const last = path.lastIndexOf('/');
  let i = path.indexOf('.', last);
  while (i >= 0) {
    const res = path.slice(0, i);
    if (JCR.get(r, res)) return { res, ext: path.slice(i + 1) };
    i = path.indexOf('.', i + 1);
  }
  return null;
}

function slingNotFound(path, extra) {
  flag('sling:404');
  // a mistyped persisted-query URL is a common slip: point at the right shape
  if (!extra && /^\/graphql\//.test(path) && !/^\/graphql\/execute\.json\/[^/]+\/[^/]+/.test(path)) {
    extra = `<p>Persisted queries live at <code>/graphql/execute.json/&lt;config&gt;/&lt;query-name&gt;</code>, e.g. <a href="#" data-act="go" data-url="/graphql/execute.json/wknd/adventures-all">/graphql/execute.json/wknd/adventures-all</a>. Check the spelling of <b>execute</b>.</p>`;
  }
  return `<div class="sling-err"><h1>Not Found (404)</h1><p>Cannot serve request to <code>${esc(path)}</code></p>
    <p class="muted">Sling could not resolve this URL to a resource in the repository${extra ? '' : ' (check the path in CRXDE)'}.</p>${extra || ''}</div>`;
}

function jsonView(path, obj, note) {
  return `<div class="jsonview"><div class="jv-head"><code>${esc(path)}</code>${note ? ` <span class="muted">${note}</span>` : ''}</div><pre>${esc(JSON.stringify(obj, null, 2))}</pre></div>`;
}

function jsonDepth(ext) {
  if (/(^|\.)infinity\.json$/.test(ext)) return -1;
  const m = ext.match(/(?:^|\.)(\d+)\.json$/);
  return m ? +m[1] : 0;
}

function contentRoute(k, path, query) {
  const r = S.repos[k];
  const m = resolveUrl(r, path);
  if (!m) return slingNotFound(path);
  const node = JCR.get(r, m.res);
  const type = JCR.type(node);
  const ext = m.ext;
  if (ext.endsWith('json')) {
    if (ext === 'model.json') {
      if (type !== 'cq:Page') return slingNotFound(path, '<p>.model.json is served for pages in this lab.</p>');
      flag('json:model');
      return jsonView(path, pageModel(r, m.res), 'Sling Model Exporter — what a headless/SPA front end (e.g. Next.js) reads');
    }
    flag('json:view');
    if (ext.includes('infinity')) flag('json:infinity');
    return jsonView(path, JCR.toJSON(node, jsonDepth(ext)), `Sling default GET servlet · depth ${jsonDepth(ext) < 0 ? 'infinity' : jsonDepth(ext)}`);
  }
  if (ext === 'html' || ext === '') {
    if (type === 'cq:Page') {
      const c = JCR.get(node, 'jcr:content');
      if (c && c.props.redirectTarget && !(query || '').includes('wcmmode')) {
        return `<div class="sling-err"><h1>302 Found</h1><p>Location: <a href="#" data-act="go" data-url="${esc(c.props.redirectTarget)}.html">${esc(c.props.redirectTarget)}.html</a></p>
          <p class="muted">This page has a <b>Redirect</b> set in its page properties.</p></div>`;
      }
      flag(k === 'publish' ? 'view:publish' : 'view:author');
      if (k === 'publish') S.events['viewpub:' + m.res] = Date.now();
      mountFrame(pageDoc(r, m.res, 'view'), d => wireViewLinks(d));
      return `<div class="pageview">${frameHtml()}</div>`;
    }
    if (type === 'dam:Asset') {
      return `<div class="assetview"><img src="${assetSrc(r, m.res)}" alt=""><p><code>${esc(m.res)}</code></p></div>`;
    }
    if (type === 'nt:file') {
      return `<div class="jsonview"><div class="jv-head"><code>${esc(path)}</code></div><pre>${esc(readFile(r, m.res) || '')}</pre></div>`;
    }
    return slingNotFound(path, `<p>The resource exists (<code>${esc(type)}</code>) but has no HTML rendering here. Try <a href="#" data-act="go" data-url="${esc(m.res)}.1.json">${esc(m.res)}.1.json</a>.</p>`);
  }
  return slingNotFound(path);
}

/* ---------- Publish instance ---------- */

function pubShell(title, body) {
  return `<div class="aem pub"><div class="shell-head"><span class="shell-brand"><span class="brand-mark"></span>Publish instance</span><span class="shell-sub">${title}</span></div><div class="aem-body">${body}</div></div>`;
}

function routePublish(url) {
  const [path, query] = url.split('?');
  if (path.startsWith('/crx/packmgr')) return packMgrScreen('publish');
  if (path.startsWith('/graphql/execute.json/')) return graphqlRoute('publish', path);
  if (path.startsWith('/frontend/')) return frontendRoute('publish', path);
  if (path === '/bin/querybuilder.json') return querybuilderJson('publish', query);
  if (path.startsWith('/crx/de')) return crxdeScreen('publish', url);
  if (path.startsWith('/system/console')) return webConsole('publish', path);
  if (path.startsWith('/etc/replication')) return replicationScreen('publish', path);
  if (/^\/(sites|assets|editor)\.html|^\/aem\/|^\/libs\/wcm|^\/libs\/cq/.test(path)) {
    return pubShell('Not for authoring', `<div class="pad"><h3>Authoring happens on Author</h3><p>Publish serves the live site to visitors. Pages, templates and assets reach it through <b>replication</b> (publishing).</p>
      <p><a href="#" data-act="go" data-url="${SITE_ROOT}.html">Open ${SITE_ROOT}.html</a></p></div>`);
  }
  if (path === '/') {
    return pubShell('Welcome', `<div class="pad"><h3>Publish · localhost:${portOf('publish')}</h3><ul class="links">
      <li><a href="#" data-act="go" data-url="${SITE_ROOT}.html">${SITE_ROOT}.html</a> — the live site</li>
      <li><a href="#" data-act="go" data-url="${SITE_ROOT}.model.json">${SITE_ROOT}.model.json</a> — JSON for headless</li>
      <li><a href="#" data-act="go" data-url="/crx/de/index.jsp">CRXDE Lite</a> — the publish repository</li>
      <li><a href="#" data-act="go" data-url="/etc/replication/agents.publish.html">Replication agents (Dispatcher Flush)</a></li>
      <li><a href="#" data-act="go" data-url="/system/console/status-slingsettings">Sling Settings (run modes)</a></li></ul></div>`);
  }
  return contentRoute('publish', path, query);
}

/* ---------- Dispatcher ---------- */

const DISPATCHER_ANY = `/farms {
  /publishfarm {
    /virtualhosts { "*" }
    /renders { /rend01 { /hostname "localhost" /port "4503" } }

    /filter {
      /0001 { /type "deny"  /url "*" }
      /0010 { /type "allow" /path "/content/*" /extension '(html|json|svg|png|jpg)' }
      /0011 { /type "allow" /path "/etc.clientlibs/*" }
      /0012 { /type "allow" /method "GET" /url "/graphql/execute.json/*" }
      /0020 { /type "deny"  /selectors '(infinity|tidy|[0-9]+)' /extension "json" }
      /0021 { /type "allow" /selectors "model" /extension "json" }
    }

    /cache {
      /docroot "/var/www/html"
      /statfileslevel "2"
      /rules { /0000 { /glob "*" /type "allow" } }
      /invalidate { /0000 { /glob "*" /type "deny" } /0001 { /glob "*.html" /type "allow" } /0002 { /glob "*.json" /type "allow" } }
      /allowedClients { /0000 { /glob "*.*.*.*" /type "deny" } /0001 { /glob "127.0.0.1" /type "allow" } }
    }
  }
}`;

function dispatcherAllows(path) {
  if (path.startsWith('/graphql/execute.json/')) return { ok: true };
  if (!path.startsWith('/content/')) return { ok: false, rule: '/0001 deny * (only /content and persisted queries are allowed)' };
  if (/\.json$/.test(path)) {
    if (/\.model\.json$/.test(path)) return { ok: true };
    return { ok: false, rule: '/0020 deny .json with selectors (infinity, tidy, depth) / plain .json' };
  }
  if (!/\.(html|svg|png|jpg)$/.test(path)) return { ok: false, rule: '/0010 extension not allowed' };
  return { ok: true };
}

function renderFromPublish(path) {
  const r = PR();
  if (path.startsWith('/graphql/execute.json/')) {
    const res = persistedResult(r, path);
    return res.status === 200 ? { type: 'json', body: JSON.stringify(res.body, null, 2) } : null;
  }
  const m = resolveUrl(r, path);
  if (!m) return null;
  const node = JCR.get(r, m.res);
  const type = JCR.type(node);
  if (m.ext === 'html' && type === 'cq:Page') {
    const c = JCR.get(node, 'jcr:content');
    if (c && c.props.redirectTarget) return { type: 'redirect', body: c.props.redirectTarget + '.html' };
    return { type: 'html', body: pageDoc(r, m.res, 'view') };
  }
  if (m.ext === 'model.json' && type === 'cq:Page') return { type: 'json', body: JSON.stringify(pageModel(r, m.res), null, 2) };
  if (m.ext === '' && type === 'dam:Asset') return { type: 'asset', body: assetSrc(r, m.res) };
  return null;
}

function routeDispatcher(url) {
  const path = url.split('?')[0];
  flag('visit:dispatcher');
  if (path === '/') {
    return `<div class="sling-err"><h1>Dispatcher · localhost:80</h1><p>The web server in front of Publish: it filters requests and caches responses.</p>
      <p><a href="#" data-act="go" data-url="${SITE_ROOT}.html">${SITE_ROOT}.html</a> · <a href="#" data-act="dispAny">View dispatcher.any</a></p></div>`;
  }
  const allow = dispatcherAllows(path);
  if (!allow.ok) {
    flag('dispatcher:blocked');
    return `<div class="sling-err"><h1>404 Not Found</h1><p>The requested URL <code>${esc(path)}</code> was not found on this server.</p>
      <p class="muted">Apache/2.4 (Dispatcher) — blocked by filter rule <code>${esc(allow.rule)}</code>. Filters stop visitors from reaching CRXDE, the OSGi console, raw JSON, etc.</p>
      <p><a href="#" data-act="dispAny">View dispatcher.any</a></p></div>`;
  }
  let entry = S.cache[path];
  const hit = !!entry;
  const fresh = renderFromPublish(path);
  if (!hit) {
    if (!fresh) return slingNotFound(path, '<p class="muted">Publish returned 404, so the dispatcher did not cache anything.</p>');
    entry = { type: fresh.type, body: fresh.body, at: now() };
    if (fresh.type !== 'redirect') {
      S.cache[path] = entry;
      save();
    }
  }
  const stale = hit && (!fresh || fresh.body !== entry.body);
  if (stale) flag('dispatcher:stale');
  if (hit) flag('dispatcher:hit');
  if (path.startsWith('/graphql/')) flag('dispatcher:gql');
  const strip = `<div class="disp-strip ${stale ? 'stale' : ''}">
    <b>X-Cache: ${hit ? 'HIT' : 'MISS'}</b>
    <span>${hit ? `served from <code>/var/www/html${esc(path)}</code> (cached ${fmtDate(entry.at)})` : 'fetched from Publish (localhost:' + portOf('publish') + ') and stored in the cache'}</span>
    ${stale ? '<span class="warn">⚠ Publish has a newer version. The cache was not invalidated — is the Dispatcher Flush agent enabled?</span>' : ''}
    <span class="spacer"></span>
    <button class="btn small" data-act="dispInvalidate" data-path="${esc(path)}">Invalidate this file</button>
    <button class="btn small" data-act="dispClear">Clear whole cache</button>
    <button class="btn small quiet" data-act="dispAny">dispatcher.any</button></div>`;
  if (entry.type === 'redirect') return strip + `<div class="sling-err"><h1>302</h1><a href="#" data-act="go" data-url="${esc(entry.body)}">${esc(entry.body)}</a></div>`;
  if (entry.type === 'json') return strip + `<div class="jsonview"><pre>${esc(entry.body)}</pre></div>`;
  if (entry.type === 'asset') return strip + `<div class="assetview"><img src="${entry.body}" alt=""></div>`;
  mountFrame(entry.body, d => wireViewLinks(d));
  return `<div class="pageview with-strip">${strip}${frameHtml()}</div>`;
}

A.dispClear = () => {
  S.cache = {};
  toast('Dispatcher cache cleared (docroot emptied).');
  commit();
};
A.dispInvalidate = d => {
  flag('dispatcher:invalidate');
  delete S.cache[d.path];
  toast('Invalidated. The next request goes to Publish.');
  commit();
};
A.dispAny = () => flag('dispatcher:any') || openModal({ title: 'dispatcher.any (simplified)', hideOk: true, cancelLabel: 'Close', wide: true, body: `<pre class="code">${esc(DISPATCHER_ANY)}</pre>` });

/* ---------- Replication ---------- */

const AUTHOR_AGENT = '/etc/replication/agents.author/publish';
const FLUSH_AGENT = '/etc/replication/agents.publish/flush';

function agentNode(k) {
  return JCR.get(S.repos[k], (k === 'author' ? AUTHOR_AGENT : FLUSH_AGENT) + '/jcr:content');
}

function agentEnabled(k) {
  const n = agentNode(k);
  return !!n && (n.props.enabled === true || n.props.enabled === 'true');
}

function agentLog(k, msg, level) {
  S.agentLog[k].push({ t: now(), msg, level: level || 'info' });
  if (S.agentLog[k].length > 150) S.agentLog[k].splice(0, S.agentLog[k].length - 150);
}

function transportPort(uri) {
  const m = String(uri || '').match(/:\/\/[^/:]+:(\d+)/);
  return m ? +m[1] : 80;
}

function queueReplication(action, paths) {
  for (const p of paths) {
    S.queue.push({ id: uid(), action, path: p, status: 'pending', added: now(), tries: 0 });
    agentLog('author', `Queued ${action} of ${p}`);
  }
  processQueue();
}

// Items queued while the queue is being processed (e.g. MSM "Activate on Blueprint activation")
// are picked up by the running loop instead of starting a nested one
let QUEUE_BUSY = false;
function processQueue() {
  if (QUEUE_BUSY) return;
  QUEUE_BUSY = true;
  try {
    processQueueItems();
  } finally {
    QUEUE_BUSY = false;
  }
}

function processQueueItems() {
  const ap = (agentNode('author') || { props: {} }).props;
  for (const item of S.queue) {
    if (item.status === 'done') continue;
    if (!agentEnabled('author')) {
      if (item.status !== 'blocked') agentLog('author', `Agent is disabled — ${item.path} is waiting in the queue.`, 'warn');
      item.status = 'blocked';
      item.msg = 'Agent is disabled — the queue is paused';
      flag('queue:blocked');
      return;
    }
    const port = transportPort(ap.transportUri);
    const pub = inst('publish');
    if (!pub.running || pub.port !== port) {
      item.status = 'error';
      item.tries++;
      item.msg = `Connection refused: localhost:${port}`;
      agentLog('author', `Error while sending ${item.path}: java.net.ConnectException: Connection refused (localhost:${port}). Queue is blocked.`, 'error');
      flag('queue:error');
      return;
    }
    const wasStuck = item.status === 'blocked' || item.status === 'error';
    const ok = item.action === 'Activate' ? doActivate(item.path) : doDeactivate(item.path);
    item.status = 'done';
    item.done = now();
    item.msg = ok ? 'Replication (' + item.action + ') of ' + item.path + ' successful' : 'Nothing to replicate';
    agentLog('author', `>> ${item.action} ${item.path} → ${ap.transportUri} … ${ok ? 'OK' : 'skipped'}`);
    if (wasStuck) flag('queue:resumed');
    if (ok) flushDispatcher(item.path);
  }
  const done = S.queue.filter(q => q.status === 'done');
  if (done.length > 40) {
    const drop = new Set(done.slice(0, done.length - 40).map(q => q.id));
    S.queue = S.queue.filter(q => !drop.has(q.id));
  }
}

function doActivate(path) {
  const a = AR();
  const p = PR();
  const src = JCR.get(a, path);
  if (!src) return false;
  const type = JCR.type(src);
  const c = JCR.get(src, 'jcr:content');
  if (c) Object.assign(c.props, { 'cq:lastReplicated': now(), 'cq:lastReplicatedBy': 'admin', 'cq:lastReplicationAction': 'Activate' });
  const copy = JCR.clone(src);
  if (type === 'cq:Page') {
    copy.children = copy.children.filter(ch => JCR.type(ch) !== 'cq:Page');
    const existing = JCR.get(p, path);
    if (existing) copy.children.push(...existing.children.filter(ch => JCR.type(ch) === 'cq:Page'));
    createVersion(path, 'Activated', 'Version created automatically on publish', true);
    flag('published:page');
    if (typeof msmAfterActivate === 'function') msmAfterActivate(path);
    S.events['pub:' + path] = Date.now();
  }
  let acc = '';
  for (const s of JCR.segs(JCR.parent(path))) {
    acc += '/' + s;
    if (!JCR.get(p, acc)) JCR.put(p, JCR.parent(acc), JCR.node(s, { 'jcr:primaryType': JCR.type(JCR.get(a, acc)) || 'nt:unstructured' }));
  }
  JCR.put(p, JCR.parent(path), copy);
  if (type === 'cq:Template') {
    const pol = JCR.get(a, POLICY_ROOT);
    if (pol) JCR.put(p, JCR.parent(POLICY_ROOT), JCR.clone(pol));
    flag('published:template');
  }
  if (type === 'dam:Asset') flag('published:asset');
  return true;
}

function doDeactivate(path) {
  const c = pcOf(AR(), path);
  if (c && JCR.type(JCR.get(AR(), path)) === 'cq:Page' && typeof msmAfterDeactivate === 'function') msmAfterDeactivate(path);
  if (c) Object.assign(c.props, { 'cq:lastReplicated': now(), 'cq:lastReplicatedBy': 'admin', 'cq:lastReplicationAction': 'Deactivate' });
  const removed = JCR.remove(PR(), path);
  if (removed) flag('unpublished');
  return removed;
}

function flushDispatcher(path) {
  if (!inst('publish').running) return;
  if (agentEnabled('publish')) {
    const keys = Object.keys(S.cache).filter(k => k.startsWith('/content') || k.startsWith('/graphql'));
    keys.forEach(k => delete S.cache[k]);
    agentLog('publish', `Flush after ${path}: dispatcher invalidated ${keys.length} cached file(s) (statfile touched).`);
  } else {
    agentLog('publish', `Flush agent is DISABLED — the dispatcher was not told that ${path} changed.`, 'warn');
    flag('flush:skipped');
  }
}

// Replication pages are still Classic UI in AEM 6.5
function classicShell(title, body) {
  return `<div class="classic"><div class="classic-head"><span class="brand-mark"></span>${title}</div><div class="classic-body">${body}</div></div>`;
}

function replicationScreen(k, path) {
  const base = k === 'author' ? '/etc/replication/agents.author' : '/etc/replication/agents.publish';
  const agentPath = k === 'author' ? AUTHOR_AGENT : FLUSH_AGENT;
  const wrap = classicShell;
  flag('visit:replication:' + k);
  if (path === agentPath + '.html') return agentScreen(k, wrap);
  const n = agentNode(k);
  const on = agentEnabled(k);
  return wrap('Replication', `<div class="pad"><h3>Agents on ${k}</h3>
    <p class="muted">${k === 'author' ? 'Agents on author send content to publish instances.' : 'Agents on publish tell the dispatcher which cached files are outdated.'}</p>
    <table class="grid"><tr><th>Agent</th><th>Status</th><th>Transport URI</th></tr>
    <tr data-act="go" data-url="${agentPath}.html"><td><b>${esc(n.props['jcr:title'])}</b><br><small class="muted">${agentPath}</small></td>
      <td>${on ? '<span class="pill green">Enabled</span>' : '<span class="pill grey">Disabled</span>'}</td><td><code>${esc(n.props.transportUri)}</code></td></tr></table>
    ${path !== base + '.html' ? `<p class="hint">(Showing the agents of <code>${base}</code>.)</p>` : ''}</div>`);
}

function agentScreen(k, wrap) {
  const n = agentNode(k);
  const p = n.props;
  const on = agentEnabled(k);
  const items = k === 'author' ? S.queue.filter(q => q.status !== 'done').concat(S.queue.filter(q => q.status === 'done').slice(-8).reverse()) : [];
  const pending = items.filter(q => q.status !== 'done');
  const qState = k !== 'author' ? '' : pending.some(q => q.status === 'error' || q.status === 'blocked')
    ? '<span class="pill red">Queue is blocked</span>' : pending.length ? '<span class="pill orange">Queue has items</span>' : '<span class="pill green">Queue is idle</span>';
  return wrap(esc(p['jcr:title']), `<div class="pad">
    <h3>${esc(p['jcr:title'])}</h3>
    <p>${on ? '<span class="pill green">Agent is enabled</span>' : '<span class="pill grey">Agent is disabled</span>'} ${qState}</p>
    <table class="kvt">
      <tr><th>Transport URI</th><td><code>${esc(p.transportUri)}</code></td></tr>
      <tr><th>Transport user</th><td>${esc(p.transportUser || '—')}</td></tr>
      <tr><th>Serialization</th><td>${esc(p.serializationType)}</td></tr>
      <tr><th>Log level</th><td>${esc(p.logLevel)}</td></tr>
    </table>
    <div class="row-btns"><button class="btn" data-act="agentEdit" data-k="${k}">Edit</button>
      <button class="btn" data-act="agentTest" data-k="${k}">Test Connection</button>
      ${k === 'author' && pending.length ? '<button class="btn" data-act="queueRetry">Retry queue</button><button class="btn quiet" data-act="queueClear">Clear queue</button>' : ''}</div>
    ${k === 'author' ? `<h4>Queue</h4><table class="grid"><tr><th>Path</th><th>Action</th><th>Status</th><th>Message</th><th>Added</th></tr>
      ${items.map(q => `<tr><td><code>${esc(q.path)}</code></td><td>${q.action}</td><td><span class="pill ${{ done: 'green', pending: 'orange', blocked: 'grey', error: 'red' }[q.status]}">${q.status}</span></td><td class="small">${esc(q.msg || '')}</td><td>${fmtDate(q.added)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Queue is empty</td></tr>'}</table>` : ''}
    <h4>Log</h4><div class="log">${S.agentLog[k].slice(-25).reverse().map(l => `<div class="${l.level}">${new Date(l.t).toLocaleTimeString()} *${l.level.toUpperCase()}* ${esc(l.msg)}</div>`).join('') || '<span class="muted">empty</span>'}</div>
  </div>`);
}

A.agentEdit = d => {
  const n = agentNode(d.k);
  const p = n.props;
  openModal({
    title: `Agent Settings — ${esc(p['jcr:title'])}`,
    body: `<label class="check"><input type="checkbox" name="enabled" ${agentEnabled(d.k) ? 'checked' : ''}> Enabled</label>
      ${field('Transport URI', 'transportUri', p.transportUri, d.k === 'author' ? 'Where the publish instance listens: http://localhost:&lt;publish port&gt;/bin/receive' : 'The dispatcher invalidation handler')}
      ${field('Transport user', 'transportUser', p.transportUser || '')}
      ${selectField('Log level', 'logLevel', p.logLevel, [['error', 'Error'], ['info', 'Info'], ['debug', 'Debug']])}`,
    ok: b => {
      const f = formData(b);
      Object.assign(p, { enabled: !!f.enabled, transportUri: f.transportUri, transportUser: f.transportUser, logLevel: f.logLevel });
      if (!f.enabled) flag(d.k === 'author' ? 'agent:disabled' : 'flush:disabled');
      if (f.enabled) flag(d.k === 'author' ? 'agent:enabled' : 'flush:enabled');
      agentLog(d.k, `Agent configuration changed (enabled=${!!f.enabled}, transportUri=${f.transportUri})`);
      if (d.k === 'author') processQueue();
      commit();
    },
  });
};

A.agentTest = d => {
  const p = agentNode(d.k).props;
  flag('agent:test:' + d.k);
  if (d.k === 'author') {
    const port = transportPort(p.transportUri);
    const pub = inst('publish');
    if (pub.running && pub.port === port) {
      agentLog('author', `Replication test to ${p.transportUri} succeeded. Response: 200 OK (ReplicationAction TEST ok.)`);
      toast('Replication test succeeded.');
    } else {
      agentLog('author', `Replication test failed: Connection refused (localhost:${port}). ${pub.running ? `Publish is running on ${pub.port}, not ${port}.` : 'Publish is not running.'}`, 'error');
      toast('Replication test failed — see the log.', 'error');
    }
  } else {
    agentLog('publish', `Test flush to ${p.transportUri}: 200 OK`);
    toast('Flush test succeeded.');
  }
  commit();
};

A.queueRetry = () => {
  processQueue();
  commit();
};
A.queueClear = () => {
  S.queue = S.queue.filter(q => q.status === 'done');
  agentLog('author', 'Queue cleared by admin.', 'warn');
  commit();
};

/* ---------- Versions (Timeline) ---------- */

function createVersion(path, label, comment, auto) {
  const c = pcOf(AR(), path);
  if (!c) return;
  const list = (S.versions[path] = S.versions[path] || []);
  const last = list[list.length - 1];
  const num = last ? +last.name.split('.')[1] + 1 : 0;
  list.push({ name: '1.' + num, label: label || '', comment: comment || '', created: now(), auto: !!auto, content: JCR.clone(c) });
  if (list.length > 25) list.shift();
  if (!auto) flag('version:created');
}

function timelineRail(path) {
  const st = pageStatus(path);
  const vs = (S.versions[path] || []).slice().reverse();
  const events = [];
  if (st.lastMod) events.push(`<div class="tl-ev">✎ Modified · ${fmtDate(st.lastMod)}</div>`);
  if (st.lastRep) events.push(`<div class="tl-ev">⇪ ${st.published ? 'Published' : 'Unpublished'} · ${fmtDate(st.lastRep)}</div>`);
  return `<div class="rail"><div class="rail-head"><b>Timeline</b><button class="btn small primary" data-act="verCreate">Save as Version</button></div>
    ${events.join('')}
    <h5>Versions</h5>
    ${vs.map(v => `<div class="tl-item"><b>Version ${esc(v.name)}</b> ${v.label ? `· ${esc(v.label)}` : ''}<br><small class="muted">${fmtDate(v.created)}${v.auto ? ' · automatic' : ''}</small>
      ${v.comment ? `<p>${esc(v.comment)}</p>` : ''}<button class="btn small" data-act="verRestore" data-v="${esc(v.name)}">Revert to this Version</button></div>`).join('') || '<p class="muted small">No versions yet. Publishing creates one automatically.</p>'}
  </div>`;
}

A.verCreate = () => {
  const path = S.ui.sitesSel;
  openModal({
    title: 'Save as Version',
    body: `${field('Label', 'label', '')}<label class="field"><span>Comment</span><textarea name="comment"></textarea></label>
      <p class="hint">A version is a snapshot of <code>${esc(path)}/jcr:content</code> (stored in the version storage, not under the page).</p>`,
    okLabel: 'Create',
    ok: b => {
      const f = formData(b);
      createVersion(path, f.label, f.comment, false);
      toast('Version created.');
      commit();
    },
  });
};

A.verRestore = d => {
  const path = S.ui.sitesSel;
  const v = (S.versions[path] || []).find(x => x.name === d.v);
  if (!v) return;
  confirmBox('Revert to version', `Restore <code>${esc(path)}</code> to version <b>${esc(v.name)}</b>${v.label ? ` (${esc(v.label)})` : ''}? The current state is saved as a version first.`, () => {
    createVersion(path, 'Before revert to ' + v.name, '', true);
    const page = JCR.get(AR(), path);
    const cur = JCR.get(page, 'jcr:content');
    const keep = {};
    for (const k of ['cq:lastReplicated', 'cq:lastReplicatedBy', 'cq:lastReplicationAction', 'jcr:lockOwner', 'jcr:lockIsDeep']) if (cur.props[k] !== undefined) keep[k] = cur.props[k];
    const copy = JCR.clone(v.content);
    Object.assign(copy.props, keep, { 'cq:lastModified': now(), 'cq:lastModifiedBy': 'admin' });
    page.children = page.children.map(c => (c.name === 'jcr:content' ? copy : c));
    flag('version:restored');
    toast(`Reverted to version ${esc(v.name)}.`);
    commit();
  }, 'Revert');
};

/* ---------- Workflow ---------- */

const WF_DESIGN = '/conf/global/settings/workflow/models';
const WF_RUNTIME = '/var/workflow/models';
const PROCESSES = [
  ['activate', 'Activate Page (com.day.cq.wcm.workflow.process.ActivatePageProcess)'],
  ['deactivate', 'Deactivate Page (com.day.cq.wcm.workflow.process.DeactivatePageProcess)'],
  ['version', 'Create Version (com.day.cq.wcm.workflow.process.CreateVersionProcess)'],
];
const SEED_MODELS = ['request_for_activation', 'request_for_deactivation'];

function designSteps(id) {
  const f = JCR.get(AR(), `${WF_DESIGN}/${id}/jcr:content/flow`);
  return f ? f.children.map(s => ({ ...s.props })) : [];
}

function runtimeSteps(id) {
  const f = JCR.get(AR(), `${WF_RUNTIME}/${id}/nodes`);
  return f ? f.children.map(s => ({ ...s.props })) : null;
}

function modelInSync(id) {
  const rt = runtimeSteps(id);
  const d = pcOf(AR(), `${WF_DESIGN}/${id}`);
  const rn = JCR.get(AR(), `${WF_RUNTIME}/${id}`);
  return !!rt && JSON.stringify(rt) === JSON.stringify(designSteps(id)) && rn.props.title === d.props['jcr:title'];
}

function wfModelsScreen() {
  const r = AR();
  flag('visit:wf-models');
  const models = (JCR.get(r, WF_DESIGN) || { children: [] }).children;
  return shell('Workflow Models', `${titleBar('', '<span class="tb-crumb">Workflow Models</span>', '<button class="btn primary" data-act="wfCreate">Create</button>')}
    <table class="grid"><tr><th>Title</th><th>Steps</th><th>Runtime model</th><th></th></tr>
    ${models.map(m => {
      const c = JCR.get(m, 'jcr:content');
      const sync = modelInSync(m.name);
      return `<tr><td><b>${esc(c.props['jcr:title'])}</b><br><small class="muted">${WF_DESIGN}/${esc(m.name)}</small></td>
        <td>${designSteps(m.name).length}</td>
        <td>${sync ? '<span class="pill green">In sync</span>' : runtimeSteps(m.name) ? '<span class="pill orange">Out of sync — click Sync</span>' : '<span class="pill red">Not synced</span>'}</td>
        <td class="nowrap"><button class="btn small" data-act="go" data-url="/editor.html${WF_DESIGN}/${esc(m.name)}.html">✎ Edit</button>
          <button class="btn small" data-act="wfStartFromModel" data-id="${esc(m.name)}">▶ Start Workflow</button></td></tr>`;
    }).join('')}</table>
    <p class="hint pad">Models are edited under <code>/conf/global</code> (design time). <b>Sync</b> copies them to <code>/var/workflow/models</code> (runtime) — only runtime models can be started.</p>`);
}

A.wfCreate = () => openModal({
  title: 'Create Workflow Model',
  body: `${field('Title *', 'title', '')}<label class="field"><span>Description</span><textarea name="desc"></textarea></label>`,
  okLabel: 'Create',
  ok: b => {
    const f = formData(b);
    if (!f.title.trim()) return false;
    const r = AR();
    const base = JCR.get(r, WF_DESIGN);
    const id = JCR.unique(base, slug(f.title).replace(/-/g, '_'));
    base.children.push(JCR.node(id, { 'jcr:primaryType': 'cq:Page' }, [JCR.node('jcr:content', { 'jcr:title': f.title.trim(), 'jcr:description': f.desc || '' }, [JCR.node('flow', {})])]));
    flag('wf:model:created');
    go(`/editor.html${WF_DESIGN}/${id}.html`);
  },
});

function wfModelEditor(path) {
  const r = AR();
  const id = JCR.name(path);
  const c = pcOf(r, path);
  if (!c) return notFoundShell(path);
  const steps = designSteps(id);
  const sync = modelInSync(id);
  const stepCard = (s, i) => `<div class="wf-step ${s.type === 'PARTICIPANT' ? 'part' : 'proc'}">
    <span class="wf-ico">${s.type === 'PARTICIPANT' ? '👤' : '⚙'}</span>
    <div><b>${esc(s['jcr:title'])}</b><small>${s.type === 'PARTICIPANT' ? `Participant Step · assigned to <b>${esc(s.participant)}</b>` : `Process Step · ${esc((PROCESSES.find(p => p[0] === s.process) || [, s.process])[1])}`}</small></div>
    <span class="spacer"></span>
    <button class="btn small quiet" data-act="wfStepEdit" data-id="${esc(id)}" data-i="${i}">✎</button>
    <button class="btn small quiet" data-act="wfStepMove" data-id="${esc(id)}" data-i="${i}" data-dir="-1">↑</button>
    <button class="btn small quiet" data-act="wfStepMove" data-id="${esc(id)}" data-i="${i}" data-dir="1">↓</button>
    <button class="btn small quiet" data-act="wfStepDel" data-id="${esc(id)}" data-i="${i}">✕</button></div>`;
  return shell('Workflow Model Editor', `${titleBar(`<button class="iconbtn" data-act="go" data-url="${WF_MODELS_URL}" title="Back to Models">${icon('ChevronLeft')}</button>`,
      `<span class="tb-crumb">${esc(c.props['jcr:title'])}</span> ${sync ? '<span class="pill green">In sync</span>' : '<span class="pill orange">Not synced</span>'}`,
      `<button class="btn primary" data-act="wfSync" data-id="${esc(id)}">${icon('Sync')} Sync</button>`)}
    <div class="wf-flow">
      <div class="wf-node">● Flow Start</div>
      ${steps.map((s, i) => `<div class="wf-arrow">↓</div>${stepCard(s, i)}`).join('')}
      <div class="wf-arrow">↓</div>
      <div class="wf-add"><button class="btn small" data-act="wfStepAdd" data-id="${esc(id)}" data-type="PARTICIPANT">+ Participant Step</button>
        <button class="btn small" data-act="wfStepAdd" data-id="${esc(id)}" data-type="PROCESS">+ Process Step</button></div>
      <div class="wf-arrow">↓</div>
      <div class="wf-node">● Flow End</div>
    </div>
    <p class="hint pad">Edits are saved to the design model. Click <b>Sync</b> to make them effective for new workflow instances.</p>`);
}

function flowNode(id) {
  return JCR.ensure(AR(), `${WF_DESIGN}/${id}/jcr:content/flow`);
}

function stepForm(s) {
  return `${field('Title', 'title', s['jcr:title'] || '')}
    ${s.type === 'PARTICIPANT'
      ? selectField('User / Group', 'participant', s.participant || 'admin', [['admin', 'admin'], ['content-authors', 'content-authors (group)']], 'In the lab you are always admin')
      : selectField('Process', 'process', s.process || 'activate', PROCESSES)}`;
}

A.wfStepAdd = d => {
  const s = { type: d.type, 'jcr:title': d.type === 'PARTICIPANT' ? 'Approve' : 'Activate Page', participant: 'admin', process: 'activate' };
  openModal({
    title: d.type === 'PARTICIPANT' ? 'Participant Step' : 'Process Step',
    body: stepForm(s),
    ok: b => {
      const f = formData(b);
      const flow = flowNode(d.id);
      const props = { 'jcr:title': f.title || s['jcr:title'], type: d.type };
      if (d.type === 'PARTICIPANT') props.participant = f.participant;
      else props.process = f.process;
      flow.children.push(JCR.node(JCR.unique(flow, 'step'), props));
      commit();
    },
  });
};

A.wfStepEdit = d => {
  const flow = flowNode(d.id);
  const node = flow.children[+d.i];
  openModal({
    title: 'Edit step',
    body: stepForm(node.props),
    ok: b => {
      const f = formData(b);
      node.props['jcr:title'] = f.title;
      if (node.props.type === 'PARTICIPANT') node.props.participant = f.participant;
      else node.props.process = f.process;
      commit();
    },
  });
};

A.wfStepMove = d => {
  const flow = flowNode(d.id);
  const i = +d.i;
  const j = i + +d.dir;
  if (j < 0 || j >= flow.children.length) return;
  [flow.children[i], flow.children[j]] = [flow.children[j], flow.children[i]];
  commit();
};

A.wfStepDel = d => {
  const flow = flowNode(d.id);
  flow.children.splice(+d.i, 1);
  commit();
};

A.wfSync = d => {
  syncModelIn(AR(), d.id);
  flag('wf:synced');
  if (!SEED_MODELS.includes(d.id)) flag('wf:custom:synced');
  toast('Model synced to /var/workflow/models.');
  commit();
};

A.wfStartFromModel = d => {
  const pages = allPagePaths(AR(), SITE_ROOT);
  openModal({
    title: 'Start Workflow',
    body: `${selectField('Payload (page)', 'payload', pages[0], pages.map(p => [p, p]))}${field('Title', 'title', '')}`,
    okLabel: 'Run',
    ok: b => {
      const f = formData(b);
      startWorkflow(d.id, f.payload, f.title);
    },
  });
};

A.wfStartDlg = () => openStartWorkflow(S.ui.sitesSel);

function openStartWorkflow(payload) {
  const r = AR();
  const models = (JCR.get(r, WF_RUNTIME) || { children: [] }).children;
  openModal({
    title: `Start Workflow <small>${esc(payload)}</small>`,
    okLabel: 'Start',
    body: `${selectField('Workflow model', 'model', models[0] && models[0].name, models.map(m => [m.name, m.props.title]), 'Only synced (runtime) models are listed')}
      ${field('Title', 'title', '')}<label class="field"><span>Comment</span><textarea name="comment"></textarea></label>`,
    ok: b => {
      const f = formData(b);
      startWorkflow(f.model, payload, f.title, f.comment);
    },
  });
}

function startWorkflow(modelId, payload, title, comment) {
  const steps = runtimeSteps(modelId);
  if (!steps) { toast('This model has never been synced. Open it and click Sync.', 'error'); return; }
  if (S.wf.instances.some(w => w.payload === payload && w.status === 'RUNNING')) {
    toast('This page is already in a running workflow.', 'error');
    return;
  }
  const rn = JCR.get(AR(), `${WF_RUNTIME}/${modelId}`);
  const w = {
    id: uid(), modelId, modelTitle: rn.props.title, title: title || rn.props.title, payload, status: 'RUNNING', idx: 0, steps, waiting: false,
    started: now(), history: [{ step: 'Flow Start', user: 'admin', at: now(), comment: comment || '' }],
  };
  S.wf.instances.push(w);
  flag('wf:started');
  advanceWorkflow(w);
  toast(`Workflow “${esc(w.modelTitle)}” started on <code>${esc(payload)}</code>.${S.wf.inbox.some(i => i.wf === w.id) ? ' Check your 🔔 Inbox.' : ''}`);
  commit();
}

function advanceWorkflow(w) {
  while (w.status === 'RUNNING') {
    const step = w.steps[w.idx];
    if (!step) {
      w.status = 'COMPLETED';
      w.ended = now();
      w.history.push({ step: 'Flow End', user: 'system', at: now() });
      flag('wf:completed:' + w.modelId);
      if (!SEED_MODELS.includes(w.modelId)) flag('wf:custom:completed');
      break;
    }
    if (step.type === 'PARTICIPANT') {
      if (!w.waiting) {
        S.wf.inbox.push({ id: uid(), wf: w.id, title: step['jcr:title'], payload: w.payload, assignee: step.participant || 'admin', model: w.modelTitle, created: now() });
        w.waiting = true;
      }
      break;
    }
    runProcess(step.process, w.payload, w);
    w.history.push({ step: step['jcr:title'], user: 'workflow-process-service', at: now(), comment: 'Process executed' });
    w.idx++;
  }
}

function runProcess(proc, payload, w) {
  if (proc === 'activate') {
    const refs = unpublishedRefs(payload).map(x => x.path);
    queueReplication('Activate', [...refs, payload]);
  } else if (proc === 'deactivate') queueReplication('Deactivate', [payload]);
  else if (proc === 'version') createVersion(payload, 'Workflow', w.title, true);
}

function inboxScreen() {
  flag('visit:inbox');
  const r = AR();
  return shell('Inbox', `${titleBar('', '<span class="tb-crumb">AEM Inbox</span>', `<span class="tb-views"><button class="iconbtn on" title="List View">${icon('ViewList')}</button></span>`)}<div class="pad">
    ${S.wf.inbox.map(i => `<div class="inbox-item"><div class="ii-ico">${icon('FileWorkflow', 24)}</div><div class="ii-body">
      <b>${esc(i.title)}</b> <span class="muted">· ${esc(i.model)}</span><br>
      Payload: <a href="#" data-act="go" data-url="/editor.html${esc(i.payload)}.html">${esc(titleOf(r, i.payload))}</a> <code class="muted">${esc(i.payload)}</code><br>
      <small class="muted">Assigned to ${esc(i.assignee)} · ${fmtDate(i.created)}</small></div>
      <div class="ii-act"><button class="btn primary small" data-act="inboxComplete" data-id="${i.id}">✓ Complete</button>
      <button class="btn small" data-act="inboxReject" data-id="${i.id}">✕ Reject</button></div></div>`).join('') || '<p class="muted">Nothing to do. Start a workflow on a page (Sites → select page → Create → Workflow).</p>'}
  </div>`);
}

A.inboxComplete = d => {
  const item = S.wf.inbox.find(i => i.id === d.id);
  if (!item) return;
  openModal({
    title: `Complete Work Item — ${esc(item.title)}`,
    okLabel: 'Complete',
    body: '<label class="field"><span>Comment</span><textarea name="comment"></textarea></label>',
    ok: b => {
      const w = S.wf.instances.find(x => x.id === item.wf);
      S.wf.inbox = S.wf.inbox.filter(i => i.id !== item.id);
      if (w) {
        w.history.push({ step: item.title, user: 'admin', at: now(), comment: formData(b).comment || 'Approved' });
        w.waiting = false;
        w.idx++;
        advanceWorkflow(w);
      }
      flag('inbox:completed');
      toast('Work item completed.');
      commit();
    },
  });
};

A.inboxReject = d => {
  const item = S.wf.inbox.find(i => i.id === d.id);
  const w = item && S.wf.instances.find(x => x.id === item.wf);
  S.wf.inbox = S.wf.inbox.filter(i => i.id !== d.id);
  if (w) {
    w.status = 'ABORTED';
    w.ended = now();
    w.history.push({ step: item.title, user: 'admin', at: now(), comment: 'Rejected — workflow terminated' });
  }
  toast('Rejected. The workflow was terminated.');
  commit();
};

function wfInstancesScreen() {
  flag('visit:wf-instances');
  const list = S.wf.instances.slice().reverse();
  return shell('Workflow Instances', `${titleBar('', '<span class="tb-crumb">Workflow Instances</span>', '')}<table class="grid"><tr><th>Workflow</th><th>Payload</th><th>Status</th><th>Current step</th><th>Started</th><th></th></tr>
    ${list.map(w => `<tr><td><b>${esc(w.title)}</b><br><small class="muted">${esc(w.modelTitle)}</small></td><td><code>${esc(w.payload)}</code></td>
      <td><span class="pill ${{ RUNNING: 'orange', COMPLETED: 'green', ABORTED: 'grey' }[w.status]}">${w.status}</span></td>
      <td>${w.status === 'RUNNING' ? esc((w.steps[w.idx] || {})['jcr:title'] || '') : '—'}</td><td>${fmtDate(w.started)}</td>
      <td class="nowrap"><button class="btn small" data-act="wfHistory" data-id="${w.id}">History</button>
      ${w.status === 'RUNNING' ? `<button class="btn small" data-act="wfTerminate" data-id="${w.id}">Terminate</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No workflow instances yet.</td></tr>'}</table>`);
}

A.wfHistory = d => {
  const w = S.wf.instances.find(x => x.id === d.id);
  openModal({
    title: `History — ${esc(w.title)}`,
    hideOk: true,
    cancelLabel: 'Close',
    body: `<table class="grid"><tr><th>Step</th><th>User</th><th>Time</th><th>Comment</th></tr>${w.history.map(h => `<tr><td>${esc(h.step)}</td><td>${esc(h.user)}</td><td>${fmtDate(h.at)}</td><td>${esc(h.comment || '')}</td></tr>`).join('')}</table>`,
  });
};

A.wfTerminate = d => {
  const w = S.wf.instances.find(x => x.id === d.id);
  w.status = 'ABORTED';
  w.ended = now();
  w.history.push({ step: 'Terminated', user: 'admin', at: now() });
  S.wf.inbox = S.wf.inbox.filter(i => i.wf !== w.id);
  commit();
};

/* ---------- Web Console (OSGi configs & run modes) ---------- */

function osgiConfigs(r, modes) {
  const base = JCR.get(r, '/apps/wknd/osgiconfig');
  const pids = {};
  for (const folder of base ? base.children : []) {
    const parts = folder.name.split('.');
    if (parts[0] !== 'config') continue;
    const req = parts.slice(1);
    const match = req.every(m => modes.includes(m));
    for (const f of folder.children) {
      const pid = f.name.replace(/\.cfg\.json$/, '');
      (pids[pid] = pids[pid] || []).push({ folder: folder.name, req, match, data: readFile(r, `/apps/wknd/osgiconfig/${folder.name}/${f.name}`) });
    }
  }
  return Object.entries(pids).map(([pid, cands]) => ({ pid, cands, eff: cands.filter(c => c.match).sort((a, b) => b.req.length - a.req.length)[0] }));
}

function webConsole(k, path) {
  const I = inst(k);
  const r = S.repos[k];
  const nav = `<div class="felix-nav"><a href="#" data-act="go" data-url="/system/console/bundles" class="${path.includes('bundles') ? 'on' : ''}">Bundles</a>
    <a href="#" data-act="go" data-url="/system/console/configMgr" class="${path.includes('configMgr') ? 'on' : ''}">Configuration</a>
    <a href="#" data-act="go" data-url="/system/console/status-slingsettings" class="${path.includes('slingsettings') ? 'on' : ''}">Sling Settings</a></div>`;
  let body;
  if (path.includes('slingsettings')) {
    flag('visit:slingsettings');
    body = `<h3>Sling Settings</h3><pre class="code">Sling ID = 9c1f${k === 'author' ? 'a4' : 'b7'}-1e2d-4b7a-9f00-${k === 'author' ? '4502' : '4503'}aem
Sling Name = Instance ${I.port}
Sling Home = ${I.folder}\\crx-quickstart
Run Modes = [${I.runModes.join(', ')}]</pre>
      <p class="hint">Installation run modes (<b>author</b>/<b>publish</b>) are fixed at the first start. Others (dev, stage, prod…) come from <code>-r</code> and can change on restart.</p>`;
  } else if (path.includes('bundles')) {
    flag('visit:bundles');
    const bundles = ['org.apache.sling.api', 'org.apache.sling.engine', 'org.apache.sling.models.impl', 'org.apache.jackrabbit.oak-core', 'com.adobe.cq.core.wcm.components.core', 'com.day.cq.replication', 'com.adobe.granite.workflow.core', 'com.adobe.aem.guides.wknd.core'];
    body = `<h3>Bundles</h3><p class="muted">OSGi bundles = Java modules. Your project's Java code (core module) is deployed as a bundle.</p>
      <table class="grid"><tr><th>Name</th><th>Status</th></tr>${bundles.map(b => `<tr><td>${b}</td><td><span class="pill green">Active</span></td></tr>`).join('')}</table>`;
  } else {
    flag('visit:configmgr');
    const cfgs = osgiConfigs(r, I.runModes);
    body = `<h3>Configuration</h3><p>Active run modes: <code>${esc(I.runModes.join(', '))}</code></p>
      <p class="muted">Configs live in <code>/apps/wknd/osgiconfig/config.&lt;runmodes&gt;</code>. The folder whose run modes all match — and that is the most specific — wins.</p>
      ${cfgs.map(c => `<div class="cfg"><b>${esc(c.pid)}</b>
        ${c.eff ? `<div>Effective from <code>${esc(c.eff.folder)}</code>: <code>${esc(String(c.eff.data).replace(/\s+/g, ' '))}</code></div>` : '<div class="muted">No matching configuration</div>'}
        <ul>${c.cands.map(x => `<li class="${x === c.eff ? 'win' : x.match ? '' : 'skip'}"><code>${esc(x.folder)}</code> ${x === c.eff ? '✔ used' : x.match ? 'matches, but less specific' : `ignored (needs run mode ${esc(x.req.join(' + '))})`}</li>`).join('')}</ul></div>`).join('')}`;
  }
  return `<div class="felix"><div class="felix-head">Adobe Experience Manager Web Console · ${esc(k)} :${I.port}</div>${nav}<div class="felix-body">${body}</div></div>`;
}

/* ---------- CRXDE Lite ---------- */

function crxReveal(k, path) {
  const C = S.ui.crx[k];
  C.sel = path;
  C.reveal = true;
  let acc = '';
  for (const s of ['', ...JCR.segs(path)]) {
    acc = s ? JCR.join(acc || '/', s) : '/';
    if (!C.open.includes(acc)) C.open.push(acc);
  }
  go('/crx/de/index.jsp#' + path, k);
}

function crxIcon(n) {
  const t = JCR.type(n) || '';
  if (t === 'cq:Page') return `<i class="ci p">${icon('WebPage', 14)}</i>`;
  if (t === 'dam:Asset') return `<i class="ci a">${icon('Image', 14)}</i>`;
  if (t === 'nt:file') return `<i class="ci f">${icon('Document', 14)}</i>`;
  if (t === 'cq:Component') return `<i class="ci c">${icon('Box', 14)}</i>`;
  if (t === 'cq:Template') return `<i class="ci t">${icon('FileTemplate', 14)}</i>`;
  if (/folder|Folder|ClientLibrary/.test(t) || t === 'rep:root') return `<i class="ci d">${icon('Folder', 14)}</i>`;
  return `<i class="ci n">${icon('Data', 14)}</i>`;
}

function propType(v) {
  if (Array.isArray(v)) return 'String[]';
  if (typeof v === 'boolean') return 'Boolean';
  if (typeof v === 'number') return 'Long';
  if (typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(v)) return 'Date';
  if (typeof v === 'string' && v.startsWith('data:')) return 'Binary';
  return 'String';
}

function crxdeScreen(k, url) {
  const r = S.repos[k];
  const C = S.ui.crx[k];
  const hash = url.split('#')[1];
  if (hash && C.sel !== decodeURIComponent(hash)) {
    // a URL like /crx/de/index.jsp#/apps/wknd opens the tree down to that node
    C.sel = decodeURIComponent(hash);
    let acc = '';
    for (const s of JCR.segs(C.sel).slice(0, -1)) {
      acc += '/' + s;
      if (!C.open.includes(acc)) C.open.push(acc);
    }
    if (!C.open.includes('/')) C.open.push('/');
  }
  if (!JCR.get(r, C.sel)) C.sel = '/';
  const key = k + ':' + C.sel;
  if (!S.crxVisited.includes(key)) {
    S.crxVisited.push(key);
    if (S.crxVisited.length > 300) S.crxVisited.shift();
  }
  flag('visit:crxde');
  AFTER.push(() => wireCrxTree(k));
  return `<div class="crx">
    <div class="crx-top"><span class="crx-logo">CRXDE Lite</span><span class="crx-ws">${esc(k)} · crx.default</span><span class="spacer"></span><span class="crx-user">admin</span></div>
    <div class="crx-bar">${crxBarHtml(k)}</div>
    <div class="crx-main">
      <div class="crx-tree" tabindex="0" style="width:${C.width || 360}px">${crxRows(k, '/', r, 0)}</div>
      <div class="crx-split" title="Drag to resize"></div>
      <div class="crx-props">${crxPropsHtml(k)}</div>
    </div>
  </div>`;
}

// One flat list of rows; each row knows its depth so expand/collapse can insert/remove rows in place
function crxRows(k, path, node, depth) {
  const C = S.ui.crx[k];
  const open = C.open.includes(path);
  const kids = node.children.length > 0;
  let h = `<div class="ct-row ${C.sel === path ? 'sel' : ''}" data-path="${esc(path)}" data-depth="${depth}" style="padding-left:${depth * 16 + 2}px">
    <span class="ct-tog">${kids ? icon(open ? 'ChevronDown' : 'ChevronRight', 10) : ''}</span><span class="ct-name">${crxIcon(node)}<span>${esc(node.name || 'jcr:root')}</span></span></div>`;
  if (open) for (const c of node.children) h += crxRows(k, JCR.join(path, c.name), c, depth + 1);
  return h;
}

function crxBarHtml(k) {
  const r = S.repos[k];
  const C = S.ui.crx[k];
  const page = C.sel.split('/jcr:content')[0];
  return `<button class="cbtn" data-act="reload" title="Refresh">${icon('Refresh', 14)}</button>
    <button class="cbtn off" title="Real CRXDE needs Save All; in the lab changes apply immediately">${icon('Checkmark', 14)} Save All</button>
    <span class="crx-sep"></span>
    <details class="dd crx-create"><summary class="cbtn">${icon('FolderAdd', 14)} Create ${icon('ChevronDown', 10)}</summary><div class="dd-menu">
      <a href="#" data-act="crxNewNode" data-k="${k}">Create Node…</a><a href="#" data-act="crxNewFolder" data-k="${k}">Create Folder…</a><a href="#" data-act="crxNewFile" data-k="${k}">Create File…</a>
      <a href="#" data-act="crxNewComponent" data-k="${k}">Create Component…</a><a href="#" data-act="crxNewDialog" data-k="${k}">Create Dialog…</a></div></details>
    <button class="cbtn" data-act="crxDelNode" data-k="${k}">${icon('Delete', 14)} Delete</button>
    <span class="crx-sep"></span>
    <button class="cbtn" data-act="go" data-url="${esc(C.sel === '/' ? '/.1.json' : C.sel + '.infinity.json')}">${icon('FileJson', 14)} JSON</button>
    ${isPage(r, page) && C.sel.startsWith('/content') ? `<button class="cbtn" data-act="go" data-url="${esc(page)}.html">${icon('WebPage', 14)} Open page</button>` : ''}
    <span class="spacer"></span><input class="crx-pathbox" value="${esc(C.sel)}" readonly>`;
}

function crxPropsHtml(k) {
  const r = S.repos[k];
  const C = S.ui.crx[k];
  const node = JCR.get(r, C.sel);
  const isLibs = C.sel === '/libs' || C.sel.startsWith('/libs/');
  const fileData = JCR.type(node) === 'nt:file' ? readFile(r, C.sel) : null;
  const props = Object.entries(node.props);
  return `<div class="crx-tabs"><span class="on">Properties</span><span class="off">Access Control</span><span class="off">Replication</span><span class="off">Console</span></div>
        ${isLibs ? '<div class="warn-box">⚠ <b>/libs</b> is product code. Never change it — extend or overlay it in <b>/apps</b> instead. (Read-only in the lab.)</div>' : ''}
        <table class="grid props"><tr><th>Name</th><th>Type</th><th>Value</th><th></th></tr>
        ${props.map(([n, v]) => {
          const t = propType(v);
          const shown = t === 'Binary' ? `(binary, ${v.length} bytes)` : Array.isArray(v) ? v.join(', ') : String(v);
          return `<tr><td><b>${esc(n)}</b></td><td class="muted">${t}${Array.isArray(v) ? '' : ''}</td><td class="val">${esc(shown.length > 160 ? shown.slice(0, 160) + '…' : shown)}</td>
            <td class="nowrap">${n === 'jcr:primaryType' || isLibs || t === 'Binary' ? '' : `<button class="btn small quiet" data-act="crxEditProp" data-k="${k}" data-name="${esc(n)}">✎</button><button class="btn small quiet" data-act="crxDelProp" data-k="${k}" data-name="${esc(n)}">✕</button>`}</td></tr>`;
        }).join('')}</table>
        ${isLibs ? '' : `<form class="crx-add" data-submit="crxAddProp"><input type="hidden" name="k" value="${k}">
          <input name="name" placeholder="Name" autocomplete="off"><select name="type"><option>String</option><option>Boolean</option><option>Long</option><option>String[]</option></select>
          <input name="value" placeholder="Value (String[]: comma separated)" autocomplete="off"><button class="btn small">Add</button></form>`}
        ${fileData != null && !String(fileData).startsWith('data:') ? `<h4>File content</h4><textarea class="code-edit" id="crx-file" ${isLibs ? 'readonly' : ''}>${esc(fileData)}</textarea>
          ${isLibs ? '' : `<button class="btn primary small" data-act="crxSaveFile" data-k="${k}">Save file</button>`}` : ''}
        ${fileData && String(fileData).startsWith('data:image') ? `<img class="crx-img" src="${fileData}" alt="">` : ''}`;
}

// Tree interactions update the DOM in place (no full re-render): scroll position and hover stay correct
function wireCrxTree(k) {
  const tree = document.querySelector('.crx-tree');
  if (!tree) return;
  const r = S.repos[k];
  const C = S.ui.crx[k];
  const key = 'crx:' + k;
  tree.scrollTop = FRAME_SCROLL[key] || 0;
  tree.addEventListener('scroll', () => { FRAME_SCROLL[key] = tree.scrollTop; });
  const rowOf = path => tree.querySelector(`.ct-row[data-path="${CSS.escape(path)}"]`);
  if (C.reveal) {
    delete C.reveal;
    const row = rowOf(C.sel);
    if (row) row.scrollIntoView({ block: 'center' });
  }

  const select = (path, keepScroll) => {
    C.sel = path;
    tree.querySelectorAll('.ct-row.sel').forEach(x => x.classList.remove('sel'));
    const row = rowOf(path);
    if (row) {
      row.classList.add('sel');
      if (!keepScroll) row.scrollIntoView({ block: 'nearest' });
    }
    S.ui.url[tabFor(k)] = '/crx/de/index.jsp#' + path;
    const vkey = k + ':' + path;
    if (!S.crxVisited.includes(vkey)) {
      S.crxVisited.push(vkey);
      if (S.crxVisited.length > 300) S.crxVisited.shift();
    }
    const addr = document.querySelector('.addr input[name=url]');
    if (addr) addr.value = S.ui.url[tabFor(k)];
    document.querySelector('.crx-bar').innerHTML = crxBarHtml(k);
    document.querySelector('.crx-props').innerHTML = crxPropsHtml(k);
    save();
    refreshLessons();
  };

  const toggle = (path, force) => {
    const row = rowOf(path);
    const node = JCR.get(r, path);
    if (!row || !node || !node.children.length) return;
    const isOpen = C.open.includes(path);
    const want = force === undefined ? !isOpen : force;
    if (want === isOpen) return;
    const depth = +row.dataset.depth;
    if (want) {
      C.open.push(path);
      row.insertAdjacentHTML('afterend', node.children.map(c => crxRows(k, JCR.join(path, c.name), c, depth + 1)).join(''));
    } else {
      C.open = C.open.filter(p => p !== path && !p.startsWith(path === '/' ? '/' : path + '/'));
      let next = row.nextElementSibling;
      while (next && +next.dataset.depth > depth) {
        const n = next.nextElementSibling;
        next.remove();
        next = n;
      }
      if (C.sel.startsWith(path + '/')) select(path, true);
    }
    row.querySelector('.ct-tog').innerHTML = icon(want ? 'ChevronDown' : 'ChevronRight', 10);
    save();
  };

  tree.addEventListener('click', e => {
    const row = e.target.closest('.ct-row');
    if (!row) return;
    tree.focus({ preventScroll: true });
    if (e.target.closest('.ct-tog')) toggle(row.dataset.path);
    else select(row.dataset.path, true);
  });
  tree.addEventListener('dblclick', e => {
    const row = e.target.closest('.ct-row');
    if (row && e.target.closest('.ct-name')) toggle(row.dataset.path);
  });
  // ExtJS-style keyboard navigation
  tree.addEventListener('keydown', e => {
    const rows = [...tree.querySelectorAll('.ct-row')];
    const i = rows.findIndex(x => x.dataset.path === C.sel);
    const cur = rows[i];
    if (!cur) return;
    const path = cur.dataset.path;
    if (e.key === 'ArrowDown' && rows[i + 1]) select(rows[i + 1].dataset.path);
    else if (e.key === 'ArrowUp' && rows[i - 1]) select(rows[i - 1].dataset.path);
    else if (e.key === 'ArrowRight') {
      if (!C.open.includes(path)) toggle(path, true);
      else if (rows[i + 1] && +rows[i + 1].dataset.depth > +cur.dataset.depth) select(rows[i + 1].dataset.path);
    } else if (e.key === 'ArrowLeft') {
      if (C.open.includes(path)) toggle(path, false);
      else if (path !== '/') select(JCR.parent(path));
    } else if (e.key === 'Enter') toggle(path);
    else return;
    e.preventDefault();
  });

  // splitter between the tree and the properties panel
  const split = document.querySelector('.crx-split');
  split.addEventListener('mousedown', e => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = tree.offsetWidth;
    const move = ev => { tree.style.width = Math.max(180, Math.min(window.innerWidth - 300, startW + ev.clientX - startX)) + 'px'; };
    const up = () => {
      C.width = tree.offsetWidth;
      save();
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}

// Re-renders only the lessons panel (so ticks update without redrawing the page)
function refreshLessons() {
  const aside = document.querySelector('.lessons');
  if (!aside) return;
  const body = aside.querySelector('.ls-body');
  const top = body ? body.scrollTop : 0;
  aside.outerHTML = lessonsPanel();
  const nb = document.querySelector('.ls-body');
  if (nb) nb.scrollTop = top;
}

function crxGuard(k) {
  const sel = S.ui.crx[k].sel;
  if (sel === '/libs' || sel.startsWith('/libs/')) {
    toast('Never modify /libs — overlay it in /apps instead.', 'error');
    return false;
  }
  return true;
}

function parseValue(type, raw) {
  if (type === 'Boolean') return String(raw).trim() === 'true';
  if (type === 'Long') return Number(raw) || 0;
  if (type === 'String[]') return String(raw).split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  return String(raw);
}

SUBMIT.crxAddProp = f => {
  if (!crxGuard(f.k)) return;
  const name = String(f.name || '').trim();
  if (!name) return;
  const node = JCR.get(S.repos[f.k], S.ui.crx[f.k].sel);
  node.props[name] = parseValue(f.type, f.value);
  afterCrxEdit(f.k);
};

A.crxEditProp = d => {
  if (!crxGuard(d.k)) return;
  const node = JCR.get(S.repos[d.k], S.ui.crx[d.k].sel);
  const v = node.props[d.name];
  const t = propType(v);
  openModal({
    title: `Edit property <small>${esc(d.name)} (${t})</small>`,
    body: t === 'Boolean'
      ? selectField('Value', 'value', String(v), [['true', 'true'], ['false', 'false']])
      : `<label class="field"><span>Value${t === 'String[]' ? ' (one per line)' : ''}</span><textarea name="value" rows="${t === 'String[]' ? 6 : 3}">${esc(Array.isArray(v) ? v.join('\n') : String(v))}</textarea></label>`,
    ok: b => {
      node.props[d.name] = parseValue(t === 'Date' ? 'String' : t, formData(b).value);
      afterCrxEdit(d.k);
    },
  });
};

A.crxDelProp = d => {
  if (!crxGuard(d.k)) return;
  const node = JCR.get(S.repos[d.k], S.ui.crx[d.k].sel);
  delete node.props[d.name];
  afterCrxEdit(d.k);
};

A.crxSaveFile = d => {
  if (!crxGuard(d.k)) return;
  const sel = S.ui.crx[d.k].sel;
  const c = JCR.ensure(S.repos[d.k], sel + '/jcr:content');
  c.props['jcr:data'] = document.getElementById('crx-file').value;
  c.props['jcr:lastModified'] = now();
  if (sel.includes('/clientlibs/')) flag('clientlib:css-edited');
  if (/\.html$/.test(sel) && sel.startsWith('/apps/')) flag('htl:edited');
  toast('File saved.');
  afterCrxEdit(d.k);
};

function afterCrxEdit(k) {
  flag('crx:edit');
  if (k === 'author') {
    const sel = S.ui.crx.author.sel;
    if (sel.startsWith('/content/') && sel.includes('/jcr:content')) markModified(sel);
  }
  commit();
}

A.crxNewNode = d => {
  if (!crxGuard(d.k)) return;
  openModal({
    title: `Create Node <small>under ${esc(S.ui.crx[d.k].sel)}</small>`,
    body: `${field('Name', 'name', '')}${selectField('Type', 'type', 'nt:unstructured', ['nt:unstructured', 'nt:folder', 'sling:Folder', 'cq:Page', 'nt:file'].map(t => [t, t]))}`,
    okLabel: 'Create',
    ok: b => {
      const f = formData(b);
      const name = String(f.name).trim();
      const parent = JCR.get(S.repos[d.k], S.ui.crx[d.k].sel);
      if (!name || /[/\[\]*|]/.test(name)) { toast('Invalid node name.', 'error'); return false; }
      if (parent.children.some(c => c.name === name)) { toast('A node with that name exists.', 'error'); return false; }
      const n = JCR.node(name, { 'jcr:primaryType': f.type });
      if (f.type === 'nt:file') n.children.push(JCR.node('jcr:content', { 'jcr:primaryType': 'nt:resource', 'jcr:mimeType': 'text/plain', 'jcr:data': '' }));
      parent.children.push(n);
      crxReveal(d.k, JCR.join(S.ui.crx[d.k].sel, name));
      flag('crx:edit');
    },
  });
};

// Create ▾ menu helpers (CRXDE Lite has the same entries)
function crxAdd(k, node, flagName) {
  const sel = S.ui.crx[k].sel;
  const parent = JCR.get(S.repos[k], sel);
  if (parent.children.some(c => c.name === node.name)) { toast(`<code>${esc(node.name)}</code> already exists here.`, 'error'); return false; }
  parent.children.push(node);
  if (flagName) flag(flagName);
  flag('crx:edit');
  crxReveal(k, JCR.join(sel, node.name));
  return true;
}

const MIME = { html: 'text/html', css: 'text/css', js: 'application/javascript', json: 'application/json', txt: 'text/plain', xml: 'application/xml' };
const fileNode = (name, data) => JCR.node(name, { 'jcr:primaryType': 'nt:file' }, [JCR.node('jcr:content', { 'jcr:primaryType': 'nt:resource', 'jcr:mimeType': MIME[name.split('.').pop()] || 'text/plain', 'jcr:data': data || '', 'jcr:lastModified': now() })]);

A.crxNewFolder = d => {
  if (!crxGuard(d.k)) return;
  openModal({
    title: `Create Folder <small>under ${esc(S.ui.crx[d.k].sel)}</small>`,
    okLabel: 'OK',
    body: field('Name', 'name', ''),
    ok: b => {
      const name = String(formData(b).name).trim();
      if (!name || /[/\[\]*|:]/.test(name)) { toast('Invalid name.', 'error'); return false; }
      return crxAdd(d.k, JCR.node(name, { 'jcr:primaryType': 'nt:folder' }));
    },
  });
};

A.crxNewFile = d => {
  if (!crxGuard(d.k)) return;
  openModal({
    title: `Create File <small>under ${esc(S.ui.crx[d.k].sel)}</small>`,
    okLabel: 'OK',
    body: field('Name', 'name', '', 'Include the extension, e.g. <code>teaser.html</code> or <code>styles.css</code>'),
    ok: b => {
      const name = String(formData(b).name).trim();
      if (!name || /[/\[\]*|:]/.test(name) || !name.includes('.')) { toast('Give the file a name with an extension.', 'error'); return false; }
      return crxAdd(d.k, fileNode(name, ''), 'crx:file');
    },
  });
};

// Like CRXDE "Create Component": a cq:Component node plus its HTL script
A.crxNewComponent = d => {
  if (!crxGuard(d.k)) return;
  const sel = S.ui.crx[d.k].sel;
  openModal({
    title: `Create Component <small>under ${esc(sel)}</small>`,
    okLabel: 'OK',
    body: `${field('Label', 'label', '', 'The node name, e.g. <code>herobanner</code> (lower case, no spaces)')}
      ${field('Title', 'title', '', 'Shown to authors in the component list')}${field('Description', 'desc', '')}
      ${field('Super Type', 'superType', '', 'Optional: inherit from another component, e.g. <code>core/wcm/components/text/v2/text</code>')}
      ${field('Group', 'group', 'WKND Sites Project - Content', 'componentGroup — <code>.hidden</code> hides it from authors')}
      <p class="hint">Creates <code>${esc(sel)}/&lt;label&gt;</code> (cq:Component) and the HTL script <code>&lt;label&gt;.html</code>.</p>`,
    ok: b => {
      const f = formData(b);
      const label = String(f.label).trim();
      if (!/^[a-z][a-z0-9-]*$/.test(label)) { toast('Label: lower case letters, digits and - only.', 'error'); return false; }
      const props = { 'jcr:primaryType': 'cq:Component', 'jcr:title': f.title.trim() || label, componentGroup: f.group.trim() || '.hidden' };
      if (f.desc.trim()) props['jcr:description'] = f.desc.trim();
      if (f.superType.trim()) props['sling:resourceSuperType'] = f.superType.trim();
      const htl = `<!--/* ${props['jcr:title']} — HTL script. Values come from the dialog as \${properties.<name>} */-->
<div class="cmp-${label}">
    <h2 class="cmp-${label}__title" data-sly-test="\${properties.title}">\${properties.title}</h2>
    <p class="cmp-${label}__text" data-sly-test="\${properties.text}">\${properties.text}</p>
</div>
`;
      const node = JCR.node(label, props, f.superType.trim() ? [] : [fileNode(label + '.html', htl)]);
      return crxAdd(d.k, node, 'crx:component');
    },
  });
};

// Builds a Touch UI cq:dialog from a simple field list (real CRXDE builds the classic XML; here you get the Granite UI tree)
const DIALOG_TYPES = {
  textfield: 'granite/ui/components/coral/foundation/form/textfield',
  textarea: 'granite/ui/components/coral/foundation/form/textarea',
  richtext: 'cq/gui/components/authoring/dialog/richtext',
  checkbox: 'granite/ui/components/coral/foundation/form/checkbox',
  numberfield: 'granite/ui/components/coral/foundation/form/numberfield',
  pathfield: 'granite/ui/components/coral/foundation/form/pathfield',
  select: 'granite/ui/components/coral/foundation/form/select',
};
A.crxNewDialog = d => {
  if (!crxGuard(d.k)) return;
  const sel = S.ui.crx[d.k].sel;
  const comp = JCR.get(S.repos[d.k], sel);
  if (JCR.type(comp) !== 'cq:Component') { toast('Select the component node first (cq:Component).', 'warn'); return; }
  openModal({
    title: `Create Dialog <small>${esc(sel)}/cq:dialog</small>`,
    okLabel: 'OK',
    body: `${field('Title', 'title', comp.props['jcr:title'] || '')}
      <label class="field"><span>Fields — one per line: <code>name | Label | type</code></span><textarea name="fields" rows="6">title | Title | textfield
text | Text | textarea</textarea>
      <small>Types: ${Object.keys(DIALOG_TYPES).join(', ')}. For select: <code>align | Alignment | select: left, center, right</code></small></label>`,
    ok: b => {
      const f = formData(b);
      if (JCR.get(comp, 'cq:dialog')) { toast('This component already has a cq:dialog.', 'error'); return false; }
      const items = [];
      for (const line of String(f.fields).split('\n').map(x => x.trim()).filter(Boolean)) {
        const [name, label, typeRaw] = line.split('|').map(x => (x || '').trim());
        const [type, optSrc] = (typeRaw || 'textfield').split(':').map(x => x.trim());
        if (!/^[a-zA-Z][\w-]*$/.test(name || '') || !DIALOG_TYPES[type]) { toast(`Cannot read the line "${esc(line)}".`, 'error'); return false; }
        const props = { 'jcr:primaryType': 'nt:unstructured', 'sling:resourceType': DIALOG_TYPES[type], name: './' + name, fieldLabel: label || name };
        if (type === 'checkbox') Object.assign(props, { text: label || name, value: 'true' });
        const kids = type === 'select' ? [JCR.node('items', { 'jcr:primaryType': 'nt:unstructured' }, (optSrc || '').split(',').map(o => o.trim()).filter(Boolean).map(o => JCR.node(o.replace(/\W+/g, '-'), { 'jcr:primaryType': 'nt:unstructured', text: o, value: o })))] : [];
        items.push(JCR.node(name, props, kids));
      }
      const un = (name, props, kids) => JCR.node(name, { 'jcr:primaryType': 'nt:unstructured', ...props }, kids || []);
      const dialog = un('cq:dialog', { 'jcr:title': f.title || comp.props['jcr:title'] || '', 'sling:resourceType': 'cq/gui/components/authoring/dialog' }, [
        un('content', { 'sling:resourceType': 'granite/ui/components/coral/foundation/fixedcolumns' }, [
          un('items', {}, [un('column', { 'sling:resourceType': 'granite/ui/components/coral/foundation/container' }, [un('items', {}, items)])]),
        ]),
      ]);
      comp.children.push(dialog);
      flag('crx:dialog');
      flag('crx:edit');
      crxReveal(d.k, sel + '/cq:dialog');
    },
  });
};

A.crxDelNode = d => {
  const sel = S.ui.crx[d.k].sel;
  if (!crxGuard(d.k)) return;
  if (JCR.segs(sel).length < 2) { toast('Top-level system nodes cannot be deleted in the lab.', 'error'); return; }
  confirmBox('Delete node', `Delete <code>${esc(sel)}</code> and everything below it?`, () => {
    JCR.remove(S.repos[d.k], sel);
    S.ui.crx[d.k].sel = JCR.parent(sel);
    S.ui.url[tabFor(d.k)] = '/crx/de/index.jsp#' + JCR.parent(sel);
    flag('crx:edit');
    commit();
  }, 'Delete');
};
