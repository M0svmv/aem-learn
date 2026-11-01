/* Content Fragment Models, Content Fragments, a small GraphQL engine and persisted queries */

const CF_TYPES = [
  ['text-single', 'Single line text', 'Text'],
  ['text-multi', 'Multi line text', 'TextParagraph'],
  ['number', 'Number', 'GraphBarHorizontal'],
  ['boolean', 'Boolean', 'CheckmarkCircle'],
  ['date', 'Date and time', 'Calendar'],
  ['enumeration', 'Enumeration', 'ViewList'],
  ['tags', 'Tags', 'ViewAllTags'],
  ['reference', 'Content Reference', 'Image'],
  ['fragment-reference', 'Fragment Reference', 'DocumentFragment'],
  ['json', 'JSON Object', 'Code'],
  ['tab', 'Tab Placeholder', 'Rail'],
];
const cfTypeLabel = t => (CF_TYPES.find(x => x[0] === t) || [, t])[1];

/* ---------- model helpers ---------- */

// Every configuration (/conf/<site>) has its own models folder
const CFM_CONFS = [
  { conf: 'wknd', title: 'WKND Sites Project', root: '/conf/wknd/settings/dam/cfm/models', dam: '/content/dam/wknd' },
  { conf: 'mysite', title: 'My Site', root: '/conf/mysite/settings/dam/cfm/models', dam: '/content/dam/mysite' },
];
const confOfModel = p => CFM_CONFS.find(c => p.startsWith(c.root + '/')) || CFM_CONFS[0];
// The configuration a DAM folder uses (the folder's Cloud Configuration in real AEM)
const confOfDam = p => CFM_CONFS.find(c => p === c.dam || p.startsWith(c.dam + '/')) || CFM_CONFS[0];

function cfModels(r, conf) {
  const out = [];
  for (const c of CFM_CONFS) {
    if (conf && c.conf !== conf) continue;
    const base = JCR.get(r, c.root);
    for (const n of base ? base.children : []) {
      if (JCR.type(n) !== 'cq:Template') continue;
      const jc = JCR.get(n, 'jcr:content');
      out.push({ path: c.root + '/' + n.name, name: n.name, conf: c.conf, title: (jc && jc.props['jcr:title']) || n.name, status: (jc && jc.props.status) || 'enabled', desc: (jc && jc.props['jcr:description']) || '' });
    }
  }
  return out;
}

function cfFieldsNode(r, modelPath) {
  return JCR.ensure(r, modelPath + '/jcr:content/model/cq:dialog/content/items');
}

function cfFields(r, modelPath) {
  const n = JCR.get(r, modelPath + '/jcr:content/model/cq:dialog/content/items');
  return n ? n.children.map(c => ({ id: c.name, ...c.props })) : [];
}

function isCF(r, path) {
  const c = JCR.get(r, path + '/jcr:content');
  return !!c && (c.props.contentFragment === true || c.props.contentFragment === 'true');
}

function cfModelOf(r, path) {
  const d = JCR.get(r, path + '/jcr:content/data');
  return d ? d.props['cq:model'] : null;
}

function allCFs(r, modelPath) {
  return JCR.find(r, '/content/dam', (n, p) => JCR.type(n) === 'dam:Asset' && isCF(r, p) && (!modelPath || cfModelOf(r, p) === modelPath)).map(x => x.path);
}

const camel = s => String(s).replace(/[-_\s]+(.)/g, (m, c) => c.toUpperCase()).replace(/^./, c => c.toLowerCase());
const pascal = s => camel(s).replace(/^./, c => c.toUpperCase());

/* ---------- Content Fragment Models console ---------- */

function cfmScreen() {
  const r = AR();
  flag('visit:cfm');
  const models = cfModels(r);
  const sel = models.find(m => m.path === S.ui.cfmSel);
  const used = m => allCFs(r, m.path).length;
  const bar = sel
    ? selectionBar(`${qa('cfmOpen', 'Edit', 'Edit', 'e')}
        ${sel.status === 'enabled' ? qa('cfmStatus', 'RemoveCircle', 'Disable', '', 'data-s="disabled"') : qa('cfmStatus', 'CheckmarkCircle', 'Enable', '', 'data-s="enabled"')}
        ${qa('cfmPublish', 'PublishCheck', 'Publish')}${qa('cfmDelete', 'Delete', 'Delete', 'backspace')}`, 'cfmUncheck')
    : titleBar('', '<span class="tb-crumb">Content Fragment Models</span>', '<button class="btn primary" data-act="cfmCreate">Create</button>');
  const card = m => `<div class="acard ${sel && sel.path === m.path ? 'sel' : ''}" data-act="cfmSel" data-path="${esc(m.path)}" data-dbl="cfmOpenPath" title="${esc(m.path)}">
      <div class="athumb tpl-thumb">${icon('Table', 48)}<i class="ci-check">${icon('Checkmark', 12)}</i></div>
      <div class="acard-info"><b>${esc(m.title)}</b><small><span class="status-dot ${m.status === 'enabled' ? 'green' : ''}"></span>${m.status === 'enabled' ? 'Enabled' : 'Disabled'} · ${cfFields(r, m.path).length} field(s) · ${used(m)} fragment(s)</small>
      <small>${JCR.get(PR(), m.path) ? 'Published' : 'Not published'}</small></div></div>`;
  return shell('Content Fragment Models', `${bar}
    ${CFM_CONFS.map(c => `<div class="cfm-conf"><h3>${icon('Folder', 18)} ${esc(c.title)} <code>${esc(c.root)}</code></h3>
      <div class="agrid">${models.filter(m => m.conf === c.conf).map(card).join('') || '<p class="muted">No models.</p>'}</div></div>`).join('')}
    <p class="hint pad">Models live in <code>/conf/&lt;site&gt;/settings/dam/cfm/models</code>. Each model becomes a GraphQL type — try the <a href="#" data-act="go" data-url="${GRAPHIQL_URL}">GraphQL Query Editor</a>.</p>`);
}

A.cfmSel = d => {
  S.ui.cfmSel = S.ui.cfmSel === d.path ? null : d.path;
  commit();
};
A.cfmUncheck = () => {
  S.ui.cfmSel = null;
  commit();
};
const CFM_EDITOR = '/mnt/overlay/dam/cfm/models/editor/content/editor.html';
A.cfmOpen = () => go(CFM_EDITOR + S.ui.cfmSel);
A.cfmOpenPath = d => go(CFM_EDITOR + d.path);
A.cfmStatus = d => {
  pcOf(AR(), S.ui.cfmSel).props.status = d.s;
  commit();
};
A.cfmPublish = () => {
  queueReplication('Activate', [S.ui.cfmSel]);
  toast('Model publishing…');
  commit();
};
A.cfmDelete = () => {
  const p = S.ui.cfmSel;
  const n = allCFs(AR(), p).length;
  if (n) { toast(`${n} content fragment(s) use this model — delete them first.`, 'error'); return; }
  confirmBox('Delete Model', `Delete <code>${esc(p)}</code>?`, () => {
    JCR.remove(AR(), p);
    S.ui.cfmSel = null;
    commit();
  }, 'Delete');
};

