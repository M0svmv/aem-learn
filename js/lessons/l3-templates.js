/* Level 3 · Templates & Front-end */

const ARTICLE_TPL = TPL_ROOT + '/article-page';
const PC_STRUCT = '/editor.html' + TPL_ROOT + '/page-content/structure.html';
const tplStruct = (ar, en) => step(null, ar, en, { at: '/editor.html' + TPL_ROOT, go: PC_STRUCT, next: true });

lesson({
  id: 'templates', level: 3, num: '3.1', video: '#10', time: 35,
  title: L('Editable templates', 'Editable templates'),
  goal: L('هتعمل template من الصفر: structure، initial content، policies، وتفعّله وتعمل منه صفحة.', 'You will build a template from scratch — structure, initial content, policies — enable it and create a page from it.'),
  learn: L(`
<h4>مين بيعمل الـ templates؟</h4>
<p>زمان الـ templates كانت كود في <code>/apps</code> (static templates) ومحتاجة developer لأي تغيير. دلوقتي فيه <b>Editable Templates</b>: الـ <b>template author</b> (مش لازم يكون developer) بيبنيها من الـ UI، ومتخزنة في <code>/conf/wknd/settings/wcm/templates</code>.</p>
<h4>التلات أجزاء</h4>
<table class="ls-table">
<tr><th>الجزء</th><th>معناه</th><th>مثال</th></tr>
<tr><td><b>Structure</b></td><td>اللي بيظهر في <i>كل</i> صفحة من الـ template. 🔒 locked = الـ author ميقدرش يغيّره. 🔓 unlocked = يقدر.</td><td>header، footer، container رئيسي unlocked</td></tr>
<tr><td><b>Initial Content</b></td><td>محتوى بيتنسخ <i>مرة واحدة</i> في الصفحة الجديدة، والـ author يقدر يغيّره أو يمسحه.</td><td>Title فاضي + Text placeholder</td></tr>
<tr><td><b>Policies</b></td><td>إعدادات الـ components: المسموح بيه، الأحجام، الـ styles.</td><td>Container يسمح بـ Title/Text/Image بس</td></tr>
</table>
<h4>Template Type</h4>
<p>أي template جديد بيتنسخ من <b>Template Type</b> (هيكل بداية)، مكانه <code>/conf/wknd/settings/wcm/template-types</code>.</p>
<h4>دورة حياة الـ template</h4>
<pre class="ls-diagram">Draft  ──Enable──▶  Enabled  ──Disable──▶  Disabled
  │                    │
  │   مش بيظهر في       └─ بيظهر في Create Page
  │   Create Page          (لو cq:allowedTemplates بتسمح)
  └─ Publish الـ template عشان صفحاته تشتغل على الـ Publish</pre>
<h4>الصفحة والـ template مرتبطين دايماً</h4>
<p>الصفحة بتخزن <code>cq:template</code> وبتقرا الـ structure والـ policies <b>وقت العرض</b>. يعني لو غيّرت الـ structure (مثلاً الـ footer)، كل الصفحات القديمة والجديدة بتتغير. أما الـ initial content فبيتنسخ مرة بس، فتغييره بيأثر على الصفحات الجديدة بس.</p>`, `
<h4>Who makes templates?</h4>
<p>Templates used to be code in <code>/apps</code> (static templates) that needed a developer. Now <b>Editable Templates</b> let a <b>template author</b> (not necessarily a developer) build them in the UI; they live in <code>/conf/wknd/settings/wcm/templates</code>.</p>
<h4>The three parts</h4>
<table class="ls-table">
<tr><th>Part</th><th>Meaning</th><th>Example</th></tr>
<tr><td><b>Structure</b></td><td>What appears on <i>every</i> page. 🔒 locked = authors can't change it; 🔓 unlocked = they can.</td><td>Header, footer, an unlocked main container</td></tr>
<tr><td><b>Initial Content</b></td><td>Copied into a new page <i>once</i>; authors may change or remove it.</td><td>Empty Title + placeholder Text</td></tr>
<tr><td><b>Policies</b></td><td>Component settings: what is allowed, sizes, styles.</td><td>Container allows only Title/Text/Image</td></tr>
</table>
<h4>Template Type</h4>
<p>Every new template is copied from a <b>Template Type</b> (a starting skeleton) in <code>/conf/wknd/settings/wcm/template-types</code>.</p>
<h4>Template lifecycle</h4>
<pre class="ls-diagram">Draft  ──Enable──▶  Enabled  ──Disable──▶  Disabled
  │                    │
  │   not offered in    └─ offered in Create Page
  │   Create Page          (if cq:allowedTemplates allows it)
  └─ Publish the template so its pages work on Publish</pre>
<h4>Pages stay linked to the template</h4>
<p>A page stores <code>cq:template</code> and reads the structure and policies <b>at render time</b>. Change the structure (say the footer) and every page — old and new — changes. Initial content is copied once, so changing it affects new pages only.</p>`),
  terms: [
    ['cq:template', L('الـ property على الصفحة اللي بتقول هي معمولة من أنهي template.', 'Page property naming its template.')],
    ['cq:allowedTemplates', L('على الصفحة أو أي أب ليها: regex للـ templates المسموح بيها تحتها.', 'On a page or ancestor: regexes of templates allowed below it.')],
    ['Template Type', L('الهيكل اللي الـ template بيتنسخ منه.', 'The skeleton a template is copied from.')],
    ['status', L('draft / enabled / disabled على jcr:content بتاع الـ template.', 'draft / enabled / disabled on the template\'s jcr:content.')],
  ],
  real: L('<ul><li>اعمل templates قليلة وقوية (Content Page، Landing Page، Article…) واعتمد على الـ Layout mode والـ policies، بدل template لكل صفحة.</li><li>الـ templates والـ policies في <code>/conf</code> بيتعملها publish زي المحتوى، وبتتنقل بين البيئات بـ packages أو بتتكتب في ui.content.</li><li>متنساش <b>Publish</b> للـ template بعد أي تعديل في الـ structure أو الـ policies، وإلا الـ Publish هيعرض الشكل القديم.</li></ul>',
    '<ul><li>Keep a few strong templates (Content Page, Landing Page, Article…) and rely on Layout mode and policies, not a template per page.</li><li>Templates and policies in <code>/conf</code> are published like content and moved between environments with packages or ui.content.</li><li>Always <b>publish</b> the template after changing structure or policies, or Publish shows the old version.</li></ul>'),
  tasks: [
    { t: L('Tools ← Templates ← <b>Create</b>: اعمل template اسمه <b>Article Page</b>', 'Tools → Templates → <b>Create</b>: a template called <b>Article Page</b>'), ok: () => F('tpl:created'), guide: [
      step('[data-act="tplCreate"]', 'دوس <b>Create</b>.', 'Press <b>Create</b>.', { at: TEMPLATES_URL, go: TEMPLATES_URL }),
      step('.modal input[name=title]', 'اكتب Template Title: <code>Article Page</code>', 'Type the Template Title <code>Article Page</code>', { at: TEMPLATES_URL, next: true }),
      step('.modal [data-modal=ok]', 'دوس <b>Create</b>. الـ template هيتعمل <b>Draft</b>.', 'Press <b>Create</b>. The template starts as <b>Draft</b>.', { at: TEMPLATES_URL }),
    ] },
    { t: L('في الـ <b>Structure</b>: ضيف <b>Title</b> و<b>Container</b> جوه الـ root', 'In <b>Structure</b> add a <b>Title</b> and a <b>Container</b> inside the root'), ok: () => F('struct:insert:title') && F('struct:insert:container'), guide: [
      step('.acard[data-act="tplSel"][data-path$="/article-page"]', 'اختار كارت <b>Article Page</b>.', 'Select the <b>Article Page</b> card.', { at: TEMPLATES_URL, go: TEMPLATES_URL }),
      step('.selbar [data-act="tplOpen"]', 'دوس <b>Open</b>: هيفتح الـ template editor على الـ Structure.', 'Press <b>Open</b>: the template editor opens on Structure.', { at: TEMPLATES_URL }),
      step('frame:[data-drop]', 'دوس على <b>Drag components here</b> جوه الـ root.', 'Click <b>Drag components here</b> inside the root.', { at: '/editor.html' + ARTICLE_TPL }),
      step('frame:#lab-tb [data-tb="insert"]', 'دوس <b>+</b>.', 'Press <b>+</b>.', { at: '/editor.html' + ARTICLE_TPL }),
      step('.m-insert .ins ~ Title', 'اختار <b>Title</b>. وكرّر نفس الكلام واختار <b>Container</b>.', 'Choose <b>Title</b>. Repeat and choose <b>Container</b>.', { at: '/editor.html' + ARTICLE_TPL }),
    ] },
    { t: L('اختار الـ Container واعمله <b>Unlock</b> 🔓', 'Select the Container and <b>Unlock</b> it 🔓'), why: L('من غير Unlock الـ author مش هيقدر يحط أي حاجة في الصفحة.', 'Without unlocking, authors cannot put anything on the page.'), ok: () => F('struct:unlock'), guide: [
      step('frame:[data-cmp][data-pkey^="root/container"]', 'دوس على الـ <b>Container</b> اللي ضفته.', 'Click the <b>Container</b> you added.', { at: '/editor.html' + ARTICLE_TPL, go: '/editor.html' + ARTICLE_TPL + '/structure.html' }),
      step('frame:#lab-tb [data-tb="lock"]', 'دوس أيقونة القفل 🔒 عشان تبقى 🔓 (Unlock).', 'Press the lock 🔒 so it becomes 🔓 (Unlock).', { at: '/editor.html' + ARTICLE_TPL }),
    ] },
    { t: L('اعمل للـ Container <b>⚙ Policy</b> جديدة واختار الـ components المسموحة', 'Give the Container a new <b>⚙ Policy</b> and pick the allowed components'), why: L('الـ policy هي اللي بتحدد قايمة Insert في الصفحة. من غيرها القايمة فاضية.', 'The policy fills the Insert list on pages; without it the list is empty.'), ok: () => templateList(AR()).some(t => !BUILTIN_TPLS.includes(t.name) && JCR.find(AR(), t.path + '/policies', (n, p) => /\/root\/[^/]+$/.test(p) && !!n.props['cq:policy']).length > 0), guide: [
      step('frame:[data-cmp][data-pkey^="root/container"]', 'اختار الـ Container.', 'Select the Container.', { at: '/editor.html' + ARTICLE_TPL, go: '/editor.html' + ARTICLE_TPL + '/structure.html' }),
      step('frame:#lab-tb [data-tb="policy"]', 'دوس ⚙ <b>Policy</b>.', 'Press ⚙ <b>Policy</b>.', { at: '/editor.html' + ARTICLE_TPL }),
      step('.modal input[name=allowed][value="wknd/components/text"]', 'علّم على الـ components اللي عايزها (Title، Text، Image…).', 'Tick the components you want (Title, Text, Image…).', { at: '/editor.html' + ARTICLE_TPL, next: true }),
      step('.modal [data-modal=ok]', 'احفظ ✔.', 'Save ✔.', { at: '/editor.html' + ARTICLE_TPL }),
    ] },
    { t: L('<b>Enable</b> للـ template', '<b>Enable</b> the template'), ok: () => templateList(AR()).some(t => !BUILTIN_TPLS.includes(t.name) && t.c.status === 'enabled'), guide: [
      step('.acard[data-act="tplSel"][data-path$="/article-page"]', 'اختار <b>Article Page</b>.', 'Select <b>Article Page</b>.', { at: TEMPLATES_URL, go: TEMPLATES_URL }),
      step('.selbar [data-act="tplStatus"][data-s="enabled"]', 'دوس <b>Enable</b>.', 'Press <b>Enable</b>.', { at: TEMPLATES_URL }),
    ] },
    { t: L('اعمل صفحة من الـ template ده وضيف فيها حاجة', 'Create a page from it and add something'), ok: () => allPagePaths(AR()).some(p => { const tp = pageProp(p, 'cq:template'); return tp && !BUILTIN_TPLS.includes(JCR.name(tp)); }), guide: [
      step('.titlebar summary.btn.primary', 'في Sites (WKND Adventures) دوس <b>Create</b>.', 'In Sites (WKND Adventures) press <b>Create</b>.', { at: '/sites.html/content/wknd/us/en', go: '/sites.html/content/wknd/us/en' }),
      step('.create-menu [data-act="pageCreate"]', 'اختار <b>Page</b>.', 'Choose <b>Page</b>.', { at: '/sites.html' }),
      step('.cpw-card[data-path$="/article-page"]', 'هتلاقي <b>Article Page</b> ظهر! اختاره.', '<b>Article Page</b> is offered now — pick it.', { at: '/mnt/overlay/wcm/core/content/sites/createpagewizard.html' }),
      step('[data-act="cpwNext"]', 'Next.', 'Next.', { at: '/mnt/overlay/wcm/core/content/sites/createpagewizard.html' }),
      step('[data-cpw="title"]', 'اكتب Title (مثلاً <code>First Article</code>).', 'Type a Title (e.g. <code>First Article</code>).', { at: '/mnt/overlay/wcm/core/content/sites/createpagewizard.html', next: true }),
      step('#cpw-create', 'Create، وبعدين Open وضيف component في الـ container.', 'Create, then Open and add a component to the container.', { at: '/mnt/overlay/wcm/core/content/sites/createpagewizard.html' }),
    ] },
  ],
  quiz: [
    { q: L('عدّلت الـ footer في الـ Structure. الصفحات القديمة؟', 'You changed the footer in Structure. Existing pages?'), a: [L('بتتغير كلها', 'All change'), L('الجديدة بس', 'Only new ones'), L('محتاجة re-create', 'Need re-creating')], c: 0, why: L('الـ structure بيتقرا وقت العرض.', 'Structure is read at render time.') },
    { q: L('عدّلت الـ Initial Content. الصفحات القديمة؟', 'You changed Initial Content. Existing pages?'), a: [L('بتتغير', 'Change'), L('مش بتتغير؛ الجديدة بس', 'Unchanged; only new pages'), L('بتتمسح', 'Are deleted')], c: 1, why: L('الـ initial بيتنسخ مرة واحدة وقت عمل الصفحة.', 'Initial content is copied once at page creation.') },
    { q: L('Template جديد مش ظاهر في Create Page. أسباب ممكنة؟', 'A new template is missing in Create Page. Possible causes?'), a: [L('لسه Draft أو cq:allowedTemplates مش بتسمح', 'Still Draft, or cq:allowedTemplates doesn\'t allow it'), L('الـ Publish واقف', 'Publish is down'), L('مفيش clientlib', 'No clientlib')], c: 0, why: L('لازم Enabled ومسموح في المكان ده.', 'It must be enabled and allowed at that location.') },
    { q: L('Editable templates متخزنة فين؟', 'Where are editable templates stored?'), a: [L('/apps', '/apps'), L('/conf', '/conf'), L('/libs', '/libs')], c: 1, why: L('/conf لأنها configuration بيعملها الـ authors.', '/conf — author-made configuration.') },
  ],
});

