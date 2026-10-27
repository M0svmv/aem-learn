/* Level 6 · Developer & Architecture */

const OSGI_DEV = '/apps/wknd/osgiconfig/config.dev/com.adobe.aem.guides.wknd.core.ExternalApiImpl.cfg.json';
const osgiEdited = () => { const d = readFile(AR(), OSGI_DEV); return d != null && !String(d).includes('https://dev-api.wknd.com'); };

lesson({
  id: 'sling', level: 6, num: '6.1', time: 35,
  title: L('Sling: from URL to resource to script', 'Sling: from URL to resource to script'),
  goal: L('هتفك أي URL في AEM، وتعرف Sling بيلاقي الـ resource والـ script إزاي، وتصلّح 404 بنفسك.', 'You will decompose any AEM URL, know how Sling finds the resource and the script, and fix 404s yourself.'),
  learn: L(`
<h4>Apache Sling</h4>
<p>AEM مبني على <b>Sling</b>: web framework بيحوّل كل URL لـ <b>resource</b> (node في الـ JCR)، وبعدين يدوّر على <b>script</b> يرسمه. مفيش controllers ولا routes تكتبها بإيدك: <i>الـ URL هو الـ path في الـ JCR</i>.</p>
<h4>تفكيك الـ URL</h4>
<pre class="ls-diagram">/content/wknd/us/en/about.teaser.mobile.html/extra/info?x=1
└────── resource path ─────┘└─ selectors ─┘└ext┘└─ suffix ─┘└query┘
resource  = /content/wknd/us/en/about
selectors = teaser, mobile
extension = html
suffix    = /extra/info</pre>
<h4>الخطوة 1: الـ resource</h4>
<p>Sling بياخد الـ path وبيشيل الامتدادات من الآخر لحد ما يلاقي node موجود. لو مالقاش = <b>404</b>.</p>
<h4>الخطوة 2: الـ resource type</h4>
<p>من الـ node بياخد <code>sling:resourceType</code> (للصفحة بيبص على <code>jcr:content</code>)، مثلاً <code>wknd/components/page</code>.</p>
<h4>الخطوة 3: الـ script</h4>
<p>بيدوّر على script في <code>/apps</code> الأول وبعدين <code>/libs</code> (<b>search path</b>)، بالترتيب ده تقريباً:</p>
<pre class="ls-diagram">/apps/wknd/components/page/teaser.mobile.html   ← selectors + ext (الأدق)
/apps/wknd/components/page/teaser.html
/apps/wknd/components/page/page.html            ← اسم الـ component
… لو مش موجود ← يطلع لـ sling:resourceSuperType ويكرر
/libs/core/wcm/components/page/v3/page/page.html</pre>
<p>ولو مفيش script خالص بيستخدم <b>default servlets</b>: <code>.json</code> بيرجّع الـ properties (Default GET Servlet)، و<code>.model.json</code> بيرجّع الـ <b>Sling Model Exporter</b> (JSON مخصص للـ headless).</p>
<h4>Sling Models</h4>
<p>الـ HTL مابيكلمش الـ JCR مباشرة غالباً؛ بيستخدم <b>Sling Model</b> (Java class بـ <code>@Model</code>) بيقرا الـ properties ويحسب البيانات: <code>data-sly-use.model="com.adobe…TitleModel"</code> ثم <code>\${model.text}</code>.</p>`, `
<h4>Apache Sling</h4>
<p>AEM is built on <b>Sling</b>, a web framework that maps every URL to a <b>resource</b> (a JCR node) and then finds a <b>script</b> to render it. No hand-written controllers or routes: <i>the URL is the JCR path</i>.</p>
<h4>URL decomposition</h4>
<pre class="ls-diagram">/content/wknd/us/en/about.teaser.mobile.html/extra/info?x=1
└────── resource path ─────┘└─ selectors ─┘└ext┘└─ suffix ─┘└query┘
resource  = /content/wknd/us/en/about
selectors = teaser, mobile
extension = html
suffix    = /extra/info</pre>
<h4>Step 1: the resource</h4>
<p>Sling strips extensions from the end until it finds an existing node. None found = <b>404</b>.</p>
<h4>Step 2: the resource type</h4>
<p>It reads <code>sling:resourceType</code> (for a page, on <code>jcr:content</code>), e.g. <code>wknd/components/page</code>.</p>
<h4>Step 3: the script</h4>
<p>It looks in <code>/apps</code> first, then <code>/libs</code> (the <b>search path</b>), roughly in this order:</p>
<pre class="ls-diagram">/apps/wknd/components/page/teaser.mobile.html   ← selectors + ext (most specific)
/apps/wknd/components/page/teaser.html
/apps/wknd/components/page/page.html            ← component name
… if missing → go to sling:resourceSuperType and repeat
/libs/core/wcm/components/page/v3/page/page.html</pre>
<p>With no script it uses <b>default servlets</b>: <code>.json</code> returns properties (Default GET Servlet) and <code>.model.json</code> returns the <b>Sling Model Exporter</b> output (JSON shaped for headless).</p>
<h4>Sling Models</h4>
<p>HTL rarely reads the JCR directly; it uses a <b>Sling Model</b> (a Java class with <code>@Model</code>) that reads properties and computes data: <code>data-sly-use.model="com.adobe…TitleModel"</code> then <code>\${model.text}</code>.</p>`),
  terms: [['Selector', L('جزء بين الـ path والـ extension بيختار script مختلف.', 'A URL part between path and extension that selects a different script.')], ['Search path', L('/apps ثم /libs.', '/apps then /libs.')], ['Sling Model', L('Java class بيجهّز البيانات للـ HTL أو للـ JSON.', 'A Java class preparing data for HTL or JSON.')], ['Default GET Servlet', L('بيرجّع أي node كـ JSON/XML.', 'Returns any node as JSON/XML.')]],
  real: L('<ul><li>أي "404" على صفحة موجودة: اتأكد إن الـ path صح، وإن الـ resourceType ليه script (Developer mode ← Errors).</li><li>الـ selectors بتستخدم كتير: <code>.model.json</code> للـ headless، و<code>.print.html</code> لنسخة طباعة، وAJAX fragments.</li><li>لما تعمل overlay لحاجة من /libs، حطها في /apps بنفس الـ path بالظبط.</li></ul>', '<ul><li>A "404" on an existing page: check the path and that the resourceType has a script (Developer mode → Errors).</li><li>Selectors are common: <code>.model.json</code> for headless, <code>.print.html</code> for print views, AJAX fragments.</li><li>To overlay something from /libs, put it in /apps at exactly the same path.</li></ul>'),
  tasks: [
    { t: L('افتح <code>/content/wknd/us/en.html</code> على الـ Author', 'Open <code>/content/wknd/us/en.html</code> on Author'), ok: () => F('view:author'), guide: [step('.addr input[name=url]', 'اكتب <code>/content/wknd/us/en.html</code> في الـ address bar.', 'Type <code>/content/wknd/us/en.html</code> in the address bar.', { next: true })] },
    { t: L('نفس الصفحة بـ <code>.model.json</code> (Sling Model Exporter)', 'Same page with <code>.model.json</code> (Sling Model Exporter)'), why: L('ده اللي SPA أو Next.js بيقراه: JSON نضيف مبني من الـ Sling Models.', 'This is what an SPA or Next.js reads: clean JSON built from Sling Models.'), ok: () => F('json:model'), guide: [step('.addr input[name=url]', 'غيّر الآخر لـ <code>.model.json</code>.', 'Change the ending to <code>.model.json</code>.', { next: true })] },
    { t: L('نفس الصفحة بـ <code>/jcr:content.1.json</code> (Default GET Servlet) وقارن', 'Same page with <code>/jcr:content.1.json</code> (Default GET Servlet) and compare'), ok: () => F('json:view'), guide: [step('.addr input[name=url]', 'اكتب <code>/content/wknd/us/en/jcr:content.1.json</code>: ده الـ properties الخام.', 'Type <code>/content/wknd/us/en/jcr:content.1.json</code>: the raw properties.', { next: true })] },
    { t: L('اطلب URL مش موجود (مثلاً <code>/content/wknd/us/en/nope.html</code>) وشوف الـ 404', 'Request a missing URL (e.g. <code>/content/wknd/us/en/nope.html</code>) and read the 404'), ok: () => F('sling:404'), guide: [step('.addr input[name=url]', 'اكتب <code>/content/wknd/us/en/nope.html</code>.', 'Type <code>/content/wknd/us/en/nope.html</code>.', { next: true })] },
    { t: L('<b>Developer</b> mode: شوف الـ Script الحقيقي اللي بيرسم Title', '<b>Developer</b> mode: see the real script rendering a Title'), ok: () => F('editor:dev:inspect'), guide: [
      step('.ed-bar details.right summary', 'افتح قايمة الـ mode.', 'Open the mode menu.', { at: '/editor.html', go: '/editor.html' + SITE_ROOT + '.html' }),
      step('.ed-bar [data-act="edMode"][data-mode="developer"]', 'اختار <b>Developer</b> ودوس على Title.', 'Choose <b>Developer</b> and click a Title.', { at: '/editor.html' }),
    ] },
    { t: L('في CRXDE: اتبع الـ chain من <code>/apps/wknd/components/page</code> لحد <code>/libs/core/wcm/components/page/v3/page</code>', 'In CRXDE follow the chain from <code>/apps/wknd/components/page</code> to <code>/libs/core/wcm/components/page/v3/page</code>'), ok: () => crxSeen(p => p === '/apps/wknd/components/page') && crxSeen(p => p.startsWith('/libs/core/wcm/components/page/v3/page')), guide: [
      step('.ct-row[data-path="/apps/wknd/components/page"] .ct-name', 'بص على <code>sling:resourceSuperType</code>.', 'Look at <code>sling:resourceSuperType</code>.', { at: '/crx/de', go: '/crx/de/index.jsp#/apps/wknd/components/page' }),
      step('.ct-row[data-path="/libs/core/wcm/components/page/v3/page"] .ct-name', 'وده الـ component اللي بيورث منه، وفيه الـ scripts.', 'And this is what it inherits from, with the scripts.', { at: '/crx/de', go: '/crx/de/index.jsp#/libs/core/wcm/components/page/v3/page' }),
    ] },
  ],
  quiz: [
    { q: L('في <code>/content/a/b.list.json</code>: الـ selector إيه؟', 'In <code>/content/a/b.list.json</code>, what is the selector?'), a: [L('json', 'json'), L('list', 'list'), L('b', 'b')], c: 1, why: L('resource = /content/a/b، selector = list، extension = json.', 'resource = /content/a/b, selector = list, extension = json.') },
    { q: L('Sling بيدوّر على الـ script في أنهي ترتيب؟', 'In which order does Sling search for scripts?'), a: [L('/libs ثم /apps', '/libs then /apps'), L('/apps ثم /libs، وبعدين الـ super type', '/apps then /libs, then the super type'), L('/content', '/content')], c: 1, why: L('ده اللي بيخلّي الـ overlays تشتغل.', 'That is what makes overlays work.') },
    { q: L('الفرق بين <code>.json</code> و <code>.model.json</code>؟', '<code>.json</code> vs <code>.model.json</code>?'), a: [L('مفيش', 'None'), L('الأول properties خام، التاني Sling Model Exporter مصمم للـ apps', 'Raw properties vs the Sling Model Exporter shaped for apps'), L('التاني أبطأ', 'The second is slower')], c: 1, why: L('الـ headless بيستخدم .model.json أو GraphQL.', 'Headless uses .model.json or GraphQL.') },
    { q: L('component مالوش script في /apps ولا super type. النتيجة؟', 'A component has no script in /apps and no super type. Result?'), a: [L('بيترسم فاضي/خطأ', 'It renders empty/with an error'), L('Sling بيكتب HTML أوتوماتيك', 'Sling writes HTML automatically'), L('بياخد script الصفحة', 'It uses the page script')], c: 0, why: L('Developer mode ← Errors هيوريك "No script found".', 'Developer mode → Errors shows "No script found".') },
  ],
});

