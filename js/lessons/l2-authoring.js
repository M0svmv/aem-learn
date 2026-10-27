/* Level 2 · Authoring */

const EDIT_ABOUT = '/editor.html' + ABOUT + '.html';
const editMode = () => { if (S.ui.editor.mode && S.ui.editor.mode !== 'edit') { S.ui.editor.mode = 'edit'; commit(); } };
const openEditor = (ar, en) => step(null, ar, en, { at: EDIT_ABOUT, go: EDIT_ABOUT, next: true, prep: editMode });
const modeMenu = step('.ed-bar details.right summary', 'دوس على قايمة الـ mode (مكتوب فيها Edit) جنب Preview.', 'Open the mode menu (it says Edit) next to Preview.', { at: '/editor.html', go: EDIT_ABOUT });

lesson({
  id: 'components', level: 2, num: '2.1', video: '#11', time: 30,
  title: L('Components & the page editor', 'Components & the page editor'),
  goal: L('هتضيف components لصفحة وتعدّلها، وتفهم الـ component متكوّن من إيه ومتخزن فين.', 'You will add and configure components on a page, and understand what a component is made of and where it lives.'),
  learn: L(`
<h4>الـ component = حتة من الصفحة</h4>
<p>الصفحة في AEM مبنية من <b>components</b>: Title، Text، Image، Button، Teaser… الـ author بيرصّهم جوه <b>containers</b> ويملا كل واحد بالمحتوى بتاعه.</p>
<h4>الـ component متكوّن من إيه؟ (تحت <code>/apps</code>)</h4>
<ul><li><b>Node</b> نوعه <code>cq:Component</code>، مثلاً <code>/apps/wknd/components/title</code>، فيه <code>jcr:title</code> و<code>componentGroup</code> (المجموعة اللي بيظهر فيها).</li>
<li><b>HTL script</b> (<code>title.html</code>): الـ HTML اللي بيترسم.</li>
<li><b>Dialog</b> (<code>cq:dialog</code>): الفورم اللي بتفتحه بالـ 🔧 عشان تعدّل.</li>
<li>غالباً <b>Sling Model</b> (Java) بيجهّز البيانات للـ HTL.</li></ul>
<h4>Proxy components و Core Components</h4>
<p>Adobe عاملة مكتبة جاهزة اسمها <b>Core Components</b> في <code>/libs/core/wcm/components</code>. مشروعك مش بيكتب Title من الصفر: بيعمل <b>proxy</b> صغير في <code>/apps</code> فيه property واحدة:</p>
<pre class="ls-diagram">/apps/wknd/components/title
  sling:resourceSuperType = core/wcm/components/title/v3/title
  → الـ HTL والـ dialog والـ Sling Model بيتورثوا من /libs</pre>
<p>وده بيخلّيك تعمل upgrade للـ Core Components من غير ما تلمس كود المشروع، وتقدر تـ override أي جزء (مثلاً الـ HTL بس) بإنك تحط ملف بنفس الاسم في الـ proxy.</p>
<h4>المحتوى بيتخزن فين؟</h4>
<p>لما تضيف Title في صفحة، AEM بيعمل node في الصفحة نفسها فيه <code>sling:resourceType = wknd/components/title</code>، وكل اللي بتكتبه في الـ dialog بيبقى properties عليه (زي <code>jcr:title</code>). الـ resourceType ده هو "الربط" بين المحتوى والكود.</p>
<pre class="ls-diagram">المحتوى:  /content/wknd/us/en/about/jcr:content/root/container/title
          sling:resourceType = wknd/components/title,  jcr:title = "Hello"
الكود:    /apps/wknd/components/title  →  /libs/core/wcm/components/title/v3/title/title.html</pre>
<h4>الـ editor</h4>
<ul><li>المربع <b>"Drag components here"</b>: دوس عليه ← <b>+</b> ← اختار component. أو اسحب من الـ side panel.</li>
<li>دوسة على component = toolbar فيه 🔧 Configure، 🖌 Styles، Copy، Delete، و<b>Parent</b>.</li>
<li>الـ side panel فيه 3 tabs: <b>Assets</b>، <b>Components</b>، <b>Content Tree</b>.</li>
<li>الـ components اللي بتظهرلك محكومة بالـ <b>policy</b> بتاعة الـ container (المستوى 3).</li></ul>`, `
<h4>A component = a piece of a page</h4>
<p>AEM pages are built from <b>components</b>: Title, Text, Image, Button, Teaser… Authors stack them inside <b>containers</b> and fill each with its content.</p>
<h4>What a component is made of (under <code>/apps</code>)</h4>
<ul><li>A <code>cq:Component</code> <b>node</b>, e.g. <code>/apps/wknd/components/title</code>, with <code>jcr:title</code> and <code>componentGroup</code> (the group it shows in).</li>
<li>An <b>HTL script</b> (<code>title.html</code>): the HTML it renders.</li>
<li>A <b>dialog</b> (<code>cq:dialog</code>): the form you open with 🔧.</li>
<li>Often a <b>Sling Model</b> (Java) that prepares data for the HTL.</li></ul>
<h4>Proxy components and Core Components</h4>
<p>Adobe ships a ready library, the <b>Core Components</b>, in <code>/libs/core/wcm/components</code>. Your project does not write a Title from scratch; it creates a small <b>proxy</b> in <code>/apps</code> with one property:</p>
<pre class="ls-diagram">/apps/wknd/components/title
  sling:resourceSuperType = core/wcm/components/title/v3/title
  → HTL, dialog and Sling Model are inherited from /libs</pre>
<p>That lets you upgrade the Core Components without touching project code, and override any part (e.g. only the HTL) by adding a file with the same name in the proxy.</p>
<h4>Where content is stored</h4>
<p>Adding a Title to a page creates a node <i>in that page</i> with <code>sling:resourceType = wknd/components/title</code>; everything you type in the dialog becomes properties on it (like <code>jcr:title</code>). The resourceType is the link between content and code.</p>
<pre class="ls-diagram">content:  /content/wknd/us/en/about/jcr:content/root/container/title
          sling:resourceType = wknd/components/title,  jcr:title = "Hello"
code:     /apps/wknd/components/title  →  /libs/core/wcm/components/title/v3/title/title.html</pre>
<h4>The editor</h4>
<ul><li>The <b>"Drag components here"</b> box: click it → <b>+</b> → pick a component, or drag one from the side panel.</li>
<li>Click a component for its toolbar: 🔧 Configure, 🖌 Styles, Copy, Delete and <b>Parent</b>.</li>
<li>The side panel has 3 tabs: <b>Assets</b>, <b>Components</b>, <b>Content Tree</b>.</li>
<li>Which components you see is controlled by the container's <b>policy</b> (Level 3).</li></ul>`),
  terms: [
    ['sling:resourceType', L('بيقول لـ Sling يرسم الـ node ده بأنهي component.', 'Tells Sling which component renders this node.')],
    ['sling:resourceSuperType', L('الـ component اللي بيورث منه (زي extends).', 'The component it inherits from (like extends).')],
    ['HTL', L('HTML Template Language: لغة الـ templates بتاعة AEM (الملفات .html).', 'HTML Template Language — AEM\'s templating (.html files).')],
    ['cq:dialog', L('تعريف فورم التعديل بتاع الـ component.', 'The component\'s edit form definition.')],
    ['Core Components', L('مكتبة components جاهزة من Adobe، open source.', 'Adobe\'s ready, open-source component library.')],
  ],
  real: L('<ul><li>القاعدة في المشاريع: <b>كل component هو proxy لـ Core Component</b> لو ينفع، ومتعملش component من الصفر غير لو مفيش حاجة قريبة.</li><li>متحطش في الـ HTL logic: الـ logic مكانه الـ Sling Model (Java) والـ HTL للعرض بس.</li><li>الـ Core Components ليها versions (v1, v2, v3). الـ proxy بيشاور على version معيّن، والـ upgrade بيكون بتغيير السطر ده.</li></ul>',
    '<ul><li>Project rule: <b>every component is a proxy of a Core Component</b> when possible; build from scratch only when nothing is close.</li><li>Keep logic out of HTL: logic belongs in the Sling Model (Java); HTL only renders.</li><li>Core Components are versioned (v1, v2, v3); the proxy points at one, and upgrading means changing that line.</li></ul>'),
  tasks: [
    {
      t: L('ضيف <b>Title</b> و<b>Text</b> و<b>Image</b> في صفحة about', 'Add a <b>Title</b>, a <b>Text</b> and an <b>Image</b> to the about page'),
      why: L('كل واحد فيهم هيبقى node جديد جوه الصفحة بـ sling:resourceType مختلف.', 'Each becomes a new node in the page with a different sling:resourceType.'),
      hint: L('المربع "Drag components here" ← + ← اختار. وكرّر للتلاتة.', 'The "Drag components here" box → + → pick one. Repeat for all three.'),
      ok: () => F('insert:title') && F('insert:text') && F('insert:image'),
      guide: [
        openEditor('هنفتح صفحة about في الـ editor. (لو مش موجودة اعمل درس 1.4 الأول.)', 'We open the about page in the editor. (Missing? Do lesson 1.4 first.)'),
        step('frame:[data-drop]', 'دوس على المربع <b>Drag components here</b>.', 'Click the <b>Drag components here</b> box.', { at: '/editor.html' }),
        step('frame:#lab-tb [data-tb="insert"]', 'في الـ toolbar الصغير دوس <b>+</b> (Insert component).', 'In the small toolbar press <b>+</b> (Insert component).', { at: '/editor.html' }),
        step('.m-insert .ins ~ Title', 'اختار <b>Title</b>. بعد كده كرّر نفس الخطوات لـ <b>Text</b> و<b>Image</b>.', 'Choose <b>Title</b>. Then repeat the same steps for <b>Text</b> and <b>Image</b>.', { at: '/editor.html' }),
        step('frame:[data-drop]', 'تاني: دوس على المربع ← + ← <b>Text</b>.', 'Again: click the box → + → <b>Text</b>.', { at: '/editor.html', next: true }),
        step('frame:[data-drop]', 'ومرة كمان ← + ← <b>Image</b>.', 'Once more → + → <b>Image</b>.', { at: '/editor.html', next: true }),
      ],
    },
    {
      t: L('افتح الـ Title بـ 🔧 Configure واكتب عنوان', 'Open the Title with 🔧 Configure and type a heading'),
      why: L('اللي بتكتبه بيتحفظ property <code>jcr:title</code> على الـ node بتاع الـ Title.', 'What you type is saved as <code>jcr:title</code> on the Title node.'),
      ok: () => F('dialog:title'),
      guide: [
        openEditor('في الـ editor بتاع about.', 'In the about page editor.'),
        step('frame:[data-cmp*="/title"]', 'دوس على الـ <b>Title</b> عشان تختاره.', 'Click the <b>Title</b> to select it.', { at: '/editor.html' }),
        step('frame:#lab-tb [data-tb="cfg"]', 'دوس 🔧 <b>Configure</b>.', 'Press 🔧 <b>Configure</b>.', { at: '/editor.html' }),
        step('.modal [name="./jcr:title"]', 'اكتب العنوان في <b>Title</b>.', 'Type the heading in <b>Title</b>.', { at: '/editor.html', next: true }),
        step('.modal [data-modal=ok]', 'دوس ✔ عشان تحفظ.', 'Press ✔ to save.', { at: '/editor.html' }),
      ],
    },
    {
      t: L('اختار صورة للـ Image من تبويب <b>Assets</b>', 'Pick a picture for the Image from the <b>Assets</b> tab'),
      why: L('الـ Image بيخزن path الصورة في <code>fileReference</code>، يعني الصورة نفسها بتفضل في الـ DAM.', 'The Image stores the picture path in <code>fileReference</code>; the picture itself stays in the DAM.'),
      ok: () => F('image:asset') || F('dialog:image'),
      guide: [
        openEditor('في الـ editor بتاع about.', 'In the about page editor.'),
        step('frame:[data-cmp*="/image"]', 'اختار الـ <b>Image</b> component.', 'Select the <b>Image</b> component.', { at: '/editor.html' }),
        step('[data-act="spTab"][data-panel="assets"]', 'افتح تبويب <b>Assets</b> في الـ side panel (أول أيقونة).', 'Open the <b>Assets</b> tab in the side panel (first icon).', { at: '/editor.html' }),
        step('.sp-asset', 'دوس على أي صورة. (أو اسحبها على الـ Image).', 'Click any picture (or drag it onto the Image).', { at: '/editor.html' }),
      ],
    },
    {
      t: L('من الـ toolbar دوس <b>&lt;/&gt;</b> عشان تشوف الـ node في CRXDE', 'Press <b>&lt;/&gt;</b> in the toolbar to see the node in CRXDE'),
      why: L('هتشوف بعينك <code>sling:resourceType</code> والـ properties اللي الـ dialog كتبها.', 'You will see <code>sling:resourceType</code> and the properties the dialog wrote.'),
      ok: () => crxSeen(p => /\/jcr:content\/root\/container\/[^/]+$/.test(p)),
      guide: [
        openEditor('في الـ editor بتاع about.', 'In the about page editor.'),
        step('frame:[data-cmp*="/title"]', 'اختار الـ Title.', 'Select the Title.', { at: '/editor.html' }),
        step('frame:#lab-tb [data-tb="crx"]', 'دوس آخر زرار <b>&lt;/&gt;</b>. CRXDE هيفتح على الـ node.', 'Press the last button <b>&lt;/&gt;</b>. CRXDE opens on the node.', { at: '/editor.html' }),
      ],
    },
    {
      t: L('افتح الـ proxy <code>/apps/wknd/components/title</code> والـ dialog الأصلي في <code>/libs</code>', 'Open the proxy <code>/apps/wknd/components/title</code> and the real dialog in <code>/libs</code>'),
      ok: () => crxSeen(p => p === '/apps/wknd/components/title') && crxSeen(p => p.startsWith('/libs/core/wcm/components/title/v3/title')),
      guide: [
        step('.ct-row[data-path="/apps/wknd/components/title"] .ct-name', 'ده الـ proxy. بص على <code>sling:resourceSuperType</code> على اليمين.', 'This is the proxy. Look at <code>sling:resourceSuperType</code> on the right.', { at: '/crx/de', go: '/crx/de/index.jsp#/apps/wknd/components/title' }),
        step('.ct-row[data-path="/libs/core/wcm/components/title/v3/title/cq:dialog"] .ct-name', 'ودا الـ dialog الحقيقي في /libs: الـ proxy مالوش dialog، بيورثه من هنا.', 'This is the real dialog in /libs: the proxy has none, it inherits this one.', { at: '/crx/de', go: '/crx/de/index.jsp#/libs/core/wcm/components/title/v3/title/cq:dialog' }),
      ],
    },
  ],
  quiz: [
    { q: L('component في مشروعك مالوش HTL ولا dialog، بس بيشتغل. إزاي؟', 'A project component has no HTL or dialog but works. How?'), a: [L('بيورثهم من الـ Core Component عن طريق sling:resourceSuperType', 'It inherits them from a Core Component via sling:resourceSuperType'), L('AEM بيولّدهم أوتوماتيك', 'AEM generates them'), L('من الـ template', 'From the template')], c: 0, why: L('ده الـ proxy pattern.', 'That is the proxy pattern.') },
    { q: L('النص اللي كتبته في Title dialog متخزن فين؟', 'Where is the text typed in a Title dialog stored?'), a: [L('في /apps', 'In /apps'), L('property على node الـ component جوه الصفحة', 'A property on the component node inside the page'), L('في الـ template', 'In the template')], c: 1, why: L('المحتوى في /content، والكود في /apps.', 'Content is in /content; code is in /apps.') },
    { q: L('مش لاقي Button في قايمة Insert. السبب الأغلب؟', 'Button is missing from the Insert list. Most likely cause?'), a: [L('الـ policy بتاعة الـ container مش مسموح فيها', 'The container policy does not allow it'), L('الصفحة مقفولة', 'The page is locked'), L('محتاج restart', 'You need a restart')], c: 0, why: L('الـ allowed components بتتحدد في الـ policy (درس 3.2).', 'Allowed components come from the policy (lesson 3.2).') },
    { q: L('عايز تغيّر الـ HTML بتاع Title بس في مشروعك. الطريقة الصح؟', 'You want to change only the Title HTML in your project. The right way?'), a: [L('تعدّل title.html في /libs', 'Edit title.html in /libs'), L('تحط title.html في /apps/wknd/components/title', 'Add title.html in /apps/wknd/components/title'), L('تعمل template جديد', 'Make a new template')], c: 1, why: L('الملف في الـ proxy بيغطي على اللي في الـ super type، والباقي بيتورث عادي.', 'A file in the proxy overrides the super type\'s; the rest is still inherited.') },
  ],
});

