/* Page editor, template editor (structure / initial content), dialogs, styles and policies */

function editorRoute(rest) {
  if (rest.startsWith('/conf/global/settings/workflow/models/')) return wfModelEditor(rest.replace(/\.html$/, ''));
  const m = rest.match(/^(\/conf\/[^?]+\/settings\/wcm\/templates\/[^/]+)\/(structure|initial)\.html$/);
  if (m) return templateEditor(m[1], m[2]);
  if (rest.startsWith('/content/dam/') && isCF(AR(), rest.replace(/\.html$/, ''))) return cfEditor(rest.replace(/\.html$/, ''));
  return pageEditor(rest.replace(/\.html$/, ''));
}

function editorReset(key) {
  const E = S.ui.editor;
  if (E.for !== key) {
    E.for = key;
    E.sel = null;
    E.info = null;
  }
  return E;
}

function notFoundShell(path) {
  return shell('Editor', `<div class="pad"><h3>Resource not found</h3><p>Nothing to edit at <code>${esc(path)}</code>.</p></div>`);
}

const ED_MODES = [['edit', 'Edit'], ['layout', 'Layout'], ['developer', 'Developer'], ['timewarp', 'Timewarp'], ['targeting', 'Targeting']];

function pageEditor(path) {
  const r = AR();
  if (!isPage(r, path)) return notFoundShell(path);
  const E = editorReset(path);
  flag('visit:editor');
  S.events['editor:' + path] = S.events['editor:' + path] || Date.now();
  const c = pcOf(r, path);
  const st = pageStatus(path);
  const cx = { kind: 'page', path, tpl: c.props['cq:template'], content: path + '/jcr:content' };
  let mode = E.mode || 'edit';
  const readOnly = !secCan(path + '/jcr:content', 'jcr:modifyProperties');
  if (readOnly) { mode = 'preview'; flag('sec:readonly'); }
  if (mode === 'preview') {
    const aud = E.ctxAud === undefined ? undefined : E.ctxAud;
    mountFrame(pageDoc(r, path, 'view', { audience: aud, bp: bpOf(E.device) }), d => wireViewLinks(d, h => '/editor.html' + h));
  } else if (mode === 'timewarp') {
    mountFrame(timewarpDoc(r, path, E.tw), d => wireViewLinks(d, () => null));
  } else {
    mountFrame(pageDoc(r, path, 'edit', { audience: mode === 'targeting' ? E.aud || null : null, bp: bpOf(E.device) }), d => wireEditor(d, cx));
  }
  const menu = [
    ['Open Properties', 'edPageProps'],
    ['Start Workflow', 'edStartWf'],
    [st.locked ? 'Unlock Page' : 'Lock Page', 'edLock'],
    ['Publish Page', 'edPublish'],
    ['Unpublish Page', 'edUnpublish'],
    ['Edit Template', 'edEditTemplate'],
    ...(liveCopiesOf(r, path).length ? [['Rollout Page', 'edRollout']] : []),
    ['View as Published', 'edViewPublished'],
    ['View in Admin', 'edViewAdmin'],
  ];
  const cur = ED_MODES.find(m => m[0] === mode);
  return editorChrome({
    cx,
    title: `${esc(c.props['jcr:title'] || JCR.name(path))} ${st.locked ? icon('LockClosed', 14) : ''}`,
    sub: statusHtml(st),
    menu,
    modeLabel: cur ? cur[1] : 'Edit',
    modes: ED_MODES.map(([k, l]) => [l, 'edMode', `data-mode="${k}"`]),
    preview: `<button class="btn ${mode === 'preview' ? 'on' : ''}" data-act="edMode" data-mode="${mode === 'preview' ? 'edit' : 'preview'}">Preview</button>`,
    strip: (readOnly ? `<div class="ed-strip tw">${icon('LockClosed', 16)}<span>Read only: <b>${esc(curUser())}</b> has no <code>jcr:modifyProperties</code> on this page.</span></div>` : '') + editorStrip(r, cx, mode),
    panel: mode === 'developer' ? devPanel(cx) : null,
  });
}

function templateEditor(tpl, mode) {
  const r = AR();
  const tc = pcOf(r, tpl);
  if (!tc) return notFoundShell(tpl);
  editorReset(tpl + ':' + mode);
  flag('visit:tpl-editor');
  const cx = { kind: mode === 'structure' ? 'struct' : 'initial', tpl, content: tpl + '/initial/jcr:content' };
  mountFrame(templateDoc(r, tpl, mode === 'structure' ? 'struct' : 'initial'), d => wireEditor(d, cx));
  const status = tc.props.status || 'draft';
  return editorChrome({
    cx,
    title: `Template: ${esc(tc.props['jcr:title'] || JCR.name(tpl))}`,
    sub: `<span class="pill ${status === 'enabled' ? 'green' : status === 'draft' ? 'orange' : 'grey'}">${esc(status)}</span>`,
    menu: [
      ['Page Policy', 'edPagePolicy'],
      [status === 'enabled' ? 'Disable Template' : 'Enable Template', 'edTplStatus'],
      ['Publish Template', 'edTplPublish'],
      ['View in Admin', 'edTplAdmin'],
    ],
    modeLabel: mode === 'structure' ? 'Structure' : 'Initial Content',
    modes: [['Structure', 'go', `data-url="/editor.html${esc(tpl)}/structure.html"`], ['Initial Content', 'go', `data-url="/editor.html${esc(tpl)}/initial.html"`], ['Layout']],
    preview: '<button class="btn off" title="Not in this lab">Preview</button>',
    hint: mode === 'structure'
      ? 'Structure: what every page gets. Locked components cannot be changed by authors.'
      : 'Initial content: copied into a new page once, when it is created.',
  });
}

