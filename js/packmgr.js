/* CRX Package Manager: create, filter, build, install/uninstall, download, upload, replicate content packages */

const PKG_URL = '/crx/packmgr/index.jsp';

function pkgState(k) {
  S.pkgs = S.pkgs || { author: [], publish: [] };
  S.pkgLog = S.pkgLog || { author: [], publish: [] };
  S.ui.pkg = S.ui.pkg || { author: { sel: null, group: null }, publish: { sel: null, group: null } };
  return { list: S.pkgs[k], log: S.pkgLog[k], ui: S.ui.pkg[k] };
}

function pkgFile(p) {
  return `/etc/packages/${p.group}/${p.name}${p.version ? '-' + p.version : ''}.zip`;
}

function pkgLog(k, line, cls) {
  const L = pkgState(k).log;
  L.push({ t: line, c: cls || '' });
  if (L.length > 600) L.splice(0, L.length - 600);
}

function pkgSize(p) {
  return p.content ? JSON.stringify(p.content).length : 0;
}

function fmtSize(n) {
  return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n / 1024) + ' KB' : n + ' B';
}

// Mirrors the package as a node under /etc/packages so it shows up in CRXDE
function pkgMirror(k, p) {
  const r = S.repos[k];
  const path = pkgFile(p);
  JCR.ensure(r, '/etc/packages/' + p.group, 'sling:Folder');
  const node = JCR.node(JCR.name(path), { 'jcr:primaryType': 'nt:file' }, [
    JCR.node('jcr:content', { 'jcr:primaryType': 'nt:resource', 'jcr:mimeType': 'application/zip', 'jcr:lastModified': p.modified || now(), 'jcr:data': `(content package, ${fmtSize(pkgSize(p))})` }, [
      JCR.node('vlt:definition', {
        'jcr:primaryType': 'vlt:PackageDefinition', name: p.name, group: p.group, version: p.version || '', description: p.desc || '',
        ...(p.built ? { lastWrapped: p.built } : {}), ...(p.installed ? { lastUnpacked: p.installed, lastUnpackedBy: 'admin' } : {}),
      }, [JCR.node('filter', { 'jcr:primaryType': 'nt:unstructured' }, p.filters.map((f, i) => JCR.node('f' + i, { 'jcr:primaryType': 'nt:unstructured', root: f.root, mode: f.mode || 'replace', rules: (f.rules || []).map(x => x.type + ':' + x.pattern) })))]),
    ]),
  ]);
  JCR.put(r, '/etc/packages/' + p.group, node);
}

function pkgUnmirror(k, p) {
  JCR.remove(S.repos[k], pkgFile(p));
}

function findPkg(k, id) {
  return pkgState(k).list.find(p => p.id === id);
}

/* ---------- filters & install ---------- */

function includedBy(f, path) {
  const root = f.root;
  if (!(path === root || path.startsWith(root === '/' ? '/' : root + '/'))) return false;
  const rules = f.rules || [];
  if (!rules.length) return true;
  let inc = rules[0].type === 'exclude';
  for (const r of rules) {
    try { if (new RegExp('^' + r.pattern + '$').test(path)) inc = r.type === 'include'; } catch (e) { /* bad pattern */ }
  }
  return inc;
}

function childPath(path, name) {
  return path === '/' ? '/' + name : path + '/' + name;
}

function hasIncludedBelow(f, pn, path) {
  return pn.children.some(c => includedBy(f, childPath(path, c.name)) || hasIncludedBelow(f, c, childPath(path, c.name)));
}

function ensureAncestors(repo, path, source) {
  let acc = '';
  for (const s of JCR.segs(path)) {
    acc += '/' + s;
    if (!JCR.get(repo, acc)) {
      const src = source && JCR.get(source, acc);
      JCR.put(repo, JCR.parent(acc), JCR.node(s, { 'jcr:primaryType': (src && JCR.type(src)) || 'nt:folder' }));
    }
  }
}

