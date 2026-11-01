/* Author UI: login, start/tools consoles, Sites, Assets and Templates consoles */

const TEMPLATES_URL = '/libs/wcm/core/content/sites/templates.html/conf/wknd';
const XF_URL = '/aem/experience-fragments.html/content/experience-fragments';
const CFM_URL = '/libs/dam/cfm/models/console/content/models.html/conf/wknd';
const GRAPHIQL_URL = '/aem/graphiql.html';
const WF_MODELS_URL = '/libs/cq/workflow/admin/console/content/models.html';
const WF_INSTANCES_URL = '/libs/cq/workflow/admin/console/content/instances.html';

function routeAuthor(url) {
  const [path, query] = url.split('?');
  if (!S.loggedIn) return loginScreen();
  if (path === '/' || path === '/aem/start.html') return startScreen();
  if (path === '/aem/tools.html') return toolsScreen();
  if (path === '/aem/inbox') return inboxScreen();
  if (!isAdmin(AR(), curUser()) && /^\/(crx\/|system\/console|etc\/replication|bin\/querybuilder|security\/)|^\/libs\/cq\/search/.test(path)) {
    flag('sec:denied:console');
    return shell('Forbidden', `<div class="pad"><h3>403 Forbidden</h3><p><b>${esc(curUser())}</b> may not open <code>${esc(path)}</code>. Developer and security consoles are for administrators.</p></div>`);
  }
  if (path.startsWith(SEC_USERS)) return usersScreen(decodeURIComponent(path.slice(SEC_USERS.length + 1)));
  if (path.startsWith(SEC_GROUPS)) return groupsScreen(decodeURIComponent(path.slice(SEC_GROUPS.length + 1)));
  if (path === SEC_PERMS) return permissionsScreen(query);
  if (path === QB_URL) return queryDebugScreen();
  if (path === '/bin/querybuilder.json') return querybuilderJson('author', query);
  if (path.startsWith('/sites.html')) return sitesScreen(path.slice('/sites.html'.length) || '/content');
  if (path.startsWith('/aem/experience-fragments.html')) return sitesScreen(path.slice('/aem/experience-fragments.html'.length) || XF_ROOT);
  if (path.startsWith('/libs/dam/cfm/models/console/content/models.html')) return cfmScreen();
  if (path.startsWith('/frontend/')) return frontendRoute('author', path);
  if (path === '/libs/launches/content/launches.html') return launchesScreen();
  if (path === '/libs/msm/wcm/content/rolloutconfigs.html') return rolloutConfigsScreen();
  if (path.startsWith('/mnt/overlay/wcm/core/content/sites/createsitewizard.html')) return siteWizardScreen(path.slice('/mnt/overlay/wcm/core/content/sites/createsitewizard.html'.length));
  if (path.startsWith('/mnt/overlay/wcm/core/content/sites/createpagewizard.html')) return cpwScreen(path.slice('/mnt/overlay/wcm/core/content/sites/createpagewizard.html'.length));
  if (path.startsWith('/mnt/overlay/wcm/core/content/sites/createlivecopywizard.html')) return lcvWizardScreen(path.slice('/mnt/overlay/wcm/core/content/sites/createlivecopywizard.html'.length));
  if (path.startsWith('/mnt/overlay/wcm/core/content/sites/createlanguagecopywizard.html')) return lcWizardScreen(path.slice('/mnt/overlay/wcm/core/content/sites/createlanguagecopywizard.html'.length));
  if (path.startsWith('/mnt/overlay/dam/cfm/models/editor/content/editor.html')) return cfmEditor(path.slice('/mnt/overlay/dam/cfm/models/editor/content/editor.html'.length));
  if (path === GRAPHIQL_URL) return graphiqlScreen(query);
  if (path.startsWith('/graphql/execute.json/')) return graphqlRoute('author', path);
  if (path.startsWith('/assets.html')) return assetsScreen(path.slice('/assets.html'.length) || '/content/dam');
  if (path === TEMPLATES_URL) return templatesScreen();
  if (path === WF_MODELS_URL) return wfModelsScreen();
  if (path === WF_INSTANCES_URL) return wfInstancesScreen();
  if (path.startsWith('/editor.html')) return editorRoute(path.slice('/editor.html'.length), query);
  if (path.startsWith('/etc/replication')) return replicationScreen('author', path);
  if (path.startsWith('/crx/packmgr')) return packMgrScreen('author');
  if (path.startsWith('/crx/de')) return crxdeScreen('author', url);
  if (path.startsWith('/system/console')) return webConsole('author', path);
  if (path.startsWith('/libs/granite/core/content/login')) return startScreen();
  return contentRoute('author', path, query);
}

// The global shell header of the Touch UI
function shell(title, body) {
  const inbox = S.wf.inbox.length;
  return `<div class="aem">
    <div class="shell-head">
      <a class="shell-brand" href="#" data-act="go" data-url="/aem/start.html"><span class="brand-mark round"></span>Adobe Experience Manager</a>
      <div class="spacer"></div>
      <a class="shell-btn" href="#" title="Search (not in this lab)">${icon('Search')}</a>
      <a class="shell-btn" href="#" data-act="go" data-url="/aem/start.html" title="Solutions">${icon('Apps')}</a>
      <a class="shell-btn" href="#" data-act="toggleLessons" title="Help">${icon('Help')}</a>
      <a class="shell-btn" href="#" data-act="go" data-url="/aem/inbox" title="Notifications">${icon('Bell')}${inbox ? `<b class="count">${inbox}</b>` : ''}</a>
      <details class="dd right"><summary class="shell-btn avatar" title="admin">${icon('User')}</summary>
        <div class="dd-menu"><div class="dd-user"><span class="avatar-big">${icon('User', 24)}</span><b>${curUser() === 'admin' ? 'Administrator' : esc(curUser())}</b><small>${esc(curUser())}</small></div>
          ${curUser() !== 'admin' ? '<a href="#" data-act="revertSelf">Revert to Self</a>' : '<a href="#" data-act="impersonate">Impersonate as…</a>'}
          <a href="#" data-act="logout">Sign Out</a></div></details>
    </div>
    <div class="aem-body" data-title="${esc(title)}">${body}</div>
  </div>`;
}

// The console title bar under the shell header: [rail] Title [right actions]
function titleBar(left, title, right) {
  return `<div class="titlebar"><div class="tb-left">${left || ''}</div><div class="tb-title">${title}</div><div class="tb-right">${right || ''}</div></div>`;
}

// Selection mode bar: quick actions on the left, "N selected ✕" on the right
function selectionBar(actions, closeAct) {
  return `<div class="selbar"><div class="sel-actions">${actions}</div>
    <div class="sel-right"><span>1 selected <i>(escape)</i></span><button class="iconbtn sel-close" data-act="${closeAct}" title="Exit selection (Esc)">${icon('Close')}</button></div></div>`;
}

function qa(act, ico, label, key, extra) {
  return `<button class="qa" data-act="${act}" ${extra || ''}>${icon(ico)}<span>${label}</span>${key ? `<kbd>(${key})</kbd>` : ''}</button>`;
}

function loginScreen() {
  return `<div class="login"><div class="login-inner">
    <div class="login-welcome"><span class="brand-mark big"></span><h1>Welcome to Adobe Experience Manager</h1>
      <p>localhost:${portOf('author')} · <i>simulated in the Practice Lab</i></p></div>
    <form class="login-box" data-submit="login">
      <input name="user" placeholder="User name" autocomplete="off" spellcheck="false">
      <input name="pass" type="password" placeholder="Password">
      <button class="btn primary">Sign In</button>
      <p class="hint">Default credentials on a local instance: <b>admin / admin</b></p>
    </form></div></div>`;
}

SUBMIT.login = f => {
  if (f.user === 'admin' && f.pass === 'admin') {
    S.loggedIn = true;
    flag('login');
    commit();
  } else toast('Invalid login. Hint: admin / admin', 'error');
};

A.logout = () => {
  S.loggedIn = false;
  commit();
};

/* ---------- Start & Tools ---------- */

// Left rail of the start page: Navigation (compass) and Tools (hammer)
function navRail(active) {
  return `<div class="nav-rail">
    <a href="#" class="${active === 'nav' ? 'on' : ''}" data-act="go" data-url="/aem/start.html" title="Navigation">${icon('Compass', 24)}</a>
    <a href="#" class="${active === 'tools' ? 'on' : ''}" data-act="go" data-url="/aem/tools.html" title="Tools">${icon('Hammer', 24)}</a></div>`;
}

// Tiles / tools that exist in AEM but are not simulated still show up, like in the real UI
A.notSimulated = d => toast(`<b>${esc(d.name)}</b> exists in AEM but is not simulated in the lab.`);

function startScreen() {
  flag('visit:start');
  const tiles = [
    ['Projects', 'Project', null],
    ['Sites', 'WebPages', '/sites.html/content'],
    ['Experience Fragments', 'DocumentFragment', XF_URL],
    ['Assets', 'Images', '/assets.html/content/dam', true],
    ['Forms', 'ViewList', null, true],
    ['Screens', 'DeviceTV', null],
    ['Personalization', 'PersonalizationField', null, true],
    ['Commerce', 'ShoppingCart', null, true],
    ['Communities', 'PeopleGroup', null, true],
  ];
  return shell('Navigation', `<div class="nav-wrap">${navRail('nav')}
    <div class="nav-col"><div class="nav-titlebar">Navigation</div>
    <div class="nav-main">
      <div class="nav-tiles">${tiles.map(([t, i, u, sub]) => `<a href="#" class="nav-tile" ${u ? `data-act="go" data-url="${u}"` : `data-act="notSimulated" data-name="${t}"`}>
        <span class="nt-ico">${icon(i, 48)}${sub ? `<i class="nt-sub">${icon('ChevronRight', 14)}</i>` : ''}</span>${t}</a>`).join('')}</div>
      <div class="lab-shortcuts"><b>Developer consoles</b> <small>(lab shortcuts — in real AEM you type these URLs)</small>
        <a href="#" data-act="go" data-url="/crx/de/index.jsp">CRXDE Lite</a>
        <a href="#" data-act="go" data-url="/crx/packmgr/index.jsp">Package Manager</a>
        <a href="#" data-act="go" data-url="/system/console/configMgr">Web Console (OSGi)</a>
        <a href="#" data-act="go" data-url="/system/console/status-slingsettings">Sling Settings</a>
        <a href="#" data-act="go" data-url="/etc/replication/agents.author.html">Replication agents</a>
        <a href="#" data-act="go" data-url="${QB_URL}">Query Debugger</a></div>
    </div></div></div>`);
}