const HERO = '/apps/wknd/components/herobanner';
const HERO_HTML = HERO + '/herobanner.html';
const heroSrc = () => String(readFile(AR(), HERO_HTML) || '');
const heroAllowed = () => allowedComponents(AR(), TPL_ROOT + '/page-content', 'root/container').some(c => c.rt === 'wknd/components/herobanner');

lesson({
  id: 'mycomponent', level: 6, num: '6.2', time: 40,
  title: L('Build your own component (HTL + dialog)', 'Build your own component (HTL + dialog)'),
  goal: L('هتبني component كامل من الصفر: الـ node، الـ HTL script، الـ dialog، وتسمح بيه في الـ policy وتستخدمه في صفحة.', 'You will build a complete component from scratch — node, HTL script, dialog — allow it in a policy and use it on a page.'),
  learn: L(`
<h4>الـ component من جوه</h4>
<pre class="ls-diagram">/apps/wknd/components/herobanner          (cq:Component)
    jcr:title       = "Hero Banner"          ← الاسم اللي الـ authors بيشوفوه
    componentGroup  = "WKND Sites Project - Content"   ← المجموعة في Insert
    sling:resourceSuperType (اختياري)        ← لو بيورث من component تاني
├── herobanner.html                          ← الـ HTL script (اسمه = اسم الـ component)
└── cq:dialog                                ← فورم التعديل (Granite UI)
    └── content/items/column/items/
        ├── title   sling:resourceType=…/form/textfield   name=./title
        └── text    sling:resourceType=…/form/textarea    name=./text</pre>
<h4>إزاي الحتت دي بتتربط؟</h4>
<ol><li>الـ author بيضيف الـ component ← AEM بيعمل node في الصفحة فيه <code>sling:resourceType = wknd/components/herobanner</code>.</li>
<li>الـ author بيفتح 🔧 ← AEM بيقرا <code>cq:dialog</code> ويعرض الـ fields. كل field ليه <code>name="./title"</code>، ولما تحفظ بيتكتب property اسمها <code>title</code> على الـ node.</li>
<li>Sling بيرسم الـ node ← بيلاقي <code>herobanner.html</code> ← الـ HTL بيقرا <code>\${properties.title}</code>.</li></ol>
<p>يعني الـ <code>name</code> في الـ dialog والاسم في <code>\${properties.xxx}</code> لازم يكونوا <b>نفس الاسم</b> — ده أشهر سبب إن "الـ component مش بيعرض اللي كتبته".</p>
<h4>ليه مش هيظهر في Insert على طول؟</h4>
<p>لأن الـ <b>policy</b> بتاعة الـ container لازم تسمح بيه (درس 3.2). أو تسمح بالـ <code>componentGroup</code> كله.</p>
<h4>في المشروع الحقيقي</h4>
<p>بتعمل الملفات دي في <b>ui.apps</b> في الـ IDE: <code>herobanner/.content.xml</code> و<code>herobanner.html</code> و<code>_cq_dialog/.content.xml</code>، وبتعمل deploy بـ Maven. وغالباً بتكتب <b>Sling Model</b> في core للـ logic. الـ lab بيخليك تعمل نفس الحاجة من CRXDE عشان تشوف النتيجة على طول.</p>`, `
<h4>A component inside</h4>
<pre class="ls-diagram">/apps/wknd/components/herobanner          (cq:Component)
    jcr:title       = "Hero Banner"          ← the name authors see
    componentGroup  = "WKND Sites Project - Content"   ← its group in Insert
    sling:resourceSuperType (optional)       ← if it inherits another component
├── herobanner.html                          ← the HTL script (named like the component)
└── cq:dialog                                ← the edit form (Granite UI)
    └── content/items/column/items/
        ├── title   sling:resourceType=…/form/textfield   name=./title
        └── text    sling:resourceType=…/form/textarea    name=./text</pre>
<h4>How the pieces connect</h4>
<ol><li>An author adds the component → AEM creates a node in the page with <code>sling:resourceType = wknd/components/herobanner</code>.</li>
<li>The author opens 🔧 → AEM reads <code>cq:dialog</code> and shows its fields. A field with <code>name="./title"</code> saves a <code>title</code> property on the node.</li>
<li>Sling renders the node → finds <code>herobanner.html</code> → HTL reads <code>\${properties.title}</code>.</li></ol>
<p>So the dialog <code>name</code> and the name in <code>\${properties.xxx}</code> must <b>match</b> — the most common reason a component "doesn't show what I typed".</p>
<h4>Why isn't it in Insert yet?</h4>
<p>The container's <b>policy</b> must allow it (lesson 3.2), or allow its whole <code>componentGroup</code>.</p>
<h4>In a real project</h4>
<p>You create these files in <b>ui.apps</b> in your IDE — <code>herobanner/.content.xml</code>, <code>herobanner.html</code>, <code>_cq_dialog/.content.xml</code> — and deploy with Maven, usually with a <b>Sling Model</b> in core for logic. The lab lets you do the same in CRXDE and see the result immediately.</p>`),
  terms: [['componentGroup', L('المجموعة اللي الـ component بيظهر فيها؛ <code>.hidden</code> بيخفيه.', 'The group a component shows in; <code>.hidden</code> hides it.')], ['name="./x"', L('في الـ dialog: الـ property اللي الـ field بيكتبها.', 'In a dialog: the property the field writes.')], ['Granite UI', L('مكتبة الـ fields اللي الـ dialogs مبنية منها (textfield، select…).', 'The field library dialogs are built from (textfield, select…).')]],
  real: L('<ul><li>قبل ما تبني component جديد، اسأل: ينفع proxy لـ Core Component + Style System؟ غالباً أيوه.</li><li>سمّي الـ CSS classes بـ BEM: <code>cmp-herobanner__title</code>.</li><li>اكتب placeholder للـ edit mode عشان الـ author يقدر يختار الـ component وهو فاضي.</li></ul>', '<ul><li>Before building a new component ask: would a Core Component proxy + Style System do? Usually yes.</li><li>Name CSS classes with BEM: <code>cmp-herobanner__title</code>.</li><li>Render a placeholder in edit mode so authors can select the empty component.</li></ul>'),
  tasks: [
    { t: L('CRXDE ← <code>/apps/wknd/components</code> ← Create ▾ <b>Create Component</b>: Label <code>herobanner</code>، Title <code>Hero Banner</code>', 'CRXDE → <code>/apps/wknd/components</code> → Create ▾ <b>Create Component</b>: Label <code>herobanner</code>, Title <code>Hero Banner</code>'), why: L('ده بيعمل الـ <code>cq:Component</code> node وملف <code>herobanner.html</code> فيه HTL مبدئي.', 'This creates the <code>cq:Component</code> node and a starter <code>herobanner.html</code>.'), ok: () => JCR.type(JCR.get(AR(), HERO)) === 'cq:Component', guide: [
      crxSel('/apps/wknd/components', 'اختار فولدر <b>components</b>.', 'Select the <b>components</b> folder.'),
      step('.crx-create summary', 'افتح <b>Create ▾</b>.', 'Open <b>Create ▾</b>.', { at: '/crx/de' }),
      step('[data-act="crxNewComponent"]', 'اختار <b>Create Component…</b>.', 'Choose <b>Create Component…</b>.', { at: '/crx/de' }),
      step('.modal input[name=label]', 'Label: <code>herobanner</code> و Title: <code>Hero Banner</code>، وسيب الـ Group زي ما هو.', 'Label <code>herobanner</code>, Title <code>Hero Banner</code>; keep the Group.', { at: '/crx/de', next: true }),
      step('.modal [data-modal=ok]', 'OK. شوف الملف <code>herobanner.html</code> اتعمل جوّاه.', 'OK. Note the <code>herobanner.html</code> file inside it.', { at: '/crx/de' }),
    ] },
    { t: L('Create ▾ <b>Create Dialog</b> على herobanner (fields: title, text)', 'Create ▾ <b>Create Dialog</b> on herobanner (fields: title, text)'), ok: () => !!JCR.get(AR(), HERO + '/cq:dialog'), guide: [
      crxSel(HERO, 'اختار الـ node <b>herobanner</b>.', 'Select the <b>herobanner</b> node.'),
      step('.crx-create summary', 'افتح <b>Create ▾</b>.', 'Open <b>Create ▾</b>.', { at: '/crx/de' }),
      step('[data-act="crxNewDialog"]', 'اختار <b>Create Dialog…</b>.', 'Choose <b>Create Dialog…</b>.', { at: '/crx/de' }),
      step('.modal textarea[name=fields]', 'الـ fields جاهزة: <code>title</code> و<code>text</code>. (تقدر تزود: <code>align | Alignment | select: left, center</code>)', 'The fields are prefilled: <code>title</code> and <code>text</code>. (You may add <code>align | Alignment | select: left, center</code>)', { at: '/crx/de', next: true }),
      step('.modal [data-modal=ok]', 'OK. افتح <code>cq:dialog</code> في الشجرة وشوف شكل الـ Granite UI.', 'OK. Open <code>cq:dialog</code> in the tree and look at the Granite UI structure.', { at: '/crx/de' }),
    ] },
    { t: L('اسمح بـ <b>Hero Banner</b> في policy الـ container (template Page Content)', 'Allow <b>Hero Banner</b> in the container policy (Page Content template)'), ok: heroAllowed, guide: [
      tplStruct('في Structure بتاع Page Content.', 'In the Page Content Structure.'),
      step('frame:[data-cmp][data-pkey="root/container"]', 'اختار الـ Container.', 'Select the Container.', { at: '/editor.html' + TPL_ROOT }),
      step('frame:#lab-tb [data-tb="policy"]', 'دوس ⚙ Policy.', 'Press ⚙ Policy.', { at: '/editor.html' + TPL_ROOT }),
      step('.modal input[name=allowed][value="wknd/components/herobanner"]', 'علّم على <b>Hero Banner</b>.', 'Tick <b>Hero Banner</b>.', { at: '/editor.html' + TPL_ROOT }),
      step('.modal [data-modal=ok]', 'احفظ ✔.', 'Save ✔.', { at: '/editor.html' + TPL_ROOT }),
    ] },
    { t: L('ضيف Hero Banner في صفحة about', 'Add the Hero Banner to the about page'), ok: () => F('insert:herobanner'), guide: [
      openEditor('افتح about.', 'Open about.'),
      step('frame:[data-drop]', 'دوس <b>Drag components here</b>.', 'Click <b>Drag components here</b>.', { at: '/editor.html' }),
      step('frame:#lab-tb [data-tb="insert"]', 'دوس <b>+</b>.', 'Press <b>+</b>.', { at: '/editor.html' }),
      step('.m-insert .ins ~ Hero Banner', 'اختار <b>Hero Banner</b> — الـ component بتاعك!', 'Choose <b>Hero Banner</b> — your component!', { at: '/editor.html' }),
    ] },
    { t: L('افتحه بـ 🔧: ده الـ dialog اللي إنت عملته. املاه واحفظ', 'Open it with 🔧: that is the dialog you built. Fill it and save'), ok: () => F('dialog:herobanner'), guide: [
      openEditor('في about.', 'On about.'),
      step('frame:[data-cmp*="/herobanner"]', 'اختار الـ Hero Banner.', 'Select the Hero Banner.', { at: '/editor.html' }),
      step('frame:#lab-tb [data-tb="cfg"]', 'دوس 🔧.', 'Press 🔧.', { at: '/editor.html' }),
      step('.modal [name="./title"]', 'اكتب Title و Text.', 'Type a Title and a Text.', { at: '/editor.html', next: true }),
      step('.modal [data-modal=ok]', 'احفظ: الـ HTL بيعرض اللي كتبته.', 'Save: the HTL renders what you typed.', { at: '/editor.html' }),
    ] },
    { t: L('عدّل <code>herobanner.html</code>: ضيف سطر يعرض <code>\${currentPage.title}</code> واحفظ', 'Edit <code>herobanner.html</code>: add a line showing <code>\${currentPage.title}</code> and save'), ok: () => heroSrc().includes('currentPage.title') && F('htl:edited'), guide: [
      step('#crx-file', 'ضيف مثلاً: <code>&lt;small&gt;On: \${currentPage.title}&lt;/small&gt;</code> قبل <code>&lt;/div&gt;</code> الأخير.', 'Add e.g. <code>&lt;small&gt;On: \${currentPage.title}&lt;/small&gt;</code> before the last <code>&lt;/div&gt;</code>.', { at: '/crx/de', go: '/crx/de/index.jsp#' + HERO_HTML, next: true }),
      step('[data-act="crxSaveFile"]', 'دوس <b>Save file</b> وافتح about تاني.', 'Press <b>Save file</b> and reopen about.', { at: '/crx/de' }),
    ] },
  ],
  quiz: [
    { q: L('الـ dialog فيه <code>name="./headline"</code> والـ HTL فيه <code>\${properties.title}</code>. النتيجة؟', 'Dialog has <code>name="./headline"</code>, HTL uses <code>\${properties.title}</code>. Result?'), a: [L('بيشتغل عادي', 'It works'), L('النص مش هيظهر: الأسماء لازم تتطابق', 'The text never shows: names must match'), L('error', 'An error')], c: 1, why: L('الـ dialog كتب headline والـ HTL بيقرا title.', 'The dialog writes headline; HTL reads title.') },
    { q: L('component جديد مش ظاهر في Insert. أول حاجة تتأكد منها؟', 'A new component is missing in Insert. First check?'), a: [L('الـ policy بتسمح بيه أو بالـ group', 'The policy allows it or its group'), L('الـ Dispatcher', 'The Dispatcher'), L('الـ versions', 'Versions')], c: 0, why: L('وكمان إن الـ componentGroup مش <code>.hidden</code>.', 'Also that componentGroup is not <code>.hidden</code>.') },
    { q: L('اسم ملف الـ HTL الافتراضي لـ component اسمه herobanner؟', 'Default HTL file name for a component named herobanner?'), a: [L('index.html', 'index.html'), L('herobanner.html', 'herobanner.html'), L('component.html', 'component.html')], c: 1, why: L('Sling بيدوّر على &lt;اسم الـ component&gt;.html.', 'Sling looks for &lt;component name&gt;.html.') },
  ],
});