lesson({
  id: 'editormodes', level: 2, num: '2.2', time: 30,
  title: L('Editor modes: Layout, Developer, Timewarp, Targeting', 'Editor modes: Layout, Developer, Timewarp, Targeting'),
  goal: L('هتستخدم كل modes الـ editor وتفهم كل واحد بيخزن إيه وفين.', 'You will use every editor mode and know what each stores and where.'),
  learn: L(`
<h4>القايمة اللي جنب Preview</h4>
<table class="ls-table">
<tr><th>Mode</th><th>بيعمل إيه</th><th>بيخزن فين</th></tr>
<tr><td><b>Edit</b></td><td>تضيف وتعدّل components</td><td>nodes جوه الصفحة</td></tr>
<tr><td><b>Layout</b></td><td>عرض كل component على grid من 12 column لكل شاشة</td><td><code>cq:responsive/default|tablet|phone</code></td></tr>
<tr><td><b>Developer</b></td><td>بيوريك الـ resource type والـ script والـ policy لكل component</td><td>مش بيخزن (قراية بس)</td></tr>
<tr><td><b>Timewarp</b></td><td>الصفحة زي ما كانت في تاريخ معيّن</td><td>بيقرا من الـ versions</td></tr>
<tr><td><b>Targeting</b></td><td>محتوى مختلف لكل audience</td><td><code>cq:experiences/&lt;segment&gt;</code></td></tr>
</table>
<h4>Layout mode والـ responsive grid</h4>
<p>كل container بيتقسم لـ <b>12 عمود</b>. لو خليت Text عرضه 6 والـ Image عرضه 6 هيبقوا جنب بعض. وتقدر تخلّيهم فوق بعض على الموبايل (12 لكل واحد)، أو تخفي component على شاشة معيّنة. الـ <b>Emulator</b> (أيقونة الشاشة) بيغيّر الجهاز: Desktop / Tablet / Phone، وكل واحد ليه <b>breakpoint</b> وإعدادات مستقلة.</p>
<pre class="ls-diagram">| Text  (6/12)        | Image (6/12)        |   ← desktop
| Text  (12/12)                             |   ← phone
| Image (12/12)                             |</pre>
<h4>Developer mode</h4>
<p>بيحل سؤال "الحتة دي جاية منين؟": اختار أي component هيقولك الـ <code>sling:resourceType</code>، والـ HTL script اللي بيتنفّذ فعلاً، وسلسلة الـ super types، والـ policy. وفيه tab <b>Errors</b> لو component مش لاقي script أو صورة مش موجودة.</p>
<h4>Timewarp</h4>
<p>بيرجع بالزمن ويعرض الصفحة من الـ <b>versions</b> بتاعتها. لو مفيش version قبل التاريخ اللي اخترته مش هيعرض حاجة. (الـ versions بتتعمل مع كل Publish أو بـ Save as Version — درس 4.1.)</p>
<h4>Targeting والـ audiences</h4>
<p>الـ <b>segment</b> (audience) هو وصف لمجموعة زوار: "زوار الصيف"، "زوار من الرياض"… بتعمل Target على component وتكتب له نسخة لكل audience. على الموقع، <b>ContextHub</b> بيحدد الزائر ينتمي لأنهي segment ويعرض النسخة المناسبة. في الـ lab الـ segments موسمية (Summer/Winter حسب الشهر)، زي اللي جاية مع الـ archetype.</p>`, `
<h4>The menu next to Preview</h4>
<table class="ls-table">
<tr><th>Mode</th><th>What it does</th><th>Stored where</th></tr>
<tr><td><b>Edit</b></td><td>Add and edit components</td><td>Nodes in the page</td></tr>
<tr><td><b>Layout</b></td><td>Width of each component on a 12-column grid, per screen</td><td><code>cq:responsive/default|tablet|phone</code></td></tr>
<tr><td><b>Developer</b></td><td>Shows resource type, script and policy per component</td><td>Read only</td></tr>
<tr><td><b>Timewarp</b></td><td>The page as it was on a date</td><td>Reads versions</td></tr>
<tr><td><b>Targeting</b></td><td>Different content per audience</td><td><code>cq:experiences/&lt;segment&gt;</code></td></tr>
</table>
<h4>Layout mode and the responsive grid</h4>
<p>Every container has <b>12 columns</b>. Make a Text 6 wide and an Image 6 wide and they sit side by side; on phones you can stack them (12 each) or hide one. The <b>Emulator</b> (screen icon) switches device — Desktop / Tablet / Phone — each with its own <b>breakpoint</b> settings.</p>
<pre class="ls-diagram">| Text  (6/12)        | Image (6/12)        |   ← desktop
| Text  (12/12)                             |   ← phone
| Image (12/12)                             |</pre>
<h4>Developer mode</h4>
<p>Answers "where does this come from?": select a component to see its <code>sling:resourceType</code>, the HTL script that actually runs, the super type chain and the policy. The <b>Errors</b> tab lists components without a script or with missing images.</p>
<h4>Timewarp</h4>
<p>Goes back in time using the page's <b>versions</b>. With no version before the chosen date it shows nothing. (Versions are created on publish or with Save as Version — lesson 4.1.)</p>
<h4>Targeting and audiences</h4>
<p>A <b>segment</b> (audience) describes a group of visitors: "summer visitors", "visitors from Riyadh"… You target a component and write a version per audience. On the site, <b>ContextHub</b> decides which segment a visitor is in and shows that version. In the lab the segments are seasonal (Summer/Winter by month), like the ones the archetype ships.</p>`),
  terms: [
    ['Breakpoint', L('عرض شاشة بيتغيّر عنده الـ layout (phone < 768، tablet < 1200).', 'A screen width where layout changes (phone < 768, tablet < 1200).')],
    ['cq:responsive', L('الـ node اللي بيخزن العرض والـ offset والـ hide لكل breakpoint.', 'Stores width, offset and hide per breakpoint.')],
    ['Segment / Audience', L('تعريف لمجموعة زوار بيستخدمه الـ Targeting.', 'A visitor group definition used by Targeting.')],
    ['ContextHub', L('الـ framework اللي بيحدد بيانات الزائر والـ segments في المتصفح.', 'The framework that resolves visitor data and segments in the browser.')],
  ],
  real: L('<ul><li>Layout mode من أكتر الحاجات اللي الـ authors بيحتاجوها، وبيوفّر إنك تعمل templates كتير.</li><li>Developer mode أول مكان تبص فيه لما component بيترسم غلط.</li><li>في المشاريع الكبيرة الـ Targeting غالباً بيتعمل بـ <b>Adobe Target</b> مع AEM، بس الفكرة واحدة.</li></ul>',
    '<ul><li>Layout mode is one of the features authors use most, and saves you from making many templates.</li><li>Developer mode is the first place to look when a component renders wrong.</li><li>Large projects often use <b>Adobe Target</b> with AEM for targeting, but the idea is the same.</li></ul>'),
  tasks: [
    { t: L('في <b>Layout</b> mode اختار component واسحب المقبض الأزرق لحد <b>6 / 12</b>', 'In <b>Layout</b> mode select a component and drag the blue handle to <b>6 / 12</b>'), hint: L('بعدها شوف <code>cq:responsive/default</code> تحت الـ component في CRXDE', 'Then look for <code>cq:responsive/default</code> under the component in CRXDE'), ok: () => F('layout:resize'), guide: [
      openEditor('افتح الـ editor بتاع about.', 'Open the about editor.'),
      modeMenu,
      step('.ed-bar [data-act="edMode"][data-mode="layout"]', 'اختار <b>Layout</b>.', 'Choose <b>Layout</b>.', { at: '/editor.html' }),
      step('frame:[data-cmp][data-del="1"]', 'دوس على أي component جوه الـ container (Title أو Text).', 'Click any component inside the container (Title or Text).', { at: '/editor.html' }),
      step('frame:.lab-rh.r', 'اسحب المقبض الأزرق اللي على اليمين لحد ما الرقم في الـ toolbar يبقى <b>6 / 12</b> وسيب الماوس.', 'Drag the blue handle on the right until the toolbar shows <b>6 / 12</b>, then release.', { at: '/editor.html', next: true }),
    ] },
    { t: L('في Layout: غيّر الـ Emulator لـ <b>Phone</b> واعمل <b>Hide component</b>، وبعدين <b>Unhide components</b> من الـ container', 'In Layout switch the Emulator to <b>Phone</b>, <b>Hide</b> a component, then <b>Unhide components</b> on the container'), ok: () => F('layout:hide') && F('layout:unhide'), guide: [
      step('[data-act="edDevice"][data-v="phone"]', 'دوس <b>Phone</b> في شريط الـ Emulator.', 'Press <b>Phone</b> in the Emulator strip (switch to Layout mode first if you do not see it).', { at: '/editor.html', go: EDIT_ABOUT }),
      step('frame:[data-cmp][data-del="1"]', 'اختار component.', 'Select a component.', { at: '/editor.html' }),
      step('frame:#lab-tb [data-tb="lhide"]', 'دوس <b>Hide component</b> (العين المشطوبة).', 'Press <b>Hide component</b> (crossed eye).', { at: '/editor.html' }),
      step('frame:#lab-tb [data-tb="lunhide"]', 'الـ container اتختار لوحده: دوس <b>Unhide components</b>.', 'The container is selected now: press <b>Unhide components</b>.', { at: '/editor.html' }),
    ] },
    { t: L('<b>Developer</b> mode: اختار component وشوف الـ Script والـ Super Types والـ Policy', '<b>Developer</b> mode: select a component and read its Script, Super Types and Policy'), ok: () => F('editor:dev:inspect'), guide: [
      modeMenu,
      step('.ed-bar [data-act="edMode"][data-mode="developer"]', 'اختار <b>Developer</b>.', 'Choose <b>Developer</b>.', { at: '/editor.html' }),
      step('frame:[data-cmp*="/title"]', 'دوس على الـ Title في الصفحة، وبص على اللوحة على الشمال.', 'Click the Title on the page and read the panel on the left.', { at: '/editor.html' }),
    ] },
    { t: L('<b>Timewarp</b>: اعمل version، عدّل الصفحة، وارجع بالزمن', '<b>Timewarp</b>: make a version, change the page, then go back in time'), hint: L('Sites ← اختار الصفحة ← Content Only ▾ ← Timeline ← Save as Version', 'Sites → select the page → Content Only ▾ → Timeline → Save as Version'), ok: () => F('editor:mode:timewarp') && Object.keys(S.versions).length > 0, guide: [
      step(`.ci[data-path="${ABOUT}"]`, 'في Sites دوس على <b>اسم</b> About (مش الصورة) عشان تفتحها.', 'In Sites click the <b>name</b> About (not the picture) to open it.', { at: '/sites.html/content/wknd/us/en', go: '/sites.html/content/wknd/us/en' }),
      step('summary[title="Toggle Side Panel"]', 'افتح قايمة <b>Content Only ▾</b> فوق على الشمال.', 'Open the <b>Content Only ▾</b> menu at the top left.', { at: '/sites.html' }),
      step('[data-act="railSet"][data-v="1"]', 'اختار <b>Timeline</b>.', 'Choose <b>Timeline</b>.', { at: '/sites.html' }),
      step('[data-act="verCreate"]', 'دوس <b>Save as Version</b> وبعدين Create.', 'Press <b>Save as Version</b>, then Create.', { at: '/sites.html' }),
      step(null, 'دلوقتي افتح about في الـ editor وغيّر أي نص، وبعدين من قايمة الـ mode اختار <b>Timewarp</b> وحط وقت قبل التعديل.', 'Now open about in the editor, change some text, then pick <b>Timewarp</b> in the mode menu and set a time before your change.', { at: '/editor.html', go: EDIT_ABOUT, next: true }),
    ] },
    { t: L('<b>Targeting</b>: اختار Text ← <b>Target</b> ← audience <b>Summer</b> ← عدّل النص', '<b>Targeting</b>: select a Text → <b>Target</b> → the <b>Summer</b> audience → change the text'), ok: () => F('target:experience'), guide: [
      modeMenu,
      step('.ed-bar [data-act="edMode"][data-mode="targeting"]', 'اختار <b>Targeting</b>.', 'Choose <b>Targeting</b>.', { at: '/editor.html' }),
      step('frame:[data-cmp*="/text"]', 'دوس على component <b>Text</b>.', 'Click a <b>Text</b> component.', { at: '/editor.html' }),
      step('frame:#lab-tb [data-tb="target"]', 'دوس <b>Target</b>.', 'Press <b>Target</b>.', { at: '/editor.html' }),
      step('[data-act="edAud"][data-v="summer"]', 'اختار audience <b>Summer</b> من الشريط اللي فوق الصفحة.', 'Pick the <b>Summer</b> audience in the strip above the page.', { at: '/editor.html' }),
      step('frame:[data-cmp*="/text"]', 'دوس على الـ Text تاني.', 'Click the Text again.', { at: '/editor.html' }),
      step('frame:#lab-tb [data-tb="cfg"]', 'دوس 🔧 واكتب نص الصيف واحفظ.', 'Press 🔧, write the summer text and save.', { at: '/editor.html' }),
    ] },
    { t: L('من <b>Preview</b> غيّر الـ ContextHub segment لـ Summer وشوف الفرق', 'In <b>Preview</b> switch the ContextHub segment to Summer and see the difference'), ok: () => F('target:simulate'), guide: [
      step('.ed-bar [data-act="edMode"][data-mode="preview"]', 'دوس <b>Preview</b>.', 'Press <b>Preview</b>.', { at: '/editor.html', go: EDIT_ABOUT }),
      step('[data-act="edCtxAud"][data-v="summer"]', 'اختار <b>Summer</b> في شريط ContextHub.', 'Choose <b>Summer</b> in the ContextHub strip.', { at: '/editor.html' }),
    ] },
  ],
  quiz: [
    { q: L('Text عرضه 4 و Image عرضها 8 على desktop. هيظهروا إزاي؟', 'Text width 4 and Image width 8 on desktop. Result?'), a: [L('جنب بعض', 'Side by side'), L('فوق بعض', 'Stacked'), L('الـ Image بس', 'Only the image')], c: 0, why: L('4 + 8 = 12، يعني سطر واحد.', '4 + 8 = 12, one row.') },
    { q: L('خفيت component على Phone. هيختفي على Desktop كمان؟', 'You hid a component on Phone. Is it hidden on Desktop too?'), a: [L('أيوه', 'Yes'), L('لأ، كل breakpoint مستقل', 'No, each breakpoint is separate'), L('بس في الـ Preview', 'Only in Preview')], c: 1, why: L('اتخزن في <code>cq:responsive/phone</code> بس.', 'It is stored only in <code>cq:responsive/phone</code>.') },
    { q: L('Timewarp مش بيعرض حاجة. أغلب سبب؟', 'Timewarp shows nothing. Most likely?'), a: [L('مفيش version قبل التاريخ ده', 'No version exists before that date'), L('الصفحة مقفولة', 'The page is locked'), L('الـ Publish واقف', 'Publish is down')], c: 0, why: L('Timewarp بيقرا من الـ versions بس.', 'Timewarp reads versions only.') },
    { q: L('مين اللي بيحدد الزائر ينتمي لأنهي audience على الموقع؟', 'Who decides which audience a visitor belongs to on the site?'), a: [L('الـ Dispatcher', 'The Dispatcher'), L('ContextHub (segments)', 'ContextHub (segments)'), L('الـ author', 'The author')], c: 1, why: L('ContextHub بيقيّم الـ segments على بيانات الزائر.', 'ContextHub evaluates segments on visitor data.') },
  ],
});