// [title, icon, url or null, description]
const TOOL_CATS = {
  General: [
    ['Templates', 'FileTemplate', TEMPLATES_URL, 'Create, manage and edit page templates'],
    ['Tagging', 'ViewAllTags', null, 'Create and manage tags'],
    ['Configuration Browser', 'FolderGear', null, 'Manage configurations'],
    ['CRXDE Lite', 'Code', '/crx/de/index.jsp', 'Develop and manage the repository'],
    ['GraphQL Query Editor', 'Data', GRAPHIQL_URL, 'Write and test GraphQL queries for Content Fragments'],
    ['Persisted GraphQL Queries', 'DataSettings', GRAPHIQL_URL + '?tab=persisted', 'Manage persisted queries'],
  ],
  Workflow: [
    ['Models', 'Workflow', WF_MODELS_URL, 'Create, edit and run workflow models'],
    ['Instances', 'FileWorkflow', WF_INSTANCES_URL, 'Manage running workflow instances'],
    ['Launchers', 'Play', null, 'Start workflows on repository events'],
    ['Archive', 'Archive', null, 'Completed workflow instances'],
    ['Failures', 'AlertCircle', null, 'Failed workflow steps'],
  ],
  Operations: [
    ['Web Console', 'Gears', '/system/console/configMgr', 'OSGi bundles, components and configurations'],
    ['Health Reports', 'CheckmarkCircle', null, 'Check the health of the instance'],
    ['Diagnosis', 'Monitoring', null, 'Logs, requests and performance'],
    ['Maintenance', 'Calendar', null, 'Daily and weekly maintenance tasks'],
  ],
  Sites: [
    ['Blueprints', 'WebPages', null, 'Multi Site Manager blueprints'],
    ['Rollout Configurations', 'Sync', '/libs/msm/wcm/content/rolloutconfigs.html', 'How and when live copies are updated'],
    ['Launches', 'Launch', '/libs/launches/content/launches.html', 'Manage launches (future versions of pages)'],
  ],
  Assets: [
    ['Metadata Profiles', 'FileCode', null, 'Manage your metadata profiles'],
    ['Folder Metadata Schemas', 'FolderGear', null, 'Manage your folder metadata schemas'],
    ['Metadata Schemas', 'FileData', null, 'Manage metadata schema forms'],
    ['Desktop Tools for AEM', 'DeviceDesktop', null, 'Download additional desktop tools for AEM'],
    ['Insights Configuration', 'GraphBarVertical', null, 'Configure Adobe Analytics for Asset Insights'],
    ['Reports', 'Report', null, 'Create and manage reports'],
    ['Content Fragment Models', 'Table', CFM_URL, 'Manage Content Fragment Models'],
  ],
  Resources: [
    ['Image Presets', 'Image', null, 'Dynamic Media image presets'],
    ['Video Profiles', 'MovieCamera', null, 'Video encoding profiles'],
  ],
  Deployment: [
    ['Replication', 'Send', '/etc/replication/agents.author.html', 'Replication agents on author'],
    ['Packages', 'Box', '/crx/packmgr/index.jsp', 'Create, upload and install content packages'],
    ['Distribution', 'Servers', null, 'Sling Content Distribution agents'],
  ],
  Security: [
    ['Users', 'User', '/security/users.html', 'Manage users'],
    ['Groups', 'UserGroup', '/security/groups.html', 'Manage groups'],
    ['Permissions', 'Key', '/security/permissions.html', 'Manage access control'],
    ['Trust Store', 'Shield', null, 'Certificates'],
  ],
  'Cloud Services': [
    ['Legacy Cloud Services', 'Cloud', null, 'Older cloud configurations'],
    ['Adobe Target', 'Target', null, 'Connect to Adobe Target'],
  ],
  Communities: [['Sites', 'PeopleGroup', null, 'Community sites']],
  Commerce: [['Commerce Integration', 'ShoppingCart', null, 'Connect a commerce platform']],
};

function toolsScreen() {
  flag('visit:tools');
  const cat = TOOL_CATS[S.ui.toolsCat] ? S.ui.toolsCat : 'General';
  return shell('Tools', `<div class="nav-wrap">${navRail('tools')}
    <div class="nav-col"><div class="nav-titlebar">Tools</div>
    <div class="tools-wrap">
      <div class="tool-cats">${Object.keys(TOOL_CATS).map(c => `<a href="#" class="${c === cat ? 'on' : ''}" data-act="toolsCat" data-cat="${c}">${c}</a>`).join('')}</div>
      <div class="tool-cards">${TOOL_CATS[cat].map(([t, i, u, desc]) => `<a href="#" class="tool-card" ${u ? `data-act="go" data-url="${u}"` : `data-act="notSimulated" data-name="${t}"`}>
        <div class="tc-ico">${icon(i, 36)}</div><div class="tc-txt"><b>${t}</b><small>${desc}</small></div></a>`).join('')}</div>
    </div></div></div>`);
}

A.toolsCat = d => {
  S.ui.toolsCat = d.cat;
  commit();
};

/* ---------- helpers for pages ---------- */

const pcOf = (r, path) => JCR.get(r, path + '/jcr:content');
const titleOf = (r, path) => {
  const c = pcOf(r, path);
  const n = c ? null : JCR.get(r, path);
  return (c && (c.props['jcr:title'] || c.props['dc:title'])) || (n && n.props['jcr:title']) || JCR.name(path) || '/';
};
const isPage = (r, path) => JCR.type(JCR.get(r, path)) === 'cq:Page';

function childEntries(r, path, types) {
  const n = JCR.get(r, path);
  return n ? n.children.filter(c => types.includes(JCR.type(c))).map(c => JCR.join(path, c.name)) : [];
}

function pageStatus(path) {
  const c = pcOf(AR(), path);
  const p = c ? c.props : {};
  const published = p['cq:lastReplicationAction'] === 'Activate' && !!JCR.get(PR(), path);
  return {
    published,
    modified: published && p['cq:lastModified'] && p['cq:lastReplicated'] && p['cq:lastModified'] > p['cq:lastReplicated'],
    queued: S.queue.find(q => q.path === path && q.status !== 'done'),
    wf: S.wf.instances.find(w => w.payload === path && w.status === 'RUNNING'),
    locked: p['jcr:lockOwner'],
    lastRep: p['cq:lastReplicated'],
    lastMod: p['cq:lastModified'],
    template: p['cq:template'],
  };
}

function statusHtml(st) {
  const out = [];
  if (st.queued) out.push(`<span class="pill orange" title="${esc(st.queued.status)}">Publication pending</span>`);
  else if (st.published && st.modified) out.push('<span class="pill blue">Modified since publish</span>');
  else if (st.published) out.push('<span class="pill green">Published</span>');
  else out.push('<span class="pill grey">Not published</span>');
  if (st.wf) out.push('<span class="pill purple">In workflow</span>');
  if (st.locked) out.push('<span class="pill grey">🔒 Locked</span>');
  return out.join(' ');
}

function allPagePaths(r, start) {
  return JCR.find(r, start || '/content', n => JCR.type(n) === 'cq:Page').map(x => x.path).filter(p => !p.startsWith('/content/dam'));
}

function markModified(path) {
  const r = AR();
  let owner = path;
  if (path.includes('/jcr:content')) owner = path.split('/jcr:content')[0];
  for (const marker of ['/structure/', '/initial/', '/policies/']) if (path.includes(marker)) owner = path.split(marker)[0];
  const c = pcOf(r, owner);
  if (c) Object.assign(c.props, { 'cq:lastModified': now(), 'cq:lastModifiedBy': 'admin' });
  if (typeof msmAfterModify === 'function') msmAfterModify(owner);
}

/* ---------- Sites console (column view) ---------- */

const FOLDERS = ['cq:Page', 'sling:Folder', 'sling:OrderedFolder'];

// Sites and Experience Fragments share the same column-view console
const isXfPath = p => p === XF_ROOT || String(p).startsWith(XF_ROOT + '/');
const consoleUrl = p => (isXfPath(p) ? '/aem/experience-fragments.html' : '/sites.html') + p;
function goSites(p) {
  go(consoleUrl(p));
}

function sitesScreen(sel) {
  const r = AR();
  const xf = isXfPath(sel);
  const base = xf ? XF_ROOT : '/content';
  if (!JCR.get(r, sel)) sel = base;
  S.ui.sitesSel = sel;
  if (S.ui.sitesChecked !== sel) S.ui.sitesChecked = null;
  flag(xf ? 'visit:xf' : 'visit:sites');
  const segs = JCR.segs(sel);
  const cols = [];
  let acc = '';
  segs.forEach((s, i) => { acc += '/' + s; if (i >= JCR.segs(base).length - 1) cols.push(acc); });
  const selIsPage = isPage(r, sel);
  const checked = S.ui.sitesChecked;
  const isXfNode = p => (pcOf(r, p) || { props: {} }).props['sling:resourceType'] === 'cq/experience-fragments/components/experiencefragment';
  const multi = (S.ui.sitesMulti || []).filter(p => JCR.get(r, p));
  if (multi.length < 2) S.ui.sitesMulti = null;
  const columns = cols.map((cp, i) => {
    const items = childEntries(r, cp, FOLDERS).filter(p => p !== '/content/dam' && p !== XF_ROOT && p !== LAUNCH_ROOT && secCan(p, 'jcr:read'));
    if (!items.length && i === cols.length - 1) return selIsPage ? previewCard(sel) : '<div class="col empty">This folder is empty</div>';
    return `<div class="col">${items.map(p => {
      const on = cols.includes(p);
      const st = isPage(r, p) ? pageStatus(p) : null;
      const hasKids = childEntries(r, p, FOLDERS).length > 0;
      const thumb = st && pageThumb(r, p);
      const isChecked = checked === p || (S.ui.sitesMulti || []).includes(p);
      const lc = st && liveCopyRootOf(r, p);
      return `<div class="ci ${on ? 'active' : ''} ${isChecked ? 'checked' : ''}" data-act="go" data-url="${esc(consoleUrl(p))}" data-dbl="pageEditPath" data-path="${esc(p)}" title="${esc(p)}">
        <span class="ci-thumb ${thumb ? 'img' : ''}" data-act="sitesCheck" data-path="${esc(p)}" title="Select" ${thumb ? `style="background-image:url('${thumb}')"` : ''}>${thumb ? '' : icon(isXfNode(p) ? 'DocumentFragment' : st ? 'WebPage' : 'Folder', 24)}<i class="ci-check">${icon('Checkmark', 12)}</i></span>
        <span class="ci-text"><b>${esc(titleOf(r, p))}</b><small>${esc(JCR.name(p))}</small></span>
        ${lc ? `<span class="ci-flag" title="Live Copy of ${esc(lc.master)}">${icon('LinkPage', 14)}</span>` : ''}
        ${st && st.locked ? `<span class="ci-flag" title="Locked">${icon('LockClosed', 14)}</span>` : ''}
        ${st ? `<i class="ci-dot ${st.queued ? 'orange' : st.modified ? 'blue' : st.published ? 'green' : ''}" title="${st.published ? (st.modified ? 'Modified since publish' : 'Published') : 'Not published'}"></i>` : ''}
        ${hasKids ? `<span class="ci-arrow">${icon('ChevronRight', 14)}</span>` : ''}
      </div>`;
    }).join('')}</div>`;
  }).join('');

  const railMenu = `<details class="dd"><summary class="tb-rail" title="Toggle Side Panel">${icon('RailLeft')}${icon('ChevronDown', 10)}</summary>
    <div class="dd-menu"><a href="#" data-act="railSet" data-v="">Content Only</a><a href="#" data-act="railSet" data-v="1">Timeline</a><a href="#" data-act="railSet" data-v="refs">References</a></div></details>`;
  const crumb = `<details class="dd"><summary class="tb-crumb">${esc(titleOf(r, sel))}${icon('ChevronDown', 10)}</summary>
    <div class="dd-menu">${cols.slice().reverse().map(p => `<a href="#" data-act="go" data-url="${esc(consoleUrl(p))}">${esc(titleOf(r, p))}</a>`).join('')}</div></details>`;
  const views = `<details class="dd right"><summary class="iconbtn tb-view" title="View">${icon('ViewColumn')}${icon('ChevronDown', 10)}</summary>
    <div class="dd-menu"><a href="#">${icon('ViewColumn', 14)} Column View</a><a class="off">${icon('ViewCard', 14)} Card View</a><a class="off">${icon('ViewList', 14)} List View</a></div></details>`;

  const mi = (act, ico, label, off) => `<a href="#" ${off ? 'class="off" title="Not simulated in the lab"' : `data-act="${act}"`}>${icon(ico, 16)} ${label}</a>`;
  const createItems = xf
    ? `${mi('xfCreate', 'DocumentFragment', 'Experience Fragment')}${mi('', 'Folder', 'Folder', true)}`
    : `${mi('pageCreate', 'WebPage', 'Page')}${mi('siteCreate', 'WebPages', 'Site')}${mi('liveCopyCreate', 'LinkPage', 'Live Copy')}${mi('launchCreate', 'Launch', 'Launch')}
       ${mi('langCopyCreate', 'Globe', 'Language Copy')}${mi('csvReport', 'FileCSV', 'CSV Report')}${mi('', 'Book', 'Catalog', true)}`;
  let bar;
  if (S.ui.sitesMulti) {
    bar = selectionBar(`${qa('multiPublish', 'PublishCheck', 'Quick Publish')}${qa('multiUnpublish', 'PublishRemove', 'Unpublish')}${qa('multiDelete', 'Delete', 'Delete', 'backspace')}`, 'sitesUncheck')
      .replace('1 selected', `${S.ui.sitesMulti.length} selected`);
  } else if (checked && selIsPage) {
    const st = pageStatus(sel);
    bar = selectionBar(`
      <details class="dd"><summary class="qa">${icon('Add')}<span>Create</span></summary><div class="dd-menu">
        ${xf ? '<a href="#" data-act="xfCreate">Variation / Experience Fragment</a>' : '<a href="#" data-act="pageCreate">Page</a>'}<a href="#" data-act="wfStartDlg">Workflow</a></div></details>
      ${qa('pageEdit', 'Edit', 'Edit', 'e')}${qa('pageProps', 'Properties', 'Properties', 'p')}
      ${qa('pageLock', st.locked ? 'LockOpen' : 'LockClosed', st.locked ? 'Unlock' : 'Lock')}
      ${qa('pageCopy', 'Copy', 'Copy', 'ctrl+c')}${qa('pageMove', 'Move', 'Move', 'm')}
      ${liveCopiesOf(r, sel).length ? qa('rolloutPage', 'Sync', 'Rollout') : ''}
      ${qa('pagePublish', 'PublishCheck', 'Quick Publish')}
      <details class="dd"><summary class="qa">${icon('Send')}<span>Manage Publication</span></summary><div class="dd-menu">
        <a href="#" data-act="pagePublish">Publish</a><a href="#" data-act="pageUnpublish">Unpublish</a></div></details>
      ${qa('pageDelete', 'Delete', 'Delete', 'backspace')}`, 'sitesUncheck');
  } else {
    bar = titleBar(railMenu, crumb, `${S.ui.clip ? `<button class="btn quiet" data-act="pagePaste" title="Paste ${esc(S.ui.clip)} here">${icon('Paste')} Paste</button>` : ''}
      <button class="btn quiet sel-all" data-act="sitesSelectAll">${icon('SelectBoxAll')} Select All</button>
      ${sel !== '/content' ? `<details class="dd right"><summary class="btn primary rect">Create</summary><div class="dd-menu create-menu">${createItems}</div></details>` : ''}
      ${views}`);
  }
  const rail = S.ui.rail === 'refs' ? referencesRail(sel) : S.ui.rail ? (selIsPage ? timelineRail(sel) : '<div class="rail"><p class="muted small">Select a page to see its timeline.</p></div>') : '';
  return shell(xf ? 'Experience Fragments' : 'Sites', `${bar}<div class="sites-wrap">${rail}<div class="columns">${columns}</div></div>`);
}