lesson({
  id: 'htl', level: 6, num: '6.3', time: 35,
  title: L('HTL in depth', 'HTL in depth'),
  goal: L('هتكتب HTL حقيقي: شروط، loops، tags متغيرة، contexts للأمان، وتعمل override لـ Core Component.', 'You will write real HTL: conditions, loops, dynamic tags, security contexts, and override a Core Component.'),
  learn: L(`
<h4>الـ expressions</h4>
<pre class="ls-diagram">\${properties.title}                     property على الـ node
\${properties['jcr:title']}              اسم فيه :
\${properties.title || 'Default'}        قيمة افتراضية
\${wcmmode.edit ? 'editing' : 'live'}    شرط
\${currentPage.title}  \${pageProperties.navTitle}  \${resource.path}
\${'Hi {0}' @ format=[properties.name]}   \${list @ join=', '}</pre>
<h4>الـ block statements</h4>
<table class="ls-table">
<tr><th>Statement</th><th>بيعمل</th></tr>
<tr><td><code>data-sly-test="\${x}"</code></td><td>يعرض العنصر لو x مش فاضي. <code>data-sly-test.has="\${x}"</code> بيحفظ النتيجة في متغير</td></tr>
<tr><td><code>data-sly-list.item="\${currentPage.listChildren}"</code></td><td>يكرر <i>المحتوى</i> لكل عنصر، ومعاه <code>itemList.index/first/last</code></td></tr>
<tr><td><code>data-sly-repeat.item</code></td><td>يكرر <i>العنصر نفسه</i></td></tr>
<tr><td><code>data-sly-element="\${'h2'}"</code></td><td>يغيّر اسم الـ tag</td></tr>
<tr><td><code>data-sly-attribute.href="\${x}"</code></td><td>attribute، وبيتشال لو فاضي</td></tr>
<tr><td><code>data-sly-text</code> / <code>data-sly-unwrap</code> / <code>&lt;sly&gt;</code></td><td>نص / تشيل الـ wrapper / عنصر مش بيطلع في الـ HTML</td></tr>
<tr><td><code>data-sly-use.model="com…Model"</code></td><td>يجيب Sling Model (Java)</td></tr>
<tr><td><code>data-sly-resource="\${'child'}"</code></td><td>يرسم resource تاني جوّاه</td></tr>
</table>
<h4>الأمان: XSS contexts</h4>
<p>HTL بيعمل escape أوتوماتيك حسب المكان: نص عادي، attribute، أو URL. لو الـ author كتب <code>&lt;script&gt;</code> هيظهر كنص. ولو محتاج HTML فعلاً (rich text) استخدم <code>@ context='html'</code> اللي بيعمل sanitize. <code>'unsafe'</code> بيقفل الحماية — متستخدمهوش.</p>
<h4>Override لـ Core Component</h4>
<p>عشان تغيّر الـ HTML بتاع Title في مشروعك بس: اعمل <code>title.html</code> في <code>/apps/wknd/components/title</code>. Sling هيلاقيه قبل اللي في الـ super type، وباقي الحاجات (dialog، model) بتفضل موروثة.</p>`, `
<h4>Expressions</h4>
<pre class="ls-diagram">\${properties.title}                     a property of the node
\${properties['jcr:title']}              names with :
\${properties.title || 'Default'}        a fallback
\${wcmmode.edit ? 'editing' : 'live'}    a condition
\${currentPage.title}  \${pageProperties.navTitle}  \${resource.path}
\${'Hi {0}' @ format=[properties.name]}   \${list @ join=', '}</pre>
<h4>Block statements</h4>
<table class="ls-table">
<tr><th>Statement</th><th>Does</th></tr>
<tr><td><code>data-sly-test="\${x}"</code></td><td>Renders the element only if x is not empty. <code>data-sly-test.has="\${x}"</code> keeps the result</td></tr>
<tr><td><code>data-sly-list.item="\${currentPage.listChildren}"</code></td><td>Repeats the <i>content</i> per item, with <code>itemList.index/first/last</code></td></tr>
<tr><td><code>data-sly-repeat.item</code></td><td>Repeats the <i>element itself</i></td></tr>
<tr><td><code>data-sly-element="\${'h2'}"</code></td><td>Changes the tag name</td></tr>
<tr><td><code>data-sly-attribute.href="\${x}"</code></td><td>An attribute, removed when empty</td></tr>
<tr><td><code>data-sly-text</code> / <code>data-sly-unwrap</code> / <code>&lt;sly&gt;</code></td><td>Text / drop the wrapper / an element that never appears in the HTML</td></tr>
<tr><td><code>data-sly-use.model="com…Model"</code></td><td>Loads a Sling Model (Java)</td></tr>
<tr><td><code>data-sly-resource="\${'child'}"</code></td><td>Renders another resource inside</td></tr>
</table>
<h4>Security: XSS contexts</h4>
<p>HTL escapes automatically by location: text, attribute or URL. An author typing <code>&lt;script&gt;</code> sees it as text. For real HTML (rich text) use <code>@ context='html'</code>, which sanitizes. <code>'unsafe'</code> turns protection off — don't use it.</p>
<h4>Overriding a Core Component</h4>
<p>To change the Title HTML in your project only, add <code>title.html</code> to <code>/apps/wknd/components/title</code>. Sling finds it before the super type's script, and everything else (dialog, model) stays inherited.</p>`),
  terms: [['Block statement', L('attribute بيبدأ بـ <code>data-sly-</code> بيتحكم في العرض.', 'An attribute starting with <code>data-sly-</code> that controls rendering.')], ['Context', L('طريقة الـ escape (text، attribute، uri، html، unsafe).', 'The escaping mode (text, attribute, uri, html, unsafe).')], ['Use-API', L('<code>data-sly-use</code>: يجيب Sling Model أو JS.', '<code>data-sly-use</code>: loads a Sling Model or JS.')]],
  real: L('<ul><li>الـ HTL مقصود يكون "غبي": أي logic أكتر من شرط بسيط مكانه الـ Sling Model.</li><li>الـ lab بيشغّل subset من HTL؛ <code>data-sly-template/call</code> و<code>include</code> و Java models الحقيقية محتاجين AEM حقيقي.</li></ul>', '<ul><li>HTL is meant to be "dumb": anything beyond a simple condition belongs in the Sling Model.</li><li>The lab runs an HTL subset; <code>data-sly-template/call</code>, <code>include</code> and real Java models need real AEM.</li></ul>'),
  tasks: [
    { t: L('في <code>herobanner.html</code> ضيف loop بـ <code>data-sly-list</code> على <code>currentPage.listChildren</code>', 'In <code>herobanner.html</code> add a <code>data-sly-list</code> loop over <code>currentPage.listChildren</code>'), hint: L('<code>&lt;ul data-sly-list.child="\${currentPage.listChildren}"&gt;&lt;li&gt;\${child.title}&lt;/li&gt;&lt;/ul&gt;</code> — جرّبه على الصفحة الرئيسية عشان فيها أولاد', '<code>&lt;ul data-sly-list.child="\${currentPage.listChildren}"&gt;&lt;li&gt;\${child.title}&lt;/li&gt;&lt;/ul&gt;</code> — try it on the home page, which has children'), ok: () => /data-sly-list/.test(heroSrc()), guide: [
      step('#crx-file', 'ضيف الـ list قبل <code>&lt;/div&gt;</code> الأخير.', 'Add the list before the last <code>&lt;/div&gt;</code>.', { at: '/crx/de', go: '/crx/de/index.jsp#' + HERO_HTML, next: true }),
      step('[data-act="crxSaveFile"]', 'Save file.', 'Save file.', { at: '/crx/de' }),
    ] },
    { t: L('استخدم <code>data-sly-test.var</code> و <code>data-sly-element</code>', 'Use <code>data-sly-test.var</code> and <code>data-sly-element</code>'), hint: L('مثال: <code>&lt;h2 data-sly-test.t="\${properties.title}" data-sly-element="\${properties.big ? \'h1\' : \'h2\'}"&gt;\${t}&lt;/h2&gt;</code>', 'Example: <code>&lt;h2 data-sly-test.t="\${properties.title}" data-sly-element="\${properties.big ? \'h1\' : \'h2\'}"&gt;\${t}&lt;/h2&gt;</code>'), ok: () => /data-sly-test\.\w+/.test(heroSrc()) && /data-sly-element/.test(heroSrc()) },
    { t: L('اعمل غلطة في الـ HTL (مثلاً <code>\${properties.title</code> من غير قفل) وشوف الـ error، وبعدين صلّحها', 'Break the HTL (e.g. <code>\${properties.title</code> unclosed or <code>\${a ++ b}</code>), read the error, then fix it'), why: L('هتشوف <code>SightlyException</code> زي AEM الحقيقي، وفي Developer mode ← Errors.', 'You get a <code>SightlyException</code> like real AEM, also listed in Developer mode → Errors.'), ok: () => F('htl:error') && !(HTL_WARN[ABOUT + '/jcr:content/root/container/herobanner'] || []).some(w => w.startsWith('HTL error')) },
    { t: L('Override: اعمل <code>/apps/wknd/components/title/title.html</code> بـ HTML بتاعك', 'Override: create <code>/apps/wknd/components/title/title.html</code> with your own HTML'), hint: L('<code>&lt;div data-sly-use.title="com.adobe.cq.wcm.core.components.models.Title" class="cmp-title"&gt;&lt;h2 class="cmp-title__text"&gt;★ \${title.text}&lt;/h2&gt;&lt;/div&gt;</code> — كل الـ Titles في الموقع هتتغير', '<code>&lt;div data-sly-use.title="com.adobe.cq.wcm.core.components.models.Title" class="cmp-title"&gt;&lt;h2 class="cmp-title__text"&gt;★ \${title.text}&lt;/h2&gt;&lt;/div&gt;</code> — every Title on the site changes'), ok: () => !!readFile(AR(), '/apps/wknd/components/title/title.html'), guide: [
      crxSel('/apps/wknd/components/title', 'اختار الـ proxy <b>title</b>.', 'Select the <b>title</b> proxy.'),
      step('.crx-create summary', 'Create ▾', 'Create ▾', { at: '/crx/de' }),
      step('[data-act="crxNewFile"]', '<b>Create File…</b> واكتب <code>title.html</code>.', '<b>Create File…</b> named <code>title.html</code>.', { at: '/crx/de' }),
      step('.modal input[name=name]', 'الاسم: <code>title.html</code>', 'Name: <code>title.html</code>', { at: '/crx/de', next: true }),
      step('.modal [data-modal=ok]', 'OK، وبعدين اكتب الـ HTL في المحرر (شوف الـ hint) واحفظ.', 'OK, then write the HTL in the editor (see the hint) and save.', { at: '/crx/de' }),
    ] },
    { t: L('امسح <code>title.html</code> اللي عملته عشان الـ Titles ترجع زي ما كانت', 'Delete your <code>title.html</code> so Titles go back to normal'), ok: () => F('htl:edited') && !JCR.get(AR(), '/apps/wknd/components/title/title.html') && crxSeen(p => p === '/apps/wknd/components/title/title.html') },
  ],
  quiz: [
    { q: L('author كتب <code>&lt;b&gt;Hi&lt;/b&gt;</code> في field نص، والـ HTL فيه <code>\${properties.text}</code>. هيظهر إزاي؟', 'An author types <code>&lt;b&gt;Hi&lt;/b&gt;</code>; HTL has <code>\${properties.text}</code>. Output?'), a: [L('Hi بالـ bold', 'Bold Hi'), L('النص كما هو &lt;b&gt;Hi&lt;/b&gt; (escaped)', 'The literal text &lt;b&gt;Hi&lt;/b&gt; (escaped)'), L('error', 'An error')], c: 1, why: L('الـ context الافتراضي text بيعمل escape.', 'The default text context escapes.') },
    { q: L('عايز تكرر <code>&lt;li&gt;</code> نفسه لكل عنصر. تستخدم؟', 'You want the <code>&lt;li&gt;</code> itself repeated per item. Use…'), a: [L('data-sly-list على الـ li', 'data-sly-list on the li'), L('data-sly-repeat على الـ li', 'data-sly-repeat on the li'), L('data-sly-test', 'data-sly-test')], c: 1, why: L('list بيكرر المحتوى، repeat بيكرر العنصر.', 'list repeats content; repeat repeats the element.') },
    { q: L('حطيت <code>title.html</code> في <code>/apps/wknd/components/title</code>. الـ dialog بتاع Title؟', 'You added <code>title.html</code> to <code>/apps/wknd/components/title</code>. The Title dialog…'), a: [L('اختفى', 'disappears'), L('لسه موروث من الـ Core Component', 'is still inherited from the Core Component'), L('لازم تعمله تاني', 'must be rebuilt')], c: 1, why: L('بتعمل override للي محتاجه بس.', 'You override only what you need.') },
  ],
});