lesson({
  id: 'assets', level: 2, num: '2.3', time: 20,
  title: L('Assets (DAM)', 'Assets (DAM)'),
  goal: L('هترفع صورة، تعدّل الـ metadata بتاعتها، تستخدمها في صفحة، وتنشرها.', 'You will upload an image, edit its metadata, use it on a page and publish it.'),
  learn: L(`
<h4>الـ DAM</h4>
<p><b>Digital Asset Management</b> هو المكتبة المركزية لكل الصور والفيديوهات والـ PDFs. مكانه <code>/content/dam</code>. الصفحات مش بتنسخ الصورة؛ بتشاور عليها بالـ path، فلو حدّثت الصورة في الـ DAM بتتحدث في كل الصفحات.</p>
<h4>الـ asset من جوه</h4>
<pre class="ls-diagram">/content/dam/wknd/en/desert.svg        (dam:Asset)
└── jcr:content
    ├── metadata         dc:title, dc:description, tags…
    └── renditions
        ├── original     ← الملف الأصلي
        ├── cq5dam.thumbnail.140.100.png
        └── cq5dam.web.1280.1280.jpeg</pre>
<p>لما ترفع صورة، workflow اسمه <b>DAM Update Asset</b> بيشتغل لوحده: بيستخرج الـ metadata ويعمل <b>renditions</b> (نسخ بمقاسات مختلفة) للـ thumbnails وللويب.</p>
<h4>Metadata</h4>
<p>Title، Description، Tags، Copyright… بتتحفظ على <code>jcr:content/metadata</code> بأسماء زي <code>dc:title</code> (Dublin Core). الـ metadata مهمة للبحث وللـ alt text وللـ SEO.</p>
<h4>النشر والـ references</h4>
<p>لو نشرت صفحة فيها صورة مش منشورة، AEM بيعرض عليك تنشر الصورة معاها (references). ولو حاولت تمسح صورة مستخدمة، بيحذّرك.</p>`, `
<h4>The DAM</h4>
<p><b>Digital Asset Management</b> is the central library of images, videos and PDFs, under <code>/content/dam</code>. Pages don't copy a picture; they point at its path, so updating it in the DAM updates every page.</p>
<h4>An asset inside</h4>
<pre class="ls-diagram">/content/dam/wknd/en/desert.svg        (dam:Asset)
└── jcr:content
    ├── metadata         dc:title, dc:description, tags…
    └── renditions
        ├── original     ← the uploaded file
        ├── cq5dam.thumbnail.140.100.png
        └── cq5dam.web.1280.1280.jpeg</pre>
<p>On upload, the <b>DAM Update Asset</b> workflow runs automatically: it extracts metadata and creates <b>renditions</b> (resized copies) for thumbnails and the web.</p>
<h4>Metadata</h4>
<p>Title, Description, Tags, Copyright… saved on <code>jcr:content/metadata</code> with names like <code>dc:title</code> (Dublin Core). Metadata drives search, alt text and SEO.</p>
<h4>Publishing and references</h4>
<p>Publishing a page that uses an unpublished image offers to publish the image too (references). Deleting an image that is in use shows a warning.</p>`),
  terms: [
    ['dam:Asset', L('نوع الـ node بتاع أي ملف في الـ DAM.', 'Node type of every DAM file.')],
    ['Rendition', L('نسخة من الصورة بمقاس أو format مختلف.', 'A copy of the asset in another size or format.')],
    ['fileReference', L('الـ property اللي الـ Image component بيخزن فيها path الصورة.', 'The property where the Image component stores the asset path.')],
  ],
  real: L('<ul><li>في AEM as a Cloud Service الـ renditions بتتعمل بـ <b>Asset Microservices</b> في الـ cloud بدل الـ workflow.</li><li>نظّم الـ DAM بفولدرات واضحة (موقع ← لغة ← قسم) وحط metadata من الأول، لأن الـ DAM بيكبر بسرعة جداً.</li><li>Dynamic Media (Scene7) بيقدم الصور بمقاسات وجودة أوتوماتيك حسب الجهاز.</li></ul>',
    '<ul><li>AEM as a Cloud Service creates renditions with <b>Asset Microservices</b> instead of the workflow.</li><li>Organise the DAM in clear folders (site → language → section) and add metadata early — it grows fast.</li><li>Dynamic Media (Scene7) serves images resized and optimised per device.</li></ul>'),
  tasks: [
    { t: L('ارفع صورة في <code>/content/dam/wknd/en</code>', 'Upload an image to <code>/content/dam/wknd/en</code>'), ok: () => F('asset:uploaded'), guide: [
      step('.titlebar summary.btn.primary ~ Create', 'دوس <b>Create</b>.', 'Press <b>Create</b>.', { at: '/assets.html/content/dam/wknd/en', go: '/assets.html/content/dam/wknd/en' }),
      step('[data-act="assetUpload"]', 'اختار <b>Files</b>.', 'Choose <b>Files</b>.', { at: '/assets.html' }),
      step('.modal input[name=title]', 'اكتب Title (مثلاً <code>Camel trek</code>). وسيب "Generate a sample image" أو ارفع صورة من جهازك.', 'Type a Title (e.g. <code>Camel trek</code>). Keep "Generate a sample image" or upload one from your computer.', { at: '/assets.html', next: true }),
      step('.modal [data-modal=ok]', 'دوس <b>Upload</b>.', 'Press <b>Upload</b>.', { at: '/assets.html' }),
    ] },
    { t: L('عدّل الـ metadata: Title و Description', 'Edit the metadata: Title and Description'), ok: () => F('asset:props'), guide: [
      step('.acard[data-act="assetSel"]', 'دوس على كارت الصورة عشان تختارها.', 'Click the image card to select it.', { at: '/assets.html/content/dam/wknd/en', go: '/assets.html/content/dam/wknd/en' }),
      step('.selbar [data-act="assetProps"]', 'دوس <b>Properties</b>.', 'Press <b>Properties</b>.', { at: '/assets.html' }),
      step('.modal textarea[name=desc]', 'اكتب Description.', 'Write a Description.', { at: '/assets.html', next: true }),
      step('.modal [data-modal=ok]', 'دوس <b>Save &amp; Close</b>.', 'Press <b>Save &amp; Close</b>.', { at: '/assets.html' }),
    ] },
    { t: L('شوف الـ metadata والـ renditions في CRXDE', 'See the metadata and renditions in CRXDE'), ok: () => crxSeen(p => /^\/content\/dam\/.+\/jcr:content\/(metadata|renditions)/.test(p)), guide: [
      step('.ct-row[data-path="/content/dam/wknd/en/desert.svg/jcr:content/metadata"] .ct-name', 'دوس على <b>metadata</b>: هتلاقي <code>dc:title</code>.', 'Click <b>metadata</b>: you will find <code>dc:title</code>.', { at: '/crx/de', go: '/crx/de/index.jsp#/content/dam/wknd/en/desert.svg/jcr:content/metadata' }),
    ] },
    { t: L('استخدم صورة في صفحة about (Image + Assets)', 'Use an image on the about page (Image + Assets)'), ok: () => F('image:asset'), guide: [
      openEditor('افتح about في الـ editor.', 'Open about in the editor.'),
      step('[data-act="spTab"][data-panel="assets"]', 'افتح تبويب <b>Assets</b>.', 'Open the <b>Assets</b> tab.', { at: '/editor.html' }),
      step('.sp-asset', 'اسحب صورة على الصفحة، أو اختار Image component ودوس على صورة.', 'Drag a picture onto the page, or select an Image component and click a picture.', { at: '/editor.html', next: true }),
    ] },
    { t: L('اعمل <b>Quick Publish</b> للصورة', '<b>Quick Publish</b> the image'), ok: () => F('asset:published'), guide: [
      step('.acard[data-act="assetSel"]', 'اختار الصورة.', 'Select the image.', { at: '/assets.html/content/dam/wknd/en', go: '/assets.html/content/dam/wknd/en' }),
      step('.selbar [data-act="assetPublish"]', 'دوس <b>Quick Publish</b>.', 'Press <b>Quick Publish</b>.', { at: '/assets.html' }),
    ] },
  ],
  quiz: [
    { q: L('عدّلت صورة في الـ DAM. الصفحات اللي بتستخدمها؟', 'You updated an image in the DAM. Pages that use it…'), a: [L('محتاجة تتعدّل يدوي', 'must be edited by hand'), L('بتشاور على نفس الـ path فبتاخد التحديث (بعد النشر)', 'point to the same path, so they get the update (once published)'), L('بتتمسح', 'are deleted')], c: 1, why: L('الصفحة بتخزن <code>fileReference</code> مش نسخة من الصورة.', 'Pages store a <code>fileReference</code>, not a copy.') },
    { q: L('الـ thumbnails اللي في الـ console جاية منين؟', 'Where do console thumbnails come from?'), a: [L('renditions بيعملها DAM Update Asset', 'Renditions made by DAM Update Asset'), L('الـ browser بيصغّرها', 'The browser shrinks them'), L('الـ Dispatcher', 'The Dispatcher')], c: 0, why: L('الـ workflow بيعمل renditions بمقاسات مختلفة.', 'The workflow creates resized renditions.') },
    { q: L('Title الصورة متخزن فين؟', 'Where is the image title stored?'), a: [L('<code>jcr:content/metadata/dc:title</code>', '<code>jcr:content/metadata/dc:title</code>'), L('في اسم الملف', 'In the file name'), L('<code>jcr:content/jcr:title</code>', '<code>jcr:content/jcr:title</code>')], c: 0, why: L('الـ metadata بأسماء Dublin Core تحت metadata.', 'Metadata uses Dublin Core names under metadata.') },
  ],
});

