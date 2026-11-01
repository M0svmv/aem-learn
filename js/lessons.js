/* Lessons panel: a curriculum in levels. Every lesson has Learn (the explanation), Practice (tasks that tick themselves,
   each with a "Show me" guided tour) and a Quiz. The lessons themselves live in js/lessons/*.js. */

const PLAYLIST = 'https://www.youtube.com/playlist?list=PLEaEQSM_Y4tkUG33kZ59VohXwnTG4k8Ty';

const F = n => !!S.events[n];
const crxSeen = pred => S.crxVisited.some(v => v.startsWith('author:') && pred(v.slice(7)));
const pageProp = (path, prop) => {
  const c = JCR.get(AR(), path + '/jcr:content');
  return c ? c.props[prop] : undefined;
};

function policiesOf(rt) {
  const f = JCR.get(AR(), POLICY_ROOT + '/' + rt);
  return f ? f.children : [];
}

function styleWithClass(rt, cls) {
  for (const p of policiesOf(rt)) for (const g of styleGroups(p)) for (const s of g.styles) if (s.classes.split(/\s+/).includes(cls)) return s;
  return null;
}

function styleUsed(id) {
  return !!id && JCR.find(AR(), '/content', n => (n.props['cq:styleIds'] || []).includes(id)).length > 0;
}

function customModelWithBothSteps() {
  const base = JCR.get(AR(), WF_DESIGN);
  return (base ? base.children : []).some(m => {
    if (SEED_MODELS.includes(m.name)) return false;
    const steps = designSteps(m.name);
    return steps.some(s => s.type === 'PARTICIPANT') && steps.some(s => s.type === 'PROCESS' && s.process === 'activate');
  });
}

const ABOUT = SITE_ROOT + '/about';
const PROMO = XF_ROOT + '/wknd/promo/master';
const PROMO_TITLE = PROMO + '/jcr:content/root/title';
const promoTitle = r => (JCR.get(r, PROMO_TITLE) || { props: {} }).props['jcr:title'];

/* ---------- curriculum ---------- */

const L = (ar, en) => ({ ar, en });
const tx = v => gtx(v);
// a guide step: the control to point at, what to say, and options (tab, at, go, next)
const step = (el, ar, en, o) => ({ el, say: L(ar, en), ...(o || {}) });
// Sites console steps: open a folder/page column by clicking its row
// CRXDE: the ▸ arrow expands a node, a click on its name selects it
const crxOpen = (path, ar, en) => step(`.ct-row[data-path="${path}"] .ct-tog`, ar, en, { at: '/crx/de', skip: () => S.ui.crx.author.open.includes(path) });
const crxSel = (path, ar, en) => step(`.ct-row[data-path="${path}"] .ct-name`, ar, en, { at: '/crx/de', go: '/crx/de/index.jsp#' + path });
const sitesPath = (path, ar, en) => step(`.ci[data-path="${path}"]`, ar, en, { at: '/sites.html', skip: () => S.ui.sitesSel === path || String(S.ui.sitesSel).startsWith(path + '/') });

const LEVELS = [
  [1, L('الأساسيات', 'Foundations'), L('تشغيل AEM، الـ consoles، الـ JCR، والصفحات', 'Running AEM, the consoles, the JCR and pages')],
  [2, L('الـ Authoring', 'Authoring'), L('الـ components، الـ editor، الـ fragments والـ assets', 'Components, the editor, fragments and assets')],
  [3, L('الـ Templates والـ Front-end', 'Templates & Front-end'), L('editable templates، policies، clientlibs، Style System', 'Editable templates, policies, clientlibs, Style System')],
  [4, L('النشر والتشغيل', 'Publishing & Operations'), L('versions، replication، dispatcher، workflows، packages، الصلاحيات', 'Versions, replication, dispatcher, workflows, packages, permissions')],
  [5, L('مواقع ولغات متعددة', 'Multi-site & Languages'), L('MSM، live copies، launches، language copies', 'MSM, live copies, launches, language copies')],
  [6, L('المطوّر والـ Architecture', 'Developer & Architecture'), L('Sling، تبني components بـ HTL، OSGi، QueryBuilder، Headless، Sitecore → AEM', 'Sling, building components with HTL, OSGi, QueryBuilder, headless, Sitecore → AEM')],
  [7, L('المشروع النهائي', 'Capstone'), L('تبني campaign كاملة من الأول للآخر', 'Build a complete campaign end to end')],
];

