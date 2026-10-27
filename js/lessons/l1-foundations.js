/* Level 1 · Foundations */

const copySelected = () => String(S.ui.sitesChecked).startsWith(ABOUT + '-') && !!document.querySelector('.selbar');

lesson({
  id: 'install', level: 1, num: '1.1', video: '#5', time: 15,
  title: L('How to install & run AEM', 'How to install & run AEM'),
  goal: L('هتعرف تشغّل Author و Publish على جهازك، وتفهم الـ run modes بتتحدد إزاي.', 'You will run an Author and a Publish instance and understand how run modes are chosen.'),
  learn: L(`
<h4>AEM عبارة عن إيه؟</h4>
<p>AEM (Adobe Experience Manager) هو <b>CMS</b>: نظام بيخلّي فريق المحتوى (الـ <b>authors</b>) يبنوا صفحات الموقع من غير كود، والمطوّرين يبنوا الـ <b>components</b> والـ <b>templates</b> اللي الـ authors بيستخدموها.</p>
<h4>ملف jar واحد = سيرفر كامل</h4>
<p>AEM بييجي كملف واحد <code>cq-quickstart-6.5.0.jar</code>. لما تشغّله بـ <code>java -jar</code> بيفك نفسه في فولدر اسمه <code>crx-quickstart</code>، وجوّاه كل حاجة: الـ repository (المحتوى والكود)، الـ logs، والإعدادات.</p>
<h4>Author و Publish</h4>
<p>في أي مشروع حقيقي فيه نوعين من السيرفرات (instances):</p>
<ul>
<li><b>Author</b> (عادة port <code>4502</code>): المكان اللي الـ authors بيشتغلوا فيه وبيعدّلوا الصفحات. ده داخلي ومحدش من الزوار بيشوفه.</li>
<li><b>Publish</b> (عادة port <code>4503</code>): السيرفر اللي بيعرض الموقع للزوار. بيستقبل المحتوى من Author لما حد يعمل <b>Publish</b>.</li>
<li>وقدّام الـ Publish فيه <b>Dispatcher</b> (Apache + cache) بيحمي السيرفر ويسرّع الموقع. هتشوفه في المستوى 4.</li>
</ul>
<pre class="ls-diagram">Author :4502  ──Publish──▶  Publish :4503  ◀──  Dispatcher :80  ◀──  الزوار
 (الكتابة)                    (العرض)              (cache + حماية)</pre>
<h4>اسم الملف بيحدد كل حاجة</h4>
<p>AEM بيقرا اسم الـ jar: <code>aem-author-p4502.jar</code> يعني run mode <b>author</b> على port <b>4502</b>. و<code>aem-publish-p4503.jar</code> يعني <b>publish</b> على <b>4503</b>.</p>
<h4>Run modes</h4>
<p>الـ <b>run mode</b> عبارة عن "تاج" على السيرفر بيحدد هو إيه وفين. فيه نوعين:</p>
<ul>
<li><b>Installation run modes</b>: <code>author</code> أو <code>publish</code>. بيتحددوا في <b>أول تشغيل بس</b> ومينفعش يتغيروا بعد كده.</li>
<li><b>Custom run modes</b>: زي <code>dev</code> و<code>stage</code> و<code>prod</code>. بتديهم بـ <code>-r dev</code> وتقدر تغيّرهم في كل تشغيل. وبيستخدموهم عشان كل بيئة تاخد إعدادات مختلفة (مثلاً API مختلف في dev عن prod) — هتشوف ده في درس OSGi.</li>
</ul>`, `
<h4>What is AEM?</h4>
<p>AEM (Adobe Experience Manager) is a <b>CMS</b>: content teams (<b>authors</b>) build site pages without code, and developers build the <b>components</b> and <b>templates</b> those authors use.</p>
<h4>One jar = a whole server</h4>
<p>AEM ships as one file, <code>cq-quickstart-6.5.0.jar</code>. Started with <code>java -jar</code>, it unpacks into a <code>crx-quickstart</code> folder that holds everything: the repository (content and code), logs and settings.</p>
<h4>Author and Publish</h4>
<ul>
<li><b>Author</b> (usually port <code>4502</code>): where authors edit pages. Internal; visitors never see it.</li>
<li><b>Publish</b> (usually port <code>4503</code>): serves the site to visitors. Receives content from Author when someone <b>publishes</b>.</li>
<li>In front of Publish sits the <b>Dispatcher</b> (Apache + cache) that protects it and makes the site fast — Level 4.</li>
</ul>
<pre class="ls-diagram">Author :4502  ──publish──▶  Publish :4503  ◀──  Dispatcher :80  ◀──  visitors
 (editing)                    (delivery)           (cache + security)</pre>
<h4>The file name decides</h4>
<p>AEM reads the jar name: <code>aem-author-p4502.jar</code> means run mode <b>author</b> on port <b>4502</b>; <code>aem-publish-p4503.jar</code> means <b>publish</b> on <b>4503</b>.</p>
<h4>Run modes</h4>
<ul>
<li><b>Installation run modes</b>: <code>author</code> or <code>publish</code>. Fixed at the <b>first start</b>, never changed later.</li>
<li><b>Custom run modes</b>: <code>dev</code>, <code>stage</code>, <code>prod</code>… passed with <code>-r dev</code>, can change on every start. Used to give each environment its own settings (see the OSGi lesson).</li>
</ul>`),
  terms: [
    ['Instance', L('سيرفر AEM واحد شغال (Author أو Publish).', 'One running AEM server (Author or Publish).')],
    ['crx-quickstart', L('الفولدر اللي AEM بيعمله في أول تشغيل وفيه الـ repository والـ logs.', 'The folder AEM creates on first start: repository, logs, config.')],
    ['Run mode', L('تاج على السيرفر (author, publish, dev, prod…) بيحدد الإعدادات اللي تشتغل.', 'A label on the server (author, publish, dev, prod…) that selects which settings apply.')],
    ['license.properties', L('ملف الترخيص جنب الـ jar (مش موجود في AEM as a Cloud Service SDK).', 'The license file next to the jar (not needed by the AEM as a Cloud Service SDK).')],
  ],
  real: L('<ul><li>أول تشغيل بياخد من 5 لـ 15 دقيقة، والجهاز محتاج على الأقل 8 GB RAM و Java 11.</li><li>في الشغل غالباً هتشتغل على <b>AEM as a Cloud Service</b>: الـ SDK بتاعه بيتشغل محلياً بنفس الطريقة بالظبط، بس الـ Author والـ Publish في الـ cloud بيديرهم Adobe.</li><li>لو الـ port مشغول، غيّر الرقم في اسم الملف (مثلاً <code>p4512</code>).</li></ul>',
    '<ul><li>The first start takes 5–15 minutes; you need at least 8 GB RAM and Java 11.</li><li>At work you will probably use <b>AEM as a Cloud Service</b>: its SDK runs locally exactly like this, while the cloud Author/Publish are run by Adobe.</li><li>If a port is taken, change the number in the file name (e.g. <code>p4512</code>).</li></ul>'),
  tasks: [
    {
      t: L('في تاب <b>Desktop</b>: غيّر اسم الـ jar في فولدر author لـ <code>aem-author-p4502.jar</code>', 'In the <b>Desktop</b> tab, rename the jar in the author folder to <code>aem-author-p4502.jar</code>'),
      why: L('الاسم ده هو اللي بيقول لـ AEM "إنت author وعلى port 4502" من غير أي إعدادات تانية.', 'This name alone tells AEM "you are an author on port 4502" — no other settings needed.'),
      hint: L('في الـ terminal: <code>ren cq-quickstart-6.5.0.jar aem-author-p4502.jar</code> أو دوس Rename', 'In the terminal: <code>ren cq-quickstart-6.5.0.jar aem-author-p4502.jar</code> or press Rename'),
      ok: () => inst('author').jar === 'aem-author-p4502.jar' || F('start:author:4502'),
      guide: [
        step('[data-act="renameJar"][data-k="author"]', 'دوس <b>Rename</b> جنب ملف الـ jar في فولدر <code>F:\\AEM\\author</code>.', 'Press <b>Rename</b> next to the jar in <code>F:\\AEM\\author</code>.', { tab: 'desktop' }),
        step('.modal input[name=name]', 'امسح الاسم واكتب <code>aem-author-p4502.jar</code>', 'Replace the name with <code>aem-author-p4502.jar</code>', { tab: 'desktop', next: true }),
        step('.modal [data-modal=ok]', 'دوس <b>Rename</b>.', 'Press <b>Rename</b>.', { tab: 'desktop' }),
      ],
    },
    {
      t: L('شغّل الـ Author', 'Start the Author'),
      why: L('<code>java -jar</code> بيشغّل AEM. أول مرة بيعمل <code>crx-quickstart</code> وبيثبّت الـ run mode.', '<code>java -jar</code> starts AEM. The first time it creates <code>crx-quickstart</code> and fixes the run mode.'),
      hint: L('<code>java -jar aem-author-p4502.jar</code>', '<code>java -jar aem-author-p4502.jar</code>'),
      ok: () => F('start:author:4502'),
      guide: [
        step('form.term-in[data-k="author"] input[name=cmd]', 'دوس في الـ terminal بتاع author واكتب <code>java -jar aem-author-p4502.jar</code> وبعدين Enter. استنى لحد ما يقول إنه شغال.', 'Click the author terminal, type <code>java -jar aem-author-p4502.jar</code> and press Enter. Wait until it says it is up.', { tab: 'desktop', next: true }),
      ],
    },
    {
      t: L('نفس الكلام للـ Publish على port <b>4503</b>', 'Do the same for Publish on port <b>4503</b>'),
      hint: L('سمّيه <code>aem-publish-p4503.jar</code> وشغّله', 'Name it <code>aem-publish-p4503.jar</code> and start it'),
      ok: () => F('start:publish:4503'),
      guide: [
        step('[data-act="renameJar"][data-k="publish"]', 'دوس <b>Rename</b> في فولدر <code>F:\\AEM\\publish</code>.', 'Press <b>Rename</b> in <code>F:\\AEM\\publish</code>.', { tab: 'desktop' }),
        step('.modal input[name=name]', 'اكتب <code>aem-publish-p4503.jar</code>', 'Type <code>aem-publish-p4503.jar</code>', { tab: 'desktop', next: true }),
        step('.modal [data-modal=ok]', 'دوس <b>Rename</b>.', 'Press <b>Rename</b>.', { tab: 'desktop' }),
        step('form.term-in[data-k="publish"] input[name=cmd]', 'اكتب <code>java -jar aem-publish-p4503.jar</code> وEnter.', 'Type <code>java -jar aem-publish-p4503.jar</code> and press Enter.', { tab: 'desktop', next: true }),
      ],
    },
    {
      t: L('افتح تاب Author وادخل بـ <b>admin / admin</b>', 'Open the Author tab and sign in as <b>admin / admin</b>'),
      why: L('الـ admin هو الـ superuser في أي AEM محلي. في الشغل الحقيقي بتدخل بـ SSO (Adobe IMS).', 'admin is the superuser on any local AEM. At work you sign in with SSO (Adobe IMS).'),
      ok: () => F('login'),
      guide: [
        step('input[name=user]', 'اكتب <code>admin</code> في User name', 'Type <code>admin</code> as the user name', { next: true }),
        step('input[name=pass]', 'واكتب <code>admin</code> في Password', 'and <code>admin</code> as the password', { next: true }),
        step('.login-box button', 'دوس <b>Sign In</b>.', 'Press <b>Sign In</b>.'),
      ],
    },
    {
      t: L('(متقدم) اقفل الـ Author وشغّله بـ <code>-r dev</code>، وبعدين افتح <b>Sling Settings</b>', '(Advanced) Stop the Author, start it with <code>-r dev</code>, then open <b>Sling Settings</b>'),
      why: L('كده هتشوف بعينك إن الـ run modes بقت <code>author, dev</code>. أي config في فولدر <code>config.dev</code> هيشتغل دلوقتي.', 'You will see the run modes become <code>author, dev</code>; any config in a <code>config.dev</code> folder now applies.'),
      hint: L('<code>stop</code> ← <code>java -jar aem-author-p4502.jar -r dev</code> ← Start ← Sling Settings', '<code>stop</code> → <code>java -jar aem-author-p4502.jar -r dev</code> → Start → Sling Settings'),
      ok: () => F('runmode:extra') && F('visit:slingsettings'),
      guide: [
        step('[data-act="stopInst"][data-k="author"]', 'دوس <b>Stop</b> عشان تقفل الـ Author (أو اكتب <code>stop</code>).', 'Press <b>Stop</b> to shut the Author down (or type <code>stop</code>).', { tab: 'desktop' }),
        step('form.term-in[data-k="author"] input[name=cmd]', 'اكتب <code>java -jar aem-author-p4502.jar -r dev</code> وEnter.', 'Type <code>java -jar aem-author-p4502.jar -r dev</code> and press Enter.', { tab: 'desktop', next: true }),
        step('.lab-shortcuts [data-url="/system/console/status-slingsettings"]', 'من صفحة البداية دوس <b>Sling Settings</b> وبص على سطر Run Modes.', 'On the start page press <b>Sling Settings</b> and look at the Run Modes line.', { at: '/aem/start.html' }),
      ],
    },
  ],
  quiz: [
    { q: L('الملف <code>aem-publish-p4503.jar</code> هيشتغل إزاي؟', 'How does <code>aem-publish-p4503.jar</code> start?'), a: [L('Author على 4503', 'Author on 4503'), L('Publish على 4503', 'Publish on 4503'), L('Publish على 4502', 'Publish on 4502')], c: 1, why: L('الاسم فيه run mode (publish) والـ port (p4503).', 'The name holds the run mode (publish) and the port (p4503).') },
    { q: L('إمتى تقدر تغيّر author ↔ publish لنفس الـ instance؟', 'When can you switch an instance between author and publish?'), a: [L('في أي restart', 'On any restart'), L('أبداً: بيتحدد في أول تشغيل', 'Never — it is fixed at first start'), L('من Sling Settings', 'From Sling Settings')], c: 1, why: L('author/publish هما installation run modes، بيتثبّتوا في أول تشغيل بس.', 'author/publish are installation run modes, fixed at the first start.') },
    { q: L('مين اللي الزوار بيوصلوله مباشرة؟', 'What do site visitors reach directly?'), a: [L('Author', 'Author'), L('Dispatcher قدام الـ Publish', 'The Dispatcher in front of Publish'), L('CRXDE', 'CRXDE')], c: 1, why: L('الزوار بيكلموا الـ Dispatcher (cache وحماية) واللي بيكلم الـ Publish. الـ Author داخلي.', 'Visitors hit the Dispatcher (cache + security), which talks to Publish. Author stays internal.') },
    { q: L('عايز إعدادات مختلفة لـ dev و prod. تستخدم إيه؟', 'You need different settings for dev and prod. What do you use?'), a: [L('Custom run modes زي <code>-r dev</code>', 'Custom run modes such as <code>-r dev</code>'), L('instance جديدة لكل إعداد', 'A new instance per setting'), L('تعدّل /libs', 'Edit /libs')], c: 0, why: L('الـ custom run modes بتختار أنهي configs تشتغل في كل بيئة.', 'Custom run modes pick which configs apply in each environment.') },
  ],
});

