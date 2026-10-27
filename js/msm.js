/* Sites "Create" menu: Site & Live Copy (Multi Site Manager), Launch, Language Copy, CSV Report */

const LAUNCH_ROOT = '/content/launches';
const LAUNCHES_URL = '/libs/launches/content/launches.html';
// languages AEM offers for language copies (code → English name)
const LANG_NAMES = {
  en: 'English', ar: 'Arabic', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian', ja: 'Japanese', zh: 'Chinese', ko: 'Korean',
  pt: 'Portuguese', ru: 'Russian', nl: 'Dutch', sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', pl: 'Polish', tr: 'Turkish',
  he: 'Hebrew', hi: 'Hindi', cs: 'Czech', hu: 'Hungarian', el: 'Greek', th: 'Thai', id: 'Indonesian', ur: 'Urdu', fa: 'Persian',
};
// properties MSM never overwrites on a live copy
const MSM_KEEP = ['jcr:primaryType', 'jcr:mixinTypes', 'jcr:created', 'jcr:createdBy', 'cq:lastModified', 'cq:lastModifiedBy', 'cq:lastReplicated',
  'cq:lastReplicatedBy', 'cq:lastReplicationAction', 'cq:lastRolledout', 'cq:lastRolledoutBy', 'jcr:lockOwner', 'jcr:lockIsDeep', 'cq:propertyInheritanceCancelled'];

const mixinsOf = n => [].concat(n.props['jcr:mixinTypes'] || []);
const hasMixin = (n, m) => mixinsOf(n).includes(m);
function addMixin(n, m) {
  const a = mixinsOf(n);
  if (!a.includes(m)) n.props['jcr:mixinTypes'] = [...a, m];
}
function removeMixin(n, m) {
  const a = mixinsOf(n).filter(x => x !== m);
  if (a.length) n.props['jcr:mixinTypes'] = a;
  else delete n.props['jcr:mixinTypes'];
}

function walkPages(node, path, fn) {
  if (JCR.type(node) === 'cq:Page') fn(node, path);
  node.children.forEach(c => { if (JCR.type(c) === 'cq:Page') walkPages(c, path + '/' + c.name, fn); });
}

function stripPageState(pc) {
  for (const k of ['cq:lastReplicated', 'cq:lastReplicatedBy', 'cq:lastReplicationAction', 'jcr:lockOwner', 'jcr:lockIsDeep']) delete pc.props[k];
}

/* ---------- Live Copy model ---------- */

function liveCopyRootOf(r, path) {
  for (let p = path; p && p !== '/'; p = JCR.parent(p)) {
    const cfg = JCR.get(r, p + '/jcr:content/cq:LiveSyncConfig');
    if (cfg) return { root: p, master: cfg.props['cq:master'], deep: cfg.props['cq:isDeep'] !== false, configs: [].concat(cfg.props['cq:rolloutConfigs'] || []), excluded: [].concat(cfg.props['cq:excludedPaths'] || []), cfg };
  }
  return null;
}

function blueprintOf(r, path) {
  const lc = liveCopyRootOf(r, path);
  return lc ? lc.master + path.slice(lc.root.length) : null;
}

function liveCopyRoots(r) {
  return JCR.find(r, '/content', n => n.name === 'cq:LiveSyncConfig')
    .filter(x => !x.path.startsWith(LAUNCH_ROOT + '/'))
    .map(x => ({ root: x.path.replace('/jcr:content/cq:LiveSyncConfig', ''), master: x.node.props['cq:master'], deep: x.node.props['cq:isDeep'] !== false, configs: [].concat(x.node.props['cq:rolloutConfigs'] || []), excluded: [].concat(x.node.props['cq:excludedPaths'] || []) }));
}

// Live copies that receive content from this (blueprint) page
function liveCopiesOf(r, source) {
  return liveCopyRoots(r)
    .filter(l => source === l.master || (l.deep && source.startsWith(l.master + '/')))
    .filter(l => !l.excluded.some(x => source === x || source.startsWith(x + '/')))
    .map(l => ({ ...l, target: l.root + source.slice(l.master.length) }));
}

function markInherited(pc) {
  addMixin(pc, 'cq:LiveRelationship');
  JCR.walk(pc, '', n => { if (n !== pc && n.props['sling:resourceType']) addMixin(n, 'cq:LiveRelationship'); });
}

function prepareCopy(pageNode, deep) {
  const copy = JCR.clone(pageNode);
  if (!deep) copy.children = copy.children.filter(c => JCR.type(c) !== 'cq:Page');
  walkPages(copy, '', p => {
    const pc = JCR.get(p, 'jcr:content');
    if (!pc) return;
    stripPageState(pc);
    pc.children = pc.children.filter(c => c.name !== 'cq:LiveSyncConfig');
    removeMixin(pc, 'cq:LiveSync');
  });
  return copy;
}

function createLiveCopy(r, source, destParent, name, title, deep, configs, excluded) {
  const src = JCR.get(r, source);
  const copy = prepareCopy(src, deep);
  copy.name = name;
  walkPages(copy, '', p => {
    const pc = JCR.get(p, 'jcr:content');
    if (!pc) return;
    markInherited(pc);
    Object.assign(pc.props, { 'cq:lastRolledout': now(), 'cq:lastRolledoutBy': 'admin', 'cq:lastModified': now() });
  });
  const pc = JCR.get(copy, 'jcr:content');
  if (title && title !== pc.props['jcr:title']) {
    pc.props['jcr:title'] = title;
    pc.props['cq:propertyInheritanceCancelled'] = ['jcr:title'];
  }
  addMixin(pc, 'cq:LiveSync');
  pc.children.push(JCR.node('cq:LiveSyncConfig', {
    'jcr:primaryType': 'cq:LiveCopy', 'cq:master': source, 'cq:isDeep': !!deep,
    'cq:rolloutConfigs': configs && configs.length ? configs : ['/libs/msm/wcm/rolloutconfigs/default'],
    ...(excluded && excluded.length ? { 'cq:excludedPaths': excluded } : {}),
  }));
  JCR.get(r, destParent).children.push(copy);
  const path = JCR.join(destParent, name);
  // the first rollout of a live copy also rewrites references when a config asks for it
  if (configActions(r, configs || [], null).has('referencesUpdate')) JCR.walk(copy, path, (n, p) => { if (n.name === 'jcr:content') updateReferences(n, source, path); });
  return path;
}

/* ---------- rollout configs & actions ---------- */

const RC_BASE = '/libs/msm/wcm/rolloutconfigs';

function rolloutConfig(r, path) {
  const n = JCR.get(r, path);
  if (!n) return null;
  return { path, title: n.props['jcr:title'] || n.name, trigger: n.props['cq:trigger'] || 'rollout', actions: n.children.map(c => c.name), desc: n.props['jcr:description'] || '' };
}

// Union of the actions of the configs that react to this trigger (null = any trigger)
function configActions(r, configs, trigger) {
  const set = new Set();
  for (const c of configs) {
    const rc = rolloutConfig(r, c);
    if (rc && (!trigger || rc.trigger === trigger)) rc.actions.forEach(a => set.add(a));
  }
  return set;
}

// referencesUpdate: links that point inside the blueprint are rewritten to point inside the live copy
function updateReferences(node, master, root) {
  JCR.walk(node, '', n => {
    if (n.name === 'cq:LiveSyncConfig') return; // cq:master must keep pointing at the blueprint
    for (const [k, v] of Object.entries(n.props)) {
      if (typeof v === 'string' && (v === master || v.startsWith(master + '/'))) n.props[k] = root + v.slice(master.length);
      else if (Array.isArray(v)) n.props[k] = v.map(x => (typeof x === 'string' && (x === master || x.startsWith(master + '/')) ? root + x.slice(master.length) : x));
    }
  });
}

/* ---------- rollout ---------- */

// acts: Set of LiveSyncActions (contentUpdate, contentCopy, contentDelete, orderChildren …)
function syncChildren(s, t, acts) {
  for (const sc of s.children) {
    if (sc.name === 'cq:LiveSyncConfig' || JCR.type(sc) === 'cq:Page') continue;
    const tc = t.children.find(x => x.name === sc.name);
    if (!tc) {
      if (!acts.has('contentCopy')) continue;
      const c = JCR.clone(sc);
      JCR.walk(c, '', n => { if (n.props['sling:resourceType']) addMixin(n, 'cq:LiveRelationship'); });
      t.children.push(c);
      continue;
    }
    if (hasMixin(tc, 'cq:LiveSyncCancelled')) continue; // inheritance cancelled: local content wins
    if (acts.has('contentUpdate')) {
      const mx = tc.props['jcr:mixinTypes'];
      tc.props = { ...sc.props };
      if (mx) tc.props['jcr:mixinTypes'] = mx;
      if (tc.props['sling:resourceType']) addMixin(tc, 'cq:LiveRelationship');
    }
    syncChildren(sc, tc, acts);
  }
  // contentDelete: inherited nodes removed from the blueprint go away; local additions always stay
  if (acts.has('contentDelete')) {
    t.children = t.children.filter(tc => JCR.type(tc) === 'cq:Page' || tc.name === 'cq:LiveSyncConfig' || s.children.some(sc => sc.name === tc.name)
      || !hasMixin(tc, 'cq:LiveRelationship') || hasMixin(tc, 'cq:LiveSyncCancelled'));
  }
  if (acts.has('orderChildren')) {
    const order = s.children.map(c => c.name);
    t.children.sort((a, b) => {
      const ia = order.indexOf(a.name);
      const ib = order.indexOf(b.name);
      return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
    });
  }
}