lesson({
  id: 'osgi', level: 6, num: '6.4', time: 30,
  title: L('OSGi, run modes & configurations', 'OSGi, run modes & configurations'),
  goal: L('هتفهم الـ bundles والـ services، وتعمل config مختلف لكل بيئة بالـ run modes.', 'You will understand bundles and services, and give each environment its own config via run modes.'),
  learn: L(`
<h4>OSGi</h4>
<p>كود الـ Java في AEM عبارة عن <b>bundles</b> (ملفات jar) شغالة في <b>Apache Felix</b>. الـ bundle بيقدم <b>services</b> (مثلاً EmailService) وبيستخدم services تانية. الـ core module في مشروعك بيتعمله build لـ bundle واحد.</p>
<h4>OSGi configurations</h4>
<p>أي service ليه إعدادات (API URL، timeout، enabled…) بتتحفظ كـ <b>config</b> بالـ <b>PID</b> بتاعه، كملف JSON في الكود:</p>
<pre class="ls-diagram">/apps/wknd/osgiconfig/
├── config/            com.…ExternalApiImpl.cfg.json   endpoint = mock
├── config.dev/        com.…ExternalApiImpl.cfg.json   endpoint = dev-api
├── config.prod/       com.…ExternalApiImpl.cfg.json   endpoint = api
└── config.author/     …AuthoringHelperImpl.cfg.json   showDebugInfo = true</pre>
<h4>مين بيكسب؟</h4>
<p>AEM بيختار الفولدر اللي <b>كل</b> الـ run modes بتاعته موجودة في السيرفر، ولو أكتر من واحد بيطابق بياخد <b>الأدق</b> (أكتر run modes):</p>
<pre class="ls-diagram">run modes = author, dev
config            ✔ matches
config.dev        ✔ matches (أدق) ← wins
config.prod       ✘
config.author.dev ✔ لو موجود هيكسب (اتنين run modes)</pre>
<h4>Web Console</h4>
<p><code>/system/console</code>: <b>Bundles</b> (حالة كل bundle: Active/Installed)، <b>Configuration</b> (الـ configs الفعالة)، <b>Sling Settings</b> (الـ run modes). على البيئات الحقيقية مقفول، والإعدادات في Git.</p>`, `
<h4>OSGi</h4>
<p>AEM Java code runs as <b>bundles</b> (jars) in <b>Apache Felix</b>. A bundle provides <b>services</b> (e.g. EmailService) and uses others. Your project's core module builds into one bundle.</p>
<h4>OSGi configurations</h4>
<p>A service's settings (API URL, timeout, enabled…) are stored as a <b>config</b> under its <b>PID</b>, as a JSON file in code:</p>
<pre class="ls-diagram">/apps/wknd/osgiconfig/
├── config/            com.…ExternalApiImpl.cfg.json   endpoint = mock
├── config.dev/        com.…ExternalApiImpl.cfg.json   endpoint = dev-api
├── config.prod/       com.…ExternalApiImpl.cfg.json   endpoint = api
└── config.author/     …AuthoringHelperImpl.cfg.json   showDebugInfo = true</pre>
<h4>Which one wins?</h4>
<p>AEM picks folders whose run modes are <b>all</b> present on the server; if several match, the <b>most specific</b> (most run modes) wins:</p>
<pre class="ls-diagram">run modes = author, dev
config            ✔ matches
config.dev        ✔ matches (more specific) ← wins
config.prod       ✘
config.author.dev ✔ would win if present (two run modes)</pre>
<h4>Web Console</h4>
<p><code>/system/console</code>: <b>Bundles</b> (Active/Installed), <b>Configuration</b> (effective configs), <b>Sling Settings</b> (run modes). Locked on real environments; settings live in Git.</p>`),
  terms: [['Bundle', L('Java module (jar) شغال في OSGi.', 'A Java module (jar) running in OSGi.')], ['Service', L('object بيقدمه bundle ويستخدمه غيره.', 'An object a bundle provides for others.')], ['PID', L('اسم الـ config (غالباً اسم الـ class).', 'The config name (usually the class name).')], ['.cfg.json', L('format ملفات الـ OSGi config الحديث.', 'The modern OSGi config file format.')]],
  real: L('<ul><li>في AEM as a Cloud Service فيه run modes ثابتة (dev/stage/prod + author/publish)، والـ secrets بتتحط كـ <b>environment variables</b> <code>$[env:API_KEY]</code> مش في Git.</li><li>متعدّلش configs من Web Console على البيئات: بتضيع مع أول deploy.</li></ul>', '<ul><li>AEM as a Cloud Service has fixed run modes (dev/stage/prod + author/publish); secrets are <b>environment variables</b> like <code>$[env:API_KEY]</code>, not in Git.</li><li>Never change configs in the Web Console on environments: the next deploy overwrites them.</li></ul>'),
  tasks: [
    { t: L('افتح <b>Bundles</b> في الـ Web Console', 'Open <b>Bundles</b> in the Web Console'), ok: () => F('visit:bundles'), guide: [step('.felix-nav [data-url="/system/console/bundles"]', 'دوس <b>Bundles</b>: لاحظ <code>com.adobe.aem.guides.wknd.core</code> ده كود مشروعك.', 'Click <b>Bundles</b>: note <code>com.adobe.aem.guides.wknd.core</code> — your project code.', { at: '/system/console', go: '/system/console/configMgr' })] },
    { t: L('افتح <b>Configuration</b> وشوف مين بيكسب لـ <code>ExternalApiImpl</code>', 'Open <b>Configuration</b> and see which <code>ExternalApiImpl</code> config wins'), ok: () => F('visit:configmgr'), guide: [step('.felix-nav [data-url="/system/console/configMgr"]', 'دوس <b>Configuration</b> وبص على ✔ used.', 'Click <b>Configuration</b> and look for ✔ used.', { at: '/system/console', go: '/system/console/configMgr' })] },
    { t: L('عدّل <code>config.dev</code> بتاع ExternalApiImpl (غيّر الـ endpoint) في CRXDE', 'Edit the <code>config.dev</code> ExternalApiImpl file (change the endpoint) in CRXDE'), ok: osgiEdited, guide: [
      step('#crx-file', 'غيّر الـ endpoint لأي URL (مثلاً <code>https://my-dev.example</code>).', 'Change the endpoint to any URL (e.g. <code>https://my-dev.example</code>).', { at: '/crx/de', go: '/crx/de/index.jsp#' + OSGI_DEV, next: true }),
      step('[data-act="crxSaveFile"]', 'دوس <b>Save file</b>.', 'Press <b>Save file</b>.', { at: '/crx/de' }),
    ] },
    { t: L('شغّل الـ Author بـ <code>-r dev</code> وتأكد إن config.dev هو اللي بيكسب', 'Run Author with <code>-r dev</code> and confirm config.dev wins'), ok: () => inst('author').runModes.includes('dev') && F('visit:configmgr') && osgiEdited(), guide: [
      step('[data-act="stopInst"][data-k="author"]', 'اقفل الـ Author.', 'Stop the Author.', { tab: 'desktop' }),
      step('form.term-in[data-k="author"] input[name=cmd]', 'اكتب <code>java -jar aem-author-p4502.jar -r dev</code>، وبعدين افتح Configuration تاني.', 'Type <code>java -jar aem-author-p4502.jar -r dev</code>, then open Configuration again.', { tab: 'desktop', next: true }),
    ] },
  ],
  quiz: [
    { q: L('run modes = publish, prod. أنهي فولدر يكسب: config، config.prod، config.publish.prod؟', 'Run modes publish, prod. Which wins: config, config.prod, config.publish.prod?'), a: [L('config', 'config'), L('config.prod', 'config.prod'), L('config.publish.prod', 'config.publish.prod')], c: 2, why: L('الأدق اللي كل run modes بتاعته موجودة.', 'The most specific whose run modes are all present.') },
    { q: L('API key سري لـ prod. تحطه فين في AEMaaCS؟', 'A secret prod API key in AEMaaCS goes…'), a: [L('في config.prod في Git', 'In config.prod in Git'), L('Environment variable في Cloud Manager', 'An environment variable in Cloud Manager'), L('في Web Console', 'In the Web Console')], c: 1, why: L('<code>$[secret:…]</code> أو <code>$[env:…]</code>.', '<code>$[secret:…]</code> or <code>$[env:…]</code>.') },
    { q: L('كود الـ Java بتاع مشروعك بيوصل AEM إزاي؟', 'How does your project Java code reach AEM?'), a: [L('كـ bundle (core module) جوه الـ all package', 'As a bundle (core module) inside the all package'), L('بتنسخه في CRXDE', 'Copied into CRXDE'), L('في /libs', 'In /libs')], c: 0, why: L('الـ bundle بيتثبّت من /apps/…/install.', 'The bundle installs from /apps/…/install.') },
  ],
});