function editorChrome(o) {
  const E = S.ui.editor;
  CURRENT_CX = o.cx;
  const modes = o.modes.map(([label, act, attrs]) => (act ? `<a href="#" data-act="${act}" ${attrs || ''}>${label}</a>` : `<a class="off" title="Not in this lab">${label}</a>`)).join('');
  return `<div class="editor">
    <div class="ed-bar">
      <button class="iconbtn ${E.panelOpen ? 'on' : ''}" data-act="edPanel" title="Toggle Side Panel">${icon('RailLeft')}</button>
      <details class="dd"><summary class="iconbtn" title="Page Information">${icon('Properties')}</summary>
        <div class="dd-menu">${o.menu.map(([l, a]) => `<a href="#" data-act="${a}">${l}</a>`).join('')}</div></details>
      ${o.cx.kind === 'page' ? `<button class="iconbtn ${E.emu || E.mode === 'layout' ? 'on' : ''}" data-act="edEmu" title="Emulator">${icon('DeviceDesktop')}</button>` : `<button class="iconbtn off" title="Emulator (pages only)">${icon('DeviceDesktop')}</button>`}
      <button class="iconbtn off" title="Annotate (not in this lab)">${icon('Annotate')}</button>
      <div class="ed-title">${o.title} <span class="ed-sub">${o.sub || ''}</span></div>
      <div class="spacer"></div>
      ${o.hint ? `<span class="ed-hint">${o.hint}</span>` : ''}
      <details class="dd right"><summary class="btn">${o.modeLabel}${icon('ChevronDown', 10)}</summary><div class="dd-menu">${modes}</div></details>
      ${o.preview || ''}
    </div>
    <div class="ed-main">
      ${o.panel || (E.panelOpen ? sidePanel(o.cx) : '')}
      <div class="ed-canvas">${o.strip || ''}<div class="ed-device" style="${o.cx.kind === 'page' && E.device && E.device !== 'desktop' ? `width:${DEVICES[E.device][1]}px` : ''}">${frameHtml('frame')}</div></div>
    </div>
  </div>`;
}

let CURRENT_CX = null;
let EDITOR_SELECT = null;

/* ---------- side panel ---------- */

function treeFor(cx) {
  const r = AR();
  if (cx.kind === 'page') {
    const c = pcOf(r, cx.path);
    return buildTree(r, { r, mode: 'edit', tpl: cx.tpl, content: cx.content, pagePath: cx.path, pageTitle: c.props['jcr:title'], editing: true });
  }
  return buildTree(r, { r, mode: cx.kind, tpl: cx.tpl, content: cx.content, pagePath: null, pageTitle: '', editing: true });
}

// The container new components go into: the selected container, or the first editable one
function insertTarget(cx) {
  const info = S.ui.editor.info;
  if (info && info.container === '1' && info.kind !== 'locked') return { path: info.cmp, ckey: info.ckey, srt: info.srt || info.rt };
  let found = null;
  const walk = t => {
    if (found || !t) return;
    if (t.container && (t.kind === 'content' || (t.kind === 'struct' && t.pkey === 'root'))) { found = { path: t.path, ckey: t.ckey, srt: t.structRt || t.rt }; return; }
    t.children.forEach(walk);
  };
  walk(treeFor(cx));
  return found;
}

function sidePanel(cx) {
  const E = S.ui.editor;
  const r = AR();
  const tabs = [['assets', 'Images', 'Assets'], ['components', 'Box', 'Components'], ['tree', 'Layers', 'Content Tree']];
  const search = sel => `<div class="sp-search">${icon('Search', 14)}<input placeholder="Search" data-filter="${sel}" autocomplete="off"></div>`;
  let body = '';
  if (E.panel === 'components') {
    const target = insertTarget(cx);
    const comps = target ? allowedComponents(r, cx.tpl, target.ckey) : [];
    body = target
      ? `${search('.sp-cmp')}<div class="sp-sub">Insert into: <b>${esc(componentTitle(r, target.srt))}</b> <code>${esc(JCR.name(target.path))}</code></div>
        ${comps.map(c => `<a href="#" class="sp-cmp" data-act="spInsert" data-rt="${esc(c.rt)}" title="${esc(c.rt)}" draggable="true" data-drag="rt:${esc(c.rt)}"><span class="cmp-abbr">${esc(c.title.slice(0, 2))}</span><span class="sp-cmp-t">${esc(c.title)}<small>${esc(c.group)}</small></span></a>`).join('')
        || '<p class="warn-box">No components are allowed in this container. Set the container <b>policy</b> in the template (Structure mode → Policy).</p>'}`
      : '<p class="hint pad-s">There is no editable container on this page. Unlock a container in the template structure.</p>';
  } else if (E.panel === 'assets') {
    const assets = JCR.find(r, '/content/dam', (n, p) => JCR.type(n) === 'dam:Asset' && !isCF(r, p));
    body = `${search('.sp-asset')}<div class="sp-sub">Images · select an Image component, then click an asset</div>
      <div class="sp-assets">${assets.map(({ path, node }) => {
        const meta = JCR.get(node, 'jcr:content/metadata');
        return `<a href="#" class="sp-asset" data-act="spAsset" data-path="${esc(path)}" title="${esc(path)}" draggable="true" data-drag="asset:${esc(path)}"><img src="${assetSrc(r, path)}" alt=""><b>${esc((meta && meta.props['dc:title']) || JCR.name(path))}</b><small>${esc(JCR.name(path))}</small></a>`;
      }).join('')}</div>`;
  } else {
    const rows = [];
    const walk = (t, depth) => {
      if (!t) return;
      rows.push(`<a href="#" class="sp-tree ${E.sel === t.path ? 'on' : ''}" style="padding-left:${10 + depth * 16}px" data-act="spSelect" data-path="${esc(t.path)}">
        ${t.children.length ? icon('ChevronDown', 10) : '<span class="tree-sp"></span>'}${esc(componentTitle(r, t.rt))}${t.kind === 'locked' ? icon('LockClosed', 12) : ''}<small>${esc(JCR.name(t.path))}</small></a>`);
      t.children.forEach(c => walk(c, depth + 1));
    };
    walk(treeFor(cx), 0);
    body = `<div class="sp-sub">Content Tree</div>${rows.join('')}`;
  }
  return `<div class="sidepanel"><div class="sp-tabs">${tabs.map(([k, ico, l]) => `<button class="${E.panel === k ? 'on' : ''}" data-act="spTab" data-panel="${k}" title="${l}">${icon(ico)}</button>`).join('')}</div>
    <div class="sp-body">${body}</div></div>`;
}

// Live filter for side panel / dialog lists: <input data-filter=".selector">
document.addEventListener('input', e => {
  const f = e.target.closest('[data-filter]');
  if (!f) return;
  const q = f.value.toLowerCase();
  const scope = f.closest('.sidepanel, .modal-body') || document;
  scope.querySelectorAll(f.dataset.filter).forEach(el => { el.hidden = !el.textContent.toLowerCase().includes(q); });
});