const LESSONS = [];
function lesson(def) {
  (def.tasks || []).forEach((t, i) => { t.key = def.id + ':' + i; });
  LESSONS.push(def);
}

function lessonById(id) {
  return LESSONS.find(l => String(l.id) === String(id));
}

// A task stays done once it has been done: later tasks often undo earlier ones (create a node, then delete it)
function taskOk(t) {
  S.tasksDone = S.tasksDone || {};
  if (S.tasksDone[t.key]) return true;
  let ok = false;
  try { ok = !!t.ok(); } catch (e) { /* not done yet */ }
  if (ok) { S.tasksDone[t.key] = Date.now(); setTimeout(save); } // ticks are found while rendering, after the commit's save
  return ok;
}

function lessonProgress(l) {
  const done = l.tasks.filter(taskOk).length;
  return { done, total: l.tasks.length };
}

function quizState(l) {
  S.quiz = S.quiz || {};
  return (S.quiz[l.id] = S.quiz[l.id] || {});
}

function quizScore(l) {
  const st = (S.quiz || {})[l.id] || {};
  const qs = l.quiz || [];
  return { right: qs.filter((q, i) => st[i] === q.c).length, answered: qs.filter((q, i) => st[i] !== undefined).length, total: qs.length };
}

/* ---------- panel ---------- */

function lessonsPanel() {
  const en = S.ui.lang === 'en';
  let all = 0;
  let allDone = 0;
  LESSONS.forEach(l => { const p = lessonProgress(l); all += p.total; allDone += p.done; });
  const open = S.ui.lessonOpen != null && lessonById(S.ui.lessonOpen);
  return `<aside class="lessons ${S.ui.lessonsWide ? 'wide' : ''}" dir="${en ? 'ltr' : 'rtl'}">
    <div class="ls-head"><b>📘 ${en ? 'AEM Academy' : 'أكاديمية AEM'}</b><span class="ls-total" title="${en ? 'Tasks done' : 'المهام اللي خلصت'}">${allDone}/${all}</span>
      <button class="ls-lang" data-act="lessonLang" title="${en ? 'اعرض الدروس بالعربي' : 'Show lessons in English'}">${en ? 'عربي' : 'English'}</button>
      <button class="ls-lang" data-act="lessonWide" title="${en ? 'Wider panel' : 'وسّع اللوحة'}">${S.ui.lessonsWide ? '⇥' : '⇤'}</button>
      <a href="${PLAYLIST}" target="_blank" rel="noopener" title="AEM Tutorial For Beginners — AEM GEEKS">▶ ${en ? 'Playlist' : 'الـ Playlist'}</a></div>
    <div class="ls-bar"><i style="width:${all ? Math.round((allDone / all) * 100) : 0}%"></i></div>
    <div class="ls-body">${open ? lessonReader(open) : lessonList()}</div>
  </aside>`;
}

function lessonList() {
  const en = S.ui.lang === 'en';
  const intro = en
    ? 'A full path from zero to an advanced AEM level. Each lesson has three parts: <b>📖 Learn</b> explains the idea and why it matters, <b>🛠 Practice</b> has tasks that tick themselves (press <b>👉 Show me</b> and the lab points at every button), and <b>❓ Quiz</b> checks you understood. The lab is a <b>simulation</b>: close to real AEM 6.5, not identical. Your progress is saved in this browser.'
    : 'مسار كامل من الصفر لمستوى متقدم في AEM. كل درس فيه 3 أجزاء: <b>📖 الشرح</b> بيفهّمك الفكرة وليه مهمة، و<b>🛠 التطبيق</b> فيه مهام بتتعلّم ✔ لوحدها (دوس <b>👉 وريني</b> والـ lab هيشاورلك على كل زرار)، و<b>❓ الاختبار</b> بيتأكد إنك فهمت. الـ lab ده <b>محاكاة</b> قريبة من AEM 6.5 بس مش مطابقة. تقدمك متحفظ في المتصفح ده.';
  return `<div class="ls-intro">${intro}</div>${LEVELS.map(([n, name, desc]) => {
    const list = LESSONS.filter(l => l.level === n);
    if (!list.length) return '';
    let d = 0;
    let t = 0;
    list.forEach(l => { const p = lessonProgress(l); d += p.done; t += p.total; });
    return `<div class="lv"><div class="lv-head"><span class="lv-n">${n}</span><div><b>${tx(name)}</b><small>${tx(desc)}</small></div><span class="lv-c">${d}/${t}</span></div>
      ${list.map(l => {
        const p = lessonProgress(l);
        const q = quizScore(l);
        const complete = p.done === p.total;
        return `<a href="#" class="lv-item ${complete ? 'complete' : ''}" data-act="lessonOpen" data-id="${l.id}">
          <span class="lv-num">${l.num}</span><span class="lv-title" dir="ltr">${tx(l.title)}</span>
          ${q.total ? `<span class="lv-quiz ${q.right === q.total ? 'ok' : ''}" title="${en ? 'Quiz' : 'الاختبار'}">❓${q.right}/${q.total}</span>` : ''}
          <span class="lv-count">${complete ? '✅' : `${p.done}/${p.total}`}</span></a>`;
      }).join('')}</div>`;
  }).join('')}`;
}