// Applies the given actions from a blueprint page to its live copy page; lc = the live copy (for referencesUpdate)
function syncPage(r, sourcePath, targetPath, acts, lc) {
  acts = acts || new Set(['contentUpdate', 'contentCopy', 'contentDelete', 'referencesUpdate', 'orderChildren']);
  lc = lc || liveCopyRootOf(r, targetPath) || liveCopyRootOf(r, JCR.parent(targetPath));
  const sp = JCR.get(r, sourcePath);
  const spc = sp && JCR.get(sp, 'jcr:content');
  if (!spc) return 'skipped';
  const tp = JCR.get(r, targetPath);
  const stamp = pc => Object.assign(pc.props, { 'cq:lastRolledout': now(), 'cq:lastRolledoutBy': 'admin', 'cq:lastModified': now() });
  if (!tp) {
    if (!acts.has('contentCopy')) return 'skipped';
    const parent = JCR.get(r, JCR.parent(targetPath));
    if (!parent) return 'skipped';
    const copy = prepareCopy(sp, false);
    copy.name = JCR.name(targetPath);
    const pc = JCR.get(copy, 'jcr:content');
    markInherited(pc);
    if (acts.has('referencesUpdate') && lc) updateReferences(pc, lc.master, lc.root);
    stamp(pc);
    parent.children.push(copy);
    return 'created';
  }
  const tpc = JCR.get(tp, 'jcr:content');
  if (!tpc) return 'skipped';
  if (hasMixin(tpc, 'cq:LiveSyncCancelled')) return 'suspended';
  if (acts.has('contentUpdate')) {
    const keep = new Set([...MSM_KEEP, ...[].concat(tpc.props['cq:propertyInheritanceCancelled'] || [])]);
    const props = {};
    for (const [k, v] of Object.entries(spc.props)) if (!keep.has(k)) props[k] = v;
    for (const [k, v] of Object.entries(tpc.props)) if (keep.has(k)) props[k] = v;
    tpc.props = props;
  }
  addMixin(tpc, 'cq:LiveRelationship');
  syncChildren(spc, tpc, acts);
  if (acts.has('referencesUpdate') && lc) updateReferences(tpc, lc.master, lc.root);
  stamp(tpc);
  return 'updated';
}

// trigger: 'rollout' (Rollout button), 'modification' (page saved) — only configs with that trigger run
function rollout(r, sourcePath, deep, onlyTargets, trigger) {
  trigger = trigger || 'rollout';
  const pages = deep ? allPagePaths(r, sourcePath) : [sourcePath];
  const res = { updated: 0, created: 0, suspended: 0, skipped: 0, noconfig: 0 };
  for (const p of pages) {
    for (const lc of liveCopiesOf(r, p)) {
      if (onlyTargets && !onlyTargets.includes(lc.root)) continue;
      const acts = configActions(r, lc.configs, trigger);
      if (!['contentUpdate', 'contentCopy', 'contentDelete'].some(a => acts.has(a))) { res.noconfig++; continue; }
      res[syncPage(r, p, lc.target, acts, lc)]++;
    }
  }
  if (trigger === 'rollout') flag('msm:rollout');
  return res;
}

// Rollout configs with the "modification" trigger (Push on modify, Push on modify (shallow))
function msmAfterModify(pagePath) {
  const r = AR();
  if (!pagePath || !pagePath.startsWith('/content/')) return;
  for (const lc of liveCopiesOf(r, pagePath)) {
    const acts = configActions(r, lc.configs, 'modification');
    if (acts.size) {
      syncPage(r, pagePath, lc.target, acts, lc);
      flag('msm:pushonmodify');
    }
  }
}

// Rollout configs with the "publish" trigger (Activate on Blueprint activation)
function msmAfterActivate(pagePath) {
  const r = AR();
  const targets = liveCopiesOf(r, pagePath).filter(lc => configActions(r, lc.configs, 'publish').has('targetActivate') && JCR.get(r, lc.target)).map(lc => lc.target);
  if (targets.length) {
    queueReplication('Activate', targets);
    flag('msm:targetActivate');
  }
}

// Rollout configs with the "deactivate" trigger (Deactivate on Blueprint deactivation)
function msmAfterDeactivate(pagePath) {
  const r = AR();
  const targets = liveCopiesOf(r, pagePath).filter(lc => configActions(r, lc.configs, 'deactivate').has('targetDeactivate') && JCR.get(PR(), lc.target)).map(lc => lc.target);
  if (targets.length) {
    queueReplication('Deactivate', targets);
    flag('msm:targetDeactivate');
  }
}

function openRollout(path) {
  const r = AR();
  const lcs = liveCopiesOf(r, path);
  if (!lcs.length) { toast('This page has no live copies.', 'warn'); return; }
  const cfgText = l => l.configs.map(c => { const rc = rolloutConfig(r, c); return rc ? `${esc(rc.title)} <small class="muted">(${rc.trigger})</small>` : esc(c); }).join(', ');
  openModal({
    title: `Rollout <small>${esc(path)}</small>`,
    okLabel: 'Rollout',
    body: `<p>Push the content of this blueprint page to its live copies:</p>
      ${lcs.map(l => `<label class="check"><input type="checkbox" name="t" data-multi="1" value="${esc(l.root)}" checked> <span><code>${esc(l.target)}</code><br><small>${cfgText(l)}</small></span></label>`).join('')}
      <label class="check"><input type="checkbox" name="deep" checked> Rollout page and all sub pages</label>
      <p class="hint">Only rollout configs with the <b>rollout</b> trigger run here (e.g. Standard rollout config). Push on modify runs by itself when you save the blueprint; Activate/Deactivate run when you publish/unpublish it.</p>`,
    ok: b => {
      const f = formData(b);
      const res = rollout(r, path, f.deep, f.t || [], 'rollout');
      toast(`Rollout done: ${res.updated} updated, ${res.created} created${res.suspended ? `, ${res.suspended} suspended` : ''}${res.noconfig ? `, ${res.noconfig} skipped (no config with the rollout trigger)` : ''}.`);
      commit();
    },
  });
}

A.rolloutPage = () => openRollout(S.ui.sitesSel);

/* ---------- Create Site (from a blueprint) ---------- */

function blueprints(r) {
  const out = [];
  for (const base of ['/apps/msm', '/libs/msm']) {
    const n = JCR.get(r, base);
    (n ? n.children : []).forEach(c => {
      const pc = JCR.get(c, 'jcr:content');
      if (pc && pc.props.sitePath) out.push({ path: base + '/' + c.name, title: pc.props['jcr:title'] || c.name, desc: pc.props['jcr:description'] || '', sitePath: pc.props.sitePath });
    });
  }
  return out;
}

function rolloutConfigOptions(r) {
  const n = JCR.get(r, '/libs/msm/wcm/rolloutconfigs');
  return (n ? n.children : []).map(c => ['/libs/msm/wcm/rolloutconfigs/' + c.name, c.props['jcr:title'] || c.name]);
}

/* Create Site wizard — a full page, like /mnt/overlay/wcm/core/content/sites/createsitewizard.html/<destination> */

const SITE_WIZ_URL = '/mnt/overlay/wcm/core/content/sites/createsitewizard.html';
// blueprints that exist in a real AEM but are not simulated here
const OTHER_BLUEPRINTS = [['Catalog System Blueprint', 'blueprint'], ['Experience Fragments', 'blueprint'], ['Screens', 'folder']];

A.siteCreate = () => {
  S.ui.siteWiz = null;
  go(SITE_WIZ_URL + S.ui.sitesSel);
};

function siteWizState(dest) {
  if (!S.ui.siteWiz || S.ui.siteWiz.for !== dest) {
    S.ui.siteWiz = { for: dest, step: 1, bp: null, dest, langs: [], chapters: [], title: '', name: '', nameTouched: false, owner: '', lc: true, rcs: ['/libs/msm/wcm/rolloutconfigs/default'] };
  }
  return S.ui.siteWiz;
}

function wizLanguages(r, bp) {
  return bp ? childEntries(r, bp.sitePath, ['cq:Page']) : [];
}

// chapters = the top-level pages under the language masters, by name
function wizChapters(r, bp, langs) {
  const out = new Map();
  for (const l of langs) childEntries(r, l, ['cq:Page']).forEach(c => { if (!out.has(JCR.name(c))) out.set(JCR.name(c), titleOf(r, c)); });
  return [...out.entries()];
}

function wizValid(W) {
  return !!(W.bp && W.title.trim() && W.owner.trim() && W.dest && W.langs.length && JCR.get(AR(), W.dest));
}