function applyFilter(repo, tree, f, log) {
  const mode = f.mode || 'replace';
  const pnode = JCR.get(tree, f.root);
  ensureAncestors(repo, JCR.parent(f.root), tree);
  if (!pnode) {
    if (mode === 'replace' && JCR.get(repo, f.root)) {
      JCR.remove(repo, f.root);
      log('D', f.root);
    }
    return;
  }
  const walk = (path, pn) => {
    const inc = includedBy(f, path);
    let rn = JCR.get(repo, path);
    if (!rn) {
      if (!inc && !hasIncludedBelow(f, pn, path)) return;
      rn = JCR.node(JCR.name(path), inc ? { ...pn.props } : { 'jcr:primaryType': pn.props['jcr:primaryType'] || 'nt:unstructured' });
      JCR.get(repo, JCR.parent(path)).children.push(rn);
      log('A', path);
    } else if (inc && mode !== 'merge') {
      const before = JSON.stringify(rn.props);
      rn.props = mode === 'replace' ? { ...pn.props } : { ...rn.props, ...pn.props };
      if (JSON.stringify(rn.props) !== before) log('U', path);
    }
    for (const c of pn.children) walk(childPath(path, c.name), c);
    if (inc && mode === 'replace') {
      const order = pn.children.map(c => c.name);
      rn.children = rn.children.filter(c => {
        const cp = childPath(path, c.name);
        if (order.includes(c.name) || !includedBy(f, cp)) return true;
        log('D', cp);
        return false;
      });
      rn.children.sort((a, b) => {
        const ia = order.indexOf(a.name);
        const ib = order.indexOf(b.name);
        return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
      });
    }
  };
  walk(f.root, pnode);
}

function pkgInstall(k, p, depth) {
  const repo = S.repos[k];
  if (!p.content) { pkgLog(k, `Package ${p.name} has no content. Build it first.`, 'err'); return false; }
  pkgLog(k, `Installing content of ${pkgFile(p)}`, 'head');
  p.snapshot = p.filters.map(f => ({ root: f.root, node: JCR.get(repo, f.root) ? JCR.clone(JCR.get(repo, f.root)) : null }));
  let count = 0;
  const lines = [];
  const log = (op, path) => { count++; if (lines.length < 300) lines.push(`${op} ${path}`); };
  for (const f of p.filters) {
    pkgLog(k, `Filter ${f.root} (mode: ${f.mode || 'replace'}${(f.rules || []).length ? ', ' + f.rules.length + ' rule(s)' : ''})`, 'muted');
    S.events[`pkg:mode:${f.mode || 'replace'}:${f.root}`] = Date.now();
    applyFilter(repo, p.content, f, log);
  }
  lines.forEach(l => pkgLog(k, l, l[0] === 'D' ? 'del' : l[0] === 'U' ? 'upd' : 'add'));
  if (count > lines.length) pkgLog(k, `… and ${count - lines.length} more`, 'muted');
  if (!count) pkgLog(k, 'Nothing changed (content already present — with mode "merge" existing nodes are never overwritten).', 'muted');
  p.installed = now();
  p.modified = now();
  pkgMirror(k, p);
  pkgLog(k, `Package installed in ${10 + count}ms. (${count} change(s))`, 'ok');
  // sub packages (e.g. the "all" package embeds ui.apps, ui.config, ui.content)
  for (const id of p.subs || []) {
    const sub = findPkg(k, id);
    if (sub && (depth || 0) < 3) {
      pkgLog(k, `Installing sub package ${sub.group}:${sub.name}`, 'muted');
      pkgInstall(k, sub, (depth || 0) + 1);
    }
  }
  if (JCR.find(p.content, '/', n => n.name.endsWith('.jar')).length) pkgLog(k, 'OSGi bundle(s) found in /install — real AEM would start them; the lab does not run Java.', 'muted');
  flag('pkg:installed');
  S.events['pkg:installed:' + p.name] = Date.now();
  return true;
}