lesson({
  id: 'consoles', level: 1, num: '1.2', video: '#6 · #7', time: 15,
  title: L('Navigation & the AEM consoles', 'Navigation & the AEM consoles'),
  goal: L('هتعرف كل console في AEM بتعمل إيه، وتوصل لأي حاجة بالـ UI أو بالـ URL.', 'You will know what each AEM console is for and reach any of them through the UI or a URL.'),
  learn: L(`
<h4>صفحة البداية (Navigation)</h4>
<p>بعد الـ login بتفتح <code>/aem/start.html</code>. ده الـ <b>Navigation</b>: tiles لكل جزء كبير في AEM. وعلى الشمال فيه rail فيه 🧭 Navigation و🔨 <b>Tools</b>.</p>
<h4>أهم الـ consoles</h4>
<table class="ls-table">
<tr><th>Console</th><th>بتستخدمها في</th><th>URL</th></tr>
<tr><td><b>Sites</b></td><td>الصفحات: تعمل، تعدّل، تنشر</td><td><code>/sites.html/content</code></td></tr>
<tr><td><b>Assets</b> (DAM)</td><td>الصور والفيديوهات والملفات</td><td><code>/assets.html/content/dam</code></td></tr>
<tr><td><b>Experience Fragments</b></td><td>أجزاء بتتكرر (header، footer، promo)</td><td><code>/aem/experience-fragments.html</code></td></tr>
<tr><td><b>Tools</b></td><td>Templates، Workflows، Replication، GraphQL…</td><td><code>/aem/tools.html</code></td></tr>
<tr><td><b>CRXDE Lite</b></td><td>شجرة الـ JCR الخام (للمطوّرين)</td><td><code>/crx/de/index.jsp</code></td></tr>
<tr><td><b>Package Manager</b></td><td>نقل content/code كملف zip</td><td><code>/crx/packmgr/index.jsp</code></td></tr>
<tr><td><b>Web Console</b> (Felix)</td><td>OSGi: bundles وconfigurations</td><td><code>/system/console</code></td></tr>
</table>
<h4>الـ header</h4>
<p>فوق في كل صفحة: 🔔 <b>Inbox</b> (المهام اللي مستنياك من الـ workflows)، و❓ Help، و👤 قايمة المستخدم (Sign Out).</p>
<h4>كل حاجة ليها URL</h4>
<p>المطوّرين بيوصلوا لمعظم الحاجات بكتابة الـ URL على طول بدل الـ clicks. خلّي عينك على الـ address bar وإنت بتتنقل، وهتحفظ الـ URLs دي بسرعة.</p>`, `
<h4>The start page (Navigation)</h4>
<p>After sign-in you land on <code>/aem/start.html</code>, the <b>Navigation</b>: one tile per big area. The left rail has 🧭 Navigation and 🔨 <b>Tools</b>.</p>
<h4>The main consoles</h4>
<table class="ls-table">
<tr><th>Console</th><th>Used for</th><th>URL</th></tr>
<tr><td><b>Sites</b></td><td>Pages: create, edit, publish</td><td><code>/sites.html/content</code></td></tr>
<tr><td><b>Assets</b> (DAM)</td><td>Images, videos, files</td><td><code>/assets.html/content/dam</code></td></tr>
<tr><td><b>Experience Fragments</b></td><td>Reusable parts (header, footer, promo)</td><td><code>/aem/experience-fragments.html</code></td></tr>
<tr><td><b>Tools</b></td><td>Templates, workflows, replication, GraphQL…</td><td><code>/aem/tools.html</code></td></tr>
<tr><td><b>CRXDE Lite</b></td><td>The raw JCR tree (developers)</td><td><code>/crx/de/index.jsp</code></td></tr>
<tr><td><b>Package Manager</b></td><td>Move content/code as a zip</td><td><code>/crx/packmgr/index.jsp</code></td></tr>
<tr><td><b>Web Console</b> (Felix)</td><td>OSGi bundles and configurations</td><td><code>/system/console</code></td></tr>
</table>
<h4>The header</h4>
<p>On every screen: 🔔 <b>Inbox</b> (tasks waiting for you from workflows), ❓ Help, and the 👤 user menu (Sign Out).</p>
<h4>Everything has a URL</h4>
<p>Developers usually type URLs instead of clicking. Watch the address bar while you move around and you will learn them quickly.</p>`),
  terms: [
    ['Touch UI', L('الواجهة الحديثة بتاعة AEM (اللي بتشوفها). القديمة اسمها Classic UI.', 'AEM\'s current interface (the one you see). The old one is the Classic UI.')],
    ['DAM', L('Digital Asset Management: الـ Assets console.', 'Digital Asset Management — the Assets console.')],
    ['Inbox', L('الأماكن اللي بتوصلك فيها مهام الـ workflows (موافقة، مراجعة…).', 'Where workflow tasks reach you (approve, review…).')],
  ],
  real: L('<ul><li>في AEM as a Cloud Service مفيش CRXDE على الـ Publish، وعلى الـ Author بيكون read-only في الغالب. المطوّرين بيستخدموه على جهازهم.</li><li>Web Console مقفول على البيئات الحقيقية؛ الإعدادات بتتعمل في الكود (OSGi configs).</li></ul>',
    '<ul><li>In AEM as a Cloud Service there is no CRXDE on Publish, and on Author it is mostly read-only; developers use it locally.</li><li>The Web Console is locked on real environments; settings live in code (OSGi configs).</li></ul>'),
  tasks: [
    { t: L('افتح <b>Sites</b>', 'Open <b>Sites</b>'), ok: () => F('visit:sites'), guide: [step('.nav-tile[data-url="/sites.html/content"]', 'دوس على tile <b>Sites</b>.', 'Click the <b>Sites</b> tile.', { at: '/aem/start.html' })] },
    { t: L('افتح <b>Assets</b>', 'Open <b>Assets</b>'), ok: () => F('visit:assets'), guide: [step('.nav-tile[data-url="/assets.html/content/dam"]', 'دوس على tile <b>Assets</b>.', 'Click the <b>Assets</b> tile.', { at: '/aem/start.html' })] },
    { t: L('افتح <b>Tools</b> 🔨 ومنها <b>General → Templates</b>', 'Open <b>Tools</b> 🔨, then <b>General → Templates</b>'), ok: () => F('visit:tools') && F('visit:templates'), guide: [
      step('.nav-rail [data-url="/aem/tools.html"]', 'دوس على أيقونة الـ 🔨 Tools في الـ rail على الشمال.', 'Click the 🔨 Tools icon in the left rail.', { at: '/aem/start.html' }),
      step('.tool-cats [data-cat="General"]', 'اختار قسم <b>General</b>.', 'Pick the <b>General</b> category.', { at: '/aem/tools.html' }),
      step('.tool-card ~ Templates', 'دوس على كارت <b>Templates</b>.', 'Click the <b>Templates</b> card.', { at: '/aem/tools.html' }),
    ] },
    { t: L('افتح الـ <b>Inbox</b> 🔔', 'Open the <b>Inbox</b> 🔔'), ok: () => F('visit:inbox'), guide: [step('.shell-head [data-url="/aem/inbox"]', 'دوس على الجرس 🔔 فوق على اليمين.', 'Click the 🔔 bell at the top right.')] },
    { t: L('افتح <b>CRXDE Lite</b> و<b>Web Console</b>', 'Open <b>CRXDE Lite</b> and the <b>Web Console</b>'), ok: () => F('visit:crxde') && F('visit:configmgr'), guide: [
      step('.lab-shortcuts [data-url="/crx/de/index.jsp"]', 'من صفحة البداية تحت "Developer consoles" دوس <b>CRXDE Lite</b>.', 'On the start page under "Developer consoles", click <b>CRXDE Lite</b>.', { at: '/aem/start.html' }),
      step('.addr input[name=url]', 'دلوقتي اكتب في الـ address bar <code>/system/console/configMgr</code> وEnter.', 'Now type <code>/system/console/configMgr</code> in the address bar and press Enter.', { next: true }),
    ] },
    { t: L('اكتب URL بنفسك: <code>/sites.html/content/wknd/us/en</code>', 'Type a URL yourself: <code>/sites.html/content/wknd/us/en</code>'), why: L('ده بيفتح الـ Sites console على الصفحة دي على طول. المطوّرين بيشتغلوا كده طول الوقت.', 'It opens the Sites console right on that page — developers do this all day.'), ok: () => F('addr:typed'), guide: [step('.addr input[name=url]', 'دوس في الـ address bar، اكتب <code>/sites.html/content/wknd/us/en</code> وEnter.', 'Click the address bar, type <code>/sites.html/content/wknd/us/en</code> and press Enter.', { next: true })] },
  ],
  quiz: [
    { q: L('عايز ترفع صورة. تروح فين؟', 'You need to upload an image. Where?'), a: [L('Sites', 'Sites'), L('Assets', 'Assets'), L('Tools', 'Tools')], c: 1, why: L('الـ Assets (DAM) هو مكان الصور والملفات.', 'Assets (DAM) is where images and files live.') },
    { q: L('Templates و Workflows و Replication موجودين فين؟', 'Where are Templates, Workflows and Replication?'), a: [L('Tools 🔨', 'Tools 🔨'), L('Sites', 'Sites'), L('Inbox', 'Inbox')], c: 0, why: L('كل الإعدادات والأدوات تحت Tools.', 'All configuration and tooling is under Tools.') },
    { q: L('إيه الـ URL بتاع CRXDE Lite؟', 'What is the CRXDE Lite URL?'), a: [L('<code>/crx/de/index.jsp</code>', '<code>/crx/de/index.jsp</code>'), L('<code>/system/console</code>', '<code>/system/console</code>'), L('<code>/aem/crxde.html</code>', '<code>/aem/crxde.html</code>')], c: 0, why: L('<code>/system/console</code> هو الـ OSGi Web Console.', '<code>/system/console</code> is the OSGi Web Console.') },
  ],
});

