/* QueryBuilder: /bin/querybuilder.json and the Query Debugger (/libs/cq/search/content/querydebug.html).
   Predicates: path, type, nodename, fulltext, property / N_property (+ .value, .operation = equals|unequals|like|exists),
   orderby (+ .sort), p.limit, p.offset, p.hits (simple|full|selective) and p.properties. */

const QB_URL = '/libs/cq/search/content/querydebug.html';
const QB_DEFAULT = 'path=/content/wknd\ntype=cq:Page\np.limit=10';

function qbParams(text) {
  const out = {};
  // "%" is also the like-wildcard, so a value that is not valid URL encoding is kept as typed
  const decodeURIComponent = s => { try { return window.decodeURIComponent(s); } catch (e) { return s; } };
  for (const line of String(text || '').split(/\n|&/)) {
    const l = line.trim();
    if (!l || l.startsWith('#')) continue;
    const i = l.indexOf('=');
    if (i > 0) out[decodeURIComponent(l.slice(0, i).trim())] = decodeURIComponent(l.slice(i + 1).trim());
  }
  return out;
}

const qbGlob = (pat, s) => new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i').test(s);
const qbLike = (pat, s) => new RegExp('^' + String(pat).replace(/[.+^${}()|[\]\\*?]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i').test(String(s));

// a property path relative to the node, e.g. "jcr:content/cq:template"
function qbValue(node, rel) {
  const segs = rel.split('/');
  const prop = segs.pop();
  let n = node;
  for (const s of segs) { n = n && n.children.find(c => c.name === s); }
  return n ? n.props[prop] : undefined;
}

function qbFulltext(node, q) {
  const needle = q.toLowerCase().replace(/^"|"$/g, '');
  let hit = false;
  const scan = n => {
    if (hit) return;
    for (const v of Object.values(n.props)) {
      const s = Array.isArray(v) ? v.join(' ') : v;
      if (typeof s === 'string' && !s.startsWith('data:') && s.toLowerCase().includes(needle)) { hit = true; return; }
    }
    // a page's text lives in its jcr:content
    n.children.filter(c => c.name === 'jcr:content' || JCR.type(c) !== 'cq:Page').forEach(scan);
  };
  scan(node);
  return hit;
}

function runQuery(r, params) {
  const t0 = performance.now();
  const path = params.path || '/';
  const base = JCR.get(r, path);
  const props = [];
  for (const [k, v] of Object.entries(params)) {
    const m = /^(?:(\d+)_)?property$/.exec(k);
    if (m) {
      const pre = m[1] ? m[1] + '_' : '';
      const values = Object.entries(params).filter(([kk]) => kk === `${pre}property.value` || new RegExp(`^${pre}property\\.\\d+_value$`).test(kk)).map(([, vv]) => vv);
      props.push({ name: v, values, op: params[`${pre}property.operation`] || 'equals' });
    }
  }
  const matches = [];
  if (base) {
    JCR.walk(base, path, (n, p) => {
      if (params.type && JCR.type(n) !== params.type) return;
      if (params.nodename && !qbGlob(params.nodename, n.name)) return;
      for (const pr of props) {
        const val = qbValue(n, pr.name);
        const list = Array.isArray(val) ? val.map(String) : val == null ? [] : [String(val)];
        if (pr.op === 'exists') { if ((list.length > 0) !== (String(pr.values[0] || 'true') !== 'false')) return; continue; }
        if (pr.op === 'like') { if (!pr.values.some(x => list.some(v => qbLike(x, v)))) return; continue; }
        if (pr.op === 'unequals') { if (pr.values.some(x => list.includes(x))) return; continue; }
        if (!pr.values.length ? !list.length : !pr.values.some(x => list.includes(x))) return;
      }
      if (params.fulltext && !qbFulltext(n, params.fulltext)) return;
      matches.push({ n, p });
    });
  }
  if (params.orderby) {
    const key = params.orderby.replace(/^@/, '');
    const dir = params['orderby.sort'] === 'desc' ? -1 : 1;
    const v = m => (key === 'path' ? m.p : String(qbValue(m.n, key) ?? ''));
    matches.sort((a, b) => (v(a) < v(b) ? -1 : v(a) > v(b) ? 1 : 0) * dir);
  }
  const limit = params['p.limit'] === '-1' ? Infinity : Number(params['p.limit'] || 10);
  const offset = Number(params['p.offset'] || 0);
  const page = matches.slice(offset, offset + limit);
  const mode = params['p.hits'] || 'simple';
  const sel = String(params['p.properties'] || '').split(/\s+/).filter(Boolean);
  const hits = page.map(({ n, p }) => {
    if (mode === 'full') return JCR.toJSON(n, 1);
    if (mode === 'selective') return Object.fromEntries(sel.map(k => [k, k === 'jcr:path' ? p : qbValue(n, k)]).filter(([, v]) => v !== undefined));
    const c = JCR.get(n, 'jcr:content') || n;
    return { path: p, excerpt: '', name: n.name, title: c.props['jcr:title'] || c.props['dc:title'] || n.name, lastModified: c.props['cq:lastModified'] || c.props['jcr:lastModified'] || '', created: c.props['jcr:created'] || '' };
  });
  // the XPath QueryBuilder generates (what Oak actually runs)
  const attr = name => (name.includes('/') ? name.replace(/\/([^/]+)$/, '/@$1') : '@' + name);
  const conds = props.map(pr => (pr.op === 'exists' ? attr(pr.name)
    : pr.op === 'like' ? `jcr:like(${attr(pr.name)}, '${pr.values[0]}')`
      : `${attr(pr.name)} ${pr.op === 'unequals' ? '!=' : '='} '${pr.values[0] || ''}'`));
  if (params.fulltext) conds.push(`jcr:contains(., '${params.fulltext}')`);
  const xpath = `/jcr:root${path === '/' ? '' : path}//${params.nodename ? `element(${params.nodename}, ${params.type || 'nt:base'})` : `element(*, ${params.type || 'nt:base'})`}${conds.length ? `[${conds.join(' and ')}]` : ''}${params.orderby ? ` order by ${params.orderby.startsWith('@') ? params.orderby : '@' + params.orderby}${params['orderby.sort'] === 'desc' ? ' descending' : ''}` : ''}`;
  // without a narrow path and a type Oak has no index to use: it reads (traverses) the whole tree
  const traversal = (path === '/' || JCR.segs(path).length < 2) && !params.type && !params.fulltext;
  return { success: true, results: hits.length, total: matches.length, more: offset + hits.length < matches.length, offset, hits, xpath, traversal, ms: Math.max(1, Math.round(performance.now() - t0)) };
}

function qbFlags(params, res) {
  flag('qb:run');
  if (params.type) flag('qb:type');
  if (Object.keys(params).some(k => /property$/.test(k))) flag('qb:property');
  if (params.fulltext) flag('qb:fulltext');
  if (params.orderby) flag('qb:orderby');
  if (params['p.hits'] === 'selective') flag('qb:selective');
  if (res.traversal) flag('qb:traversal');
}

// /bin/querybuilder.json?path=…&type=…
function querybuilderJson(k, query) {
  const params = qbParams(String(query || '').replace(/^\?/, ''));
  const res = runQuery(S.repos[k], params);
  qbFlags(params, res);
  flag('qb:json');
  const { xpath, traversal, ms, ...body } = res;
  return jsonView('/bin/querybuilder.json' + (query ? '?' + String(query).replace(/^\?/, '') : ''), body, `QueryBuilder servlet · ${ms} ms${traversal ? ' · ⚠ traversal (no index)' : ''}`);
}

function queryDebugScreen() {
  S.ui.qb = S.ui.qb || { text: QB_DEFAULT, res: null };
  const Q = S.ui.qb;
  const res = Q.res;
  const qs = Object.entries(qbParams(Q.text)).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  flag('visit:querydebug');
  return `<div class="qb">
    <div class="qb-head">Query Builder Debugger</div>
    <div class="qb-main">
      <div class="qb-left">
        <label class="qb-l">Query <small>(one predicate per line)</small></label>
        <textarea class="qb-text" id="qb-text" spellcheck="false">${esc(Q.text)}</textarea>
        <div class="qb-btns"><button class="btn primary" data-act="qbRun">Search</button><button class="btn quiet" data-act="qbReset">Reset</button></div>
        <div class="qb-help"><b>Predicates</b><code>path=/content/wknd</code><code>type=cq:Page</code><code>nodename=*.svg</code><code>property=jcr:content/cq:template</code><code>property.value=/conf/…/page-content</code><code>property.operation=like</code> <small>(% wildcard)</small><code>fulltext=desert</code><code>orderby=@jcr:content/jcr:title</code><code>orderby.sort=desc</code><code>p.limit=-1</code><code>p.hits=selective</code><code>p.properties=jcr:path jcr:content/jcr:title</code><code>1_property=… 2_property=…</code></div>
      </div>
      <div class="qb-right">${res ? `
        <div class="qb-sum"><b>${res.total}</b> result(s) · showing ${res.results} · ${res.ms} ms ${res.traversal ? '<span class="qb-warn">⚠ Traversal: no index can be used (add a path and a type)</span>' : ''}</div>
        <div class="qb-xp"><small>XPath sent to Oak</small><code>${esc(res.xpath)}</code></div>
        <div class="qb-links"><a href="#" data-act="go" data-url="/bin/querybuilder.json?${esc(qs)}">Open as JSON: /bin/querybuilder.json?${esc(qs.slice(0, 90))}${qs.length > 90 ? '…' : ''}</a></div>
        <ol class="qb-hits">${res.hits.map(h => `<li>${h.path ? `<a href="#" data-act="qbOpen" data-path="${esc(h.path)}"><code>${esc(h.path)}</code></a>${h.title ? ` — ${esc(h.title)}` : ''}` : `<pre>${esc(JSON.stringify(h, null, 1)).slice(0, 600)}</pre>`}</li>`).join('') || '<li class="muted">No results.</li>'}</ol>`
    : '<p class="muted">Write predicates on the left and press <b>Search</b>.</p>'}</div>
    </div></div>`;
}

A.qbRun = () => {
  const ta = document.getElementById('qb-text');
  S.ui.qb.text = ta ? ta.value : S.ui.qb.text;
  const params = qbParams(S.ui.qb.text);
  S.ui.qb.res = runQuery(AR(), params);
  qbFlags(params, S.ui.qb.res);
  commit();
};
A.qbReset = () => {
  S.ui.qb = { text: QB_DEFAULT, res: null };
  commit();
};
A.qbOpen = d => crxReveal('author', d.path);
