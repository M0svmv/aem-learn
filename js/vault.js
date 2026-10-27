/* Jackrabbit FileVault: JCR subtrees <-> content package files (jcr_root/…/.content.xml docview + META-INF/vault) */

const VAULT = (() => {
  const NS = {
    jcr: 'http://www.jcp.org/jcr/1.0', nt: 'http://www.jcp.org/jcr/nt/1.0', mix: 'http://www.jcp.org/jcr/mix/1.0',
    sling: 'http://sling.apache.org/jcr/sling/1.0', cq: 'http://www.day.com/jcr/cq/1.0', dam: 'http://www.day.com/dam/1.0',
    rep: 'internal', granite: 'http://www.adobe.com/jcr/granite/1.0', dc: 'http://purl.org/dc/elements/1.1/',
    vlt: 'http://www.day.com/jcr/vault/1.0', oak: 'http://jackrabbit.apache.org/oak/ns/1.0',
  };
  const TEXT_EXT = /\.(html?|css|js|json|txt|less|scss|svg|xml|md|properties|jsp|ecma|java|csv|txt)$/i;
  const MAX_BINARY = 200 * 1024;
  const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$/;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  /* ---------- names ---------- */
  // jcr:content <-> _jcr_content (file system names)
  function encSeg(name) {
    const m = name.match(/^([a-zA-Z][\w-]*):(.+)$/);
    const s = m ? `_${m[1]}_${m[2]}` : name;
    return s.replace(/[%\\<>|?*":]/g, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'));
  }
  function decSeg(seg) {
    let s = seg;
    try { s = decodeURIComponent(seg); } catch (e) { /* keep raw */ }
    const m = s.match(/^_([a-zA-Z][a-zA-Z0-9]*)_(.+)$/);
    return m ? `${m[1]}:${m[2]}` : s;
  }
  // XML element names (ISO 9075 escaping)
  function encXml(name) {
    return name.split(':').map((part, i, arr) => part.replace(/(^[^A-Za-z_])|[^A-Za-z0-9_.\-]/g, c => `_x${c.charCodeAt(0).toString(16).padStart(4, '0')}_`)).join(':');
  }
  function decXml(name) {
    return name.replace(/_x([0-9a-fA-F]{4})_/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
  }
  const xmlAttr = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/\n/g, '&#xa;').replace(/\r/g, '&#xd;').replace(/\t/g, '&#x9;');

  /* ---------- values ---------- */
  function typeOf(v) {
    if (typeof v === 'boolean') return 'Boolean';
    if (typeof v === 'number') return Number.isInteger(v) ? 'Long' : 'Double';
    if (typeof v === 'string' && ISO.test(v)) return 'Date';
    return null;
  }
  function fmtVal(v) {
    const esc1 = s => String(s).replace(/\\/g, '\\\\');
    if (Array.isArray(v)) {
      const t = v.length ? typeOf(v[0]) : null;
      return (t ? `{${t}}` : '') + '[' + v.map(x => esc1(x).replace(/,/g, '\\,')).join(',') + ']';
    }
    const t = typeOf(v);
    let body = esc1(v);
    if (!t && /^[[{]/.test(body)) body = '\\' + body;
    return (t ? `{${t}}` : '') + body;
  }
  function parseVal(raw) {
    let v = raw;
    let type = null;
    const m = v.match(/^\{(\w+)\}([\s\S]*)$/);
    if (m) { type = m[1]; v = m[2]; }
    const conv = s => (type === 'Boolean' ? s === 'true' : ['Long', 'Double', 'Decimal'].includes(type) ? Number(s) : s);
    if (v.startsWith('[') && v.endsWith(']')) {
      const inner = v.slice(1, -1);
      if (!inner) return [];
      const items = [];
      let cur = '';
      for (let i = 0; i < inner.length; i++) {
        const c = inner[i];
        if (c === '\\' && i + 1 < inner.length) { cur += inner[++i]; continue; }
        if (c === ',') { items.push(cur); cur = ''; continue; }
        cur += c;
      }
      items.push(cur);
      return items.map(conv);
    }
    if (v.startsWith('\\')) v = v.slice(1);
    return conv(v);
  }

  /* ---------- binary helpers ---------- */
  function b64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function sniff(name, bytes) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
    if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif';
    if (/\.jar$/i.test(name)) return 'application/java-archive';
    if (/\.zip$/i.test(name)) return 'application/zip';
    return 'application/octet-stream';
  }
  function looksText(name, bytes) {
    if (TEXT_EXT.test(name)) return true;
    if (/\.[a-z0-9]{2,5}$/i.test(name)) return false;
    for (let i = 0; i < Math.min(bytes.length, 512); i++) if (bytes[i] === 0) return false;
    const head = dec.decode(bytes.subarray(0, 64)).trim();
    return head.startsWith('<svg') || head.startsWith('<?xml') || head.startsWith('{');
  }
  function fileBytes(node) {
    const c = JCR.get(node, 'jcr:content');
    const d = c ? c.props['jcr:data'] : node.props['jcr:data'];
    if (d == null) return new Uint8Array(0);
    const s = String(d);
    if (s.startsWith('data:')) {
      const comma = s.indexOf(',');
      const meta = s.slice(5, comma);
      const body = s.slice(comma + 1);
      if (meta.includes(';base64')) return Uint8Array.from(atob(body), ch => ch.charCodeAt(0));
      return enc.encode(decodeURIComponent(body));
    }
    return enc.encode(s);
  }

  /* ---------- write ---------- */
  function collectPrefixes(node, set) {
    const add = n => { const m = String(n).match(/^([a-zA-Z][\w-]*):/); if (m) set.add(m[1]); };
    add(node.name);
    for (const [k, v] of Object.entries(node.props)) {
      add(k);
      if (k === 'jcr:primaryType') add(v);
      if (k === 'jcr:mixinTypes' && Array.isArray(v)) v.forEach(add);
    }
    node.children.forEach(c => { if (JCR.type(c) !== 'nt:file') collectPrefixes(c, set); });
  }

  function toFiles(pkg) {
    const files = [];
    const written = new Set();
    const dirOf = path => 'jcr_root' + JCR.segs(path).map(s => '/' + encSeg(s)).join('');
    const writeNode = (path, node) => {
      if (written.has(path)) return;
      written.add(path);
      if (JCR.type(node) === 'nt:file') {
        files.push({ name: dirOf(path), data: fileBytes(node) });
        return;
      }
      const prefixes = new Set(['jcr']);
      collectPrefixes(node, prefixes);
      const elem = (tag, n, p, indent, isRoot) => {
        const attrs = [];
        if (isRoot) [...prefixes].sort().forEach(pre => attrs.push(`xmlns:${pre}="${NS[pre] || 'urn:lab:' + pre}"`));
        for (const [k, v] of Object.entries(n.props)) {
          if (typeof v === 'string' && v.startsWith('data:')) continue;
          attrs.push(`${k}="${xmlAttr(fmtVal(v))}"`);
        }
        const kids = [];
        for (const c of n.children) {
          if (JCR.type(c) === 'nt:file') writeNode(p + '/' + c.name, c);
          else kids.push(elem(encXml(c.name), c, p + '/' + c.name, indent + '    ', false));
        }
        const head = `${indent}<${tag}${attrs.length ? '\n' + attrs.map(a => indent + '    ' + a).join('\n') : ''}`;
        return kids.length ? `${head}>\n${kids.join('\n')}\n${indent}</${tag}>` : `${head}/>`;
      };
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${elem('jcr:root', node, path, '', true)}\n`;
      files.push({ name: dirOf(path) + '/.content.xml', data: xml });
    };
    for (const f of pkg.filters) {
      const node = pkg.content && JCR.get(pkg.content, f.root);
      if (node) writeNode(f.root, node);
    }
    const entry = (k, v) => `<entry key="${k}">${xmlAttr(v)}</entry>`;
    files.unshift(
      { name: 'META-INF/vault/properties.xml', data: `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">\n<properties>\n<comment>FileVault Package Properties</comment>\n${entry('name', pkg.name)}\n${entry('group', pkg.group)}\n${entry('version', pkg.version || '')}\n${entry('description', pkg.desc || '')}\n${entry('createdBy', 'admin')}\n${entry('created', pkg.created || new Date().toISOString())}\n${entry('lastWrapped', new Date().toISOString())}\n${entry('packageType', 'content')}\n</properties>\n` },
      { name: 'META-INF/vault/filter.xml', data: filterXml(pkg.filters) },
      { name: 'META-INF/vault/definition/.content.xml', data: `<?xml version="1.0" encoding="UTF-8"?>\n<jcr:root xmlns:vlt="${NS.vlt}" xmlns:jcr="${NS.jcr}" xmlns:nt="${NS.nt}"\n    jcr:primaryType="vlt:PackageDefinition"\n    name="${xmlAttr(pkg.name)}"\n    group="${xmlAttr(pkg.group)}"\n    version="${xmlAttr(pkg.version || '')}"/>\n` },
    );
    return files;
  }

  function filterXml(filters) {
    const f = filters.map(x => {
      const rules = (x.rules || []).map(r => `        <${r.type} pattern="${xmlAttr(r.pattern)}"/>`).join('\n');
      const mode = x.mode && x.mode !== 'replace' ? ` mode="${x.mode}"` : '';
      return rules ? `    <filter root="${xmlAttr(x.root)}"${mode}>\n${rules}\n    </filter>` : `    <filter root="${xmlAttr(x.root)}"${mode}/>`;
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<workspaceFilter version="1.0">\n${f}\n</workspaceFilter>\n`;
  }

  /* ---------- read ---------- */
  function xmlDoc(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    return doc.getElementsByTagName('parsererror').length ? null : doc;
  }

  function mergeDocview(tree, path, text) {
    const doc = xmlDoc(text);
    if (!doc || doc.documentElement.nodeName !== 'jcr:root') return false;
    const node = path === '/' ? tree : JCR.ensure(tree, path, 'nt:unstructured');
    const apply = (n, el) => {
      for (const a of el.attributes) {
        if (a.name.startsWith('xmlns')) continue;
        n.props[a.name] = parseVal(a.value);
      }
      for (const ch of el.children) {
        const name = decXml(ch.nodeName);
        let c = n.children.find(x => x.name === name);
        if (!c) {
          if (!ch.attributes.length && !ch.children.length) continue; // ordering hint only
          c = JCR.node(name, {});
          n.children.push(c);
        }
        apply(c, ch);
      }
    };
    apply(node, doc.documentElement);
    return true;
  }

  // entries: [{ name, data }] → { props, filters, tree, subs, stats }
  async function parse(entries, depth) {
    depth = depth || 0;
    const text = n => { const e = entries.find(x => x.name === n); return e ? dec.decode(e.data) : null; };
    const props = {};
    const pdoc = text('META-INF/vault/properties.xml');
    if (pdoc) {
      const d = xmlDoc(pdoc);
      if (d) for (const e of d.getElementsByTagName('entry')) props[e.getAttribute('key')] = e.textContent;
    }
    const filters = [];
    const fdoc = text('META-INF/vault/filter.xml');
    if (fdoc) {
      const d = xmlDoc(fdoc);
      if (d) for (const f of d.getElementsByTagName('filter')) {
        filters.push({
          root: f.getAttribute('root'), mode: f.getAttribute('mode') || 'replace',
          rules: [...f.children].filter(r => r.nodeName === 'include' || r.nodeName === 'exclude').map(r => ({ type: r.nodeName, pattern: r.getAttribute('pattern') })),
        });
      }
    }
    if (!pdoc && !fdoc) throw new Error('This zip is not a content package (META-INF/vault is missing).');
    const tree = JCR.node('', { 'jcr:primaryType': 'rep:root' });
    const subs = [];
    const stats = { files: 0, skipped: 0, bundles: 0 };
    for (const e of entries) {
      if (!e.name.startsWith('jcr_root/')) continue;
      const segs = e.name.slice(9).split('/');
      const fname = segs.pop();
      const dirSegs = segs.map(s => decSeg(s.endsWith('.dir') ? s.slice(0, -4) : s));
      const dirPath = '/' + dirSegs.join('/');
      if (fname === '.content.xml') {
        mergeDocview(tree, dirPath === '/' ? '/' : dirPath, dec.decode(e.data));
        continue;
      }
      const nodeName = decSeg(fname);
      if (nodeName.startsWith('rep:policy') || nodeName.startsWith('rep:repoPolicy')) { stats.skipped++; continue; }
      if (/\.xml$/i.test(fname)) {
        const t = dec.decode(e.data);
        if (t.includes('<jcr:root') && mergeDocview(tree, JCR.join(dirPath, nodeName.replace(/\.xml$/i, '')), t)) continue;
      }
      const nodePath = JCR.join(dirPath, nodeName);
      if (/\/dam:thumbnails\//.test(nodePath + '/') || /\/renditions\/cq5dam\./.test(nodePath)) { stats.skipped++; continue; }
      let data;
      let mime;
      let subId = null;
      if (/\.zip$/i.test(fname) && depth < 3) {
        try {
          const sub = await parse(await ZIP.read(e.data.buffer.slice(e.data.byteOffset, e.data.byteOffset + e.data.byteLength)), depth + 1);
          sub.size = e.data.length;
          subs.push(sub);
          subId = (sub.props.group || '') + ':' + (sub.props.name || fname);
        } catch (err) { /* not a package: store as a normal file */ }
      }
      if (subId) {
        data = `(content package ${subId} — ${e.data.length} bytes, registered in Package Manager)`;
        mime = 'application/zip';
      } else if (looksText(fname, e.data)) {
        data = dec.decode(e.data);
        mime = /\.css$/i.test(fname) ? 'text/css' : /\.js$/i.test(fname) ? 'application/javascript' : /\.svg$/i.test(fname) || data.trim().startsWith('<svg') ? 'image/svg+xml' : 'text/plain';
        if (mime === 'image/svg+xml') data = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
      } else {
        mime = sniff(fname, e.data);
        if (/\.jar$/i.test(fname)) stats.bundles++;
        data = e.data.length > MAX_BINARY || /\.jar$/i.test(fname)
          ? `(binary ${mime}, ${e.data.length} bytes — not stored by the lab)`
          : `data:${mime};base64,${b64(e.data)}`;
        if (e.data.length > MAX_BINARY) stats.skipped++;
      }
      if (dirPath !== '/') JCR.ensure(tree, dirPath, 'nt:folder');
      const fileNode = JCR.ensure(tree, nodePath, 'nt:file');
      if (fileNode.props['jcr:primaryType'] === 'nt:unstructured') fileNode.props['jcr:primaryType'] = 'nt:file';
      const c = JCR.ensure(fileNode, 'jcr:content', 'nt:resource');
      Object.assign(c.props, { 'jcr:data': data, 'jcr:mimeType': c.props['jcr:mimeType'] || mime });
      if (subId) fileNode.props['lab:subPackage'] = subId;
      stats.files++;
    }
    // folders that only exist as directories
    JCR.walk(tree, '/', n => { if (!n.props['jcr:primaryType']) n.props['jcr:primaryType'] = 'nt:folder'; });
    return { props, filters, tree, subs, stats };
  }

  return { toFiles, parse, encSeg, decSeg, parseVal, fmtVal, filterXml };
})();