A.spTab = d => {
  S.ui.editor.panel = d.panel;
  commit();
};
A.edPanel = () => {
  S.ui.editor.panelOpen = !S.ui.editor.panelOpen;
  commit();
};
A.spInsert = d => {
  const t = insertTarget(CURRENT_CX);
  if (t) insertComponent(CURRENT_CX, t, d.rt);
};
A.spSelect = d => {
  S.ui.editor.sel = d.path;
  S.ui.editor.info = null;
  commit();
};
A.spAsset = d => {
  const cx = CURRENT_CX;
  const r = AR();
  const info = S.ui.editor.info;
  if (info && info.kind !== 'locked' && resolveCore(r, info.rt) === CORE.image) {
    const node = ensureEditableNode(cx, info);
    node.props.fileReference = d.path;
    markModified(info.cmp);
    flag('image:asset');
    commit();
    return;
  }
  const t = insertTarget(cx);
  if (!t) return;
  if (!allowedComponents(r, cx.tpl, t.ckey).some(c => c.rt === 'wknd/components/image')) {
    toast('The Image component is not allowed in this container (check the policy).', 'warn');
    return;
  }
  insertComponent(cx, t, 'wknd/components/image', { fileReference: d.path });
  flag('image:asset');
};

/* ---------- canvas wiring ---------- */

function wireEditor(d, cx) {
  const mode = cx.kind === 'page' ? S.ui.editor.mode || 'edit' : 'edit';
  d.body.classList.add('lab-mode-' + mode);
  const position = el => {
    const tb = d.getElementById('lab-tb');
    const w = d.defaultView;
    const rect = el.getBoundingClientRect();
    let top = rect.top + w.scrollY - tb.offsetHeight - 6;
    if (top < w.scrollY) top = rect.top + w.scrollY + 6;
    tb.style.top = Math.max(0, top) + 'px';
    tb.style.left = Math.max(4, Math.min(rect.left + w.scrollX, w.innerWidth - tb.offsetWidth - 8)) + 'px';
  };
  const clear = () => {
    d.querySelectorAll('.lab-sel').forEach(x => x.classList.remove('lab-sel'));
    d.querySelectorAll('.lab-cols').forEach(x => x.classList.remove('lab-cols'));
    d.querySelectorAll('.lab-rh').forEach(x => x.remove());
  };
  const select = el => {
    clear();
    const tb = d.getElementById('lab-tb');
    if (!el) {
      tb.hidden = true;
      S.ui.editor.sel = null;
      S.ui.editor.info = null;
      save();
      if (mode === 'developer') devShow(cx);
      return;
    }
    el.classList.add('lab-sel');
    // the "Drag components here" placeholder is selectable too: it offers Insert and Paste
    const info = el.dataset.drop
      ? { cmp: el.dataset.drop, ckey: el.dataset.ckey, srt: el.dataset.srt, rt: el.dataset.srt, container: '1', kind: 'drop', exists: '1' }
      : { ...el.dataset };
    S.ui.editor.sel = info.cmp;
    S.ui.editor.info = info;
    save();
    if (mode === 'developer') { tb.hidden = true; devShow(cx); return; }
    tb.innerHTML = toolbarHtml(cx, info);
    tb.hidden = false;
    if (mode === 'layout') layoutHandles(d, cx, el, info);
    position(el);
  };
  EDITOR_SELECT = path => {
    const el = path && d.querySelector(`[data-cmp="${CSS.escape(path)}"]`);
    select(el || null);
  };
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-tb]');
    if (b) {
      e.preventDefault();
      if (!b.disabled) editorAction(cx, b.dataset.tb, S.ui.editor.info, d);
      return;
    }
    if (e.target.closest('.lab-rh')) return;
    if (e.target.closest('a')) e.preventDefault();
    const drop = e.target.closest('[data-drop]');
    if (drop) {
      e.preventDefault();
      if (mode === 'edit' || mode === 'targeting') select(drop);
      return;
    }
    select(e.target.closest('[data-cmp]'));
  });
  d.addEventListener('dblclick', e => {
    if (mode !== 'edit' && mode !== 'targeting') return;
    const el = e.target.closest('[data-cmp]');
    if (!el || el.dataset.kind === 'locked') return;
    select(el);
    const inherited = cx.kind === 'page' && el.dataset.exists === '1' && msmComponentState(AR(), cx.path, el.dataset.cmp);
    if (inherited && !inherited.cancelled) { toast('This component is inherited from the blueprint. Cancel inheritance (padlock) to edit it.', 'warn'); return; }
    if (resolveDialog(AR(), el.dataset.rt)) editorAction(cx, 'cfg', S.ui.editor.info, d);
  });
  if (mode === 'edit') wireDrop(d, cx);
  if (S.ui.editor.sel) EDITOR_SELECT(S.ui.editor.sel);
}

// Drag & drop from the side panel (components or assets) onto the page, like the real editor
let DRAG_DATA = null;
document.addEventListener('dragstart', e => {
  const el = e.target.closest && e.target.closest('[data-drag]');
  if (!el) return;
  DRAG_DATA = el.dataset.drag;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', DRAG_DATA);
});
document.addEventListener('dragend', () => { DRAG_DATA = null; });