function pkgUninstall(k, p) {
  const repo = S.repos[k];
  if (!p.snapshot) { toast('This package is not installed.', 'warn'); return; }
  // sub packages were installed after the parent, so undo them first (newest first)
  for (const id of (p.subs || []).slice().reverse()) {
    const sub = findPkg(k, id);
    if (sub && sub.snapshot) pkgUninstall(k, sub);
  }
  pkgLog(k, `Uninstalling content of ${pkgFile(p)}`, 'head');
  for (const s of p.snapshot) {
    if (s.node) {
      ensureAncestors(repo, JCR.parent(s.root));
      JCR.put(repo, JCR.parent(s.root), JCR.clone(s.node));
      pkgLog(k, `R ${s.root} (restored from snapshot)`, 'upd');
    } else if (JCR.remove(repo, s.root)) pkgLog(k, `D ${s.root}`, 'del');
  }
  p.snapshot = null;
  p.installed = null;
  pkgMirror(k, p);
  pkgLog(k, 'Package uninstalled.', 'ok');
  flag('pkg:uninstalled');
}

function pkgBuild(k, p) {
  const repo = S.repos[k];
  const tree = JCR.node('', { 'jcr:primaryType': 'rep:root' });
  pkgLog(k, `Building package ${pkgFile(p)}`, 'head');
  if (!p.filters.length) pkgLog(k, 'Warning: the package has no filters, so it will be empty.', 'err');
  let count = 0;
  for (const f of p.filters) {
    const node = JCR.get(repo, f.root);
    if (!node) { pkgLog(k, `Filter root not found: ${f.root}`, 'err'); continue; }
    ensureAncestors(tree, JCR.parent(f.root), repo);
    const copy = JCR.clone(node);
    // drop excluded nodes
    const prune = (n, path) => { n.children = n.children.filter(c => includedBy(f, childPath(path, c.name)) || hasIncludedBelow(f, c, childPath(path, c.name))); n.children.forEach(c => prune(c, childPath(path, c.name))); };
    prune(copy, f.root);
    JCR.put(tree, JCR.parent(f.root), copy);
    JCR.walk(copy, f.root, (n, path) => { count++; if (count <= 200) pkgLog(k, `A ${path}`, 'add'); });
  }
  if (count > 200) pkgLog(k, `… and ${count - 200} more`, 'muted');
  p.content = tree;
  p.built = now();
  p.modified = now();
  pkgMirror(k, p);
  pkgLog(k, `Package built (${count} node(s), ${fmtSize(pkgSize(p))}).`, 'ok');
  flag('pkg:built');
}

/* ---------- screen ---------- */

