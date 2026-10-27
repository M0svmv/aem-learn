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
];
const cfTypeLabel = t => (CF_TYPES.find(x => x[0] === t) || [, t])[1];

/* ---------- model helpers ---------- */

function cfModels(r) {
  const base = JCR.get(r, CFM_ROOT);
  return (base ? base.children : []).filter(n => JCR.type(n) === 'cq:Template').map(n => {
    const path = CFM_ROOT + '/' + n.name;
    const c = JCR.get(n, 'jcr:content');
    return { path, name: n.name, title: (c && c.props['jcr:title']) || n.name, status: (c && c.props.status) || 'enabled', desc: (c && c.props['jcr:description']) || '' };
  });
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
    : titleBar('', '<span class="tb-crumb">WKND Sites Project</span>', '<button class="btn primary" data-act="cfmCreate">Create</button>');
  return shell('Content Fragment Models', `${bar}
    <div class="agrid">${models.map(m => `<div class="acard ${sel && sel.path === m.path ? 'sel' : ''}" data-act="cfmSel" data-path="${esc(m.path)}" data-dbl="cfmOpenPath" title="${esc(m.path)}">
      <div class="athumb tpl-thumb">${icon('Table', 48)}<i class="ci-check">${icon('Checkmark', 12)}</i></div>
      <div class="acard-info"><b>${esc(m.title)}</b><small><span class="status-dot ${m.status === 'enabled' ? 'green' : ''}"></span>${m.status === 'enabled' ? 'Enabled' : 'Disabled'} · ${cfFields(r, m.path).length} field(s) · ${used(m)} fragment(s)</small>
      <small>${JCR.get(PR(), m.path) ? 'Published' : 'Not published'}</small></div></div>`).join('')}</div>
    <p class="hint pad">Models live in <code>${CFM_ROOT}</code>. Each model becomes a GraphQL type — try the <a href="#" data-act="go" data-url="${GRAPHIQL_URL}">GraphQL Query Editor</a>.</p>`);
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
  body: `${field('Model Title *', 'title', '')}<label class="field"><span>Description</span><textarea name="desc"></textarea></label>`,
  ok: b => {
    const f = formData(b);
    if (!f.title.trim()) { toast('Title is required.', 'error'); return false; }
    const r = AR();
    const base = JCR.ensure(r, CFM_ROOT, 'sling:Folder');
    const name = JCR.unique(base, slug(f.title));
    const path = CFM_ROOT + '/' + name;
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
  return shell('Content Fragment Model Editor', `${titleBar(`<button class="iconbtn" data-act="go" data-url="${CFM_URL}" title="Back to models">${icon('ChevronLeft')}</button>`,
      `<span class="tb-crumb">${esc(c.props['jcr:title'])}</span><span class="muted small">${esc(modelPath)}</span>`,
      `<button class="btn primary" data-act="go" data-url="${CFM_URL}">Done</button>`)}
    <div class="cfm-ed">
      <div class="cfm-form">
        ${fields.map((f, i) => `<div class="cfm-field">
          <span class="cfm-ico">${icon((CF_TYPES.find(t => t[0] === f.metaType) || [, , 'Text'])[2])}</span>
          <div class="cfm-f-txt"><b>${esc(f.fieldLabel || f.name)}${f.required ? ' *' : ''}</b><small>${esc(cfTypeLabel(f.metaType))} · property name <code>${esc(f.name)}</code>${f.options ? ' · ' + esc([].concat(f.options).join(', ')) : ''}</small></div>
          <button class="iconbtn" data-act="cfmFieldEdit" data-m="${esc(modelPath)}" data-id="${esc(f.id)}" title="Properties">${icon('Edit')}</button>
          <button class="iconbtn" data-act="cfmFieldMove" data-m="${esc(modelPath)}" data-i="${i}" data-dir="-1" title="Up">${icon('ArrowUp')}</button>
          <button class="iconbtn" data-act="cfmFieldMove" data-m="${esc(modelPath)}" data-i="${i}" data-dir="1" title="Down">${icon('ArrowDown')}</button>
          <button class="iconbtn" data-act="cfmFieldDel" data-m="${esc(modelPath)}" data-id="${esc(f.id)}" title="Delete">${icon('Delete')}</button></div>`).join('') || '<div class="cfm-empty">Add data types from the panel on the right.</div>'}
      </div>
      <div class="cfm-side"><div class="cfm-side-h">Data Types</div>
        ${CF_TYPES.map(([t, l, ic]) => `<a href="#" class="cfm-type" data-act="cfmFieldAdd" data-m="${esc(modelPath)}" data-t="${t}">${icon(ic)}${l}</a>`).join('')}
        <p class="hint">Click a type to add a field. Each field becomes a property on the fragment and a field in GraphQL.</p></div>
    </div>`);
}

function cfmFieldDialog(modelPath, f, isNew) {
  const r = AR();
  const models = cfModels(r);
  openModal({
    title: `${isNew ? 'Add' : 'Edit'} field <small>${esc(cfTypeLabel(f.metaType))}</small>`,
    body: `${field('Field Label', 'fieldLabel', f.fieldLabel || '')}${field('Property Name', 'name', f.name || '', 'Used in the JCR and in GraphQL (letters and digits only)')}
      <label class="check"><input type="checkbox" name="required" ${f.required ? 'checked' : ''}> Required</label>
      ${f.metaType === 'enumeration' ? field('Options', 'options', [].concat(f.options || []).join(', '), 'Comma separated') : ''}
      ${f.metaType === 'fragment-reference' ? selectField('Allowed model', 'fragmentModel', f.fragmentModel || (models[0] && models[0].path), models.map(m => [m.path, m.title])) : ''}`,
    onMount: b => {
      const l = b.querySelector('[name=fieldLabel]');
      const n = b.querySelector('[name=name]');
      l.addEventListener('input', () => { if (!n.dataset.touched && isNew) n.value = camel(slug(l.value)); });
      n.addEventListener('input', () => { n.dataset.touched = '1'; });
    },
    ok: b => {
      const v = formData(b);
      const name = String(v.name || camel(slug(v.fieldLabel))).replace(/[^A-Za-z0-9_]/g, '');
      if (!name || /^\d/.test(name)) { toast('Property name must start with a letter.', 'error'); return false; }
      const items = cfFieldsNode(r, modelPath);
      if (items.children.some(c => c.props.name === name && c.name !== f.id)) { toast('Another field uses that property name.', 'error'); return false; }
      const props = { metaType: f.metaType, name, fieldLabel: v.fieldLabel || name, valueType: f.metaType === 'number' ? 'long' : f.metaType === 'boolean' ? 'boolean' : 'string' };
      if (v.required) props.required = true;
      if (f.metaType === 'enumeration') props.options = String(v.options || '').split(',').map(s => s.trim()).filter(Boolean);
      if (f.metaType === 'fragment-reference') props.fragmentModel = v.fragmentModel;
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
  const models = cfModels(r).filter(m => m.status === 'enabled');
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

function cfEditor(path) {
  const r = AR();
  const model = cfModelOf(r, path);
  const fields = model ? cfFields(r, model) : [];
  const master = JCR.get(r, path + '/jcr:content/data/master') || { props: {} };
  const v = master.props;
  const assets = JCR.find(r, '/content/dam', (n, p) => JCR.type(n) === 'dam:Asset' && !isCF(r, p)).map(x => x.path);
  const input = f => {
    const val = v[f.name];
    const name = `cf:${f.name}`;
    switch (f.metaType) {
      case 'text-multi': return `<label class="field"><span>${esc(f.fieldLabel)}${f.required ? ' *' : ''}</span><textarea name="${esc(name)}" rows="5">${esc(val || '')}</textarea><small>Multi line text (plain text; an empty line starts a new paragraph)</small></label>`;
      case 'number': return field(esc(f.fieldLabel) + (f.required ? ' *' : ''), name, val != null ? val : '', '', 'number');
      case 'boolean': return `<label class="check"><input type="checkbox" name="${esc(name)}" ${val === true || val === 'true' ? 'checked' : ''}> ${esc(f.fieldLabel)}</label>`;
      case 'date': return field(esc(f.fieldLabel), name, val || '', '', 'datetime-local');
      case 'enumeration': return selectField(esc(f.fieldLabel) + (f.required ? ' *' : ''), name, val || '', [['', '(none)'], ...[].concat(f.options || []).map(o => [o, o])]);
      case 'reference': return `${selectField(esc(f.fieldLabel), name, val || '', [['', '(none)'], ...assets.map(a => [a, a])])}${val && assetSrc(r, val) ? `<img class="cf-ref" src="${assetSrc(r, val)}" alt="">` : ''}`;
      case 'fragment-reference': return selectField(esc(f.fieldLabel), name, val || '', [['', '(none)'], ...allCFs(r, f.fragmentModel).map(p => [p, p])]);
      case 'tags': return field(esc(f.fieldLabel), name, [].concat(val || []).join(', '), 'Comma separated tags');
      case 'json': return `<label class="field"><span>${esc(f.fieldLabel)}</span><textarea name="${esc(name)}" rows="4" class="mono">${esc(typeof val === 'string' ? val : JSON.stringify(val || {}, null, 2))}</textarea></label>`;
      default: return field(esc(f.fieldLabel) + (f.required ? ' *' : ''), name, val || '');
    }
  };
  const folder = JCR.parent(path);
  return shell('Content Fragment', `${titleBar(`<button class="iconbtn" data-act="go" data-url="/assets.html${esc(folder)}" title="Close">${icon('ChevronLeft')}</button>`,
      `<span class="tb-crumb">${esc(titleOf(r, path))}</span><span class="muted small">${esc(path)}</span>`,
      `<button class="btn quiet" data-act="go" data-url="/assets.html${esc(folder)}">Cancel</button><button class="btn primary" data-act="cfSave" data-path="${esc(path)}">Save</button>`)}
    <div class="cf-ed">
      <div class="cf-side"><div class="cfm-side-h">Variations</div><div class="cf-var on">${icon('DocumentFragment')} Master</div>
        <div class="cfm-side-h">Model</div><div class="muted small">${esc(model ? titleOf(r, model) : '(no model)')}<br><code>${esc(model || '')}</code></div>
        <p class="hint">Stored at <code>${esc(path)}/jcr:content/data/master</code></p></div>
      <form class="cf-form" id="cf-form" onsubmit="return false">${fields.map(input).join('') || '<p class="muted">This model has no fields.</p>'}</form>
    </div>`);
}

A.cfSave = d => {
  const r = AR();
  const form = document.getElementById('cf-form');
  const model = cfModelOf(r, d.path);
  const fields = cfFields(r, model);
  const master = JCR.ensure(r, d.path + '/jcr:content/data/master');
  for (const f of fields) {
    const el = form.querySelector(`[name="${CSS.escape('cf:' + f.name)}"]`);
    if (!el) continue;
    let val = el.type === 'checkbox' ? el.checked : el.value;
    if (f.metaType === 'number') val = val === '' ? null : Number(val);
    if (f.metaType === 'tags') val = String(val).split(',').map(s => s.trim()).filter(Boolean);
    if (f.required && (val === '' || val == null)) { toast(`<b>${esc(f.fieldLabel)}</b> is required.`, 'error'); return; }
    if (val === '' || val == null) delete master.props[f.name];
    else master.props[f.name] = val;
  }
  const c = JCR.get(r, d.path + '/jcr:content');
  c.props['jcr:lastModified'] = now();
  if (master.props.title) { c.props['jcr:title'] = master.props.title; JCR.ensure(r, d.path + '/jcr:content/metadata').props['dc:title'] = master.props.title; }
  flag('cf:saved');
  toast('Content Fragment saved.');
  commit();
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
      types[m.path] = { model: m, typeName: pascal(m.name) + 'Model', list: camel(m.name) + 'List', byPath: camel(m.name) + 'ByPath', fields: cfFields(r, m.path) };
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
            if (!v) { out[key] = null; continue; }
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
            out[key] = o;
          } else if (f.metaType === 'fragment-reference') {
            if (!s.sel) { err(`Sub selection required for fragment reference '${s.name}'`, p); continue; }
            const refType = types[f.fragmentModel];
            out[key] = v && refType && JCR.get(r, v) ? resolveCF(v, refType, s.sel, p) : null;
          } else {
            if (s.sel) { err(`Validation error (SubselectionNotAllowed@[${p.join('/')}]) : Sub selection not allowed on leaf type of field '${s.name}'`, p); continue; }
            out[key] = v === undefined ? null : f.metaType === 'tags' ? [].concat(v) : v;
          }
        }
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
  const q = JCR.get(r, PQ_ROOT + '/' + m[2]);
  if (m[1] !== 'wknd' || !q) return { status: 404, body: { errors: [{ message: `Persisted query not found: ${m[1]}/${m[2]}` }] } };
  return { status: 200, body: GQL.execute(r, q.props.query || '') };
}

function graphqlRoute(k, path) {
  const res = persistedResult(S.repos[k], path);
  flag('gql:url:' + k);
  return jsonView(path, res.body, res.status === 200 ? `Persisted query on ${k} · HTTP GET · cacheable by the Dispatcher/CDN` : '404');
}