function lessonReader(l) {
  const en = S.ui.lang === 'en';
  const tab = S.ui.lessonTab || 'learn';
  const p = lessonProgress(l);
  const q = quizScore(l);
  const idx = LESSONS.indexOf(l);
  const prev = LESSONS[idx - 1];
  const next = LESSONS[idx + 1];
  const lv = LEVELS.find(x => x[0] === l.level);
  let body = '';
  if (tab === 'learn') {
    body = `${l.goal ? `<div class="ls-goal">🎯 ${tx(l.goal)}</div>` : ''}
      <div class="ls-learn">${tx(l.learn)}</div>
      ${l.terms && l.terms.length ? `<div class="ls-sec"><h4>${en ? '📚 Key terms' : '📚 مصطلحات مهمة'}</h4><dl class="ls-terms">${l.terms.map(([k, v]) => `<dt dir="ltr">${k}</dt><dd>${tx(v)}</dd>`).join('')}</dl></div>` : ''}
      ${l.real ? `<div class="ls-real"><h4>${en ? '🏢 In real projects' : '🏢 في المشاريع الحقيقية'}</h4>${tx(l.real)}</div>` : ''}
      <button class="ls-cta" data-act="lessonTab" data-v="practice">${en ? 'Start practicing →' : 'ابدأ التطبيق ←'}</button>`;
  } else if (tab === 'practice') {
    body = `<p class="ls-hint-top">${en ? 'Tasks tick themselves when you do them in the lab. Stuck? Press <b>👉 Show me</b>: the lab highlights each control and tells you what to do.' : 'المهام بتتعلّم ✔ لوحدها لما تعملها في الـ lab. لو تهت، دوس <b>👉 وريني</b>: الـ lab هينوّر كل زرار ويقولك تعمل إيه.'}</p>
      <ol class="tasks">${l.tasks.map((t, i) => {
        const ok = taskOk(t);
        return `<li class="${ok ? 'done' : ''}"><span class="tick">${ok ? '✔' : i + 1}</span><div class="tk">
          <div class="tk-t">${tx(t.t)}</div>
          ${t.why ? `<details class="tk-why"><summary>${en ? 'Why?' : 'ليه؟'}</summary>${tx(t.why)}</details>` : ''}
          ${t.hint && !ok ? `<small class="tk-hint">💡 ${tx(t.hint)}</small>` : ''}
          ${t.guide && t.guide.length && !ok ? `<button class="tk-guide" data-act="guideStart" data-l="${l.id}" data-i="${i}">👉 ${en ? 'Show me' : 'وريني'}</button>` : ''}
        </div></li>`;
      }).join('')}</ol>
      ${p.done === p.total ? `<div class="ls-ok">🎉 ${en ? 'All tasks done! Now take the quiz.' : 'خلصت كل المهام! جرّب الاختبار دلوقتي.'} <a href="#" data-act="lessonTab" data-v="quiz">❓</a></div>` : ''}`;
  } else {
    const st = quizState(l);
    body = (l.quiz || []).map((qq, qi) => {
      const ans = st[qi];
      const answered = ans !== undefined;
      return `<div class="qz ${answered ? (ans === qq.c ? 'right' : 'wrong') : ''}"><div class="qz-q"><b>${qi + 1}.</b> ${tx(qq.q)}</div>
        <div class="qz-a">${qq.a.map((a, ai) => `<button class="qz-opt ${answered && ai === qq.c ? 'correct' : ''} ${answered && ai === ans && ai !== qq.c ? 'chosen' : ''}" data-act="quizAnswer" data-l="${l.id}" data-q="${qi}" data-a="${ai}" ${answered ? 'disabled' : ''}>${tx(a)}</button>`).join('')}</div>
        ${answered ? `<div class="qz-why">${ans === qq.c ? '✔' : '✘'} ${tx(qq.why)}</div>` : ''}</div>`;
    }).join('') || `<p class="muted">${en ? 'No quiz for this lesson.' : 'مفيش اختبار للدرس ده.'}</p>`;
    if (q.total && q.answered === q.total) {
      body += `<div class="ls-ok">${en ? 'Score' : 'النتيجة'}: <b>${q.right}/${q.total}</b> ${q.right === q.total ? '🏆' : ''} <a href="#" data-act="quizReset" data-l="${l.id}">${en ? 'Try again' : 'جرّب تاني'}</a></div>`;
    }
  }
  const tabs = [['learn', en ? '📖 Learn' : '📖 الشرح'], ['practice', `${en ? '🛠 Practice' : '🛠 التطبيق'} <small>${p.done}/${p.total}</small>`], ['quiz', `${en ? '❓ Quiz' : '❓ الاختبار'} <small>${q.right}/${q.total}</small>`]];
  return `<div class="lr">
    <div class="lr-top"><a href="#" data-act="lessonOpen" data-id="">${en ? '← All lessons' : '→ كل الدروس'}</a><span class="lr-lv">${en ? 'Level' : 'المستوى'} ${l.level} · ${tx(lv[1])}</span></div>
    <h3 class="lr-title"><span class="lr-num">${l.num}</span><span dir="ltr">${tx(l.title)}</span></h3>
    <div class="lr-meta">${l.time ? `⏱ ${l.time} ${en ? 'min' : 'دقيقة'}` : ''}${l.video ? ` · 🎬 <a href="${PLAYLIST}" target="_blank" rel="noopener">AEM GEEKS ${l.video}</a>` : ''}</div>
    <div class="lr-tabs">${tabs.map(([k, label]) => `<button class="${tab === k ? 'on' : ''}" data-act="lessonTab" data-v="${k}">${label}</button>`).join('')}</div>
    <div class="lr-body">${body}</div>
    <div class="lr-nav">${prev ? `<a href="#" data-act="lessonOpen" data-id="${prev.id}">${en ? '‹ ' : '› '}${tx(prev.title)}</a>` : '<span></span>'}${next ? `<a href="#" data-act="lessonOpen" data-id="${next.id}">${tx(next.title)}${en ? ' ›' : ' ‹'}</a>` : ''}</div>
  </div>`;
}

/* ---------- actions ---------- */

A.lessonLang = () => {
  S.ui.lang = S.ui.lang === 'en' ? 'ar' : 'en';
  commit();
};
A.lessonWide = () => {
  S.ui.lessonsWide = !S.ui.lessonsWide;
  commit();
};
A.lessonOpen = d => {
  S.ui.lessonOpen = d.id || null;
  S.ui.lessonTab = 'learn';
  if (d.id) flag('lesson:open:' + d.id);
  commit();
  const b = document.querySelector('.ls-body');
  if (b) b.scrollTop = 0;
};
A.lessonTab = d => {
  S.ui.lessonTab = d.v;
  commit();
  const b = document.querySelector('.ls-body');
  if (b) b.scrollTop = 0;
};
A.quizAnswer = d => {
  const l = lessonById(d.l);
  quizState(l)[+d.q] = +d.a;
  if (quizScore(l).right === (l.quiz || []).length) flag('quiz:perfect:' + l.id);
  commit();
};
A.quizReset = d => {
  S.quiz[d.l] = {};
  commit();
};
// old saved labs pointed at numeric lesson ids
A.lessonToggle = d => A.lessonOpen({ id: d.id });