function packMgrScreen(k) {
  flag('visit:packmgr');
  const { list, log, ui } = pkgState(k);
  const groups = [...new Set(list.map(p => p.group))].sort();
  const shown = list.filter(p => !ui.group || p.group === ui.group);
  const row = p => {
    const sel = ui.sel === p.id;
    const status = p.installed ? `Installed ${fmtDate(p.installed)}` : p.built ? `Built ${fmtDate(p.built)}` : p.source === 'uploaded' ? 'Uploaded, not installed' : 'Not built';
    return `<div class="pm-pkg ${sel ? 'sel' : ''}">
      <div class="pm-row" data-act="pkgSel" data-k="${k}" data-id="${p.id}">
        <i class="ci t">${icon('Box', 16)}</i><b>${esc(p.name)}</b><span class="muted">${esc(p.version ? '-' + p.version : '')}.zip</span>
        <span class="pm-meta">${fmtSize(pkgSize(p))}</span><span class="pm-meta ${p.installed ? 'ok' : ''}">${status}</span>
      </div>
      ${sel ? `<div class="pm-detail">
        <div class="pm-actions">
          <button class="cbtn" data-act="pkgEdit" data-k="${k}" data-id="${p.id}">${icon('Edit', 14)} Edit</button>
          <button class="cbtn" data-act="pkgBuild" data-k="${k}" data-id="${p.id}">${icon('Gears', 14)} Build</button>
          <button class="cbtn" data-act="pkgInstall" data-k="${k}" data-id="${p.id}">${icon('Download', 14)} Install</button>
          <button class="cbtn" data-act="pkgDownload" data-k="${k}" data-id="${p.id}">${icon('UploadToCloud', 14)} Download</button>
          <span class="crx-sep"></span>
          ${k === 'author' ? `<button class="cbtn" data-act="pkgReplicate" data-id="${p.id}">${icon('Send', 14)} Replicate</button>` : ''}
          <button class="cbtn" data-act="pkgUninstallBtn" data-k="${k}" data-id="${p.id}">${icon('History', 14)} Uninstall</button>
          <button class="cbtn" data-act="pkgContents" data-k="${k}" data-id="${p.id}">${icon('ViewList', 14)} Contents</button>
          <button class="cbtn" data-act="pkgDelete" data-k="${k}" data-id="${p.id}">${icon('Delete', 14)} Delete</button>
        </div>
        <table class="pm-info">
          <tr><th>Path</th><td><code>${esc(pkgFile(p))}</code></td></tr>
          <tr><th>Group</th><td>${esc(p.group)}</td></tr>
          <tr><th>Description</th><td>${esc(p.desc || '—')}</td></tr>
          <tr><th>Filters</th><td>${p.filters.length ? p.filters.map(f => `<div><code>${esc(f.root)}</code> <span class="muted">mode: ${esc(f.mode || 'replace')}${(f.rules || []).map(x => ` · ${x.type} ${esc(x.pattern)}`).join('')}</span></div>`).join('') : '<span class="muted">No filters — click Edit → Filters</span>'}</td></tr>
          <tr><th>Last built</th><td>${p.built ? fmtDate(p.built) : '—'}</td></tr>
          <tr><th>Last installed</th><td>${p.installed ? fmtDate(p.installed) : '—'}</td></tr>
          ${(p.subs || []).length ? `<tr><th>Sub packages</th><td>${p.subs.map(id => { const s = findPkg(k, id); return s ? `<div>${esc(s.group)}:${esc(s.name)}</div>` : ''; }).join('')}</td></tr>` : ''}
        </table></div>` : ''}
    </div>`;
  };
  return `<div class="crx pm">
    <div class="crx-top"><span class="crx-logo">CRX Package Manager</span><span class="crx-ws">${esc(k)} · localhost:${portOf(k)}</span><span class="spacer"></span><span class="crx-user">admin</span></div>
    <div class="crx-bar">
      <button class="cbtn" data-act="pkgCreate" data-k="${k}">${icon('Add', 14)} Create Package</button>
      <button class="cbtn" data-act="pkgUpload" data-k="${k}">${icon('UploadToCloud', 14)} Upload Package</button>
      <span class="crx-sep"></span>
      <button class="cbtn" data-act="pkgClearLog" data-k="${k}">${icon('Erase', 14)} Clear log</button>
      <span class="spacer"></span><span class="muted">${list.length} package(s)</span></div>
    <div class="crx-main">
      <div class="pm-groups">
        <a href="#" class="${!ui.group ? 'on' : ''}" data-act="pkgGroup" data-k="${k}" data-g="">${icon('Folder', 14)} All Packages <span>${list.length}</span></a>
        ${groups.map(g => `<a href="#" class="${ui.group === g ? 'on' : ''}" data-act="pkgGroup" data-k="${k}" data-g="${esc(g)}">${icon('Folder', 14)} ${esc(g)} <span>${list.filter(p => p.group === g).length}</span></a>`).join('')}
      </div>
      <div class="pm-right">
        <div class="pm-list">${shown.map(row).join('') || `<div class="pm-empty">No packages yet. Click <b>Create Package</b>, or <b>Upload Package</b> to add a .zip (for example <code>wknd.all-1.0.0-SNAPSHOT.zip</code> from your WKND build).</div>`}</div>
        <div class="pm-log"><div class="pm-log-head">Activity Log</div><div class="pm-log-body">${log.slice(-250).map(l => `<div class="${l.c}">${esc(l.t)}</div>`).join('')}</div></div>
      </div>
    </div>
  </div>`;
}