function siteWizardScreen(dest) {
  const r = AR();
  const W = siteWizState(dest || '/content');
  const bps = blueprints(r);
  const bp = bps.find(b => b.path === W.bp);
  const steps = `<div class="wiz-steps"><div class="wiz-step ${W.step === 1 ? 'on' : 'done'}"><span>Blueprint</span><i></i></div><div class="wiz-line ${W.step === 2 ? 'done' : ''}"></div>
    <div class="wiz-step ${W.step === 2 ? 'on' : ''}"><span>Properties</span><i></i></div></div>`;
  const btns = W.step === 1
    ? `<button class="wbtn" data-act="wizCancel">Cancel</button><button class="wbtn primary" data-act="wizNext" ${W.bp ? '' : 'disabled'}>Next</button>`
    : `<button class="wbtn" data-act="wizBack">Back</button><button class="wbtn primary" id="wiz-create" data-act="wizCreate" ${wizValid(W) ? '' : 'disabled'}>Create</button>`;
  let body;
  if (W.step === 1) {
    const card = (title, sel, act, kind, extra) => `<a href="#" class="bp-card ${sel ? 'sel' : ''} ${act ? '' : 'off'}" ${act ? `data-act="wizBp" ${extra}` : 'title="Not simulated in the lab"'}>
      <div class="bp-thumb ${kind}"><div class="bp-win"></div><div class="bp-win"></div><div class="bp-win"></div>${kind === 'folder' ? `<span class="bp-folder">${icon('Folder', 72)}</span>` : `<span class="bp-badge">${icon('Branch2', 30)}</span>`}</div>
      <div class="bp-title">${esc(title)}</div></a>`;
    body = `<div class="bp-grid">${OTHER_BLUEPRINTS.slice(0, 2).map(([t, k]) => card(t, false, false, k)).join('')}
      ${card(OTHER_BLUEPRINTS[2][0], false, false, OTHER_BLUEPRINTS[2][1])}
      ${bps.map(b => card(b.title, W.bp === b.path, true, 'blueprint', `data-path="${esc(b.path)}" title="${esc(b.sitePath)}"`)).join('')}</div>`;
  } else {
    const langs = wizLanguages(r, bp);
    const chapters = wizChapters(r, bp, W.langs);
    W.chapters = W.chapters.filter(c => chapters.some(([n]) => n === c));
    const tagSelect = (key, all, chosen, label, info) => `<div class="wf"><div class="wf-label">${label}<span class="wf-info" title="${esc(info)}">${icon('Info', 16)}</span></div>
      <select class="wf-select" data-wizadd="${key}"><option value="">Select</option>${all.filter(([v]) => !chosen.includes(v)).map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select>
      <div class="wf-tags">${chosen.map(v => `<span class="wf-tag"><a href="#" data-act="wizDel" data-k="${key}" data-v="${esc(v)}" title="Remove">✕</a>${esc((all.find(x => x[0] === v) || [, v])[1])}</span>`).join('')}</div></div>`;
    const users = (JCR.get(r, '/home/users/a') || { children: [] }).children.map(u => u.name);
    body = `<div class="wiz-form">
      <div class="wiz-col">
        ${tagSelect('langs', langs.map(l => [l, LANG_NAMES[JCR.name(l)] || titleOf(r, l)]), W.langs, 'Initial Languages', 'Language masters of the blueprint that the new site gets')}
        ${tagSelect('chapters', chapters.map(([n, t]) => [n, `${t} (${n})`]), W.chapters, 'Initial Chapters', 'Top-level pages under each language that the new site gets')}
      </div>
      <div class="wiz-col">
        <div class="wf"><div class="wf-label">Destination Path *</div><div class="wf-path"><input data-wiz="dest" value="${esc(W.dest)}" autocomplete="off"><button type="button" class="wf-pick" data-act="wizPickDest" title="Select path">${icon('SelectionChecked', 18)}</button></div></div>
        <div class="wf"><div class="wf-label">Title *</div><input data-wiz="title" value="${esc(W.title)}" autocomplete="off"></div>
        <div class="wf"><div class="wf-label">Name</div><input data-wiz="name" value="${esc(W.name)}" autocomplete="off" placeholder="${esc(W.title ? slug(W.title) : '')}"></div>
        <div class="wf"><div class="wf-label">Site Owner *</div><input data-wiz="owner" value="${esc(W.owner)}" list="wiz-users" autocomplete="off"><datalist id="wiz-users">${users.map(u => `<option value="${esc(u)}">`).join('')}</datalist></div>
        <label class="wf-check"><input type="checkbox" data-wizchk="lc" ${W.lc ? 'checked' : ''}> Live Copy</label>
        ${W.lc ? tagSelect('rcs', rolloutConfigOptions(r), W.rcs, 'Rollout Configs', 'When and how blueprint changes reach the live copy') : ''}
      </div></div>`;
  }
  return `<div class="wiz"><div class="wiz-head"><div class="wiz-title">Create Site</div>${steps}<div class="wiz-btns">${btns}</div></div><div class="wiz-body">${body}</div></div>`;
}

A.wizCancel = () => {
  const dest = S.ui.siteWiz ? S.ui.siteWiz.dest : '/content';
  S.ui.siteWiz = null;
  goSites(dest);
};
A.wizBp = d => {
  S.ui.siteWiz.bp = d.path;
  commit();
};
A.wizNext = () => {
  const W = S.ui.siteWiz;
  const bp = blueprints(AR()).find(b => b.path === W.bp);
  W.step = 2;
  if (!W.langs.length) W.langs = wizLanguages(AR(), bp).slice();
  if (!W.chapters.length) W.chapters = wizChapters(AR(), bp, W.langs).map(([n]) => n);
  commit();
};
A.wizBack = () => {
  S.ui.siteWiz.step = 1;
  commit();
};
A.wizDel = d => {
  const W = S.ui.siteWiz;
  W[d.k] = W[d.k].filter(v => v !== d.v);
  commit();
};
A.wizPickDest = () => {
  openPathPicker({
    start: S.ui.siteWiz.dest,
    multi: false,
    selectable: () => true,
    onSelect: paths => {
      S.ui.siteWiz.dest = paths[0];
      commit();
    },
  });
};

document.addEventListener('input', e => {
  const el = e.target.closest('[data-wiz]');
  if (!el || !S.ui.siteWiz) return;
  const W = S.ui.siteWiz;
  W[el.dataset.wiz] = el.value;
  if (el.dataset.wiz === 'name') W.nameTouched = !!el.value;
  if (el.dataset.wiz === 'title') {
    const n = document.querySelector('[data-wiz=name]');
    if (n && !W.nameTouched) n.placeholder = el.value ? slug(el.value) : '';
  }
  const btn = document.getElementById('wiz-create');
  if (btn) btn.disabled = !wizValid(W);
  save();
});

document.addEventListener('change', e => {
  const add = e.target.closest('[data-wizadd]');
  const chk = e.target.closest('[data-wizchk]');
  if (!S.ui.siteWiz || (!add && !chk)) return;
  const W = S.ui.siteWiz;
  if (add && add.value) W[add.dataset.wizadd] = [...W[add.dataset.wizadd], add.value];
  if (chk) W[chk.dataset.wizchk] = chk.checked;
  commit();
});

A.wizCreate = () => {
  const r = AR();
  const W = S.ui.siteWiz;
  if (!wizValid(W)) { toast('Fill in the required fields (*) and pick at least one language.', 'error'); return; }
  const bp = blueprints(r).find(b => b.path === W.bp);
  const name = slug(W.name || W.title);
  if (JCR.get(r, JCR.join(W.dest, name))) { toast(`<code>${esc(JCR.join(W.dest, name))}</code> already exists.`, 'error'); return; }
  const langs = wizLanguages(r, bp);
  // languages and chapters that were not picked are left out of the site
  const excluded = langs.filter(l => !W.langs.includes(l));
  for (const l of W.langs) childEntries(r, l, ['cq:Page']).forEach(c => { if (!W.chapters.includes(JCR.name(c))) excluded.push(c); });
  let path;
  if (W.lc) {
    path = createLiveCopy(r, bp.sitePath, W.dest, name, W.title.trim(), true, W.rcs.length ? W.rcs : ['/libs/msm/wcm/rolloutconfigs/default'], excluded);
  } else {
    const copy = prepareCopy(JCR.get(r, bp.sitePath), true);
    copy.name = name;
    JCR.get(copy, 'jcr:content').props['jcr:title'] = W.title.trim();
    JCR.get(r, W.dest).children.push(copy);
    path = JCR.join(W.dest, name);
  }
  excluded.forEach(x => JCR.remove(r, path + x.slice(bp.sitePath.length)));
  const pc = pcOf(r, path);
  pc.props['cq:siteOwner'] = W.owner.trim();
  flag('msm:site');
  if (!W.lc) flag('msm:site:copy');
  save();
  // like AEM: the wizard stays behind a Success dialog until you choose Done or Open
  successDialog(`The Site was created.<br><small class="muted"><code>${esc(path)}</code> — ${W.langs.length} language(s)${W.lc ? `, live copy of ${esc(bp.sitePath)}` : ', plain copy (no live relationship)'}</small>`,
    () => { S.ui.siteWiz = null; goSites(W.dest); },
    () => { S.ui.siteWiz = null; goSites(path); });
};

