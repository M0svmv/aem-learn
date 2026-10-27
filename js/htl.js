/* A small HTL (Sightly) engine: renders the .html scripts of components you build under /apps.
   Supported: ${expressions} with @ context/join/format/i18n, data-sly-test/-list/-repeat/-text/-attribute/-element/-unwrap/
   -set/-use/-resource, <sly>, HTL comments, and the global objects properties, pageProperties, inheritedPageProperties,
   currentPage, resource, component, currentStyle and wcmmode. data-sly-template/-call and -include are not simulated. */

const HTL = (() => {
  class HtlError extends Error {}

  /* ---------- expression language ---------- */
  const OPS = ['||', '&&', '==', '!=', '<=', '>=', '<', '>', '!', '?', ':', '(', ')', '[', ']', '.', ',', '='];

  function tokenize(src) {
    const out = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "'" || c === '"') {
        let j = i + 1;
        let s = '';
        while (j < src.length && src[j] !== c) {
          if (src[j] === '\\' && j + 1 < src.length) { s += src[j + 1]; j += 2; continue; }
          s += src[j++];
        }
        if (j >= src.length) throw new HtlError(`Unterminated string in \${${src}}`);
        out.push({ t: 'str', v: s });
        i = j + 1;
        continue;
      }
      const num = /^\d+(\.\d+)?/.exec(src.slice(i));
      if (num) { out.push({ t: 'num', v: Number(num[0]) }); i += num[0].length; continue; }
      const id = /^[A-Za-z_][\w]*/.exec(src.slice(i));
      if (id) { out.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
      const op = OPS.find(o => src.startsWith(o, i));
      if (op) { out.push({ t: 'op', v: op }); i += op.length; continue; }
      throw new HtlError(`Unexpected character '${c}' in \${${src}}`);
    }
    return out;
  }

  // Recursive descent: ternary > || > && > comparison > unary > member > primary
  function parse(tokens, src) {
    let p = 0;
    const peek = v => tokens[p] && tokens[p].t === 'op' && tokens[p].v === v;
    const expect = v => { if (!peek(v)) throw new HtlError(`Expected '${v}' in \${${src}}`); p++; };
    function ternary() {
      const c = or();
      if (peek('?')) { p++; const a = ternary(); expect(':'); const b = ternary(); return s => (truthy(c(s)) ? a(s) : b(s)); }
      return c;
    }
    function or() { let l = and(); while (peek('||')) { p++; const a = l, b = and(); l = s => { const v = a(s); return truthy(v) ? v : b(s); }; } return l; }
    function and() { let l = cmp(); while (peek('&&')) { p++; const a = l, b = cmp(); l = s => { const v = a(s); return truthy(v) ? b(s) : v; }; } return l; }
    function cmp() {
      let l = unary();
      for (const op of ['==', '!=', '<=', '>=', '<', '>']) {
        if (peek(op)) {
          p++;
          const a = l, b = unary();
          const f = { '==': (x, y) => x == y, '!=': (x, y) => x != y, '<=': (x, y) => x <= y, '>=': (x, y) => x >= y, '<': (x, y) => x < y, '>': (x, y) => x > y }[op]; // eslint-disable-line eqeqeq
          l = s => f(a(s), b(s));
          break;
        }
      }
      return l;
    }
    function unary() { if (peek('!')) { p++; const a = unary(); return s => !truthy(a(s)); } return member(); }
    function member() {
      let o = primary();
      for (;;) {
        if (peek('.')) {
          p++;
          const t = tokens[p++];
          if (!t || t.t !== 'id') throw new HtlError(`Expected a property name after '.' in \${${src}}`);
          const base = o;
          o = s => getProp(base(s), t.v);
        } else if (peek('[')) {
          p++;
          const k = ternary();
          expect(']');
          const base = o;
          o = s => getProp(base(s), k(s));
        } else return o;
      }
    }
    function primary() {
      const t = tokens[p++];
      if (!t) throw new HtlError(`Unexpected end of expression \${${src}}`);
      if (t.t === 'str' || t.t === 'num') return () => t.v;
      if (t.t === 'id') {
        if (t.v === 'true') return () => true;
        if (t.v === 'false') return () => false;
        return s => s[t.v];
      }
      if (t.v === '(') { const e = ternary(); expect(')'); return e; }
      if (t.v === '[') {
        const items = [];
        while (!peek(']')) { items.push(ternary()); if (peek(',')) p++; else break; }
        expect(']');
        return s => items.map(f => f(s));
      }
      throw new HtlError(`Unexpected '${t.v}' in \${${src}}`);
    }
    const e = tokens.length ? ternary() : () => '';
    if (p < tokens.length) throw new HtlError(`Unexpected '${tokens[p].v}' in \${${src}}`);
    return e;
  }

  function getProp(o, k) {
    if (o == null) return undefined;
    if (typeof o === 'object' || typeof o === 'function') return o[k];
    if (typeof o === 'string' && k === 'length') return o.length;
    return undefined;
  }

  function truthy(v) {
    if (Array.isArray(v)) return v.length > 0;
    return !!v && v !== 'false';
  }

  // "${expr @ name=value, flag}"
  function splitOptions(src) {
    let q = null;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === "'" || c === '"') q = c;
      else if (c === '@') return [src.slice(0, i), src.slice(i + 1)];
    }
    return [src, ''];
  }

  const CACHE = new Map();
  function compile(src) {
    if (CACHE.has(src)) return CACHE.get(src);
    const [main, optSrc] = splitOptions(src);
    const expr = parse(tokenize(main), src);
    const opts = [];
    if (optSrc.trim()) {
      const toks = tokenize(optSrc);
      let i = 0;
      while (i < toks.length) {
        const name = toks[i++];
        if (!name || name.t !== 'id') throw new HtlError(`Bad option in \${${src}}`);
        if (toks[i] && toks[i].t === 'op' && toks[i].v === '=') {
          i++;
          let depth = 0;
          const start = i;
          while (i < toks.length && !(depth === 0 && toks[i].t === 'op' && toks[i].v === ',')) {
            if (toks[i].t === 'op' && (toks[i].v === '(' || toks[i].v === '[')) depth++;
            if (toks[i].t === 'op' && (toks[i].v === ')' || toks[i].v === ']')) depth--;
            i++;
          }
          opts.push([name.v, parse(toks.slice(start, i), src)]);
        } else opts.push([name.v, () => true]);
        if (toks[i] && toks[i].v === ',') i++;
      }
    }
    const c = { expr, opts };
    CACHE.set(src, c);
    return c;
  }

  function evalExpr(src, scope) {
    const { expr, opts } = compile(src);
    let v = expr(scope);
    const o = {};
    for (const [k, f] of opts) o[k] = f(scope);
    if (o.format !== undefined && typeof v === 'string') {
      const args = [].concat(o.format);
      v = v.replace(/\{(\d+)\}/g, (m, n) => (args[n] != null ? args[n] : ''));
    }
    if (o.join !== undefined && Array.isArray(v)) v = v.join(o.join);
    return { v, ctx: o.context };
  }

  /* ---------- output ---------- */
  const escHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const URI_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'poster']);

  function str(v) {
    if (v == null || v === false) return '';
    if (Array.isArray(v)) return v.join(',');
    if (typeof v === 'object') return '';
    return String(v);
  }

  // XSS protection: the output context decides how a value is escaped (like the real HTL engine)
  function display(v, ctx, where) {
    const s = str(v);
    const c = ctx || (where && URI_ATTRS.has(where) ? 'uri' : where ? 'attribute' : 'text');
    if (c === 'unsafe') return s;
    if (c === 'html') return sanitizeHtml(s);
    if (c === 'number') return String(Number(s) || 0);
    if (c === 'uri') return /^(https?:|mailto:|tel:|\/|#|\.|[\w-]+(\/|\.|$))/i.test(s.trim()) || !s ? escHtml(s) : '';
    return escHtml(s);
  }

  function interpolate(text, scope, where) {
    if (/\$\{(?![^}]*\})/.test(text)) throw new HtlError(`Unclosed expression: ${text.trim().slice(0, 60)}`);
    return text.replace(/\$\{([\s\S]*?)\}/g, (m, src) => {
      const { v, ctx } = evalExpr(src, scope);
      return display(v, ctx, where);
    });
  }

  // a value that is exactly one ${…} keeps its type (for tests, lists, attribute removal)
  function single(text, scope) {
    const m = /^\s*\$\{([\s\S]*)\}\s*$/.exec(text || '');
    if (m && !/\$\{/.test(m[1])) return evalExpr(m[1], scope).v;
    return text && /\$\{/.test(text) ? interpolate(text, scope) : text;
  }

  /* ---------- template walk ---------- */
  function renderChildren(node, scope, env) {
    let out = '';
    node.childNodes.forEach(c => { out += renderNode(c, scope, env); });
    return out;
  }

  function renderNode(node, scope, env) {
    if (node.nodeType === 3) return interpolate(node.textContent, scope);
    if (node.nodeType === 8) return node.textContent.trim().startsWith('/*') ? '' : `<!--${node.textContent}-->`;
    if (node.nodeType !== 1) return '';
    return renderElement(node, scope, env);
  }

  function renderElement(el, scope, env) {
    const sly = [...el.attributes].filter(a => a.name.startsWith('data-sly-'));
    scope = Object.create(scope);
    const get = name => sly.find(a => a.name === name || a.name.startsWith(name + '.'));
    const ident = a => (a.name.split('.')[1] || '');

    for (const a of sly.filter(x => x.name.startsWith('data-sly-set.'))) scope[ident(a)] = single(a.value, scope);
    for (const a of sly.filter(x => x.name.startsWith('data-sly-use.') || x.name === 'data-sly-use')) {
      const cls = str(single(a.value, scope));
      scope[ident(a) || cls.split('.').pop()] = env.use(cls);
    }
    const test = get('data-sly-test');
    if (test) {
      const v = single(test.value, scope);
      if (ident(test)) scope[ident(test)] = v;
      if (!truthy(v)) return '';
    }
    for (const kind of ['data-sly-repeat', 'data-sly-list']) {
      const a = get(kind);
      if (!a) continue;
      let list = single(a.value, scope);
      if (list && !Array.isArray(list)) list = typeof list === 'object' ? Object.keys(list) : [list];
      list = list || [];
      const name = ident(a) || 'item';
      const iter = (fn) => list.map((item, index) => {
        const s = Object.create(scope);
        s[name] = item;
        s[name + 'List'] = { index, count: index + 1, first: index === 0, last: index === list.length - 1, middle: index > 0 && index < list.length - 1, odd: index % 2 === 1, even: index % 2 === 0, size: list.length };
        return fn(s);
      }).join('');
      const rest = [...el.attributes].filter(x => x !== a);
      if (kind === 'data-sly-repeat') return iter(s => renderTag(el, rest, s, env));
      return renderTag(el, rest, scope, env, () => iter(s => renderChildren(el, s, env)));
    }
    return renderTag(el, el.attributes, scope, env);
  }

  function renderTag(el, attrs, scope, env, inner) {
    attrs = [...attrs];
    const has = n => attrs.find(a => a.name === n || a.name.startsWith(n + '.'));
    let tag = el.tagName.toLowerCase();
    const elAttr = has('data-sly-element');
    if (elAttr) {
      const t = str(single(elAttr.value, scope)).toLowerCase();
      if (/^(h[1-6]|p|div|span|section|article|aside|header|footer|nav|main|a|ul|ol|li|strong|em|b|i|blockquote|figure|figcaption)$/.test(t)) tag = t;
    }
    let body;
    const textA = has('data-sly-text');
    const resA = has('data-sly-resource');
    if (textA) {
      const m = /^\s*\$\{([\s\S]*)\}\s*$/.exec(textA.value);
      body = m ? (r => display(r.v, r.ctx))(evalExpr(m[1], scope)) : escHtml(textA.value);
    } else if (resA) {
      body = env.resource(resA.value, scope);
    } else if (has('data-sly-include')) {
      body = '<!-- data-sly-include is not simulated in the lab -->';
    } else if (has('data-sly-call') || has('data-sly-template')) {
      throw new HtlError('data-sly-template / data-sly-call are not simulated in the lab.');
    } else body = inner ? inner() : renderChildren(el.content || el, scope, env);

    const unwrap = has('data-sly-unwrap');
    if (tag === 'sly' || (unwrap && (!unwrap.value || truthy(single(unwrap.value, scope))))) return body;

    const out = [];
    for (const a of attrs) {
      if (a.name.startsWith('data-sly-')) continue;
      if (!/\$\{/.test(a.value)) { out.push(`${a.name}="${escHtml(a.value)}"`); continue; }
      const one = /^\s*\$\{([\s\S]*)\}\s*$/.exec(a.value);
      if (one && !/\$\{/.test(one[1])) {
        // a lone expression: false/empty removes the attribute, true leaves just its name
        const res = evalExpr(one[1], scope);
        if (res.v === false || res.v == null || res.v === '') continue;
        out.push(res.v === true ? a.name : `${a.name}="${display(res.v, res.ctx, a.name)}"`);
      } else out.push(`${a.name}="${interpolate(a.value, scope, a.name)}"`);
    }
    for (const a of attrs.filter(x => x.name.startsWith('data-sly-attribute'))) {
      const name = a.name.split('.')[1];
      const v = single(a.value, scope);
      if (name) { if (truthy(v) || v === 0) out.push(`${name}="${display(v, null, name)}"`); } else if (v && typeof v === 'object') {
        for (const [k, val] of Object.entries(v)) if (truthy(val)) out.push(`${k}="${display(val, null, k)}"`);
      }
    }
    const open = `<${tag}${out.length ? ' ' + out.join(' ') : ''}>`;
    return VOID.has(tag) ? open : `${open}${body}</${tag}>`;
  }

  /* ---------- global objects ---------- */
  function pageObject(r, path) {
    if (!path || !JCR.get(r, path)) return null;
    const c = () => (JCR.get(r, path + '/jcr:content') || { props: {} }).props;
    return {
      path, name: JCR.name(path), depth: JCR.segs(path).length,
      get title() { return c()['jcr:title'] || JCR.name(path); },
      get navigationTitle() { return c().navTitle || c()['jcr:title'] || JCR.name(path); },
      get pageTitle() { return c().pageTitle; },
      get description() { return c()['jcr:description']; },
      get language() { return c()['jcr:language'] || 'en'; },
      get template() { return { path: c()['cq:template'], name: JCR.name(c()['cq:template'] || '') }; },
      get lastModified() { return c()['cq:lastModified']; },
      get properties() { return c(); },
      get hideInNav() { return !!c().hideInNav; },
      get parent() { return pageObject(r, JCR.parent(path)); },
      get listChildren() { return (JCR.get(r, path).children || []).filter(n => JCR.type(n) === 'cq:Page').map(n => pageObject(r, path + '/' + n.name)); },
    };
  }

  function inherited(r, pagePath) {
    const out = {};
    for (let p = pagePath; p && p !== '/'; p = JCR.parent(p)) {
      const c = JCR.get(r, p + '/jcr:content');
      if (c) for (const [k, v] of Object.entries(c.props)) if (!(k in out)) out[k] = v;
    }
    return out;
  }

  /* render(src, { r, t, ctx, scriptPath, renderChild }) → html */
  function render(src, o) {
    const { r, t, ctx } = o;
    const node = JCR.get(r, t.path);
    const comp = componentNode(r, t.rt);
    const warnings = [];
    const scope = {
      properties: t.props || {},
      pageProperties: ctx.pagePath ? (JCR.get(r, ctx.pagePath + '/jcr:content') || { props: {} }).props : {},
      inheritedPageProperties: ctx.pagePath ? inherited(r, ctx.pagePath) : {},
      currentPage: pageObject(r, ctx.pagePath),
      resource: { name: JCR.name(t.path), path: t.path, resourceType: t.rt, valueMap: t.props || {}, get children() { return node ? node.children.filter(isCmpNode).map(c => ({ name: c.name, path: t.path + '/' + c.name, resourceType: c.props['sling:resourceType'], valueMap: c.props })) : []; } },
      component: { name: String(t.rt).split('/').pop(), path: comp ? '/apps/' + t.rt : t.rt, title: comp ? comp.props['jcr:title'] : '' },
      currentStyle: (getPolicy(r, ctx.tpl, t.pkey) || { props: {} }).props,
      wcmmode: { edit: !!ctx.editing, disabled: !ctx.editing, preview: false },
    };
    const env = {
      use(cls) {
        if (/HelloWorldModel$/.test(cls)) return { message: `Hello World!\nResource type is: ${t.rt || 'No resourceType'}\nCurrent page is:  ${ctx.pagePath || ''}\n` };
        // stand-ins for the Core Component Sling Models, so an HTL override in /apps can use them
        const p = t.props || {};
        const policy = getPolicy(r, ctx.tpl, t.pkey);
        if (/components\.models\.Title$/.test(cls)) return { text: p['jcr:title'] || ctx.pageTitle, type: titleType(t, policy), link: p.linkURL ? { url: p.linkURL + '.html' } : null };
        if (/components\.models\.Text$/.test(cls)) return { text: p.text, isRichText: String(p.textIsRich) === 'true' };
        if (/components\.models\.Image$/.test(cls)) return { src: p.fileReference ? assetSrc(r, p.fileReference) : null, alt: p.alt || '', fileReference: p.fileReference };
        if (/components\.models\.Button$/.test(cls)) return { text: p['jcr:title'], link: { url: p.linkURL ? p.linkURL + '.html' : '#' } };
        if (/\.js$/.test(cls)) { warnings.push(`JavaScript Use-API (${cls}) is not run in the lab`); return {}; }
        warnings.push(`Sling Model ${cls} is Java — the lab cannot run it, so its fields are empty`);
        return {};
      },
      resource(value, sc) {
        const m = /^\s*\$\{([\s\S]*)\}\s*$/.exec(value);
        let name = value;
        let rtOpt;
        if (m) {
          const [main, optSrc] = splitOptions(m[1]);
          name = parse(tokenize(main), m[1])(sc);
          const ro = /resourceType\s*=\s*['"]([^'"]+)['"]/.exec(optSrc || '');
          rtOpt = ro && ro[1];
        }
        const childPath = String(name).startsWith('/') ? String(name) : t.path + '/' + name;
        return o.renderChild(childPath, rtOpt);
      },
    };
    const tpl = document.createElement('template');
    tpl.innerHTML = src;
    const html = renderChildren(tpl.content, scope, env);
    return { html, warnings };
  }

  return { render, HtlError, evalExpr: (src, scope) => evalExpr(src, scope).v };
})();