/* ---------- actions ---------- */

A.pkgSel = d => {
  const { ui } = pkgState(d.k);
  ui.sel = ui.sel === d.id ? null : d.id;
  commit();
};

A.pkgGroup = d => {
  pkgState(d.k).ui.group = d.g || null;
  commit();
};

A.pkgClearLog = d => {
  S.pkgLog[d.k] = [];
  commit();
};

A.pkgCreate = d => openModal({
  title: 'New Package',
  okLabel: 'OK',
  body: `${field('Package Name *', 'name', '')}${field('Version', 'version', '1.0', 'Optional')}${field('Group', 'group', 'my_packages')}`,
  ok: b => {
    const f = formData(b);
    const name = f.name.trim().replace(/\s+/g, '-');
    const group = (f.group || 'my_packages').trim();
    if (!name) { toast('Package name is required.', 'error'); return false; }
    const { list, ui } = pkgState(d.k);
    if (list.some(p => p.name === name && p.group === group && p.version === f.version.trim())) { toast('A package with this name, group and version exists.', 'error'); return false; }
    const p = { id: uid(), name, group, version: f.version.trim(), desc: '', filters: [], content: null, built: null, installed: null, snapshot: null, source: 'created', subs: [], created: now(), modified: now() };
    list.push(p);
    ui.sel = p.id;
    pkgMirror(d.k, p);
    pkgLog(d.k, `Package created: ${pkgFile(p)}`, 'ok');
    flag('pkg:created');
    commit();
  },
});

A.pkgEdit = d => {
  const p = findPkg(d.k, d.id);
  const row = f => `<div class="pf-row"><input class="pf-root" value="${esc(f.root || '')}" placeholder="/content/wknd/us/en/about">
    <select class="pf-mode">${['replace', 'merge', 'update'].map(m => `<option ${m === (f.mode || 'replace') ? 'selected' : ''}>${m}</option>`).join('')}</select>
    <input class="pf-rules" value="${esc((f.rules || []).map(r => r.type + ':' + r.pattern).join(' '))}" placeholder="rules, e.g. exclude:/content/x/.*">
    <button type="button" class="btn quiet small" data-pf-del>✕</button></div>`;
  openModal({
    title: `Edit Package <small>${esc(p.name)}</small>`,
    wide: true,
    okLabel: 'Save',
    body: tabsHtml([
      { label: 'General', html: `${field('Package Name', 'name', p.name)}${field('Group', 'group', p.group)}${field('Version', 'version', p.version)}
        <label class="field"><span>Description</span><textarea name="desc">${esc(p.desc || '')}</textarea></label>` },
      { label: 'Filters', html: `<p class="hint">Each filter is a <b>root path</b> in the JCR. <b>replace</b>: the package content replaces what is there (extra nodes are removed). <b>merge</b>: only adds missing nodes, never overwrites. <b>update</b>: adds and overwrites, never removes.</p>
        <div class="pf-list">${(p.filters.length ? p.filters : [{ root: '', mode: 'replace' }]).map(row).join('')}</div>
        <button type="button" class="btn small" data-pf-add>+ Add filter</button>` },
    ]),
    onMount: b => {
      wireTabs(b);
      b.addEventListener('click', e => {
        if (e.target.closest('[data-pf-add]')) b.querySelector('.pf-list').insertAdjacentHTML('beforeend', row({ root: '', mode: 'replace' }));
        if (e.target.closest('[data-pf-del]')) e.target.closest('.pf-row').remove();
      });
    },
    ok: b => {
      const f = formData(b);
      const filters = [...b.querySelectorAll('.pf-row')].map(r => ({
        root: r.querySelector('.pf-root').value.trim().replace(/\/+$/, '') || '',
        mode: r.querySelector('.pf-mode').value,
        rules: r.querySelector('.pf-rules').value.trim().split(/\s+/).filter(Boolean).map(x => { const i = x.indexOf(':'); return { type: x.slice(0, i) === 'include' ? 'include' : 'exclude', pattern: x.slice(i + 1) }; }).filter(x => x.pattern),
      })).filter(x => x.root.startsWith('/'));
      pkgUnmirror(d.k, p);
      Object.assign(p, { name: f.name.trim() || p.name, group: f.group.trim() || p.group, version: f.version.trim(), desc: f.desc, filters, modified: now() });
      if (p.source === 'created') { p.content = null; p.built = null; }
      pkgMirror(d.k, p);
      if (filters.length) flag('pkg:filter');
      pkgLog(d.k, `Package ${p.name} saved (${filters.length} filter(s)).${p.source === 'created' ? ' Rebuild it to capture the content.' : ''}`);
      commit();
    },
  });
};