/* ---------- Create Live Copy ---------- */
/* A full page wizard, like /mnt/overlay/wcm/core/content/sites/createlivecopywizard.html/<context>
   1. Live Copy From (pick the source page)  2. Destination (pick the parent)  3. Live Copy (title, name, sub pages, rollout configs) */

const LCV_WIZ_URL = '/mnt/overlay/wcm/core/content/sites/createlivecopywizard.html';
const LCV_STEPS = ['Live Copy From', 'Destination', 'Live Copy'];

A.liveCopyCreate = () => {
  const r = AR();
  const ctx = S.ui.sitesSel || '/content';
  const pre = S.ui.sitesChecked && isPage(r, S.ui.sitesChecked) ? S.ui.sitesChecked : null;
  S.ui.lcvWiz = lcvNew(ctx, pre);
  go(LCV_WIZ_URL + ctx);
};

function lcvNew(ctx, src) {
  return { for: ctx, step: 1, src, srcNav: src || ctx, dest: ctx, destNav: ctx, title: '', name: '', exclude: false, rcs: [] };
}
function lcvState(ctx) {
  if (!S.ui.lcvWiz || S.ui.lcvWiz.for !== ctx) S.ui.lcvWiz = lcvNew(ctx, null);
  return S.ui.lcvWiz;
}

// Column view of /content: clicking a row opens it, clicking the thumbnail selects it
function lcvColumns(r, nav, sel, canSel) {
  const kids = p => childEntries(r, p, FOLDERS).filter(x => x !== '/content/dam' && x !== LAUNCH_ROOT);
  if (!JCR.get(r, nav)) nav = '/content';
  const cols = [];
  let acc = '';
  for (const s of JCR.segs(nav)) { acc += '/' + s; cols.push(acc); }
  return `<div class="columns lcv-cols">${cols.map(cp => {
    const items = kids(cp);
    if (!items.length) return '';
    return `<div class="col">${items.map(p => {
      const page = isPage(r, p);
      const thumb = page && pageThumb(r, p);
      const ok = canSel(p);
      return `<div class="ci ${cols.includes(p) ? 'active' : ''} ${sel === p ? 'checked' : ''}" data-act="lcvNav" data-path="${esc(p)}" title="${esc(p)}">
        <span class="ci-thumb ${thumb ? 'img' : ''} ${ok ? '' : 'nosel'}" ${ok ? `data-act="lcvSel" data-path="${esc(p)}"` : ''} ${thumb ? `style="background-image:url('${thumb}')"` : ''}>${thumb ? '' : icon(page ? 'WebPage' : 'Folder', 22)}<i class="ci-check">${icon('Checkmark', 12)}</i></span>
        <span class="ci-text"><b>${esc(titleOf(r, p))}</b></span>
        ${kids(p).length ? `<span class="ci-arrow">${icon('ChevronRight', 14)}</span>` : ''}</div>`;
    }).join('')}</div>`;
  }).join('')}</div>`;
}

const lcvValid = W => !!(W.src && W.dest && W.title.trim());
const lcvInside = (p, src) => p === src || p.startsWith(src + '/');

function lcvWizardScreen(ctx) {
  const r = AR();
  const W = lcvState(ctx || '/content');
  if (W.src && !JCR.get(r, W.src)) W.src = null;
  const dots = LCV_STEPS.map((s, i) => `${i ? `<span class="ws-dash ${i < W.step ? 'done' : ''}"></span>` : ''}<i class="${i + 1 < W.step ? 'done' : i + 1 === W.step ? 'on' : ''}"></i>`).join('');
  const steps = `<div class="wiz-steps3"><div class="ws-label">${LCV_STEPS[W.step - 1]} (${W.step}/${LCV_STEPS.length})</div><div class="ws-dots">${dots}</div></div>`;
  const canNext = W.step === 1 ? !!W.src : !!W.dest;
  const btns = W.step === 1
    ? `<button class="wbtn" data-act="lcvCancel">Cancel</button><button class="wbtn primary" data-act="lcvNext" ${canNext ? '' : 'disabled'}>Next</button>`
    : `<button class="wbtn" data-act="lcvBack">Back</button>${W.step < 3
      ? `<button class="wbtn primary" data-act="lcvNext" ${canNext ? '' : 'disabled'}>Next</button>`
      : `<button class="wbtn primary" id="lcv-create" data-act="lcvCreate" ${lcvValid(W) ? '' : 'disabled'}>Create</button>`}`;
  let body;
  if (W.step === 1) {
    body = lcvColumns(r, W.srcNav, W.src, p => isPage(r, p));
  } else if (W.step === 2) {
    // any page or folder outside the source can take the live copy
    body = lcvColumns(r, W.destNav, W.dest, p => !lcvInside(p, W.src));
  } else {
    const all = rolloutConfigOptions(r);
    body = `<div class="wiz-form one"><div class="wiz-col">
      <div class="wf"><div class="wf-label">Title *</div><input data-lcv="title" value="${esc(W.title)}" autocomplete="off"></div>
      <div class="wf"><div class="wf-label">Name</div><input data-lcv="name" value="${esc(W.name)}" autocomplete="off" placeholder="${esc(W.title ? slug(W.title) : '')}"></div>
      <label class="wf-check"><input type="checkbox" data-lcvchk="exclude" ${W.exclude ? 'checked' : ''}> Exclude sub pages</label>
      <div class="wf"><div class="wf-label">Rollout Configs<span class="wf-info" title="When and how blueprint changes reach the live copy. Empty = Standard rollout config">${icon('Info', 16)}</span></div>
        <select class="wf-select" data-lcvadd="rcs"><option value="">Select</option>${all.filter(([v]) => !W.rcs.includes(v)).map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select>
        <div class="wf-tags">${W.rcs.map(v => `<span class="wf-tag"><a href="#" data-act="lcvRcDel" data-v="${esc(v)}" title="Remove">✕</a>${esc((all.find(x => x[0] === v) || [, v])[1])}</span>`).join('')}</div></div>
      <p class="hint">Live copy of <code>${esc(W.src || '')}</code> created under <code>${esc(W.dest || '')}</code></p>
    </div></div>`;
  }
  return `<div class="wiz"><div class="wiz-head"><div class="wiz-title">Create Live Copy</div>${steps}<div class="wiz-btns">${btns}</div></div><div class="wiz-body ${W.step < 3 ? 'cols' : 'flush'}">${body}</div></div>`;
}

A.lcvNav = d => {
  const W = S.ui.lcvWiz;
  W[W.step === 1 ? 'srcNav' : 'destNav'] = d.path;
  commit();
};
A.lcvSel = d => {
  const W = S.ui.lcvWiz;
  const k = W.step === 1 ? 'src' : 'dest';
  W[k] = W[k] === d.path ? null : d.path;
  commit();
};
A.lcvCancel = () => {
  const ctx = S.ui.lcvWiz ? S.ui.lcvWiz.for : '/content';
  S.ui.lcvWiz = null;
  goSites(ctx);
};
A.lcvNext = () => {
  const W = S.ui.lcvWiz;
  // the default destination cannot sit inside the chosen source
  if (W.step === 1 && W.dest && lcvInside(W.dest, W.src)) W.dest = W.destNav = JCR.parent(W.src);
  if (W.step === 2 && !W.title) W.title = titleOf(AR(), W.src);
  W.step++;
  commit();
};
A.lcvBack = () => {
  S.ui.lcvWiz.step--;
  commit();
};
A.lcvRcDel = d => {
  S.ui.lcvWiz.rcs = S.ui.lcvWiz.rcs.filter(v => v !== d.v);
  commit();
};

document.addEventListener('input', e => {
  const el = e.target.closest('[data-lcv]');
  if (!el || !S.ui.lcvWiz) return;
  const W = S.ui.lcvWiz;
  W[el.dataset.lcv] = el.value;
  if (el.dataset.lcv === 'title') {
    const n = el.ownerDocument.querySelector('[data-lcv=name]');
    if (n) n.placeholder = el.value ? slug(el.value) : '';
  }
  const btn = el.ownerDocument.getElementById('lcv-create');
  if (btn) btn.disabled = !lcvValid(W);
  save();
});

document.addEventListener('change', e => {
  const add = e.target.closest('[data-lcvadd]');
  const chk = e.target.closest('[data-lcvchk]');
  if (!S.ui.lcvWiz || (!add && !chk)) return;
  const W = S.ui.lcvWiz;
  if (add && add.value) W.rcs = [...W.rcs, add.value];
  if (chk) W[chk.dataset.lcvchk] = chk.checked;
  commit();
});

