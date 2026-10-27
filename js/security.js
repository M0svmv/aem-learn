/* Users, groups and permissions (Tools → Security), stored like Oak does it:
   users in /home/users, groups in /home/groups (rep:members), and access control entries in <path>/rep:policy
   (rep:GrantACE / rep:DenyACE with rep:principalName and rep:privileges). Admins can "Impersonate as" another user. */

const SEC_USERS = '/security/users.html';
const SEC_GROUPS = '/security/groups.html';
const SEC_PERMS = '/security/permissions.html';

const PRIVS = [
  ['jcr:read', 'Read'],
  ['jcr:modifyProperties', 'Modify'],
  ['jcr:addChildNodes', 'Create'],
  ['jcr:removeNode', 'Delete'],
  ['crx:replicate', 'Replicate'],
  ['jcr:readAccessControl', 'Read ACL'],
  ['jcr:modifyAccessControl', 'Edit ACL'],
];
// aggregate privileges
const PRIV_AGG = {
  'rep:write': ['jcr:modifyProperties', 'jcr:addChildNodes', 'jcr:removeNode', 'jcr:removeChildNodes'],
  'jcr:all': ['jcr:read', 'jcr:modifyProperties', 'jcr:addChildNodes', 'jcr:removeNode', 'jcr:removeChildNodes', 'crx:replicate', 'jcr:readAccessControl', 'jcr:modifyAccessControl', 'jcr:versionManagement'],
};
const expandPrivs = list => [...new Set([].concat(list || []).flatMap(p => [p, ...(PRIV_AGG[p] || [])]))];