A.pkgBuild = d => {
  const p = findPkg(d.k, d.id);
  confirmBox('Build', `Build <b>${esc(p.name)}</b>? This captures the current content of its filters from the <b>${d.k}</b> repository.`, () => {
    pkgBuild(d.k, p);
    commit();
  }, 'Build');
};

A.pkgInstall = d => {
  const p = findPkg(d.k, d.id);
  if (!p.content) { toast('Build the package first (or upload one).', 'warn'); return; }
  confirmBox('Install Package', `Install <b>${esc(p.name)}</b> on <b>${d.k}</b>?<br><br>Filters: ${p.filters.map(f => `<code>${esc(f.root)}</code> (${f.mode || 'replace'})`).join(', ')}${(p.subs || []).length ? `<br>Sub packages: ${p.subs.length}` : ''}`, () => {
    pkgInstall(d.k, p);
    commit();
    toast('Package installed. See the Activity Log.');
  }, 'Install');
};

A.pkgUninstallBtn = d => {
  const p = findPkg(d.k, d.id);
  confirmBox('Uninstall Package', `Uninstall <b>${esc(p.name)}</b>? The content is restored to how it was before the last install.`, () => {
    pkgUninstall(d.k, p);
    commit();
  }, 'Uninstall');
};

A.pkgDelete = d => {
  const p = findPkg(d.k, d.id);
  confirmBox('Delete Package', `Delete <b>${esc(p.name)}</b> from Package Manager? (Installed content stays in the repository.)`, () => {
    const st = pkgState(d.k);
    S.pkgs[d.k] = st.list.filter(x => x.id !== p.id);
    pkgUnmirror(d.k, p);
    pkgLog(d.k, `Package deleted: ${pkgFile(p)}`);
    commit();
  }, 'Delete');
};

A.pkgContents = d => {
  const p = findPkg(d.k, d.id);
  if (!p.content) { toast('The package has no content yet. Build it first.', 'warn'); return; }
  const rows = [];
  for (const f of p.filters) {
    const n = JCR.get(p.content, f.root);
    if (n) JCR.walk(n, f.root, (x, path) => { if (rows.length < 500) rows.push(`<div><span class="muted">${esc(JCR.type(x) || '')}</span> ${esc(path)}</div>`); });
  }
  openModal({ title: `Contents <small>${esc(p.name)}</small>`, hideOk: true, cancelLabel: 'Close', wide: true, body: `<div class="pm-contents">${rows.join('')}</div>` });
};

A.pkgDownload = d => {
  const p = findPkg(d.k, d.id);
  if (!p.content) { toast('Build the package first.', 'warn'); return; }
  const blob = ZIP.write(VAULT.toFiles(p));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = JCR.name(pkgFile(p));
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  pkgLog(d.k, `Downloaded ${a.download} (${fmtSize(blob.size)})`);
  flag('pkg:downloaded');
  commit();
};