A.cfmCreate = () => openModal({
  title: 'Create Model',
  okLabel: 'Create',
  body: `${selectField('Configuration', 'conf', 'wknd', CFM_CONFS.map(c => [c.conf, c.title]))}${field('Model Title *', 'title', '')}<label class="field"><span>Description</span><textarea name="desc"></textarea></label>`,
  ok: b => {
    const f = formData(b);
    if (!f.title.trim()) { toast('Title is required.', 'error'); return false; }
    const r = AR();
    const root = (CFM_CONFS.find(c => c.conf === f.conf) || CFM_CONFS[0]).root;
    const base = JCR.ensure(r, root, 'sling:Folder');
    const name = JCR.unique(base, slug(f.title));
    const path = root + '/' + name;
    base.children.push(JCR.node(name, { 'jcr:primaryType': 'cq:Template' }, [
      JCR.node('jcr:content', { 'jcr:title': f.title.trim(), 'jcr:description': f.desc || '', status: 'enabled', 'sling:resourceType': 'dam/cfm/models/console/components/data/entity/default', 'cq:lastModified': now() }),
    ]));
    cfFieldsNode(r, path);
    flag('cfm:created');
    go(CFM_EDITOR + path);
  },
});

/* ---------- model editor ---------- */

function cfmEditor(modelPath) {
  const r = AR();
  const c = pcOf(r, modelPath);
  if (!c) return notFoundShell(modelPath);
  const fields = cfFields(r, modelPath);
  if (modelPath.startsWith('/conf/mysite/')) flag('cfm:open:mysite');
  return shell('Content Fragment Model Editor', `${titleBar(`<button class="iconbtn" data-act="go" data-url="${CFM_URL}" title="Back to models">${icon('ChevronLeft')}</button>`,
      `<span class="tb-crumb">${esc(c.props['jcr:title'])}</span><span class="muted small">${esc(modelPath)}</span>`,
      `<button class="btn primary" data-act="go" data-url="${CFM_URL}">Done</button>`)}
    <div class="cfm-ed">
      <div class="cfm-form">
        ${fields.map((f, i) => `<div class="cfm-field ${f.metaType === 'tab' ? 'cfm-tab' : ''}">
          <span class="cfm-ico">${icon((CF_TYPES.find(t => t[0] === f.metaType) || [, , 'Text'])[2])}</span>
          <div class="cfm-f-txt"><b>${esc(f.fieldLabel || f.name)}${f.required ? ' *' : ''}</b><small>${f.metaType === 'tab' ? 'Tab Placeholder · starts a tab in the fragment editor' : `${esc(cfTypeLabel(f.metaType))}${f.multiple ? ' (multiple)' : ''} · property name <code>${esc(f.name)}</code>`}${f.options ? ' · ' + esc([].concat(f.options).join(', ')) : ''}</small></div>
          <button class="iconbtn" data-act="cfmFieldEdit" data-m="${esc(modelPath)}" data-id="${esc(f.id)}" title="Properties">${icon('Edit')}</button>
          <button class="iconbtn" data-act="cfmFieldMove" data-m="${esc(modelPath)}" data-i="${i}" data-dir="-1" title="Up">${icon('ArrowUp')}</button>
          <button class="iconbtn" data-act="cfmFieldMove" data-m="${esc(modelPath)}" data-i="${i}" data-dir="1" title="Down">${icon('ArrowDown')}</button>
          <button class="iconbtn" data-act="cfmFieldDel" data-m="${esc(modelPath)}" data-id="${esc(f.id)}" title="Delete">${icon('Delete')}</button></div>`).join('') || '<div class="cfm-empty">Add data types from the panel on the right.</div>'}
      </div>
      <div class="cfm-side"><div class="cfm-side-h">Data Types</div>
        ${CF_TYPES.map(([t, l, ic]) => `<a href="#" class="cfm-type" data-act="cfmFieldAdd" data-m="${esc(modelPath)}" data-t="${t}">${icon(ic)}${l}</a>`).join('')}
        <p class="hint">Click a type to add a field. Each field becomes a property on the fragment and a field in GraphQL. A <b>Tab Placeholder</b> groups the fields after it into a tab.</p></div>
    </div>`);
}

function cfmFieldDialog(modelPath, f, isNew) {
  const r = AR();
  const models = cfModels(r);
  openModal({
    title: `${isNew ? 'Add' : 'Edit'} field <small>${esc(cfTypeLabel(f.metaType))}</small>`,
    body: f.metaType === 'tab' ? `${field('Tab Label', 'fieldLabel', f.fieldLabel || '')}<p class="hint">Every field after this placeholder (until the next one) shows in this tab of the fragment editor.</p>`
      : `${field('Field Label', 'fieldLabel', f.fieldLabel || '')}${field('Property Name', 'name', f.name || '', 'Used in the JCR and in GraphQL (letters and digits only)')}
      <label class="check"><input type="checkbox" name="required" ${f.required ? 'checked' : ''}> Required</label>
      ${['text-single', 'fragment-reference', 'reference'].includes(f.metaType) ? `<label class="check"><input type="checkbox" name="multiple" ${f.multiple ? 'checked' : ''}> Render as multiple field</label>` : ''}
      ${f.metaType === 'enumeration' ? field('Options', 'options', [].concat(f.options || []).join(', '), 'Comma separated') : ''}
      ${f.metaType === 'fragment-reference' ? selectField('Allowed model', 'fragmentModel', f.fragmentModel || '', [['', 'Any model'], ...models.map(m => [m.path, `${m.title} (${m.conf})`])]) : ''}
      ${f.metaType === 'fragment-reference' || f.metaType === 'text-single' ? field('Placeholder', 'emptyText', f.emptyText || '') : ''}`,
    onMount: b => {
      const l = b.querySelector('[name=fieldLabel]');
      const n = b.querySelector('[name=name]');
      if (!n) return;
      l.addEventListener('input', () => { if (!n.dataset.touched && isNew) n.value = camel(slug(l.value)); });
      n.addEventListener('input', () => { n.dataset.touched = '1'; });
    },
    ok: b => {
      const v = formData(b);
      const items = cfFieldsNode(r, modelPath);
      if (f.metaType === 'tab') {
        if (!String(v.fieldLabel || '').trim()) { toast('Give the tab a label.', 'error'); return false; }
        const props = { metaType: 'tab', name: f.name || JCR.unique(items, 'tab'), fieldLabel: v.fieldLabel.trim() };
        if (isNew) items.children.push(JCR.node(JCR.unique(items, 'f'), props));
        else JCR.get(items, f.id).props = props;
        pcOf(r, modelPath).props['cq:lastModified'] = now();
        flag('cfm:field');
        commit();
        return;
      }
      const name = String(v.name || camel(slug(v.fieldLabel))).replace(/[^A-Za-z0-9_]/g, '');
      if (!name || /^\d/.test(name)) { toast('Property name must start with a letter.', 'error'); return false; }
      if (items.children.some(c => c.props.name === name && c.name !== f.id)) { toast('Another field uses that property name.', 'error'); return false; }
      const props = { metaType: f.metaType, name, fieldLabel: v.fieldLabel || name, valueType: f.metaType === 'number' ? 'long' : f.metaType === 'boolean' ? 'boolean' : 'string' };
      if (v.required) props.required = true;
      if (f.metaType === 'enumeration') props.options = String(v.options || '').split(',').map(s => s.trim()).filter(Boolean);
      if (f.metaType === 'fragment-reference' && v.fragmentModel) props.fragmentModel = v.fragmentModel;
      if (v.multiple) props.multiple = true;
      if (v.emptyText) props.emptyText = v.emptyText;
      if (f.metaType === 'reference') props.rootPath = '/content/dam';
      if (isNew) items.children.push(JCR.node(JCR.unique(items, 'f'), props));
      else JCR.get(items, f.id).props = { ...props };
      pcOf(r, modelPath).props['cq:lastModified'] = now();
      flag('cfm:field');
      commit();
    },
  });
}

