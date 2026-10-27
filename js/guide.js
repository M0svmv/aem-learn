/* Guided tours: "Show me" on a lesson task highlights each control on screen, says what to do, and moves on when you click it.

   A step: { tab?, at?, go?, el, say, next? }
     tab  lab tab the control lives in ('desktop' | 'author' | 'publish' | 'dispatcher'); default 'author'
     at   URL prefix (or RegExp) of the screen the control lives on; when you are elsewhere the bubble offers "Take me there"
     go   URL that "Take me there" opens (defaults to at)
     el   the control: a CSS selector, optionally " ~ text" to pick the one whose text matches; "frame:" searches inside the page
          being edited; null = no control (an explanation step)
     say  the instruction ({ ar, en })
     next true = this step is about reading or typing, so it has a Next button instead of waiting for a click */

let GUIDE = null;
let GUIDE_TIMER = null;
const GUIDE_DOCS = new WeakSet();

function startGuide(lessonId, taskIndex) {
  const l = LESSONS.find(x => x.id === lessonId);
  const task = l && l.tasks[taskIndex];
  if (!task || !task.guide || !task.guide.length) return;
  stopGuide();
  GUIDE = { l, task, i: 0, done: false };
  if (!S.ui.lessonsOpen) S.ui.lessonsOpen = true;
  ensureGuideDom();
  GUIDE_TIMER = setInterval(guideTick, 200);
  flag('guide:used');
  guideTick();
}

function stopGuide() {
  GUIDE = null;
  if (GUIDE_TIMER) clearInterval(GUIDE_TIMER);
  GUIDE_TIMER = null;
  const root = document.getElementById('guide');
  if (root) root.hidden = true;
}

function ensureGuideDom() {
  let root = document.getElementById('guide');
  if (root) { root.hidden = false; return root; }
  root = document.createElement('div');
  root.id = 'guide';
  root.innerHTML = '<div class="gd-ring" hidden></div><div class="gd-bubble"><div class="gd-arrow"></div><div class="gd-body"></div></div>';
  document.body.appendChild(root);
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-gd]');
    if (!b) return;
    e.preventDefault();
    const a = b.dataset.gd;
    if (a === 'close') stopGuide();
    else if (a === 'next') guideAdvance();
    else if (a === 'back' && GUIDE && GUIDE.i > 0) { GUIDE.i--; GUIDE.back = true; guideTick(); }
    else if (a === 'tab') { S.ui.tab = b.dataset.tab; commit(); }
    else if (a === 'go') go(b.dataset.url, b.dataset.tab);
    else if (a === 'fill' && GUIDE && GUIDE.target) {
      // "Type it for me": puts the step's text into the highlighted field
      const st = GUIDE.task.guide[GUIDE.i];
      GUIDE.target.value = st.fill;
      GUIDE.target.dispatchEvent(new Event('input', { bubbles: true }));
      GUIDE.target.focus();
    }
  });
  // a click on the highlighted control completes the step (capture: before the app re-renders)
  document.addEventListener('click', guideClick, true);
  return root;
}

const gtx = v => (v && typeof v === 'object' && !Array.isArray(v) ? (S.ui.lang === 'en' ? v.en : v.ar) || v.ar || v.en || '' : v || '');

function guideFrameDoc() {
  const f = document.getElementById('frame');
  try { return f && f.contentDocument; } catch (e) { return null; }
}