lesson({
  id: 'xf', level: 2, num: '2.4', time: 25,
  title: L('Experience Fragments', 'Experience Fragments'),
  goal: L('هتعمل جزء بيتكرر مرة واحدة وتستخدمه في صفحات كتير، وتحدّثه من مكان واحد.', 'You will build a reusable part once, use it on many pages, and update it from one place.'),
  learn: L(`
<h4>المشكلة</h4>
<p>الـ header والـ footer وبانر "عرض الصيف" بيتكرروا في عشرات الصفحات. لو كل صفحة فيها نسخة، أي تعديل يبقى كابوس.</p>
<h4>الحل: Experience Fragment (XF)</h4>
<p>الـ <b>XF</b> صفحة صغيرة مستقلة (مجموعة components) تحت <code>/content/experience-fragments</code>. الصفحات بتحطه بـ component اسمه <b>Experience Fragment</b> بيشاور على الـ path بتاعه (<code>fragmentVariationPath</code>). عدّل الـ XF مرة، وكل الصفحات تتحدّث.</p>
<pre class="ls-diagram">/content/experience-fragments/wknd/promo         (XF)
├── master            ← الـ variation الأساسية (web)
└── facebook          ← variation تانية لنفس المحتوى
صفحة about:  experiencefragment → fragmentVariationPath = …/promo/master</pre>
<h4>Variations</h4>
<p>كل XF ليه <b>variations</b>: نسخ لنفس الفكرة لقنوات مختلفة (web، email، social، أو لغة). أول واحدة اسمها <b>master</b>.</p>
<h4>النشر</h4>
<p>الـ XF بيتنشر لوحده. الصفحة مش محتاجة تتنشر تاني لما الـ XF يتغيّر، لأنها بتشاور عليه بس.</p>
<h4>XF ولا Content Fragment؟</h4>
<ul><li><b>XF</b> = محتوى + شكل (components جاهزة للعرض). للـ header/footer/banners.</li>
<li><b>Content Fragment</b> = بيانات بس من غير شكل. للـ headless (درس 2.5).</li></ul>`, `
<h4>The problem</h4>
<p>Headers, footers and a "summer offer" banner repeat across dozens of pages. A copy per page makes every change a nightmare.</p>
<h4>The fix: Experience Fragment (XF)</h4>
<p>An <b>XF</b> is a small standalone page (a group of components) under <code>/content/experience-fragments</code>. Pages include it with the <b>Experience Fragment</b> component pointing at its path (<code>fragmentVariationPath</code>). Edit the XF once and every page updates.</p>
<pre class="ls-diagram">/content/experience-fragments/wknd/promo         (XF)
├── master            ← the main (web) variation
└── facebook          ← another variation of the same content
about page:  experiencefragment → fragmentVariationPath = …/promo/master</pre>
<h4>Variations</h4>
<p>Each XF has <b>variations</b>: versions of the same idea for different channels (web, email, social, or a language). The first is <b>master</b>.</p>
<h4>Publishing</h4>
<p>The XF is published on its own. Pages don't need republishing when it changes — they just point at it.</p>
<h4>XF or Content Fragment?</h4>
<ul><li><b>XF</b> = content + presentation (render-ready components). For headers, footers, banners.</li>
<li><b>Content Fragment</b> = data only, no presentation. For headless (lesson 2.5).</li></ul>`),
  terms: [
    ['fragmentVariationPath', L('الـ property اللي بتربط الصفحة بالـ XF variation.', 'Property linking a page to an XF variation.')],
    ['Variation', L('نسخة من الـ XF لقناة أو استخدام معيّن.', 'A version of the XF for a channel or use.')],
  ],
  real: L('<ul><li>في مشروع WKND الحقيقي الـ header والـ footer XFs في <code>/content/experience-fragments/wknd/us/en/site</code>، والـ template بيحطهم في الـ structure.</li><li>الـ XF ممكن يتصدّر لـ <b>Adobe Target</b> كـ offer للـ personalization.</li></ul>',
    '<ul><li>In the real WKND project, the header and footer XFs are in <code>/content/experience-fragments/wknd/us/en/site</code>, placed by the template structure.</li><li>XFs can be exported to <b>Adobe Target</b> as offers for personalization.</li></ul>'),
  tasks: [
    { t: L('افتح <b>Experience Fragments</b>', 'Open <b>Experience Fragments</b>'), ok: () => F('visit:xf'), guide: [step('.nav-tile ~ Experience Fragments', 'من صفحة البداية دوس <b>Experience Fragments</b>.', 'On the start page click <b>Experience Fragments</b>.', { at: '/aem/start.html' })] },
    { t: L('افتح <b>Summer Promo ← master</b> في الـ editor', 'Open <b>Summer Promo → master</b> in the editor'), ok: () => !!S.events['editor:' + PROMO], guide: [
      step('.ci[data-path="/content/experience-fragments/wknd"]', 'دوس <b>WKND Sites Project</b>.', 'Click <b>WKND Sites Project</b>.', { at: '/aem/experience-fragments.html', go: XF_URL }),
      step('.ci[data-path="/content/experience-fragments/wknd/promo"]', 'دوس <b>Summer Promo</b>.', 'Click <b>Summer Promo</b>.', { at: '/aem/experience-fragments.html' }),
      step(`.ci-thumb[data-path="${PROMO}"]`, 'اختار <b>master</b> من الـ thumbnail.', 'Select <b>master</b> by its thumbnail.', { at: '/aem/experience-fragments.html' }),
      step('.selbar [data-act="pageEdit"]', 'دوس <b>Edit</b>.', 'Press <b>Edit</b>.', { at: '/aem/experience-fragments.html' }),
    ] },
    { t: L('في about: ضيف component <b>Experience Fragment</b> واختار <code>…/promo/master</code>', 'On about add an <b>Experience Fragment</b> component pointing at <code>…/promo/master</code>'), ok: () => JCR.find(AR(), '/content/wknd', n => n.props['sling:resourceType'] === 'wknd/components/experiencefragment' && !!n.props.fragmentVariationPath).length > 0, guide: [
      openEditor('افتح about في الـ editor.', 'Open about in the editor.'),
      step('frame:[data-drop]', 'دوس على <b>Drag components here</b>.', 'Click <b>Drag components here</b>.', { at: '/editor.html' }),
      step('frame:#lab-tb [data-tb="insert"]', 'دوس <b>+</b>.', 'Press <b>+</b>.', { at: '/editor.html' }),
      step('.m-insert .ins ~ Experience Fragment', 'اختار <b>Experience Fragment</b>.', 'Choose <b>Experience Fragment</b>.', { at: '/editor.html' }),
      step('frame:#lab-tb [data-tb="cfg"]', 'دوس 🔧 Configure.', 'Press 🔧 Configure.', { at: '/editor.html' }),
      step('.modal [name="./fragmentVariationPath"]', 'في <b>Variation</b> حط <code>/content/experience-fragments/wknd/promo/master</code>.', 'Set <b>Variation</b> to <code>/content/experience-fragments/wknd/promo/master</code>.', { at: '/editor.html', next: true }),
      step('.modal [data-modal=ok]', 'احفظ ✔: البانر هيظهر في الصفحة.', 'Save ✔: the banner appears on the page.', { at: '/editor.html' }),
    ] },
    { t: L('عدّل عنوان الـ promo جوه الـ XF، وارجع للصفحة: اتغيّر لوحده', 'Change the promo title inside the XF and go back to the page: it changed by itself'), ok: () => promoTitle(AR()) && promoTitle(AR()) !== 'Book your summer adventure', guide: [
      step('frame:[data-cmp$="/root/title"]', 'في الـ XF editor اختار الـ Title.', 'In the XF editor select the Title.', { at: '/editor.html' + PROMO, go: '/editor.html' + PROMO + '.html', prep: editMode }),
      step('frame:#lab-tb [data-tb="cfg"]', 'دوس 🔧.', 'Press 🔧.', { at: '/editor.html' + PROMO }),
      step('.modal [name="./jcr:title"]', 'اكتب عنوان جديد للـ promo.', 'Type a new promo title.', { at: '/editor.html' + PROMO, next: true }),
      step('.modal [data-modal=ok]', 'احفظ ✔، وبعدين افتح صفحة about: العنوان اتغيّر هناك كمان.', 'Save ✔, then open the about page: the title changed there too.', { at: '/editor.html' + PROMO }),
    ] },
    { t: L('<b>Publish</b> للـ XF وشوف الصفحة على Publish', '<b>Publish</b> the XF and view the page on Publish'), hint: L('الصفحة نفسها مش محتاجة publish تاني', 'The page itself does not need republishing'), ok: () => promoTitle(PR()) && promoTitle(PR()) === promoTitle(AR()) && promoTitle(PR()) !== 'Book your summer adventure', guide: [
      step(`.ci-thumb[data-path="${PROMO}"]`, 'اختار <b>master</b>.', 'Select <b>master</b>.', { at: '/aem/experience-fragments.html', go: '/aem/experience-fragments.html/content/experience-fragments/wknd/promo' }),
      step('.selbar summary ~ Manage Publication', 'افتح <b>Manage Publication</b>.', 'Open <b>Manage Publication</b>.', { at: '/aem/experience-fragments.html' }),
      step('[data-act="pagePublish"]', 'اختار <b>Quick Publish</b>.', 'Choose <b>Quick Publish</b>.', { at: '/aem/experience-fragments.html' }),
    ] },
    { t: L('اعمل XF جديد بتاعك', 'Create your own XF'), ok: () => F('xf:created'), guide: [
      step('.titlebar summary.btn.primary', 'دوس <b>Create</b>.', 'Press <b>Create</b>.', { at: '/aem/experience-fragments.html/content/experience-fragments/wknd', go: '/aem/experience-fragments.html/content/experience-fragments/wknd' }),
      step('.create-menu [data-act="xfCreate"]', 'اختار <b>Experience Fragment</b>.', 'Choose <b>Experience Fragment</b>.', { at: '/aem/experience-fragments.html' }),
      step('.modal input[name=title]', 'اكتب Title (مثلاً <code>Ramadan Banner</code>).', 'Type a Title (e.g. <code>Ramadan Banner</code>).', { at: '/aem/experience-fragments.html', next: true }),
      step('.modal [data-modal=ok]', 'دوس <b>Create</b>.', 'Press <b>Create</b>.', { at: '/aem/experience-fragments.html' }),
    ] },
  ],
  quiz: [
    { q: L('عدّلت XF ونشرته. الصفحات اللي بتستخدمه على Publish؟', 'You changed and published an XF. Pages using it on Publish…'), a: [L('محتاجة publish', 'need republishing'), L('بتعرض النسخة الجديدة', 'show the new version'), L('بتتكسر', 'break')], c: 1, why: L('الصفحة بتشاور على الـ XF، فبتعرض آخر نسخة منشورة منه.', 'The page points at the XF and shows its latest published version.') },
    { q: L('عايز نفس البانر بشكل مختلف للـ email. تعمل إيه؟', 'You need the same banner shaped for email. What do you do?'), a: [L('XF جديد', 'A new XF'), L('variation جديدة في نفس الـ XF', 'A new variation in the same XF'), L('Content Fragment', 'A Content Fragment')], c: 1, why: L('الـ variations معمولة لنفس المحتوى بأشكال مختلفة.', 'Variations are the same content in different shapes.') },
    { q: L('الفرق الأساسي بين XF و Content Fragment؟', 'Main difference between an XF and a Content Fragment?'), a: [L('XF فيه شكل (components)، الـ CF بيانات بس', 'An XF has presentation (components); a CF is data only'), L('مفيش فرق', 'None'), L('الـ CF للصور بس', 'CFs are for images only')], c: 0, why: L('ده سؤال interview مشهور جداً.', 'A very common interview question.') },
  ],
});

