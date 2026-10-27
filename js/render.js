/* Sling-like resolution + "HTL" rendering of pages, templates, policies and clientlibs */

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Rich text from the repository: keep the markup, drop anything executable
function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

// A component tree straight from content (used when a page's template is not available)
function plainTree(r, path) {
  const n = JCR.get(r, path);
  if (!n || !isCmpNode(n)) return null;
  const mk = (node, p) => {
    const rt = node.props['sling:resourceType'];
    const container = isContainerRt(r, rt);
    return { rt, props: node.props, path: p, kind: 'content', container, pkey: '', ckey: '', exists: true, children: container ? node.children.filter(isCmpNode).map(c => mk(c, p + '/' + c.name)) : [] };
  };
  return mk(n, path);
}

function textToHtml(s) {
  return String(s || '').split(/\n\s*\n/).filter(p => p.trim()).map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
}

// Sling search path: /apps first, then /libs
function componentNode(r, rt) {
  return JCR.get(r, '/apps/' + rt) || JCR.get(r, '/libs/' + rt);
}

// Follows sling:resourceSuperType until a renderer we know (the "HTL script") is found
// Maps any version of a Core Component (e.g. title/v2/title) to the version the lab ships
function canonCore(rt) {
  const m = String(rt || '').match(/^core\/wcm\/components\/([a-z]+)\/v\d+\/\1$/);
  if (!m) return null;
  return Object.keys(RENDER).find(k => k.startsWith(`core/wcm/components/${m[1]}/`)) || null;
}

function resolveCore(r, rt) {
  for (let i = 0; rt && i < 10; i++) {
    if (RENDER[rt]) return rt;
    const canon = canonCore(rt);
    if (canon) return canon;
    const c = componentNode(r, rt);
    if (!c) return null;
    rt = c.props['sling:resourceSuperType'];
  }
  return null;
}

function superChain(r, rt) {
  const chain = [];
  for (let i = 0; rt && i < 10; i++) {
    let real = rt;
    let c = componentNode(r, rt);
    if (!c && canonCore(rt)) {
      real = canonCore(rt);
      c = componentNode(r, real);
    }
    chain.push({ rt, path: c ? (JCR.get(r, '/apps/' + real) ? '/apps/' : '/libs/') + real : null });
    if (!c) break;
    rt = c.props['sling:resourceSuperType'];
  }
  return chain;
}

// The script Sling runs for a resource type: walking the super type chain, the first component that has
// <name>.html (an HTL file you wrote) wins; Core Components are rendered by the lab's built-in renderers.
function componentScript(r, rt) {
  for (const e of superChain(r, rt)) {
    // /libs Core Components run Java models: the lab's built-in renderers stand in for them
    if (e.path && !e.path.startsWith('/libs/')) {
      const name = JCR.name(e.path);
      const f = JCR.get(r, e.path + '/' + name + '.html');
      if (f && JCR.type(f) === 'nt:file') return { kind: 'htl', path: e.path + '/' + name + '.html', src: String(readFile(r, e.path + '/' + name + '.html') || '') };
    }
    if (RENDER[e.rt]) return { kind: 'core', core: e.rt, path: e.path };
    const canon = canonCore(e.rt);
    if (canon) return { kind: 'core', core: canon, path: e.path };
  }
  return null;
}

const HTL_WARN = {};

function renderHtl(script, t, ctx, kids) {
  try {
    const res = HTL.render(script.src, {
      r: ctx.r, t, ctx,
      renderChild: (path, rtOpt) => {
        const n = JCR.get(ctx.r, path);
        const tree = n && isCmpNode(n) ? plainTree(ctx.r, path) : rtOpt ? { rt: rtOpt, props: n ? n.props : {}, path, kind: 'content', container: isContainerRt(ctx.r, rtOpt), pkey: '', ckey: '', exists: !!n, children: [] } : null;
        return tree ? renderNode(tree, ctx) : '';
      },
    });
    if (res.warnings.length) HTL_WARN[t.path] = res.warnings;
    else delete HTL_WARN[t.path];
    let html = res.html;
    // a container you built still gets the editor's drop zone
    if (kids && t.container) html += kids;
    if (!html.trim()) return placeholder(ctx, componentTitle(ctx.r, t.rt), 'The HTL rendered nothing — configure the component');
    return html;
  } catch (e) {
    flag('htl:error');
    HTL_WARN[t.path] = ['HTL error: ' + e.message];
    return `<div style="border:1px solid #d7373f;background:#fff4f4;color:#a1141b;padding:10px 12px;margin:6px 0;font:12px Consolas,monospace;white-space:pre-wrap">org.apache.sling.scripting.sightly.SightlyException
${esc(script.path)}: ${esc(e.message)}</div>`;
  }
}