lesson({
  id: 'project', level: 6, num: '6.5', time: 30,
  title: L('AEM project structure & deployment', 'AEM project structure & deployment'),
  goal: L('هتعرف كل module في مشروع الـ archetype بيروح فين في الـ JCR، وإزاي الكود بيوصل لـ production.', 'You will map every archetype module to where it lands in the JCR, and see how code reaches production.'),
  learn: L(`
<h4>Maven archetype modules</h4>
<table class="ls-table">
<tr><th>Module</th><th>فيه إيه</th><th>بيروح فين</th></tr>
<tr><td><b>core</b></td><td>Java: Sling Models، services، servlets</td><td>OSGi bundle</td></tr>
<tr><td><b>ui.apps</b></td><td>components، HTL، dialogs، clientlibs</td><td><code>/apps/wknd</code> (replace)</td></tr>
<tr><td><b>ui.config</b></td><td>OSGi configs لكل run mode</td><td><code>/apps/wknd/osgiconfig</code></td></tr>
<tr><td><b>ui.content</b></td><td>templates، policies، صفحات مبدئية، DAM</td><td><code>/conf</code>، <code>/content</code> (merge)</td></tr>
<tr><td><b>ui.frontend</b></td><td>Sass/TS + webpack</td><td>بيتولّد clientlib-site في ui.apps</td></tr>
<tr><td><b>all</b></td><td>بيجمّع الكل في package واحد</td><td>اللي بيتعمله deploy</td></tr>
<tr><td><b>dispatcher</b></td><td>إعدادات Apache/Dispatcher</td><td>سيرفر الـ Dispatcher</td></tr>
<tr><td><b>it.tests / ui.tests</b></td><td>integration و UI tests</td><td>pipeline</td></tr>
</table>
<h4>Mutable vs immutable</h4>
<p>في AEM as a Cloud Service، <code>/apps</code> و<code>/libs</code> <b>immutable</b>: بيتغيروا بالـ deploy بس (مفيش CRXDE edits). و<code>/content</code> و<code>/conf</code> و<code>/var</code> <b>mutable</b>: الـ authors بيغيّروها وقت التشغيل. عشان كده ui.apps و ui.content packages منفصلين.</p>
<h4>من جهازك للـ production</h4>
<pre class="ls-diagram">local:  mvn clean install -PautoInstallSinglePackage   → AEM SDK :4502
git push → Cloud Manager pipeline:
   build + unit tests + code quality (SonarQube)
   → deploy Dev → Stage (+ performance/security tests) → Prod</pre>`, `
<h4>Maven archetype modules</h4>
<table class="ls-table">
<tr><th>Module</th><th>Contains</th><th>Lands in</th></tr>
<tr><td><b>core</b></td><td>Java: Sling Models, services, servlets</td><td>OSGi bundle</td></tr>
<tr><td><b>ui.apps</b></td><td>Components, HTL, dialogs, clientlibs</td><td><code>/apps/wknd</code> (replace)</td></tr>
<tr><td><b>ui.config</b></td><td>OSGi configs per run mode</td><td><code>/apps/wknd/osgiconfig</code></td></tr>
<tr><td><b>ui.content</b></td><td>Templates, policies, starter pages, DAM</td><td><code>/conf</code>, <code>/content</code> (merge)</td></tr>
<tr><td><b>ui.frontend</b></td><td>Sass/TS + webpack</td><td>Generates clientlib-site in ui.apps</td></tr>
<tr><td><b>all</b></td><td>Bundles everything into one package</td><td>What gets deployed</td></tr>
<tr><td><b>dispatcher</b></td><td>Apache/Dispatcher config</td><td>The Dispatcher server</td></tr>
<tr><td><b>it.tests / ui.tests</b></td><td>Integration and UI tests</td><td>The pipeline</td></tr>
</table>
<h4>Mutable vs immutable</h4>
<p>In AEM as a Cloud Service, <code>/apps</code> and <code>/libs</code> are <b>immutable</b>: they change only by deployment (no CRXDE edits). <code>/content</code>, <code>/conf</code> and <code>/var</code> are <b>mutable</b>: authors change them at runtime. That is why ui.apps and ui.content are separate packages.</p>
<h4>From your laptop to production</h4>
<pre class="ls-diagram">local:  mvn clean install -PautoInstallSinglePackage   → AEM SDK :4502
git push → Cloud Manager pipeline:
   build + unit tests + code quality (SonarQube)
   → deploy Dev → Stage (+ performance/security tests) → Prod</pre>`),
  terms: [['Archetype', L('template Maven بيولّد هيكل مشروع AEM جاهز.', 'A Maven template that generates an AEM project skeleton.')], ['Immutable content', L('/apps و /libs: بيتغيروا بالـ deploy بس.', '/apps and /libs: changed only by deployment.')], ['Cloud Manager', L('أداة Adobe للـ CI/CD والبيئات في الـ cloud.', 'Adobe\'s CI/CD and environment tool for the cloud.')]],
  real: L('<ul><li>متحطش أبداً محتوى الـ authors (صفحات حقيقية) في ui.content بـ replace.</li><li>الـ code quality gates في Cloud Manager بتوقف الـ deploy لو فيه مشاكل أمان أو performance، فاكتب كود نضيف من الأول.</li></ul>', '<ul><li>Never ship real author content in ui.content with replace.</li><li>Cloud Manager quality gates stop deploys with security or performance issues — write clean code from the start.</li></ul>'),
  tasks: [
    { t: L('في CRXDE لاقي أماكن الـ modules: <code>/apps/wknd/components</code> (ui.apps)', 'In CRXDE find module locations: <code>/apps/wknd/components</code> (ui.apps)'), ok: () => crxSeen(p => p === '/apps/wknd/components'), guide: [step('.ct-row[data-path="/apps/wknd/components"] .ct-name', 'ده ui.apps.', 'This is ui.apps.', { at: '/crx/de', go: '/crx/de/index.jsp#/apps/wknd/components' })] },
    { t: L('<code>/apps/wknd/osgiconfig</code> (ui.config)', '<code>/apps/wknd/osgiconfig</code> (ui.config)'), ok: () => crxSeen(p => p === '/apps/wknd/osgiconfig'), guide: [step('.ct-row[data-path="/apps/wknd/osgiconfig"] .ct-name', 'ده ui.config.', 'This is ui.config.', { at: '/crx/de', go: '/crx/de/index.jsp#/apps/wknd/osgiconfig' })] },
    { t: L('<code>/conf/wknd/settings/wcm/templates</code> (ui.content)', '<code>/conf/wknd/settings/wcm/templates</code> (ui.content)'), ok: () => crxSeen(p => p === TPL_ROOT), guide: [step(`.ct-row[data-path="${TPL_ROOT}"] .ct-name`, 'ده جزء من ui.content.', 'This is part of ui.content.', { at: '/crx/de', go: '/crx/de/index.jsp#' + TPL_ROOT })] },
    { t: L('ارفع <code>wknd.all</code> في Package Manager وشوف الـ sub packages بتتثبّت بالترتيب', 'Upload <code>wknd.all</code> in Package Manager and watch the sub packages install in order'), ok: () => !!S.events['pkg:installed:wknd.all'], guide: [step('[data-act="pkgUpload"]', 'Upload Package ← اختار <code>wknd.all-1.0.0-SNAPSHOT.zip</code> ← Install.', 'Upload Package → choose <code>wknd.all-1.0.0-SNAPSHOT.zip</code> → Install.', { at: '/crx/packmgr', go: '/crx/packmgr/index.jsp' })] },
    { t: L('شوف الـ packages المتثبّتة في <code>/etc/packages</code>', 'See installed packages in <code>/etc/packages</code>'), ok: () => crxSeen(p => p.startsWith('/etc/packages')), guide: [step('.ct-row[data-path="/etc/packages"] .ct-name', 'كل package متسجل هنا كملف zip.', 'Every package is stored here as a zip.', { at: '/crx/de', go: '/crx/de/index.jsp#/etc/packages' })] },
  ],
  quiz: [
    { q: L('Sling Model جديد بتكتبه في أنهي module؟', 'A new Sling Model goes in which module?'), a: [L('ui.apps', 'ui.apps'), L('core', 'core'), L('ui.content', 'ui.content')], c: 1, why: L('الـ Java في core.', 'Java lives in core.') },
    { q: L('ليه ui.apps و ui.content منفصلين؟', 'Why are ui.apps and ui.content separate?'), a: [L('عشان الحجم', 'Size'), L('immutable code مقابل mutable content بـ filter modes مختلفة', 'Immutable code vs mutable content with different filter modes'), L('مفيش سبب', 'No reason')], c: 1, why: L('ui.apps replace، ui.content merge.', 'ui.apps replace, ui.content merge.') },
    { q: L('في AEMaaCS عدّلت HTL في CRXDE على dev. هيحصل إيه؟', 'In AEMaaCS you edit HTL in CRXDE on dev. What happens?'), a: [L('يشتغل للأبد', 'It works forever'), L('مش مسموح (/apps immutable) والطريق الصح Git + pipeline', 'Not allowed (/apps immutable); use Git + pipeline'), L('بيتنشر', 'It gets published')], c: 1, why: L('الكود بيتغير بالـ deploy بس.', 'Code changes only by deployment.') },
  ],
});