lesson({
  id: 'cf', level: 2, num: '2.5', time: 35,
  title: L('Content Fragments & GraphQL', 'Content Fragments & GraphQL'),
  goal: L('هتعمل model و fragments، وتقراهم بـ GraphQL، وتنشر persisted query يقدر Next.js يستخدمه.', 'You will build a model and fragments, read them with GraphQL, and publish a persisted query a Next.js app can call.'),
  learn: L(`
<h4>Headless</h4>
<p>في الـ <b>headless</b> AEM بيخزن المحتوى بس، والعرض بيعمله تطبيق تاني (Next.js، موبايل…) بيطلب البيانات كـ JSON. ده بالظبط اللي مشروع الـ roadmap محتاجه.</p>
<h4>Content Fragment Model (الشكل)</h4>
<p>الـ <b>model</b> بيحدد الـ fields: مثلاً model <b>Adventure</b> فيه title (text)، description (multi line)، price (number)، primaryImage (content reference). مكانه <code>/conf/wknd/settings/dam/cfm/models</code>. ده زي الـ "schema" أو الـ "template" بتاع البيانات.</p>
<h4>Content Fragment (البيانات)</h4>
<p>الـ <b>fragment</b> بيتعمل من model ويتخزن في الـ DAM زي أي asset: <code>/content/dam/wknd/en/adventures/desert-camping</code>. والـ fields بتاعته properties.</p>
<h4>GraphQL</h4>
<p>كل model بيعمل GraphQL type أوتوماتيك. تطلب بس الـ fields اللي محتاجها:</p>
<pre class="ls-diagram">{
  adventureList {
    items { title  price  primaryImage { ... on ImageRef { _path } } }
  }
}</pre>
<h4>Persisted queries</h4>
<p>بدل ما الـ frontend يبعت الـ query كل مرة (POST مش بيتعمله cache)، بتحفظ الـ query على السيرفر باسم، ويبقى ليه URL ثابت <b>GET</b>:</p>
<pre class="ls-diagram">/graphql/execute.json/wknd/adventures-all
→ الـ Dispatcher والـ CDN يقدروا يعملوله cache = موقع أسرع بكتير</pre>
<p>ولازم تنشر الـ query والـ fragments والـ model عشان يشتغلوا على الـ Publish.</p>`, `
<h4>Headless</h4>
<p>In <b>headless</b> mode AEM only stores content; another app (Next.js, mobile…) renders it by requesting JSON. Exactly what the roadmap project needs.</p>
<h4>Content Fragment Model (the shape)</h4>
<p>A <b>model</b> defines fields — e.g. <b>Adventure</b>: title (text), description (multi line), price (number), primaryImage (content reference). Stored under <code>/conf/wknd/settings/dam/cfm/models</code>. It is the data "schema".</p>
<h4>Content Fragment (the data)</h4>
<p>A <b>fragment</b> is made from a model and stored in the DAM like an asset: <code>/content/dam/wknd/en/adventures/desert-camping</code>; its fields are properties.</p>
<h4>GraphQL</h4>
<p>Each model becomes a GraphQL type automatically. You ask only for the fields you need:</p>
<pre class="ls-diagram">{
  adventureList {
    items { title  price  primaryImage { ... on ImageRef { _path } } }
  }
}</pre>
<h4>Persisted queries</h4>
<p>Instead of the front end POSTing the query each time (POST isn't cached), you save it on the server by name and get a fixed <b>GET</b> URL:</p>
<pre class="ls-diagram">/graphql/execute.json/wknd/adventures-all
→ the Dispatcher and CDN can cache it = a much faster site</pre>
<p>Publish the query, the fragments and the model so they work on Publish.</p>`),
  terms: [
    ['Headless', L('AEM بيقدم المحتوى كـ API، والعرض في تطبيق تاني.', 'AEM serves content as an API; another app renders it.')],
    ['CF Model', L('تعريف الـ fields بتاعة نوع fragment.', 'Field definition for a kind of fragment.')],
    ['Persisted query', L('GraphQL query متسجل على السيرفر وليه GET URL ثابت.', 'A GraphQL query saved on the server with a fixed GET URL.')],
    ['xxxList / xxxByPath', L('الـ queries اللي AEM بيولّدها لكل model.', 'The queries AEM generates for every model.')],
  ],
  real: L('<ul><li>في الـ Next.js: <code>fetch(\'https://publish…/graphql/execute.json/wknd/adventures-all\')</code> وبعدين تعرض النتيجة. ومحتاج <b>CORS</b> config على AEM عشان المتصفح يسمح بالطلب.</li><li>استخدم دايماً persisted queries في الـ production، مش POST.</li><li>صمّم الـ models بعناية من الأول: تغيير field مستخدم بعدين صعب.</li></ul>',
    '<ul><li>In Next.js: <code>fetch(\'https://publish…/graphql/execute.json/wknd/adventures-all\')</code> then render the result. AEM needs a <b>CORS</b> config so the browser allows the call.</li><li>Always use persisted queries in production, not POST.</li><li>Design models carefully upfront: changing a field in use is hard later.</li></ul>'),
  tasks: [
    { t: L('افتح Tools ← Assets ← <b>Content Fragment Models</b>', 'Open Tools → Assets → <b>Content Fragment Models</b>'), ok: () => F('visit:cfm'), guide: [
      step('.tool-cats [data-cat="Assets"]', 'في Tools اختار <b>Assets</b>.', 'In Tools choose <b>Assets</b>.', { at: '/aem/tools.html', go: '/aem/tools.html' }),
      step('.tool-card ~ Content Fragment Models', 'دوس <b>Content Fragment Models</b>.', 'Click <b>Content Fragment Models</b>.', { at: '/aem/tools.html' }),
    ] },
    { t: L('افتح model <b>Adventure</b> وضيف field (مثلاً Number اسمه <code>groupSize</code>)', 'Open the <b>Adventure</b> model and add a field (e.g. Number <code>groupSize</code>)'), ok: () => F('cfm:field'), guide: [
      step('.acard[data-act="cfmSel"]', 'اختار model <b>Adventure</b>.', 'Select the <b>Adventure</b> model.', { at: CFM_URL, go: CFM_URL }),
      step('.selbar [data-act="cfmOpen"]', 'دوس <b>Edit</b>.', 'Press <b>Edit</b>.', { at: CFM_URL }),
      step('.cfm-type ~ Number', 'دوس <b>Number</b> في Data Types على اليمين.', 'Click <b>Number</b> in Data Types on the right.', { at: '/mnt/overlay/dam/cfm/models/editor' }),
      step('.modal input[name=fieldLabel]', 'اكتب Field Label: <code>Group Size</code> (الـ Property Name هيبقى <code>groupSize</code>).', 'Field Label <code>Group Size</code> (the Property Name becomes <code>groupSize</code>).', { at: '/mnt/overlay/dam/cfm/models/editor', next: true }),
      step('.modal [data-modal=ok]', 'احفظ.', 'Save.', { at: '/mnt/overlay/dam/cfm/models/editor' }),
    ] },
    { t: L('Assets ← Adventures ← Create ← <b>Content Fragment</b>، واملاه واحفظ', 'Assets → Adventures → Create → <b>Content Fragment</b>, fill it and save'), ok: () => F('cf:created') && F('cf:saved'), guide: [
      step('.titlebar summary.btn.primary ~ Create', 'دوس <b>Create</b>.', 'Press <b>Create</b>.', { at: '/assets.html/content/dam/wknd/en/adventures', go: '/assets.html/content/dam/wknd/en/adventures' }),
      step('[data-act="cfCreate"]', 'اختار <b>Content Fragment</b>.', 'Choose <b>Content Fragment</b>.', { at: '/assets.html' }),
      step('.modal input[name=title]', 'سيب model <b>Adventure</b> واكتب Title (مثلاً <code>Diriyah Night Walk</code>).', 'Keep the <b>Adventure</b> model and type a Title (e.g. <code>Diriyah Night Walk</code>).', { at: '/assets.html', next: true }),
      step('.modal [data-modal=ok]', 'دوس <b>Create</b>: هيفتح محرر الـ fragment.', 'Press <b>Create</b>: the fragment editor opens.', { at: '/assets.html' }),
      step('[data-act="cfSave"]', 'املا الـ fields (اللي عليها * مطلوبة) ودوس <b>Save</b>.', 'Fill the fields (the ones marked * are required) and press <b>Save</b>.', { at: /^\/editor\.html\/content\/dam\// }),
    ] },
    { t: L('Tools ← General ← <b>GraphQL Query Editor</b> ← <b>Run</b>', 'Tools → General → <b>GraphQL Query Editor</b> → <b>Run</b>'), ok: () => F('gql:ok'), guide: [step('[data-act="gqlRun"]', 'دوس <b>Run</b> وبص على النتيجة على اليمين.', 'Press <b>Run</b> and read the result on the right.', { at: GRAPHIQL_URL, go: GRAPHIQL_URL })] },
    { t: L('<b>Save As</b>: احفظها persisted query', '<b>Save As</b>: save it as a persisted query'), ok: () => F('gql:persisted'), guide: [
      step('[data-act="gqlSave"]', 'دوس <b>Save As</b>.', 'Press <b>Save As</b>.', { at: GRAPHIQL_URL, go: GRAPHIQL_URL }),
      step('.modal input[name=name]', 'اكتب اسم (مثلاً <code>adventures-all</code>): هيبقى جزء من الـ URL.', 'Type a name (e.g. <code>adventures-all</code>): it becomes part of the URL.', { at: GRAPHIQL_URL, next: true }),
      step('.modal [data-modal=ok]', 'دوس <b>Save</b>.', 'Press <b>Save</b>.', { at: GRAPHIQL_URL }),
    ] },
    { t: L('<b>Publish</b> للـ query وافتح <code>/graphql/execute.json/wknd/&lt;name&gt;</code> على Publish', '<b>Publish</b> the query and open <code>/graphql/execute.json/wknd/&lt;name&gt;</code> on Publish'), ok: () => F('gql:url:publish'), guide: [
      step('[data-act="gqlPublish"]', 'في قايمة Persisted Queries دوس <b>Publish</b> جنب الـ query بتاعتك.', 'In the Persisted Queries list press <b>Publish</b> next to your query.', { at: '/aem/graphiql.html', go: GRAPHIQL_URL + '?tab=persisted' }),
      step('.addr input[name=url]', 'افتح تاب <b>Publish</b> واكتب <code>/graphql/execute.json/wknd/&lt;name&gt;</code>.', 'Open the <b>Publish</b> tab and type <code>/graphql/execute.json/wknd/&lt;name&gt;</code>.', { tab: 'publish', next: true }),
    ] },
    { t: L('افتح نفس الـ URL على <b>Dispatcher</b> مرتين: التانية من الـ cache', 'Open the same URL on the <b>Dispatcher</b> twice: the second comes from cache'), ok: () => F('dispatcher:gql'), guide: [step('.addr input[name=url]', 'اكتب نفس الـ URL في تاب Dispatcher واضغط Enter مرتين.', 'Type the same URL in the Dispatcher tab and press Enter twice.', { tab: 'dispatcher', next: true })] },
  ],
  quiz: [
    { q: L('ليه persisted queries أحسن من POST في الـ production؟', 'Why are persisted queries better than POST in production?'), a: [L('أسرع في الكتابة', 'Faster to write'), L('GET URL ثابت يتعمله cache في الـ Dispatcher والـ CDN', 'A fixed GET URL that the Dispatcher and CDN can cache'), L('مش محتاجة publish', 'They need no publishing')], c: 1, why: L('الـ POST مش بيتعمله cache.', 'POST responses are not cached.') },
    { q: L('الـ fragments نفسها متخزنة فين؟', 'Where are the fragments themselves stored?'), a: [L('/conf', '/conf'), L('/content/dam', '/content/dam'), L('/apps', '/apps')], c: 1, why: L('الـ models في /conf والـ fragments في الـ DAM.', 'Models live in /conf; fragments in the DAM.') },
    { q: L('الـ query شغالة على Author ومش على Publish. ناقص إيه غالباً؟', 'A query works on Author but not Publish. Usually missing?'), a: [L('نشر الـ query والـ fragments والـ model', 'Publishing the query, fragments and model'), L('restart', 'A restart'), L('clientlib', 'A clientlib')], c: 0, why: L('كله لازم يكون موجود على الـ Publish.', 'Everything must exist on Publish.') },
  ],
});