// The dialog is inherited through the super type chain, just like in AEM
function resolveDialog(r, rt) {
  for (const { path } of superChain(r, rt)) {
    if (!path) continue;
    const d = JCR.get(r, path + '/cq:dialog');
    if (d) return { node: d, path: path + '/cq:dialog' };
  }
  return null;
}

function componentTitle(r, rt) {
  const c = componentNode(r, rt);
  return (c && c.props['jcr:title']) || rt.split('/').pop();
}

function isContainerRt(r, rt) {
  return resolveCore(r, rt) === CORE.container;
}

function isCmpNode(n) {
  return !!n.props['sling:resourceType'];
}

function allComponents(r) {
  const base = JCR.get(r, '/apps/wknd/components');
  return (base ? base.children : [])
    .filter(c => JCR.type(c) === 'cq:Component' && c.props.componentGroup !== '.hidden')
    .map(c => ({ rt: 'wknd/components/' + c.name, title: c.props['jcr:title'] || c.name, group: c.props.componentGroup || 'Other' }));
}

/* ---------- policies ---------- */

function policyByRef(r, ref) {
  return ref ? JCR.get(r, POLICY_ROOT + '/' + ref) : null;
}

function policyMapping(r, tpl, key) {
  return JCR.get(r, `${tpl}/policies/jcr:content${key ? '/' + key : ''}`);
}

function getPolicy(r, tpl, key) {
  const m = policyMapping(r, tpl, key);
  return m ? policyByRef(r, m.props['cq:policy']) : null;
}

function allowedComponents(r, tpl, ckey) {
  const p = getPolicy(r, tpl, ckey);
  const list = (p && p.props.components) || [];
  return allComponents(r).filter(c => list.includes(c.rt) || list.includes('group:' + c.group));
}

function styleGroups(policy) {
  const sg = policy && JCR.get(policy, 'cq:styleGroups');
  if (!sg) return [];
  return sg.children.map(g => ({
    label: g.props['cq:styleGroupLabel'] || '',
    multiple: !!g.props['cq:styleGroupMultiple'],
    styles: (JCR.get(g, 'cq:styles') || { children: [] }).children.map(s => ({
      id: s.props['cq:styleId'], label: s.props['cq:styleLabel'] || '', classes: s.props['cq:styleClasses'] || '',
    })),
  }));
}

function styleClasses(policy, ids) {
  if (!ids || !ids.length) return '';
  const out = [];
  for (const g of styleGroups(policy)) for (const s of g.styles) if (ids.includes(s.id)) out.push(s.classes);
  return out.join(' ');
}

function pageClientlibs(r, tpl) {
  const p = getPolicy(r, tpl, '');
  return (p && p.props.clientlibs) || [];
}

/* ---------- clientlibs ---------- */

function readFile(r, p) {
  const c = JCR.get(r, p + '/jcr:content');
  if (c && c.props['jcr:data'] != null) return c.props['jcr:data'];
  const n = JCR.get(r, p);
  return n && n.props['jcr:data'] != null ? n.props['jcr:data'] : null;
}

function clientlibIndex(r) {
  const map = {};
  for (const base of ['/apps', '/libs']) {
    for (const { node, path } of JCR.find(r, base, n => JCR.type(n) === 'cq:ClientLibraryFolder')) {
      for (const c of node.props.categories || []) (map[c] = map[c] || []).push({ node, path });
    }
  }
  return map;
}

function cssTxt(r, folder) {
  const txt = readFile(r, folder + '/css.txt');
  if (txt == null) return '';
  let base = '';
  let out = '';
  for (let line of String(txt).split('\n')) {
    line = line.trim();
    if (!line || line.startsWith('//')) continue;
    if (line.startsWith('#base=')) { base = line.slice(6).trim(); continue; }
    const p = `${folder}/${base ? base + '/' : ''}${line}`;
    const d = readFile(r, p);
    out += d != null ? `\n/* ${p} */\n${d}\n` : `\n/* missing file: ${p} */\n`;
  }
  return out;
}

function clientlibCss(r, categories) {
  const idx = clientlibIndex(r);
  const seen = new Set();
  let css = '';
  const add = cat => {
    if (seen.has(cat)) return;
    seen.add(cat);
    for (const { node, path } of idx[cat] || []) {
      (node.props.dependencies || []).forEach(add);
      (node.props.embed || []).forEach(add);
      css += cssTxt(r, path);
    }
  };
  categories.forEach(add);
  return css;
}

/* ---------- component tree (template structure + page content) ---------- */

function hasMapping(r, tpl, key) {
  return !!policyMapping(r, tpl, key);
}