A.pkgReplicate = d => {
  const p = findPkg('author', d.id);
  if (!p.content) { toast('Build the package first.', 'warn'); return; }
  const ap = (agentNode('author') || { props: {} }).props;
  const pub = inst('publish');
  if (!agentEnabled('author') || !pub.running || pub.port !== transportPort(ap.transportUri)) {
    pkgLog('author', `Replication of ${p.name} failed: the Default Agent is disabled or Publish is not reachable.`, 'err');
    toast('Replication failed — check the replication agent and the Publish instance.', 'error');
    commit();
    return;
  }
  const list = pkgState('publish').list;
  const copy = JCR.clone({ name: '', props: {}, children: [] });
  Object.assign(copy, JSON.parse(JSON.stringify(p)), { snapshot: null, installed: null });
  copy.subs = [];
  for (const id of p.subs || []) {
    const s = findPkg('author', id);
    if (!s) continue;
    const sc = JSON.parse(JSON.stringify(s));
    sc.snapshot = null;
    sc.installed = null;
    S.pkgs.publish = S.pkgs.publish.filter(x => !(x.name === sc.name && x.group === sc.group));
    S.pkgs.publish.push(sc);
    copy.subs.push(sc.id);
  }
  S.pkgs.publish = S.pkgs.publish.filter(x => !(x.name === copy.name && x.group === copy.group && x.version === copy.version));
  S.pkgs.publish.push(copy);
  pkgLog('author', `Replicating package ${pkgFile(p)} to ${ap.transportUri} … OK`, 'ok');
  pkgInstall('publish', copy);
  flag('pkg:replicated');
  toast('Package replicated and installed on Publish.');
  commit();
};

function registerParsed(k, parsed, fileName) {
  const { list } = pkgState(k);
  const name = parsed.props.name || fileName.replace(/\.zip$/i, '');
  const group = parsed.props.group || 'my_packages';
  const version = parsed.props.version || '';
  const subs = (parsed.subs || []).map(s => registerParsed(k, s, (s.props.name || 'sub') + '.zip'));
  const old = list.find(p => p.name === name && p.group === group && p.version === version);
  if (old) {
    S.pkgs[k] = list.filter(p => p !== old);
    pkgUnmirror(k, old);
  }
  const p = {
    id: uid(), name, group, version, desc: parsed.props.description || parsed.props.comment || '', filters: parsed.filters,
    content: parsed.tree, built: now(), installed: null, snapshot: null, source: 'uploaded', subs, created: now(), modified: now(),
  };
  S.pkgs[k].push(p);
  pkgMirror(k, p);
  pkgLog(k, `Uploaded ${group}:${name}${version ? ' ' + version : ''} — ${parsed.stats.files} file(s), ${parsed.filters.length} filter(s)${parsed.stats.skipped ? `, ${parsed.stats.skipped} large/thumbnail file(s) skipped` : ''}`, 'ok');
  return p.id;
}

A.pkgUpload = d => openModal({
  title: 'Upload Package',
  okLabel: 'OK',
  body: `<label class="field"><span>Package (.zip)</span><input type="file" name="file" accept=".zip,application/zip"></label>
    <label class="check"><input type="checkbox" name="install"> Install package after upload</label>
    <p class="hint">Try your real Maven build (after <code>mvn clean install</code>): <code>&lt;project&gt;\\all\\target\\&lt;name&gt;.all-&lt;version&gt;.zip</code> contains ui.apps, ui.config and ui.content as sub packages, or upload one module, e.g. <code>&lt;project&gt;\\ui.content\\target\\&lt;name&gt;.ui.content-&lt;version&gt;.zip</code>.<br>Max 3 MB — everything is kept in your browser.</p>
    <div class="pm-sample"><b>No project build?</b> Use the sample <code>${SAMPLE_PKG}</code>: the lab builds it from its own WKND project, with the same sub packages.
      <div><button type="button" class="btn small primary" data-act="pkgSample" data-k="${d.k}">Upload the sample</button>
      <button type="button" class="btn small quiet" data-act="pkgSampleDownload">Download it</button></div></div>`,
  ok: b => {
    const file = b.querySelector('input[type=file]').files[0];
    const install = b.querySelector('[name=install]').checked;
    if (!file) { toast('Choose a .zip file, or upload the sample.', 'error'); return false; }
    if (file.size > 3 * 1024 * 1024) { toast('That package is larger than 3 MB.', 'error'); return false; }
    closeModal();
    uploadPackage(d.k, file.arrayBuffer(), file.name, install);
    return false;
  },
});