A.cfmFieldAdd = d => cfmFieldDialog(d.m, { metaType: d.t }, true);
A.cfmFieldEdit = d => cfmFieldDialog(d.m, cfFields(AR(), d.m).find(f => f.id === d.id), false);
A.cfmFieldDel = d => {
  JCR.remove(AR(), `${d.m}/jcr:content/model/cq:dialog/content/items/${d.id}`);
  commit();
};
A.cfmFieldMove = d => {
  const items = cfFieldsNode(AR(), d.m);
  const i = +d.i;
  const j = i + +d.dir;
  if (j < 0 || j >= items.children.length) return;
  [items.children[i], items.children[j]] = [items.children[j], items.children[i]];
  commit();
};

/* ---------- Content Fragments (in Assets) ---------- */

A.cfCreate = d => {
  const r = AR();
  const models = cfModels(r, confOfDam(d.path).conf).filter(m => m.status === 'enabled');
  if (!models.length) { toast('No enabled Content Fragment Model. Create one in Tools → Assets → Content Fragment Models.', 'warn'); return; }
  openModal({
    title: `New Content Fragment <small>${esc(d.path)}</small>`,
    okLabel: 'Create',
    body: `<div class="cards">${models.map((m, i) => `<label class="card-pick"><input type="radio" name="model" value="${esc(m.path)}" ${i ? '' : 'checked'}><span><b>${esc(m.title)}</b><small>${esc(m.desc)}</small></span></label>`).join('')}</div>
      ${field('Title *', 'title', '')}${field('Name', 'name', '', 'Leave empty to generate it from the title')}`,
    ok: b => {
      const f = formData(b);
      if (!f.title.trim()) { toast('Title is required.', 'error'); return false; }
      const parent = JCR.get(r, d.path);
      const name = slug(f.name || f.title);
      if (parent.children.some(c => c.name === name)) { toast('That name already exists here.', 'error'); return false; }
      const path = JCR.join(d.path, name);
      parent.children.push(JCR.node(name, { 'jcr:primaryType': 'dam:Asset' }, [
        JCR.node('jcr:content', { 'jcr:primaryType': 'dam:AssetContent', contentFragment: true, 'jcr:title': f.title.trim(), 'jcr:lastModified': now() }, [
          JCR.node('metadata', { 'dc:title': f.title.trim(), 'dc:format': 'text/html' }),
          JCR.node('data', { 'cq:model': f.model }, [JCR.node('master', { 'jcr:primaryType': 'nt:unstructured' })]),
        ]),
      ]));
      flag('cf:created');
      go('/editor.html' + path);
    },
  });
};

/* ---------- Content Fragment editor (the AEM Assets CF editor: variations rail, open-fragment tabs, model tabs) ---------- */

// The fragment's values as the editor shows them: unsaved edits live in a draft per fragment
function cfDraft(r, path) {
  S.ui.cfDrafts = S.ui.cfDrafts || {};
  if (!S.ui.cfDrafts[path]) S.ui.cfDrafts[path] = JSON.parse(JSON.stringify((JCR.get(r, path + '/jcr:content/data/master') || { props: {} }).props));
  return S.ui.cfDrafts[path];
}

function cfDirty(r, path) {
  const d = S.ui.cfDrafts && S.ui.cfDrafts[path];
  if (!d) return false;
  const m = (JCR.get(r, path + '/jcr:content/data/master') || { props: {} }).props;
  const fields = cfFields(r, cfModelOf(r, path)).filter(f => f.metaType !== 'tab');
  const norm = v => JSON.stringify(v === '' || v == null || (Array.isArray(v) && !v.filter(x => x !== '').length) ? null : Array.isArray(v) ? v.filter(x => x !== '') : v);
  return fields.some(f => norm(d[f.name]) !== norm(m[f.name]));
}

// Model fields grouped by Tab Placeholders: [{ label, fields }]
function cfTabs(fields) {
  const tabs = [];
  for (const f of fields) {
    if (f.metaType === 'tab') tabs.push({ label: f.fieldLabel || 'Tab', fields: [] });
    else {
      if (!tabs.length) tabs.push({ label: null, fields: [] });
      tabs[tabs.length - 1].fields.push(f);
    }
  }
  return tabs.filter(t => t.label || t.fields.length);
}