/*
 ctx.mode: 'view' | 'edit' (page) | 'struct' (template structure) | 'initial' (template initial content)
 ctx.content: the jcr:content that holds editable content (page or initial)
*/
function buildTree(r, ctx) {
  const sBase = ctx.tpl + '/structure/jcr:content';
  const sRoot = JCR.get(r, sBase + '/root');
  if (!JCR.get(r, ctx.tpl) || !sRoot) return null;
  return fromStruct(sRoot, 'root');

  function fromStruct(sn, rel) {
    const rt = sn.props['sling:resourceType'];
    const container = isContainerRt(r, rt);
    const unlocked = !!sn.props.editable;
    const kids = () => (container ? sn.children.filter(isCmpNode).map(c => fromStruct(c, rel + '/' + c.name)) : []);
    if (ctx.mode === 'struct') {
      return { rt, props: sn.props, path: sBase + '/' + rel, kind: 'struct', unlocked, container, pkey: rel, ckey: rel, deletable: rel !== 'root', exists: true, children: kids() };
    }
    if (unlocked) {
      const cPath = ctx.content + '/' + rel;
      const cn = JCR.get(r, cPath);
      return fromContent(cn || sn, cPath, rel, rel, true, !!cn, rt);
    }
    return { rt, props: sn.props, path: sBase + '/' + rel, kind: 'locked', container, pkey: rel, ckey: rel, exists: true, children: kids() };
  }

  function fromContent(cn, cPath, pkey, ckey, isStructRoot, exists, fallbackRt) {
    const rt = (exists && cn.props['sling:resourceType']) || fallbackRt;
    const exp = exists && ctx.audience && cn.props['cq:targeted'] ? JCR.get(cn, 'cq:experiences/' + ctx.audience) : null;
    const props = exp ? { ...cn.props, ...exp.props, 'sling:resourceType': rt } : cn.props;
    const container = isContainerRt(r, rt);
    const children = exists && container
      ? cn.children.filter(isCmpNode).map(ch => {
        const crt = ch.props['sling:resourceType'];
        const childKey = ckey + '/' + crt;
        const childCkey = isContainerRt(r, crt) && hasMapping(r, ctx.tpl, childKey) ? childKey : ckey;
        return fromContent(ch, cPath + '/' + ch.name, childKey, childCkey, false, true, crt);
      })
      : [];
    return { rt, props, path: cPath, kind: 'content', container, pkey, ckey, deletable: !isStructRoot, exists, structRt: fallbackRt, children, exp: exp ? ctx.audience : null };
  }
}

/* ---------- renderers ("HTL scripts") ---------- */

function placeholder(ctx, title, hint) {
  return ctx.editing ? `<div class="lab-ph"><b>${esc(title)}</b><br>${esc(hint)}</div>` : '';
}

function assetSrc(r, ref) {
  return ref ? readFile(r, ref + '/jcr:content/renditions/original') : null;
}

function titleType(t, policy) {
  let type = t.props.type || (policy && policy.props.type) || 'h1';
  const allowed = policy && policy.props.allowedTypes;
  if (allowed && allowed.length && !allowed.includes(type)) type = (policy.props.type && allowed.includes(policy.props.type)) ? policy.props.type : allowed[0];
  return type;
}

function navItems(r, t, ctx) {
  const rootPath = t.props.navigationRoot || SITE_ROOT;
  const rootNode = JCR.get(r, rootPath);
  if (!rootNode) return [];
  const item = (path, n) => {
    const c = JCR.get(n, 'jcr:content');
    return { path, title: (c && (c.props.navTitle || c.props['jcr:title'])) || n.name, active: ctx.pagePath && (ctx.pagePath === path || (path !== rootPath && ctx.pagePath.startsWith(path + '/'))) };
  };
  const list = [];
  if (String(t.props.skipNavigationRoot) !== 'true') list.push(item(rootPath, rootNode));
  for (const c of rootNode.children) {
    if (JCR.type(c) !== 'cq:Page') continue;
    const cc = JCR.get(c, 'jcr:content');
    if (!cc || cc.props.hideInNav === true || cc.props.hideInNav === 'true') continue;
    list.push(item(rootPath + '/' + c.name, c));
  }
  return list;
}