// Creates an Experience Fragment (a cq:Page) with its "master" web variation
A.xfCreate = () => {
  const r = AR();
  let parent = S.ui.sitesSel;
  if (isPage(r, parent) && (pcOf(r, parent) || { props: {} }).props['sling:resourceType'] !== 'cq/experience-fragments/components/experiencefragment') parent = JCR.parent(parent);
  const tpls = allowedTemplatesFor(r, parent + '/x');
  if (!tpls.length) { toast('No Experience Fragment template is allowed here. Open the <b>WKND Sites Project</b> folder first.', 'warn'); return; }
  openModal({
    title: `Create Experience Fragment <small>under ${esc(parent)}</small>`,
    okLabel: 'Create',
    body: `${selectField('Template', 'tpl', tpls[0].path, tpls.map(t => [t.path, t.c.props['jcr:title']]))}${field('Title *', 'title', '')}${field('Name', 'name', '', 'Leave empty to generate it from the title')}`,
    ok: b => {
      const f = formData(b);
      if (!f.title.trim()) { toast('Title is required.', 'error'); return false; }
      const pn = JCR.get(r, parent);
      const name = slug(f.name || f.title);
      if (pn.children.some(c => c.name === name)) { toast('That name already exists here.', 'error'); return false; }
      const init = JCR.clone(JCR.get(r, f.tpl + '/initial/jcr:content'));
      init.name = 'jcr:content';
      Object.assign(init.props, { 'jcr:primaryType': 'cq:PageContent', 'jcr:title': f.title.trim(), 'cq:template': f.tpl, 'sling:resourceType': 'wknd/components/xfpage', 'cq:xfMasterVariation': true, 'cq:xfVariantType': 'web', 'jcr:created': now(), 'cq:lastModified': now() });
      pn.children.push(JCR.node(name, { 'jcr:primaryType': 'cq:Page' }, [
        JCR.node('jcr:content', { 'jcr:primaryType': 'cq:PageContent', 'jcr:title': f.title.trim(), 'sling:resourceType': 'cq/experience-fragments/components/experiencefragment', 'cq:template': f.tpl, 'cq:lastModified': now() }),
        JCR.node('master', { 'jcr:primaryType': 'cq:Page' }, [init]),
      ]));
      flag('xf:created');
      toast('Experience Fragment created. Add components to its <b>master</b> variation.');
      go('/editor.html' + JCR.join(parent, name) + '/master.html');
    },
  });
};

function previewCard(path) {
  const r = AR();
  const st = pageStatus(path);
  const c = pcOf(r, path);
  const row = (k, v) => `<div class="pv-row"><span>${k}</span><b>${v}</b></div>`;
  return `<div class="col preview"><div class="pv-thumb" data-act="pageEditPath" data-path="${esc(path)}" title="Open in editor">${icon('WebPage', 48)}</div>
    <div class="pv-title">${esc(titleOf(r, path))}</div>
    ${row('Name', esc(JCR.name(path)))}
    ${row('Template', esc(st.template ? titleOf(r, st.template) : '—'))}
    ${row('Modified', fmtDate(st.lastMod) + ' · admin')}
    ${row('Published', st.published ? fmtDate(st.lastRep) : '—')}
    ${row('Status', statusHtml(st))}
    ${c && c.props['jcr:language'] ? row('Language', esc(c.props['jcr:language'])) : ''}
    ${msmPreviewRows(r, path)}
    <p class="hint">Click the thumbnail of an item to <b>select</b> it.</p></div>`;
}

/* Path picker overlay (the Coral column-view picker AEM uses in wizards: "Type to search…", Cancel / Select)
   opts: { start, multi, onSelect(paths), selectable(path) } */
function openPathPicker(opts) {
  const r = AR();
  const root = opts.root || '/content';
  // inside the DAM the picker lists folders, assets and content fragments (Select Path in the CF editor)
  const dam = root.startsWith('/content/dam');
  const types = root === '/content' ? FOLDERS : [...FOLDERS, 'nt:folder', 'nt:unstructured', 'cq:Template'];
  const st = { nav: JCR.get(r, opts.start) ? opts.start : root, sel: [], q: '' };
  const canSel = p => (opts.selectable ? opts.selectable(p) : isPage(r, p));
  const kidsOf = dam ? (p => damKids(r, p)) : (p => childEntries(r, p, types).filter(x => x !== '/content/dam' && x !== LAUNCH_ROOT && !JCR.name(x).includes(':')));
  const ttl = p => (dam ? damTitle(r, p) : titleOf(r, p));
  const el = document.createElement('div');
  el.className = 'picker-backdrop';
  document.body.appendChild(el);

  const row = (p, active) => {
    const page = isPage(r, p);
    const asset = dam && isDamAsset(r, p);
    const cf = asset && isCF(r, p);
    const thumb = page ? pageThumb(r, p) : asset && !cf ? assetSrc(r, p) : null;
    const checked = st.sel.includes(p);
    const sel = canSel(p);
    // a leaf (asset or fragment) is picked by clicking the row; folders open
    return `<div class="ci ${active ? 'active' : ''} ${checked ? 'checked' : ''}" ${asset ? (sel ? `data-pk-sel="${esc(p)}"` : '') : `data-pk-nav="${esc(p)}"`} title="${esc(p)}">
      <span class="ci-thumb ${thumb ? 'img' : ''} ${sel ? '' : 'nosel'}" ${sel ? `data-pk-sel="${esc(p)}"` : ''} ${thumb ? `style="background-image:url('${thumb}')"` : ''}>${thumb ? '' : icon(page ? 'WebPage' : cf ? 'DocumentFragment' : asset ? 'Image' : 'Folder', 24)}<i class="ci-check">${icon('Checkmark', 12)}</i></span>
      <span class="ci-text"><b>${esc(ttl(p))}</b><small>${esc(JCR.name(p))}</small></span>
      ${kidsOf(p).length ? `<span class="ci-arrow">${icon('ChevronRight', 14)}</span>` : ''}</div>`;
  };

  const draw = () => {
    let body;
    if (st.q.trim()) {
      const q = st.q.trim().toLowerCase();
      const hits = dam
        ? JCR.find(r, root, (n, p) => (DAM_FOLDERS.includes(JCR.type(n)) || JCR.type(n) === 'dam:Asset') && !p.includes('/jcr:content') && p !== root && (damTitle(r, p).toLowerCase().includes(q) || n.name.toLowerCase().includes(q))).map(x => x.path).slice(0, 200)
        : JCR.find(r, root, (n, p) => types.includes(JCR.type(n)) && !n.name.includes(':') && p !== root && !p.startsWith('/content/dam') && !p.startsWith(LAUNCH_ROOT)
          && (titleOf(r, p).toLowerCase().includes(q) || n.name.toLowerCase().includes(q))).map(x => x.path).slice(0, 200);
      body = `<div class="pk-results">${hits.map(p => row(p, false)).join('') || '<div class="pk-empty">No results</div>'}</div>`;
    } else {
      const cols = [];
      let acc = '';
      for (const s of JCR.segs(st.nav)) { acc += '/' + s; if (acc.length >= root.length) cols.push(acc); }
      body = `<div class="columns pk-cols">${cols.map(cp => {
        const items = kidsOf(cp);
        return items.length ? `<div class="col">${items.map(p => row(p, cols.includes(p))).join('')}</div>` : '';
      }).join('')}</div>`;
    }
    const crumbs = [];
    let acc = '';
    for (const s of JCR.segs(st.nav)) { acc += '/' + s; crumbs.push(acc); }
    el.innerHTML = `<div class="picker">
      <div class="pk-search">${opts.title ? `<b class="pk-title">${esc(opts.title)}</b>` : ''}${icon('Search', 18)}<input placeholder="Type to search ..." value="${esc(st.q)}" data-pk-q="1"><span class="spacer"></span>
        <button class="pk-btn" data-pk="cancel">Cancel</button><button class="pk-btn primary" data-pk="select" ${st.sel.length ? '' : 'disabled'}>Select</button></div>
      <div class="pk-bar"><span class="pk-rail">${icon('RailLeft')}</span>
        <details class="dd pk-crumb"><summary>${esc(ttl(st.nav))} ${icon('ChevronDown', 10)}</summary><div class="dd-menu">${crumbs.filter(p => p.length >= root.length).reverse().map(p => `<a href="#" data-pk-nav="${esc(p)}">${esc(ttl(p))}</a>`).join('')}</div></details>
        <span class="pk-count">${st.sel.length ? `<span class="pk-box">${st.sel.length} <a href="#" data-pk="clear" title="Clear selection">✕</a></span>` : ''}</span></div>
      ${body}</div>`;
    const input = el.querySelector('[data-pk-q]');
    if (st.focus) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  };

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-pk]');
    if (b) {
      e.preventDefault();
      if (b.dataset.pk === 'cancel') el.remove();
      if (b.dataset.pk === 'clear') { st.sel = []; draw(); }
      if (b.dataset.pk === 'select' && st.sel.length) { el.remove(); opts.onSelect(st.sel.slice()); }
      return;
    }
    const s = e.target.closest('[data-pk-sel]');
    if (s) {
      e.preventDefault();
      const p = s.dataset.pkSel;
      st.sel = st.sel.includes(p) ? st.sel.filter(x => x !== p) : opts.multi ? [...st.sel, p] : [p];
      st.focus = false;
      draw();
      return;
    }
    const n = e.target.closest('[data-pk-nav]');
    if (n) {
      e.preventDefault();
      st.nav = n.dataset.pkNav;
      st.q = '';
      st.focus = false;
      draw();
    }
  });
  el.addEventListener('input', e => {
    if (!e.target.matches('[data-pk-q]')) return;
    st.q = e.target.value;
    st.focus = true;
    draw();
  });
  el.addEventListener('keydown', e => { if (e.key === 'Escape') el.remove(); });
  draw();
}