// Finds the visible element for a step's "el"
function guideFind(spec) {
  if (!spec) return null;
  let doc = document;
  let s = spec;
  let frame = null;
  if (s.startsWith('frame:')) {
    frame = document.getElementById('frame');
    doc = guideFrameDoc();
    s = s.slice(6);
    if (!doc) return null;
  }
  let text = null;
  const t = s.indexOf(' ~ ');
  if (t >= 0) { text = s.slice(t + 3).trim().toLowerCase(); s = s.slice(0, t).trim(); }
  let list;
  try { list = [...doc.querySelectorAll(s || 'a,button,summary,label,[data-act]')]; } catch (e) { return null; }
  list = list.filter(el => el.getClientRects().length > 0 && !el.closest('#guide'));
  if (text) {
    const norm = el => (el.textContent || el.value || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().toLowerCase();
    list = list.filter(el => norm(el).includes(text)).sort((a, b) => (norm(a) === text ? 0 : 1) - (norm(b) === text ? 0 : 1) || norm(a).length - norm(b).length);
  }
  const el = list[0];
  return el ? { el, frame } : null;
}

function guideRect(hit) {
  const r = hit.el.getBoundingClientRect();
  if (!hit.frame) return r;
  const fr = hit.frame.getBoundingClientRect();
  return { left: fr.left + r.left, top: fr.top + r.top, width: r.width, height: r.height, right: fr.left + r.right, bottom: fr.top + r.bottom };
}

function stepTab(step) {
  return step.tab || 'author';
}

function atMatches(step) {
  if (!step.at) return true;
  const url = S.ui.url[S.ui.tab] || '';
  return step.at instanceof RegExp ? step.at.test(url) : url.startsWith(step.at);
}

function guideTaskDone() {
  try { return !!GUIDE.task.ok(); } catch (e) { return false; }
}

function guideTick() {
  if (!GUIDE) return;
  const root = ensureGuideDom();
  const ring = root.querySelector('.gd-ring');
  const bubble = root.querySelector('.gd-bubble');
  const body = root.querySelector('.gd-body');
  const en = S.ui.lang === 'en';
  bubble.dir = en ? 'ltr' : 'rtl';
  const steps = GUIDE.task.guide;
  const total = steps.length;
  const head = `<div class="gd-head"><span class="gd-count">${en ? 'Step' : 'خطوة'} ${Math.min(GUIDE.i + 1, total)} / ${total}</span><span class="gd-task">${gtx(GUIDE.task.t)}</span><a href="#" class="gd-x" data-gd="close" title="${en ? 'Close' : 'اقفل'}">✕</a></div>`;

  // the task is done: celebrate and stop
  if (guideTaskDone()) {
    if (!GUIDE.done) {
      GUIDE.done = true;
      setTimeout(() => { if (GUIDE && GUIDE.done) stopGuide(); }, 3500);
    }
    ring.hidden = true;
    body.innerHTML = `${head}<div class="gd-say gd-ok">✔ ${en ? 'Done! The task is checked in the lessons panel.' : 'تمام! المهمة اتعلّم عليها ✔ في الدروس.'}</div>`;
    placeBubble(bubble, null);
    return;
  }

  if (GUIDE.i >= total) {
    ring.hidden = true;
    body.innerHTML = `${head}<div class="gd-say">${en ? 'That was the last step. If the task is not ticked yet, check the hint in the lesson and try again.' : 'دي كانت آخر خطوة. لو المهمة لسه متعلّمش عليها، بص على الـ hint في الدرس وجرّب تاني.'}</div>
      <div class="gd-btns"><button data-gd="back">${en ? 'Back' : 'رجوع'}</button><button class="pri" data-gd="close">${en ? 'Close' : 'اقفل'}</button></div>`;
    placeBubble(bubble, null);
    return;
  }

  // steps that are already satisfied (e.g. the folder column is open) are skipped
  while (!GUIDE.back && GUIDE.i < total && S.ui.tab === stepTab(steps[GUIDE.i]) && atMatches(steps[GUIDE.i]) && ((steps[GUIDE.i].skip && guideSkip(steps[GUIDE.i])) || autoSkip(steps[GUIDE.i]))) GUIDE.i++;
  if (GUIDE.i >= total) return guideTick();
  const step = steps[GUIDE.i];
  // a step can prepare the screen once (e.g. switch the editor back to Edit mode)
  if (step.prep && GUIDE.prepped !== GUIDE.i) { GUIDE.prepped = GUIDE.i; step.prep(); }
  const back = GUIDE.i > 0 ? `<button data-gd="back">${en ? 'Back' : 'رجوع'}</button>` : '';
  let hit = null;
  let say = gtx(step.say);
  let extra = '';
  const tab = stepTab(step);
  // pre = the bubble points at something that only leads to the step (a lab tab), so clicking it must not complete the step
  let pre = false;
  if (S.ui.tab !== tab) {
    pre = true;
    // first get to the right lab tab
    hit = guideFind(`.labbar [data-tab="${tab}"]`);
    say = en ? `Open the <b>${tab === 'desktop' ? 'Desktop' : tab[0].toUpperCase() + tab.slice(1)}</b> tab first.` : `افتح تاب <b>${tab === 'desktop' ? 'Desktop' : tab[0].toUpperCase() + tab.slice(1)}</b> الأول.`;
  } else if (!atMatches(step)) {
    const url = step.go || (typeof step.at === 'string' ? step.at : null);
    say = `${say}<div class="gd-where">${en ? 'This happens on another screen.' : 'الخطوة دي في شاشة تانية.'}${url ? ` <code>${esc(url)}</code>` : ''}</div>`;
    if (url) extra = `<button class="pri" data-gd="go" data-url="${esc(url)}" data-tab="${tab}">${en ? 'Take me there' : 'خدني هناك'}</button>`;
  } else if (step.el) {
    hit = guideFind(step.el);
    // the control may be on the same screen but scrolled/collapsed away: the step's own URL brings it into view
    if (!hit && step.go && S.ui.url[S.ui.tab] !== step.go) extra = `<button class="pri" data-gd="go" data-url="${esc(step.go)}" data-tab="${tab}">${en ? 'Take me there' : 'خدني هناك'}</button>`;
    if (!hit) say += `<div class="gd-where">${en ? 'I can\'t see this control right now — it may be inside a closed menu, or an earlier step is not finished. Use Back if needed.' : 'مش شايف العنصر ده دلوقتي — ممكن يكون جوه قايمة مقفولة، أو في خطوة قبلها لسه ماخلصتش. دوس رجوع لو محتاج.'}</div>`;
  }
  const needsNext = step.next || !step.el;
  body.innerHTML = `${head}<div class="gd-say">${say}</div>
    <div class="gd-btns">${back}${extra}${step.fill && hit ? `<button data-gd="fill">${en ? 'Type it for me' : 'اكتبه لي'}</button>` : ''}${needsNext && S.ui.tab === tab && atMatches(step) ? `<button class="pri" data-gd="next">${GUIDE.i + 1 < total ? (en ? 'Next' : 'التالي') : (en ? 'Finish' : 'خلصت')}</button>` : ''}</div>`;
  if (hit) {
    const r = guideRect(hit);
    ring.hidden = false;
    Object.assign(ring.style, { left: r.left - 5 + 'px', top: r.top - 5 + 'px', width: r.width + 10 + 'px', height: r.height + 10 + 'px' });
    // keep the control on screen
    if (r.top < 0 || r.bottom > innerHeight) hit.el.scrollIntoView({ block: 'center' });
    GUIDE.target = hit.el;
    GUIDE.pre = pre;
  } else {
    ring.hidden = true;
    GUIDE.target = null;
  }
  placeBubble(bubble, hit ? guideRect(hit) : null);
  const fd = guideFrameDoc();
  if (fd && !GUIDE_DOCS.has(fd)) {
    GUIDE_DOCS.add(fd);
    fd.addEventListener('click', guideClick, true);
  }
}

function guideSkip(st) {
  try { return !!st.skip(); } catch (e) { return false; }
}

// "select this item" steps are already done when the item is selected — clicking it again would unselect it
function autoSkip(st) {
  if (!st.el || st.next || !/ci-thumb|data-act="(assetSel|cfmSel|tplSel|launchSel|pkgSel)"/.test(st.el) || !document.querySelector('.selbar, .pm-sel')) return false;
  const hit = guideFind(st.el);
  const item = hit && (hit.el.closest('.ci, .acard') || hit.el);
  return !!item && (item.classList.contains('checked') || item.classList.contains('sel'));
}

function placeBubble(b, r) {
  const w = Math.min(340, innerWidth - 24);
  b.style.width = w + 'px';
  const h = b.offsetHeight || 120;
  const arrow = b.querySelector('.gd-arrow');
  if (!r) {
    b.style.left = Math.max(12, (innerWidth - w) / 2 - 150) + 'px';
    b.style.top = '70px';
    arrow.hidden = true;
    return;
  }
  arrow.hidden = false;
  let left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12);
  let top = r.bottom + 14;
  let below = true;
  if (top + h > innerHeight - 8) { top = r.top - h - 14; below = false; }
  if (top < 8) { top = Math.min(innerHeight - h - 8, r.bottom + 14); below = true; }
  b.style.left = left + 'px';
  b.style.top = top + 'px';
  b.classList.toggle('above', !below);
  arrow.style.left = Math.min(Math.max(14, r.left + r.width / 2 - left - 8), w - 30) + 'px';
}

function guideClick(e) {
  if (!GUIDE || !GUIDE.target || GUIDE.done || GUIDE.pre) return;
  const step = GUIDE.task.guide[GUIDE.i];
  if (!step || step.next) return;
  const t = GUIDE.target;
  const node = e.target;
  // a click on the control (or inside it) moves to the next step once the app has reacted
  if (t === node || (t.contains && t.contains(node))) {
    const i = GUIDE.i;
    setTimeout(() => { if (GUIDE && GUIDE.i === i) guideAdvance(); }, 350);
  }
}

function guideAdvance() {
  if (!GUIDE) return;
  GUIDE.i++;
  GUIDE.back = false;
  guideTick();
}

A.guideStart = d => startGuide(isNaN(+d.l) ? d.l : +d.l, +d.i);