function wireDrop(d, cx) {
  const r = AR();
  // where a drop lands: a placeholder (append) or next to a component inside an editable container
  const targetOf = el => {
    const drop = el.closest('[data-drop]');
    if (drop) return { box: drop, target: { path: drop.dataset.drop, ckey: drop.dataset.ckey, srt: drop.dataset.srt }, after: null };
    const cmp = el.closest('[data-cmp]');
    if (!cmp || cmp.dataset.del !== '1') return null;
    const parent = cmp.parentElement.closest('[data-cmp]');
    if (!parent || parent.dataset.container !== '1' || parent.dataset.kind === 'locked') return null;
    return { box: cmp, target: { path: parent.dataset.cmp, ckey: parent.dataset.ckey, srt: parent.dataset.srt || parent.dataset.rt }, after: JCR.name(cmp.dataset.cmp) };
  };
  let over = null;
  const mark = box => {
    if (over === box) return;
    if (over) over.classList.remove('lab-dragover');
    over = box;
    if (over) over.classList.add('lab-dragover');
  };
  d.addEventListener('dragover', e => {
    const t = DRAG_DATA && targetOf(e.target);
    mark(t ? t.box : null);
    if (t) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
  });
  d.addEventListener('dragleave', e => { if (!e.relatedTarget) mark(null); });
  d.addEventListener('drop', e => {
    const t = targetOf(e.target);
    const data = DRAG_DATA || e.dataTransfer.getData('text/plain');
    mark(null);
    if (!t || !data) return;
    e.preventDefault();
    const allowed = allowedComponents(r, cx.tpl, t.target.ckey);
    if (data.startsWith('rt:')) {
      const rt = data.slice(3);
      if (!allowed.some(c => c.rt === rt)) { toast(`<b>${esc(componentTitle(r, rt))}</b> is not allowed in this container (check its policy).`, 'warn'); return; }
      flag('editor:dragdrop');
      insertComponent(cx, t.target, rt, null, t.after);
    } else if (data.startsWith('asset:')) {
      const ref = data.slice(6);
      const img = e.target.closest('[data-cmp]');
      if (img && img.dataset.kind !== 'locked' && resolveCore(r, img.dataset.rt) === CORE.image) {
        const info = { ...img.dataset };
        ensureEditableNode(cx, info).props.fileReference = ref;
        markModified(info.cmp);
        flag('image:asset');
        commit();
        return;
      }
      if (!allowed.some(c => c.rt === 'wknd/components/image')) { toast('The Image component is not allowed in this container (check its policy).', 'warn'); return; }
      flag('image:asset');
      insertComponent(cx, t.target, 'wknd/components/image', { fileReference: ref }, t.after);
    }
  });
}

function toolbarHtml(cx, info) {
  const r = AR();
  const btn = (act, ico, title, off) => `<button data-tb="${act}" title="${esc(title)}" ${off ? 'disabled' : ''}>${icon(ico)}</button>`;
  let h = '';
  const mode = cx.kind === 'page' ? S.ui.editor.mode || 'edit' : 'edit';
  if (info.kind === 'drop') return btn('insert', 'Add', 'Insert component') + btn('paste', 'Paste', 'Paste', !S.ui.editor.clip);
  if (mode === 'layout') return layoutToolbar(cx, info, btn);
  if (mode === 'targeting') return targetingToolbar(cx, info, btn);
  if (info.kind === 'locked') {
    h += `<span class="lab-tb-label">${icon('LockClosed', 14)} ${esc(info.title)} · locked by the template</span>`;
    if (cx.kind === 'page') h += btn('tpl', 'FileTemplate', 'Edit Template');
    return h + btn('parent', 'SelectContainer', 'Parent');
  }
  // Live copy: inherited components are locked until inheritance is cancelled
  const msm = cx.kind === 'page' && info.kind === 'content' && info.exists === '1' ? msmComponentState(r, cx.path, info.cmp) : null;
  if (msm && !msm.cancelled) {
    h += `<span class="lab-tb-label">${icon('LinkPage', 14)} inherited from the blueprint</span>${btn('msmCancel', 'LockClosed', 'Cancel Inheritance')}`;
    if (info.container === '1') h += btn('insert', 'Add', 'Insert component');
    return h + btn('parent', 'SelectContainer', 'Parent');
  }
  if (msm && msm.cancelled) h += btn('msmRestore', 'LockOpen', 'Re-enable Inheritance');
  const hasDialog = !!resolveDialog(r, info.rt);
  const hasStyles = styleGroups(getPolicy(r, cx.tpl, info.pkey)).length > 0;
  if (cx.kind === 'struct') {
    h += btn('policy', 'Settings', 'Policy');
    if (hasDialog) h += btn('cfg', 'Wrench', 'Configure');
    if (info.pkey !== 'root') h += btn('lock', info.unlocked === '1' ? 'LockOpen' : 'LockClosed', info.unlocked === '1' ? 'Lock structure component' : 'Unlock structure component');
  } else {
    if (hasDialog) h += btn('cfg', 'Wrench', 'Configure');
    if (hasStyles) h += btn('style', 'Brush', 'Styles');
  }
  if (info.del === '1') {
    if (cx.kind !== 'struct') h += btn('copy', 'Copy', 'Copy');
    h += btn('del', 'Delete', 'Delete');
  }
  if (info.container === '1') h += btn('insert', 'Add', 'Insert component');
  if (cx.kind !== 'struct' && info.container === '1' && S.ui.editor.clip) h += btn('paste', 'Paste', 'Paste');
  if (info.del === '1') h += btn('up', 'ArrowUp', 'Move up') + btn('down', 'ArrowDown', 'Move down');
  h += btn('parent', 'SelectContainer', 'Parent');
  h += `<span class="lab-tb-sep"></span>${btn('crx', 'Code', 'Lab: show this node in CRXDE Lite')}`;
  return h;
}

function editorAction(cx, act, info, d) {
  const r = AR();
  if (!info) return;
  if (LAYOUT_ACTS[act]) return LAYOUT_ACTS[act](cx, info);
  if (act === 'target' || act === 'untarget') return targetAction(cx, info, act);
  if (act === 'cfg' && cx.kind === 'page' && S.ui.editor.mode === 'targeting' && S.ui.editor.aud && info.targeted === '1') return openExperience(cx, info);
  if (act === 'cfg') return openConfigure(cx, info);
  if (act === 'msmCancel') return msmCancel(info.cmp);
  if (act === 'msmRestore') return confirmBox('Re-enable Inheritance', 'Re-enabling inheritance replaces your local changes on this component with the blueprint content.', () => msmRestore(cx.path, info.cmp), 'Re-enable');
  if (act === 'style') return openStyles(cx, info);
  if (act === 'policy') return openPolicyDialog(cx, info.pkey, info.rt);
  if (act === 'lock') return toggleStructLock(cx, info);
  if (act === 'insert') return openInsertDialog(cx, { path: info.cmp, ckey: info.ckey, srt: info.srt || info.rt });
  if (act === 'tpl') return go('/editor.html' + cx.tpl + '/structure.html');
  if (act === 'crx') return crxReveal('author', info.exists === '1' ? info.cmp : JCR.parent(info.cmp));
  if (act === 'parent') {
    const el = d.querySelector(`[data-cmp="${CSS.escape(info.cmp)}"]`);
    const p = el && el.parentElement.closest('[data-cmp]');
    if (p && EDITOR_SELECT) EDITOR_SELECT(p.dataset.cmp);
    return;
  }
  if (act === 'copy') {
    const n = JCR.get(r, info.cmp);
    if (n) S.ui.editor.clip = JCR.clone(n);
    toast('Copied. Select a container and click 📋 Paste.');
    save();
    return;
  }
  if (act === 'paste') {
    const clip = S.ui.editor.clip;
    if (!clip) { toast('Nothing to paste. Copy a component first.', 'warn'); return; }
    const parent = ensureContainer(cx, { path: info.cmp, srt: info.srt || info.rt });
    const copy = JCR.clone(clip);
    copy.name = JCR.unique(parent, clip.name);
    parent.children.push(copy);
    markModified(info.cmp);
    S.ui.editor.sel = info.cmp + '/' + copy.name;
    commit();
    return;
  }
  if (act === 'up' || act === 'down') {
    const parent = JCR.get(r, JCR.parent(info.cmp));
    if (!parent) return;
    const i = parent.children.findIndex(c => c.name === JCR.name(info.cmp));
    const j = act === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= parent.children.length) return;
    [parent.children[i], parent.children[j]] = [parent.children[j], parent.children[i]];
    markModified(info.cmp);
    commit();
    return;
  }
  if (act === 'del') {
    JCR.remove(r, info.cmp);
    if (cx.kind === 'struct') JCR.remove(r, cx.tpl + '/initial/jcr:content/' + info.pkey);
    markModified(JCR.parent(info.cmp));
    S.ui.editor.sel = null;
    S.ui.editor.info = null;
    flag('cmp:deleted');
    toast('Component deleted.');
    commit();
  }
}