// First image used on the page, like the page thumbnails AEM generates
function pageThumb(r, path) {
  const c = pcOf(r, path);
  if (!c) return null;
  let ref = null;
  JCR.walk(c, '', n => { if (!ref && n.props.fileReference) ref = n.props.fileReference; });
  return ref ? assetSrc(r, ref) : null;
}

A.pageEditPath = d => go('/editor.html' + d.path + '.html');
A.pageEdit = () => go('/editor.html' + S.ui.sitesSel + '.html');
A.sitesCheck = d => {
  S.ui.sitesMulti = null;
  S.ui.sitesChecked = S.ui.sitesChecked === d.path ? null : d.path;
  goSites(d.path);
};
A.sitesUncheck = () => {
  S.ui.sitesChecked = null;
  S.ui.sitesMulti = null;
  commit();
};
// Select All selects every item of the last column
A.sitesSelectAll = () => {
  const r = AR();
  const sel = S.ui.sitesSel;
  let kids = childEntries(r, sel, FOLDERS).filter(p => p !== '/content/dam' && p !== XF_ROOT && p !== LAUNCH_ROOT);
  if (!kids.length) kids = childEntries(r, JCR.parent(sel), FOLDERS).filter(p => p !== '/content/dam' && p !== XF_ROOT && p !== LAUNCH_ROOT);
  kids = kids.filter(p => isPage(r, p));
  if (!kids.length) { toast('Nothing to select here.', 'warn'); return; }
  if (kids.length === 1) { A.sitesCheck({ path: kids[0] }); return; }
  S.ui.sitesChecked = null;
  S.ui.sitesMulti = kids;
  flag('sites:selectAll');
  commit();
};
A.multiPublish = () => {
  const list = S.ui.sitesMulti || [];
  const no = list.find(p => !secCan(p, 'crx:replicate'));
  if (no) return secDenied('publish', no, 'crx:replicate');
  const refs = [...new Set(list.flatMap(p => unpublishedRefs(p).map(x => x.path)))];
  queueReplication('Activate', [...refs, ...list]);
  toast(`Publishing ${list.length} page(s)${refs.length ? ` + ${refs.length} reference(s)` : ''}…`);
  S.ui.sitesMulti = null;
  commit();
};
A.multiUnpublish = () => {
  const list = (S.ui.sitesMulti || []).filter(p => JCR.get(PR(), p));
  if (list.length) queueReplication('Deactivate', list);
  toast(`Unpublishing ${list.length} page(s)…`);
  S.ui.sitesMulti = null;
  commit();
};
A.multiDelete = () => {
  const list = S.ui.sitesMulti || [];
  const no = list.find(p => !secCan(p, 'jcr:removeNode'));
  if (no) return secDenied('delete', no, 'jcr:removeNode');
  confirmBox('Delete pages', `Delete ${list.length} pages (and their child pages)?<br>${list.map(p => `<code>${esc(p)}</code>`).join('<br>')}`, () => {
    const pub = list.filter(p => JCR.get(PR(), p));
    if (pub.length) queueReplication('Deactivate', pub);
    list.forEach(p => JCR.remove(AR(), p));
    S.ui.sitesMulti = null;
    flag('op:delete');
    commit();
  }, 'Delete');
};
A.rail = () => {
  S.ui.rail = !S.ui.rail;
  commit();
};
A.railSet = d => {
  S.ui.rail = !!d.v;
  commit();
};

/* create page */

function allowedTemplatesFor(r, parentPath) {
  let patterns = null;
  let conf = null;
  for (let p = parentPath; p && p !== '/' && p !== '/content'; p = JCR.parent(p)) {
    const c = pcOf(r, p);
    if (!c) continue;
    if (!patterns && c.props['cq:allowedTemplates']) patterns = c.props['cq:allowedTemplates'];
    if (!conf && c.props['cq:conf']) conf = c.props['cq:conf'];
  }
  if (!patterns || !conf) return [];
  const base = JCR.get(r, conf + '/settings/wcm/templates');
  if (!base) return [];
  return base.children
    .filter(t => JCR.type(t) === 'cq:Template')
    .map(t => ({ path: `${conf}/settings/wcm/templates/${t.name}`, c: JCR.get(t, 'jcr:content') }))
    .filter(t => t.c && t.c.props.status === 'enabled' && patterns.some(rx => new RegExp('^' + rx + '$').test(t.path)))
    // a template can limit where it may be used (e.g. XF templates only under /content/experience-fragments)
    .filter(t => !t.c.props.allowedPaths || [].concat(t.c.props.allowedPaths).some(rx => new RegExp('^' + rx + '$').test(parentPath)));
}

/* Create Page wizard — /mnt/overlay/wcm/core/content/sites/createpagewizard.html/<parent>
   1. Template (cards of the enabled, allowed templates)  2. Properties (Basic / Advanced / Social Media) */

const CPW_URL = '/mnt/overlay/wcm/core/content/sites/createpagewizard.html';

A.pageCreate = () => {
  const parent = S.ui.sitesSel;
  if (!secCan(parent, 'jcr:addChildNodes')) return secDenied('create pages here', parent, 'jcr:addChildNodes');
  S.ui.cpWiz = cpwNew(parent);
  go(CPW_URL + parent);
};

function cpwNew(parent) {
  return { for: parent, step: 1, tpl: null, tab: 0, f: { title: '', name: '', tags: '', pageTitle: '', navTitle: '', subtitle: '', description: '', language: '', vanity: '', hideInNav: false, facebook: false, pinterest: false } };
}

// Small picture of a page made from the template: header, its initial components, footer
function tplThumbHtml(r, tpl) {
  const kids = rel => ((JCR.get(r, tpl + rel) || { children: [] }).children);
  let items = kids('/initial/jcr:content/root/container');
  if (!items.length) items = kids('/structure/jcr:content/root').filter(n => !/navigation|footer/.test(n.name));
  const part = n => {
    const rt = String(n.props['sling:resourceType'] || '');
    if (rt.endsWith('/image')) return n.props.fileReference ? `<div class="tm-img" style="background-image:url('${assetSrc(r, n.props.fileReference)}')"></div>` : '<div class="tm-img empty"></div>';
    if (rt.endsWith('/title')) return '<div class="tm-title"></div>';
    if (rt.endsWith('/text')) return '<div class="tm-text"><i></i><i></i><i></i></div>';
    if (rt.endsWith('/separator')) return '<div class="tm-sep"></div>';
    if (rt.endsWith('/container')) return n.children.length ? n.children.map(part).join('') : '<div class="tm-box"></div>';
    return '<div class="tm-box"></div>';
  };
  return `<div class="tm"><div class="tm-head"><b></b><i></i><i></i><i></i><i></i></div>
    <div class="tm-body">${items.map(part).join('') || '<div class="tm-box"></div>'}</div>
    <div class="tm-foot"><span><i></i><i></i><i></i></span><span><i></i><i></i></span><span><i></i><i></i><i></i></span></div></div>`;
}

const cpwValid = W => !!(W.tpl && W.f.title.trim());