function uploadPackage(k, bufPromise, fileName, install) {
  toast('Reading package…');
  Promise.resolve(bufPromise)
    .then(buf => ZIP.read(buf))
    .then(entries => VAULT.parse(entries))
    .then(parsed => {
      const id = registerParsed(k, parsed, fileName);
      const p = findPkg(k, id);
      pkgState(k).ui.sel = id;
      flag('pkg:uploaded');
      if (install) pkgInstall(k, p);
      commit();
      toast(`Package <b>${esc(p.name)}</b> uploaded${install ? ' and installed' : ''}.`);
    })
    .catch(err => {
      pkgLog(k, `Upload failed: ${err.message}`, 'err');
      toast('Upload failed: ' + esc(err.message), 'error');
      commit();
    });
}

/* ---------- sample project package (what `mvn clean install` puts in all/target) ---------- */

const SAMPLE_GROUP = 'com.adobe.aem.guides';
const SAMPLE_VERSION = '1.0.0-SNAPSHOT';
const SAMPLE_PKG = `wknd.all-${SAMPLE_VERSION}.zip`;

// Built from a fresh seed, like the code in Git: author changes made in the lab are not in it.
// ui.content holds only the site skeleton, so switching its /content/wknd filter to replace removes the other pages.
async function samplePackageZip() {
  const src = seedAuthor();
  const site = JCR.get(src, SITE_ROOT);
  site.children = site.children.filter(c => c.name === 'jcr:content');
  const pkg = async (name, filters) => {
    const content = JCR.node('', { 'jcr:primaryType': 'rep:root' });
    for (const f of filters) {
      const n = JCR.get(src, f.root);
      if (!n) continue;
      ensureAncestors(content, JCR.parent(f.root), src);
      JCR.put(content, JCR.parent(f.root), JCR.clone(n));
    }
    const p = { name, group: SAMPLE_GROUP, version: SAMPLE_VERSION, desc: `${name} module of the WKND project`, filters, content, created: now() };
    return new Uint8Array(await ZIP.write(VAULT.toFiles(p)).arrayBuffer());
  };
  const subs = [
    ['wknd.ui.apps', [{ root: '/apps/wknd/components', mode: 'replace' }, { root: '/apps/wknd/clientlibs', mode: 'replace' }]],
    ['wknd.ui.config', [{ root: '/apps/wknd/osgiconfig', mode: 'replace' }]],
    ['wknd.ui.content', [{ root: '/conf/wknd', mode: 'merge' }, { root: '/content/wknd', mode: 'merge' }, { root: '/content/dam/wknd', mode: 'merge' }]],
  ];
  const all = { name: 'wknd.all', group: SAMPLE_GROUP, version: SAMPLE_VERSION, desc: 'WKND all-in-one package: embeds the module packages', filters: [{ root: '/apps/wknd-packages', mode: 'replace' }], content: JCR.node('', {}), created: now() };
  const files = VAULT.toFiles(all);
  for (const [name, filters] of subs) {
    files.push({ name: `jcr_root/apps/wknd-packages/application/install/${name}-${SAMPLE_VERSION}.zip`, data: await pkg(name, filters) });
  }
  return ZIP.write(files);
}

A.pkgSample = d => {
  const install = !!document.querySelector('.modal [name=install]:checked');
  closeModal();
  uploadPackage(d.k, samplePackageZip().then(b => b.arrayBuffer()), SAMPLE_PKG, install);
};

A.pkgSampleDownload = () => {
  samplePackageZip().then(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = SAMPLE_PKG;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });
};