A.lcvCreate = () => {
  const r = AR();
  const W = S.ui.lcvWiz;
  if (!lcvValid(W)) { toast('Title is required.', 'error'); return; }
  const name = slug(W.name || W.title);
  if (lcvInside(W.dest, W.src)) { toast('The live copy cannot be created inside its own source.', 'error'); return; }
  if (JCR.get(r, JCR.join(W.dest, name))) { toast(`<code>${esc(JCR.join(W.dest, name))}</code> already exists.`, 'error'); return; }
  const path = createLiveCopy(r, W.src, W.dest, name, W.title.trim(), !W.exclude, W.rcs.length ? W.rcs : ['/libs/msm/wcm/rolloutconfigs/default']);
  flag('msm:livecopy');
  save();
  successDialog(`Live Copy has been created.<br><small class="muted"><code>${esc(path)}</code> — live copy of <code>${esc(W.src)}</code>${W.exclude ? ' (without sub pages)' : ''}</small>`,
    () => { const ctx = W.for; S.ui.lcvWiz = null; goSites(ctx); },
    () => { S.ui.lcvWiz = null; goSites(path); });
};

/* ---------- live copy actions (editor + page properties) ---------- */

function msmComponentState(r, pagePath, nodePath) {
  const lc = liveCopyRootOf(r, pagePath);
  const n = JCR.get(r, nodePath);
  if (!lc || !n || !hasMixin(n, 'cq:LiveRelationship')) return null;
  return { lc, cancelled: hasMixin(n, 'cq:LiveSyncCancelled'), node: n };
}

function msmCancel(nodePath) {
  const n = JCR.get(AR(), nodePath);
  addMixin(n, 'cq:LiveSyncCancelled');
  n.props['cq:isCancelledForChildren'] = true;
  markModified(nodePath);
  flag('msm:cancel');
  toast('Inheritance cancelled — you can edit this component on the live copy now.');
  commit();
}

function msmRestore(pagePath, nodePath) {
  const r = AR();
  const src = blueprintOf(r, nodePath);
  const n = JCR.get(r, nodePath);
  removeMixin(n, 'cq:LiveSyncCancelled');
  delete n.props['cq:isCancelledForChildren'];
  const sn = src && JCR.get(r, src);
  if (sn) {
    const mx = n.props['jcr:mixinTypes'];
    n.props = { ...sn.props };
    if (mx) n.props['jcr:mixinTypes'] = mx;
    n.children = JCR.clone(sn).children;
    JCR.walk(n, '', x => { if (x !== n && x.props['sling:resourceType']) addMixin(x, 'cq:LiveRelationship'); });
  }
  markModified(nodePath);
  flag('msm:restore');
  toast('Inheritance re-enabled — the component was synchronized from the blueprint.');
  commit();
}

A.lcSync = d => {
  const r = AR();
  const src = blueprintOf(r, d.path);
  const lc = liveCopyRootOf(r, d.path);
  const acts = lc ? configActions(r, lc.configs, 'rollout') : new Set();
  if (!acts.size) { closeModal(); toast('This live copy has no rollout config with the <b>rollout</b> trigger, so Synchronize has nothing to apply.', 'warn'); return; }
  const res = src ? syncPage(r, src, d.path, acts, lc) : 'skipped';
  closeModal();
  toast(`Synchronize: ${res}.`);
  flag('msm:rollout');
  commit();
};

A.lcReset = d => {
  const r = AR();
  const pc = pcOf(r, d.path);
  delete pc.props['cq:propertyInheritanceCancelled'];
  JCR.walk(pc, '', n => { removeMixin(n, 'cq:LiveSyncCancelled'); delete n.props['cq:isCancelledForChildren']; });
  const src = blueprintOf(r, d.path);
  if (src) {
    pc.children = pc.children.filter(c => c.name === 'cq:LiveSyncConfig');
    syncPage(r, src, d.path);
  }
  closeModal();
  toast('Live copy reset to the blueprint (local changes removed).');
  commit();
};

A.lcSuspend = d => {
  const pc = pcOf(AR(), d.path);
  if (hasMixin(pc, 'cq:LiveSyncCancelled')) { removeMixin(pc, 'cq:LiveSyncCancelled'); toast('Live copy resumed.'); } else { addMixin(pc, 'cq:LiveSyncCancelled'); toast('Live copy suspended — rollouts skip this page.'); flag('msm:suspend'); }
  closeModal();
  commit();
};

A.lcDetach = d => {
  const r = AR();
  const lc = liveCopyRootOf(r, d.path);
  const scope = lc && lc.root === d.path ? JCR.get(r, d.path) : JCR.get(r, d.path);
  walkPages(scope, d.path, (p) => {
    const pc = JCR.get(p, 'jcr:content');
    if (!pc) return;
    JCR.walk(pc, '', n => { removeMixin(n, 'cq:LiveRelationship'); removeMixin(n, 'cq:LiveSyncCancelled'); removeMixin(n, 'cq:LiveSync'); delete n.props['cq:isCancelledForChildren']; });
    pc.children = pc.children.filter(c => c.name !== 'cq:LiveSyncConfig');
    delete pc.props['cq:propertyInheritanceCancelled'];
  });
  if (lc && lc.root !== d.path) {
    const cfg = JCR.get(r, lc.root + '/jcr:content/cq:LiveSyncConfig');
    cfg.props['cq:excludedPaths'] = [...[].concat(cfg.props['cq:excludedPaths'] || []), lc.master + d.path.slice(lc.root.length)];
  }
  closeModal();
  flag('msm:detach');
  toast('Detached — this page is a normal page now.');
  commit();
};

// Extra tabs for the page properties dialog
function msmPropsTabs(path) {
  const r = AR();
  const tabs = [];
  const lc = liveCopyRootOf(r, path);
  if (lc) {
    const pc = pcOf(r, path);
    const suspended = hasMixin(pc, 'cq:LiveSyncCancelled');
    tabs.push({ label: 'Live Copy', html: `<dl class="kv"><dt>Source</dt><dd><code>${esc(blueprintOf(r, path))}</code></dd>
      <dt>Live copy root</dt><dd><code>${esc(lc.root)}</code></dd>
      <dt>Rollout configs</dt><dd>${lc.configs.map(c => esc(titleOf(r, c) || c)).join(', ')}</dd>
      <dt>Last rollout</dt><dd>${fmtDate(pc.props['cq:lastRolledout'])}</dd>
      <dt>Status</dt><dd>${suspended ? 'Suspended' : 'Active'}</dd>
      <dt>Local properties</dt><dd>${[].concat(pc.props['cq:propertyInheritanceCancelled'] || []).join(', ') || '—'}</dd></dl>
      <div class="row-btns"><button type="button" class="btn small" data-act="lcSync" data-path="${esc(path)}">Synchronize</button>
      <button type="button" class="btn small" data-act="lcReset" data-path="${esc(path)}">Reset</button>
      <button type="button" class="btn small" data-act="lcSuspend" data-path="${esc(path)}">${suspended ? 'Resume' : 'Suspend'}</button>
      <button type="button" class="btn small" data-act="lcDetach" data-path="${esc(path)}">Detach</button></div>
      <p class="hint">Fields you change on a live copy page stop inheriting (stored in <code>cq:propertyInheritanceCancelled</code>).</p>` });
  }
  const lcs = liveCopiesOf(r, path);
  if (lcs.length) {
    tabs.push({ label: 'Blueprint', html: `<p>This page is the source of ${lcs.length} live cop${lcs.length > 1 ? 'ies' : 'y'}:</p>
      ${lcs.map(l => `<div><code>${esc(l.target)}</code></div>`).join('')}
      <div class="row-btns"><button type="button" class="btn small" data-act="propsRollout" data-path="${esc(path)}">Rollout…</button></div>` });
  }
  return tabs;
}

A.propsRollout = d => {
  closeModal();
  setTimeout(() => openRollout(d.path), 0);
};