lesson({
  id: 'policies', level: 3, num: '3.2', video: '#12', time: 25,
  title: L('Content policies', 'Content policies'),
  goal: L('هتتحكم في الـ components المسموحة وإعداداتها، وتفهم إن الـ policy مشتركة.', 'You will control which components are allowed and how they behave, and see that policies are shared.'),
  learn: L(`
<h4>الـ policy = إعدادات design</h4>
<p>الـ <b>content policy</b> بتحدد سلوك component في template معيّن، من غير ما تلمس الكود:</p>
<ul><li>للـ <b>Container</b>: الـ <b>Allowed Components</b> (إيه اللي يتحط جواه).</li>
<li>للـ <b>Title</b>: الأحجام المسموحة (H1…H6) والحجم الافتراضي.</li>
<li>للـ <b>Image</b>: الـ widths، الـ lazy loading…</li>
<li>لأي component: الـ <b>Styles</b> (Style System — درس 3.5).</li>
<li>وللصفحة نفسها (<b>Page Policy</b>): الـ clientlibs اللي تتحمّل.</li></ul>
<h4>اتنين nodes: الـ policy والـ mapping</h4>
<pre class="ls-diagram">/conf/wknd/settings/wcm/policies/wknd/components/container/policy_main
    components = [title, text, image]          ← الـ policy نفسها (مشتركة)

/conf/wknd/settings/wcm/templates/page-content/policies/jcr:content/root/container
    cq:policy = wknd/components/container/policy_main   ← الـ mapping</pre>
<p>الـ policy متخزنة مرة واحدة، والـ templates بتشاور عليها. فلو اتنين templates بيستخدموا نفس الـ policy وعدّلتها، الاتنين بيتأثروا. لو عايز سلوك مختلف، اعمل <b>+ New policy</b>.</p>
<h4>Child component policies</h4>
<p>من policy الـ Container تقدر تحدد policies للـ components اللي <i>جواه</i>: مثلاً الـ Title جوه الـ main container يبقى H2/H3 بس.</p>`, `
<h4>A policy = design settings</h4>
<p>A <b>content policy</b> sets how a component behaves in a template, without touching code:</p>
<ul><li><b>Container</b>: the <b>Allowed Components</b>.</li>
<li><b>Title</b>: allowed sizes (H1…H6) and the default size.</li>
<li><b>Image</b>: widths, lazy loading…</li>
<li>Any component: <b>Styles</b> (Style System — lesson 3.5).</li>
<li>The page itself (<b>Page Policy</b>): which clientlibs load.</li></ul>
<h4>Two nodes: the policy and the mapping</h4>
<pre class="ls-diagram">/conf/wknd/settings/wcm/policies/wknd/components/container/policy_main
    components = [title, text, image]          ← the policy (shared)

/conf/wknd/settings/wcm/templates/page-content/policies/jcr:content/root/container
    cq:policy = wknd/components/container/policy_main   ← the mapping</pre>
<p>A policy is stored once and templates point at it. If two templates share a policy and you edit it, both change. For different behaviour create <b>+ New policy</b>.</p>
<h4>Child component policies</h4>
<p>From a container's policy you can set policies for the components <i>inside</i> it, e.g. a Title in the main container may only be H2/H3.</p>`),
  terms: [
    ['cq:policy', L('الـ mapping من مكان في الـ template للـ policy.', 'Mapping from a template location to a policy.')],
    ['Allowed Components', L('قايمة الـ components المسموحة في container.', 'The components allowed in a container.')],
    ['Page Policy', L('policy الصفحة: الـ clientlibs وإعدادات عامة.', 'The page policy: clientlibs and general settings.')],
  ],
  real: L('<ul><li>سمّي الـ policies أسماء واضحة (Main Content، Hero Container) عشان الـ template authors يعيدوا استخدامها صح.</li><li>بدل ما تسمح بكل component، اسمح بـ <b>groups</b> (مثلاً <code>group:WKND Sites Project - Content</code>) فأي component جديد في الـ group يظهر لوحده.</li></ul>',
    '<ul><li>Give policies clear names (Main Content, Hero Container) so template authors reuse them correctly.</li><li>Allow <b>groups</b> (e.g. <code>group:WKND Sites Project - Content</code>) instead of single components so new components in the group appear automatically.</li></ul>'),
  tasks: [
    { t: L('جرّب تضيف <b>Button</b> في صفحة: مش موجود في القايمة!', 'Try adding a <b>Button</b> to a page: it is not in the list!'), ok: () => F('visit:editor'), guide: [
      openEditor('افتح about في الـ editor.', 'Open about in the editor.'),
      step('frame:[data-drop]', 'دوس <b>Drag components here</b> ← +، ودوّر على Button: مش هتلاقيه.', 'Click <b>Drag components here</b> → + and look for Button: it isn\'t there.', { at: '/editor.html' }),
    ] },
    { t: L('Template <b>Page Content</b> ← Structure ← Container ← <b>⚙ Policy</b> ← فعّل <b>Button</b>', 'Template <b>Page Content</b> → Structure → Container → <b>⚙ Policy</b> → allow <b>Button</b>'), ok: () => F('policy:button'), guide: [
      tplStruct('هنفتح Structure بتاع template Page Content.', 'We open the Page Content template Structure.'),
      step('frame:[data-cmp][data-pkey="root/container"]', 'دوس على الـ <b>Container</b> الرئيسي (Main Content).', 'Click the main <b>Container</b>.', { at: '/editor.html' + TPL_ROOT }),
      step('frame:#lab-tb [data-tb="policy"]', 'دوس ⚙ <b>Policy</b>.', 'Press ⚙ <b>Policy</b>.', { at: '/editor.html' + TPL_ROOT }),
      step('.modal input[name=allowed][value="wknd/components/button"]', 'علّم على <b>Button</b>.', 'Tick <b>Button</b>.', { at: '/editor.html' + TPL_ROOT }),
      step('.modal [data-modal=ok]', 'احفظ ✔.', 'Save ✔.', { at: '/editor.html' + TPL_ROOT }),
    ] },
    { t: L('ضيف Button في صفحة واعمله Configure (نص + link)', 'Add a Button to a page and configure it (text + link)'), ok: () => F('insert:button') && F('dialog:button'), guide: [
      openEditor('افتح about.', 'Open about.'),
      step('frame:[data-drop]', 'دوس <b>Drag components here</b>.', 'Click <b>Drag components here</b>.', { at: '/editor.html' }),
      step('frame:#lab-tb [data-tb="insert"]', 'دوس <b>+</b>.', 'Press <b>+</b>.', { at: '/editor.html' }),
      step('.m-insert .ins ~ Button', 'اختار <b>Button</b>. بعدين اختاره ودوس 🔧 واكتب النص والـ link.', 'Choose <b>Button</b>, then select it, press 🔧 and set text and link.', { at: '/editor.html' }),
    ] },
    { t: L('في <b>Child component policies</b> ← Title: خلّي الأحجام H2 و H3 بس', 'In <b>Child component policies</b> → Title: allow only H2 and H3'), ok: () => F('policy:titleSizes'), guide: [
      tplStruct('في Structure بتاع Page Content.', 'In the Page Content Structure.'),
      step('frame:[data-cmp][data-pkey="root/container"]', 'اختار الـ Container.', 'Select the Container.', { at: '/editor.html' + TPL_ROOT }),
      step('frame:#lab-tb [data-tb="policy"]', 'دوس ⚙ Policy.', 'Press ⚙ Policy.', { at: '/editor.html' + TPL_ROOT }),
      step('.modal .mtab ~ Child component policies', 'افتح tab <b>Child component policies</b>.', 'Open the <b>Child component policies</b> tab.', { at: '/editor.html' + TPL_ROOT }),
      step('.modal [data-child-rt="wknd/components/title"]', 'دوس ⚙ Configure جنب <b>Title</b>.', 'Press ⚙ Configure next to <b>Title</b>.', { at: '/editor.html' + TPL_ROOT }),
      step('.modal input[name=types][value="h2"]', 'تحت <b>Sizes</b>: علّم على H2 و H3 بس وشيل الباقي.', 'Under <b>Sizes</b> tick only H2 and H3 and untick the rest.', { at: '/editor.html' + TPL_ROOT, next: true }),
      step('.modal [data-modal=ok]', 'احفظ ✔، وافتح Title في صفحة: الـ dialog هيعرض H2 و H3 بس.', 'Save ✔, then open a Title on a page: its dialog offers only H2 and H3.', { at: '/editor.html' + TPL_ROOT }),
    ] },
  ],
  quiz: [
    { q: L('اتنين templates بيشاوروا على نفس الـ policy وعدّلتها. النتيجة؟', 'Two templates share a policy and you edit it. Result?'), a: [L('واحد بس بيتغير', 'Only one changes'), L('الاتنين بيتغيروا', 'Both change'), L('ولا واحد لحد الـ publish', 'Neither until publish')], c: 1, why: L('الـ policy مشتركة؛ اعمل New policy لو عايز اختلاف.', 'Policies are shared; create a new one to differ.') },
    { q: L('الـ policies متخزنة فين؟', 'Where are policies stored?'), a: [L('/conf/wknd/settings/wcm/policies', '/conf/wknd/settings/wcm/policies'), L('/apps/wknd/policies', '/apps/wknd/policies'), L('في كل صفحة', 'In every page')], c: 0, why: L('والـ template بيشاور عليها بـ cq:policy.', 'Templates point at them with cq:policy.') },
    { q: L('عايز الـ Title جوه الـ container ميكونش H1. تعمل إيه؟', 'You don\'t want H1 Titles inside the container. What do you do?'), a: [L('تعدّل HTL', 'Edit the HTL'), L('child policy للـ Title بالأحجام المسموحة', 'A child Title policy with allowed sizes'), L('تمسح H1 من CSS', 'Remove H1 from CSS')], c: 1, why: L('من غير كود خالص.', 'No code needed.') },
  ],
});