/* ---------- creating content nodes ---------- */

// Makes sure a content container exists (e.g. an unlocked container on a page created before it was unlocked)
function ensureContainer(cx, target) {
  const r = AR();
  let n = JCR.get(r, target.path);
  if (n) return n;
  n = JCR.ensure(r, target.path);
  n.props['sling:resourceType'] = target.srt;
  // give the intermediate nodes the resource type of their structure counterpart
  const base = cx.content;
  if (target.path.startsWith(base + '/')) {
    const rel = target.path.slice(base.length + 1).split('/');
    for (let i = 1; i < rel.length; i++) {
      const sub = rel.slice(0, i).join('/');
      const cn = JCR.get(r, base + '/' + sub);
      const sn = JCR.get(r, cx.tpl + '/structure/jcr:content/' + sub);
      if (cn && sn && !cn.props['sling:resourceType']) cn.props['sling:resourceType'] = sn.props['sling:resourceType'];
    }
  }
  return n;
}

// For an unlocked structure component that has no content node yet, create it from the structure
function ensureEditableNode(cx, info) {
  const r = AR();
  let n = JCR.get(r, info.cmp);
  if (n) return n;
  const sn = JCR.get(r, cx.tpl + '/structure/jcr:content/' + info.pkey);
  n = ensureContainer(cx, { path: info.cmp, srt: info.srt || info.rt });
  if (sn) for (const [k, v] of Object.entries(sn.props)) if (k !== 'editable') n.props[k] = v;
  return n;
}

let PENDING_INSERT = null;

function openInsertDialog(cx, target) {
  const r = AR();
  const comps = allowedComponents(r, cx.tpl, target.ckey);
  PENDING_INSERT = { cx, target };
  const groups = {};
  comps.forEach(c => (groups[c.group] = groups[c.group] || []).push(c));
  openModal({
    title: 'Insert New Component',
    hideOk: true,
    noHelp: true,
    cls: 'm-insert',
    body: comps.length
      ? `<div class="ins-search">${icon('Search', 16)}<input placeholder="Enter Keyword" data-filter=".ins" autocomplete="off"></div>
        <div class="ins-list">${Object.entries(groups).map(([g, list]) => `<div class="ins-group">${esc(g)}</div>${list.map(c => `<a href="#" class="ins" data-act="insPick" data-rt="${esc(c.rt)}" title="${esc(c.rt)}">${esc(c.title)}</a>`).join('')}`).join('')}</div>`
      : `<p class="warn-box">No components are allowed here.<br>Open the template in <b>Structure</b> mode, select this container and set its <b>Policy → Allowed Components</b>.</p>`,
  });
}

A.insPick = d => {
  closeModal();
  if (PENDING_INSERT) insertComponent(PENDING_INSERT.cx, PENDING_INSERT.target, d.rt);
};

function insertComponent(cx, target, rt, extra, after) {
  const parent = ensureContainer(cx, target);
  const base = rt.split('/').pop();
  const name = JCR.unique(parent, base);
  const node = JCR.node(name, { 'jcr:primaryType': 'nt:unstructured', 'sling:resourceType': rt, ...(extra || {}) });
  const i = after ? parent.children.findIndex(c => c.name === after) : -1;
  if (i >= 0) parent.children.splice(i + 1, 0, node);
  else parent.children.push(node);
  markModified(target.path);
  flag('insert:' + base);
  if (cx.kind === 'struct') flag('struct:insert:' + base);
  S.ui.editor.sel = target.path + '/' + name;
  S.ui.editor.info = null;
  toast(`Inserted <b>${esc(componentTitle(AR(), rt))}</b> as <code>${esc(name)}</code>`);
  commit();
}

/* ---------- component dialog (built from cq:dialog in the JCR) ---------- */