const RENDER = {
  [CORE.container]: (t, ctx, kids) => `<div class="cmp-container${t.grid ? ' lab-grid' : ''}">${kids}</div>`,
  [CORE.title]: (t, ctx, kids, policy) => {
    const type = titleType(t, policy);
    const text = t.props['jcr:title'] || ctx.pageTitle || 'Title';
    const inner = t.props.linkURL ? `<a class="cmp-title__link" href="${esc(t.props.linkURL)}.html">${esc(text)}</a>` : esc(text);
    return `<div class="cmp-title"><${type} class="cmp-title__text">${inner}</${type}></div>`;
  },
  [CORE.text]: (t, ctx) => (t.props.text
    ? `<div class="cmp-text">${String(t.props.textIsRich) === 'true' ? sanitizeHtml(t.props.text) : textToHtml(t.props.text)}</div>`
    : placeholder(ctx, 'Text', 'Double-click or use Configure (wrench) to add text')),
  'core/wcm/components/teaser/v2/teaser': (t, ctx) => {
    const src = t.props.fileReference && assetSrc(ctx.r, t.props.fileReference);
    const title = t.props['jcr:title'];
    const desc = t.props['jcr:description'];
    if (!title && !desc && !src) return placeholder(ctx, 'Teaser', 'No title, description or image');
    return `<div class="cmp-teaser">${src ? `<div class="cmp-teaser__image"><div class="cmp-image"><img class="cmp-image__image" src="${src}" alt=""></div></div>` : ''}
      <div class="cmp-teaser__content">${title ? `<h2 class="cmp-teaser__title">${t.props.linkURL ? `<a class="cmp-teaser__title-link" href="${esc(t.props.linkURL)}.html">${esc(title)}</a>` : esc(title)}</h2>` : ''}
      ${desc ? `<div class="cmp-teaser__description">${sanitizeHtml(desc)}</div>` : ''}</div></div>`;
  },
  'core/wcm/components/experiencefragment/v2/experiencefragment': (t, ctx) => {
    const p = t.props.fragmentVariationPath;
    const page = p && JCR.get(ctx.r, p);
    if (!page) return placeholder(ctx, 'Experience Fragment', p ? `Fragment not found on this instance: ${p}` : 'Configure a fragment variation');
    if ((ctx.xfDepth || 0) > 2) return '';
    const pc = JCR.get(page, 'jcr:content');
    const sub = { ...ctx, mode: 'view', editing: false, tpl: pc && pc.props['cq:template'], content: p + '/jcr:content', xfDepth: (ctx.xfDepth || 0) + 1 };
    const tree = (sub.tpl && buildTree(ctx.r, sub)) || plainTree(ctx.r, p + '/jcr:content/root');
    return `<div class="cmp-experiencefragment cmp-experiencefragment--${esc(JCR.name(JCR.parent(p)))}">${tree ? renderNode(tree, sub) : ''}</div>`;
  },
  'core/wcm/components/languagenavigation/v2/languagenavigation': (t, ctx) => {
    const root = JCR.get(ctx.r, t.props.navigationRoot || '/content/wknd');
    const langs = [];
    if (root) JCR.walk(root, t.props.navigationRoot || '/content/wknd', (n, path) => { if (JCR.type(n) === 'cq:Page' && /^[a-z]{2}$/.test(n.name)) langs.push(path); });
    return `<nav class="cmp-languagenavigation"><ul class="cmp-languagenavigation__group">${langs.map(l => `<li class="cmp-languagenavigation__item${ctx.pagePath && ctx.pagePath.startsWith(l) ? ' cmp-languagenavigation__item--active' : ''}"><a class="cmp-languagenavigation__item-link" href="${esc(l)}.html" lang="${esc(JCR.name(l))}">${esc(JCR.name(l).toUpperCase())}</a></li>`).join('')}</ul></nav>`;
  },
  'core/wcm/components/search/v2/search': () => '<section class="cmp-search" role="search"><form class="cmp-search__form" onsubmit="return false"><div class="cmp-search__field"><input class="cmp-search__input" type="text" placeholder="Search" aria-label="Search"></div></form></section>',
  'core/wcm/components/breadcrumb/v3/breadcrumb': (t, ctx) => {
    const segs = JCR.segs(ctx.pagePath || '');
    const items = [];
    for (let i = 3; i <= segs.length; i++) {
      const p = '/' + segs.slice(0, i).join('/');
      const c = JCR.get(ctx.r, p + '/jcr:content');
      if (c && !c.props.hideInNav) items.push([p, c.props.navTitle || c.props['jcr:title'] || JCR.name(p)]);
    }
    return `<nav class="cmp-breadcrumb"><ol class="cmp-breadcrumb__list">${items.map(([p, tt], i) => `<li class="cmp-breadcrumb__item">${i < items.length - 1 ? `<a class="cmp-breadcrumb__item-link" href="${esc(p)}.html">${esc(tt)}</a>` : esc(tt)}</li>`).join(' › ')}</ol></nav>`;
  },
  // Custom component from the archetype: helloworld.html + HelloWorldModel (Sling Model)
  'wknd/components/helloworld': (t, ctx) => {
    const message = `Hello World!\nResource type is: ${t.props['sling:resourceType'] || 'No resourceType'}\nCurrent page is:  ${ctx.pagePath || ''}\n`;
    return `<div class="cmp-helloworld" data-cmp-is="helloworld"><h2 class="cmp-helloworld__title">Hello World Component</h2>
      ${t.props.text ? `<div class="cmp-helloworld__item"><p class="cmp-helloworld__item-label">Text property:</p><pre class="cmp-helloworld__item-output">${esc(t.props.text)}</pre></div>` : ''}
      <div class="cmp-helloworld__item"><p class="cmp-helloworld__item-label">Model message:</p><pre class="cmp-helloworld__item-output">${esc(message)}</pre></div></div>`;
  },
  [CORE.image]: (t, ctx) => {
    const ref = t.props.fileReference;
    if (!ref) return placeholder(ctx, 'Image', 'Configure the component, or select it and click an asset in the side panel');
    const src = assetSrc(ctx.r, ref);
    if (!src) return `<div class="cmp-image" style="padding:14px;border:1px dashed #d7373f;color:#d7373f;font:13px sans-serif">Image not found on this instance: ${esc(ref)}</div>`;
    return `<div class="cmp-image"><img class="cmp-image__image" src="${src}" alt="${esc(String(t.props.isDecorative) === 'true' ? '' : t.props.alt || '')}"></div>`;
  },
  [CORE.button]: (t, ctx) => (t.props['jcr:title']
    ? `<a class="cmp-button" href="${t.props.linkURL ? esc(t.props.linkURL) + '.html' : '#'}"><span class="cmp-button__text">${esc(t.props['jcr:title'])}</span></a>`
    : placeholder(ctx, 'Button', 'Configure to add a label and link')),
  [CORE.separator]: () => '<div class="cmp-separator"><hr class="cmp-separator__horizontal-rule"></div>',
  [CORE.navigation]: (t, ctx) => {
    const items = navItems(ctx.r, t, ctx);
    const root = t.props.navigationRoot || SITE_ROOT;
    return `<nav class="cmp-navigation"><a class="cmp-navigation__brand" href="${esc(root)}.html">WKND</a><ul class="cmp-navigation__group">${items
      .map(i => `<li class="cmp-navigation__item${i.active ? ' cmp-navigation__item--active' : ''}"><a class="cmp-navigation__item-link" href="${esc(i.path)}.html">${esc(i.title)}</a></li>`)
      .join('')}</ul></nav>`;
  },
};