lesson({
  id: 'locking', level: 3, num: '3.3', video: '#13', time: 15,
  title: L('Locking & unlocking structure components', 'Locking & unlocking structure components'),
  goal: L('هتقرر إيه اللي الـ authors يقدروا يغيّروه في كل صفحة وإيه اللي ثابت.', 'You will decide what authors can change on each page and what stays fixed.'),
  learn: L(`
<h4>🔒 و 🔓</h4>
<ul><li><b>Locked</b> (الافتراضي): الـ component جزء من الـ template. بيظهر رمادي في الصفحة ومحدش يقدر يعدّله غير من الـ template. مثال: الـ logo والـ footer القانوني.</li>
<li><b>Unlocked</b>: الـ author يقدر يعدّله في كل صفحة. أول ما يعدّله، المحتوى بيتنسخ للصفحة (node بنفس الـ path تحت <code>jcr:content</code>).</li></ul>
<h4>Containers</h4>
<p>الـ container اللي unlocked هو "المنطقة" اللي الـ authors بيضيفوا فيها components. ودايماً لازم يبقى عنده policy.</p>
<p><b>مهم:</b> الـ components اللي <b>جوه</b> container مفتوح مابقتش جزء من الـ Structure. مكانها <b>Initial Content</b>: بداية بتتنسخ لكل صفحة جديدة والـ author يقدر يعدّلها أو يمسحها. عشان كده لما تعمل Unlock لـ container فيه components، بتتنقل لـ Initial Content، ولو عملت Lock تاني بترجع للـ Structure. ومش هتقدر تضيف components جوه container مفتوح من الـ Structure.</p>
<pre class="ls-diagram">Structure:        root 🔒 ─┬─ navigation 🔒
                           ├─ container 🔓  ← المنطقة بتاعة الـ author
                           └─ footer 🔒
Initial Content:  container ─ title         ← بداية بتتنسخ للصفحات الجديدة</pre>
<h4>لو قفلت تاني؟</h4>
<p>لما تعمل Lock لـ component كان unlocked، الصفحات بترجع تعرض نسخة الـ template، والمحتوى اللي الـ authors كتبوه بيفضل في الـ JCR بس مش بيظهر.</p>`, `
<h4>🔒 and 🔓</h4>
<ul><li><b>Locked</b> (default): the component belongs to the template. It looks grey on pages and only the template can change it — e.g. the logo and legal footer.</li>
<li><b>Unlocked</b>: authors can edit it on each page. Once edited, the content is copied into the page (a node at the same path under <code>jcr:content</code>).</li></ul>
<h4>Containers</h4>
<p>An unlocked container is the "area" where authors add components; it always needs a policy.</p>
<p><b>Important:</b> components <b>inside</b> an unlocked container are no longer part of the Structure. They belong in <b>Initial Content</b>: a starting point copied to each new page that authors can edit or delete. So unlocking a container that holds components moves them to Initial Content, and locking it again moves them back. You cannot add components inside an unlocked container in Structure mode.</p>
<pre class="ls-diagram">Structure:        root 🔒 ─┬─ navigation 🔒
                           ├─ container 🔓  ← the authors' area
                           └─ footer 🔒
Initial Content:  container ─ title         ← copied to new pages</pre>
<h4>Locking again</h4>
<p>Re-locking an unlocked component makes pages show the template version again; content authors wrote stays in the JCR but is no longer shown.</p>`),
  terms: [['editable', L('الـ property في الـ structure اللي بتعني unlocked.', 'The structure property that means unlocked.')]],
  real: L('<ul><li>اقفل كل حاجة الـ brand محتاجها ثابتة (header، footer، legal)، وافتح بس مناطق المحتوى.</li></ul>', '<ul><li>Lock everything the brand needs fixed (header, footer, legal) and unlock only content areas.</li></ul>'),
  tasks: [
    { t: L('افتح أي صفحة ودوس على الـ footer: 🔒', 'Open any page and click the footer: 🔒'), ok: () => F('visit:editor'), guide: [openEditor('افتح about ودوس على النص اللي في آخر الصفحة.', 'Open about and click the text at the bottom.')] },
    { t: L('في template Page Content ← Structure: <b>Unlock</b> للـ footer (Text)', 'In the Page Content Structure, <b>unlock</b> the footer (Text)'), ok: () => F('struct:unlock:root/footer'), guide: [
      tplStruct('في Structure بتاع Page Content.', 'In the Page Content Structure.'),
      step('frame:[data-cmp][data-pkey="root/footer"]', 'دوس على الـ <b>footer</b> (الـ Text اللي تحت).', 'Click the <b>footer</b> (the Text at the bottom).', { at: '/editor.html' + TPL_ROOT }),
      step('frame:#lab-tb [data-tb="lock"]', 'دوس القفل عشان يبقى 🔓.', 'Press the lock so it becomes 🔓.', { at: '/editor.html' + TPL_ROOT }),
    ] },
    { t: L('ارجع لصفحة وعدّل الـ footer بـ 🔧', 'Back on a page, edit the footer with 🔧'), ok: () => F('edited:unlocked-structure'), guide: [
      openEditor('افتح about.', 'Open about.'),
      step('frame:[data-cmp$="/footer"]', 'اختار الـ footer: مبقاش رمادي.', 'Select the footer: it is no longer grey.', { at: '/editor.html' }),
      step('frame:#lab-tb [data-tb="cfg"]', 'دوس 🔧.', 'Press 🔧.', { at: '/editor.html' }),
      step('.modal textarea, .modal [name="./text"]', 'غيّر النص.', 'Change the text.', { at: '/editor.html', next: true }),
      step('.modal [data-modal=ok]', 'احفظ ✔.', 'Save ✔.', { at: '/editor.html' }),
    ] },
    { t: L('اعمل <b>Lock</b> تاني، وشوف الصفحة رجعت لنص الـ template', '<b>Lock</b> it again and see the page go back to the template text'), ok: () => F('struct:lock:root/footer'), guide: [
      tplStruct('في Structure.', 'In Structure.'),
      step('frame:[data-cmp][data-pkey="root/footer"]', 'اختار الـ footer.', 'Select the footer.', { at: '/editor.html' + TPL_ROOT }),
      step('frame:#lab-tb [data-tb="lock"]', 'دوس القفل عشان يرجع 🔒.', 'Press the lock to make it 🔒 again.', { at: '/editor.html' + TPL_ROOT }),
    ] },
  ],
  quiz: [
    { q: L('component locked في الـ structure. الـ author يقدر يعدّله من الصفحة؟', 'A locked structure component — can an author edit it on a page?'), a: [L('أيوه', 'Yes'), L('لأ، من الـ template بس', 'No, only in the template'), L('بس الـ admin', 'Only admin')], c: 1, why: L('ده معنى locked.', 'That is what locked means.') },
    { q: L('رجّعت component لـ Locked. المحتوى اللي الـ authors كتبوه؟', 'You re-locked a component. Content authors wrote…'), a: [L('بيتمسح', 'is deleted'), L('بيفضل في الـ JCR بس مش بيظهر', 'stays in the JCR but is hidden'), L('بيتنسخ للـ template', 'is copied to the template')], c: 1, why: L('العرض بيرجع لنسخة الـ template.', 'Rendering falls back to the template version.') },
  ],
});