// the query to type is taken from the English text, so "Type it for me" can fill the box
const qbType = (ar, en) => step('#qb-text', ar, en, { at: QB_URL, go: QB_URL, next: true, fill: en.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '').replace(/^Type:\s*/, '').replace(/&amp;/g, '&') });
const qbSearch = step('[data-act="qbRun"]', 'دوس <b>Search</b> وبص على النتايج والـ XPath.', 'Press <b>Search</b> and look at the results and the XPath.', { at: QB_URL });

lesson({
  id: 'querybuilder', level: 6, num: '6.6', time: 30,
  title: L('Searching content: QueryBuilder', 'Searching content: QueryBuilder'),
  goal: L('هتكتب queries بالـ QueryBuilder، تقرا الـ XPath اللي بيتولد، وتعرف إمتى الـ query تبقى بطيئة.', 'You will write QueryBuilder queries, read the generated XPath, and know when a query becomes slow.'),
  learn: L(`
<h4>ليه QueryBuilder؟</h4>
<p>محتاج "كل صفحات المقالات اللي معمولة من template كذا" أو "كل الصور اللي فيها كلمة desert"؟ AEM عنده <b>QueryBuilder</b>: API بيستقبل <b>predicates</b> بسيطة (key=value) ويحوّلها لـ query على Oak. نفس الـ API بيستخدمه الـ Java (<code>QueryBuilder</code> service) والـ HTTP (<code>/bin/querybuilder.json</code>) والـ components زي List و Search.</p>
<h4>الـ predicates الأساسية</h4>
<pre class="ls-diagram">path=/content/wknd                  ← ابدأ من هنا (ضيّق قد ما تقدر)
type=cq:Page                        ← نوع الـ node
property=jcr:content/cq:template    ← property (relative path مسموح)
property.value=/conf/…/page-content
property.operation=like             ← equals (default) | unequals | like (%) | exists
fulltext=desert                     ← بحث في النص
orderby=@jcr:content/jcr:title      ← ترتيب   orderby.sort=desc
p.limit=20   p.offset=20            ← pagination (p.limit=-1 = الكل)
p.hits=selective  p.properties=jcr:path jcr:content/jcr:title
1_property=…  2_property=…          ← أكتر من شرط</pre>
<h4>Query Debugger</h4>
<p><code>/libs/cq/search/content/querydebug.html</code>: تكتب الـ predicates وتشوف النتايج والـ <b>XPath</b> اللي Oak بينفذه فعلاً. أحسن مكان تجرّب فيه قبل ما تحط الـ query في الكود.</p>
<h4>الأداء: indexes و traversal</h4>
<p>Oak بيلاقي النتايج بسرعة لو فيه <b>index</b> مناسب (مثلاً على <code>jcr:primaryType</code> أو property معيّن). لو مفيش، بيعمل <b>traversal</b>: يلف على كل node في الـ repository — ده ممكن يوقف السيرفر في الـ production. عشان كده دايماً: <b>path ضيّق + type</b>، ولو بتدوّر بـ property كتير اعمل له index في <code>/oak:index</code> (في ui.apps).</p>
<h4>الأمان</h4>
<p><code>/bin/querybuilder.json</code> بيرجّع أي حاجة الـ user يقدر يقراها، عشان كده الـ Dispatcher بيقفله للزوار.</p>`, `
<h4>Why QueryBuilder?</h4>
<p>Need "all article pages built from template X" or "every image mentioning desert"? AEM's <b>QueryBuilder</b> takes simple <b>predicates</b> (key=value) and turns them into an Oak query. The same API is used from Java (the <code>QueryBuilder</code> service), over HTTP (<code>/bin/querybuilder.json</code>) and by components like List and Search.</p>
<h4>Core predicates</h4>
<pre class="ls-diagram">path=/content/wknd                  ← start here (as narrow as possible)
type=cq:Page                        ← node type
property=jcr:content/cq:template    ← a property (relative paths allowed)
property.value=/conf/…/page-content
property.operation=like             ← equals (default) | unequals | like (%) | exists
fulltext=desert                     ← full-text search
orderby=@jcr:content/jcr:title      ← sorting   orderby.sort=desc
p.limit=20   p.offset=20            ← paging (p.limit=-1 = all)
p.hits=selective  p.properties=jcr:path jcr:content/jcr:title
1_property=…  2_property=…          ← several conditions</pre>
<h4>Query Debugger</h4>
<p><code>/libs/cq/search/content/querydebug.html</code>: type predicates and see the results and the <b>XPath</b> Oak actually runs. The best place to try a query before putting it in code.</p>
<h4>Performance: indexes and traversal</h4>
<p>Oak is fast when a suitable <b>index</b> exists (e.g. on <code>jcr:primaryType</code> or a property). Without one it <b>traverses</b>: it reads every node in the repository — that can bring production down. So always use a <b>narrow path + a type</b>, and for frequent property searches add an index under <code>/oak:index</code> (in ui.apps).</p>
<h4>Security</h4>
<p><code>/bin/querybuilder.json</code> returns anything the user may read, so the Dispatcher blocks it for visitors.</p>`),
  terms: [['Predicate', L('شرط واحد في الـ query (path، type، property…).', 'One condition of a query (path, type, property…).')], ['Traversal', L('Oak بيقرا كل الـ nodes لعدم وجود index — بطيء جداً.', 'Oak reads every node for lack of an index — very slow.')], ['Oak index', L('تعريف في /oak:index بيخلّي نوع queries معيّن سريع.', 'A definition under /oak:index making certain queries fast.')]],
  real: L('<ul><li>في الكود (Sling Model أو servlet): <code>queryBuilder.createQuery(PredicateGroup.create(map), session)</code>.</li><li>في AEMaaCS الـ custom indexes بتتعمل في ui.apps باسم زي <code>damAssetLucene-8-custom-1</code> وبتتعمل deploy بالـ pipeline.</li><li>استخدم <b>Explain Query</b> (Tools ← Operations ← Query Performance) عشان تعرف الـ query بتستخدم أنهي index.</li></ul>', '<ul><li>In code (Sling Model or servlet): <code>queryBuilder.createQuery(PredicateGroup.create(map), session)</code>.</li><li>In AEMaaCS custom indexes live in ui.apps with names like <code>damAssetLucene-8-custom-1</code> and deploy through the pipeline.</li><li>Use <b>Explain Query</b> (Tools → Operations → Query Performance) to see which index a query uses.</li></ul>'),
  tasks: [
    { t: L('افتح الـ <b>Query Debugger</b> ودوس Search على الـ query الافتراضية', 'Open the <b>Query Debugger</b> and Search with the default query'), ok: () => F('qb:run') && F('qb:type'), guide: [
      step('.lab-shortcuts [data-url="/libs/cq/search/content/querydebug.html"]', 'من صفحة البداية دوس <b>Query Debugger</b>.', 'On the start page click <b>Query Debugger</b>.', { at: '/aem/start.html', go: '/aem/start.html' }),
      qbSearch,
    ] },
    { t: L('كل الصفحات اللي معمولة من template <b>Page Content</b> (property)', 'Every page made from the <b>Page Content</b> template (property)'), ok: () => F('qb:property'), guide: [
      qbType('اكتب:<br><code>path=/content/wknd<br>type=cq:Page<br>property=jcr:content/cq:template<br>property.value=/conf/wknd/settings/wcm/templates/page-content</code>', 'Type:<br><code>path=/content/wknd<br>type=cq:Page<br>property=jcr:content/cq:template<br>property.value=/conf/wknd/settings/wcm/templates/page-content</code>'),
      qbSearch,
    ] },
    { t: L('ابحث بـ <code>fulltext=desert</code> في <code>/content/dam</code>', 'Search <code>fulltext=desert</code> in <code>/content/dam</code>'), ok: () => F('qb:fulltext'), guide: [qbType('<code>path=/content/dam<br>type=dam:Asset<br>fulltext=desert</code>', '<code>path=/content/dam<br>type=dam:Asset<br>fulltext=desert</code>'), qbSearch] },
    { t: L('رتّب بالعنوان تنازلي و <code>p.hits=selective</code>', 'Sort by title descending with <code>p.hits=selective</code>'), ok: () => F('qb:orderby') && F('qb:selective'), guide: [qbType('<code>path=/content/wknd<br>type=cq:Page<br>orderby=@jcr:content/jcr:title<br>orderby.sort=desc<br>p.hits=selective<br>p.properties=jcr:path jcr:content/jcr:title</code>', '<code>path=/content/wknd<br>type=cq:Page<br>orderby=@jcr:content/jcr:title<br>orderby.sort=desc<br>p.hits=selective<br>p.properties=jcr:path jcr:content/jcr:title</code>'), qbSearch] },
    { t: L('اكتب query من غير path ولا type وشوف تحذير الـ <b>traversal</b>', 'Write a query without path or type and see the <b>traversal</b> warning'), ok: () => F('qb:traversal'), guide: [qbType('<code>property=jcr:title<br>property.operation=like<br>property.value=%Adventure%</code>', '<code>property=jcr:title<br>property.operation=like<br>property.value=%Adventure%</code>'), qbSearch] },
    { t: L('افتح النتيجة كـ JSON: <code>/bin/querybuilder.json?…</code>', 'Open the result as JSON: <code>/bin/querybuilder.json?…</code>'), ok: () => F('qb:json'), guide: [step('.qb-links a', 'دوس على لينك <b>Open as JSON</b>: ده الـ HTTP API.', 'Click <b>Open as JSON</b>: this is the HTTP API.', { at: QB_URL, go: QB_URL })] },
  ],
  quiz: [
    { q: L('query بطيئة جداً على prod. أول تحسين؟', 'A query is very slow on prod. First improvement?'), a: [L('path ضيّق + type، وindex مناسب', 'A narrow path + type, and a suitable index'), L('تزود الـ RAM', 'More RAM'), L('p.limit=-1', 'p.limit=-1')], c: 0, why: L('ده بيمنع الـ traversal.', 'That prevents traversal.') },
    { q: L('عايز صفحات العنوان بتاعها فيه "Camp". الـ predicate؟', 'Pages whose title contains "Camp". Predicate?'), a: [L('property.operation=like و property.value=%Camp%', 'property.operation=like with property.value=%Camp%'), L('fulltext=Camp*', 'fulltext=Camp*'), L('nodename=Camp', 'nodename=Camp')], c: 0, why: L('like بيستخدم % كـ wildcard.', 'like uses % as the wildcard.') },
    { q: L('ليه الـ Dispatcher بيقفل <code>/bin/querybuilder.json</code>؟', 'Why does the Dispatcher block <code>/bin/querybuilder.json</code>?'), a: [L('عشان مش بيتعمله cache', 'Not cacheable'), L('بيكشف محتوى ويقدر يتقل السيرفر', 'It exposes content and can overload the server'), L('مش موجود على Publish', 'It doesn\'t exist on Publish')], c: 1, why: L('أمان وأداء.', 'Security and performance.') },
  ],
});