/* ---------- responsive grid (Layout mode) ----------
   Like AEM's responsive grid: a container has 12 columns, and each component stores its layout per breakpoint in
   cq:responsive/<default|tablet|phone> { width, offset, behavior: newline | hide }. Phone < 768px, tablet < 1200px. */
const BREAKPOINTS = [['default', 'd'], ['tablet', 't'], ['phone', 'p']];

function respCfg(r, path, bp) {
  const n = JCR.get(r, path + '/cq:responsive/' + bp);
  if (!n) return null;
  const width = Math.max(1, Math.min(12, parseInt(n.props.width, 10) || 12));
  const offset = Math.max(0, Math.min(12 - width, parseInt(n.props.offset, 10) || 0));
  return { width, offset, behavior: n.props.behavior || '' };
}

function respStyle(r, path) {
  const vars = [];
  for (const [bp, k] of BREAKPOINTS) {
    const c = respCfg(r, path, bp);
    if (!c) continue;
    const span = c.width + c.offset;
    vars.push(`--gc-${k}:${c.behavior === 'newline' ? '1 / ' : ''}span ${span}`, `--pl-${k}:${(c.offset / span * 100).toFixed(4)}%`, `--dsp-${k}:${c.behavior === 'hide' ? 'none' : 'block'}`);
  }
  return vars.join(';');
}

const GRID_D = 'grid-column:var(--gc-d,1 / -1);padding-left:var(--pl-d,0);display:var(--dsp-d,block)';
const GRID_T = 'grid-column:var(--gc-t,var(--gc-d,1 / -1));padding-left:var(--pl-t,var(--pl-d,0));display:var(--dsp-t,var(--dsp-d,block))';
const GRID_P = 'grid-column:var(--gc-p,var(--gc-t,var(--gc-d,1 / -1)));padding-left:var(--pl-p,var(--pl-t,var(--pl-d,0)));display:var(--dsp-p,var(--dsp-t,var(--dsp-d,block)))';
const GRID_CSS = `
.cmp-container.lab-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr))}
.lab-grid>*{min-width:0}
body:not([data-bp]) .lab-grid>*,body[data-bp=default] .lab-grid>*{${GRID_D}}
@media (max-width:1199px){body:not([data-bp]) .lab-grid>*{${GRID_T}}}
@media (max-width:767px){body:not([data-bp]) .lab-grid>*{${GRID_P}}}
body[data-bp=tablet] .lab-grid>*{${GRID_T}}
body[data-bp=phone] .lab-grid>*{${GRID_P}}
body .lab-grid>.lab-drop.lab-drop{grid-column:1 / -1;padding-left:14px;display:block}
`;