function cpwScreen(parent) {
  const r = AR();
  if (!S.ui.cpWiz || S.ui.cpWiz.for !== parent) S.ui.cpWiz = cpwNew(parent);
  const W = S.ui.cpWiz;
  const tpls = allowedTemplatesFor(r, parent);
  if (W.tpl && !tpls.some(t => t.path === W.tpl)) { W.tpl = null; W.step = 1; }
  const steps = `<div class="wiz-steps"><div class="wiz-step ${W.step === 1 ? 'on' : 'done'}"><span>Template</span><i></i></div><div class="wiz-line ${W.step === 2 ? 'done' : ''}"></div>
    <div class="wiz-step ${W.step === 2 ? 'on' : ''}"><span>Properties</span><i></i></div></div>`;
  const btns = W.step === 1
    ? `<button class="wbtn" data-act="cpwCancel">Cancel</button><button class="wbtn primary" data-act="cpwNext" ${W.tpl ? '' : 'disabled'}>Next</button>`
    : `<button class="wbtn" data-act="cpwBack">Back</button><button class="wbtn primary" id="cpw-create" data-act="cpwCreate" ${cpwValid(W) ? '' : 'disabled'}>Create</button>`;
  let body;
  if (W.step === 1) {
    body = tpls.length
      ? `<div class="cpw-grid">${tpls.map(t => `<div class="cpw-card ${W.tpl === t.path ? 'sel' : ''}" data-act="cpwTpl" data-path="${esc(t.path)}" title="${esc(t.c.props['jcr:description'] || t.path)}">
          <div class="cpw-thumb">${tplThumbHtml(r, t.path)}<i class="cpw-check">${icon('CheckmarkCircle', 22)}</i></div>
          <div class="cpw-name">${esc(t.c.props['jcr:title'] || JCR.name(t.path))}</div></div>`).join('')}</div>`
      : `<div class="cpw-empty"><b>There is no item.</b><p>Only templates that are <b>enabled</b> and allowed by <code>cq:allowedTemplates</code> (on this page or one of its parents) can be used here.</p></div>`;
  } else {
    const f = W.f;
    const inp = (label, k, extra) => `<div class="wf"><div class="wf-label">${label}</div><input data-cpw="${k}" value="${esc(f[k])}" autocomplete="off" ${extra || ''}></div>`;
    const chk = (label, k) => `<label class="wf-check"><input type="checkbox" data-cpwchk="${k}" ${f[k] ? 'checked' : ''}> ${label}</label>`;
    const panes = [
      `<div class="wiz-form"><div class="wiz-col">
          <h4 class="cpw-h">Title and Tags</h4>
          ${inp('Title *', 'title')}
          ${inp('Name', 'name', `placeholder="${esc(f.title ? slug(f.title) : '')}"`)}
          ${inp('Tags', 'tags', 'placeholder="e.g. wknd:activity/hiking, wknd:region/europe"')}
          ${chk('Hide in Navigation', 'hideInNav')}
        </div><div class="wiz-col">
          <h4 class="cpw-h">More Titles and Description</h4>
          ${inp('Page Title', 'pageTitle')}${inp('Navigation Title', 'navTitle')}${inp('Subtitle', 'subtitle')}
          <div class="wf"><div class="wf-label">Description</div><textarea data-cpw="description" rows="4">${esc(f.description)}</textarea></div>
        </div></div>`,
      `<div class="wiz-form"><div class="wiz-col">
          <h4 class="cpw-h">Settings</h4>
          <div class="wf"><div class="wf-label">Language</div><select class="wf-select" data-cpw="language"><option value="">(inherited)</option>${Object.entries(LANG_NAMES).map(([c, n]) => `<option value="${c}" ${f.language === c ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
          ${inp('Vanity URL', 'vanity', 'placeholder="/my-page"')}
        </div><div class="wiz-col"></div></div>`,
      `<div class="wiz-form"><div class="wiz-col">
          <h4 class="cpw-h">Social Media sharing</h4>
          ${chk('Enable user sharing for Facebook', 'facebook')}${chk('Enable user sharing for Pinterest', 'pinterest')}
        </div><div class="wiz-col"></div></div>`,
    ];
    const tabs = ['Basic', 'Advanced', 'Social Media'];
    body = `<div class="cpw-tabs mtabs">${tabs.map((t, i) => `<button type="button" class="mtab ${W.tab === i ? 'on' : ''}" data-act="cpwTab" data-i="${i}">${t}</button>`).join('')}</div>${panes[W.tab] || panes[0]}`;
  }
  return `<div class="wiz"><div class="wiz-head"><div class="wiz-title">Create Page</div>${steps}<div class="wiz-btns">${btns}</div></div><div class="wiz-body cpw-body">${body}</div></div>`;
}

A.cpwTpl = d => {
  const W = S.ui.cpWiz;
  W.tpl = W.tpl === d.path ? null : d.path;
  commit();
};
A.cpwCancel = () => {
  const p = S.ui.cpWiz ? S.ui.cpWiz.for : '/content';
  S.ui.cpWiz = null;
  goSites(p);
};
A.cpwNext = () => {
  if (!S.ui.cpWiz.tpl) return;
  S.ui.cpWiz.step = 2;
  commit();
};
A.cpwBack = () => {
  S.ui.cpWiz.step = 1;
  commit();
};
A.cpwTab = d => {
  S.ui.cpWiz.tab = +d.i;
  commit();
};

document.addEventListener('input', e => {
  const el = e.target.closest('[data-cpw]');
  if (!el || !S.ui.cpWiz) return;
  const W = S.ui.cpWiz;
  W.f[el.dataset.cpw] = el.value;
  if (el.dataset.cpw === 'title') {
    const n = el.ownerDocument.querySelector('[data-cpw=name]');
    if (n) n.placeholder = el.value ? slug(el.value) : '';
  }
  const btn = el.ownerDocument.getElementById('cpw-create');
  if (btn) btn.disabled = !cpwValid(W);
  save();
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-cpwchk]');
  if (!el || !S.ui.cpWiz) return;
  S.ui.cpWiz.f[el.dataset.cpwchk] = el.checked;
  save();
});

A.cpwCreate = () => {
  const r = AR();
  const W = S.ui.cpWiz;
  const f = W.f;
  if (!cpwValid(W)) { toast('Title is required.', 'error'); return; }
  const parent = W.for;
  const name = slug(f.name || f.title);
  if (!name) { toast('Enter a valid name.', 'error'); return; }
  const parentNode = JCR.get(r, parent);
  if (parentNode.children.some(c => c.name === name)) { toast(`A page named "${esc(name)}" already exists here.`, 'error'); return; }
  const tpl = W.tpl;
  // the new page starts as a copy of the template's initial content
  const init = JCR.get(r, tpl + '/initial/jcr:content');
  const sc = JCR.get(r, tpl + '/structure/jcr:content');
  const content = init ? JCR.clone(init) : JCR.node('jcr:content');
  content.name = 'jcr:content';
  Object.assign(content.props, {
    'jcr:primaryType': 'cq:PageContent', 'jcr:title': f.title.trim(), 'cq:template': tpl,
    'sling:resourceType': (sc && sc.props['sling:resourceType']) || 'wknd/components/page',
    'jcr:created': now(), 'jcr:createdBy': 'admin', 'cq:lastModified': now(), 'cq:lastModifiedBy': 'admin',
  });
  if (f.pageTitle.trim()) content.props.pageTitle = f.pageTitle.trim();
  if (f.navTitle.trim()) content.props.navTitle = f.navTitle.trim();
  if (f.subtitle.trim()) content.props.subtitle = f.subtitle.trim();
  if (f.description.trim()) content.props['jcr:description'] = f.description.trim();
  if (f.hideInNav) content.props.hideInNav = true;
  if (f.language) content.props['jcr:language'] = f.language;
  if (f.vanity.trim()) content.props['sling:vanityPath'] = f.vanity.trim();
  const tags = f.tags.split(',').map(t => t.trim()).filter(Boolean);
  if (tags.length) content.props['cq:tags'] = tags;
  const social = [f.facebook && 'facebook', f.pinterest && 'pinterest'].filter(Boolean);
  if (social.length) content.props.socialMedia = social;
  parentNode.children.push(JCR.node(name, { 'jcr:primaryType': 'cq:Page' }, [content]));
  const path = parent + '/' + name;
  flag('page:created');
  save();
  successDialog('Your page has been created.',
    () => { S.ui.cpWiz = null; S.ui.sitesChecked = null; goSites(parent); },
    () => { S.ui.cpWiz = null; go('/editor.html' + path + '.html'); });
};

function field(label, name, value, hint, type) {
  return `<label class="field"><span>${label}</span><input name="${name}" value="${esc(value || '')}" ${type ? `type="${type}"` : ''} autocomplete="off">${hint ? `<small>${hint}</small>` : ''}</label>`;
}

function selectField(label, name, value, options, hint) {
  return `<label class="field"><span>${label}</span><select name="${name}">${options.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>${hint ? `<small>${hint}</small>` : ''}</label>`;
}

function tabsHtml(tabs) {
  return `<div class="mtabs">${tabs.map((t, i) => `<button type="button" class="mtab ${i === 0 ? 'on' : ''}" data-mtab="${i}">${t.label}</button>`).join('')}</div>
    ${tabs.map((t, i) => `<div class="mpane" data-mpane="${i}" ${i ? 'hidden' : ''}>${t.html}</div>`).join('')}`;
}

function wireTabs(b) {
  b.querySelectorAll('[data-mtab]').forEach(btn => btn.addEventListener('click', () => {
    b.querySelectorAll('[data-mtab]').forEach(x => x.classList.toggle('on', x === btn));
    b.querySelectorAll('[data-mpane]').forEach(p => { p.hidden = p.dataset.mpane !== btn.dataset.mtab; });
  }));
}

/* page properties */

A.pageProps = () => openPageProps(S.ui.sitesSel);

function openPageProps(path) {
  const c = pcOf(AR(), path);
  if (!c) return;
  const p = c.props;
  const pages = allPagePaths(AR()).map(x => [x, x]);
  openModal({
    title: `Page Properties <small>${esc(path)}</small>`,
    wide: true,
    body: tabsHtml([
      { label: 'Basic', html: `${field('Title *', 'jcr:title', p['jcr:title'])}
        <label class="check"><input type="checkbox" name="hideInNav" ${p.hideInNav ? 'checked' : ''}> Hide in Navigation</label>
        ${field('Page Title', 'pageTitle', p.pageTitle, 'Used in the &lt;title&gt; tag')}
        ${field('Navigation Title', 'navTitle', p.navTitle, 'Used by the Navigation component instead of the title')}
        ${field('Subtitle', 'subtitle', p.subtitle)}
        <label class="field"><span>Description</span><textarea name="jcr:description">${esc(p['jcr:description'] || '')}</textarea></label>` },
      { label: 'Advanced', html: `${selectField('Language', 'jcr:language', p['jcr:language'] || '', [['', '(inherited)'], ['en', 'English'], ['ar', 'Arabic'], ['de', 'German']])}
        ${selectField('Redirect', 'redirectTarget', p.redirectTarget || '', [['', '(none)'], ...pages])}
        ${field('Vanity URL', 'sling:vanityPath', p['sling:vanityPath'], 'e.g. /about-us')}` },
      { label: 'Info', html: `<dl class="kv"><dt>Template</dt><dd><code>${esc(p['cq:template'] || '')}</code></dd>
        <dt>Resource type</dt><dd><code>${esc(p['sling:resourceType'] || '')}</code></dd>
        <dt>Stored at</dt><dd><code>${esc(path)}/jcr:content</code> — open it in CRXDE to see these properties.</dd></dl>` },
      ...msmPropsTabs(path),
    ]),
    onMount: wireTabs,
    okLabel: 'Save & Close',
    ok: b => {
      const f = formData(b);
      if (!String(f['jcr:title']).trim()) { toast('Title is required.', 'error'); return false; }
      const before = { ...p };
      for (const k of ['jcr:title', 'pageTitle', 'navTitle', 'subtitle', 'jcr:description', 'jcr:language', 'redirectTarget', 'sling:vanityPath']) {
        if (f[k]) p[k] = f[k];
        else delete p[k];
      }
      if (f.hideInNav) p.hideInNav = true;
      else delete p.hideInNav;
      msmRecordLocalProps(path, before, { ...p });
      markModified(path);
      flag('props:saved');
      if (p.navTitle) flag('props:navTitle');
      if (p.hideInNav) flag('props:hideInNav');
      toast('Page properties saved.');
      commit();
    },
  });
}

/* lock, copy/paste, move, delete */

A.pageLock = () => {
  const c = pcOf(AR(), S.ui.sitesSel);
  if (!c) return;
  if (c.props['jcr:lockOwner']) {
    delete c.props['jcr:lockOwner'];
    delete c.props['jcr:lockIsDeep'];
    toast('Page unlocked.');
  } else {
    Object.assign(c.props, { 'jcr:lockOwner': 'admin', 'jcr:lockIsDeep': false });
    flag('op:lock');
    toast('Page locked. Only the lock owner (admin) can edit it now.');
  }
  commit();
};

A.pageCopy = () => {
  S.ui.clip = S.ui.sitesSel;
  S.ui.sitesChecked = null;
  toast(`Copied <code>${esc(S.ui.clip)}</code>. Open the destination folder and click <b>Paste</b>.`);
  commit();
};

function stripReplication(node) {
  JCR.walk(node, '', n => {
    if (n.name === 'jcr:content') {
      for (const k of ['cq:lastReplicated', 'cq:lastReplicatedBy', 'cq:lastReplicationAction', 'jcr:lockOwner', 'jcr:lockIsDeep']) delete n.props[k];
    }
  });
}

A.pagePaste = () => {
  const r = AR();
  const src = S.ui.clip;
  const dest = S.ui.sitesSel;
  const node = JCR.get(r, src);
  if (!node) { toast('The copied page no longer exists.', 'error'); return; }
  if (dest === src || dest.startsWith(src + '/')) { toast('You cannot paste a page into itself.', 'error'); return; }
  const destNode = JCR.get(r, dest);
  const copy = JCR.clone(node);
  let name = copy.name;
  if (destNode.children.some(c => c.name === name)) {
    name = copy.name + '-copy';
    let i = 1;
    while (destNode.children.some(c => c.name === name)) name = `${copy.name}-copy-${i++}`;
  }
  copy.name = name;
  stripReplication(copy);
  destNode.children.push(copy);
  markModified(dest + '/' + name);
  flag('op:copy');
  toast(`Pasted as <code>${esc(dest + '/' + name)}</code>`);
  goSites(dest + '/' + name);
};

A.pageMove = () => {
  const r = AR();
  const src = S.ui.sitesSel;
  if (!secCan(src, 'jcr:removeNode')) return secDenied('move this page', src, 'jcr:removeNode');
  const dests = ['/content/wknd', ...allPagePaths(r)].filter((p, i, a) => a.indexOf(p) === i && p !== src && !p.startsWith(src + '/'));
  openModal({
    title: `Move / Rename <small>${esc(src)}</small>`,
    okLabel: 'Move',
    body: `${field('Title', 'title', titleOf(r, src))}${field('Name', 'name', JCR.name(src), 'Changing the name changes the URL')}
      ${selectField('Destination (parent)', 'dest', JCR.parent(src), dests.map(p => [p, p]))}
      <label class="check"><input type="checkbox" name="adjust" checked> Adjust references (links pointing to this page)</label>
      <p class="hint">If the page is published, it is unpublished from the old path. Publish it again after moving.</p>`,
    ok: b => {
      const f = formData(b);
      const name = slug(f.name);
      const newPath = JCR.join(f.dest, name);
      if (newPath !== src && JCR.get(r, newPath)) { toast('A page with that name already exists at the destination.', 'error'); return false; }
      movePage(src, f.dest, name, f.title, f.adjust);
    },
  });
};

function movePage(src, destParent, name, title, adjust) {
  const r = AR();
  const newPath = JCR.join(destParent, name);
  const node = JCR.get(r, src);
  const wasPublished = !!JCR.get(PR(), src);
  if (newPath !== src) {
    JCR.remove(r, src);
    node.name = name;
    JCR.get(r, destParent).children.push(node);
    if (wasPublished) queueReplication('Deactivate', [src]);
    stripReplication(node);
    for (const k of Object.keys(S.versions)) {
      if (k === src || k.startsWith(src + '/')) {
        S.versions[newPath + k.slice(src.length)] = S.versions[k];
        delete S.versions[k];
      }
    }
    if (adjust) {
      for (const p of allPagePaths(r)) {
        JCR.walk(JCR.get(r, p + '/jcr:content') || JCR.node('x'), '', n => {
          for (const [k, v] of Object.entries(n.props)) {
            if (typeof v === 'string' && (v === src || v.startsWith(src + '/'))) n.props[k] = newPath + v.slice(src.length);
          }
        });
      }
    }
  }
  const c = pcOf(r, newPath);
  if (c && title) c.props['jcr:title'] = title;
  markModified(newPath);
  flag('op:move');
  if (S.ui.clip === src) S.ui.clip = null;
  toast(`Moved to <code>${esc(newPath)}</code>${wasPublished && newPath !== src ? ' (old path unpublished)' : ''}.`);
  goSites(newPath);
}

A.pageDelete = () => {
  const path = S.ui.sitesSel;
  if (!secCan(path, 'jcr:removeNode')) return secDenied('delete this page', path, 'jcr:removeNode');
  const kids = childEntries(AR(), path, ['cq:Page']).length;
  confirmBox('Delete page', `Delete <code>${esc(path)}</code>${kids ? ` and its ${kids} child page(s)` : ''}?${JCR.get(PR(), path) ? '<br><br>The page is published, so it will be <b>unpublished</b> first.' : ''}`, () => {
    if (JCR.get(PR(), path)) queueReplication('Deactivate', [path]);
    JCR.remove(AR(), path);
    delete S.versions[path];
    flag('op:delete');
    toast('Page deleted.');
    goSites(JCR.parent(path));
  }, 'Delete');
};

A.pagePublish = () => openPublishDialog(S.ui.sitesSel);
A.pageUnpublish = () => {
  const path = S.ui.sitesSel;
  if (!JCR.get(PR(), path)) { toast('This page is not published.', 'warn'); return; }
  queueReplication('Deactivate', [path]);
  toast('Unpublish requested.');
  commit();
};

// References a page needs on publish: assets and the template (with its policies)
function unpublishedRefs(pagePath) {
  const a = AR();
  const p = PR();
  const refs = [];
  const c = pcOf(a, pagePath);
  if (!c) return refs;
  const tpl = c.props['cq:template'];
  if (tpl && JCR.get(a, tpl)) {
    const tc = pcOf(a, tpl);
    const onPub = JCR.get(p, tpl);
    const changed = tc && tc.props['cq:lastModified'] && (!tc.props['cq:lastReplicated'] || tc.props['cq:lastModified'] > tc.props['cq:lastReplicated']);
    if (!onPub || changed) refs.push({ path: tpl, label: `Template “${titleOf(a, tpl)}” + policies`, why: onPub ? 'modified' : 'not published' });
  }
  const seen = new Set();
  JCR.walk(c, '', n => {
    const ref = n.props.fileReference;
    if (ref && !seen.has(ref) && JCR.get(a, ref)) {
      seen.add(ref);
      if (!JCR.get(p, ref)) refs.push({ path: ref, label: `Asset ${JCR.name(ref)}`, why: 'not published' });
    }
  });
  return refs;
}

function openPublishDialog(path) {
  if (!secCan(path, 'crx:replicate')) return secDenied('publish — use Create ▾ Workflow → Request for Activation instead', path, 'crx:replicate');
  const refs = unpublishedRefs(path);
  if (!refs.length) {
    queueReplication('Activate', [path]);
    toast(`Publishing <code>${esc(path)}</code>…`);
    commit();
    return;
  }
  openModal({
    title: 'Publish — References',
    okLabel: 'Publish',
    body: `<p>The page uses items that are <b>not on Publish</b> (or changed). Select which ones to publish with it:</p>
      ${refs.map(x => `<label class="check"><input type="checkbox" name="ref" data-multi="1" value="${esc(x.path)}" checked> ${esc(x.label)} <small class="muted">(${x.why})</small></label>`).join('')}
      <p class="hint">Unchecked references will be missing on the published page.</p>`,
    ok: b => {
      const sel = formData(b).ref || [];
      queueReplication('Activate', [...sel, path]);
      toast(`Publishing <code>${esc(path)}</code>${sel.length ? ` + ${sel.length} reference(s)` : ''}…`);
      commit();
    },
  });
}

/* ---------- Assets console ---------- */

const DAM_ROOT = '/content/dam';
const DAM_FOLDERS = ['sling:Folder', 'nt:folder', 'sling:OrderedFolder'];

const isDamAsset = (r, p) => JCR.type(JCR.get(r, p)) === 'dam:Asset';

function damKids(r, p) {
  const n = JCR.get(r, p);
  if (!n || JCR.type(n) === 'dam:Asset') return [];
  return n.children.filter(c => c.name !== 'jcr:content' && (DAM_FOLDERS.includes(JCR.type(c)) || JCR.type(c) === 'dam:Asset')).map(c => JCR.join(p, c.name));
}

function damTitle(r, p) {
  if (p === DAM_ROOT) return 'Assets';
  const n = JCR.get(r, p);
  if (JCR.type(n) !== 'dam:Asset') return n.props['jcr:title'] || n.name;
  if (isCF(r, p)) return titleOf(r, p);
  return (JCR.get(n, 'jcr:content/metadata') || { props: {} }).props['dc:title'] || n.name;
}

// All DAM folders, for the Move dialog (renditions folders inside assets are not DAM folders)
function damFolders(r) {
  const out = [];
  JCR.walk(JCR.get(r, DAM_ROOT), DAM_ROOT, (n, p) => { if (DAM_FOLDERS.includes(JCR.type(n)) && !p.includes('/jcr:content')) out.push(p); });
  return out;
}

function fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}

function assetInfo(r, p) {
  const c = JCR.get(r, p + '/jcr:content') || { props: {} };
  const meta = JCR.get(r, p + '/jcr:content/metadata') || { props: {} };
  const data = String(readFile(r, p + '/jcr:content/renditions/original') || '');
  const mime = meta.props['dc:format'] || '';
  const comma = data.indexOf(',');
  let raw = '';
  try { raw = data.includes(';base64,') ? '' : decodeURIComponent(data.slice(comma + 1)); } catch (e) { /* not text */ }
  const bytes = data.includes(';base64,') ? Math.round((data.length - comma - 1) * 3 / 4) : new Blob([raw]).size;
  let w = meta.props['tiff:ImageWidth'];
  let h = meta.props['tiff:ImageLength'];
  const vb = !w && raw.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (vb) [w, h] = [vb[1], vb[2]];
  return {
    title: damTitle(r, p), modified: c.props['jcr:lastModified'], by: c.props['jcr:lastModifiedBy'] || 'admin',
    w, h, bytes, type: mime.split('/')[0].toUpperCase() || 'FILE', mime,
  };
}

// Everything under /content that points at p (or inside it): fileReference, fragment paths, CF references…
function damRefs(r, p) {
  const owners = new Set();
  JCR.walk(JCR.get(r, '/content'), '/content', (n, np) => {
    if (np === p || np.startsWith(p + '/')) return;
    const hit = Object.values(n.props).some(v => [].concat(v).some(s => typeof s === 'string' && (s === p || s.startsWith(p + '/'))));
    if (!hit) return;
    const i = np.indexOf('/jcr:content');
    owners.add(i > -1 ? np.slice(0, i) : np);
  });
  return [...owners];
}

function damRow(r, p, on, checked) {
  const asset = isDamAsset(r, p);
  const cf = asset && isCF(r, p);
  const src = asset && !cf ? assetSrc(r, p) : '';
  const title = damTitle(r, p);
  const hasKids = !asset && damKids(r, p).length > 0;
  const pub = asset && !!JCR.get(PR(), p);
  const nav = asset ? 'data-act="assetSel" data-kind="asset"' : `data-act="go" data-url="/assets.html${esc(p)}"`;
  return `<div class="ci ${on ? 'active' : ''} ${checked ? 'checked' : ''}" ${nav} data-path="${esc(p)}" ${cf ? 'data-dbl="cfOpen"' : ''} title="${esc(p)}">
    <span class="ci-thumb ${src ? 'img' : ''}" ${asset ? '' : `data-act="assetSel" data-kind="folder" data-path="${esc(p)}" title="Select"`} ${src ? `style="background-image:url('${src}')"` : ''}>${src ? '' : icon(cf ? 'DocumentFragment' : 'Folder', 24)}<i class="ci-check">${icon('Checkmark', 12)}</i></span>
    <span class="ci-text"><b>${esc(title)}</b>${title !== JCR.name(p) ? `<small>${esc(JCR.name(p))}</small>` : ''}</span>
    ${pub ? '<i class="ci-dot green" title="Published"></i>' : ''}
    ${hasKids ? `<span class="ci-arrow">${icon('ChevronRight', 14)}</span>` : ''}
  </div>`;
}

const pvRow = (k, v) => `<span>${k}</span><b>${v}</b>`;

function assetPreview(r, p) {
  const cf = isCF(r, p);
  const i = assetInfo(r, p);
  const src = cf ? '' : assetSrc(r, p);
  const pub = JCR.get(PR(), p);
  const model = cf && cfModelOf(r, p);
  return `<div class="col preview apreview">
    <div class="pv-thumb ${src ? 'img' : ''}" ${src ? `style="background-image:url('${src}')"` : ''}>${src ? '' : icon(cf ? 'DocumentFragment' : 'Asset', 48)}</div>
    <div class="pv-kvs">${pvRow('Title', esc(i.title))}${pvRow('Modified', fmtDate(i.modified))}${pvRow('Modified By', esc(i.by))}
      ${cf ? pvRow('Model', esc(model ? titleOf(r, model) : '?')) : ''}${i.w ? pvRow('Dimensions', `${esc(i.w)} x ${esc(i.h)} px`) : ''}
      ${cf ? '' : pvRow('Size', fmtBytes(i.bytes))}${pvRow('Type', cf ? 'CONTENT FRAGMENT' : esc(i.type))}${pvRow('Published', pub ? 'Yes' : 'No')}</div>
    <button class="btn outline" data-act="${cf ? 'cfOpen' : 'assetProps'}" data-path="${esc(p)}">More Details</button></div>`;
}

function folderPreview(r, p) {
  const imgs = [];
  JCR.walk(JCR.get(r, p), p, (n, np) => { if (imgs.length < 4 && JCR.type(n) === 'dam:Asset' && !isCF(r, np)) imgs.push(assetSrc(r, np)); });
  return `<div class="col preview apreview">
    <div class="pv-collage">${imgs.length ? imgs.map(s => `<i style="background-image:url('${s}')"></i>`).join('') : icon('Folder', 48)}</div>
    <div class="pv-kvs">${pvRow('Title', esc(damTitle(r, p)))}${pvRow('Name', esc(JCR.name(p)))}${pvRow('Items', damKids(r, p).length)}</div></div>`;
}

const qaOff = (ico, label, key) => `<button class="qa off" title="Not simulated in the lab">${icon(ico)}<span>${label}</span>${key ? `<kbd>(${key})</kbd>` : ''}</button>`;

function assetsSelectionBar(r, sel) {
  const asset = isDamAsset(r, sel);
  const cf = asset && isCF(r, sel);
  const pubMenu = `<details class="dd"><summary class="qa">${icon('Send')}<span>Manage Publication</span></summary><div class="dd-menu">
    <a href="#" data-act="assetPublish">Publish</a><a href="#" data-act="assetUnpublish">Unpublish</a></div></details>`;
  const edits = `${qa('assetCopy', 'Copy', 'Copy', 'ctrl+c')}${qa('assetMove', 'Move', 'Move', 'm')}${qa('assetDelete', 'Delete', 'Delete', 'backspace')}`;
  const actions = asset
    ? `${cf ? qa('cfOpen', 'Edit', 'Edit', 'e', `data-path="${esc(sel)}"`) : qaOff('Image', 'Smart Crop', 's')}${qaOff('Link', 'Share Link')}
       ${cf ? '' : qa('assetDownload', 'Download', 'Download')}${qaOff('LockClosed', 'Checkout')}${qa('assetProps', 'Properties', 'Properties', 'p')}
       ${qa('assetPublish', 'PublishCheck', 'Quick Publish')}${pubMenu}${qaOff('Label', 'Manage Tags')}${qaOff('Collection', 'To Collection')}${edits}`
    : `${qaOff('Link', 'Share Link')}${qaOff('Download', 'Download')}${qa('assetProps', 'Properties', 'Properties', 'p')}
       ${qa('assetPublish', 'PublishCheck', 'Quick Publish')}${pubMenu}${qaOff('Label', 'Manage Tags')}${qaOff('Collection', 'To Collection')}${edits}`;
  return selectionBar(actions, 'assetUncheck');
}

function assetsScreen(path) {
  const r = AR();
  if (!path.startsWith(DAM_ROOT) || !JCR.get(r, path)) path = DAM_ROOT;
  flag('visit:assets');
  // opened a component folder (page → component) in the My Site Media Library
  if (path.startsWith(MYSITE_DAM + '/corporate/assets/images/') && JCR.segs(path).length >= 8) flag('assets:mysite');
  const folder = isDamAsset(r, path) ? JCR.parent(path) : path;
  let sel = S.ui.assetsSel;
  if (sel && (!JCR.get(r, sel) || JCR.parent(sel) !== folder)) sel = S.ui.assetsSel = null;
  const card = S.ui.assetsView === 'card';

  const crumbs = [];
  for (let p = folder; p.startsWith(DAM_ROOT); p = JCR.parent(p)) crumbs.push(p);
  const crumb = `<details class="dd"><summary class="tb-crumb">${esc(damTitle(r, folder))}${icon('ChevronDown', 10)}</summary>
    <div class="dd-menu">${crumbs.map(p => `<a href="#" data-act="go" data-url="/assets.html${esc(p)}">${esc(damTitle(r, p))}</a>`).join('')}</div></details>`;
  const views = `<details class="dd right"><summary class="iconbtn tb-view" title="View">${icon(card ? 'ViewCard' : 'ViewColumn')}${icon('ChevronDown', 10)}</summary>
    <div class="dd-menu"><a href="#" data-act="assetsView" data-v="column">${icon('ViewColumn', 14)} Column View</a><a href="#" data-act="assetsView" data-v="card">${icon('ViewCard', 14)} Card View</a><a class="off">${icon('ViewList', 14)} List View</a></div></details>`;
  const clip = S.ui.assetClip && JCR.get(r, S.ui.assetClip) ? S.ui.assetClip : null;
  const bar = sel
    ? assetsSelectionBar(r, sel)
    : titleBar(`<span class="tb-rail">${icon('RailLeft')}<span>Content Only</span></span>`, crumb,
      `${clip ? `<button class="btn quiet" data-act="assetPaste" data-path="${esc(folder)}" title="Paste ${esc(clip)} here">${icon('Paste')} Paste</button>` : ''}
       <span class="muted small">${damKids(r, folder).length} items</span>
       <button class="btn quiet" disabled title="Not simulated in the lab">${icon('UploadToCloud')} Dropzone</button>
       ${folder !== DAM_ROOT ? `<details class="dd right"><summary class="btn primary rect">Create</summary><div class="dd-menu create-menu">
         <a href="#" data-act="assetFolder" data-path="${esc(folder)}">${icon('Folder', 16)} Folder</a><a href="#" data-act="assetUpload" data-path="${esc(folder)}">${icon('UploadToCloud', 16)} Files</a>
         <a href="#" data-act="cfCreate" data-path="${esc(folder)}">${icon('DocumentFragment', 16)} Content Fragment</a></div></details>` : ''}
       ${views}`);

  if (card) {
    const cards = damKids(r, folder).map(p => {
      const c = JCR.get(r, p);
      if (JCR.type(c) === 'dam:Asset' && isCF(r, p)) {
        const model = cfModelOf(r, p);
        return `<div class="acard ${sel === p ? 'sel' : ''}" data-act="assetSel" data-kind="asset" data-path="${esc(p)}" data-dbl="cfOpen" title="${esc(p)}">
          <div class="athumb cf-thumb">${icon('DocumentFragment', 48)}<i class="ci-check">${icon('Checkmark', 12)}</i></div>
          <div class="acard-info"><b>${esc(titleOf(r, p))}</b><small>Content Fragment · ${esc(model ? titleOf(r, model) : '?')}</small><small>${JCR.get(PR(), p) ? 'Published' : 'Not published'}</small></div></div>`;
      }
      if (JCR.type(c) === 'dam:Asset') {
        return `<div class="acard ${sel === p ? 'sel' : ''}" data-act="assetSel" data-kind="asset" data-path="${esc(p)}">
          <div class="athumb" style="background-image:url('${assetSrc(r, p)}')"><i class="ci-check">${icon('Checkmark', 12)}</i></div>
          <div class="acard-info"><b>${esc(damTitle(r, p))}</b><small>${esc(c.name.split('.').pop().toUpperCase())} · ${JCR.get(PR(), p) ? 'Published' : 'Not published'}</small></div></div>`;
      }
      return `<div class="acard folder ${sel === p ? 'sel' : ''}" data-act="go" data-url="/assets.html${esc(p)}"><div class="athumb">${icon('Folder', 48)}<i class="ci-check" data-act="assetSel" data-kind="folder" data-path="${esc(p)}">${icon('Checkmark', 12)}</i></div>
        <div class="acard-info"><b>${esc(damTitle(r, p))}</b><small>Folder</small></div></div>`;
    }).join('');
    return shell('Assets', `${bar}<div class="agrid">${cards || '<p class="muted">This folder is empty</p>'}</div>`);
  }

  // Column view: one column per level from /content/dam down to the open folder, then a preview
  const cols = [];
  for (let p = path; p.startsWith(DAM_ROOT); p = JCR.parent(p)) cols.unshift(p);
  const columns = cols.map(cp => {
    if (isDamAsset(r, cp)) return assetPreview(r, cp);
    const items = damKids(r, cp);
    if (!items.length) return cp === folder ? '<div class="col empty">This folder is empty</div>' : '';
    return `<div class="col">${items.map(p => damRow(r, p, cols.includes(p), sel === p)).join('')}</div>`;
  }).join('') + (sel && !isDamAsset(r, sel) ? folderPreview(r, sel) : '');
  return shell('Assets', `${bar}<div class="sites-wrap"><div class="columns">${columns}</div></div>`);
}

A.cfOpen = d => go('/editor.html' + (d.path || S.ui.assetsSel));

A.assetsView = d => {
  S.ui.assetsView = d.v;
  commit();
};

// Column view: clicking an asset opens its preview and selects it; a folder is selected from its thumbnail
A.assetSel = d => {
  const r = AR();
  const on = S.ui.assetsSel !== d.path;
  S.ui.assetsSel = on ? d.path : null;
  const url = (S.ui.url[S.ui.tab] || '').slice('/assets.html'.length);
  const folder = isDamAsset(r, url) ? JCR.parent(url) : url;
  if (S.ui.assetsView !== 'card' && isDamAsset(r, d.path)) go('/assets.html' + (on ? d.path : JCR.parent(d.path)));
  // a folder picked in an ancestor column: open its parent so the selection belongs to the open folder
  else if (on && JCR.parent(d.path) !== folder) go('/assets.html' + JCR.parent(d.path));
  else commit();
};
A.assetUncheck = () => {
  const p = S.ui.assetsSel;
  S.ui.assetsSel = null;
  if (p && S.ui.assetsView !== 'card' && isDamAsset(AR(), p)) go('/assets.html' + JCR.parent(p));
  else commit();
};

A.assetFolder = d => openModal({
  title: 'Create Folder',
  body: `${field('Title *', 'title', '')}${field('Name', 'name', '', 'Leave empty to generate it from the title. The name is the node name in the JCR (part of every asset URL).')}`,
  okLabel: 'Create',
  ok: b => {
    const f = formData(b);
    const t = f.title.trim();
    if (!t) { toast('Title is required.', 'error'); return false; }
    const parent = JCR.get(AR(), d.path);
    // like AEM: keep the case, turn every run of other characters into '-' ("C_007 -Hero" → "C_007--Hero")
    const name = (f.name.trim() || t).replace(/[^A-Za-z0-9_-]+/g, '-');
    if (parent.children.some(c => c.name === name)) { toast(`A folder named <code>${esc(name)}</code> already exists here.`, 'error'); return false; }
    parent.children.push(JCR.node(name, { 'jcr:primaryType': 'sling:Folder', 'jcr:title': t }));
    flag('asset:folder');
    if (d.path.startsWith(MYSITE_DAM + '/')) flag('asset:folder:mysite');
    toast(`Folder <code>${esc(name)}</code> created.`);
    commit();
  },
});

A.assetUpload = d => openModal({
  title: `Upload asset <small>${esc(d.path)}</small>`,
  okLabel: 'Upload',
  body: `${field('Title *', 'title', '')}
    <label class="check"><input type="radio" name="src" value="gen" checked> Generate a sample image</label>
    ${selectField('Style', 'kind', 'dunes', [['town', 'Old town'], ['dunes', 'Desert dunes'], ['sea', 'Sea'], ['mountains', 'Mountains']])}
    <label class="check"><input type="radio" name="src" value="file"> Upload an image from your computer (max 400 KB)</label>
    <input type="file" name="file" accept="image/*">`,
  ok: b => {
    const f = formData(b);
    const title = f.title.trim();
    if (!title) { toast('Title is required.', 'error'); return false; }
    const parent = JCR.get(AR(), d.path);
    const fileEl = b.querySelector('input[type=file]');
    const finish = (dataUri, mime, ext, w, h) => {
      const name = JCR.unique(parent, slug(title) + '.' + ext);
      const p = JCR.join(d.path, name);
      assetAt(AR(), p, title, dataUri, mime);
      JCR.get(AR(), p + '/jcr:content').props['jcr:lastModifiedBy'] = curUser();
      if (w) Object.assign(JCR.get(AR(), p + '/jcr:content/metadata').props, { 'tiff:ImageWidth': w, 'tiff:ImageLength': h });
      flag('asset:uploaded');
      if (d.path.startsWith(MYSITE_DAM + '/')) flag('asset:uploaded:mysite');
      closeModal();
      toast(`Uploaded <code>${esc(name)}</code>`);
      commit();
    };
    if (f.src === 'file') {
      const file = fileEl.files[0];
      if (!file) { toast('Choose a file first.', 'error'); return false; }
      if (file.size > 400 * 1024) { toast('That file is larger than 400 KB (the lab stores everything in your browser).', 'error'); return false; }
      const rd = new FileReader();
      rd.onload = () => {
        const args = [rd.result, file.type || 'image/png', (file.name.split('.').pop() || 'png').toLowerCase()];
        const img = new Image();
        img.onload = () => finish(...args, img.naturalWidth, img.naturalHeight);
        img.onerror = () => finish(...args);
        img.src = rd.result;
      };
      rd.readAsDataURL(file);
      return false;
    }
    const spec = { town: ['#f6d9a6', '#e9a15b'], dunes: ['#ffe2b0', '#f08a4b'], sea: ['#bfe8ff', '#2e86c1'], mountains: ['#d7ecff', '#6c8fb3'] }[f.kind];
    finish(svgImage(title, f.kind, spec[0], spec[1]), 'image/svg+xml', 'svg');
    return false;
  },
});

A.assetProps = d => {
  const r = AR();
  const p = (d && d.path) || S.ui.assetsSel;
  if (!isDamAsset(r, p)) {
    const n = JCR.get(r, p);
    openModal({
      title: `Folder Properties <small>${esc(p)}</small>`,
      body: `${field('Title', 'title', n.props['jcr:title'] || '')}<label class="field"><span>Name</span><input value="${esc(n.name)}" disabled></label>
        <p class="hint">Changing the title doesn't change the name; to rename the node use <b>Move</b>.</p>`,
      okLabel: 'Save & Close',
      ok: b => {
        const t = formData(b).title.trim();
        if (t) n.props['jcr:title'] = t;
        else delete n.props['jcr:title'];
        commit();
      },
    });
    return;
  }
  const meta = JCR.get(r, p + '/jcr:content/metadata');
  openModal({
    title: `Asset Properties <small>${esc(p)}</small>`,
    body: `${field('Title', 'title', meta.props['dc:title'])}<label class="field"><span>Description</span><textarea name="desc">${esc(meta.props['dc:description'] || '')}</textarea></label>
      <p class="hint">Metadata is stored at <code>${esc(p)}/jcr:content/metadata</code></p>`,
    okLabel: 'Save & Close',
    ok: b => {
      const f = formData(b);
      meta.props['dc:title'] = f.title;
      if (f.desc) meta.props['dc:description'] = f.desc;
      else delete meta.props['dc:description'];
      const c = JCR.get(r, p + '/jcr:content');
      Object.assign(c.props, { 'jcr:lastModified': now(), 'jcr:lastModifiedBy': curUser() });
      flag('asset:props');
      commit();
    },
  });
};

A.assetDownload = () => {
  const p = S.ui.assetsSel;
  const a = document.createElement('a');
  a.href = readFile(AR(), p + '/jcr:content/renditions/original');
  a.download = JCR.name(p);
  a.click();
};

A.assetPublish = () => {
  // a content fragment is published with the fragments and assets it references
  if (isCF(AR(), S.ui.assetsSel)) return cfPublishFlow(S.ui.assetsSel);
  queueReplication('Activate', [S.ui.assetsSel]);
  flag('asset:published');
  toast(isDamAsset(AR(), S.ui.assetsSel) ? 'Asset publishing…' : 'Publishing the folder and everything in it…');
  commit();
};

A.assetUnpublish = () => {
  if (!JCR.get(PR(), S.ui.assetsSel)) { toast('This item is not published.', 'warn'); return; }
  queueReplication('Deactivate', [S.ui.assetsSel]);
  commit();
};

// Delete Asset → (if referenced or published) Force Delete, like AEM
A.assetDelete = () => {
  const r = AR();
  const p = S.ui.assetsSel;
  if (!p) return;
  const doDelete = () => {
    if (JCR.get(PR(), p)) queueReplication('Deactivate', [p]);
    JCR.remove(r, p);
    S.ui.assetsSel = null;
    flag('asset:deleted');
    toast(`Deleted <code>${esc(p)}</code>`);
    go('/assets.html' + JCR.parent(p));
  };
  openModal({
    title: 'Delete Asset',
    style: 'alert',
    okLabel: 'Delete',
    body: `<p class="confirm">You are going to delete the following asset:</p><p><b>${esc(damTitle(r, p))}</b> <code>${esc(JCR.name(p))}</code></p>`,
    ok: () => {
      const refs = damRefs(r, p);
      const pub = !!JCR.get(PR(), p);
      if (!refs.length && !pub) { doDelete(); return; }
      flag('asset:forcedelete');
      setTimeout(() => openModal({
        title: `<span class="force-title">${icon('Alert', 18)} Force Delete</span>`,
        style: 'alert',
        cls: 'm-force',
        okLabel: 'Delete',
        body: `<p class="confirm">One or more item(s) has local references and/or activated.</p>
          ${refs.length ? `<p><b>Referenced by</b></p><ul class="ref-list">${refs.map(x => `<li><code>${esc(x)}</code></li>`).join('')}</ul>` : ''}
          ${pub ? '<p><b>Activated</b>: it is published. Deleting it also unpublishes it.</p>' : ''}
          <p class="hint">Deleting it anyway leaves broken images or links on those pages.</p>`,
        ok: doDelete,
      }), 0);
    },
  });
};

A.assetCopy = () => {
  S.ui.assetClip = S.ui.assetsSel;
  S.ui.assetsSel = null;
  toast(`Copied <code>${esc(JCR.name(S.ui.assetClip))}</code>. Open the target folder and press <b>Paste</b>.`);
  commit();
};

A.assetPaste = d => {
  const r = AR();
  const src = S.ui.assetClip;
  if (!src || !JCR.get(r, src)) return;
  if (d.path === src || d.path.startsWith(src + '/')) { toast('You cannot paste a folder into itself.', 'error'); return; }
  const parent = JCR.get(r, d.path);
  const copy = JCR.clone(JCR.get(r, src));
  const dot = copy.name.lastIndexOf('.');
  const [base, ext] = dot > 0 ? [copy.name.slice(0, dot), copy.name.slice(dot)] : [copy.name, ''];
  let name = copy.name;
  for (let i = 1; parent.children.some(c => c.name === name); i++) name = base + i + ext;
  copy.name = name;
  // a copy is a new, unpublished item
  JCR.walk(copy, '', n => { delete n.props['cq:lastReplicated']; delete n.props['cq:lastReplicationAction']; });
  parent.children.push(copy);
  S.ui.assetClip = null;
  flag('asset:copied');
  toast(`Pasted as <code>${esc(name)}</code>`);
  commit();
};

A.assetMove = () => {
  const r = AR();
  const p = S.ui.assetsSel;
  const refs = damRefs(r, p);
  const folders = damFolders(r).filter(f => f !== p && !f.startsWith(p + '/'));
  openModal({
    title: `Move <small>${esc(p)}</small>`,
    okLabel: 'Move',
    body: `${field('Name', 'name', JCR.name(p))}
      ${selectField('Destination', 'dest', JCR.parent(p), folders.map(f => [f, f.slice(DAM_ROOT.length) || '/']))}
      <label class="check"><input type="checkbox" name="adjust" ${refs.length ? 'checked' : 'disabled'}> Adjust references${refs.length ? ` (${refs.length}: ${refs.map(x => `<code>${esc(x)}</code>`).join(', ')})` : ' (nothing references it)'}</label>
      <p class="hint">Without adjusting, every page that points to the old path shows a broken image.</p>`,
    ok: b => {
      const f = formData(b);
      const name = f.name.trim();
      if (!name || /[/\s]/.test(name)) { toast('Enter a valid name (no spaces or slashes).', 'error'); return false; }
      const np = JCR.join(f.dest, name);
      if (np === p) { toast('Choose another folder or name.', 'warn'); return false; }
      if (JCR.get(r, np)) { toast(`<code>${esc(np)}</code> already exists.`, 'error'); return false; }
      if (JCR.get(PR(), p)) queueReplication('Deactivate', [p]);
      const node = JCR.get(r, p);
      JCR.remove(r, p);
      node.name = name;
      JCR.get(r, f.dest).children.push(node);
      let n = 0;
      if (f.adjust) {
        JCR.walk(JCR.get(r, '/content'), '/content', x => {
          for (const [k, v] of Object.entries(x.props)) {
            const fix = s => (typeof s === 'string' && (s === p || s.startsWith(p + '/')) ? (n++, np + s.slice(p.length)) : s);
            x.props[k] = Array.isArray(v) ? v.map(fix) : fix(v);
          }
        });
      }
      S.ui.assetsSel = null;
      flag('asset:moved');
      if (n) flag('asset:moved:refs');
      toast(`Moved to <code>${esc(np)}</code>${f.adjust ? ` · ${n} reference(s) updated. Republish those pages.` : ''}`);
      go('/assets.html' + f.dest);
    },
  });
};

/* ---------- Templates console ---------- */

function templateList(r) {
  const base = JCR.get(r, TPL_ROOT);
  return (base ? base.children : []).filter(t => JCR.type(t) === 'cq:Template').map(t => {
    const path = TPL_ROOT + '/' + t.name;
    const c = JCR.get(t, 'jcr:content');
    return { path, name: t.name, c: c ? c.props : {} };
  });
}

function templatesScreen() {
  const r = AR();
  flag('visit:templates');
  const list = templateList(r);
  const sel = S.ui.tplSel && list.some(t => t.path === S.ui.tplSel) ? S.ui.tplSel : null;
  const selT = sel && list.find(t => t.path === sel);
  const usage = path => allPagePaths(r).filter(p => (pcOf(r, p) || { props: {} }).props['cq:template'] === path).length;
  const bar = selT
    ? selectionBar(`${qa('tplOpen', 'Edit', 'Open', 'e')}
        ${selT.c.status === 'enabled' ? qa('tplStatus', 'RemoveCircle', 'Disable', '', 'data-s="disabled"') : qa('tplStatus', 'CheckmarkCircle', 'Enable', '', 'data-s="enabled"')}
        ${qa('tplPublish', 'PublishCheck', 'Publish')}${qa('tplDelete', 'Delete', 'Delete', 'backspace')}`, 'tplUncheck')
    : titleBar('', '<span class="tb-crumb">WKND Sites Project</span>', '<button class="btn primary" data-act="tplCreate">Create</button>');
  return shell('Templates', `${bar}
    <div class="agrid">${list.map(t => {
      const pub = !!JCR.get(PR(), t.path);
      const changed = pub && t.c['cq:lastModified'] && t.c['cq:lastReplicated'] && t.c['cq:lastModified'] > t.c['cq:lastReplicated'];
      const st = { enabled: 'green', draft: 'orange', disabled: 'grey' }[t.c.status] || 'grey';
      return `<div class="acard ${sel === t.path ? 'sel' : ''}" data-act="tplSel" data-path="${esc(t.path)}" data-dbl="tplOpenPath" title="${esc(t.path)}">
        <div class="athumb tpl-thumb">${icon('FileTemplate', 48)}<i class="ci-check">${icon('Checkmark', 12)}</i></div>
        <div class="acard-info"><b>${esc(t.c['jcr:title'] || t.name)}</b>
          <small><span class="status-dot ${st}"></span>${esc((t.c.status || 'draft').replace(/^./, c => c.toUpperCase()))} · ${usage(t.path)} page(s)</small>
          <small>${pub ? (changed ? 'Modified since publish' : 'Published') : 'Not published'} · ${fmtDate(t.c['cq:lastModified'])}</small></div></div>`;
    }).join('')}</div>
    <p class="hint pad">Select a template by clicking its card. Only <b>enabled</b> templates can be used to create pages.</p>`);
}

A.tplSel = d => {
  S.ui.tplSel = S.ui.tplSel === d.path ? null : d.path;
  commit();
};
A.tplUncheck = () => {
  S.ui.tplSel = null;
  commit();
};
A.tplOpen = () => go('/editor.html' + S.ui.tplSel + '/structure.html');
A.tplOpenPath = d => go('/editor.html' + d.path + '/structure.html');
A.tplStatus = d => {
  const c = pcOf(AR(), S.ui.tplSel);
  c.props.status = d.s;
  c.props['cq:lastModified'] = now();
  if (d.s === 'enabled') flag('tpl:enabled');
  toast(`Template ${d.s}.`);
  commit();
};
A.tplPublish = () => {
  queueReplication('Activate', [S.ui.tplSel]);
  toast('Publishing template and policies…');
  commit();
};
A.tplDelete = () => {
  const p = S.ui.tplSel;
  const used = allPagePaths(AR()).filter(x => (pcOf(AR(), x) || { props: {} }).props['cq:template'] === p);
  if (used.length) { toast(`Template is used by ${used.length} page(s) and cannot be deleted.`, 'error'); return; }
  confirmBox('Delete template', `Delete <code>${esc(p)}</code>?`, () => {
    JCR.remove(AR(), p);
    S.ui.tplSel = null;
    commit();
  }, 'Delete');
};

A.tplCreate = () => {
  const r = AR();
  const types = (JCR.get(r, '/conf/wknd/settings/wcm/template-types') || { children: [] }).children.map(t => '/conf/wknd/settings/wcm/template-types/' + t.name);
  openModal({
    title: 'Create Template',
    okLabel: 'Create',
    body: `${selectField('Template Type', 'type', types[0], types.map(t => [t, titleOf(r, t)]), 'New templates are copied from a template type')}
      ${field('Template Title *', 'title', '')}<label class="field"><span>Description</span><textarea name="desc"></textarea></label>`,
    ok: b => {
      const f = formData(b);
      if (!f.title.trim()) { toast('Title is required.', 'error'); return false; }
      const base = JCR.get(r, TPL_ROOT);
      const name = JCR.unique(base, slug(f.title));
      const path = TPL_ROOT + '/' + name;
      const type = JCR.get(r, f.type);
      const t = JCR.node(name, { 'jcr:primaryType': 'cq:Template' }, [
        JCR.node('jcr:content', { 'jcr:title': f.title.trim(), 'jcr:description': f.desc || '', status: 'draft', 'cq:templateType': f.type, 'cq:lastModified': now() }),
      ]);
      for (const part of ['structure', 'initial', 'policies']) {
        const src = JCR.get(type, part);
        if (src) t.children.push(JCR.clone(src));
      }
      for (const part of ['structure', 'initial']) {
        const c = JCR.get(t, part + '/jcr:content');
        if (c) c.props['cq:template'] = path;
      }
      base.children.push(t);
      flag('tpl:created');
      S.ui.tplSel = path;
      toast('Template created as <b>draft</b>. Add components to its structure, then enable it.');
      go('/editor.html' + path + '/structure.html');
    },
  });
};
