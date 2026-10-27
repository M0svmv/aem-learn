/* Page editor modes beyond Edit: Layout (responsive grid + emulator), Developer, Timewarp and Targeting */

const DEVICES = { desktop: ['Desktop', null], tablet: ['Tablet', 768], phone: ['Phone', 375] };
const bpOf = device => (device === 'phone' ? 'phone' : device === 'tablet' ? 'tablet' : 'default');
const BP_KEY = { default: 'd', tablet: 't', phone: 'p' };

// The strip above the canvas: emulator devices, timewarp banner, audiences
function editorStrip(r, cx, mode) {
  const E = S.ui.editor;
  const parts = [];
  if (E.emu || mode === 'layout') {
    const dev = E.device || 'desktop';
    parts.push(`<div class="ed-strip"><span class="es-label">Emulator</span>${Object.entries(DEVICES).map(([k, [l, w]]) => `<button class="es-btn ${dev === k ? 'on' : ''}" data-act="edDevice" data-v="${k}">${icon(k === 'desktop' ? 'DeviceDesktop' : k === 'tablet' ? 'DeviceTablet' : 'DevicePhone', 16)} ${l}${w ? ` <small>${w}px</small>` : ''}</button>`).join('')}
      <span class="es-note">Breakpoint: <b>${bpOf(dev)}</b>${mode === 'layout' ? ' · drag the blue handles to resize on a 12-column grid' : ''}</span></div>`);
  }
  if (mode === 'timewarp') {
    const v = twVersion(cx.path, E.tw);
    parts.push(`<div class="ed-strip tw">${icon('Clock', 16)}<span>Timewarp: <b>${esc(fmtDate(E.tw))}</b> · ${v ? `showing version <b>${esc(v.name)}</b>${v.label ? ` (${esc(v.label)})` : ''} from ${esc(fmtDate(v.created))}` : 'no version of this page exists at that time'}</span>
      <span class="spacer"></span><button class="es-btn" data-act="twChange">Set Date</button><button class="es-btn on" data-act="twExit">Exit Timewarp</button></div>`);
  }
  if (mode === 'targeting' || (mode === 'preview' && hasTargeted(r, cx.path))) {
    const segs = segmentsOf(r);
    const today = currentAudience(r);
    const todayLabel = today ? (segs.find(s => s.name === today) || {}).title || today : 'Default';
    if (mode === 'targeting') {
      const cur = E.aud || '';
      parts.push(`<div class="ed-strip"><span class="es-label">${icon('Target', 16)} Audience</span>${[['', 'Default'], ...segs.map(s => [s.name, s.title])].map(([v, l]) => `<button class="es-btn ${cur === v ? 'on' : ''}" data-act="edAud" data-v="${esc(v)}">${esc(l)}</button>`).join('')}
        <span class="es-note">Select a component → <b>Target</b>, then edit its content for each audience. Visitors today get: <b>${esc(todayLabel)}</b></span></div>`);
    } else {
      const cur = E.ctxAud === undefined ? 'auto' : E.ctxAud || '';
      parts.push(`<div class="ed-strip"><span class="es-label">ContextHub · Segment</span>${[['auto', `Auto (today: ${todayLabel})`], ['', 'Default'], ...segs.map(s => [s.name, s.title])].map(([v, l]) => `<button class="es-btn ${cur === v ? 'on' : ''}" data-act="edCtxAud" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`);
    }
  }
  return parts.join('');
}

function hasTargeted(r, path) {
  return JCR.find(r, path + '/jcr:content', n => !!n.props['cq:targeted']).length > 0;
}

/* ---------- Layout mode ---------- */

// The layout that applies at a breakpoint: its own config, else the next bigger breakpoint's
function effCfg(r, path, bp) {
  const order = bp === 'phone' ? ['phone', 'tablet', 'default'] : bp === 'tablet' ? ['tablet', 'default'] : ['default'];
  for (const b of order) {
    const c = respCfg(r, path, b);
    if (c) return c;
  }
  return { width: 12, offset: 0, behavior: '' };
}

function writeCfg(cx, info, patch) {
  const r = AR();
  const bp = bpOf(S.ui.editor.device);
  const cur = { ...effCfg(r, info.cmp, bp), ...patch };
  const node = ensureEditableNode(cx, info);
  const n = JCR.ensure(node, 'cq:responsive/' + bp);
  JCR.get(node, 'cq:responsive').props['jcr:primaryType'] = 'nt:unstructured';
  n.props = { 'jcr:primaryType': 'nt:unstructured', width: String(cur.width), offset: String(cur.offset), ...(cur.behavior ? { behavior: cur.behavior } : {}) };
  markModified(info.cmp);
}

function hiddenChildren(r, path, bp) {
  const n = JCR.get(r, path);
  return (n ? n.children : []).filter(c => isCmpNode(c) && effCfg(r, path + '/' + c.name, bp).behavior === 'hide');
}

function layoutToolbar(cx, info, btn) {
  const r = AR();
  const bp = bpOf(S.ui.editor.device);
  const label = t => `<span class="lab-tb-label">${t}</span>`;
  if (info.kind === 'locked') return label(`${icon('LockClosed', 14)} ${esc(info.title)} · locked by the template`) + btn('parent', 'SelectContainer', 'Parent');
  let h = '';
  if (info.del === '1') {
    const c = effCfg(r, info.cmp, bp);
    h += label(`<span id="lab-w">${c.width}${c.offset ? ` (+${c.offset})` : ''} / 12</span>`);
    h += btn('lnewline', 'ArrowDown', c.behavior === 'newline' ? 'Undo float to new line' : 'Float to new line');
    h += btn('lhide', 'VisibilityOff', 'Hide component');
  }
  if (info.container === '1' && info.kind === 'content') {
    const n = hiddenChildren(r, info.cmp, bp).length;
    h += btn('lunhide', 'Visibility', n ? `Unhide components (${n})` : 'Unhide components (none hidden)', !n);
    h += btn('lreset', 'Revert', `Revert layout of this container (${bp})`);
  }
  return h + btn('parent', 'SelectContainer', 'Parent');
}

function layoutHandles(d, cx, el, info) {
  if (info.del !== '1' || info.kind !== 'content') return;
  const cont = el.parentElement;
  if (!cont) return;
  cont.classList.add('lab-cols');
  const r = AR();
  const bp = bpOf(S.ui.editor.device);
  const k = BP_KEY[bp];
  for (const side of ['l', 'r']) {
    const h = d.createElement('span');
    h.className = 'lab-rh ' + side;
    h.title = side === 'l' ? 'Drag to change the offset' : 'Drag to change the width';
    el.appendChild(h);
    h.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      const cs = d.defaultView.getComputedStyle(cont);
      const col = (cont.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) / 12;
      const c0 = effCfg(r, info.cmp, bp);
      const x0 = e.clientX;
      let cur = { width: c0.width, offset: c0.offset };
      cont.classList.add('lab-grid');
      const apply = () => {
        const span = cur.width + cur.offset;
        el.style.setProperty('--gc-' + k, `${c0.behavior === 'newline' ? '1 / ' : ''}span ${span}`);
        el.style.setProperty('--pl-' + k, (cur.offset / span * 100) + '%');
        const lbl = d.getElementById('lab-w');
        if (lbl) lbl.textContent = `${cur.width}${cur.offset ? ` (+${cur.offset})` : ''} / 12`;
      };
      const move = ev => {
        const delta = Math.round((ev.clientX - x0) / col);
        if (side === 'r') cur = { offset: c0.offset, width: Math.max(1, Math.min(12 - c0.offset, c0.width + delta)) };
        else {
          const off = Math.max(0, Math.min(c0.offset + c0.width - 1, c0.offset + delta));
          cur = { offset: off, width: c0.width - (off - c0.offset) };
        }
        apply();
      };
      const up = () => {
        d.removeEventListener('mousemove', move);
        d.removeEventListener('mouseup', up);
        if (cur.width === c0.width && cur.offset === c0.offset) return;
        writeCfg(cx, info, cur);
        flag('layout:resize');
        commit();
      };
      d.addEventListener('mousemove', move);
      d.addEventListener('mouseup', up);
    });
  }
}

const LAYOUT_ACTS = {
  lnewline: (cx, info) => {
    const c = effCfg(AR(), info.cmp, bpOf(S.ui.editor.device));
    writeCfg(cx, info, { behavior: c.behavior === 'newline' ? '' : 'newline' });
    flag('layout:newline');
    commit();
  },
  lhide: (cx, info) => {
    writeCfg(cx, info, { behavior: 'hide' });
    flag('layout:hide');
    S.ui.editor.sel = JCR.parent(info.cmp);
    S.ui.editor.info = null;
    toast(`Hidden at the <b>${bpOf(S.ui.editor.device)}</b> breakpoint. Select its container → <b>Unhide components</b> to bring it back.`);
    commit();
  },
  lunhide: (cx, info) => {
    const r = AR();
    for (const c of hiddenChildren(r, info.cmp, bpOf(S.ui.editor.device))) {
      const p = info.cmp + '/' + c.name;
      writeCfg(cx, { ...info, cmp: p }, { behavior: '' });
    }
    flag('layout:unhide');
    commit();
  },
  lreset: (cx, info) => {
    const r = AR();
    const bp = bpOf(S.ui.editor.device);
    const n = JCR.get(r, info.cmp);
    for (const c of n ? n.children : []) {
      const resp = JCR.get(c, 'cq:responsive');
      if (!resp) continue;
      resp.children = resp.children.filter(b => b.name !== bp);
      if (!resp.children.length) c.children = c.children.filter(x => x !== resp);
    }
    markModified(info.cmp);
    flag('layout:reset');
    toast(`Layout of the <b>${bp}</b> breakpoint reverted.`);
    commit();
  },
};

/* ---------- Targeting mode ---------- */

function targetingToolbar(cx, info, btn) {
  const label = t => `<span class="lab-tb-label">${t}</span>`;
  if (info.kind === 'locked') return label(`${icon('LockClosed', 14)} ${esc(info.title)} · locked by the template`) + btn('parent', 'SelectContainer', 'Parent');
  if (info.container === '1') return label('Containers cannot be targeted') + btn('parent', 'SelectContainer', 'Parent');
  if (info.kind !== 'content') return btn('parent', 'SelectContainer', 'Parent');
  const aud = S.ui.editor.aud;
  if (info.targeted === '1') {
    return label(`${icon('Targeted', 14)} ${aud ? esc(aud) : 'Default'} experience`) + btn('cfg', 'Wrench', aud ? `Edit the ${aud} experience` : 'Edit the default experience')
      + btn('untarget', 'Unlink', 'Stop targeting') + btn('parent', 'SelectContainer', 'Parent');
  }
  return label(esc(info.title)) + btn('target', 'Target', 'Target') + btn('parent', 'SelectContainer', 'Parent');
}

function targetAction(cx, info, act) {
  const r = AR();
  if (act === 'target') {
    if (info.exists !== '1' && !info.pkey) return;
    ensureEditableNode(cx, info).props['cq:targeted'] = true;
    markModified(info.cmp);
    flag('target:on');
    toast('Component targeted. Pick an audience above, then edit its content for that audience.');
    commit();
    return;
  }
  confirmBox('Stop targeting', 'Remove targeting from this component? The audience experiences are deleted and only the default content stays.', () => {
    const n = JCR.get(r, info.cmp);
    if (!n) return;
    delete n.props['cq:targeted'];
    n.children = n.children.filter(c => c.name !== 'cq:experiences');
    markModified(info.cmp);
    commit();
  }, 'Stop Targeting');
}

// Edits the experience of the selected audience: cq:experiences/<segment> under the component
function openExperience(cx, info) {
  const r = AR();
  const aud = S.ui.editor.aud;
  const node = JCR.get(r, info.cmp);
  if (!node) return;
  let exp = JCR.get(node, 'cq:experiences/' + aud);
  if (!exp) {
    exp = JCR.ensure(node, 'cq:experiences/' + aud);
    JCR.get(node, 'cq:experiences').props['jcr:primaryType'] = 'nt:unstructured';
    for (const [k, v] of Object.entries(node.props)) if (!['jcr:primaryType', 'cq:targeted', 'sling:resourceType'].includes(k)) exp.props[k] = v;
  }
  flag('target:experience');
  openConfigure(cx, { ...info, cmp: info.cmp + '/cq:experiences/' + aud });
}

A.edAud = d => {
  S.ui.editor.aud = d.v || null;
  commit();
};
A.edCtxAud = d => {
  S.ui.editor.ctxAud = d.v === 'auto' ? undefined : d.v || null;
  flag('target:simulate');
  commit();
};

/* ---------- Timewarp ---------- */

function twVersion(path, tw) {
  return (S.versions[path] || []).filter(v => v.created <= tw).pop() || null;
}

function openTimewarp() {
  const E = S.ui.editor;
  const pad = n => String(n).padStart(2, '0');
  const dt = new Date(E.tw || Date.now());
  const local = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  const count = (S.versions[CURRENT_CX.path] || []).length;
  openModal({
    title: 'Timewarp',
    okLabel: 'OK',
    body: `<label class="field"><span>Set Date</span><input type="datetime-local" name="tw" value="${local}"></label>
      <p class="hint">Timewarp shows the page as it was at that moment, rebuilt from its <b>versions</b>. This page has ${count} version(s): publishing creates one, and so does Sites → Timeline → <b>Save as Version</b>.</p>`,
    ok: b => {
      const v = b.querySelector('[name=tw]').value;
      if (!v) { toast('Pick a date.', 'error'); return false; }
      E.tw = new Date(v).toISOString();
      E.mode = 'timewarp';
      E.sel = null;
      E.info = null;
      flag('editor:mode:timewarp');
      commit();
    },
  });
}
A.twChange = () => openTimewarp();
A.twExit = () => {
  S.ui.editor.mode = 'edit';
  commit();
};

// Renders the page's version from that time (read only) by swapping in its jcr:content for a moment
function timewarpDoc(r, path, tw) {
  const v = twVersion(path, tw);
  if (!v) {
    return errorDoc('No version available', `There is no version of <code>${esc(path)}</code> at ${esc(fmtDate(tw))}.<br><br>Pick a later date, or create versions first: publish the page, or Sites → select it → Timeline → <b>Save as Version</b>.`);
  }
  const page = JCR.get(r, path);
  const i = page.children.findIndex(c => c.name === 'jcr:content');
  const cur = page.children[i];
  const vc = JCR.clone(v.content);
  vc.name = 'jcr:content';
  page.children[i] = vc;
  try {
    return pageDoc(r, path, 'view', { audience: null, bp: bpOf(S.ui.editor.device) });
  } finally {
    page.children[i] = cur;
  }
}

/* ---------- Developer mode ---------- */

function devPanel(cx) {
  const E = S.ui.editor;
  const r = AR();
  const tab = E.devTab || 'components';
  let body;
  if (tab === 'errors') {
    const errs = devErrors(r, cx);
    body = errs.length
      ? errs.map(([path, msg]) => `<a href="#" class="dp-err" data-act="devSel" data-path="${esc(path)}">${icon('AlertCircle', 14)}<span>${msg}<small>${esc(path)}</small></span></a>`).join('')
      : '<p class="hint pad-s">No errors on this page.</p>';
  } else {
    const rows = [];
    const walk = (t, depth) => {
      if (!t) return;
      rows.push(`<a href="#" class="sp-tree dp-row ${E.sel === t.path ? 'on' : ''}" style="padding-left:${8 + depth * 14}px" data-act="devSel" data-path="${esc(t.path)}">
        ${esc(componentTitle(r, t.rt))}<small>${esc(String(t.rt).split('/').pop())}</small></a>`);
      t.children.forEach(c => walk(c, depth + 1));
    };
    walk(treeFor(cx), 0);
    body = `<div class="dp-tree">${rows.join('')}</div><div class="dp-details">${devDetails(cx, E.sel)}</div>`;
  }
  return `<div class="sidepanel devpanel"><div class="dp-tabs">${[['components', 'Components'], ['errors', 'Errors']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="devTab" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="sp-body">${body}</div></div>`;
}

function findTree(t, path) {
  if (!t) return null;
  if (t.path === path) return t;
  for (const c of t.children) {
    const f = findTree(c, path);
    if (f) return f;
  }
  return null;
}

// The HTL script Sling would run: the first component in the super type chain that has one
function scriptOf(r, rt) {
  const s = componentScript(r, rt);
  if (!s) return null;
  if (s.kind === 'htl') return s.path;
  const base = s.path || ((JCR.get(r, '/apps/' + s.core) ? '/apps/' : '/libs/') + s.core);
  return `${base}/${JCR.name(base)}.html`;
}

function devDetails(cx, path) {
  const r = AR();
  const t = path && findTree(treeFor(cx), path);
  if (!t) return '<p class="hint pad-s">Select a component on the page or in the tree to see how it is built.</p>';
  const node = JCR.get(r, t.path);
  const chain = superChain(r, t.rt);
  const script = scriptOf(r, t.rt);
  const mapping = policyMapping(r, cx.tpl, t.pkey);
  const ref = mapping && mapping.props['cq:policy'];
  const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  const lay = BREAKPOINTS.map(([bp]) => [bp, respCfg(r, t.path, bp)]).filter(x => x[1]);
  const props = node ? Object.entries(node.props) : [];
  return `<h4>${esc(componentTitle(r, t.rt))}</h4><dl class="kv dp-kv">
    ${row('Resource Type', `<code>${esc(t.rt)}</code>`)}
    ${row('Node', node ? `<a href="#" data-act="devCrx" data-path="${esc(t.path)}"><code>${esc(t.path)}</code></a>` : `<code>${esc(t.path)}</code> <small>(not created yet — comes from the template structure)</small>`)}
    ${row('Script', script ? `<a href="#" data-act="devCrx" data-path="${esc(JCR.parent(script))}"><code>${esc(script)}</code></a>` : '<span class="dp-bad">No script found — Sling cannot render this resource type</span>')}
    ${row('Super Types', chain.map(c => `<code>${esc(c.rt)}</code>${c.path ? '' : ' <small>(missing)</small>'}`).join(' →<br>'))}
    ${row('Policy', ref ? `<a href="#" data-act="devCrx" data-path="${esc(POLICY_ROOT + '/' + ref)}"><code>${esc(ref)}</code></a><br><small>mapped at ${esc(mapping ? 'policies/jcr:content' + (t.pkey ? '/' + t.pkey : '') : '')}</small>` : '<small>none</small>')}
    ${lay.length ? row('Layout', lay.map(([bp, c]) => `${bp}: ${c.width}/12${c.offset ? ` +${c.offset}` : ''}${c.behavior ? ' · ' + c.behavior : ''}`).join('<br>')) : ''}
    </dl>
    ${props.length ? `<table class="dp-props"><tr><th>Property</th><th>Value</th></tr>${props.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(Array.isArray(v) ? '[' + v.join(', ') + ']' : String(v).slice(0, 160))}</td></tr>`).join('')}</table>` : ''}
    <div class="dp-links"><a href="#" class="btn small" data-act="devCrx" data-path="${esc(node ? t.path : JCR.parent(t.path))}">View in CRXDE</a><a href="#" class="btn small" data-act="go" data-url="${esc(cx.path)}.model.json">Sling Model JSON</a></div>`;
}

function devErrors(r, cx) {
  const out = [];
  const walk = t => {
    if (!t) return;
    if (!componentScript(r, t.rt)) out.push([t.path, `No script found for <code>${esc(t.rt)}</code>`]);
    for (const w of HTL_WARN[t.path] || []) out.push([t.path, esc(w)]);
    if (resolveCore(r, t.rt) === CORE.image && t.props.fileReference && !assetSrc(r, t.props.fileReference)) out.push([t.path, `Image asset not found: <code>${esc(t.props.fileReference)}</code>`]);
    if (t.props.fragmentVariationPath && !JCR.get(r, t.props.fragmentVariationPath)) out.push([t.path, `Experience Fragment not found: <code>${esc(t.props.fragmentVariationPath)}</code>`]);
    t.children.forEach(walk);
  };
  walk(treeFor(cx));
  return out;
}

// Updates the details panel in place (no re-render of the page frame)
function devShow(cx) {
  const sel = S.ui.editor.sel;
  document.querySelectorAll('.dp-row').forEach(a => a.classList.toggle('on', a.dataset.path === sel));
  const box = document.querySelector('.dp-details');
  if (box) box.innerHTML = devDetails(cx, sel);
  flag('editor:dev:inspect');
}

A.devSel = d => {
  S.ui.editor.sel = d.path;
  if (S.ui.editor.devTab === 'errors') {
    S.ui.editor.devTab = 'components';
    commit();
    return;
  }
  if (EDITOR_SELECT) EDITOR_SELECT(d.path);
  else devShow(CURRENT_CX);
};
A.devTab = d => {
  S.ui.editor.devTab = d.v;
  if (d.v === 'errors') flag('editor:dev:errors');
  commit();
};
A.devCrx = d => crxReveal('author', d.path);