/* ---------- audiences (Targeting / ContextHub segments) ---------- */
const SEGMENT_ROOT = '/conf/wknd/settings/wcm/segments';
const SEASON_MONTHS = { summer: [6, 7, 8], winter: [12, 1, 2] };

function segmentsOf(r) {
  const base = JCR.get(r, SEGMENT_ROOT);
  return (base ? base.children : []).filter(n => JCR.type(n) === 'cq:Page').map(n => {
    const c = JCR.get(n, 'jcr:content') || { props: {} };
    return { name: n.name, title: c.props['jcr:title'] || n.name, months: [].concat(c.props['lab:months'] || SEASON_MONTHS[n.name] || []).map(Number) };
  });
}

// What ContextHub would resolve for a visitor right now (the seasons are based on the current month)
function currentAudience(r) {
  const m = new Date().getMonth() + 1;
  const seg = segmentsOf(r).find(s => s.months.includes(m));
  return seg ? seg.name : null;
}

function renderNode(t, ctx) {
  const r = ctx.r;
  t.grid = t.container && t.children.some(c => c.exists && JCR.get(r, c.path + '/cq:responsive'));
  const policy = getPolicy(r, ctx.tpl, t.pkey);
  const short = String(t.rt).split('/').pop();
  const styles = styleClasses(policy, t.props['cq:styleIds']);
  const canInsert = ctx.editing && t.container && (t.kind === 'content' || t.kind === 'struct');
  let kids = t.children.map(c => renderNode(c, ctx)).join('');
  if (canInsert) {
    kids += `<div class="lab-drop" data-drop="${esc(t.path)}" data-ckey="${esc(t.ckey)}" data-srt="${esc(t.rt)}">Drag components here</div>`;
  }
  const script = componentScript(r, t.rt);
  const inner = script && script.kind === 'htl' ? renderHtl(script, t, ctx, kids)
    : script ? RENDER[script.core](t, ctx, kids, policy)
    : `<div style="border:1px dashed #b3b3b3;color:#8e8e8e;padding:10px 12px;margin:6px 0;font:12px 'Source Sans 3','Segoe UI',sans-serif">${esc(componentTitle(r, t.rt))} — not simulated in the lab <code>${esc(t.rt)}</code></div>`;
  const cls = [short, t.container ? 'responsivegrid' : '', t.pkey === 'root' ? 'root' : '', styles].filter(Boolean).join(' ');
  const rs = t.exists && t.kind === 'content' ? respStyle(r, t.path) : '';
  const styleAttr = rs ? ` style="${rs}"` : '';
  if (!ctx.editing) return `<div class="${cls}"${styleAttr}>${inner}</div>`;

  const locked = t.kind === 'locked';
  const badge = t.kind === 'struct'
    ? `<span class="lab-badge ${t.unlocked ? 'lab-badge--open' : ''}">${esc(componentTitle(r, t.rt))}${t.unlocked ? ' · unlocked' : ' · locked'}</span>`
    : `<span class="lab-badge ${locked ? 'lab-badge--locked' : ''}">${esc(componentTitle(r, t.rt))}${locked ? ' · template' : ''}${t.props['cq:targeted'] ? ` · targeted${t.exp ? ' (' + esc(t.exp) + ')' : ''}` : ''}</span>`;
  const attrs = {
    'data-cmp': t.path, 'data-rt': t.rt, 'data-kind': t.kind, 'data-pkey': t.pkey, 'data-ckey': t.ckey,
    'data-container': t.container ? '1' : '', 'data-del': t.deletable ? '1' : '', 'data-exists': t.exists ? '1' : '',
    'data-unlocked': t.unlocked ? '1' : '', 'data-srt': t.structRt || '', 'data-title': componentTitle(r, t.rt),
    'data-targeted': t.props['cq:targeted'] ? '1' : '',
  };
  const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
  return `<div class="${cls}${locked ? ' lab-locked' : ''}${t.props['cq:targeted'] ? ' lab-targeted' : ''}" ${attrStr}${styleAttr}>${badge}${inner}</div>`;
}