lesson({
  id: 'jcr', level: 1, num: '1.3', time: 25,
  title: L('The JCR & CRXDE Lite', 'The JCR & CRXDE Lite'),
  goal: L('هتفهم إن كل حاجة في AEM عبارة عن nodes و properties، وتعرف تقرا وتعدّل الـ repository بـ CRXDE.', 'You will see that everything in AEM is nodes and properties, and read and change the repository with CRXDE.'),
  learn: L(`
<h4>الـ JCR = قاعدة بيانات على شكل شجرة</h4>
<p>AEM مش بيستخدم جداول SQL. كل حاجة (صفحات، صور، كود، إعدادات، users) متخزنة في <b>JCR</b> (Java Content Repository)، والـ implementation اسمه <b>Apache Jackrabbit Oak</b>. الـ JCR عبارة عن <b>شجرة</b>:</p>
<ul><li><b>Node</b>: زي فولدر. ليه اسم و path، زي <code>/content/wknd/us/en</code>.</li>
<li><b>Property</b>: قيمة على الـ node، زي <code>jcr:title = "WKND Adventures"</code>. ليها type: String، Boolean، Long، Date، Binary…</li>
<li><b>Node type</b> (<code>jcr:primaryType</code>): بيحدد الـ node ده إيه، زي <code>cq:Page</code> للصفحة، و<code>dam:Asset</code> للصورة، و<code>nt:unstructured</code> لأي حاجة.</li></ul>
<h4>الفولدرات الكبيرة</h4>
<pre class="ls-diagram">/
├── apps      ← كود مشروعك (components, clientlibs, configs)
├── libs      ← كود Adobe (Core Components, AEM نفسه) — ممنوع تعدّل فيه
├── content   ← المحتوى: الصفحات (/content/wknd) والـ DAM (/content/dam)
├── conf      ← templates و policies والإعدادات لكل موقع (/conf/wknd)
├── etc       ← packages، replication agents، حاجات قديمة
├── var       ← بيانات بتتولد وقت التشغيل (workflow instances، audit)
└── home      ← users و groups</pre>
<h4>الصفحة من جوه</h4>
<p>الصفحة node نوعه <code>cq:Page</code>، وتحتها node اسمه <code>jcr:content</code> فيه الـ properties (العنوان، الـ template)، وتحته الـ components كـ nodes:</p>
<pre class="ls-diagram">/content/wknd/us/en              (cq:Page)
└── jcr:content                  (cq:PageContent)  jcr:title, cq:template
    └── root                     (container)
        └── container
            ├── title            sling:resourceType = wknd/components/title
            └── text             text = "&lt;p&gt;…&lt;/p&gt;"</pre>
<h4>CRXDE Lite</h4>
<p>CRXDE هو الـ IDE البسيط اللي بيوريك الشجرة دي: على الشمال الـ nodes، وعلى اليمين الـ properties بتاعة الـ node المختار. تقدر تعمل nodes، تضيف properties، وتعدّل ملفات.</p>
<h4>اقرا أي node كـ JSON</h4>
<p>Sling بيرجّع أي node كـ JSON لو حطيت <code>.json</code> في آخر الـ URL: <code>/content/wknd/us/en/jcr:content.json</code>. و<code>.1.json</code> بيجيب مستوى أولاد واحد، و<code>.infinity.json</code> بيجيب كل الشجرة. (على الـ Publish الـ Dispatcher بيقفل ده للأمان.)</p>`, `
<h4>The JCR = a tree-shaped database</h4>
<p>AEM does not use SQL tables. Everything (pages, images, code, settings, users) is stored in the <b>JCR</b> (Java Content Repository); the implementation is <b>Apache Jackrabbit Oak</b>. The JCR is a <b>tree</b>:</p>
<ul><li><b>Node</b>: like a folder, with a name and a path such as <code>/content/wknd/us/en</code>.</li>
<li><b>Property</b>: a value on a node, e.g. <code>jcr:title = "WKND Adventures"</code>, with a type: String, Boolean, Long, Date, Binary…</li>
<li><b>Node type</b> (<code>jcr:primaryType</code>): what the node is — <code>cq:Page</code> for a page, <code>dam:Asset</code> for an image, <code>nt:unstructured</code> for anything.</li></ul>
<h4>The top folders</h4>
<pre class="ls-diagram">/
├── apps      ← your project code (components, clientlibs, configs)
├── libs      ← Adobe code (Core Components, AEM itself) — never edit
├── content   ← content: pages (/content/wknd) and the DAM (/content/dam)
├── conf      ← templates, policies and per-site config (/conf/wknd)
├── etc       ← packages, replication agents, legacy things
├── var       ← runtime data (workflow instances, audit)
└── home      ← users and groups</pre>
<h4>A page inside</h4>
<p>A page is a <code>cq:Page</code> node; under it <code>jcr:content</code> holds its properties (title, template), and below that the components are nodes:</p>
<pre class="ls-diagram">/content/wknd/us/en              (cq:Page)
└── jcr:content                  (cq:PageContent)  jcr:title, cq:template
    └── root                     (container)
        └── container
            ├── title            sling:resourceType = wknd/components/title
            └── text             text = "&lt;p&gt;…&lt;/p&gt;"</pre>
<h4>CRXDE Lite</h4>
<p>CRXDE is a small IDE over that tree: nodes on the left, the selected node's properties on the right. You can create nodes, add properties and edit files.</p>
<h4>Read any node as JSON</h4>
<p>Sling returns any node as JSON when you add <code>.json</code>: <code>/content/wknd/us/en/jcr:content.json</code>. <code>.1.json</code> adds one level of children, <code>.infinity.json</code> the whole subtree. (On Publish the Dispatcher blocks this for security.)</p>`),
  terms: [
    ['JCR / Oak', L('الـ repository اللي AEM بيخزن فيه كل حاجة كشجرة nodes.', 'The repository where AEM stores everything as a tree of nodes.')],
    ['jcr:primaryType', L('نوع الـ node (cq:Page، dam:Asset، nt:unstructured…).', 'The node type (cq:Page, dam:Asset, nt:unstructured…).')],
    ['jcr:content', L('الـ child اللي فيه بيانات الصفحة أو الـ asset الفعلية.', 'The child node that holds the actual data of a page or asset.')],
    ['/apps vs /libs', L('/apps بتاعك، /libs بتاع Adobe. Sling بيدوّر في /apps الأول.', '/apps is yours, /libs is Adobe\'s; Sling looks in /apps first.')],
  ],
  real: L('<ul><li>متعدّلش في <code>/libs</code> أبداً: أي upgrade لـ AEM هيمسح تعديلاتك. لو محتاج تغيّر حاجة من Adobe اعمل <b>overlay</b> في <code>/apps</code> بنفس الـ path.</li><li>التعديلات في CRXDE على الـ code (<code>/apps</code>) للتجربة بس. الكود الحقيقي بيتكتب في Git ويتعمله deploy بـ Maven، وإلا هيتمسح في الـ deploy الجاي.</li><li>في AEM الحقيقي لازم تدوس <b>Save All</b> بعد أي تعديل في CRXDE. في الـ lab التعديل بيتحفظ على طول.</li></ul>',
    '<ul><li>Never edit <code>/libs</code>: an AEM upgrade wipes your changes. To change something from Adobe, <b>overlay</b> it under <code>/apps</code> at the same path.</li><li>CRXDE edits to code (<code>/apps</code>) are for experiments; real code lives in Git and is deployed with Maven, otherwise the next deploy overwrites it.</li><li>Real CRXDE needs <b>Save All</b> after changes; the lab saves immediately.</li></ul>'),
  tasks: [
    { t: L('افتح CRXDE وافتح الشجرة لحد <code>/content/wknd/us/en/jcr:content</code>', 'In CRXDE open the tree down to <code>/content/wknd/us/en/jcr:content</code>'), why: L('هتشوف إن الصفحة من جوه مجرد nodes، والعنوان مجرد property اسمها <code>jcr:title</code>.', 'You will see that a page is just nodes and its title is just a <code>jcr:title</code> property.'), ok: () => crxSeen(p => p === SITE_ROOT + '/jcr:content'), guide: [
      step(null, 'هنفتح CRXDE Lite. على الشمال الشجرة: السهم ▸ بيفتح الـ node، والدوسة على الاسم بتختاره وتعرض الـ properties على اليمين.', 'We open CRXDE Lite. The tree is on the left: the ▸ arrow expands a node, clicking its name selects it and shows its properties on the right.', { at: '/crx/de', go: '/crx/de/index.jsp#/content', next: true }),
      crxOpen('/content', 'دوس على السهم ▸ جنب <b>content</b>.', 'Click the ▸ arrow next to <b>content</b>.'),
      crxOpen('/content/wknd', 'وبعدين السهم جنب <b>wknd</b>.', 'Then the arrow next to <b>wknd</b>.'),
      crxOpen('/content/wknd/us', 'وبعدين <b>us</b>.', 'Then <b>us</b>.'),
      crxOpen('/content/wknd/us/en', 'وبعدين <b>en</b> (ده الصفحة الرئيسية).', 'Then <b>en</b> (the home page).'),
      step('.ct-row[data-path="/content/wknd/us/en/jcr:content"] .ct-name', 'دوس على اسم <b>jcr:content</b> وبص على الـ properties على اليمين: <code>jcr:title</code> و<code>cq:template</code>.', 'Click the name <b>jcr:content</b> and look at the properties on the right: <code>jcr:title</code> and <code>cq:template</code>.', { at: '/crx/de' }),
    ] },
    { t: L('افتح <code>/apps/wknd/components</code> و<code>/libs/core/wcm/components</code> وقارن', 'Open <code>/apps/wknd/components</code> and <code>/libs/core/wcm/components</code> and compare'), why: L('الأولى components مشروعك (proxies) والتانية الـ Core Components بتاعة Adobe اللي بيورثوا منها.', 'The first are your project components (proxies); the second are Adobe\'s Core Components they inherit from.'), ok: () => crxSeen(p => p === '/apps/wknd/components') && crxSeen(p => p.startsWith('/libs/core/wcm/components')), guide: [
      step('.ct-row[data-path="/apps/wknd/components"] .ct-name', 'دوس على <code>/apps/wknd/components</code>: دي components مشروع WKND.', 'Click <code>/apps/wknd/components</code>: the WKND project components.', { at: '/crx/de', go: '/crx/de/index.jsp#/apps/wknd/components' }),
      step('.ct-row[data-path="/libs/core/wcm/components"] .ct-name', 'ودلوقتي <code>/libs/core/wcm/components</code>: الـ Core Components بتاعة Adobe.', 'Now <code>/libs/core/wcm/components</code>: Adobe\'s Core Components.', { at: '/crx/de', go: '/crx/de/index.jsp#/libs/core/wcm/components' }),
    ] },
    { t: L('اعمل node جديد اسمه <code>notes</code> نوعه <code>nt:unstructured</code> تحت <code>/content/wknd</code>', 'Create a node <code>notes</code> of type <code>nt:unstructured</code> under <code>/content/wknd</code>'), ok: () => !!JCR.get(AR(), '/content/wknd/notes'), guide: [
      step('.ct-row[data-path="/content/wknd"] .ct-name', 'اختار <code>/content/wknd</code> في الشجرة.', 'Select <code>/content/wknd</code> in the tree.', { at: '/crx/de', go: '/crx/de/index.jsp#/content/wknd' }),
      step('.crx-create summary', 'افتح قايمة <b>Create</b> في الـ toolbar.', 'Open the <b>Create</b> menu in the toolbar.', { at: '/crx/de' }),
      step('[data-act="crxNewNode"]', 'اختار <b>Create Node…</b>.', 'Choose <b>Create Node…</b>.', { at: '/crx/de' }),
      step('.modal input[name=name]', 'اكتب الاسم <code>notes</code> وسيب النوع <code>nt:unstructured</code>.', 'Type <code>notes</code> and keep the type <code>nt:unstructured</code>.', { at: '/crx/de', next: true }),
      step('.modal [data-modal=ok]', 'دوس <b>Create</b>.', 'Press <b>Create</b>.', { at: '/crx/de' }),
    ] },
    { t: L('ضيف property على <code>notes</code>: <code>owner</code> = اسمك (String)', 'Add a property to <code>notes</code>: <code>owner</code> = your name (String)'), ok: () => !!(JCR.get(AR(), '/content/wknd/notes') || { props: {} }).props.owner, guide: [
      step('.crx-add input[name=name]', 'تحت جدول الـ properties: اكتب الاسم <code>owner</code>.', 'Below the properties table, type the name <code>owner</code>.', { at: '/crx/de', go: '/crx/de/index.jsp#/content/wknd/notes', next: true }),
      step('.crx-add input[name=value]', 'واكتب اسمك في Value.', 'Type your name as the value.', { at: '/crx/de', next: true }),
      step('.crx-add button', 'دوس <b>Add</b>.', 'Press <b>Add</b>.', { at: '/crx/de' }),
    ] },
    { t: L('شوف الصفحة كـ JSON: <code>/content/wknd/us/en/jcr:content.1.json</code>', 'View the page as JSON: <code>/content/wknd/us/en/jcr:content.1.json</code>'), why: L('ده الـ <b>Sling default GET servlet</b>: أي node يترجع JSON. مفيد جداً للـ debugging.', 'This is the <b>Sling default GET servlet</b>: any node comes back as JSON. Very handy for debugging.'), ok: () => F('json:view'), guide: [step('.addr input[name=url]', 'اكتب في الـ address bar <code>/content/wknd/us/en/jcr:content.1.json</code> وEnter.', 'Type <code>/content/wknd/us/en/jcr:content.1.json</code> in the address bar and press Enter.', { next: true })] },
    { t: L('جرّب <code>.infinity.json</code> على نفس الـ path', 'Try <code>.infinity.json</code> on the same path'), ok: () => F('json:infinity'), guide: [step('.addr input[name=url]', 'غيّر <code>.1.json</code> لـ <code>.infinity.json</code> وEnter: هتجيلك الشجرة كلها.', 'Change <code>.1.json</code> to <code>.infinity.json</code> and press Enter: the whole subtree comes back.', { next: true })] },
    { t: L('امسح الـ node <code>notes</code> (خليك نضيف)', 'Delete the <code>notes</code> node (keep it clean)'), ok: () => F('crx:edit') && !JCR.get(AR(), '/content/wknd/notes') && crxSeen(p => p === '/content/wknd/notes'), guide: [
      step('.ct-row[data-path="/content/wknd/notes"] .ct-name', 'اختار <code>notes</code>.', 'Select <code>notes</code>.', { at: '/crx/de', go: '/crx/de/index.jsp#/content/wknd/notes' }),
      step('[data-act="crxDelNode"]', 'دوس <b>Delete</b>.', 'Press <b>Delete</b>.', { at: '/crx/de' }),
      step('.modal [data-modal=ok]', 'أكّد الحذف.', 'Confirm.', { at: '/crx/de' }),
    ] },
  ],
  quiz: [
    { q: L('عنوان الصفحة متخزن فين؟', 'Where is a page title stored?'), a: [L('property <code>jcr:title</code> على <code>jcr:content</code>', '<code>jcr:title</code> on <code>jcr:content</code>'), L('في اسم الـ node', 'In the node name'), L('في جدول SQL', 'In a SQL table')], c: 0, why: L('بيانات الصفحة كلها properties على <code>jcr:content</code>.', 'All page data are properties on <code>jcr:content</code>.') },
    { q: L('محتاج تغيّر component من Adobe. تعمل إيه؟', 'You need to change an Adobe component. What do you do?'), a: [L('تعدّله في /libs', 'Edit it in /libs'), L('تعمل overlay أو proxy في /apps', 'Overlay or proxy it in /apps'), L('تمسحه', 'Delete it')], c: 1, why: L('/libs بيتمسح مع أي upgrade، و Sling بيدوّر في /apps الأول.', '/libs is replaced on upgrade, and Sling looks in /apps first.') },
    { q: L('إيه الفرق بين <code>.1.json</code> و <code>.infinity.json</code>؟', 'Difference between <code>.1.json</code> and <code>.infinity.json</code>?'), a: [L('مفيش فرق', 'None'), L('مستوى واحد من الأولاد مقابل كل الشجرة', 'One level of children vs the whole subtree'), L('الأول للـ author والتاني للـ publish', 'Author vs publish')], c: 1, why: L('الرقم هو الـ depth.', 'The number is the depth.') },
    { q: L('templates و policies موقع WKND فين؟', 'Where are the WKND templates and policies?'), a: [L('<code>/apps/wknd</code>', '<code>/apps/wknd</code>'), L('<code>/conf/wknd</code>', '<code>/conf/wknd</code>'), L('<code>/content/wknd</code>', '<code>/content/wknd</code>')], c: 1, why: L('الإعدادات اللي بيعملها الـ authors (templates/policies) في /conf.', 'Author-made configuration (templates/policies) lives in /conf.') },
  ],
});