function dialogField(r, f, value, policy) {
  const p = f.props;
  const rt = p['sling:resourceType'];
  const label = esc(p.fieldLabel || p.text || p.name);
  const desc = p.fieldDescription ? esc(p.fieldDescription) : '';
  if (rt === FIELD.text || /form\/(numberfield|textfield|datepicker|colorfield)$/.test(rt)) return field(label, p.name, value, desc);
  if (/form\/hidden$/.test(rt)) return `<input type="hidden" name="${esc(p.name)}" value="${esc(p.value != null ? p.value : value || '')}">`;
  if (rt === FIELD.textarea || rt === FIELD.rte) {
    return `<label class="field"><span>${label}</span><textarea name="${esc(p.name)}" rows="7">${esc(value || '')}</textarea>
      <small>${rt === FIELD.rte ? 'Rich text (simplified): an empty line starts a new paragraph.' : desc}</small></label>`;
  }
  if (rt === FIELD.select) {
    let opts = (JCR.get(f, 'items') || { children: [] }).children.map(o => [o.props.value, o.props.text]);
    let hint = desc;
    if (p.name === './type' && policy && policy.props.allowedTypes) {
      opts = opts.filter(([v]) => !v || policy.props.allowedTypes.includes(v));
      hint = `Sizes allowed by the policy: ${policy.props.allowedTypes.join(', ')} · default ${policy.props.type || '—'}`;
    }
    return selectField(label, p.name, value || '', opts, hint);
  }
  if (rt === FIELD.checkbox) {
    return `<label class="check"><input type="checkbox" name="${esc(p.name)}" ${String(value) === String(p.value || 'true') ? 'checked' : ''}> ${esc(p.text || p.fieldLabel)}</label>`;
  }
  if (rt === FIELD.path) {
    const root = p.rootPath || '/content';
    const opts = root.startsWith('/content/dam')
      ? JCR.find(r, root, (n, p) => JCR.type(n) === 'dam:Asset' && !isCF(r, p)).map(x => [x.path, x.path])
      : allPagePaths(r, root).map(x => [x, `${titleOf(r, x)} — ${x}`]);
    return selectField(label, p.name, value || '', [['', '(none)'], ...opts], desc || `Path field (root: ${esc(root)})`);
  }
  return `<p class="muted">Unsupported field ${esc(rt)}</p>`;
}