/* ---------- authorizables ---------- */
function authorizables(r, kind) {
  const base = JCR.get(r, kind === 'group' ? '/home/groups' : '/home/users');
  const out = [];
  if (base) JCR.walk(base, kind === 'group' ? '/home/groups' : '/home/users', (n, p) => { if (JCR.type(n) === (kind === 'group' ? 'rep:Group' : 'rep:User')) out.push({ id: n.props['rep:authorizableId'] || n.name, path: p, node: n }); });
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
const findAuth = (r, id) => authorizables(r, 'user').concat(authorizables(r, 'group')).find(a => a.id === id);
const authPath = (kind, id) => `/home/${kind === 'group' ? 'groups' : 'users'}/${id[0].toLowerCase()}/${id}`;

function displayName(a) {
  const pr = JCR.get(a.node, 'profile');
  const n = pr ? [pr.props.givenName, pr.props.familyName].filter(Boolean).join(' ') : '';
  return n || a.node.props['jcr:title'] || a.id;
}

// direct + inherited groups (a group can be a member of another group), plus "everyone"
function groupsOf(r, id) {
  const groups = authorizables(r, 'group');
  const out = new Set(['everyone']);
  const add = member => groups.forEach(g => { if ((g.node.props['rep:members'] || []).includes(member) && !out.has(g.id)) { out.add(g.id); add(g.id); } });
  add(id);
  return [...out];
}

/* ---------- access control ---------- */
function acesAt(r, path) {
  const pol = JCR.get(r, (path === '/' ? '' : path) + '/rep:policy');
  return pol ? pol.children.map(c => ({ name: c.name, principal: c.props['rep:principalName'], privs: [].concat(c.props['rep:privileges'] || []), allow: JCR.type(c) !== 'rep:DenyACE', path })) : [];
}

function isAdmin(r, id) {
  return id === 'admin' || groupsOf(r, id).includes('administrators');
}

// Oak-style evaluation: the closest node with a matching entry decides; on a node, entries for the user beat group
// entries, and a later entry beats an earlier one. No matching entry anywhere = denied.
function can(r, id, path, priv) {
  if (isAdmin(r, id)) return { ok: true, why: 'administrators have every privilege' };
  const groups = groupsOf(r, id);
  for (let p = path; ; p = JCR.parent(p)) {
    const aces = acesAt(r, p);
    for (const set of [aces.filter(a => a.principal === id), aces.filter(a => groups.includes(a.principal))]) {
      for (let i = set.length - 1; i >= 0; i--) {
        if (expandPrivs(set[i].privs).includes(priv)) return { ok: set[i].allow, why: `${set[i].allow ? 'allow' : 'deny'} for ${set[i].principal} on ${p}`, ace: set[i] };
      }
    }
    if (p === '/') break;
  }
  return { ok: false, why: 'no entry grants it (denied by default)' };
}

const curUser = () => S.ui.user || 'admin';
// the lab's own screens ask "may the current user do this here?"
function secCan(path, priv) {
  return can(AR(), curUser(), path, priv).ok;
}
function secDenied(what, path, priv) {
  toast(`<b>${esc(curUser())}</b> may not ${what}: missing <code>${priv}</code> on <code>${esc(path)}</code>.`, 'error');
  flag('sec:denied:' + priv);
}

function addAce(r, path, principal, privs, allow) {
  const node = JCR.get(r, path);
  if (!node) return false;
  let pol = JCR.get(node, 'rep:policy');
  if (!pol) { pol = JCR.node('rep:policy', { 'jcr:primaryType': 'rep:ACL' }); node.children.push(pol); }
  const base = allow ? 'allow' : 'deny';
  pol.children.push(JCR.node(JCR.unique(pol, base), { 'jcr:primaryType': allow ? 'rep:GrantACE' : 'rep:DenyACE', 'rep:principalName': principal, 'rep:privileges': privs }));
  return true;
}

/* ---------- seed ---------- */
function seedSecurity(root) {
  if (JCR.get(root, '/home/groups/a/administrators')) return false;
  const user = (id, given, family, email) => {
    at(root, authPath('user', id), { 'jcr:primaryType': 'rep:User', 'rep:authorizableId': id, 'rep:principalName': id, 'rep:password': '{SHA-256}…' });
    at(root, authPath('user', id) + '/profile', { 'jcr:primaryType': 'nt:unstructured', givenName: given, familyName: family, email });
  };
  user('admin', 'Administrator', '', 'admin@example.com');
  user('omar', 'Omar', 'Haddad', 'omar@wknd.example');
  const group = (id, title, members) => at(root, authPath('group', id), { 'jcr:primaryType': 'rep:Group', 'rep:authorizableId': id, 'rep:principalName': id, 'jcr:title': title, 'rep:members': members });
  group('administrators', 'Administrators', ['admin']);
  group('content-authors', 'Content Authors', ['omar']);
  // everyone may read the code and configuration the pages need; content authors may read and write the WKND site
  const ace = (path, principal, privs, allow) => {
    const n = JCR.get(root, path);
    if (!n) return;
    let pol = JCR.get(n, 'rep:policy');
    if (!pol) { pol = JCR.node('rep:policy', { 'jcr:primaryType': 'rep:ACL' }); n.children.push(pol); }
    pol.children.push(JCR.node(JCR.unique(pol, allow ? 'allow' : 'deny'), { 'jcr:primaryType': allow ? 'rep:GrantACE' : 'rep:DenyACE', 'rep:principalName': principal, 'rep:privileges': privs }));
  };
  for (const p of ['/apps', '/libs', '/conf', '/etc']) ace(p, 'everyone', ['jcr:read'], true);
  ace('/content/wknd', 'content-authors', ['jcr:read', 'rep:write'], true);
  ace('/content/dam', 'content-authors', ['jcr:read', 'rep:write'], true);
  ace('/content/experience-fragments', 'content-authors', ['jcr:read', 'rep:write'], true);
  return true;
}

/* ---------- consoles ---------- */
const secRow = cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;

function securityShell(title, body, createAct) {
  return shell(title, `${titleBar('', `<span class="tb-crumb">${esc(title)}</span>`, createAct ? `<button class="btn primary" data-act="${createAct}">Create</button>` : '')}<div class="sec">${body}</div>`);
}

function usersScreen(id) {
  const r = AR();
  flag('visit:sec:users');
  if (id) {
    const a = findAuth(r, id);
    if (!a || JCR.type(a.node) !== 'rep:User') return securityShell('Users', `<p>User <code>${esc(id)}</code> not found.</p>`);
    const pr = JCR.get(a.node, 'profile') || { props: {} };
    const groups = authorizables(r, 'group');
    const mine = groups.filter(g => (g.node.props['rep:members'] || []).includes(id));
    return securityShell('Users', `<a href="#" data-act="go" data-url="${SEC_USERS}">← Users</a>
      <h2>${esc(displayName(a))} <small class="muted">${esc(id)}</small></h2>
      <div class="sec-cols"><div class="sec-box"><h4>Details</h4><dl class="kv"><dt>ID</dt><dd>${esc(id)}</dd><dt>Email</dt><dd>${esc(pr.props.email || '—')}</dd><dt>Node</dt><dd><code>${esc(a.path)}</code></dd>
        <dt>All groups</dt><dd>${groupsOf(r, id).map(g => `<code>${esc(g)}</code>`).join(' ')}</dd></dl></div>
      <div class="sec-box"><h4>Groups</h4>${mine.map(g => `<div class="sec-chip">${esc(g.id)} <a href="#" data-act="secLeave" data-user="${esc(id)}" data-group="${esc(g.id)}" title="Remove from group">✕</a></div>`).join('') || '<p class="muted">No groups yet.</p>'}
        <div class="sec-add"><select id="sec-join">${groups.filter(g => !mine.includes(g)).map(g => `<option value="${esc(g.id)}">${esc(g.id)}</option>`).join('')}</select><button class="btn small" data-act="secJoin" data-user="${esc(id)}">Add to group</button></div></div></div>
      <p class="hint">A user gets the permissions of every group it belongs to (and of <code>everyone</code>). Give permissions to <b>groups</b>, not to single users.</p>`);
  }
  const users = authorizables(r, 'user');
  return securityShell('Users', `<table class="grid sec-table"><tr><th>ID</th><th>Name</th><th>Email</th><th>Groups</th></tr>
    ${users.map(u => secRow([`<a href="#" data-act="go" data-url="${SEC_USERS}/${esc(u.id)}">${esc(u.id)}</a>`, esc(displayName(u)), esc((JCR.get(u.node, 'profile') || { props: {} }).props.email || ''), groupsOf(r, u.id).filter(g => g !== 'everyone').map(esc).join(', ')])).join('')}</table>`, 'secUserCreate');
}

function groupsScreen(id) {
  const r = AR();
  flag('visit:sec:groups');
  if (id) {
    const g = findAuth(r, id);
    if (!g || JCR.type(g.node) !== 'rep:Group') return securityShell('Groups', `<p>Group <code>${esc(id)}</code> not found.</p>`);
    const members = g.node.props['rep:members'] || [];
    const all = authorizables(r, 'user').concat(authorizables(r, 'group')).filter(a => a.id !== id && !members.includes(a.id));
    return securityShell('Groups', `<a href="#" data-act="go" data-url="${SEC_GROUPS}">← Groups</a>
      <h2>${esc(g.node.props['jcr:title'] || id)} <small class="muted">${esc(id)}</small></h2>
      <div class="sec-box"><h4>Members</h4>${members.map(m => `<div class="sec-chip">${esc(m)} <a href="#" data-act="secLeave" data-user="${esc(m)}" data-group="${esc(id)}" title="Remove">✕</a></div>`).join('') || '<p class="muted">No members.</p>'}
        <div class="sec-add"><select id="sec-member">${all.map(a => `<option value="${esc(a.id)}">${esc(a.id)}</option>`).join('')}</select><button class="btn small" data-act="secAddMember" data-group="${esc(id)}">Add member</button></div></div>
      <p class="hint">Stored as <code>rep:members</code> on <code>${esc(g.path)}</code>. <a href="#" data-act="go" data-url="${SEC_PERMS}?p=${esc(id)}">Permissions of this group →</a></p>`);
  }
  const groups = authorizables(r, 'group');
  return securityShell('Groups', `<table class="grid sec-table"><tr><th>ID</th><th>Title</th><th>Members</th></tr>
    ${groups.map(g => secRow([`<a href="#" data-act="go" data-url="${SEC_GROUPS}/${esc(g.id)}">${esc(g.id)}</a>`, esc(g.node.props['jcr:title'] || ''), esc((g.node.props['rep:members'] || []).join(', '))])).join('')}
    ${secRow(['<code>everyone</code>', 'Everyone (built in)', '<span class="muted">every user</span>'])}</table>`, 'secGroupCreate');
}

function allAces(r, principal) {
  const out = [];
  JCR.walk(r, '/', (n, p) => { if (n.name === 'rep:policy') { const owner = p.replace(/\/?rep:policy$/, '') || '/'; acesAt(r, owner).forEach(a => { if (!principal || a.principal === principal) out.push(a); }); } });
  return out;
}

function permissionsScreen(query) {
  const r = AR();
  flag('visit:sec:perms');
  const sel = (/(?:^|&)p=([^&]+)/.exec(query || '') || [])[1];
  const principals = authorizables(r, 'group').map(g => g.id).concat(['everyone'], authorizables(r, 'user').map(u => u.id));
  const list = `<div class="sec-plist">${principals.map(p => `<a href="#" class="${p === sel ? 'on' : ''}" data-act="go" data-url="${SEC_PERMS}?p=${esc(p)}">${esc(p)}</a>`).join('')}</div>`;
  let main = '<p class="muted">Select a user or group on the left.</p>';
  if (sel) {
    const aces = allAces(r, sel);
    main = `<div class="sec-ptop"><h3>${esc(sel)}</h3><span class="spacer"></span><button class="btn" data-act="secTest" data-p="${esc(sel)}">Test Privileges</button><button class="btn primary" data-act="secAddAce" data-p="${esc(sel)}">Add ACE</button></div>
      <table class="grid sec-table"><tr><th>Path</th><th>Privileges</th><th>Type</th><th></th></tr>
      ${aces.map(a => secRow([`<code>${esc(a.path)}</code>`, a.privs.map(x => `<code>${esc(x)}</code>`).join(' '), a.allow ? '<span class="pill green">allow</span>' : '<span class="pill red">deny</span>', `<a href="#" data-act="secDelAce" data-path="${esc(a.path)}" data-name="${esc(a.name)}" title="Delete">✕</a>`])).join('') || '<tr><td colspan="4" class="muted">No access control entries for this principal.</td></tr>'}</table>
      <p class="hint">Each entry is a node under <code>&lt;path&gt;/rep:policy</code>. Entries are inherited by everything below the path; a closer entry wins.</p>`;
  }
  return securityShell('Permissions', `<div class="sec-perms">${list}<div class="sec-pmain">${main}</div></div>`);
}

/* ---------- actions ---------- */
A.secUserCreate = () => openModal({
  title: 'Create User',
  okLabel: 'Save & Close',
  body: `${field('ID *', 'id', '', 'The login name, e.g. <code>sara</code>')}${field('Password *', 'pass', '', '', 'password')}${field('First name', 'given', '')}${field('Last name', 'family', '')}${field('Email', 'email', '')}`,
  ok: b => {
    const f = formData(b);
    const id = String(f.id).trim().toLowerCase();
    if (!/^[a-z][a-z0-9._-]*$/.test(id) || !f.pass) { toast('ID (lower case) and password are required.', 'error'); return false; }
    if (findAuth(AR(), id)) { toast('That ID exists.', 'error'); return false; }
    at(AR(), authPath('user', id), { 'jcr:primaryType': 'rep:User', 'rep:authorizableId': id, 'rep:principalName': id, 'rep:password': '{SHA-256}…' });
    at(AR(), authPath('user', id) + '/profile', { 'jcr:primaryType': 'nt:unstructured', givenName: f.given, familyName: f.family, email: f.email });
    flag('sec:user:created');
    go(SEC_USERS + '/' + id);
  },
});

A.secGroupCreate = () => openModal({
  title: 'Create Group',
  okLabel: 'Save & Close',
  body: `${field('ID *', 'id', '', 'e.g. <code>wknd-editors</code>')}${field('Title', 'title', '')}`,
  ok: b => {
    const f = formData(b);
    const id = String(f.id).trim().toLowerCase();
    if (!/^[a-z][a-z0-9._-]*$/.test(id)) { toast('Invalid group ID.', 'error'); return false; }
    if (findAuth(AR(), id)) { toast('That ID exists.', 'error'); return false; }
    at(AR(), authPath('group', id), { 'jcr:primaryType': 'rep:Group', 'rep:authorizableId': id, 'rep:principalName': id, 'jcr:title': f.title || id, 'rep:members': [] });
    flag('sec:group:created');
    go(SEC_GROUPS + '/' + id);
  },
});

function secMember(group, member, add) {
  const g = findAuth(AR(), group);
  if (!g) return;
  const m = [].concat(g.node.props['rep:members'] || []).filter(x => x !== member);
  if (add) m.push(member);
  g.node.props['rep:members'] = m;
  if (add) flag('sec:member');
  commit();
}
A.secJoin = d => { const v = (document.getElementById('sec-join') || {}).value; if (v) secMember(v, d.user, true); };
A.secAddMember = d => { const v = (document.getElementById('sec-member') || {}).value; if (v) secMember(d.group, v, true); };
A.secLeave = d => secMember(d.group, d.user, false);

A.secAddAce = d => openModal({
  title: `Add ACE <small>${esc(d.p)}</small>`,
  okLabel: 'Add',
  body: `${field('Path *', 'path', '/content/wknd', 'Applies to this node and everything below it')}
    <label class="field"><span>Type</span><select name="type"><option value="allow">Allow</option><option value="deny">Deny</option></select></label>
    <h5>Privileges</h5>${[['jcr:read', 'Read'], ['rep:write', 'Write (modify, create, delete)'], ['crx:replicate', 'Replicate (publish)'], ['jcr:modifyProperties', 'Modify properties only'], ['jcr:readAccessControl', 'Read ACL'], ['jcr:modifyAccessControl', 'Edit ACL'], ['jcr:all', 'All']].map(([v, l]) => `<label class="check"><input type="checkbox" name="priv" data-multi="1" value="${v}"> ${l} <code class="muted">${v}</code></label>`).join('')}`,
  ok: b => {
    const f = formData(b);
    const privs = [].concat(f.priv || []).filter(Boolean);
    if (!privs.length) { toast('Pick at least one privilege.', 'error'); return false; }
    if (!addAce(AR(), String(f.path).trim(), d.p, privs, f.type !== 'deny')) { toast('That path does not exist.', 'error'); return false; }
    flag('sec:ace');
    if (f.type === 'deny') flag('sec:ace:deny');
    commit();
  },
});

A.secDelAce = d => {
  const pol = JCR.get(AR(), (d.path === '/' ? '' : d.path) + '/rep:policy');
  if (!pol) return;
  pol.children = pol.children.filter(c => c.name !== d.name);
  commit();
};

A.secTest = d => {
  const path = (S.ui.secTestPath || SITE_ROOT);
  const show = (p) => PRIVS.map(([priv, label]) => { const c = can(AR(), d.p, p, priv); return `<tr><td>${label} <code class="muted">${priv}</code></td><td>${c.ok ? '<span class="pill green">✔</span>' : '<span class="pill red">✘</span>'}</td><td class="muted small">${esc(c.why)}</td></tr>`; }).join('');
  openModal({
    title: `Test Privileges <small>${esc(d.p)}</small>`,
    hideOk: true,
    wide: true,
    body: `<label class="field"><span>Path</span><input id="sec-test-path" value="${esc(path)}"></label><table class="grid sec-table" id="sec-test-out">${show(path)}</table>`,
    onMount: b => b.querySelector('#sec-test-path').addEventListener('input', e => {
      S.ui.secTestPath = e.target.value;
      if (JCR.get(AR(), e.target.value)) b.querySelector('#sec-test-out').innerHTML = show(e.target.value);
    }),
  });
  flag('sec:test');
};

A.impersonate = () => openModal({
  title: 'Impersonate as',
  okLabel: 'OK',
  body: `<label class="field"><span>User</span><select name="u">${authorizables(AR(), 'user').filter(u => u.id !== curUser()).map(u => `<option value="${esc(u.id)}">${esc(u.id)} — ${esc(displayName(u))}</option>`).join('')}</select></label>
    <p class="hint">You will see and do exactly what that user may do, until you <b>Revert to Self</b>.</p>`,
  ok: b => {
    S.ui.user = formData(b).u;
    flag('sec:impersonate');
    goSites('/content');
  },
});
A.revertSelf = () => {
  S.ui.user = 'admin';
  commit();
};
