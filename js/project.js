/* The WKND Maven project on the learner's disk (Desktop tab). Like a Git checkout of the archetype:
   `mvn clean install` writes the content packages to each module's target folder, and the
   autoInstall profiles deploy them to a running instance. The packages hold the project's code and
   content (a fresh seed), never the edits made in CRXDE — exactly why real teams don't edit there. */

const PROJ_DIR = 'F:\\projects\\wknd';
const PROJ_GROUP = 'com.adobe.aem.guides';
const PROJ_VERSION = '1.0.0-SNAPSHOT';
// folder, artifactId, packaging, title (archetype reactor order)
const PROJ_MODULES = [
  ['core', 'wknd.core', 'jar', 'Core'],
  ['ui.frontend', 'wknd.ui.frontend', 'pom', 'UI Frontend'],
  ['ui.apps.structure', 'wknd.ui.apps.structure', 'pom', 'Repository Structure Package'],
  ['ui.apps', 'wknd.ui.apps', 'content-package', 'UI apps'],
  ['ui.config', 'wknd.ui.config', 'content-package', 'UI config'],
  ['ui.content', 'wknd.ui.content', 'content-package', 'UI content'],
  ['all', 'wknd.all', 'content-package', 'All'],
  ['dispatcher', 'wknd.dispatcher.cloud', 'pom', 'Dispatcher'],
];
// filter.xml of each content package (ui.content uses merge so deploys never overwrite authors' work)
const PROJ_FILTERS = {
  'ui.apps': [{ root: '/apps/wknd/components', mode: 'replace' }, { root: '/apps/wknd/clientlibs', mode: 'replace' }],
  'ui.config': [{ root: '/apps/wknd/osgiconfig', mode: 'replace' }],
  'ui.content': [{ root: '/conf/wknd', mode: 'merge' }, { root: '/content/wknd', mode: 'merge' }, { root: '/content/dam/wknd', mode: 'merge' }],
  all: [{ root: '/apps/wknd-packages', mode: 'replace' }],
};
const PROJ_PROFILES = {
  autoInstallSinglePackage: { k: 'author', port: 4502, single: true },
  autoInstallSinglePackagePublish: { k: 'publish', port: 4503, single: true },
  autoInstallPackage: { k: 'author', port: 4502 },
  autoInstallPackagePublish: { k: 'publish', port: 4503 },
};

function proj() {
  return S.project || (S.project = { cwd: PROJ_DIR, built: {}, term: [], busy: false });
}
const projMod = folder => PROJ_MODULES.find(m => m[0] === folder);
const projArtifact = m => `${m[1]}-${PROJ_VERSION}.${m[2] === 'jar' ? 'jar' : 'zip'}`;
const projHasTarget = m => m[2] !== 'pom' && !!proj().built[m[0]];

/* ---------- the disk: F:\ ---------- */

// Lists a folder of the simulated disk: [{ name, dir, size }] or null if it does not exist
function projFs(path) {
  const p = path.replace(/\\+$/, '') || 'F:';
  const d = (name, size) => ({ name, dir: true, size: size || '' });
  const f = (name, size) => ({ name, dir: false, size });
  if (/^F:$/i.test(p)) return [d('AEM'), d('projects')];
  if (/^F:\\AEM$/i.test(p)) return [d('author'), d('publish')];
  const im = p.match(/^F:\\AEM\\(author|publish)$/i);
  if (im) { const I = inst(im[1].toLowerCase()); return [f(I.jar, '612 MB'), f('license.properties', '1 KB'), ...(I.installed ? [d('crx-quickstart')] : [])]; }
  if (/^F:\\projects$/i.test(p)) return [d('wknd')];
  if (p.toLowerCase() === PROJ_DIR.toLowerCase()) return [d('.git'), ...PROJ_MODULES.map(m => d(m[0])), f('pom.xml', '38 KB'), f('README.md', '6 KB')];
  const rest = p.slice(PROJ_DIR.length + 1).split('\\');
  if (p.toLowerCase().startsWith(PROJ_DIR.toLowerCase() + '\\')) {
    const m = projMod(rest[0]);
    if (!m) return rest[0] === '.git' && rest.length === 1 ? [f('HEAD', '1 KB'), d('objects'), d('refs')] : null;
    if (rest.length === 1) return [f('pom.xml', '9 KB'), d('src'), ...(projHasTarget(m) ? [d('target')] : [])];
    if (rest.length === 2 && rest[1] === 'target' && projHasTarget(m)) return [f(projArtifact(m), m[0] === 'all' ? '412 KB' : m[2] === 'jar' ? '58 KB' : '96 KB'), ...(m[2] === 'jar' ? [d('classes')] : [])];
    if (rest.length === 2 && rest[1] === 'src') return [d('main')];
    if (rest[1] === 'src' || rest[1] === 'target') return [];
  }
  return null;
}