lesson({
  id: 'sites', level: 1, num: '1.4', video: '#8', time: 20,
  title: L('AEM Sites & pages', 'AEM Sites & pages'),
  goal: L('هتعمل صفحة من template، تفتحها في الـ editor وفي الـ Preview، وتلاقيها في CRXDE.', 'You will create a page from a template, open it in the editor and in Preview, and find it in CRXDE.'),
  learn: L(`
<h4>الـ Sites console</h4>
<p>بيعرض الصفحات كـ <b>أعمدة</b> (Column view): كل ما تدوس على صفحة بيفتح عمود بالصفحات اللي تحتها. وفيه كمان Card view وList view من أيقونة الـ View.</p>
<h4>اختيار مقابل فتح</h4>
<ul><li><b>دوسة على اسم الصفحة</b> = تفتحها (تشوف اللي تحتها).</li>
<li><b>دوسة على الصورة الصغيرة (thumbnail)</b> = تختارها، فيظهر فوق شريط الـ actions: Edit، Properties، Copy، Move، Publish…</li></ul>
<h4>عمل صفحة</h4>
<p>Create ← <b>Page</b> بيفتح wizard من خطوتين: <b>Template</b> (بتختار شكل الصفحة) و<b>Properties</b> (العنوان والاسم). الـ <b>Title</b> هو اللي بيظهر للناس، والـ <b>Name</b> هو اللي بيبقى في الـ URL و في الـ JCR (حروف صغيرة و<code>-</code>).</p>
<pre class="ls-diagram">Title: "About Us"   →   Name: about-us   →   /content/wknd/us/en/about-us.html</pre>
<h4>3 طرق تشوف بيها الصفحة</h4>
<ul><li><b>Editor</b>: <code>/editor.html/content/…/page.html</code> — بتعدّل فيه.</li>
<li><b>Preview</b>: نفس الـ editor بس من غير أدوات التعديل.</li>
<li><b>View as Published</b>: <code>/content/…/page.html?wcmmode=disabled</code> — الصفحة زي ما هتظهر بعد النشر.</li></ul>
<h4>الحالة (Status)</h4>
<p>كل صفحة ليها حالة: <b>Not published</b> أو <b>Published</b> أو <b>Modified</b> (اتعدّلت بعد آخر نشر). النقطة الملونة في الـ console بتوضّحها.</p>`, `
<h4>The Sites console</h4>
<p>It shows pages as <b>columns</b> (Column view): clicking a page opens a column with its children. Card and List views are in the View menu.</p>
<h4>Select vs open</h4>
<ul><li><b>Click the page name</b> = open it (see its children).</li>
<li><b>Click the small picture (thumbnail)</b> = select it; the action bar appears: Edit, Properties, Copy, Move, Publish…</li></ul>
<h4>Creating a page</h4>
<p>Create → <b>Page</b> opens a two-step wizard: <b>Template</b> (the page type) and <b>Properties</b> (title and name). The <b>Title</b> is what people see; the <b>Name</b> goes into the URL and the JCR (lower case and <code>-</code>).</p>
<pre class="ls-diagram">Title: "About Us"   →   Name: about-us   →   /content/wknd/us/en/about-us.html</pre>
<h4>Three ways to look at a page</h4>
<ul><li><b>Editor</b>: <code>/editor.html/content/…/page.html</code> — where you edit.</li>
<li><b>Preview</b>: the editor without editing tools.</li>
<li><b>View as Published</b>: <code>/content/…/page.html?wcmmode=disabled</code> — the page as it will look once published.</li></ul>
<h4>Status</h4>
<p>Each page is <b>Not published</b>, <b>Published</b> or <b>Modified</b> (changed since the last publish). The coloured dot in the console shows it.</p>`),
  terms: [
    ['cq:Page', L('نوع الـ node بتاع أي صفحة.', 'The node type of every page.')],
    ['Template', L('الـ "قالب" اللي الصفحة بتتبني منه (الـ layout والـ components المسموحة).', 'What a page is built from (layout and allowed components).')],
    ['wcmmode', L('وضع الـ WCM: edit، preview، أو disabled (زي الـ publish).', 'The WCM mode: edit, preview or disabled (as on publish).')],
  ],
  real: L('<ul><li>اختار الـ Name بعناية من الأول: تغييره بعدين (Move) بيغيّر الـ URL وممكن يكسر روابط و SEO.</li><li>الصفحات الكبيرة بتتنظم في شجرة منطقية (اللغة ← القسم ← الصفحة) لأن الـ navigation والـ breadcrumb بيتبنوا منها.</li></ul>',
    '<ul><li>Pick the Name carefully: changing it later (Move) changes the URL and can break links and SEO.</li><li>Organise pages in a logical tree (language → section → page) — navigation and breadcrumbs are built from it.</li></ul>'),
  tasks: [
    {
      t: L('اعمل صفحة <b>About</b> (الاسم <code>about</code>) تحت <b>WKND Adventures</b> بـ template <b>Page Content</b>', 'Create an <b>About</b> page (name <code>about</code>) under <b>WKND Adventures</b> with the <b>Page Content</b> template'),
      why: L('دي الصفحة اللي هنكمّل عليها في دروس كتير بعد كده.', 'You will keep using this page in many later lessons.'),
      ok: () => isPage(AR(), ABOUT),
      guide: [
        sitesPath('/content/wknd', 'دوس على <b>WKND Sites Project</b>.', 'Click <b>WKND Sites Project</b>.'),
        sitesPath('/content/wknd/us', 'دوس على <b>United States</b>.', 'Click <b>United States</b>.'),
        sitesPath('/content/wknd/us/en', 'دوس على <b>WKND Adventures</b> (اسم الصفحة نفسها مش الصورة).', 'Click <b>WKND Adventures</b> (the name, not the picture).'),
        step('.titlebar summary.btn.primary', 'دوس زرار <b>Create</b> الأزرق فوق على اليمين.', 'Press the blue <b>Create</b> button at the top right.', { at: '/sites.html/content/wknd/us/en' }),
        step('.create-menu [data-act="pageCreate"]', 'اختار <b>Page</b>.', 'Choose <b>Page</b>.', { at: '/sites.html' }),
        step('.cpw-card[data-path$="/page-content"]', 'دوس على كارت <b>Page Content</b> عشان تختاره.', 'Click the <b>Page Content</b> card to select it.', { at: '/mnt/overlay/wcm/core/content/sites/createpagewizard.html' }),
        step('[data-act="cpwNext"]', 'دوس <b>Next</b>.', 'Press <b>Next</b>.', { at: '/mnt/overlay/wcm/core/content/sites/createpagewizard.html' }),
        step('[data-cpw="title"]', 'اكتب في Title: <code>About</code>', 'Type <code>About</code> as the Title', { at: '/mnt/overlay/wcm/core/content/sites/createpagewizard.html', next: true }),
        step('[data-cpw="name"]', 'وفي Name: <code>about</code>', 'and <code>about</code> as the Name', { at: '/mnt/overlay/wcm/core/content/sites/createpagewizard.html', next: true }),
        step('#cpw-create', 'دوس <b>Create</b>.', 'Press <b>Create</b>.', { at: '/mnt/overlay/wcm/core/content/sites/createpagewizard.html' }),
      ],
    },
    {
      t: L('افتح الصفحة في الـ editor', 'Open the page in the editor'), ok: () => !!S.events['editor:' + ABOUT],
      guide: [
        step('.modal button ~ Open', 'لو لسه الـ Success dialog مفتوح دوس <b>Open</b>. لو لأ، دوس "التالي".', 'If the Success dialog is still open press <b>Open</b>; otherwise press Next.', { next: true, skip: () => !document.querySelector('.modal') }),
        step(`.ci-thumb[data-path="${ABOUT}"]`, 'دوس على الصورة الصغيرة جنب <b>About</b> عشان تختارها.', 'Click the thumbnail next to <b>About</b> to select it.', { at: '/sites.html/content/wknd/us/en' }),
        step('.selbar [data-act="pageEdit"]', 'دوس <b>Edit</b>.', 'Press <b>Edit</b>.', { at: '/sites.html' }),
      ],
    },
    { t: L('جرّب <b>Preview</b> في الـ editor', 'Try <b>Preview</b> in the editor'), ok: () => F('editor:preview'), guide: [step('.ed-bar [data-act="edMode"][data-mode="preview"]', 'دوس <b>Preview</b> فوق على اليمين. ودوس تاني عشان ترجع للـ Edit.', 'Press <b>Preview</b> at the top right; press it again to go back to Edit.', { at: '/editor.html', go: '/editor.html' + ABOUT + '.html' })] },
    { t: L('افتح الصفحة "زي ما هتتنشر": <code>/content/wknd/us/en/about.html</code>', 'Open the page "as published": <code>/content/wknd/us/en/about.html</code>'), ok: () => F('view:author'), guide: [
      step('.ed-bar summary[title="Page Information"]', 'في الـ editor دوس على أيقونة <b>Page Information</b> (التانية من الشمال).', 'In the editor click the <b>Page Information</b> icon (second from the left).', { at: '/editor.html', go: '/editor.html' + ABOUT + '.html' }),
      step('[data-act="edViewPublished"]', 'اختار <b>View as Published</b>.', 'Choose <b>View as Published</b>.', { at: '/editor.html' }),
    ] },
    { t: L('لاقي الصفحة في CRXDE: <code>/content/wknd/us/en/about/jcr:content</code>', 'Find it in CRXDE: <code>/content/wknd/us/en/about/jcr:content</code>'), ok: () => crxSeen(p => p === ABOUT + '/jcr:content'), guide: [step(`.ct-row[data-path="${ABOUT}/jcr:content"] .ct-name`, 'دوس على <b>jcr:content</b> بتاع about وبص على <code>cq:template</code>: ده الـ template اللي اخترته.', 'Click about\'s <b>jcr:content</b> and look at <code>cq:template</code>: the template you picked.', { at: '/crx/de', go: `/crx/de/index.jsp#${ABOUT}/jcr:content` })] },
  ],
  quiz: [
    { q: L('عايز تفتح Properties صفحة من الـ Sites console. أول خطوة؟', 'To open a page\'s Properties from Sites, first you…'), a: [L('تدوس على اسمها', 'click its name'), L('تدوس على الـ thumbnail عشان تختارها', 'click its thumbnail to select it'), L('دبل كليك', 'double-click it')], c: 1, why: L('الدوسة على الاسم بتفتح العمود، والـ thumbnail بيختار ويظهر الـ actions.', 'Clicking the name opens the column; the thumbnail selects it and shows actions.') },
    { q: L('Title = "Our Team"، والـ Name سايبه فاضي. الـ URL هيبقى؟', 'Title "Our Team", Name left empty. The URL becomes?'), a: [L('<code>our-team.html</code>', '<code>our-team.html</code>'), L('<code>Our Team.html</code>', '<code>Our Team.html</code>'), L('<code>page1.html</code>', '<code>page1.html</code>')], c: 0, why: L('AEM بيولّد الـ Name من الـ Title: حروف صغيرة و- بدل المسافات.', 'AEM generates the name from the title: lower case, dashes for spaces.') },
    { q: L('حالة <b>Modified</b> معناها؟', 'What does <b>Modified</b> mean?'), a: [L('اتمسحت', 'It was deleted'), L('اتعدّلت بعد آخر Publish', 'Changed since the last publish'), L('مقفولة', 'It is locked')], c: 1, why: L('يعني الـ Publish عنده نسخة أقدم من اللي على الـ Author.', 'Publish has an older version than Author.') },
  ],
});