lesson({
  id: 'clientlibs', level: 3, num: '3.4', video: '#14', time: 25,
  title: L('Client libraries (CSS & JS)', 'Client libraries (CSS & JS)'),
  goal: L('هتفهم الـ CSS/JS بيوصل للصفحة إزاي، وتغيّر شكل الموقع من الـ clientlib.', 'You will see how CSS/JS reach the page and change the site look through a clientlib.'),
  learn: L(`
<h4>الـ clientlib</h4>
<p>بدل ما كل component يحط <code>&lt;link&gt;</code> و<code>&lt;script&gt;</code>، AEM بيجمّع الـ CSS والـ JS في <b>client libraries</b>. كل clientlib عبارة عن فولدر نوعه <code>cq:ClientLibraryFolder</code>:</p>
<pre class="ls-diagram">/apps/wknd/clientlibs/clientlib-site      (cq:ClientLibraryFolder)
    categories   = [wknd.site]          ← الاسم اللي بنطلبه بيه
    dependencies = [wknd.dependencies]  ← يتحمّل قبله
    embed        = [...]                ← يتدمج جواه
    allowProxy   = true                 ← يتقدم من /etc.clientlibs
├── css.txt     →  #base=css  /  site.css
├── js.txt      →  #base=js   /  site.js
├── css/site.css
└── js/site.js</pre>
<h4>إزاي بتوصل للصفحة؟</h4>
<p>الـ <b>Page Policy</b> في الـ template فيها قايمة <b>categories</b>. وقت العرض AEM بيجمّع كل الفولدرات اللي categories بتاعتها مطابقة، ويقرا <code>css.txt</code> بالترتيب، ويطلّع ملف واحد مضغوط:</p>
<pre class="ls-diagram">&lt;link href="/etc.clientlibs/wknd/clientlibs/clientlib-site.min.css"&gt;</pre>
<h4>/etc.clientlibs و allowProxy</h4>
<p><code>/apps</code> مقفول على الـ Publish لأسباب أمان، فـ <code>allowProxy=true</code> بيخلّي الملفات تتقدم من path آمن هو <code>/etc.clientlibs</code>.</p>
<h4>ui.frontend</h4>
<p>في مشاريع الـ archetype، الـ CSS/JS بيتكتب في <b>ui.frontend</b> (Sass/TypeScript + webpack)، والـ build بيولّد <code>clientlib-site</code> أوتوماتيك. يعني مش بتعدّل في CRXDE في الشغل الحقيقي.</p>`, `
<h4>The clientlib</h4>
<p>Instead of each component adding <code>&lt;link&gt;</code>/<code>&lt;script&gt;</code>, AEM bundles CSS and JS in <b>client libraries</b> — folders of type <code>cq:ClientLibraryFolder</code>:</p>
<pre class="ls-diagram">/apps/wknd/clientlibs/clientlib-site      (cq:ClientLibraryFolder)
    categories   = [wknd.site]          ← the name it is requested by
    dependencies = [wknd.dependencies]  ← loaded before it
    embed        = [...]                ← merged into it
    allowProxy   = true                 ← served from /etc.clientlibs
├── css.txt     →  #base=css  /  site.css
├── js.txt      →  #base=js   /  site.js
├── css/site.css
└── js/site.js</pre>
<h4>How it reaches the page</h4>
<p>The template's <b>Page Policy</b> lists <b>categories</b>. At render time AEM gathers every folder with a matching category, reads <code>css.txt</code> in order and emits one minified file:</p>
<pre class="ls-diagram">&lt;link href="/etc.clientlibs/wknd/clientlibs/clientlib-site.min.css"&gt;</pre>
<h4>/etc.clientlibs and allowProxy</h4>
<p><code>/apps</code> is closed on Publish for security; <code>allowProxy=true</code> serves the files from the safe <code>/etc.clientlibs</code> path.</p>
<h4>ui.frontend</h4>
<p>In archetype projects CSS/JS is written in <b>ui.frontend</b> (Sass/TypeScript + webpack) and the build generates <code>clientlib-site</code>. You don't edit it in CRXDE at work.</p>`),
  terms: [
    ['categories', L('اسم الـ clientlib اللي بيتطلب بيه.', 'The name a clientlib is requested by.')],
    ['dependencies / embed', L('dependencies بتتحمّل كملفات قبله، embed بتتدمج جوه نفس الملف.', 'dependencies load as separate files before it; embed merges into the same file.')],
    ['allowProxy', L('بيقدّم الـ clientlib من /etc.clientlibs بدل /apps.', 'Serves the clientlib from /etc.clientlibs instead of /apps.')],
  ],
  real: L('<ul><li>الـ CSS بيتكتب بـ <b>BEM</b> على classes الـ Core Components (<code>.cmp-title__text</code>).</li><li>استخدم embed عشان تقلل عدد الـ requests.</li><li>تعديل كود في /apps على الـ Author <b>مش بيتنشر</b> للـ Publish: الكود بيتعمله deploy مش publish.</li></ul>',
    '<ul><li>CSS is written with <b>BEM</b> on Core Component classes (<code>.cmp-title__text</code>).</li><li>Use embed to reduce requests.</li><li>Editing code in /apps on Author is <b>not published</b> to Publish: code is deployed, not published.</li></ul>'),
  tasks: [
    { t: L('في CRXDE افتح <code>clientlib-site</code> وشوف <code>categories</code> و<code>css.txt</code>', 'In CRXDE open <code>clientlib-site</code> and look at <code>categories</code> and <code>css.txt</code>'), ok: () => crxSeen(p => p.startsWith('/apps/wknd/clientlibs/clientlib-site')), guide: [step('.ct-row[data-path="/apps/wknd/clientlibs/clientlib-site"] .ct-name', 'دوس على <b>clientlib-site</b> وبص على categories. وبعدين افتح css.txt.', 'Click <b>clientlib-site</b>, read categories, then open css.txt.', { at: '/crx/de', go: '/crx/de/index.jsp#/apps/wknd/clientlibs/clientlib-site' })] },
    { t: L('عدّل <code>css/site.css</code>: غيّر <code>--wknd-accent</code> (مثلاً <code>#00c2a8</code>) واحفظ وافتح صفحة', 'Edit <code>css/site.css</code>: change <code>--wknd-accent</code> (e.g. <code>#00c2a8</code>), save and open a page'), ok: () => F('clientlib:css-edited'), guide: [
      step('#crx-file', 'دوّر على <code>--wknd-accent</code> وغيّر اللون.', 'Find <code>--wknd-accent</code> and change the colour.', { at: '/crx/de', go: '/crx/de/index.jsp#/apps/wknd/clientlibs/clientlib-site/css/site.css', next: true }),
      step('[data-act="crxSaveFile"]', 'دوس <b>Save file</b>.', 'Press <b>Save file</b>.', { at: '/crx/de' }),
    ] },
    { t: L('Template Page Content ← ⓘ ← <b>Page Policy</b> ← ضيف <code>wknd.dark</code>', 'Page Content template → ⓘ → <b>Page Policy</b> → add <code>wknd.dark</code>'), ok: () => F('clientlib:dark'), guide: [
      tplStruct('في Structure بتاع Page Content.', 'In the Page Content Structure.'),
      step('.ed-bar summary[title="Page Information"]', 'دوس أيقونة <b>Page Information</b>.', 'Click the <b>Page Information</b> icon.', { at: '/editor.html' + TPL_ROOT }),
      step('[data-act="edPagePolicy"]', 'اختار <b>Page Policy</b>.', 'Choose <b>Page Policy</b>.', { at: '/editor.html' + TPL_ROOT }),
      step('.modal input[name=cl][value="wknd.dark"]', 'علّم على <code>wknd.dark</code>.', 'Tick <code>wknd.dark</code>.', { at: '/editor.html' + TPL_ROOT, next: true }),
      step('.modal [data-modal=ok]', 'احفظ ✔ وافتح أي صفحة: الموقع بقى dark.', 'Save ✔ and open any page: the site is dark now.', { at: '/editor.html' + TPL_ROOT }),
    ] },
    { t: L('(تجربة) شيل <code>wknd.site</code> وشوف الصفحة من غير CSS، ورجّعه', '(Experiment) remove <code>wknd.site</code>, see the page without CSS, then restore it'), ok: () => F('clientlib:nosite'), guide: [
      step('.ed-bar summary[title="Page Information"]', 'Page Information ← Page Policy.', 'Page Information → Page Policy.', { at: '/editor.html' + TPL_ROOT, go: PC_STRUCT }),
      step('[data-act="edPagePolicy"]', 'افتح Page Policy وشيل العلامة من <code>wknd.site</code>.', 'Open Page Policy and untick <code>wknd.site</code>.', { at: '/editor.html' + TPL_ROOT }),
    ] },
  ],
  quiz: [
    { q: L('الصفحة بتعرف تحمّل أنهي clientlibs إزاي؟', 'How does a page know which clientlibs to load?'), a: [L('من الـ Page Policy في الـ template (categories)', 'From the template Page Policy (categories)'), L('من اسم الفولدر', 'From the folder name'), L('كل الـ clientlibs بتتحمّل', 'All clientlibs load')], c: 0, why: L('الـ categories هي الربط.', 'Categories are the link.') },
    { q: L('ليه الملفات بتتقدم من /etc.clientlibs؟', 'Why are files served from /etc.clientlibs?'), a: [L('أسرع', 'Faster'), L('عشان /apps مقفول على الـ Publish (allowProxy)', 'Because /apps is closed on Publish (allowProxy)'), L('عشان الـ cache بس', 'Only for caching')], c: 1, why: L('أمان: الزوار ميوصلوش لـ /apps.', 'Security: visitors never reach /apps.') },
    { q: L('الفرق بين embed و dependencies؟', 'embed vs dependencies?'), a: [L('مفيش', 'None'), L('embed بيدمج في نفس الملف، dependencies بتتحمّل منفصلة قبله', 'embed merges into the same file; dependencies load separately before it'), L('embed للـ JS بس', 'embed is JS only')], c: 1, why: L('embed بيقلل عدد الـ requests.', 'embed reduces requests.') },
  ],
});