function projResolve(cwd, arg) {
  if (!arg || arg === '.') return cwd;
  let parts = /^[a-z]:/i.test(arg) ? [] : cwd.split('\\');
  if (arg.startsWith('\\')) { parts = ['F:']; arg = arg.slice(1); }
  for (const s of arg.replace(/\//g, '\\').split('\\').filter(Boolean)) {
    if (s === '.') continue;
    if (s === '..') { if (parts.length > 1) parts.pop(); continue; }
    if (/^[a-z]:$/i.test(s)) { parts = ['F:']; continue; }
    const list = projFs(parts.join('\\')) || [];
    const hit = list.find(e => e.name.toLowerCase() === s.toLowerCase());
    parts.push(hit ? hit.name : s);
  }
  return parts.join('\\');
}

/* ---------- the packages the build produces ---------- */

// Builds the zip a module's target folder holds (all embeds the others, like the archetype's "all" package)
async function projectZip(folder) {
  const src = seedAuthor();
  const site = JCR.get(src, SITE_ROOT);
  site.children = site.children.filter(c => c.name === 'jcr:content'); // ui.content ships the site skeleton only
  const zipOf = async (name, filters, content) => {
    const p = { name, group: PROJ_GROUP, version: PROJ_VERSION, desc: `${name} module of the WKND project`, filters, content, created: now() };
    return new Uint8Array(await ZIP.write(VAULT.toFiles(p)).arrayBuffer());
  };
  const moduleZip = (f) => {
    const content = JCR.node('', { 'jcr:primaryType': 'rep:root' });
    for (const x of PROJ_FILTERS[f]) {
      const n = JCR.get(src, x.root);
      if (!n) continue;
      ensureAncestors(content, JCR.parent(x.root), src);
      JCR.put(content, JCR.parent(x.root), JCR.clone(n));
    }
    return zipOf('wknd.' + f, PROJ_FILTERS[f], content);
  };
  if (folder !== 'all') return new Blob([await moduleZip(folder)], { type: 'application/zip' });
  const files = VAULT.toFiles({ name: 'wknd.all', group: PROJ_GROUP, version: PROJ_VERSION, desc: 'WKND all-in-one package: embeds the module packages and the core bundle', filters: PROJ_FILTERS.all, content: JCR.node('', {}), created: now() });
  const install = 'jcr_root/apps/wknd-packages/application/install/';
  for (const f of ['ui.apps', 'ui.config', 'ui.content']) files.push({ name: `${install}wknd.${f}-${PROJ_VERSION}.zip`, data: await moduleZip(f) });
  files.push({ name: `${install}wknd.core-${PROJ_VERSION}.jar`, data: 'PK (OSGi bundle with the Java code from core/)' });
  return ZIP.write(files);
}

/* ---------- Desktop panel ---------- */

function projectPanel() {
  const P = proj();
  const built = Object.values(P.built).filter(Boolean).sort().pop();
  const rows = PROJ_MODULES.map(m => `<tr><td>📁 ${esc(m[0])}</td><td class="muted">${esc(m[2])}</td>
    <td>${projHasTarget(m) ? `<code>target\\${esc(projArtifact(m))}</code>` : m[2] === 'pom' ? '' : '<span class="muted">no target yet</span>'}</td></tr>`).join('');
  return `<div class="desk-head proj-head">
      <h2>${esc(PROJ_DIR)} — your project</h2>
      <p>The WKND project as it is in <b>Git</b>, built with <b>Maven</b>. <code>mvn clean install</code> puts the content packages in each module's <code>target</code> folder; add <code>-PautoInstallSinglePackage</code> to also deploy to the Author on 4502.</p>
    </div>
    <div class="inst proj">
      <div class="inst-head"><b>${esc(PROJ_DIR)}</b> <span class="muted">git: main · ${PROJ_GROUP}:wknd ${PROJ_VERSION}</span>
        ${P.busy ? '<span class="pill orange">● Building…</span>' : built ? `<span class="pill green">● Built ${fmtDate(built)}</span>` : '<span class="pill grey">● Not built</span>'}</div>
      <table class="files"><tr><th>Module</th><th>Packaging</th><th>Output</th></tr>${rows}</table>
      <div class="term" id="term-project">${P.term.map(l => `<div class="${l.c || ''}">${esc(l.t)}</div>`).join('')}</div>
      <form class="term-in" data-submit="mvn" data-k="project">
        <span>${esc(P.cwd)}&gt;</span><input name="cmd" autocomplete="off" spellcheck="false" placeholder="e.g. mvn clean install" ${P.busy ? 'disabled' : ''}>
      </form>
      <div class="inst-actions">
        <button class="btn quiet small" data-act="mvnRun" data-cmd="mvn clean install" ${P.busy ? 'disabled' : ''}>▶ mvn clean install</button>
        <button class="btn quiet small" data-act="mvnRun" data-cmd="mvn clean install -PautoInstallSinglePackage" ${P.busy ? 'disabled' : ''}>▶ … -PautoInstallSinglePackage</button>
      </div>
    </div>`;
}

function projPrint(t, c) {
  const P = proj();
  P.term.push({ t, c });
  if (P.term.length > 300) P.term.splice(0, P.term.length - 300);
}

A.mvnRun = d => {
  const P = proj();
  if (P.busy) return;
  if (P.cwd.toLowerCase() !== PROJ_DIR.toLowerCase()) P.cwd = PROJ_DIR;
  SUBMIT.mvn({ cmd: d.cmd });
};

SUBMIT.mvn = f => {
  const P = proj();
  const cmd = String(f.cmd || '').trim();
  render.termFocus = 'project';
  if (!cmd || P.busy) return;
  projPrint(`${P.cwd}>${cmd}`, 'cmd');
  const parts = cmd.split(/\s+/);
  const c0 = parts[0].toLowerCase();
  if (c0 === 'cls' || c0 === 'clear') P.term = [];
  else if (c0 === 'help') {
    projPrint('Commands: dir | ls [folder], cd <folder> | cd .., mvn clean install [-P<profile>], mvn clean, mvn -v, git status, cls');
    projPrint('Profiles: autoInstallSinglePackage (all → Author 4502), autoInstallSinglePackagePublish (all → Publish 4503), autoInstallPackage (each package → 4502)', 'muted');
  } else if (c0 === 'dir' || c0 === 'ls') {
    const path = projResolve(P.cwd, parts[1]);
    const list = projFs(path);
    if (!list) projPrint('File Not Found', 'err');
    else {
      flag('proj:dir:' + path.toLowerCase());
      projPrint(` Directory of ${path}`);
      list.forEach(e => projPrint(`   ${e.dir ? '<DIR>         ' : (e.size || '').padStart(9) + '     '}${e.name}`));
      if (!list.length) projPrint('   (empty)', 'muted');
    }
  } else if (c0 === 'cd' || c0 === 'chdir') {
    if (!parts[1]) projPrint(P.cwd);
    else {
      const path = projResolve(P.cwd, parts.slice(1).join(' '));
      if (projFs(path)) P.cwd = path;
      else projPrint('The system cannot find the path specified.', 'err');
    }
  } else if (c0 === 'git') {
    if (parts[1] === 'status') { flag('proj:git:status'); projPrint('On branch main'); projPrint("Your branch is up to date with 'origin/main'."); projPrint(''); projPrint('nothing to commit, working tree clean'); projPrint('(target folders are in .gitignore: build output never goes to Git)', 'muted'); }
    else if (parts[1] === 'pull') projPrint('Already up to date.');
    else projPrint('The lab supports git status and git pull.', 'muted');
  } else if (c0 === 'java' && parts[1] === '-version') {
    projPrint('openjdk version "11.0.24" 2024-07-16 LTS');
  } else if (c0 === 'mvn') {
    mvnCommand(parts.slice(1));
    return;
  } else projPrint(`'${parts[0]}' is not recognized as an internal or external command, operable program or batch file.`, 'err');
  commit();
};

function mvnCommand(args) {
  const P = proj();
  if (args[0] === '-v' || args[0] === '--version') {
    flag('mvn:version');
    ['Apache Maven 3.9.9', `Maven home: C:\\tools\\apache-maven-3.9.9`, 'Java version: 11.0.24, vendor: Eclipse Adoptium', 'OS name: "windows 11", arch: "amd64"'].forEach(t => projPrint(t));
    return commit();
  }
  // where pom.xml is: the project root builds every module, a module folder builds only itself
  const here = P.cwd.toLowerCase() === PROJ_DIR.toLowerCase() ? null : projMod(P.cwd.slice(PROJ_DIR.length + 1));
  const atRoot = P.cwd.toLowerCase() === PROJ_DIR.toLowerCase();
  if (!atRoot && !(here && P.cwd.slice(PROJ_DIR.length + 1) === here[0])) {
    projPrint('[ERROR] The goal you specified requires a project to execute but there is no POM in this directory (' + P.cwd + '). Please verify you invoked Maven from the correct directory.', 'err');
    flag('mvn:nopom');
    return commit();
  }
  const goals = args.filter(a => !a.startsWith('-'));
  const profiles = args.filter(a => a.startsWith('-P')).flatMap(a => a.slice(2).split(',')).filter(Boolean);
  if (!goals.length) {
    projPrint('[ERROR] No goals have been specified for this build. Try: mvn clean install', 'err');
    return commit();
  }
  const known = ['clean', 'compile', 'test', 'package', 'verify', 'install'];
  const bad = goals.find(g => !known.includes(g));
  if (bad) {
    projPrint(`[ERROR] Unknown lifecycle phase "${bad}". You must specify a valid lifecycle phase, e.g. clean, package or install.`, 'err');
    return commit();
  }
  const mods = here ? [here] : PROJ_MODULES;
  const clean = goals.includes('clean');
  const build = goals.some(g => ['package', 'verify', 'install'].includes(g));
  const deploy = profiles.map(p => [p, PROJ_PROFILES[p]]);
  const lines = [['[INFO] Scanning for projects...']];
  for (const [p, prof] of deploy) if (!prof) lines.push([`[WARNING] The requested profile "${p}" could not be activated because it does not exist.`, 'err']);
  if (!here) {
    lines.push(['[INFO] ------------------------------------------------------------------------'], ['[INFO] Reactor Build Order:'], ['[INFO]'], ['[INFO] WKND Sites Project                                                  [pom]']);
    mods.forEach(m => lines.push([`[INFO] WKND Sites Project - ${m[3]}`.padEnd(70) + `[${m[2]}]`]));
  }
  for (const m of mods) {
    lines.push(['[INFO]'], [`[INFO] -----------------< ${PROJ_GROUP}:${m[1]} >-----------------`], [`[INFO] Building WKND Sites Project - ${m[3]} ${PROJ_VERSION}`]);
    if (clean) lines.push([`[INFO] --- maven-clean-plugin:3.2.0:clean (default-clean) @ ${m[1]} ---`, 'muted'], ...(proj().built[m[0]] ? [[`[INFO] Deleting ${PROJ_DIR}\\${m[0]}\\target`, 'muted']] : []));
    if (build) {
      if (m[0] === 'core') lines.push(['[INFO] --- maven-compiler-plugin:3.11.0:compile @ wknd.core ---', 'muted'], ['[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0', 'muted']);
      if (m[0] === 'ui.frontend') lines.push(['[INFO] --- frontend-maven-plugin:1.12.1:npm (npm run prod) @ wknd.ui.frontend ---', 'muted'], ['[INFO] webpack compiled successfully → ui.apps/…/clientlib-site', 'muted']);
      if (m[2] === 'jar') lines.push([`[INFO] Building jar: ${PROJ_DIR}\\${m[0]}\\target\\${projArtifact(m)}`]);
      if (m[2] === 'content-package') lines.push([`[INFO] --- filevault-package-maven-plugin:1.3.4:package (default-package) @ ${m[1]} ---`, 'muted'], [`[INFO] Building content package: ${PROJ_DIR}\\${m[0]}\\target\\${projArtifact(m)}`]);
      if (goals.includes('install') && m[2] !== 'pom') lines.push([`[INFO] Installing ${projArtifact(m)} to C:\\Users\\you\\.m2\\repository\\com\\adobe\\aem\\guides\\${m[1]}\\${PROJ_VERSION}`, 'muted']);
    }
    lines.push([{ mod: m, clean, build }]);
  }
  // deploy profiles: content-package-maven-plugin posts the zip to the instance's Package Manager service
  const targets = [];
  if (build) {
    for (const [, prof] of deploy) {
      if (!prof) continue;
      const pkgs = prof.single ? mods.filter(m => m[0] === 'all') : mods.filter(m => m[2] === 'content-package' && m[0] !== 'all');
      for (const m of pkgs) targets.push({ m, prof });
    }
  }
  P.busy = true;
  render.termFocus = 'project';
  let i = 0;
  let failed = null;
  const finish = () => {
    P.busy = false;
    if (failed) {
      projPrint('[INFO] ------------------------------------------------------------------------');
      projPrint('[INFO] BUILD FAILURE', 'err');
      projPrint('[INFO] ------------------------------------------------------------------------');
      projPrint(failed, 'err');
    } else {
      projPrint('[INFO] ------------------------------------------------------------------------');
      projPrint('[INFO] BUILD SUCCESS', 'ok');
      projPrint('[INFO] ------------------------------------------------------------------------');
      projPrint(`[INFO] Total time:  ${build ? (here ? '0' : '1') + ':' + String(10 + Math.floor(Math.random() * 40)).padStart(2, '0') + ' min' : '0.8 s'}`);
      if (build) { flag('mvn:build'); flag(here ? 'mvn:build:module:' + here[0] : 'mvn:build:reactor'); }
      if (clean && !build) flag('mvn:clean');
    }
    commit();
  };
  const deployNext = j => {
    if (j >= targets.length) return finish();
    const { m, prof } = targets[j];
    const I = inst(prof.k);
    projPrint(`[INFO] --- content-package-maven-plugin:1.0.2:install (install-package) @ ${m[1]} ---`, 'muted');
    projPrint(`[INFO] Installing ${m[1]} (${PROJ_DIR}\\${m[0]}\\target\\${projArtifact(m)}) to http://localhost:${prof.port}/crx/packmgr/service.jsp`);
    if (!I || !I.running || I.port !== prof.port) {
      S.events['mvn:refused'] = Date.now();
      failed = `[ERROR] Failed to execute goal com.day.jcr.vault:content-package-maven-plugin:1.0.2:install (install-package) on project ${m[1]}: Connection refused: connect (is AEM running on localhost:${prof.port}?)`;
      return finish();
    }
    commit();
    deployPackage(prof.k, projectZip(m[0]).then(b => b.arrayBuffer()), projArtifact(m), true).then(p => {
      projPrint(`[INFO] Package installed in ${300 + Math.floor(Math.random() * 600)}ms.`, 'ok');
      flag('mvn:deploy:' + prof.k);
      // the latest deploy times: lessons check that a deploy came after an edit
      S.events[`mvn:deploy:${prof.k}:last`] = S.events[`mvn:deploy:${prof.k}:${m[0]}:last`] = Date.now();
      deployNext(j + 1);
    }).catch(err => { failed = `[ERROR] ${err.message}`; finish(); });
  };
  const tick = () => {
    const [t, c] = lines[i++];
    if (t && typeof t === 'object') {
      if (t.clean) delete P.built[t.mod[0]];
      if (t.build && t.mod[2] !== 'pom') P.built[t.mod[0]] = now();
    } else projPrint(t, c);
    if (i < lines.length) {
      commit();
      setTimeout(tick, 70);
    } else deployNext(0);
  };
  commit();
  setTimeout(tick, 120);
}