function openConfigure(cx, info) {
  const r = AR();
  const dlg = resolveDialog(r, info.rt);
  if (!dlg) { toast('This component has no dialog.', 'warn'); return; }
  const existing = JCR.get(r, info.cmp);
  const sn = cx.kind !== 'struct' && !existing ? JCR.get(r, cx.tpl + '/structure/jcr:content/' + info.pkey) : null;
  const props = (existing || sn || { props: {} }).props;
  const policy = getPolicy(r, cx.tpl, info.pkey);
  // real dialogs nest fields in tabs/columns: collect every form field at any depth
  const fields = [];
  JCR.walk(dlg.node, '', n => {
    const frt = String(n.props['sling:resourceType'] || '');
    if (n.props.name && (frt.includes('/form/') || frt === FIELD.rte)) fields.push(n);
  });
  const body = fields.map(f => dialogField(r, f, props[String(f.props.name).replace(/^\.\//, '')], policy)).join('')
    + `<p class="hint">Dialog loaded from <code>${esc(dlg.path)}</code> (inherited through <code>sling:resourceSuperType</code>).<br>Values are saved as properties on <code>${esc(info.cmp)}</code>.</p>`;
  openModal({
    title: `${esc(dlg.node.props['jcr:title'] || componentTitle(r, info.rt))}`,
    body,
    ok: b => {
      const node = cx.kind === 'struct' ? JCR.get(r, info.cmp) : ensureEditableNode(cx, info);
      for (const f of fields) {
        const name = String(f.props.name);
        const key = name.replace(/^\.\//, '');
        const el = b.querySelector(`[name="${CSS.escape(name)}"]`);
        if (!el) continue;
        let v = el.type === 'checkbox' ? (el.checked ? (f.props.value || 'true') : '') : el.value;
        if (v === '' || v == null) delete node.props[key];
        else node.props[key] = v;
      }
      markModified(info.cmp);
      flag('dialog:' + info.rt.split('/').pop());
      if (info.kind === 'content' && info.pkey && !info.del && cx.kind === 'page') flag('edited:unlocked-structure');
      toast('Saved.');
      commit();
    },
  });
}

/* ---------- Style System ---------- */

function openStyles(cx, info) {
  const r = AR();
  const policy = getPolicy(r, cx.tpl, info.pkey);
  const groups = styleGroups(policy);
  const node = JCR.get(r, info.cmp);
  const cur = (node && node.props['cq:styleIds']) || [];
  openModal({
    title: `Styles — ${esc(info.title)}`,
    body: groups.map((g, gi) => `<h5>${esc(g.label)}</h5>${g.multiple ? '' : `<label class="check"><input type="radio" name="g${gi}" value="" ${g.styles.some(s => cur.includes(s.id)) ? '' : 'checked'}> None</label>`}
      ${g.styles.map(s => `<label class="check"><input type="${g.multiple ? 'checkbox' : 'radio'}" name="g${gi}" ${g.multiple ? 'data-multi="1"' : ''} value="${esc(s.id)}" ${cur.includes(s.id) ? 'checked' : ''}> ${esc(s.label)} <code class="muted">.${esc(s.classes)}</code></label>`).join('')}`).join('')
      + `<p class="hint">Styles come from the policy <code>${esc(policy ? policy.name : '')}</code>. The CSS classes are added to the component wrapper; the CSS itself lives in a <b>clientlib</b>.</p>`,
    ok: b => {
      const f = formData(b);
      const ids = [];
      groups.forEach((g, gi) => {
        const v = f['g' + gi];
        if (Array.isArray(v)) ids.push(...v);
        else if (v) ids.push(v);
      });
      const n = ensureEditableNode(cx, info);
      if (ids.length) n.props['cq:styleIds'] = ids;
      else delete n.props['cq:styleIds'];
      markModified(info.cmp);
      if (ids.length) flag('style:applied');
      commit();
    },
  });
}

/* ---------- template structure: lock / unlock ---------- */

function toggleStructLock(cx, info) {
  const r = AR();
  const sn = JCR.get(r, info.cmp);
  if (!sn) return;
  const ip = cx.tpl + '/initial/jcr:content/' + info.pkey;
  if (sn.props.editable) {
    delete sn.props.editable;
    JCR.remove(r, ip);
    flag('struct:lock');
    flag('struct:lock:' + info.pkey);
    toast('🔒 Locked: authors can no longer change this component on pages.');
  } else {
    sn.props.editable = true;
    if (!JCR.get(r, ip)) {
      const copy = JCR.clone(sn);
      delete copy.props.editable;
      copy.name = JCR.name(ip);
      JCR.put(r, JCR.parent(ip), copy);
    }
    flag('struct:unlock');
    flag('struct:unlock:' + info.pkey);
    toast('🔓 Unlocked: authors can now edit it on every page that uses this template.');
  }
  markModified(cx.tpl + '/structure/x');
  commit();
}

/* ---------- policies ---------- */

function styleEditorHtml(groups) {
  const styleRow = s => `<div class="sgs" data-sgs data-id="${esc(s.id || '')}"><input class="sgs-label" placeholder="Style name" value="${esc(s.label || '')}"><input class="sgs-classes" placeholder="CSS classes" value="${esc(s.classes || '')}"><button type="button" class="btn quiet small" data-sgs-del>✕</button></div>`;
  const groupBox = g => `<div class="sg" data-sg><div class="sg-head"><input class="sg-label" placeholder="Group name" value="${esc(g.label || '')}">
    <label class="check inline"><input type="checkbox" class="sg-multi" ${g.multiple ? 'checked' : ''}> Allow combination</label>
    <button type="button" class="btn quiet small" data-sg-del>✕ group</button></div>
    <div class="sg-styles">${(g.styles || []).map(styleRow).join('')}</div>
    <button type="button" class="btn quiet small" data-sgs-add>+ Add style</button></div>`;
  return { html: `<div class="sg-editor"><div class="sg-list">${groups.map(groupBox).join('')}</div><button type="button" class="btn small" data-sg-add>+ Add style group</button>
    <p class="hint">The class must exist in the site CSS (clientlib-site). Try <code>cmp-title--center</code>, <code>cmp-image--shadow</code> or <code>cmp-button--secondary</code>.</p></div>`, styleRow, groupBox };
}

function wireStyleEditor(b) {
  const { styleRow, groupBox } = styleEditorHtml([]);
  b.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-sg-add]')) b.querySelector('.sg-list').insertAdjacentHTML('beforeend', groupBox({ label: '', styles: [{}] }));
    else if (t.closest('[data-sgs-add]')) t.closest('[data-sg]').querySelector('.sg-styles').insertAdjacentHTML('beforeend', styleRow({}));
    else if (t.closest('[data-sgs-del]')) t.closest('[data-sgs]').remove();
    else if (t.closest('[data-sg-del]')) t.closest('[data-sg]').remove();
  });
}

function readStyleEditor(b) {
  return [...b.querySelectorAll('[data-sg]')].map(g => ({
    label: g.querySelector('.sg-label').value.trim(),
    multiple: g.querySelector('.sg-multi').checked,
    styles: [...g.querySelectorAll('[data-sgs]')].map(s => ({
      id: s.dataset.id || slug(s.querySelector('.sgs-label').value) + '-' + Math.random().toString(36).slice(2, 6),
      label: s.querySelector('.sgs-label').value.trim(),
      classes: s.querySelector('.sgs-classes').value.trim(),
    })).filter(s => s.label && s.classes),
  })).filter(g => g.label && g.styles.length);
}

function openPolicyDialog(cx, key, rt, overrideRef) {
  const r = AR();
  flag('policy:opened');
  const tpl = cx.tpl;
  const mapping = policyMapping(r, tpl, key);
  const mappedRef = mapping && mapping.props['cq:policy'];
  const ref = overrideRef !== undefined ? overrideRef : mappedRef || '__new';
  const pol = ref === '__new' ? null : policyByRef(r, ref);
  const folder = JCR.get(r, POLICY_ROOT + '/' + rt);
  const existing = folder ? folder.children.map(p => [rt + '/' + p.name, p.props['jcr:title'] || p.name]) : [];
  const core = resolveCore(r, rt);
  const isContainer = core === CORE.container;
  const usedBy = [];
  for (const t of templateList(r)) {
    JCR.walk(JCR.get(r, t.path + '/policies') || JCR.node('x'), '', n => { if (pol && n.props['cq:policy'] === ref) usedBy.push(t.c['jcr:title'] || t.name); });
  }

  let props = `${selectField('Policy', 'policyRef', ref, [...existing, ['__new', '+ New policy']], 'Policies are shared: every template/container mapped to the same policy gets the same settings.')}
    ${field('Policy Title', 'policyTitle', pol ? pol.props['jcr:title'] : `${componentTitle(r, rt)} policy`)}`;
  if (pol && usedBy.length) props += `<p class="hint">Used by: ${usedBy.map(esc).join(', ')}</p>`;
  if (isContainer) {
    const list = (pol && pol.props.components) || [];
    const groups = {};
    allComponents(r).forEach(c => (groups[c.group] = groups[c.group] || []).push(c));
    props += `<h5>Allowed Components</h5>${Object.entries(groups).map(([g, cs]) => `<div class="allowed-group"><b>${esc(g)}</b>
      ${cs.map(c => `<label class="check"><input type="checkbox" name="allowed" data-multi="1" value="${esc(c.rt)}" ${list.includes(c.rt) || list.includes('group:' + g) ? 'checked' : ''}> ${esc(c.title)}</label>`).join('')}</div>`).join('')}`;
  }
  if (core === CORE.title) {
    const at = (pol && pol.props.allowedTypes) || ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    props += `<h5>Sizes</h5><div class="row-checks">${['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map(h => `<label class="check inline"><input type="checkbox" name="types" data-multi="1" value="${h}" ${at.includes(h) ? 'checked' : ''}> ${h.toUpperCase()}</label>`).join('')}</div>
      ${selectField('Default size', 'defType', (pol && pol.props.type) || 'h2', ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map(h => [h, h.toUpperCase()]))}`;
  }
  const se = styleEditorHtml(styleGroups(pol));
  const tabs = [{ label: 'Properties', html: props }, { label: 'Styles', html: se.html }];
  if (isContainer) {
    const allowed = allowedComponents(r, tpl, key);
    tabs.push({ label: 'Child component policies', html: `<p class="hint">Policies for components placed <b>inside</b> this container (mapping key <code>${esc(key)}/&lt;resourceType&gt;</code>).</p>
      ${allowed.map(c => {
        const cp = getPolicy(r, tpl, key + '/' + c.rt);
        return `<div class="child-pol"><b>${esc(c.title)}</b> <span class="muted">${cp ? esc(cp.props['jcr:title'] || cp.name) : 'no policy'}</span>
          <button type="button" class="btn small" data-child-rt="${esc(c.rt)}">⚙ Configure</button></div>`;
      }).join('') || '<p class="muted">Allow some components first.</p>'}` });
  }

  const doSave = b => {
    const f = formData(b);
    let pnode;
    let newRef = f.policyRef;
    if (newRef === '__new') {
      const fold = JCR.ensure(r, POLICY_ROOT + '/' + rt);
      const name = JCR.unique(fold, 'policy_' + Date.now().toString(36));
      pnode = JCR.node(name, { 'jcr:primaryType': 'nt:unstructured', 'sling:resourceType': 'wcm/core/components/policy/policy' });
      fold.children.push(pnode);
      newRef = rt + '/' + name;
    } else pnode = policyByRef(r, newRef);
    pnode.props['jcr:title'] = f.policyTitle || 'Policy';
    if (isContainer) {
      pnode.props.components = f.allowed || [];
      if (pnode.props.components.includes('wknd/components/button')) flag('policy:button');
    }
    if (core === CORE.title) {
      const types = f.types && f.types.length ? f.types : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
      pnode.props.allowedTypes = types;
      pnode.props.type = types.includes(f.defType) ? f.defType : types[0];
      if (types.length < 6) flag('policy:titleSizes');
    }
    const before = JSON.stringify(styleGroups(pnode));
    const groups = readStyleEditor(b);
    pnode.children = pnode.children.filter(c => c.name !== 'cq:styleGroups');
    if (groups.length) stylesAt({ name: '', props: {}, children: [pnode] }, '/' + pnode.name, groups);
    if (JSON.stringify(styleGroups(pnode)) !== before) flag('policy:styles');
    const mp = JCR.ensure(r, `${tpl}/policies/jcr:content${key ? '/' + key : ''}`);
    mp.props['cq:policy'] = newRef;
    mp.props['sling:resourceType'] = 'wcm/core/components/policies/mapping';
    markModified(tpl + '/policies/x');
    flag('policy:saved');
    return true;
  };

  openModal({
    title: `Policy — ${esc(componentTitle(r, rt))} <small>${esc(key)}</small>`,
    wide: true,
    okLabel: 'Save',
    body: tabsHtml(tabs),
    onMount: b => {
      wireTabs(b);
      wireStyleEditor(b);
      b.querySelector('[name=policyRef]').addEventListener('change', e => {
        const v = e.target.value;
        setTimeout(() => openPolicyDialog(cx, key, rt, v), 0);
      });
      b.querySelectorAll('[data-child-rt]').forEach(btn => btn.addEventListener('click', () => {
        doSave(b);
        const childRt = btn.dataset.childRt;
        closeModal();
        save();
        setTimeout(() => openPolicyDialog(cx, key + '/' + childRt, childRt), 0);
      }));
    },
    ok: b => {
      doSave(b);
      toast('Policy saved. It applies to every page using this template right away (on Author).');
      commit();
    },
  });
}

function openPagePolicy(tpl) {
  const r = AR();
  const pol = getPolicy(r, tpl, '');
  const cur = (pol && pol.props.clientlibs) || [];
  const cats = [...cur, ...Object.keys(clientlibIndex(r)).filter(c => !cur.includes(c))];
  openModal({
    title: 'Page Policy — Client-side libraries',
    body: `<p>Categories loaded on every page that uses this template (in this order):</p>
      ${cats.map(c => `<label class="check"><input type="checkbox" name="cl" data-multi="1" value="${esc(c)}" ${cur.includes(c) ? 'checked' : ''}> <code>${esc(c)}</code></label>`).join('')}
      <p class="hint">A category is the <code>categories</code> property of a <code>cq:ClientLibraryFolder</code> node under /apps. Look at <code>/apps/wknd/clientlibs</code> in CRXDE.</p>`,
    ok: b => {
      const list = formData(b).cl || [];
      let p = pol;
      if (!p) {
        const fold = JCR.ensure(r, POLICY_ROOT + '/wknd/components/page');
        p = JCR.node(JCR.unique(fold, 'policy_page'), { 'sling:resourceType': 'wcm/core/components/policy/policy', 'jcr:title': 'Page policy' });
        fold.children.push(p);
        const mp = JCR.ensure(r, tpl + '/policies/jcr:content');
        mp.props['cq:policy'] = 'wknd/components/page/' + p.name;
      }
      p.props.clientlibs = list;
      markModified(tpl + '/policies/x');
      flag('pagepolicy:saved');
      if (list.includes('wknd.dark')) flag('clientlib:dark');
      if (!list.includes('wknd.site')) flag('clientlib:nosite');
      toast('Page policy saved.');
      commit();
    },
  });
}

/* ---------- editor menu actions ---------- */

A.edMode = d => {
  const E = S.ui.editor;
  if (d.mode === 'timewarp') return openTimewarp();
  E.mode = d.mode;
  E.sel = null;
  E.info = null;
  if (d.mode === 'preview') flag('editor:preview');
  if (d.mode !== 'preview' && d.mode !== 'edit') flag('editor:mode:' + d.mode);
  commit();
};
A.edEmu = () => {
  S.ui.editor.emu = !S.ui.editor.emu;
  if (!S.ui.editor.emu && S.ui.editor.mode !== 'layout') S.ui.editor.device = 'desktop';
  commit();
};
A.edDevice = d => {
  S.ui.editor.device = d.v;
  flag('editor:device:' + d.v);
  commit();
};
A.edPageProps = () => openPageProps(CURRENT_CX.path);
A.edStartWf = () => openStartWorkflow(CURRENT_CX.path);
A.edLock = () => {
  S.ui.sitesSel = CURRENT_CX.path;
  A.pageLock();
};
A.edPublish = () => openPublishDialog(CURRENT_CX.path);
A.edUnpublish = () => {
  S.ui.sitesSel = CURRENT_CX.path;
  A.pageUnpublish();
};
A.edEditTemplate = () => go('/editor.html' + CURRENT_CX.tpl + '/structure.html');
A.edRollout = () => openRollout(CURRENT_CX.path);
A.edViewPublished = () => go(CURRENT_CX.path + '.html?wcmmode=disabled');
A.edViewAdmin = () => goSites(CURRENT_CX.path);
A.edPagePolicy = () => openPagePolicy(CURRENT_CX.tpl);
A.edTplStatus = () => {
  const c = pcOf(AR(), CURRENT_CX.tpl);
  c.props.status = c.props.status === 'enabled' ? 'disabled' : 'enabled';
  c.props['cq:lastModified'] = now();
  if (c.props.status === 'enabled') flag('tpl:enabled');
  toast(`Template ${c.props.status}.`);
  commit();
};
A.edTplPublish = () => {
  queueReplication('Activate', [CURRENT_CX.tpl]);
  toast('Publishing template and policies…');
  commit();
};
A.edTplAdmin = () => {
  S.ui.tplSel = CURRENT_CX.tpl;
  go(TEMPLATES_URL);
};