lesson({
  id: 'headless', level: 6, num: '6.7', time: 30,
  title: L('Headless AEM & Next.js', 'Headless AEM & Next.js'),
  goal: L('هتختار بين headful و headless و hybrid، وتعرف Next.js بيجيب المحتوى من AEM إزاي.', 'You will choose between headful, headless and hybrid, and know how Next.js fetches content from AEM.'),
  learn: L(`
<h4>3 طرق للبناء</h4>
<table class="ls-table">
<tr><th>النمط</th><th>العرض</th><th>متى</th></tr>
<tr><td><b>Headful</b> (traditional)</td><td>AEM بيطلّع الـ HTML (HTL)</td><td>مواقع content عادية، الـ authors محتاجين editor كامل</td></tr>
<tr><td><b>Headless</b></td><td>Next.js/React/Mobile بيعرض، AEM بيقدم JSON</td><td>تطبيقات، multi-channel، فريق frontend قوي</td></tr>
<tr><td><b>Hybrid / SPA Editor</b></td><td>Next.js بيعرض، والـ authors بيعدّلوا جوه AEM editor</td><td>محتاج الاتنين</td></tr>
</table>
<h4>مصادر البيانات</h4>
<ul><li><b>GraphQL persisted queries</b> للـ Content Fragments (الأشهر للـ headless): <code>GET /graphql/execute.json/wknd/adventures-all</code>.</li>
<li><b>Sling Model Exporter</b> للصفحات: <code>GET /content/wknd/us/en.model.json</code>.</li>
<li><b>Assets HTTP API</b> و Dynamic Media للصور.</li></ul>
<h4>في Next.js</h4>
<pre class="ls-diagram">// app/adventures/page.tsx  (Server Component)
const res = await fetch(
  'https://publish-p123.adobeaemcloud.com/graphql/execute.json/wknd/adventures-all',
  { next: { revalidate: 300 } });
const { data } = await res.json();
return data.adventureList.items.map(a => &lt;Card {...a} /&gt;);</pre>
<h4>حاجات لازم تتظبط</h4>
<ul><li><b>CORS</b> config على AEM لو الطلب من المتصفح.</li><li>Dispatcher filters تسمح بـ <code>/graphql/execute.json</code> والـ cache rules ليه.</li><li>الـ authentication للـ Author (preview) بـ tokens.</li><li>الصور: <code>_path</code> + domain الـ publish أو Dynamic Media URLs.</li></ul>`, `
<h4>Three ways to build</h4>
<table class="ls-table">
<tr><th>Pattern</th><th>Rendering</th><th>When</th></tr>
<tr><td><b>Headful</b> (traditional)</td><td>AEM outputs HTML (HTL)</td><td>Classic content sites, full in-place editing</td></tr>
<tr><td><b>Headless</b></td><td>Next.js/React/mobile render; AEM serves JSON</td><td>Apps, multi-channel, strong front-end team</td></tr>
<tr><td><b>Hybrid / SPA Editor</b></td><td>Next.js renders; authors still edit in the AEM editor</td><td>Need both</td></tr>
</table>
<h4>Data sources</h4>
<ul><li><b>GraphQL persisted queries</b> for Content Fragments (the usual headless path): <code>GET /graphql/execute.json/wknd/adventures-all</code>.</li>
<li><b>Sling Model Exporter</b> for pages: <code>GET /content/wknd/us/en.model.json</code>.</li>
<li><b>Assets HTTP API</b> and Dynamic Media for images.</li></ul>
<h4>In Next.js</h4>
<pre class="ls-diagram">// app/adventures/page.tsx  (Server Component)
const res = await fetch(
  'https://publish-p123.adobeaemcloud.com/graphql/execute.json/wknd/adventures-all',
  { next: { revalidate: 300 } });
const { data } = await res.json();
return data.adventureList.items.map(a => &lt;Card {...a} /&gt;);</pre>
<h4>Things to configure</h4>
<ul><li>A <b>CORS</b> config on AEM for browser calls.</li><li>Dispatcher filters allowing <code>/graphql/execute.json</code>, plus cache rules.</li><li>Token authentication for Author (preview).</li><li>Images: <code>_path</code> + the publish domain, or Dynamic Media URLs.</li></ul>`),
  terms: [['SPA Editor', L('بيخلّي الـ authors يعدّلوا تطبيق React/Next جوه AEM editor.', 'Lets authors edit a React/Next app inside the AEM editor.')], ['CORS', L('إذن المتصفح يطلب API من domain تاني.', 'Browser permission to call an API on another domain.')], ['ISR / revalidate', L('Next.js بيعمل cache للصفحة ويحدّثها كل فترة.', 'Next.js caches a page and refreshes it periodically.')]],
  real: L('<ul><li>مشروع الـ roadmap (Next.js + AEM) غالباً هيكون headless بالـ Content Fragments و GraphQL persisted queries.</li><li>خطط الـ content model مع الـ authors والـ frontend مع بعض قبل ما تبني.</li><li>الـ cache على 3 مستويات: Dispatcher، CDN، و Next.js (revalidate).</li></ul>', '<ul><li>The roadmap project (Next.js + AEM) will likely be headless with Content Fragments and persisted queries.</li><li>Design the content model with authors and front-end together before building.</li><li>Cache at three levels: Dispatcher, CDN and Next.js (revalidate).</li></ul>'),
  tasks: [
    { t: L('اطلب <code>/content/wknd/us/en.model.json</code> على Publish', 'Request <code>/content/wknd/us/en.model.json</code> on Publish'), ok: () => F('json:model'), guide: [step('.addr input[name=url]', 'اكتب <code>/content/wknd/us/en.model.json</code>: ده اللي SPA بيقراه.', 'Type <code>/content/wknd/us/en.model.json</code>: what an SPA reads.', { tab: 'publish', next: true })] },
    { t: L('Run لـ GraphQL query', 'Run a GraphQL query'), ok: () => F('gql:ok'), guide: [step('[data-act="gqlRun"]', 'دوس <b>Run</b>.', 'Press <b>Run</b>.', { at: GRAPHIQL_URL, go: GRAPHIQL_URL })] },
    { t: L('persisted query منشور ومتعمله cache في الـ Dispatcher', 'A published persisted query cached by the Dispatcher'), hint: L('درس 2.5 بالتفصيل', 'Lesson 2.5 in detail'), ok: () => F('dispatcher:gql') },
  ],
  quiz: [
    { q: L('موقع marketing الـ authors عايزين يعدّلوا فيه drag & drop، وفيه app موبايل بنفس المحتوى. أنسب نمط؟', 'A marketing site needing drag-and-drop editing plus a mobile app with the same content. Best fit?'), a: [L('Headful بس', 'Headful only'), L('Hybrid: صفحات AEM + Content Fragments للـ app', 'Hybrid: AEM pages + Content Fragments for the app'), L('Headless بس', 'Headless only')], c: 1, why: L('كل قناة تاخد اللي يناسبها.', 'Each channel gets what fits it.') },
    { q: L('Next.js بيطلب GraphQL من المتصفح وبيفشل بـ CORS error. الحل؟', 'Next.js calls GraphQL from the browser and gets a CORS error. Fix?'), a: [L('CORS config على AEM يسمح بالـ origin', 'A CORS config on AEM allowing the origin'), L('تشيل الـ Dispatcher', 'Remove the Dispatcher'), L('تستخدم POST', 'Use POST')], c: 0, why: L('أو تطلب من الـ server side في Next.js.', 'Or call it server-side in Next.js.') },
  ],
});

lesson({
  id: 'bestpractices', level: 6, num: '6.8', time: 25,
  title: L('Security, performance & troubleshooting', 'Security, performance & troubleshooting'),
  goal: L('هتعرف أهم قواعد الأمان والأداء، وتتبع أي مشكلة بخطوات ثابتة.', 'You will know the key security and performance rules and trace any problem step by step.'),
  learn: L(`
<h4>الأمان</h4>
<ul><li><b>Dispatcher filters</b>: deny كل حاجة وبعدين allow اللي محتاجه بس (deny-by-default).</li>
<li>مفيش <code>admin/admin</code> على أي بيئة غير local. والـ Publish مافيهوش CRXDE ولا Web Console.</li>
<li>الصلاحيات بـ <b>ACLs</b> على الـ groups مش الـ users (Tools ← Security ← Permissions).</li>
<li>HTL بيعمل <b>XSS escaping</b> أوتوماتيك حسب الـ context؛ متستخدمش <code>context='unsafe'</code>.</li></ul>
<h4>الأداء</h4>
<ul><li>اعمل cache لأكبر قدر ممكن في الـ Dispatcher والـ CDN.</li><li>الـ JCR queries لازم يكون ليها <b>Oak index</b>، وإلا "traversal" بيبطّأ السيرفر.</li><li>clientlibs: minify و embed و async JS.</li><li>صور بـ renditions مناسبة / Dynamic Media.</li></ul>
<h4>Troubleshooting checklist</h4>
<pre class="ls-diagram">المشكلة على الموقع؟
1) جرّب على Publish مباشرة (من غير Dispatcher)  → اختلاف؟ = cache/filters
2) جرّب على Author                               → اختلاف؟ = replication / مش منشور
3) Developer mode / .json                         → resource type، script، properties
4) error.log في crx-quickstart/logs               → exceptions
5) Web Console: bundles Active؟ configs صح؟</pre>`, `
<h4>Security</h4>
<ul><li><b>Dispatcher filters</b>: deny everything, then allow only what is needed (deny-by-default).</li>
<li>No <code>admin/admin</code> anywhere but local; Publish has no CRXDE or Web Console.</li>
<li>Permissions via <b>ACLs</b> on groups, not users (Tools → Security → Permissions).</li>
<li>HTL does context-aware <b>XSS escaping</b> automatically; avoid <code>context='unsafe'</code>.</li></ul>
<h4>Performance</h4>
<ul><li>Cache as much as possible in the Dispatcher and CDN.</li><li>JCR queries need an <b>Oak index</b>, or a "traversal" slows the server.</li><li>Clientlibs: minify, embed, async JS.</li><li>Images via suitable renditions / Dynamic Media.</li></ul>
<h4>Troubleshooting checklist</h4>
<pre class="ls-diagram">Problem on the site?
1) Try Publish directly (no Dispatcher)   → differs? = cache/filters
2) Try Author                              → differs? = replication / not published
3) Developer mode / .json                  → resource type, script, properties
4) error.log in crx-quickstart/logs        → exceptions
5) Web Console: bundles Active? configs right?</pre>`),
  terms: [['ACL', L('صلاحيات (read/modify…) على path لـ user أو group.', 'Permissions (read/modify…) on a path for a user or group.')], ['Oak index', L('index بيخلّي الـ queries سريعة.', 'An index that makes queries fast.')], ['XSS', L('حقن scripts في الصفحة؛ HTL بيحمي منه.', 'Script injection; HTL protects against it.')]],
  real: L('<ul><li>Adobe عندها <b>AEM Security Checklist</b> و Best Practices Analyzer — اقراهم قبل أي go-live.</li><li>مشاكل الـ production الأشهر: stale cache، replication queue واقف، و queries من غير index.</li></ul>', '<ul><li>Adobe publishes an <b>AEM Security Checklist</b> and the Best Practices Analyzer — read them before go-live.</li><li>Most common production issues: stale cache, a blocked replication queue, queries without an index.</li></ul>'),
  tasks: [
    { t: L('شوف <code>dispatcher.any</code> (الـ filters والـ cache rules)', 'View <code>dispatcher.any</code> (filters and cache rules)'), ok: () => F('dispatcher:any'), guide: [step('[data-act="dispAny"]', 'دوس <b>View dispatcher.any</b>.', 'Click <b>View dispatcher.any</b>.', { tab: 'dispatcher', at: /^\/?$/, go: '/' })] },
    { t: L('جرّب <code>.infinity.json</code> و <code>/system/console</code> من الـ Dispatcher: الاتنين ممنوعين', 'Try <code>.infinity.json</code> and <code>/system/console</code> through the Dispatcher: both blocked'), ok: () => F('dispatcher:blocked'), guide: [step('.addr input[name=url]', 'اكتب <code>/content/wknd/us/en.infinity.json</code>.', 'Type <code>/content/wknd/us/en.infinity.json</code>.', { tab: 'dispatcher', next: true })] },
    { t: L('Developer mode ← tab <b>Errors</b>', 'Developer mode → <b>Errors</b> tab'), ok: () => F('editor:dev:errors'), guide: [
      step('.ed-bar details.right summary', 'افتح قايمة الـ mode.', 'Open the mode menu.', { at: '/editor.html', go: '/editor.html' + SITE_ROOT + '.html' }),
      step('.ed-bar [data-act="edMode"][data-mode="developer"]', 'Developer.', 'Developer.', { at: '/editor.html' }),
      step('.devpanel [data-act="devTab"][data-v="errors"]', 'tab <b>Errors</b>.', 'The <b>Errors</b> tab.', { at: '/editor.html' }),
    ] },
  ],
  quiz: [
    { q: L('الصفحة صح على Publish مباشرة وغلط من الـ Dispatcher. المشكلة في؟', 'A page is right on Publish but wrong via the Dispatcher. The problem is…'), a: [L('الـ Author', 'Author'), L('cache أو filters الـ Dispatcher', 'Dispatcher cache or filters'), L('الـ template', 'The template')], c: 1, why: L('بتعزل الطبقة اللي فيها الفرق.', 'Isolate the layer where the difference appears.') },
    { q: L('Query بطيئة جداً ومعطّلة السيرفر. أغلب سبب؟', 'A query is very slow and hurts the server. Likely cause?'), a: [L('مفيش Oak index مناسب (traversal)', 'No suitable Oak index (traversal)'), L('clientlibs', 'Clientlibs'), L('الـ Dispatcher', 'The Dispatcher')], c: 0, why: L('اعمل index مخصص في ui.apps (_oak_index).', 'Add a custom index in ui.apps (_oak_index).') },
    { q: L('أفضل طريقة لصلاحيات 50 author؟', 'Best way to grant permissions to 50 authors?'), a: [L('لكل user لوحده', 'Per user'), L('group واحد عليه ACLs وتضيفهم فيه', 'One group with ACLs, add them to it'), L('كلهم admin', 'Make them all admin')], c: 1, why: L('الـ ACLs على الـ groups أسهل في الإدارة.', 'Group ACLs are far easier to manage.') },
  ],
});