lesson({
  id: 'pageprops', level: 1, num: '1.5', video: '#9', time: 20,
  title: L('Page properties & page operations', 'Page properties & page operations'),
  goal: L('هتغيّر خصائص الصفحة وتشوف أثرها، وتعمل Copy/Move/Delete/Lock صح.', 'You will change page properties and see their effect, and copy, move, delete and lock pages safely.'),
  learn: L(`
<h4>Page Properties = properties على jcr:content</h4>
<p>كل خانة في Page Properties بتتحفظ property على <code>jcr:content</code> بتاع الصفحة:</p>
<table class="ls-table">
<tr><th>الخانة</th><th>الـ property</th><th>بتأثر على</th></tr>
<tr><td>Title</td><td><code>jcr:title</code></td><td>العنوان في الصفحة وفي الـ console</td></tr>
<tr><td>Navigation Title</td><td><code>navTitle</code></td><td>الاسم في الـ menu (لو عايزه أقصر)</td></tr>
<tr><td>Hide in Navigation</td><td><code>hideInNav</code></td><td>الصفحة تختفي من الـ menu بس تفضل شغالة</td></tr>
<tr><td>Page Title</td><td><code>pageTitle</code></td><td>الـ &lt;title&gt; في المتصفح و SEO</td></tr>
<tr><td>Vanity URL</td><td><code>sling:vanityPath</code></td><td>URL قصير زي <code>/about</code></td></tr>
</table>
<h4>عمليات الصفحات</h4>
<ul><li><b>Copy / Paste</b>: نسخة جديدة مستقلة (من غير ما تتنشر).</li>
<li><b>Move</b>: نقل أو تغيير الاسم. AEM بيعدّل الـ references اللي بتشاور على الصفحة، ولو كانت منشورة لازم تنشرها تاني.</li>
<li><b>Delete</b>: لو الصفحة منشورة لازم Unpublish الأول، وإلا هتفضل ظاهرة على الموقع.</li>
<li><b>Lock</b>: محدش غيرك يقدر يعدّلها لحد ما تعمل Unlock. مفيد لما اتنين بيشتغلوا على نفس الصفحة.</li></ul>`, `
<h4>Page Properties = properties on jcr:content</h4>
<p>Each field in Page Properties is saved as a property on the page's <code>jcr:content</code>:</p>
<table class="ls-table">
<tr><th>Field</th><th>Property</th><th>Affects</th></tr>
<tr><td>Title</td><td><code>jcr:title</code></td><td>The title on the page and in consoles</td></tr>
<tr><td>Navigation Title</td><td><code>navTitle</code></td><td>The label in menus (if you want it shorter)</td></tr>
<tr><td>Hide in Navigation</td><td><code>hideInNav</code></td><td>Removed from menus, still reachable</td></tr>
<tr><td>Page Title</td><td><code>pageTitle</code></td><td>The browser &lt;title&gt; and SEO</td></tr>
<tr><td>Vanity URL</td><td><code>sling:vanityPath</code></td><td>A short URL like <code>/about</code></td></tr>
</table>
<h4>Page operations</h4>
<ul><li><b>Copy / Paste</b>: a new independent copy (not published).</li>
<li><b>Move</b>: move or rename. AEM updates references to the page; if it was published, publish it again.</li>
<li><b>Delete</b>: if the page is published, unpublish first or it stays on the site.</li>
<li><b>Lock</b>: nobody else can edit it until you unlock — useful when two people work on one page.</li></ul>`),
  terms: [
    ['navTitle', L('عنوان مختصر للـ navigation.', 'Short title for navigation.')],
    ['hideInNav', L('Boolean بيخفي الصفحة من الـ menus.', 'Boolean that hides the page from menus.')],
    ['Vanity URL', L('URL بديل وقصير للصفحة.', 'An alternative short URL for the page.')],
  ],
  real: L('<ul><li>قبل Move أو Delete لصفحة مهمة، بص على <b>References</b> (من قايمة Content Only) عشان تعرف مين بيشاور عليها.</li><li>متنساش Unpublish قبل الـ Delete — دي غلطة مشهورة بتخلّي صفحات "ميتة" على الموقع.</li></ul>',
    '<ul><li>Before moving or deleting an important page, check <b>References</b> (Content Only menu) to see what links to it.</li><li>Don\'t forget to unpublish before deleting — a classic mistake that leaves "dead" pages online.</li></ul>'),
  tasks: [
    {
      t: L('في Properties بتاعة about: خلّي <b>Navigation Title</b> = <code>About Us</code>، وشوف الـ menu', 'In about\'s Properties set <b>Navigation Title</b> to <code>About Us</code> and look at the menu'),
      why: L('الـ Navigation component بيقرا <code>navTitle</code> لو موجود بدل <code>jcr:title</code>.', 'The Navigation component reads <code>navTitle</code> when present instead of <code>jcr:title</code>.'),
      ok: () => !!pageProp(ABOUT, 'navTitle'),
      guide: [
        sitesPath('/content/wknd', 'افتح <b>WKND Sites Project</b>.', 'Open <b>WKND Sites Project</b>.'),
        sitesPath('/content/wknd/us', 'وبعدين <b>United States</b>.', 'Then <b>United States</b>.'),
        sitesPath('/content/wknd/us/en', 'وبعدين <b>WKND Adventures</b>.', 'Then <b>WKND Adventures</b>.'),
        step(`.ci-thumb[data-path="${ABOUT}"]`, 'دوس على الصورة الصغيرة جنب <b>About</b> عشان تختارها. (لو مش موجودة، اعمل درس 1.4 الأول.)', 'Click the thumbnail next to <b>About</b> to select it. (Missing? Do lesson 1.4 first.)', { at: '/sites.html/content/wknd/us/en' }),
        step('.selbar [data-act="pageProps"]', 'دوس <b>Properties</b>.', 'Press <b>Properties</b>.', { at: '/sites.html' }),
        step('.modal input[name=navTitle]', 'اكتب في Navigation Title: <code>About Us</code>', 'Type <code>About Us</code> in Navigation Title', { at: '/sites.html', next: true }),
        step('.modal [data-modal=ok]', 'دوس <b>Save &amp; Close</b>.', 'Press <b>Save &amp; Close</b>.', { at: '/sites.html' }),
      ],
    },
    {
      t: L('اخفي <b>Magazine</b> من الـ navigation (Hide in Navigation)', 'Hide <b>Magazine</b> from the navigation (Hide in Navigation)'), ok: () => F('props:hideInNav'),
      guide: [
        step(`.ci-thumb[data-path="${SITE_ROOT}/magazine"]`, 'اختار <b>Magazine</b> من الصورة الصغيرة بتاعتها.', 'Select <b>Magazine</b> with its thumbnail.', { at: '/sites.html/content/wknd/us/en', go: '/sites.html/content/wknd/us/en' }),
        step('.selbar [data-act="pageProps"]', 'دوس <b>Properties</b>.', 'Press <b>Properties</b>.', { at: '/sites.html' }),
        step('.modal input[name=hideInNav]', 'علّم على <b>Hide in Navigation</b>.', 'Tick <b>Hide in Navigation</b>.', { at: '/sites.html' }),
        step('.modal [data-modal=ok]', 'دوس <b>Save &amp; Close</b> وافتح الصفحة الرئيسية: Magazine اختفى من الـ menu.', 'Press <b>Save &amp; Close</b> and open the home page: Magazine is gone from the menu.', { at: '/sites.html' }),
      ],
    },
    { t: L('<b>Copy</b> لصفحة about وبعدين <b>Paste</b> في نفس المكان', '<b>Copy</b> the about page, then <b>Paste</b> it in the same place'), ok: () => F('op:copy'), guide: [
      step(`.ci-thumb[data-path="${ABOUT}"]`, 'اختار <b>About</b>.', 'Select <b>About</b>.', { at: '/sites.html/content/wknd/us/en', go: '/sites.html/content/wknd/us/en' }),
      step('.selbar [data-act="pageCopy"]', 'دوس <b>Copy</b>.', 'Press <b>Copy</b>.', { at: '/sites.html' }),
      step(`.ci[data-path="${SITE_ROOT}"]`, 'دوس على <b>اسم</b> WKND Adventures عشان تقف جوّاها: الـ Paste بيلزق في المكان اللي انت واقف فيه.', 'Click the <b>name</b> WKND Adventures to stand inside it: Paste puts the copy where you are.', { at: '/sites.html' }),
      step('.titlebar [data-act="pagePaste"]', 'دوس <b>Paste</b> فوق: هتتعمل نسخة اسمها <code>about-copy</code>.', 'Press <b>Paste</b> at the top: a copy named <code>about-copy</code> is created.', { at: '/sites.html' }),
    ] },
    { t: L('<b>Move</b> (أو Rename) للنسخة', '<b>Move</b> (or rename) the copy'), ok: () => F('op:move'), guide: [
      step('.ci-thumb[data-path^="/content/wknd/us/en/about-"]', 'اختار النسخة اللي عملتها.', 'Select the copy you made.', { at: '/sites.html/content/wknd/us/en', go: '/sites.html/content/wknd/us/en', skip: copySelected }),
      step('.selbar [data-act="pageMove"]', 'دوس <b>Move</b>.', 'Press <b>Move</b>.', { at: '/sites.html' }),
      step('.modal input[name=name]', 'غيّر الـ Name لـ <code>about-old</code>. خد بالك: ده بيغيّر الـ URL.', 'Change the Name to <code>about-old</code>. Note: this changes the URL.', { at: '/sites.html', next: true }),
      step('.modal [data-modal=ok]', 'دوس <b>Move</b>.', 'Press <b>Move</b>.', { at: '/sites.html' }),
    ] },
    { t: L('<b>Delete</b> للنسخة', '<b>Delete</b> the copy'), ok: () => F('op:delete'), guide: [
      step('.ci-thumb[data-path^="/content/wknd/us/en/about-"]', 'اختار النسخة.', 'Select the copy.', { at: '/sites.html/content/wknd/us/en', go: '/sites.html/content/wknd/us/en', skip: copySelected }),
      step('.selbar [data-act="pageDelete"]', 'دوس <b>Delete</b>.', 'Press <b>Delete</b>.', { at: '/sites.html' }),
      step('.modal [data-modal=ok]', 'أكّد الحذف.', 'Confirm.', { at: '/sites.html' }),
    ] },
    { t: L('<b>Lock</b> صفحة about وبعدين Unlock', '<b>Lock</b> the about page, then unlock it'), ok: () => F('op:lock'), guide: [
      step(`.ci-thumb[data-path="${ABOUT}"]`, 'اختار <b>About</b>.', 'Select <b>About</b>.', { at: '/sites.html/content/wknd/us/en', go: '/sites.html/content/wknd/us/en' }),
      step('.selbar [data-act="pageLock"]', 'دوس <b>Lock</b>. هتلاقي قفل 🔒 جنب اسمها. دوس تاني عشان Unlock.', 'Press <b>Lock</b>; a 🔒 appears next to it. Press again to unlock.', { at: '/sites.html' }),
    ] },
  ],
  quiz: [
    { q: L('عايز الـ menu يكتب "Team" بدل "Meet our amazing team". تغيّر إيه؟', 'You want the menu to say "Team" instead of "Meet our amazing team". Change…'), a: [L('Title', 'Title'), L('Navigation Title', 'Navigation Title'), L('Name', 'Name')], c: 1, why: L('الـ navTitle للـ menus بس، والعنوان الأصلي يفضل زي ما هو.', 'navTitle is only for menus; the main title stays.') },
    { q: L('صفحة منشورة وعايز تمسحها. الترتيب الصح؟', 'A page is published and you want it gone. Correct order?'), a: [L('Delete على طول', 'Delete right away'), L('Unpublish وبعدين Delete', 'Unpublish, then delete'), L('Lock وبعدين Delete', 'Lock, then delete')], c: 1, why: L('من غير Unpublish الصفحة هتفضل على الـ Publish.', 'Without unpublishing it stays on Publish.') },
    { q: L('<code>hideInNav</code> بيعمل إيه؟', 'What does <code>hideInNav</code> do?'), a: [L('بيمسح الصفحة', 'Deletes the page'), L('بيخفيها من الـ menus بس', 'Hides it from menus only'), L('بيمنع الزوار يفتحوها', 'Blocks visitors from opening it')], c: 1, why: L('الصفحة لسه شغالة بالـ URL بتاعها.', 'The page still works at its URL.') },
  ],
});