lesson({
  id: 'styles', level: 3, num: '3.5', video: '#15', time: 20,
  title: L('The Style System', 'The Style System'),
  goal: L('هتدي الـ authors أشكال جاهزة لكل component من غير كود جديد.', 'You will give authors ready-made looks for components without new code.'),
  learn: L(`
<h4>الفكرة</h4>
<p>بدل ما تعمل component جديد لكل شكل (Title في النص، Title بخط تحته…)، الـ <b>Style System</b> بيخلّي نفس الـ component ياخد <b>CSS class</b> يختارها الـ author من قايمة 🖌.</p>
<h4>3 أدوار</h4>
<ol><li><b>Front-end developer</b>: يكتب الـ CSS في الـ clientlib، مثلاً <code>.cmp-title--center .cmp-title__text { text-align:center }</code>.</li>
<li><b>Template author</b>: يعرّف الـ style في الـ <b>policy</b>: الاسم "Center" والـ class <code>cmp-title--center</code>.</li>
<li><b>Content author</b>: يختار 🖌 ← Center على أي Title.</li></ol>
<h4>بيتخزن فين؟</h4>
<pre class="ls-diagram">policy:     cq:styleGroups/…/cq:styles/…   cq:styleClasses = "cmp-title--center"
component:  cq:styleIds = ["1658…"]        ← على node الـ Title في الصفحة
HTML:       &lt;div class="title cmp-title--center"&gt;…</pre>
<h4>Style groups</h4>
<p>الـ styles بتتجمع في groups (Alignment، Color…). ممكن تسمح باختيار واحد بس من الـ group، أو بـ "Allow combination".</p>`, `
<h4>The idea</h4>
<p>Rather than a new component per look (centred Title, underlined Title…), the <b>Style System</b> lets one component take a <b>CSS class</b> the author picks from the 🖌 menu.</p>
<h4>Three roles</h4>
<ol><li><b>Front-end developer</b>: writes the CSS in the clientlib, e.g. <code>.cmp-title--center .cmp-title__text { text-align:center }</code>.</li>
<li><b>Template author</b>: defines the style in the <b>policy</b>: name "Center", class <code>cmp-title--center</code>.</li>
<li><b>Content author</b>: picks 🖌 → Center on any Title.</li></ol>
<h4>Where it is stored</h4>
<pre class="ls-diagram">policy:     cq:styleGroups/…/cq:styles/…   cq:styleClasses = "cmp-title--center"
component:  cq:styleIds = ["1658…"]        ← on the Title node in the page
HTML:       &lt;div class="title cmp-title--center"&gt;…</pre>
<h4>Style groups</h4>
<p>Styles are grouped (Alignment, Color…). A group can allow one choice or "Allow combination".</p>`),
  terms: [['cq:styleIds', L('الـ styles المختارة على الـ component (IDs).', 'The selected styles on a component (IDs).')], ['cq:styleClasses', L('الـ CSS classes بتاعة style في الـ policy.', 'A style\'s CSS classes in the policy.')]],
  real: L('<ul><li>Style System بيقلل عدد الـ components جداً، وده من أهم الـ best practices في AEM.</li><li>الـ class من غير CSS مش هيعمل حاجة؛ اتفق مع فريق الـ front-end على الأسماء.</li></ul>', '<ul><li>The Style System dramatically reduces component count — a key AEM best practice.</li><li>A class without CSS does nothing; agree names with the front-end team.</li></ul>'),
  tasks: [
    { t: L('طبّق Style على Title في صفحة (🖌 ← Underline)', 'Apply a style to a Title (🖌 → Underline)'), ok: () => F('style:applied'), guide: [
      openEditor('افتح about.', 'Open about.'),
      step('frame:[data-cmp*="/title"]', 'اختار Title.', 'Select a Title.', { at: '/editor.html' }),
      step('frame:#lab-tb [data-tb="style"]', 'دوس 🖌 <b>Styles</b>.', 'Press 🖌 <b>Styles</b>.', { at: '/editor.html' }),
      step('.modal label.check ~ Underline', 'اختار <b>Underline</b>.', 'Choose <b>Underline</b>.', { at: '/editor.html' }),
      step('.modal [data-modal=ok]', 'احفظ ✔: الـ class اتحط على الـ Title.', 'Save ✔: the class is added to the Title.', { at: '/editor.html' }),
    ] },
    { t: L('في <b>Title policy</b> ← Styles: ضيف style <b>Center</b> بالـ class <code>cmp-title--center</code>', 'In the <b>Title policy</b> → Styles add <b>Center</b> with class <code>cmp-title--center</code>'), hint: L('Template ← Structure ← Container ← ⚙ Policy ← Child component policies ← Title', 'Template → Structure → Container → ⚙ Policy → Child component policies → Title'), ok: () => !!styleWithClass('wknd/components/title', 'cmp-title--center'), guide: [
      tplStruct('في Structure بتاع Page Content.', 'In the Page Content Structure.'),
      step('frame:[data-cmp][data-pkey="root/container"]', 'اختار الـ Container.', 'Select the Container.', { at: '/editor.html' + TPL_ROOT }),
      step('frame:#lab-tb [data-tb="policy"]', 'دوس ⚙ Policy.', 'Press ⚙ Policy.', { at: '/editor.html' + TPL_ROOT }),
      step('.modal .mtab ~ Child component policies', 'tab <b>Child component policies</b>.', 'Tab <b>Child component policies</b>.', { at: '/editor.html' + TPL_ROOT }),
      step('.modal [data-child-rt="wknd/components/title"]', 'Configure جنب Title.', 'Configure next to Title.', { at: '/editor.html' + TPL_ROOT }),
      step('.modal .mtab ~ Styles', 'tab <b>Styles</b>.', 'Tab <b>Styles</b>.', { at: '/editor.html' + TPL_ROOT }),
      step('.modal [data-sgs-add]', 'دوس <b>+ Add style</b> واكتب الاسم <code>Center</code> والـ class <code>cmp-title--center</code>، واحفظ.', 'Press <b>+ Add style</b>, name <code>Center</code>, class <code>cmp-title--center</code>, and save.', { at: '/editor.html' + TPL_ROOT, next: true }),
    ] },
    { t: L('طبّق <b>Center</b> على Title في صفحة', 'Apply <b>Center</b> to a Title on a page'), ok: () => { const s = styleWithClass('wknd/components/title', 'cmp-title--center'); return !!s && styleUsed(s.id); }, guide: [
      openEditor('افتح about.', 'Open about.'),
      step('frame:[data-cmp*="/title"]', 'اختار Title.', 'Select a Title.', { at: '/editor.html' }),
      step('frame:#lab-tb [data-tb="style"]', 'دوس 🖌.', 'Press 🖌.', { at: '/editor.html' }),
      step('.modal label.check ~ Center', 'اختار <b>Center</b>.', 'Choose <b>Center</b>.', { at: '/editor.html' }),
      step('.modal [data-modal=ok]', 'احفظ ✔.', 'Save ✔.', { at: '/editor.html' }),
    ] },
    { t: L('(متقدم) style للـ Image بالـ class <code>cmp-image--shadow</code> وطبّقه', '(Advanced) an Image style with class <code>cmp-image--shadow</code>, applied'), ok: () => { const s = styleWithClass('wknd/components/image', 'cmp-image--shadow'); return !!s && styleUsed(s.id); } },
  ],
  quiz: [
    { q: L('Style "Center" ظاهر بس مفيش تغيير في الشكل. السبب؟', '"Center" shows up but nothing changes. Why?'), a: [L('الـ CSS للـ class مش موجود في الـ clientlib', 'The class has no CSS in the clientlib'), L('محتاج publish', 'Needs publishing'), L('الـ policy غلط', 'Wrong policy')], c: 0, why: L('الـ Style System بيحط class بس.', 'The Style System only adds a class.') },
    { q: L('مين بيعرّف الـ style (الاسم والـ class)؟', 'Who defines a style (name and class)?'), a: [L('الـ content author', 'The content author'), L('الـ template author في الـ policy', 'The template author, in the policy'), L('Adobe', 'Adobe')], c: 1, why: L('والـ developer بيكتب الـ CSS، والـ content author بيختار.', 'The developer writes CSS; the content author picks it.') },
  ],
});