lesson({
  id: 'sitecore', level: 6, num: '6.9', time: 25,
  title: L('From Sitecore to AEM', 'From Sitecore to AEM'),
  goal: L('هتربط كل مفهوم Sitecore تعرفه بمقابله في AEM، وتعرف أهم فروقات الـ migration.', 'You will map each Sitecore concept you know to its AEM counterpart and know the key migration differences.'),
  learn: L(`
<h4>خريطة المفاهيم</h4>
<table class="ls-table">
<tr><th>Sitecore</th><th>AEM</th></tr>
<tr><td>Content tree / Items</td><td>JCR nodes تحت <code>/content</code></td></tr>
<tr><td>Data templates (fields)</td><td>Component dialogs / Content Fragment Models</td></tr>
<tr><td>Page templates + Standard Values</td><td>Editable templates (structure + initial content)</td></tr>
<tr><td>Renderings / Sublayouts</td><td>Components (HTL + Sling Model)</td></tr>
<tr><td>Placeholders</td><td>Containers (responsive grid) + policies</td></tr>
<tr><td>Placeholder settings (allowed controls)</td><td>Policy ← Allowed Components</td></tr>
<tr><td>Experience Editor</td><td>Page editor (Touch UI)</td></tr>
<tr><td>Media Library</td><td>DAM (Assets)</td></tr>
<tr><td>Workbox / Workflows</td><td>Inbox / Workflows</td></tr>
<tr><td>Publishing (master → web DB)</td><td>Replication (Author → Publish)</td></tr>
<tr><td>Language versions</td><td>Language roots + Language copies</td></tr>
<tr><td>SXA site cloning / multisite</td><td>MSM blueprints + live copies</td></tr>
<tr><td>Personalization rules</td><td>Targeting + ContextHub segments (أو Adobe Target)</td></tr>
<tr><td>JSS / Headless Services / Edge</td><td>Content Fragments + GraphQL / SPA Editor</td></tr>
<tr><td>.config patches / environments</td><td>OSGi configs + run modes</td></tr>
<tr><td>Sitecore packages / Unicorn / TDS</td><td>Content packages / Maven modules</td></tr>
</table>
<h4>أهم الفروقات</h4>
<ul><li>AEM <b>Java</b> (Sling/OSGi) مش .NET.</li><li>المحتوى شجرة JCR واحدة، وكل حاجة ليها URL.</li><li>Author و Publish سيرفرات منفصلة.</li><li>Editable templates في الـ UI بدل الكود.</li><li>Core Components جاهزة بدل ما تكتب كل rendering.</li></ul>
<h4>خطة migration نموذجية</h4>
<ol><li>Content audit (CSV/inventory) وتحديد اللي هيتنقل.</li><li>تصميم الـ templates والـ components في AEM (مش نسخ 1:1).</li><li>Content model (CF models) للـ headless.</li><li>Migration scripts/tools (مثلاً تحويل الـ items لـ packages أو استخدام APIs).</li><li>Redirects للـ URLs القديمة، وSEO.</li></ol>`, `
<h4>Concept map</h4>
<table class="ls-table">
<tr><th>Sitecore</th><th>AEM</th></tr>
<tr><td>Content tree / Items</td><td>JCR nodes under <code>/content</code></td></tr>
<tr><td>Data templates (fields)</td><td>Component dialogs / Content Fragment Models</td></tr>
<tr><td>Page templates + Standard Values</td><td>Editable templates (structure + initial content)</td></tr>
<tr><td>Renderings / Sublayouts</td><td>Components (HTL + Sling Model)</td></tr>
<tr><td>Placeholders</td><td>Containers (responsive grid) + policies</td></tr>
<tr><td>Placeholder settings (allowed controls)</td><td>Policy → Allowed Components</td></tr>
<tr><td>Experience Editor</td><td>Page editor (Touch UI)</td></tr>
<tr><td>Media Library</td><td>DAM (Assets)</td></tr>
<tr><td>Workbox / Workflows</td><td>Inbox / Workflows</td></tr>
<tr><td>Publishing (master → web DB)</td><td>Replication (Author → Publish)</td></tr>
<tr><td>Language versions</td><td>Language roots + Language copies</td></tr>
<tr><td>SXA site cloning / multisite</td><td>MSM blueprints + live copies</td></tr>
<tr><td>Personalization rules</td><td>Targeting + ContextHub segments (or Adobe Target)</td></tr>
<tr><td>JSS / Headless Services / Edge</td><td>Content Fragments + GraphQL / SPA Editor</td></tr>
<tr><td>.config patches / environments</td><td>OSGi configs + run modes</td></tr>
<tr><td>Sitecore packages / Unicorn / TDS</td><td>Content packages / Maven modules</td></tr>
</table>
<h4>Key differences</h4>
<ul><li>AEM is <b>Java</b> (Sling/OSGi), not .NET.</li><li>Content is one JCR tree; everything has a URL.</li><li>Author and Publish are separate servers.</li><li>Editable templates live in the UI, not code.</li><li>Core Components replace writing every rendering.</li></ul>
<h4>A typical migration plan</h4>
<ol><li>Content audit (CSV/inventory) and scope.</li><li>Design AEM templates and components (not a 1:1 copy).</li><li>Content model (CF models) for headless.</li><li>Migration scripts/tools (items → packages or via APIs).</li><li>Redirects for old URLs, and SEO.</li></ol>`),
  terms: [['Standard Values', L('في Sitecore: قيم افتراضية للـ template ≈ Initial Content في AEM.', 'Sitecore template defaults ≈ AEM Initial Content.')], ['Placeholder', L('في Sitecore: مكان للـ renderings ≈ Container في AEM.', 'Sitecore slot for renderings ≈ AEM container.')]],
  real: L('<ul><li>متنقلش التصميم 1:1: استغل Core Components و Style System و Layout mode عشان تقلل الكود.</li><li>الـ URLs بتتغير غالباً؛ جهّز redirect map (Dispatcher rewrite rules أو vanity URLs).</li></ul>', '<ul><li>Don\'t port the design 1:1: use Core Components, the Style System and Layout mode to cut code.</li><li>URLs usually change; prepare a redirect map (Dispatcher rewrite rules or vanity URLs).</li></ul>'),
  tasks: [
    { t: L('افتح المقابل لـ "Page templates": Tools ← Templates', 'Open the counterpart of "Page templates": Tools → Templates'), ok: () => F('visit:templates'), guide: [step('.tool-card ~ Templates', 'دوس <b>Templates</b>.', 'Click <b>Templates</b>.', { at: '/aem/tools.html', go: '/aem/tools.html' })] },
    { t: L('افتح المقابل لـ "Data templates" للـ headless: Content Fragment Models', 'Open the counterpart of headless "Data templates": Content Fragment Models'), ok: () => F('visit:cfm'), guide: [step(null, 'هنفتح Content Fragment Models.', 'We open Content Fragment Models.', { at: CFM_URL, go: CFM_URL, next: true })] },
    { t: L('افتح المقابل لـ "Placeholder settings": policy بتاعة container', 'Open the counterpart of "Placeholder settings": a container policy'), ok: () => F('policy:opened') || F('policy:button') || F('policy:titleSizes'), guide: [
      step('frame:[data-cmp][data-pkey="root/container"]', 'اختار الـ Container.', 'Select the Container.', { at: '/editor.html' + TPL_ROOT, go: PC_STRUCT }),
      step('frame:#lab-tb [data-tb="policy"]', 'دوس ⚙ Policy: دي الـ allowed components.', 'Press ⚙ Policy: these are the allowed components.', { at: '/editor.html' + TPL_ROOT }),
    ] },
  ],
  quiz: [
    { q: L('Sitecore "rendering" يقابلها في AEM؟', 'A Sitecore "rendering" maps to?'), a: [L('Template', 'Template'), L('Component', 'Component'), L('Policy', 'Policy')], c: 1, why: L('HTL + Sling Model.', 'HTL + Sling Model.') },
    { q: L('Sitecore "placeholder settings" يقابلها؟', 'Sitecore "placeholder settings" map to?'), a: [L('Allowed Components في الـ policy', 'Allowed Components in a policy'), L('cq:dialog', 'cq:dialog'), L('Run modes', 'Run modes')], c: 0, why: L('الاتنين بيحددوا إيه يتحط فين.', 'Both decide what may go where.') },
    { q: L('Sitecore publishing (master → web) يقابله؟', 'Sitecore publishing (master → web) maps to?'), a: [L('Replication من Author لـ Publish', 'Replication from Author to Publish'), L('Workflow', 'Workflow'), L('Launch', 'Launch')], c: 0, why: L('AEM فيه سيرفرات منفصلة بدل databases.', 'AEM uses separate servers instead of databases.') },
  ],
});
