/* Tiny in-memory JCR: every node is { name, props, children } */
const JCR = {
  node(name, props, children) {
    return { name, props: props || {}, children: children || [] };
  },
  segs(p) {
    return String(p).split('/').filter(Boolean);
  },
  get(root, p) {
    let n = root;
    for (const s of JCR.segs(p)) {
      n = n.children.find(c => c.name === s);
      if (!n) return null;
    }
    return n;
  },
  parent(p) {
    const s = JCR.segs(p);
    s.pop();
    return '/' + s.join('/');
  },
  name(p) {
    const s = JCR.segs(p);
    return s[s.length - 1] || '';
  },
  join(a, b) {
    return (a === '/' ? '' : a.replace(/\/$/, '')) + '/' + b;
  },
  // Creates any missing node on the way (like JcrUtil.createPath)
  ensure(root, p, type) {
    let n = root;
    for (const s of JCR.segs(p)) {
      let c = n.children.find(x => x.name === s);
      if (!c) {
        c = JCR.node(s, { 'jcr:primaryType': type || 'nt:unstructured' });
        n.children.push(c);
      }
      n = c;
    }
    return n;
  },
  // Adds or replaces a child, keeping its position when replacing
  put(root, parentPath, child) {
    const p = JCR.ensure(root, parentPath);
    const i = p.children.findIndex(c => c.name === child.name);
    if (i >= 0) p.children[i] = child;
    else p.children.push(child);
    return child;
  },
  remove(root, p) {
    const par = JCR.get(root, JCR.parent(p));
    if (!par) return false;
    const before = par.children.length;
    par.children = par.children.filter(c => c.name !== JCR.name(p));
    return par.children.length < before;
  },
  clone(n) {
    return JSON.parse(JSON.stringify(n));
  },
  unique(parent, base) {
    if (!parent || !parent.children.some(c => c.name === base)) return base;
    let i = 0;
    while (parent.children.some(c => c.name === base + '_' + i)) i++;
    return base + '_' + i;
  },
  walk(n, path, fn) {
    fn(n, path);
    for (const c of n.children) JCR.walk(c, JCR.join(path, c.name), fn);
  },
  find(root, start, pred) {
    const out = [];
    const s = JCR.get(root, start);
    if (s) JCR.walk(s, start, (n, p) => { if (pred(n, p)) out.push({ node: n, path: p }); });
    return out;
  },
  // Same shape as Sling's default GET servlet (.json / .1.json / .infinity.json)
  toJSON(n, depth) {
    const o = {};
    for (const [k, v] of Object.entries(n.props)) {
      o[k] = typeof v === 'string' && v.startsWith('data:') ? `(binary, ${v.length} bytes)` : v;
    }
    if (depth !== 0) {
      for (const c of n.children) o[c.name] = JCR.toJSON(c, depth < 0 ? -1 : depth - 1);
    }
    return o;
  },
  type(n) {
    return n && n.props['jcr:primaryType'];
  },
};