// Changing a page property on a live copy cancels inheritance for that property
function msmRecordLocalProps(path, before, after) {
  const r = AR();
  if (!liveCopyRootOf(r, path)) return;
  const pc = pcOf(r, path);
  const changed = Object.keys({ ...before, ...after }).filter(k => !MSM_KEEP.includes(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  if (changed.length) pc.props['cq:propertyInheritanceCancelled'] = [...new Set([...[].concat(pc.props['cq:propertyInheritanceCancelled'] || []), ...changed])];
}

/* ---------- Rollout Configurations console (Tools → Sites) ---------- */

const RC_URL = '/libs/msm/wcm/content/rolloutconfigs.html';
const ACTION_HELP = {
  contentUpdate: 'Updates the live copy with changes from the blueprint',
  contentCopy: 'Copies new nodes/pages from the blueprint',
  contentDelete: 'Deletes nodes removed from the blueprint (local ones stay)',
  referencesUpdate: 'Rewrites links that point inside the blueprint so they point inside the live copy',
  productUpdate: 'Updates commerce product references (not simulated)',
  orderChildren: 'Orders components/pages like the blueprint',
  targetActivate: 'Publishes the live copy page',
  targetDeactivate: 'Unpublishes the live copy page',
};
const TRIGGER_HELP = { rollout: 'On Rollout (button)', modification: 'On Modification', publish: 'On Activation', deactivate: 'On Deactivation' };

function rolloutConfigsScreen() {
  const r = AR();
  flag('visit:rolloutconfigs');
  const list = (JCR.get(r, RC_BASE) || { children: [] }).children.map(c => rolloutConfig(r, RC_BASE + '/' + c.name));
  return shell('Rollout Configurations', `${titleBar('', '<span class="tb-crumb">Rollout Configurations</span>', '')}
    <table class="grid"><tr><th>Title</th><th>Trigger</th><th>Actions</th></tr>
    ${list.map(c => `<tr><td><b>${esc(c.title)}</b><br><small class="muted">${esc(c.path)}</small><br><small>${esc(c.desc)}</small></td>
      <td>${esc(TRIGGER_HELP[c.trigger] || c.trigger)}<br><code>cq:trigger=${esc(c.trigger)}</code></td>
      <td>${c.actions.map(a => `<div><code>${esc(a)}</code> <small class="muted">${esc(ACTION_HELP[a] || '')}</small></div>`).join('')}</td></tr>`).join('')}</table>
    <p class="hint pad">A live copy can use several configs (<code>cq:rolloutConfigs</code> on its <code>cq:LiveSyncConfig</code>). Each config runs only on its own trigger.</p>`);
}

/* ---------- Launches ---------- */

function launches(r) {
  return JCR.find(r, LAUNCH_ROOT, (n, p) => JCR.type(n) === 'cq:Page' && (JCR.get(n, 'jcr:content') || { props: {} }).props['sling:resourceType'] === 'wcm/launches/components/launch')
    .map(({ node, path }) => ({ path, c: JCR.get(node, 'jcr:content').props }));
}

function launchesFor(r, pagePath) {
  return launches(r).filter(l => pagePath === l.c.sourceRootResource || (l.c.isDeep && pagePath.startsWith(l.c.sourceRootResource + '/')));
}

A.launchCreate = () => {
  const r = AR();
  const src = S.ui.sitesChecked || S.ui.sitesSel;
  if (!isPage(r, src)) { toast('Select (or open) a page first.', 'warn'); return; }
  openModal({
    title: `Create Launch <small>${esc(src)}</small>`,
    okLabel: 'Create',
    body: `<p>A launch is a copy of the page you can change for a future release, then <b>promote</b> back.</p>
      <label class="check"><input type="checkbox" name="deep" checked> Include sub pages</label>
      ${field('Launch Title *', 'title', '')}${field('Launch Date', 'date', '', 'Optional live date', 'datetime-local')}
      <label class="check"><input type="checkbox" name="ready"> Production Ready</label>`,
    ok: b => {
      const f = formData(b);
      if (!f.title.trim()) { toast('Title is required.', 'error'); return false; }
      const d = new Date();
      const base = `${LAUNCH_ROOT}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      JCR.ensure(r, base, 'sling:OrderedFolder');
      const name = JCR.unique(JCR.get(r, base), slug(f.title));
      const lp = base + '/' + name;
      JCR.get(r, base).children.push(JCR.node(name, { 'jcr:primaryType': 'cq:Page' }, [JCR.node('jcr:content', {
        'jcr:primaryType': 'cq:PageContent', 'jcr:title': f.title.trim(), 'sling:resourceType': 'wcm/launches/components/launch',
        sourceRootResource: src, isDeep: !!f.deep, isProductionReady: !!f.ready, 'jcr:created': now(), ...(f.date ? { liveDate: new Date(f.date).toISOString() } : {}),
      })]));
      JCR.ensure(r, lp + JCR.parent(src), 'nt:unstructured');
      const copy = prepareCopy(JCR.get(r, src), !!f.deep);
      walkPages(copy, '', p => { const pc = JCR.get(p, 'jcr:content'); if (pc) pc.props['cq:lastModified'] = now(); });
      JCR.get(r, lp + JCR.parent(src)).children.push(copy);
      flag('launch:created');
      toast('Launch created. Edit its pages from Tools → Sites → Launches, then promote it.');
      S.ui.launchSel = lp;
      go(LAUNCHES_URL);
    },
  });
};

function launchesScreen() {
  const r = AR();
  flag('visit:launches');
  const list = launches(r);
  const sel = list.find(l => l.path === S.ui.launchSel);
  const bar = sel
    ? selectionBar(`${qa('launchEdit', 'Edit', 'Edit source page', 'e')}${qa('launchOpen', 'ViewColumn', 'Open in Sites')}${qa('launchPromote', 'Promote', 'Promote')}${qa('launchDelete', 'Delete', 'Delete', 'backspace')}`, 'launchUncheck')
    : titleBar('', '<span class="tb-crumb">Launches</span>', '');
  return shell('Launches', `${bar}
    <table class="grid"><tr><th>Title</th><th>Source</th><th>Launch date</th><th>Production ready</th><th>Created</th></tr>
    ${list.map(l => `<tr class="${sel && sel.path === l.path ? 'sel' : ''}" data-act="launchSel" data-path="${esc(l.path)}">
      <td><b>${esc(l.c['jcr:title'])}</b><br><small class="muted">${esc(l.path)}</small></td><td><code>${esc(l.c.sourceRootResource)}</code>${l.c.isDeep ? ' + sub pages' : ''}</td>
      <td>${l.c.liveDate ? new Date(l.c.liveDate).toLocaleString() : '—'}</td><td>${l.c.isProductionReady ? 'Yes' : 'No'}</td><td>${fmtDate(l.c['jcr:created'])}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No launches yet. In Sites, select a page and use Create → Launch.</td></tr>'}</table>`);
}

A.launchSel = d => {
  S.ui.launchSel = S.ui.launchSel === d.path ? null : d.path;
  commit();
};
A.launchUncheck = () => {
  S.ui.launchSel = null;
  commit();
};
A.launchEdit = () => {
  const l = launches(AR()).find(x => x.path === S.ui.launchSel);
  go('/editor.html' + l.path + l.c.sourceRootResource + '.html');
};
A.launchOpen = () => {
  const l = launches(AR()).find(x => x.path === S.ui.launchSel);
  go('/sites.html' + l.path + l.c.sourceRootResource);
};
A.launchDelete = () => confirmBox('Delete Launch', `Delete launch <code>${esc(S.ui.launchSel)}</code>? Its pages are deleted, the source pages are not touched.`, () => {
  JCR.remove(AR(), S.ui.launchSel);
  S.ui.launchSel = null;
  commit();
}, 'Delete');

A.launchPromote = () => {
  const r = AR();
  const l = launches(r).find(x => x.path === S.ui.launchSel);
  openModal({
    title: `Promote Launch <small>${esc(l.c['jcr:title'])}</small>`,
    okLabel: 'Promote',
    body: `${selectField('Scope', 'scope', 'full', [['full', 'Full launch'], ['modified', 'Modified pages only']])}
      <label class="check"><input type="checkbox" name="del" checked> Delete launch after promotion</label>
      <p class="hint">Promoting copies the launch pages back over <code>${esc(l.c.sourceRootResource)}</code>. Publish them afterwards.</p>`,
    ok: b => {
      const f = formData(b);
      const created = l.c['jcr:created'] || '';
      let count = 0;
      walkPages(JCR.get(r, l.path + l.c.sourceRootResource), l.path + l.c.sourceRootResource, (p, path) => {
        const lpc = JCR.get(p, 'jcr:content');
        if (!lpc) return;
        if (f.scope === 'modified' && !(lpc.props['cq:lastModified'] > created)) return;
        const target = path.slice(l.path.length);
        const tp = JCR.get(r, target);
        if (tp) {
          const old = JCR.get(tp, 'jcr:content');
          const copy = JCR.clone(lpc);
          for (const k of ['cq:lastReplicated', 'cq:lastReplicatedBy', 'cq:lastReplicationAction', 'jcr:lockOwner', 'jcr:lockIsDeep']) if (old && old.props[k] !== undefined) copy.props[k] = old.props[k];
          copy.props['cq:lastModified'] = now();
          tp.children = tp.children.map(c => (c.name === 'jcr:content' ? copy : c));
        } else if (JCR.get(r, JCR.parent(target))) {
          const copy = JCR.clone(p);
          copy.children = copy.children.filter(c => JCR.type(c) !== 'cq:Page');
          JCR.get(r, JCR.parent(target)).children.push(copy);
        }
        count++;
      });
      if (f.del) { JCR.remove(r, l.path); S.ui.launchSel = null; }
      flag('launch:promoted');
      toast(`Launch promoted: ${count} page(s) updated. Publish them to go live.`);
      commit();
    },
  });
};

/* ---------- Language Copy ---------- */

function languageRootOf(r, path) {
  for (let p = path; p && p !== '/content'; p = JCR.parent(p)) {
    const c = pcOf(r, p);
    if (/^[a-z]{2}(_[a-z]{2})?$/.test(JCR.name(p)) && c) return p;
  }
  return null;
}

/* Create Language Copy wizard — /mnt/overlay/wcm/core/content/sites/createlanguagecopywizard.html/<context>
   1. Select Source (pages + include subpages)  2. Select Languages  3. Select Project */

const LC_WIZ_URL = '/mnt/overlay/wcm/core/content/sites/createlanguagecopywizard.html';
const LANG_NATIVE = {
  en: 'English', ar: 'العربية', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano', ja: '日本語', zh: '中文', ko: '한국어',
  pt: 'Português', ru: 'Русский', nl: 'Nederlands', sv: 'Svenska', da: 'Dansk', fi: 'Suomi', no: 'Norsk', pl: 'Polski', tr: 'Türkçe',
  he: 'עברית', hi: 'हिन्दी', cs: 'Čeština', hu: 'Magyar', el: 'Ελληνικά', th: 'ไทย', id: 'Bahasa Indonesia', ur: 'اردو', fa: 'فارسی',
};
const LC_STEPS = ['Select Source', 'Configure', 'Select Project'];

A.langCopyCreate = () => {
  const r = AR();
  const ctx = S.ui.sitesSel;
  const pre = S.ui.sitesChecked && isPage(r, S.ui.sitesChecked) && languageRootOf(r, S.ui.sitesChecked) ? [{ path: S.ui.sitesChecked, deep: true }] : [];
  S.ui.lcWiz = { for: ctx, step: 1, sources: pre, sel: [], langs: [], project: 'structure' };
  go(LC_WIZ_URL + ctx);
};

function lcWizState(ctx) {
  if (!S.ui.lcWiz || S.ui.lcWiz.for !== ctx) S.ui.lcWiz = { for: ctx, step: 1, sources: [], sel: [], langs: [], project: 'structure' };
  return S.ui.lcWiz;
}

// Languages you can copy to: the existing sibling language roots, plus the other known languages (a new root is created)
function lcLanguageOptions(r, sources) {
  const codes = new Set(Object.keys(LANG_NAMES));
  const own = new Set();
  for (const s of sources) {
    const root = languageRootOf(r, s.path);
    if (!root) continue;
    own.add(JCR.name(root));
    childEntries(r, JCR.parent(root), ['cq:Page']).forEach(p => { if (/^[a-z]{2}(_[a-z]{2})?$/.test(JCR.name(p))) codes.add(JCR.name(p)); });
  }
  const parents = [...new Set(sources.map(s => languageRootOf(r, s.path)).filter(Boolean).map(JCR.parent))];
  // the language the sources are already in is not a target; [code, label, needs a new root]
  return [...codes].filter(c => !(own.size === 1 && own.has(c))).map(c => {
    const exists = parents.length && parents.every(p => JCR.get(r, p + '/' + c));
    return [c, `${LANG_NAMES[c] || c} (${c})`, !exists];
  }).sort((a, b) => a[1].localeCompare(b[1]));
}

function lcWizardScreen(ctx) {
  const r = AR();
  const W = lcWizState(ctx || '/content');
  const total = LC_STEPS.length;
  // finished part of the track is a solid line, the rest dotted
  const dots = LC_STEPS.map((s, i) => `${i ? `<span class="ws-dash ${i < W.step ? 'done' : ''}"></span>` : ''}<i class="${i + 1 < W.step ? 'done' : i + 1 === W.step ? 'on' : ''}"></i>`).join('');
  const steps = `<div class="wiz-steps3"><div class="ws-label">${LC_STEPS[W.step - 1]} (${W.step}/${total})</div><div class="ws-dots">${dots}</div></div>`;
  const validSources = W.sources.filter(s => languageRootOf(r, s.path));
  const canNext = W.step === 1 ? validSources.length > 0 : W.step === 2 ? W.langs.length > 0 : true;
  const btns = W.step === 1
    ? `<button class="wbtn" data-act="lcwCancel">Cancel</button><button class="wbtn primary" data-act="lcwNext" ${canNext ? '' : 'disabled'}>Next</button>`
    : `<button class="wbtn" data-act="lcwBack">Back</button>${W.step < total ? `<button class="wbtn primary" data-act="lcwNext" ${canNext ? '' : 'disabled'}>Next</button>` : '<button class="wbtn primary" data-act="lcwCreate">Create</button>'}`;
  let body;
  if (W.step === 1) {
    body = `<div class="lcw-bar"><a href="#" data-act="lcwAdd">${icon('Add', 16)} Add Pages</a><a href="#" data-act="lcwDel" class="${W.sel.length ? '' : 'off'}">${icon('Delete', 16)} Delete</a></div>
      <table class="lcw-table"><tr><th class="lcw-cb"></th><th>Page Name</th><th>Path</th><th>Include subpages</th></tr>
      ${W.sources.map(s => {
        const ok = !!languageRootOf(r, s.path);
        return `<tr class="${W.sel.includes(s.path) ? 'sel' : ''}"><td class="lcw-cb"><input type="checkbox" data-lcwsel="${esc(s.path)}" ${W.sel.includes(s.path) ? 'checked' : ''}></td>
          <td>${esc(titleOf(r, s.path))}${ok ? '' : ' <small class="lcw-warn">not inside a language root — will be skipped</small>'}</td><td>${esc(s.path)}</td>
          <td><input type="checkbox" data-lcwdeep="${esc(s.path)}" ${s.deep ? 'checked' : ''}></td></tr>`;
      }).join('') || '<tr><td colspan="4" class="lcw-empty">There is no item.</td></tr>'}</table>`;
  } else if (W.step === 2) {
    const opts = lcLanguageOptions(r, validSources);
    W.langs = W.langs.filter(l => opts.some(o => o[0] === l));
    const fresh = opts.filter(o => o[2]).map(o => o[0]).filter(c => W.langs.includes(c));
    body = `<div class="wiz-form"><div class="wiz-col">
      <div class="wf"><div class="wf-label">Target Language(s) *<span class="wf-info" title="Languages the selected pages are copied to">${icon('Info', 16)}</span></div>
        <select class="wf-select" data-lcwadd="langs"><option value="">Select</option>${opts.filter(([v]) => !W.langs.includes(v)).map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select>
        <div class="wf-tags">${W.langs.map(v => `<span class="wf-tag"><a href="#" data-act="lcwLangDel" data-v="${esc(v)}" title="Remove">✕</a>${esc((opts.find(o => o[0] === v) || [, v])[1])}</span>`).join('')}</div></div>
      ${fresh.length ? `<p class="hint">A new language root will be created for: ${fresh.map(c => `<code>${esc(c)}</code>`).join(', ')}</p>` : ''}
      </div><div class="wiz-col">
      <div class="wf"><div class="wf-label">Cloud Configuration</div><div class="wf-path"><input data-lcwcfg="cloud" value="${esc(W.cloud || '')}" placeholder="Select Configuration Path" autocomplete="off"><button type="button" class="wf-pick" data-act="lcwPickCloud" title="Select path">${icon('SelectionChecked', 18)}</button></div></div>
      <div class="wf"><div class="wf-label">Translation Provider Credential</div><select class="wf-select" data-lcwcfg="credential"><option value="">Select</option></select></div>
      <div class="wf"><div class="wf-label">Translation Settings</div><select class="wf-select plain" data-lcwcfg="settings"><option value="default" selected>Default configuration</option></select></div>
      <div class="wf"><div class="wf-label">Translation Method</div><select class="wf-select" disabled><option>Select</option></select></div>
      <div class="wf"><div class="wf-label">Translation Provider</div><select class="wf-select" disabled><option>Select</option></select></div>
      <a href="#" class="wf-link" data-act="notSimulated" data-name="Translation Integration (Configure Translation Settings)">Configure Translation Settings</a>
      </div></div>`;
  } else {
    body = `<div class="wiz-form one"><div class="wiz-col">
      <div class="wf"><div class="wf-label">Project</div>
        <select class="wf-select plain" data-lcwproj="1"><option value="structure" selected>Create structure only</option><option disabled>Create a new translation project (not simulated)</option><option disabled>Update existing translation project (not simulated)</option></select></div>
      <p class="hint"><b>Create structure only</b> copies the pages to the target language roots <b>without translating them</b>. Pages that already exist in a target language are not overwritten.</p></div></div>`;
  }
  return `<div class="wiz"><div class="wiz-head"><div class="wiz-title">Create Language Copy</div>${steps}<div class="wiz-btns">${btns}</div></div><div class="wiz-body flush">${body}</div></div>`;
}

A.lcwCancel = () => {
  const ctx = S.ui.lcWiz ? S.ui.lcWiz.for : '/content';
  S.ui.lcWiz = null;
  goSites(ctx);
};
A.lcwNext = () => {
  S.ui.lcWiz.step++;
  commit();
};
A.lcwBack = () => {
  S.ui.lcWiz.step--;
  commit();
};
A.lcwLangDel = d => {
  S.ui.lcWiz.langs = S.ui.lcWiz.langs.filter(l => l !== d.v);
  commit();
};
A.lcwDel = () => {
  const W = S.ui.lcWiz;
  W.sources = W.sources.filter(s => !W.sel.includes(s.path));
  W.sel = [];
  commit();
};
A.lcwAdd = () => {
  const W = S.ui.lcWiz;
  openPathPicker({
    start: W.for,
    multi: true,
    onSelect: paths => {
      paths.forEach(p => { if (!W.sources.some(s => s.path === p)) W.sources.push({ path: p, deep: false }); });
      commit();
    },
  });
};

A.lcwPickCloud = () => openPathPicker({
  root: '/conf',
  start: S.ui.lcWiz.cloud || '/conf/wknd',
  multi: false,
  selectable: () => true,
  onSelect: paths => {
    S.ui.lcWiz.cloud = paths[0];
    commit();
  },
});

// Configure step fields (cloud config path, credential, settings) are kept as you type
document.addEventListener('input', e => {
  const f = e.target.closest('[data-lcwcfg]');
  if (f && S.ui.lcWiz) {
    S.ui.lcWiz[f.dataset.lcwcfg] = f.value;
    save();
  }
});

document.addEventListener('change', e => {
  if (!S.ui.lcWiz) return;
  const W = S.ui.lcWiz;
  const cfg = e.target.closest('[data-lcwcfg]');
  if (cfg) { W[cfg.dataset.lcwcfg] = cfg.value; save(); return; }
  const sel = e.target.closest('[data-lcwsel]');
  const deep = e.target.closest('[data-lcwdeep]');
  const add = e.target.closest('[data-lcwadd]');
  if (sel) W.sel = sel.checked ? [...W.sel, sel.dataset.lcwsel] : W.sel.filter(p => p !== sel.dataset.lcwsel);
  else if (deep) W.sources.find(s => s.path === deep.dataset.lcwdeep).deep = deep.checked;
  else if (add && add.value) W.langs = [...W.langs, add.value];
  else return;
  commit();
});

// Copies pages that are missing in the target; existing pages are left alone ("structure only")
function copyMissing(r, srcNode, targetPath, deep) {
  const t = JCR.get(r, targetPath);
  if (!t) {
    const copy = prepareCopy(srcNode, deep);
    copy.name = JCR.name(targetPath);
    JCR.get(r, JCR.parent(targetPath)).children.push(copy);
    let n = 0;
    walkPages(copy, '', () => { n++; });
    return n;
  }
  let n = 0;
  if (deep) srcNode.children.filter(c => JCR.type(c) === 'cq:Page').forEach(c => { n += copyMissing(r, c, targetPath + '/' + c.name, true); });
  return n;
}

A.lcwCreate = () => {
  const r = AR();
  const W = S.ui.lcWiz;
  let created = 0;
  const roots = new Set();
  for (const s of W.sources) {
    const root = languageRootOf(r, s.path);
    if (!root) continue;
    const rel = s.path.slice(root.length);
    for (const lang of W.langs) {
      if (lang === JCR.name(root)) continue;
      const troot = JCR.join(JCR.parent(root), lang);
      if (!JCR.get(r, troot)) {
        // new language root: a copy of the source root page, in the new language
        const rc = prepareCopy(JCR.get(r, root), false);
        rc.name = lang;
        const pc = JCR.get(rc, 'jcr:content');
        Object.assign(pc.props, { 'jcr:language': lang, 'jcr:title': LANG_NATIVE[lang] || lang, 'cq:lastModified': now() });
        if (W.cloud) pc.props['cq:cloudserviceconfigs'] = [W.cloud];
        delete pc.props.navTitle;
        JCR.get(r, JCR.parent(root)).children.push(rc);
        created++;
      }
      roots.add(troot);
      // parent pages between the language root and the source page are needed too
      let acc = root;
      for (const seg of JCR.segs(rel).slice(0, -1)) {
        acc += '/' + seg;
        created += copyMissing(r, JCR.get(r, acc), troot + acc.slice(root.length), false);
      }
      if (rel) created += copyMissing(r, JCR.get(r, s.path), troot + rel, s.deep);
      else if (s.deep) JCR.get(r, root).children.filter(c => JCR.type(c) === 'cq:Page').forEach(c => { created += copyMissing(r, c, troot + '/' + c.name, true); });
    }
  }
  flag('langcopy:created');
  const ctx = W.for;
  save();
  successDialog(`Language copy has been created.<br><small class="muted">${created} page(s) created in ${[...roots].map(x => `<code>${esc(x)}</code>`).join(', ')} — structure only, not translated.</small>`,
    () => { S.ui.lcWiz = null; goSites(ctx); },
    roots.size ? () => { S.ui.lcWiz = null; goSites([...roots][0]); } : null);
};

/* ---------- CSV Report ---------- */

const CSV_COLS = [
  ['name', 'Name', (r, p) => JCR.name(p)],
  ['path', 'Path', (r, p) => p],
  ['title', 'Title', (r, p) => titleOf(r, p)],
  ['template', 'Template', (r, p) => (pcOf(r, p) || { props: {} }).props['cq:template'] || ''],
  ['modified', 'Modified', (r, p) => (pcOf(r, p) || { props: {} }).props['cq:lastModified'] || ''],
  ['modifiedBy', 'Modified By', (r, p) => (pcOf(r, p) || { props: {} }).props['cq:lastModifiedBy'] || ''],
  ['published', 'Published', (r, p) => (pageStatus(p).published ? (pcOf(r, p).props['cq:lastReplicated'] || '') : '')],
  ['publishedBy', 'Published By', (r, p) => (pageStatus(p).published ? (pcOf(r, p).props['cq:lastReplicatedBy'] || '') : '')],
  ['status', 'Status', (r, p) => { const s = pageStatus(p); return s.published ? (s.modified ? 'Modified' : 'Published') : 'Not published'; }],
  ['language', 'Language', (r, p) => (pcOf(r, p) || { props: {} }).props['jcr:language'] || ''],
  ['livecopy', 'Live Copy Source', (r, p) => blueprintOf(r, p) || ''],
];

A.csvReport = () => {
  const path = S.ui.sitesSel;
  openModal({
    title: 'Create CSV Report',
    okLabel: 'Create',
    body: `${field('Path', 'path', path)}${selectField('Depth', 'depth', 'all', [['1', 'Direct children only'], ['all', 'All descendants']])}
      <h5>Properties</h5>${CSV_COLS.map(([k, l], i) => `<label class="check inline"><input type="checkbox" name="cols" data-multi="1" value="${k}" ${i < 9 ? 'checked' : ''}> ${l}</label>`).join('')}`,
    ok: b => {
      const f = formData(b);
      const r = AR();
      if (!JCR.get(r, f.path)) { toast('Path not found.', 'error'); return false; }
      const pages = f.depth === '1' ? childEntries(r, f.path, ['cq:Page']) : allPagePaths(r, f.path).filter(p => p !== f.path);
      const cols = CSV_COLS.filter(c => (f.cols || []).includes(c[0]));
      const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
      const csv = [cols.map(c => q(c[1])).join(','), ...pages.map(p => cols.map(c => q(c[2](r, p))).join(','))].join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `report-${JCR.name(f.path) || 'content'}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      flag('csv:report');
      toast(`CSV report downloaded: ${pages.length} page(s).`);
    },
  });
};

/* ---------- Sites preview + References rail ---------- */

function msmPreviewRows(r, path) {
  const row = (k, v) => `<div class="pv-row"><span>${k}</span><b>${v}</b></div>`;
  let h = '';
  const src = blueprintOf(r, path);
  if (src) h += row('Live Copy of', `<code>${esc(src)}</code>${hasMixin(pcOf(r, path), 'cq:LiveSyncCancelled') ? ' (suspended)' : ''}`);
  const lcs = liveCopiesOf(r, path);
  if (lcs.length) h += row('Live Copies', lcs.map(l => `<code>${esc(l.target)}</code>`).join('<br>'));
  const ls = launchesFor(r, path);
  if (ls.length) h += row('Launches', ls.map(l => esc(l.c['jcr:title'])).join(', '));
  return h;
}

function referencesRail(path) {
  const r = AR();
  const lcs = liveCopiesOf(r, path);
  const src = blueprintOf(r, path);
  const ls = launchesFor(r, path);
  const root = languageRootOf(r, path);
  const langs = root ? childEntries(r, JCR.parent(root), ['cq:Page']).map(lr => lr + path.slice(root.length)).filter(p => p !== path && JCR.get(r, p)) : [];
  const sec = (t, body) => `<h5>${t}</h5>${body || '<p class="muted small">None</p>'}`;
  return `<div class="rail"><div class="rail-head"><b>References</b></div>
    ${sec('Live Copies', lcs.map(l => `<div class="tl-item"><code>${esc(l.target)}</code></div>`).join('') + (lcs.length ? `<button class="btn small primary" data-act="rolloutPage">Rollout</button>` : ''))}
    ${src ? sec('Blueprint', `<div class="tl-item"><a href="#" data-act="go" data-url="/sites.html${esc(src)}">${esc(src)}</a></div>`) : ''}
    ${sec('Launches', ls.map(l => `<div class="tl-item"><b>${esc(l.c['jcr:title'])}</b><br><a href="#" data-act="go" data-url="${LAUNCHES_URL}">Open Launches</a></div>`).join(''))}
    ${sec('Language Copies', langs.map(p => `<div class="tl-item"><a href="#" data-act="go" data-url="/sites.html${esc(p)}">${esc(p)}</a></div>`).join(''))}
  </div>`;
}