function cfFieldHtml(r, path, f, v) {
  const label = `${esc(f.fieldLabel || f.name)}${f.required ? ' *' : ''}`;
  const attr = (i, extra) => `data-cff="${esc(f.name)}" ${i != null ? `data-i="${i}"` : ''} ${extra || ''}`;
  const rows = f.multiple ? [].concat(v == null || v === '' ? [] : v) : [v == null ? '' : v];
  if (f.multiple && !rows.length) rows.push('');
  switch (f.metaType) {
    case 'text-multi': return `<label class="field"><span>${label}</span><textarea ${attr()} rows="5">${esc(v || '')}</textarea><small>Multi line text (an empty line starts a new paragraph)</small></label>`;
    case 'number': return `<label class="field"><span>${label}</span><input type="number" ${attr()} value="${esc(v != null ? v : '')}"></label>`;
    case 'boolean': return `<label class="check"><input type="checkbox" ${attr()} ${v === true || v === 'true' ? 'checked' : ''}> ${label}</label>`;
    case 'date': return `<label class="field"><span>${label}</span><input type="datetime-local" ${attr()} value="${esc(v || '')}"></label>`;
    case 'enumeration': return `<label class="field"><span>${label}</span><select ${attr()}>${[['', '(none)'], ...[].concat(f.options || []).map(o => [o, o])].map(([o, t]) => `<option value="${esc(o)}" ${String(v || '') === o ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    case 'tags': return `<label class="field"><span>${label}</span><input ${attr()} value="${esc([].concat(v || []).join(', '))}"><small>Comma separated tags</small></label>`;
    case 'json': return `<label class="field"><span>${label}</span><textarea ${attr()} rows="4" class="mono">${esc(typeof v === 'string' ? v : JSON.stringify(v || {}, null, 2))}</textarea></label>`;
    case 'reference':
    case 'fragment-reference': {
      const frag = f.metaType === 'fragment-reference';
      const row = (x, i) => {
        const ok = x && JCR.get(r, x);
        const src = !frag && ok && !isCF(r, x) ? assetSrc(r, x) : '';
        return `<div class="cfe-ref">
          <div class="cfe-ref-row"><input ${attr(i)} value="${esc(x || '')}" placeholder="${esc(f.emptyText || (frag ? 'Select a content fragment' : 'Select an asset'))}" spellcheck="false">
            <button class="cfe-ic" data-act="cfRefPick" data-f="${esc(f.name)}" data-i="${i}" title="Open selection dialog">${icon('SelectBoxAll', 16)}</button>
            ${f.multiple ? `<button class="cfe-ic" data-act="cfRefDel" data-f="${esc(f.name)}" data-i="${i}" title="Remove">${icon('Delete', 16)}</button>
            <button class="cfe-ic" data-act="cfRefMove" data-f="${esc(f.name)}" data-i="${i}" data-dir="-1" title="Move up" ${i ? '' : 'disabled'}>${icon('ArrowUp', 14)}</button>
            <button class="cfe-ic" data-act="cfRefMove" data-f="${esc(f.name)}" data-i="${i}" data-dir="1" title="Move down" ${i < rows.length - 1 ? '' : 'disabled'}>${icon('ArrowDown', 14)}</button>` : ''}</div>
          ${x && !ok ? `<small class="cfe-bad">${icon('Alert', 12)} Nothing exists at this path</small>` : ''}
          ${frag && ok && isCF(r, x) ? `<button class="btn quiet cfe-edit" data-act="cfRefEdit" data-p="${esc(x)}">${icon('Edit', 14)} Edit Content Fragment</button>` : ''}
          ${src ? `<img class="cf-ref" src="${src}" alt="">` : ''}</div>`;
      };
      return `<div class="field cfe-refs"><span>${label}</span><div class="cfe-ref-box">${rows.map(row).join('')}
          ${f.multiple ? `<button class="btn outline small" data-act="cfRefAdd" data-f="${esc(f.name)}">Add</button>` : ''}</div>
        ${frag ? `<button class="btn outline cfe-new" data-act="cfRefNew" data-f="${esc(f.name)}">${icon('Add', 14)} New Content Fragment</button>` : ''}</div>`;
    }
    default:
      if (f.multiple) {
        return `<div class="field"><span>${label}</span>${rows.map((x, i) => `<div class="cfe-ref-row"><input ${attr(i)} value="${esc(x || '')}" placeholder="${esc(f.emptyText || '')}">
          <button class="cfe-ic" data-act="cfRefDel" data-f="${esc(f.name)}" data-i="${i}" title="Remove">${icon('Delete', 16)}</button></div>`).join('')}
          <button class="btn outline small" data-act="cfRefAdd" data-f="${esc(f.name)}">Add</button></div>`;
      }
      return `<label class="field"><span>${label}</span><input ${attr()} value="${esc(v || '')}" placeholder="${esc(f.emptyText || '')}"></label>`;
  }
}

function cfEditor(path) {
  const r = AR();
  const model = cfModelOf(r, path);
  const fields = model ? cfFields(r, model) : [];
  const draft = cfDraft(r, path);
  S.ui.cfOpen = (S.ui.cfOpen || []).filter(p => isCF(r, p));
  if (!S.ui.cfOpen.includes(path)) S.ui.cfOpen.push(path);
  S.ui.cfTab = S.ui.cfTab || {};
  const tabs = cfTabs(fields);
  const ti = Math.min(S.ui.cfTab[path] || 0, Math.max(tabs.length - 1, 0));
  const tab = tabs[ti] || { fields: [] };
  if (tab.label && confOfModel(model).conf === 'mysite') flag('cfe:tab:' + slug(tab.label));
  if (model && model.endsWith('/page') && path.startsWith('/content/dam/mysite/')) flag('cfe:open:page');
  const c = JCR.get(r, path + '/jcr:content') || { props: {} };
  const pubNode = JCR.get(PR(), path);
  const pc = pubNode && JCR.get(pubNode, 'jcr:content');
  const pubWhen = c.props['cq:lastReplicated'] || (pc && pc.props['jcr:lastModified']);
  const status = pubNode ? `Published ${fmtDate(pubWhen)} by ${esc(c.props['cq:lastReplicatedBy'] || 'admin')}` : 'Not published';
  const banner = pubNode && !(S.ui.cfBannerOff || {})[path];

  return shell('Content Fragment', `<div class="cfe">
    <div class="cfe-rail">${['Edit', 'Annotate', 'Folder', 'Info', 'Layers', 'Search'].map((ic, i) => `<span class="cfe-rail-i ${i ? '' : 'on'}" title="${i ? 'Not simulated in the lab' : 'Variations'}">${icon(ic, 18)}</span>`).join('')}</div>
    <div class="cfe-vars"><div class="cfe-vars-h">Variations</div>
      <button class="btn outline cfe-wide" title="Not simulated in the lab" disabled>Create Variation</button>
      <div class="cfe-var on">${icon('Visibility', 16)} Master</div>
      <label class="field"><span>Tags</span><input disabled placeholder=""></label>
      <p class="hint">Saved at <code>${esc(path)}/jcr:content/data/master</code></p></div>
    <div class="cfe-main">
      <div class="cfe-open">${S.ui.cfOpen.map(p => `<a href="#" class="${p === path ? 'on' : ''}" data-act="go" data-url="/editor.html${esc(p)}">${esc(titleOf(r, p))}${cfDirty(r, p) ? ' •' : ''}<span class="cfe-x" data-act="cfCloseTab" data-p="${esc(p)}" title="Close">✕</span></a>`).join('')}</div>
      <div class="cfe-bar"><span class="cfe-status">${icon('RailLeft', 16)} ${status}</span>
        <div class="cfe-title"><b>${esc(titleOf(r, path))}</b><a href="#" data-act="go" data-url="${CFM_EDITOR}${esc(model || '')}">${esc(model ? titleOf(r, model) : '(no model)')}</a></div>
        <div class="cfe-acts"><button class="btn outline" data-act="cfClose" data-p="${esc(path)}">Close</button>
          <span class="cfe-save"><button class="btn primary" data-act="cfSave" data-path="${esc(path)}">Save</button><details class="dd right"><summary class="btn primary cfe-caret">${icon('ChevronDown', 10)}</summary>
            <div class="dd-menu"><a href="#" data-act="cfSave" data-path="${esc(path)}" data-close="1">Save &amp; Close</a></div></details></span>
          <details class="dd right"><summary class="iconbtn" title="More">${icon('More')}</summary><div class="dd-menu">
            ${model && model.endsWith('/page') && path.includes('/cf/page/') ? `<a href="#" data-act="cfPreview" data-p="${esc(path)}">Preview on the frontend</a>` : ''}
            <a href="#" data-act="cfPublishPath" data-p="${esc(path)}">Publish</a>
            <a href="#" data-act="go" data-url="/assets.html${esc(path)}">Show in Assets</a></div></details></div></div>
      ${banner ? `<div class="cfe-banner">${icon('Info', 14)} This content fragment has already been published.<a href="#" data-act="cfBannerOff" data-p="${esc(path)}">Close</a></div>` : ''}
      ${tabs.length > 1 || (tabs[0] && tabs[0].label) ? `<div class="cfe-tabs">${tabs.map((t, i) => `<a href="#" class="${i === ti ? 'on' : ''}" data-act="cfTabSet" data-p="${esc(path)}" data-i="${i}">${esc(t.label || 'Main')}</a>`).join('')}</div>` : ''}
      <form class="cf-form cfe-form" id="cf-form" data-path="${esc(path)}" onsubmit="return false">${tab.fields.map(f => cfFieldHtml(r, path, f, draft[f.name])).join('') || '<p class="muted">This model has no fields.</p>'}</form>
    </div></div>`);
}

// typing in the editor updates the draft without re-rendering
function cfInput(e) {
  const el = e.target.closest && e.target.closest('[data-cff]');
  const form = el && el.closest('#cf-form');
  if (!form) return;
  const path = form.dataset.path;
  const r = AR();
  const f = cfFields(r, cfModelOf(r, path)).find(x => x.name === el.dataset.cff);
  if (!f) return;
  const d = cfDraft(r, path);
  let val = el.type === 'checkbox' ? el.checked : el.value;
  if (f.metaType === 'number') val = val === '' ? null : Number(val);
  if (f.metaType === 'tags') val = String(val).split(',').map(x => x.trim()).filter(Boolean);
  if (el.dataset.i != null && f.multiple) {
    const arr = [].concat(d[f.name] == null || d[f.name] === '' ? [] : d[f.name]);
    while (arr.length <= +el.dataset.i) arr.push('');
    arr[+el.dataset.i] = val;
    d[f.name] = arr;
  } else d[f.name] = val;
  const tab = document.querySelector('.cfe-open a.on');
  if (tab && !tab.textContent.includes('•')) tab.firstChild.textContent += ' •';
}
document.addEventListener('input', cfInput);
document.addEventListener('change', cfInput);

const cfField = (path, name) => cfFields(AR(), cfModelOf(AR(), path)).find(f => f.name === name);
const cfCur = () => document.getElementById('cf-form') && document.getElementById('cf-form').dataset.path;
function cfList(path, name) {
  const d = cfDraft(AR(), path);
  return [].concat(d[name] == null || d[name] === '' ? [] : d[name]);
}

A.cfTabSet = d => {
  S.ui.cfTab[d.p] = +d.i;
  commit();
};
A.cfBannerOff = d => {
  S.ui.cfBannerOff = { ...(S.ui.cfBannerOff || {}), [d.p]: 1 };
  commit();
};
A.cfRefAdd = d => {
  const p = cfCur();
  const list = cfList(p, d.f);
  list.push('');
  cfDraft(AR(), p)[d.f] = list;
  commit();
};
A.cfRefDel = d => {
  const p = cfCur();
  const list = cfList(p, d.f);
  list.splice(+d.i, 1);
  cfDraft(AR(), p)[d.f] = list;
  commit();
};
A.cfRefMove = d => {
  const p = cfCur();
  const list = cfList(p, d.f);
  const i = +d.i;
  const j = i + +d.dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  cfDraft(AR(), p)[d.f] = list;
  flag('cfe:reordered');
  commit();
};
A.cfRefEdit = d => go('/editor.html' + d.p);

// Select Path: the column picker, starting where the project keeps that kind of item
A.cfRefPick = d => {
  const r = AR();
  const p = cfCur();
  const f = cfField(p, d.f);
  const frag = f.metaType === 'fragment-reference';
  const cur = f.multiple ? cfList(p, d.f)[+d.i] : cfDraft(r, p)[d.f];
  const conf = confOfDam(p);
  const compRoot = conf.dam + '/corporate/cf/comp/' + ((p.match(/\/cf\/page\/([^/]+)\//) || [])[1] || 'en');
  const start = cur && JCR.get(r, JCR.parent(cur)) ? JCR.parent(cur) : frag ? (JCR.get(r, compRoot) ? compRoot : JCR.parent(p)) : conf.dam;
  openPathPicker({
    root: '/content/dam',
    start,
    title: 'Select Path',
    selectable: x => (frag ? isCF(r, x) && (!f.fragmentModel || cfModelOf(r, x) === f.fragmentModel) : isDamAsset(r, x) && !isCF(r, x)),
    onSelect: ([x]) => {
      const draft = cfDraft(r, p);
      if (f.multiple) { const list = cfList(p, d.f); list[+d.i] = x; draft[d.f] = list; } else draft[d.f] = x;
      flag('cfe:picked');
      commit();
    },
  });
};

// New Content Fragment from a reference field: created in the project's folder convention and referenced right away
A.cfRefNew = d => {
  const r = AR();
  const p = cfCur();
  const f = cfField(p, d.f);
  const conf = confOfDam(p);
  const models = cfModels(r, conf.conf).filter(m => m.status === 'enabled' && (!f.fragmentModel || m.path === f.fragmentModel) && !m.path.endsWith('/page'))
    // component models first; header and footer have their own tabs
    .sort((a, b) => /\/(header|footer)$/.test(a.path) - /\/(header|footer)$/.test(b.path));
  if (!models.length) { toast('No model is allowed for this field.', 'warn'); return; }
  const page = (p.match(/\/cf\/page\/([^/]+)\/([^/]+)$/) || []);
  const parentDefault = page[1] ? `${conf.dam}/corporate/cf/comp/${page[1]}/${page[2]}` : JCR.parent(p);
  openModal({
    title: 'New Content Fragment',
    okLabel: 'Create',
    body: `${selectField('Model', 'model', models[0].path, models.map(m => [m.path, m.title]))}${field('Title *', 'title', '')}
      ${field('Parent folder', 'parent', parentDefault, 'Created if it does not exist yet')}
      <label class="check"><input type="checkbox" name="own" checked> Put it in its own folder (<code>…/&lt;name&gt;/&lt;name&gt;</code>, the project convention)</label>`,
    ok: b => {
      const v = formData(b);
      const title = v.title.trim();
      if (!title) { toast('Title is required.', 'error'); return false; }
      const name = title.toLowerCase().replace(/[^a-z0-9_]+/g, '-').replace(/^-+|-+$/g, '');
      const parent = String(v.parent || '').trim().replace(/\/+$/, '');
      if (!parent.startsWith('/content/dam/')) { toast('The parent folder must be under /content/dam.', 'error'); return false; }
      const folder = v.own ? `${parent}/${name}` : parent;
      const np = `${folder}/${name}`;
      if (JCR.get(r, np)) { toast(`<code>${esc(np)}</code> already exists.`, 'error'); return false; }
      ensureDamFolder(r, folder, title);
      cfNode(r, np, title, v.model, {});
      const draft = cfDraft(r, p);
      if (f.multiple) draft[d.f] = [...cfList(p, d.f).filter(Boolean), np];
      else draft[d.f] = np;
      flag('cfe:newref');
      toast(`Created <code>${esc(np)}</code> and added it. Save the page, then fill the new fragment.`);
      commit();
    },
  });
};

function ensureDamFolder(r, path, title) {
  let acc = '';
  for (const s of JCR.segs(path)) {
    const parent = JCR.get(r, acc || '/');
    acc += '/' + s;
    if (!JCR.get(r, acc)) parent.children.push(JCR.node(s, { 'jcr:primaryType': 'sling:Folder', ...(acc === path && title ? { 'jcr:title': title } : {}) }));
  }
}

function cfNode(r, path, title, model, data) {
  const parent = JCR.get(r, JCR.parent(path));
  parent.children.push(JCR.node(JCR.name(path), { 'jcr:primaryType': 'dam:Asset' }, [
    JCR.node('jcr:content', { 'jcr:primaryType': 'dam:AssetContent', contentFragment: true, 'jcr:title': title, 'jcr:lastModified': now(), 'jcr:lastModifiedBy': curUser() }, [
      JCR.node('metadata', { 'dc:title': title, 'dc:format': 'text/html' }),
      JCR.node('data', { 'cq:model': model }, [JCR.node('master', { 'jcr:primaryType': 'nt:unstructured', ...data })]),
    ]),
  ]));
}

A.cfSave = d => {
  const r = AR();
  const path = d.path;
  const model = cfModelOf(r, path);
  const fields = cfFields(r, model).filter(f => f.metaType !== 'tab');
  const draft = cfDraft(r, path);
  const empty = v => v === '' || v == null || (Array.isArray(v) && !v.filter(x => x !== '').length);
  const missing = fields.find(f => f.required && empty(draft[f.name]));
  if (missing) {
    const tabs = cfTabs(cfFields(r, model));
    const ti = tabs.findIndex(t => t.fields.some(x => x.name === missing.name));
    if (ti > -1) S.ui.cfTab[path] = ti;
    toast(`<b>${esc(missing.fieldLabel)}</b> is required.`, 'error');
    commit();
    return;
  }
  const master = JCR.ensure(r, path + '/jcr:content/data/master');
  for (const f of fields) {
    let v = draft[f.name];
    if (Array.isArray(v)) v = v.filter(x => x !== '');
    if (empty(v)) delete master.props[f.name];
    else master.props[f.name] = v;
  }
  const c = JCR.get(r, path + '/jcr:content');
  Object.assign(c.props, { 'jcr:lastModified': now(), 'jcr:lastModifiedBy': curUser() });
  // WKND fragments take their title from the Title field; project fragments keep their own name (C_007 - Hero)
  const t = confOfModel(model).conf === 'wknd' && master.props.title;
  if (t && typeof t === 'string') { c.props['jcr:title'] = t; JCR.ensure(r, path + '/jcr:content/metadata').props['dc:title'] = t; }
  delete S.ui.cfDrafts[path];
  flag('cf:saved');
  toast('Content Fragment saved.');
  if (d.close) A.cfClose({ p: path });
  else commit();
};

function cfCloseTab(path, goAway) {
  delete S.ui.cfDrafts[path];
  const open = S.ui.cfOpen || [];
  const i = open.indexOf(path);
  S.ui.cfOpen = open.filter(p => p !== path);
  if (!goAway) return commit();
  const next = S.ui.cfOpen[Math.min(i, S.ui.cfOpen.length - 1)];
  go(next ? '/editor.html' + next : '/assets.html' + JCR.parent(path));
}

A.cfClose = d => {
  const r = AR();
  if (cfDirty(r, d.p)) { confirmBox('Unsaved changes', `Close <b>${esc(titleOf(r, d.p))}</b> without saving?`, () => cfCloseTab(d.p, true), 'Discard'); return; }
  cfCloseTab(d.p, true);
};
A.cfCloseTab = (d, el, e) => {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (d.p === cfCur()) return A.cfClose(d);
  const r = AR();
  if (cfDirty(r, d.p)) { confirmBox('Unsaved changes', `Close <b>${esc(titleOf(r, d.p))}</b> without saving?`, () => cfCloseTab(d.p, false), 'Discard'); return; }
  cfCloseTab(d.p, false);
};

/* ---------- GraphQL (a small subset of AEM's Content Fragment GraphQL API) ---------- */

const GQL = (() => {
  function tokenize(src) {
    const toks = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/[\s,]/.test(c)) { i++; continue; }
      if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (src.startsWith('...', i)) { toks.push({ t: 'p', v: '...' }); i += 3; continue; }
      if ('{}():[]!$=@'.includes(c)) { toks.push({ t: 'p', v: c }); i++; continue; }
      if (c === '"') {
        let s = '';
        i++;
        while (i < src.length && src[i] !== '"') { if (src[i] === '\\') { s += src[i + 1]; i += 2; } else s += src[i++]; }
        i++;
        toks.push({ t: 's', v: s });
        continue;
      }
      const num = src.slice(i).match(/^-?\d+(\.\d+)?/);
      if (num) { toks.push({ t: 'n', v: Number(num[0]) }); i += num[0].length; continue; }
      const name = src.slice(i).match(/^[_A-Za-z][_0-9A-Za-z]*/);
      if (name) { toks.push({ t: 'name', v: name[0] }); i += name[0].length; continue; }
      throw new Error(`Syntax error: unexpected character "${c}"`);
    }
    return toks;
  }

  function parse(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    const next = () => toks[p++];
    const expect = v => { const t = next(); if (!t || t.v !== v) throw new Error(`Syntax error: expected "${v}" but found "${t ? t.v : 'end of query'}"`); };
    const value = () => {
      const t = next();
      if (!t) throw new Error('Syntax error: unexpected end of query');
      if (t.t === 's' || t.t === 'n') return t.v;
      if (t.v === 'true' || t.v === 'false') return t.v === 'true';
      if (t.v === 'null') return null;
      if (t.v === '{') { const o = {}; while (peek() && peek().v !== '}') { const k = next().v; expect(':'); o[k] = value(); } expect('}'); return o; }
      if (t.v === '[') { const a = []; while (peek() && peek().v !== ']') a.push(value()); expect(']'); return a; }
      if (t.t === 'name') return t.v;
      throw new Error(`Syntax error near "${t.v}"`);
    };
    const selectionSet = () => {
      expect('{');
      const sel = [];
      while (peek() && peek().v !== '}') {
        if (peek().v === '...') {
          next();
          const on = next();
          if (!on || on.v !== 'on') throw new Error('Only inline fragments ("... on Type { }") are supported in the lab');
          const type = next().v;
          sel.push({ kind: 'frag', type, sel: selectionSet() });
          continue;
        }
        let name = next();
        if (!name || name.t !== 'name') throw new Error(`Syntax error near "${name ? name.v : 'end'}"`);
        let alias = null;
        if (peek() && peek().v === ':') { next(); alias = name.v; name = next(); }
        const args = {};
        if (peek() && peek().v === '(') { next(); while (peek() && peek().v !== ')') { const k = next().v; expect(':'); args[k] = value(); } expect(')'); }
        const f = { kind: 'field', name: name.v, alias, args, sel: null };
        if (peek() && peek().v === '{') f.sel = selectionSet();
        sel.push(f);
      }
      expect('}');
      return sel;
    };
    if (peek() && peek().v === 'query') { next(); if (peek() && peek().t === 'name') next(); }
    if (peek() && peek().v === '(') throw new Error('Query variables are not supported in the lab — write the values directly');
    const sel = selectionSet();
    if (p < toks.length) throw new Error(`Syntax error: unexpected "${toks[p].v}" after the query`);
    return sel;
  }

  function schema(r) {
    const types = {};
    for (const m of cfModels(r).filter(x => x.status === 'enabled')) {
      types[m.path] = { model: m, typeName: pascal(m.name) + 'Model', list: camel(m.name) + 'List', byPath: camel(m.name) + 'ByPath', fields: cfFields(r, m.path).filter(x => x.metaType !== 'tab') };
    }
    return types;
  }

  function execute(r, src) {
    const errors = [];
    let sel;
    try { sel = parse(src); } catch (e) { return { errors: [{ message: e.message }] }; }
    const types = schema(r);
    const byRoot = {};
    Object.values(types).forEach(t => { byRoot[t.list] = { t, kind: 'list' }; byRoot[t.byPath] = { t, kind: 'byPath' }; });
    // validation errors are reported once per field, not once per item
    const err = (msg, path) => { if (!errors.some(e => e.message === msg)) errors.push({ message: msg, path }); return null; };

    const resolveCF = (cfPath, type, selection, path) => {
      const master = (JCR.get(r, cfPath + '/jcr:content/data/master') || { props: {} }).props;
      const out = {};
      const apply = list => {
        for (const s of list) {
          if (s.kind === 'frag') { if (s.type === type.typeName) apply(s.sel); continue; }
          const key = s.alias || s.name;
          const p = [...path, key];
          if (s.name === '__typename') { out[key] = type.typeName; continue; }
          if (s.name === '_path') { out[key] = cfPath; continue; }
          if (s.name === '_id') { out[key] = Math.abs(hashCode(cfPath)).toString(16); continue; }
          if (s.name === '_variation') { out[key] = 'master'; continue; }
          if (s.name === '_model') { out[key] = s.sel ? { title: type.model.title, _path: type.model.path } : err(`Field '_model' must have a selection of subfields`, p); continue; }
          const f = type.fields.find(x => x.name === s.name);
          if (!f) { err(`Validation error (FieldUndefined@[${p.join('/')}]) : Field '${s.name}' in type '${type.typeName}' is undefined`, p); continue; }
          const v = master[f.name];
          if (f.metaType === 'text-multi') {
            if (!s.sel) { err(`Validation error (SubselectionRequired@[${p.join('/')}]) : Sub selection required for type 'MultiFormatString' of field '${s.name}'`, p); continue; }
            const o = {};
            for (const ss of s.sel) {
              if (ss.kind !== 'field') continue;
              const k = ss.alias || ss.name;
              if (ss.name === 'plaintext') o[k] = v == null ? null : String(v);
              else if (ss.name === 'html') o[k] = v == null ? null : textToHtml(v);
              else if (ss.name === 'markdown') o[k] = v == null ? null : String(v);
              else if (ss.name === 'json') o[k] = v == null ? null : String(v).split(/\n\s*\n/).map(t => ({ nodeType: 'paragraph', content: [{ nodeType: 'text', value: t }] }));
              else err(`Field '${ss.name}' in type 'MultiFormatString' is undefined`, [...p, k]);
            }
            out[key] = o;
          } else if (f.metaType === 'reference') {
            if (!s.sel) { err(`Validation error (SubselectionRequired@[${p.join('/')}]) : Sub selection required for type 'Reference' of field '${s.name}'`, p); continue; }
            out[key] = f.multiple ? [].concat(v || []).filter(Boolean).map(x => assetRef(x, s, p)) : (v ? assetRef(v, s, p) : null);
          } else if (f.metaType === 'fragment-reference') {
            if (!s.sel) { err(`Sub selection required for fragment reference '${s.name}'`, p); continue; }
            // each referenced fragment resolves with its own model, so a field can mix component types (use "... on HeroModel { }")
            const one = x => { const t = x && JCR.get(r, x) && isCF(r, x) && types[cfModelOf(r, x)]; return t ? resolveCF(x, t, s.sel, p) : null; };
            out[key] = f.multiple ? [].concat(v || []).filter(Boolean).map(one).filter(Boolean) : one(v);
          } else {
            if (s.sel) { err(`Validation error (SubselectionNotAllowed@[${p.join('/')}]) : Sub selection not allowed on leaf type of field '${s.name}'`, p); continue; }
            out[key] = v === undefined ? null : f.metaType === 'tags' || f.multiple ? [].concat(v) : v;
          }
        }
      };
      const assetRef = (v, s, p) => {
        const refType = isCF(r, v) ? 'DocumentRef' : 'ImageRef';
        const o = {};
        const fields = [];
        s.sel.forEach(ss => { if (ss.kind === 'frag') { if (ss.type === refType) fields.push(...ss.sel); } else fields.push(ss); });
        const meta = JCR.get(r, v + '/jcr:content/metadata');
        for (const ss of fields) {
          const k = ss.alias || ss.name;
          if (ss.name === '_path') o[k] = v;
          else if (ss.name === '_publishUrl') o[k] = `http://localhost:${portOf('publish')}${v}`;
          else if (ss.name === '_authorUrl') o[k] = `http://localhost:${portOf('author')}${v}`;
          else if (ss.name === 'mimeType') o[k] = meta ? meta.props['dc:format'] : null;
          else if (ss.name === '__typename') o[k] = refType;
          else if (ss.name === 'width' || ss.name === 'height') o[k] = ss.name === 'width' ? 1200 : 600;
          else err(`Field '${ss.name}' in type '${refType}' is undefined`, [...p, k]);
        }
        return o;
  };
      apply(selection);
      return out;
    };

    const data = {};
    for (const s of sel) {
      if (s.kind !== 'field') continue;
      const key = s.alias || s.name;
      const root = byRoot[s.name];
      if (!root) {
        err(`Validation error (FieldUndefined@[${s.name}]) : Field '${s.name}' in type 'Query' is undefined${Object.keys(byRoot).length ? `. Available: ${Object.keys(byRoot).join(', ')}` : ''}`, [key]);
        continue;
      }
      if (!s.sel) { err(`Sub selection required for '${s.name}'`, [key]); continue; }
      if (root.kind === 'list') {
        let items = allCFs(r, root.t.model.path).sort();
        if (s.args.filter) { err('The "filter" argument is not simulated in the lab', [key]); continue; }
        if (s.args.sort) {
          const [fld, dir] = String(s.args.sort).split(/\s+/);
          const val = p => (JCR.get(r, p + '/jcr:content/data/master') || { props: {} }).props[fld];
          items.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * (/desc/i.test(dir || '') ? -1 : 1));
        }
        if (s.args.offset) items = items.slice(+s.args.offset);
        if (s.args.limit != null) items = items.slice(0, +s.args.limit);
        const o = {};
        for (const ss of s.sel) {
          if (ss.kind !== 'field') continue;
          if (ss.name !== 'items') { err(`Field '${ss.name}' in type '${root.t.typeName}Results' is undefined (use "items")`, [key, ss.name]); continue; }
          if (!ss.sel) { err("Field 'items' must have a selection of subfields", [key, 'items']); continue; }
          o[ss.alias || ss.name] = items.map(p => resolveCF(p, root.t, ss.sel, [key, 'items']));
        }
        data[key] = o;
      } else {
        const path = s.args._path;
        if (!path) { err(`Missing argument '_path' for '${s.name}'`, [key]); continue; }
        if (!JCR.get(r, path) || !isCF(r, path) || cfModelOf(r, path) !== root.t.model.path) {
          err(`Cannot find content fragment at ${path} for model ${root.t.model.title}`, [key]);
          data[key] = null;
          continue;
        }
        const o = {};
        for (const ss of s.sel) {
          if (ss.kind !== 'field') continue;
          if (ss.name !== 'item') { err(`Field '${ss.name}' in type '${root.t.typeName}Result' is undefined (use "item")`, [key, ss.name]); continue; }
          o[ss.alias || ss.name] = ss.sel ? resolveCF(path, root.t, ss.sel, [key, 'item']) : err("Field 'item' must have a selection of subfields", [key, 'item']);
        }
        data[key] = o;
      }
    }
    return errors.length ? { data, errors } : { data };
  }

  return { execute, schema };
})();

/* ---------- GraphQL Query Editor (GraphiQL) & persisted queries ---------- */

const GQL_SAMPLE = `{
  adventureList {
    items {
      _path
      title
      activity
      price
      description {
        plaintext
      }
    }
  }
}`;

function persistedQueries(r) {
  const n = JCR.get(r, PQ_ROOT);
  return n ? n.children.map(c => ({ name: c.name, query: c.props.query || '' })) : [];
}

function graphiqlScreen() {
  const r = AR();
  flag('visit:graphiql');
  S.ui.gql = S.ui.gql || { query: GQL_SAMPLE, result: '', name: null };
  const G = S.ui.gql;
  const pqs = persistedQueries(r);
  const types = Object.values(GQL.schema(r));
  return shell('GraphQL Query Editor', `${titleBar('', '<span class="tb-crumb">GraphQL Query Editor</span><span class="muted small">endpoint: WKND Sites Project (/content/cq:graphql/wknd/endpoint.json)</span>',
      `<button class="btn" data-act="gqlSave">${icon('DataSettings')} Save As</button><button class="btn primary" data-act="gqlRun">${icon('Play')} Run</button>`)}
    <div class="gql">
      <div class="gql-side">
        <div class="cfm-side-h">Persisted Queries</div>
        ${pqs.map(q => `<div class="gql-pq ${G.name === q.name ? 'on' : ''}"><a href="#" data-act="gqlLoad" data-name="${esc(q.name)}">${icon('DataSettings', 14)} ${esc(q.name)}</a>
          <span>${JCR.get(PR(), PQ_ROOT + '/' + q.name) ? '<span class="pill green">Published</span>' : '<span class="pill">Not published</span>'}</span>
          <div class="gql-pq-act"><button class="btn small" data-act="gqlPublish" data-name="${esc(q.name)}">Publish</button>
          <button class="btn small quiet" data-act="go" data-url="/graphql/execute.json/wknd/${esc(q.name)}">Open URL</button>
          <button class="btn small quiet" data-act="gqlDelete" data-name="${esc(q.name)}">✕</button></div></div>`).join('') || '<p class="muted small">None yet. Write a query and click Save As.</p>'}
        <div class="cfm-side-h">Schema</div>
        ${types.map(t => `<details class="gql-type"><summary><b>${esc(t.list)}</b> / <b>${esc(t.byPath)}</b></summary><div class="small"><code>${esc(t.typeName)}</code>: _path${t.fields.map(f => `, ${esc(f.name)}${f.metaType === 'text-multi' ? ' {plaintext html}' : f.metaType === 'reference' ? ' {... on ImageRef {_path}}' : ''}`).join('')}</div></details>`).join('') || '<p class="muted small">No enabled models.</p>'}
      </div>
      <textarea id="gql-q" class="gql-q" spellcheck="false">${esc(G.query)}</textarea>
      <pre class="gql-res">${esc(G.result || '// Click Run to execute the query against the Author repository')}</pre>
    </div>`);
}

document.addEventListener('input', e => {
  if (e.target.id === 'gql-q' && S.ui.gql) S.ui.gql.query = e.target.value;
});

A.gqlRun = () => {
  const q = document.getElementById('gql-q').value;
  S.ui.gql.query = q;
  const res = GQL.execute(AR(), q);
  S.ui.gql.result = JSON.stringify(res, null, 2);
  flag(res.errors ? 'gql:error' : 'gql:ok');
  commit();
};

A.gqlLoad = d => {
  const q = persistedQueries(AR()).find(x => x.name === d.name);
  Object.assign(S.ui.gql, { query: q.query, name: q.name, result: '' });
  commit();
};

A.gqlSave = () => openModal({
  title: 'Save As Persisted Query',
  okLabel: 'Save',
  body: `${field('Name *', 'name', S.ui.gql.name || '', 'Becomes part of the URL: /graphql/execute.json/wknd/&lt;name&gt;')}`,
  ok: b => {
    const name = slug(formData(b).name);
    if (!name) return false;
    const q = document.getElementById('gql-q').value;
    const test = GQL.execute(AR(), q);
    if (test.errors && !test.data) { toast('The query has errors — fix them before saving.', 'error'); return false; }
    JCR.ensure(AR(), PQ_ROOT, 'sling:Folder');
    JCR.put(AR(), PQ_ROOT, JCR.node(name, { 'jcr:primaryType': 'nt:unstructured', query: q }));
    Object.assign(S.ui.gql, { name, query: q });
    flag('gql:persisted');
    toast(`Saved. Try <code>/graphql/execute.json/wknd/${esc(name)}</code>`);
    commit();
  },
});

A.gqlPublish = d => {
  queueReplication('Activate', [PQ_ROOT + '/' + d.name]);
  flag('gql:published');
  toast('Persisted query publishing… (remember to publish the Content Fragments and the model too)');
  commit();
};

A.gqlDelete = d => {
  JCR.remove(AR(), PQ_ROOT + '/' + d.name);
  if (S.ui.gql.name === d.name) S.ui.gql.name = null;
  commit();
};

// GET /graphql/execute.json/<config>/<query> — what a headless front end (e.g. Next.js) calls
function persistedResult(r, path) {
  const m = path.match(/^\/graphql\/execute\.json\/([^/]+)\/([^/;?]+)/);
  if (!m) return { status: 404, body: { errors: [{ message: 'Use /graphql/execute.json/<configuration>/<query-name>' }] } };
  const q = CFM_CONFS.some(c => c.conf === m[1]) && JCR.get(r, `/conf/${m[1]}/settings/graphql/persistentQueries/${m[2]}`);
  if (!q) return { status: 404, body: { errors: [{ message: `Persisted query not found: ${m[1]}/${m[2]}` }] } };
  return { status: 200, body: GQL.execute(r, q.props.query || '') };
}

function graphqlRoute(k, path) {
  const res = persistedResult(S.repos[k], path);
  flag('gql:url:' + k);
  return jsonView(path, res.body, res.status === 200 ? `Persisted query on ${k} · HTTP GET · cacheable by the Dispatcher/CDN` : '404');
}