const EDITOR_CSS = `
[data-cmp]{position:relative;outline:1px solid transparent;outline-offset:-1px;min-height:10px}
[data-cmp]:hover{outline:1px solid #2680eb;background-color:rgba(38,128,235,.05);cursor:pointer}
[data-cmp].lab-locked:hover{outline-color:#b3b3b3;background-color:rgba(0,0,0,.02);cursor:default}
[data-cmp].lab-sel{outline:2px solid #2680eb !important;background-color:rgba(38,128,235,.08)}
.lab-badge{position:absolute;top:0;left:0;z-index:5;font:600 11px "Source Sans 3","Segoe UI",sans-serif;background:#2680eb;color:#fff;padding:1px 6px;display:none;white-space:nowrap;letter-spacing:.02em}
.lab-badge--open{background:#2d9d78}
.lab-badge--locked{background:#8e8e8e}
[data-cmp]:hover>.lab-badge{display:block}
[data-cmp]:has([data-cmp]:hover)>.lab-badge{display:none}
[data-cmp]:not(.lab-sel):hover:has([data-cmp]:hover){outline-color:transparent;background-color:transparent}
.lab-drop{border:1px dashed #b3b3b3;background:transparent;color:#8e8e8e;font:13px "Source Sans 3","Segoe UI",sans-serif;text-align:center;padding:14px;margin:8px 0;cursor:pointer}
.lab-drop:hover{border:1px solid #2680eb;color:#2680eb;background:rgba(38,128,235,.06)}
.lab-ph{font:13px "Source Sans 3","Segoe UI",sans-serif;color:#8e8e8e;background:#f5f5f5;padding:18px;text-align:center;border:1px solid #e1e1e1;margin:8px 0}
.lab-tb{position:absolute;z-index:99999;display:flex;align-items:center;background:#fff;border:1px solid #cacaca;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.15);padding:2px;font:13px "Source Sans 3","Segoe UI",sans-serif;color:#4b4b4b}
.lab-tb[hidden]{display:none}
.lab-tb button{border:0;background:none;width:32px;height:32px;padding:0;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;cursor:pointer;color:#6e6e6e}
.lab-tb button:hover{background:#eaeaea;color:#2c2c2c}
.lab-tb button svg{width:18px;height:18px;fill:currentColor}
.lab-tb .lab-tb-label{display:inline-flex;align-items:center;gap:4px;padding:0 8px;color:#6e6e6e;font-size:12px;white-space:nowrap}
.lab-tb .lab-tb-label svg{width:14px;height:14px;fill:currentColor}
.lab-tb .lab-tb-sep{width:1px;height:20px;background:#e1e1e1;margin:0 2px}
.root>.cmp-container>.text:has(+ .lab-drop:last-child) .cmp-text{border-top:1px solid #e6e6e6;margin-top:40px;padding-top:16px;font-size:13px;max-width:none}
.lab-drop.lab-sel{border:1px solid #2680eb;color:#2680eb;background:rgba(38,128,235,.06)}
.lab-dragover{outline:2px solid #2680eb !important;background-color:rgba(38,128,235,.12) !important}
.lab-mode-layout .lab-drop,.lab-mode-developer .lab-drop,.lab-mode-targeting .lab-drop{display:none !important}
.lab-mode-layout .lab-cols{background-image:linear-gradient(to right,rgba(38,128,235,.10) calc(100% - 4px),transparent 0);background-size:calc(100% / 12) 100%;background-origin:content-box;background-clip:content-box}
.lab-rh{position:absolute;top:50%;width:10px;height:30px;margin-top:-15px;background:#2680eb;border:2px solid #fff;border-radius:4px;cursor:ew-resize;z-index:7;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.lab-rh.l{left:-6px}.lab-rh.r{right:-6px}
.lab-mode-developer [data-cmp]:hover>.lab-badge{background:#4b4b4b}
.lab-mode-developer [data-cmp].lab-sel{outline-color:#4b4b4b !important}
.lab-targeted{box-shadow:inset 3px 0 0 #e68619}
.lab-mode-targeting .lab-targeted>.lab-badge{display:block;background:#e68619}
.lab-tb button[disabled]{opacity:.35;cursor:default}
.lab-tb button[disabled]:hover{background:none}
`;

function docShell(title, lang, css, body, editing, bp) {
  return `<!doctype html><html lang="${esc(lang || 'en')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${css}</style><style>${GRID_CSS}</style>${editing ? `<style>${EDITOR_CSS}</style>` : ''}</head><body class="page basicpage"${bp ? ` data-bp="${esc(bp)}"` : ''}>${body}${editing ? '<div id="lab-tb" class="lab-tb" hidden></div>' : ''}</body></html>`;
}

function errorDoc(title, msg) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font:15px 'Segoe UI',sans-serif;padding:40px;color:#333"><h2 style="color:#d7373f">${esc(title)}</h2><p>${msg}</p></body></html>`;
}

// mode: 'view' | 'edit'; opts.audience: the ContextHub segment to render (view defaults to what a visitor gets today)
function pageDoc(r, pagePath, mode, opts) {
  opts = opts || {};
  const page = JCR.get(r, pagePath);
  const pc = page && JCR.get(page, 'jcr:content');
  if (!pc) return errorDoc('404 — Resource not found', `No page at <code>${esc(pagePath)}</code> on this instance.`);
  const tpl = pc.props['cq:template'];
  const audience = opts.audience !== undefined ? opts.audience : mode === 'view' ? currentAudience(r) : null;
  const ctx = { r, mode, tpl, content: pagePath + '/jcr:content', pagePath, pageTitle: pc.props['jcr:title'] || page.name, editing: mode === 'edit', audience };
  const tree = tpl && buildTree(r, ctx);
  if (!tree) {
    return errorDoc('Template not found', `The page uses template <code>${esc(tpl)}</code>, which does not exist on this instance.<br><br>On Publish this usually means the template (and its policies) were never published.`);
  }
  const css = clientlibCss(r, pageClientlibs(r, tpl));
  return docShell(pc.props.pageTitle || pc.props['jcr:title'] || page.name, pc.props['jcr:language'], css, renderNode(tree, ctx), ctx.editing, opts.bp);
}

// mode: 'struct' | 'initial'
function templateDoc(r, tpl, mode) {
  const tc = JCR.get(r, tpl + '/jcr:content');
  const ctx = { r, mode, tpl, content: tpl + '/initial/jcr:content', pagePath: null, pageTitle: (tc && tc.props['jcr:title']) || 'Template', editing: true };
  const tree = buildTree(r, ctx);
  if (!tree) return errorDoc('Broken template', `Template <code>${esc(tpl)}</code> has no structure/jcr:content/root.`);
  return docShell(ctx.pageTitle, 'en', clientlibCss(r, pageClientlibs(r, tpl)), renderNode(tree, ctx), true);
}

/* ---------- Sling Model Exporter (.model.json) ---------- */

function modelOf(t, ctx) {
  const r = ctx.r;
  const core = resolveCore(r, t.rt);
  const policy = getPolicy(r, ctx.tpl, t.pkey);
  const o = { id: String(t.rt).split('/').pop() + '-' + Math.abs(hashCode(t.path)).toString(16).slice(0, 8), ':type': t.rt };
  const cls = styleClasses(policy, t.props['cq:styleIds']);
  if (cls) o.appliedCssClassNames = cls;
  if (core === CORE.title) { o.text = t.props['jcr:title'] || ctx.pageTitle; o.type = titleType(t, policy); }
  if (core === CORE.text) { o.text = textToHtml(t.props.text || ''); o.richText = true; }
  if (core === CORE.image) { o.src = t.props.fileReference || null; o.alt = t.props.alt || ''; }
  if (core === CORE.button) { o.text = t.props['jcr:title'] || ''; o.link = { url: t.props.linkURL ? t.props.linkURL + '.html' : null }; }
  if (core === CORE.navigation) o.items = navItems(r, t, ctx).map(i => ({ title: i.title, url: i.path + '.html', active: !!i.active }));
  if (t.container) {
    o[':itemsOrder'] = t.children.map(c => JCR.name(c.path));
    o[':items'] = Object.fromEntries(t.children.map(c => [JCR.name(c.path), modelOf(c, ctx)]));
  }
  return o;
}

function pageModel(r, pagePath) {
  const page = JCR.get(r, pagePath);
  const pc = page && JCR.get(page, 'jcr:content');
  if (!pc) return null;
  const tpl = pc.props['cq:template'];
  const ctx = { r, mode: 'view', tpl, content: pagePath + '/jcr:content', pagePath, pageTitle: pc.props['jcr:title'] || page.name, editing: false };
  const tree = tpl && buildTree(r, ctx);
  return {
    title: pc.props['jcr:title'] || page.name,
    lastModifiedDate: pc.props['cq:lastModified'] ? Date.parse(pc.props['cq:lastModified']) : null,
    templateName: tpl ? JCR.name(tpl) : null,
    language: pc.props['jcr:language'] || 'en',
    ':type': pc.props['sling:resourceType'],
    ':path': pagePath,
    ':hierarchyType': 'page',
    ':itemsOrder': tree ? ['root'] : [],
    ':items': tree ? { root: modelOf(tree, ctx) } : {},
  };
}

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
