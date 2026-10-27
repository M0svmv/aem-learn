/* Level 4 · Publishing & Operations */

const AGENT_URL = '/etc/replication/agents.author/publish.html';
const PKG = '/crx/packmgr/index.jsp';
const ownPkg = () => ((S.pkgs || {}).author || []).find(p => p.source === 'created');

lesson({
  id: 'versions', level: 4, num: '4.1', video: '#16', time: 15,
  title: L('Page versioning', 'Page versioning'),
  goal: L('هتحفظ نسخة من صفحة، تغيّرها، وترجعها للنسخة القديمة.', 'You will save a version of a page, change it, and restore the old version.'),
  learn: L(`
<h4>الـ version</h4>
<p>الـ <b>version</b> عبارة عن snapshot كامل من <code>jcr:content</code> بتاع الصفحة في لحظة معيّنة. بيتخزن في الـ <b>version storage</b> (<code>/jcr:system/jcr:versionStorage</code>) مش تحت الصفحة.</p>
<h4>بتتعمل إمتى؟</h4>
<ul><li>يدوي: Sites ← افتح الصفحة ← <b>Timeline</b> ← <b>Save as Version</b> (وتقدر تكتب Label و Comment).</li>
<li>أوتوماتيك: مع كل <b>Publish</b>، وقبل أي Restore.</li></ul>
<h4>Restore</h4>
<p><b>Revert to this Version</b> بيرجّع محتوى الصفحة للـ snapshot ده. AEM بيعمل version من الوضع الحالي الأول عشان ماتخسرش حاجة.</p>
<h4>بيستخدموها في إيه؟</h4>
<ul><li>ترجع بسرعة لو حد عمل غلطة.</li><li><b>Timewarp</b> (درس 2.2) بيعرض الصفحة من الـ versions.</li><li><b>Compare to version</b> في الـ editor بيوريك الفرق.</li></ul>`, `
<h4>A version</h4>
<p>A <b>version</b> is a full snapshot of the page's <code>jcr:content</code> at a moment, stored in the <b>version storage</b> (<code>/jcr:system/jcr:versionStorage</code>), not under the page.</p>
<h4>When are they created?</h4>
<ul><li>Manually: Sites → open the page → <b>Timeline</b> → <b>Save as Version</b> (with a label and comment).</li>
<li>Automatically: on every <b>publish</b>, and before any restore.</li></ul>
<h4>Restore</h4>
<p><b>Revert to this Version</b> puts the page content back to that snapshot; AEM first saves the current state as a version so nothing is lost.</p>
<h4>Used for</h4>
<ul><li>Quickly undoing mistakes.</li><li><b>Timewarp</b> (lesson 2.2) renders pages from versions.</li><li><b>Compare to version</b> in the editor shows differences.</li></ul>`),
  terms: [['Version storage', L('المكان اللي الـ JCR بيخزن فيه الـ versions.', 'Where the JCR keeps versions.')], ['Purge', L('مسح versions قديمة بـ maintenance task عشان المساحة.', 'Deleting old versions with a maintenance task to save space.')]],
  real: L('<ul><li>الـ versions بتكبر الـ repository؛ فيه <b>Version Purge</b> maintenance task بيمسح القديم حسب عدد/عمر.</li><li>الـ versions للمحتوى بس. الكود بيترجع بـ Git.</li></ul>', '<ul><li>Versions grow the repository; the <b>Version Purge</b> maintenance task removes old ones by count/age.</li><li>Versions are for content; code is rolled back with Git.</li></ul>'),
  tasks: [
    { t: L('Sites ← افتح about ← <b>Timeline</b> ← <b>Save as Version</b>', 'Sites → open about → <b>Timeline</b> → <b>Save as Version</b>'), ok: () => F('version:created'), guide: [
      step(`.ci[data-path="${ABOUT}"]`, 'دوس على <b>اسم</b> About عشان تفتحها.', 'Click the <b>name</b> About to open it.', { at: '/sites.html/content/wknd/us/en', go: '/sites.html/content/wknd/us/en' }),
      step('summary[title="Toggle Side Panel"]', 'افتح <b>Content Only ▾</b>.', 'Open <b>Content Only ▾</b>.', { at: '/sites.html' }),
      step('[data-act="railSet"][data-v="1"]', 'اختار <b>Timeline</b>.', 'Choose <b>Timeline</b>.', { at: '/sites.html' }),
      step('[data-act="verCreate"]', 'دوس <b>Save as Version</b>.', 'Press <b>Save as Version</b>.', { at: '/sites.html' }),
      step('.modal input[name=label]', 'اكتب Label (مثلاً <code>before change</code>).', 'Add a label (e.g. <code>before change</code>).', { at: '/sites.html', next: true }),
      step('.modal [data-modal=ok]', 'دوس <b>Create</b>: الـ version ظهر في الـ Timeline.', 'Press <b>Create</b>: the version shows in the Timeline.', { at: '/sites.html' }),
    ] },
    { t: L('غيّر حاجة في الصفحة (امسح component أو عدّل نص)', 'Change the page (delete a component or edit text)'), ok: () => F('cmp:deleted') || F('dialog:text') || F('dialog:title'), guide: [
      step('frame:[data-cmp*="/title"]', 'اختار الـ Title.', 'Select the Title.', { at: '/editor.html' + ABOUT, go: '/editor.html' + ABOUT + '.html', prep: editMode }),
      step('frame:#lab-tb [data-tb="cfg"]', 'دوس 🔧 وغيّر النص واحفظ.', 'Press 🔧, change the text and save.', { at: '/editor.html' }),
    ] },
    { t: L('<b>Revert to this Version</b> ورجّع الصفحة', '<b>Revert to this Version</b> to restore the page'), ok: () => F('version:restored'), guide: [
      step('[data-act="verRestore"]', 'في الـ Timeline دوس <b>Revert to this Version</b> جنب النسخة اللي عملتها، وأكّد.', 'In the Timeline press <b>Revert to this Version</b> on your version.', { at: '/sites.html' + ABOUT, go: '/sites.html' + ABOUT }),
      step('.modal [data-modal=ok]', 'أكّد.', 'Confirm.', { at: '/sites.html' }),
    ] },
  ],
  quiz: [
    { q: L('الـ versions متخزنة فين؟', 'Where are versions stored?'), a: [L('تحت الصفحة', 'Under the page'), L('في الـ version storage', 'In the version storage'), L('على الـ Publish', 'On Publish')], c: 1, why: L('/jcr:system/jcr:versionStorage.', '/jcr:system/jcr:versionStorage.') },
    { q: L('Restore بيمسح الوضع الحالي نهائي؟', 'Does a restore lose the current state?'), a: [L('أيوه', 'Yes'), L('لأ، بيتعمله version الأول', 'No, it is versioned first'), L('بس لو منشورة', 'Only if published')], c: 1, why: L('AEM بيحفظه version قبل الـ restore.', 'AEM saves it as a version before restoring.') },
  ],
});

lesson({
  id: 'replication', level: 4, num: '4.2', video: '#17', time: 35,
  title: L('Replication & the Dispatcher', 'Replication & the Dispatcher'),
  goal: L('هتفهم رحلة الصفحة من Author للزائر، وتحل مشاكل الـ queue والـ cache بنفسك.', 'You will follow a page from Author to the visitor and fix queue and cache problems yourself.'),
  learn: L(`
<h4>الرحلة كاملة</h4>
<pre class="ls-diagram">[Author]  Publish ▶ Replication Agent ──HTTP POST──▶ [Publish] /bin/receive
                   (queue)                              │
                                                        ▼ Flush Agent
[Visitor] ──▶ [Dispatcher] cache? ─HIT─▶ ملف من الـ cache
                         └─MISS─▶ يطلب من Publish ويخزّنه</pre>
<h4>Replication agent (على الـ Author)</h4>
<p>الـ <b>Default Agent</b> في <code>/etc/replication/agents.author/publish</code>: بيبعت المحتوى للـ Publish على <code>transportUri</code> (مثلاً <code>http://localhost:4503/bin/receive</code>). كل طلب بيدخل <b>queue</b>. لو الـ Publish واقع أو الـ agent disabled، الطلبات بتفضل مستنية في الـ queue ومحدش بيخسرها، ولما يرجع بتتبعت بالترتيب.</p>
<h4>Dispatcher</h4>
<p>الـ <b>Dispatcher</b> module على Apache قدّام الـ Publish، ليه 3 وظايف:</p>
<ul><li><b>Cache</b>: بيخزن الـ HTML والصور كملفات. أول طلب MISS، والتاني HIT وسريع جداً.</li>
<li><b>Security (filters)</b>: بيمنع الزوار يوصلوا لـ <code>/crx/de</code> و<code>/system/console</code> و <code>.infinity.json</code>…</li>
<li><b>Load balancing</b> بين أكتر من Publish.</li></ul>
<h4>Cache invalidation</h4>
<p>لما صفحة تتنشر، الـ <b>Dispatcher Flush agent</b> على الـ Publish بيبعت للـ Dispatcher "امسح الـ cache بتاع الصفحة دي". لو الـ flush agent واقف، الزوار هيشوفوا النسخة القديمة (stale) — ودي من أشهر مشاكل الـ production.</p>`, `
<h4>The whole journey</h4>
<pre class="ls-diagram">[Author]  Publish ▶ Replication Agent ──HTTP POST──▶ [Publish] /bin/receive
                   (queue)                              │
                                                        ▼ Flush Agent
[Visitor] ──▶ [Dispatcher] cached? ─HIT─▶ file from cache
                         └─MISS─▶ ask Publish, store it</pre>
<h4>Replication agent (on Author)</h4>
<p>The <b>Default Agent</b> in <code>/etc/replication/agents.author/publish</code> sends content to Publish at <code>transportUri</code> (e.g. <code>http://localhost:4503/bin/receive</code>). Each request enters a <b>queue</b>. If Publish is down or the agent disabled, requests wait in the queue — nothing is lost — and go out in order when it is back.</p>
<h4>Dispatcher</h4>
<p>The <b>Dispatcher</b> Apache module in front of Publish has 3 jobs:</p>
<ul><li><b>Cache</b>: stores HTML and images as files. First request MISS, second HIT and very fast.</li>
<li><b>Security (filters)</b>: blocks <code>/crx/de</code>, <code>/system/console</code>, <code>.infinity.json</code>…</li>
<li><b>Load balancing</b> across Publish instances.</li></ul>
<h4>Cache invalidation</h4>
<p>When a page is published, the <b>Dispatcher Flush agent</b> on Publish tells the Dispatcher to drop that page from cache. If the flush agent is down, visitors see the old (stale) version — one of the most common production issues.</p>`),
  terms: [
    ['transportUri', L('العنوان اللي الـ agent بيبعت عليه.', 'Where the agent sends content.')],
    ['Queue', L('طابور طلبات الـ replication المستنية.', 'Pending replication requests.')],
    ['Flush / Invalidation', L('مسح صفحة من cache الـ Dispatcher بعد النشر.', 'Removing a page from the Dispatcher cache after publishing.')],
    ['dispatcher.any', L('ملف إعدادات الـ Dispatcher (filters، cache rules).', 'The Dispatcher config (filters, cache rules).')],
  ],
  real: L('<ul><li>في AEM as a Cloud Service مفيش agents بالشكل ده: بيستخدم <b>Sling Content Distribution</b>، والـ CDN بيتعمله purge أوتوماتيك.</li><li>إعدادات الـ Dispatcher في المشروع في module اسمه <code>dispatcher</code> وبتتعمل deploy مع الكود.</li><li>"الصفحة مش بتتحدث على الموقع" = اتأكد بالترتيب: الـ queue ← الـ Publish ← الـ flush agent ← الـ cache.</li></ul>',
    '<ul><li>AEM as a Cloud Service has no agents like this: it uses <b>Sling Content Distribution</b> and purges the CDN automatically.</li><li>Dispatcher config lives in the project\'s <code>dispatcher</code> module and is deployed with code.</li><li>"The page doesn\'t update on the site" → check in order: queue → Publish → flush agent → cache.</li></ul>'),
  tasks: [
    { t: L('انشر صفحة about (Quick Publish) وافتحها من تاب <b>Publish</b>', 'Publish the about page (Quick Publish) and open it in the <b>Publish</b> tab'), ok: () => !!S.events['viewpub:' + ABOUT], guide: [
      step(`.ci-thumb[data-path="${ABOUT}"]`, 'اختار About.', 'Select About.', { at: '/sites.html/content/wknd/us/en', go: '/sites.html/content/wknd/us/en' }),
      step('.selbar summary ~ Manage Publication', 'افتح <b>Manage Publication</b>.', 'Open <b>Manage Publication</b>.', { at: '/sites.html' }),
      step('[data-act="pagePublish"]', 'اختار <b>Quick Publish</b>.', 'Choose <b>Quick Publish</b>.', { at: '/sites.html' }),
      step('.addr input[name=url]', 'في تاب Publish اكتب <code>/content/wknd/us/en/about.html</code>.', 'In the Publish tab type <code>/content/wknd/us/en/about.html</code>.', { tab: 'publish', next: true }),
    ] },
    { t: L('Default Agent ← <b>Test Connection</b>', 'Default Agent → <b>Test Connection</b>'), ok: () => F('agent:test:author'), guide: [step('[data-act="agentTest"]', 'دوس <b>Test Connection</b> وبص على الـ log.', 'Press <b>Test Connection</b> and read the log.', { at: '/etc/replication', go: AGENT_URL })] },
    { t: L('اعمل <b>Disable</b> للـ agent، وانشر تعديل: الـ queue هيقف', '<b>Disable</b> the agent and publish a change: the queue blocks'), ok: () => F('queue:blocked'), guide: [
      step('[data-act="agentEdit"]', 'دوس <b>Edit</b>.', 'Press <b>Edit</b>.', { at: '/etc/replication', go: AGENT_URL }),
      step('.modal input[name=enabled]', 'شيل علامة <b>Enabled</b>.', 'Untick <b>Enabled</b>.', { at: '/etc/replication', next: true }),
      step('.modal [data-modal=ok]', 'احفظ. دلوقتي عدّل أي صفحة وانشرها (Quick Publish) وارجع هنا: هتلاقي الطلب واقف في الـ queue.', 'Save. Now edit and quick-publish any page and come back: the request waits in the queue.', { at: '/etc/replication' }),
    ] },
    { t: L('اعمله <b>Enable</b> تاني والتعديل هيوصل', '<b>Enable</b> it again and the change goes through'), ok: () => F('queue:resumed'), guide: [
      step('[data-act="agentEdit"]', 'دوس <b>Edit</b>.', 'Press <b>Edit</b>.', { at: '/etc/replication', go: AGENT_URL }),
      step('.modal input[name=enabled]', 'علّم على <b>Enabled</b>.', 'Tick <b>Enabled</b>.', { at: '/etc/replication', next: true }),
      step('.modal [data-modal=ok]', 'احفظ: الـ queue هيفضى والتعديل يوصل للـ Publish.', 'Save: the queue drains and the change reaches Publish.', { at: '/etc/replication' }),
    ] },
    { t: L('افتح الصفحة من تاب <b>Dispatcher</b> مرتين (MISS وبعدين HIT)', 'Open the page in the <b>Dispatcher</b> tab twice (MISS then HIT)'), ok: () => F('dispatcher:hit'), guide: [step('.addr input[name=url]', 'اكتب <code>/content/wknd/us/en/about.html</code> وEnter، وبعدين Enter تاني.', 'Type <code>/content/wknd/us/en/about.html</code>, Enter, then Enter again.', { tab: 'dispatcher', next: true })] },
    { t: L('على Publish: <b>Disable</b> للـ flush agent، انشر تعديل، وشوف الـ Dispatcher بيعرض القديم', 'On Publish <b>disable</b> the flush agent, publish a change, and see the Dispatcher serve the old one'), ok: () => F('dispatcher:stale'), guide: [
      step('[data-act="agentEdit"]', 'على الـ Publish: دوس <b>Edit</b> في الـ flush agent.', 'On Publish press <b>Edit</b> on the flush agent.', { tab: 'publish', at: '/etc/replication', go: '/etc/replication/agents.publish/flush.html' }),
      step('.modal input[name=enabled]', 'شيل <b>Enabled</b>.', 'Untick <b>Enabled</b>.', { tab: 'publish', at: '/etc/replication', next: true }),
      step('.modal [data-modal=ok]', 'احفظ. بعدين من Author عدّل about وانشرها، وافتحها في تاب Dispatcher: لسه القديمة! (ارجع فعّل الـ agent بعدها.)', 'Save. Then on Author change about and publish it, and open it in the Dispatcher tab: still the old one! (Re-enable the agent afterwards.)', { tab: 'publish', at: '/etc/replication' }),
    ] },
    { t: L('جرّب <code>/crx/de/index.jsp</code> من تاب Dispatcher: هيتمنع', 'Try <code>/crx/de/index.jsp</code> in the Dispatcher tab: blocked'), ok: () => F('dispatcher:blocked'), guide: [step('.addr input[name=url]', 'اكتب <code>/crx/de/index.jsp</code>. وجرّب كمان <code>/content/wknd/us/en.infinity.json</code>.', 'Type <code>/crx/de/index.jsp</code>. Also try <code>/content/wknd/us/en.infinity.json</code>.', { tab: 'dispatcher', next: true })] },
  ],
  quiz: [
    { q: L('الـ Publish وقع ساعة والـ authors نشروا 20 صفحة. إيه اللي حصل للصفحات؟', 'Publish was down for an hour while authors published 20 pages. What happened?'), a: [L('ضاعت', 'Lost'), L('مستنية في الـ queue وهتتبعت لما يرجع', 'Waiting in the queue, sent when it is back'), L('اتنشرت على الـ Dispatcher', 'Published to the Dispatcher')], c: 1, why: L('الـ queue بيحفظ الطلبات بالترتيب.', 'The queue keeps requests in order.') },
    { q: L('الصفحة اتنشرت وموجودة على Publish بس الزوار شايفين القديمة. أول حاجة تشك فيها؟', 'A page is on Publish but visitors see the old one. First suspect?'), a: [L('الـ Author', 'Author'), L('الـ Dispatcher flush (cache قديم)', 'Dispatcher flush (stale cache)'), L('الـ template', 'The template')], c: 1, why: L('الـ Dispatcher لسه بيقدّم النسخة المتخزنة.', 'The Dispatcher still serves its cached copy.') },
    { q: L('ليه <code>/crx/de</code> بيتمنع من الـ Dispatcher؟', 'Why is <code>/crx/de</code> blocked at the Dispatcher?'), a: [L('عشان الـ cache', 'For caching'), L('عشان الأمان: filters بتقفل الأدوات الداخلية', 'Security: filters block internal tools'), L('عشان مش موجود على Publish', 'It doesn\'t exist on Publish')], c: 1, why: L('الـ filters أول خط دفاع.', 'Filters are the first line of defence.') },
  ],
});

lesson({
  id: 'workflow', level: 4, num: '4.3', video: '#18', time: 30,
  title: L('Workflows', 'Workflows'),
  goal: L('هتشغّل workflow موافقة، وتبني workflow model بنفسك وتشغّله.', 'You will run an approval workflow, then build and run your own workflow model.'),
  learn: L(`
<h4>الـ workflow</h4>
<p>الـ <b>workflow</b> سلسلة خطوات بتمشي على <b>payload</b> (غالباً صفحة أو asset). أمثلة: "صفحة لازم المدير يوافق عليها قبل النشر"، "أي صورة تترفع تتعمل لها renditions".</p>
<h4>أنواع الخطوات</h4>
<ul><li><b>Participant Step</b>: بتستنى إنسان. بتظهر في الـ 🔔 <b>Inbox</b> بتاعه، وهو يعمل Complete أو Reject.</li>
<li><b>Process Step</b>: بتنفّذ كود (Java) أوتوماتيك، مثلاً <i>Activate Page</i>.</li>
<li>وفيه كمان OR/AND splits و Goto وغيرهم.</li></ul>
<h4>Model: design و runtime</h4>
<pre class="ls-diagram">/conf/global/settings/workflow/models/my-approval     ← design (بتعدّل هنا)
            │  Sync
            ▼
/var/workflow/models/my-approval                      ← runtime (اللي بيشتغل فعلاً)</pre>
<p>لازم تدوس <b>Sync</b> بعد أي تعديل في الـ model، وإلا الـ runtime يفضل بالنسخة القديمة.</p>
<h4>Instances و Launchers</h4>
<p>كل تشغيل اسمه <b>instance</b> (Tools ← Workflow ← Instances) وليه history. والـ <b>Launchers</b> بيشغّلوا workflows أوتوماتيك على events (زي رفع asset).</p>`, `
<h4>A workflow</h4>
<p>A <b>workflow</b> is a chain of steps run on a <b>payload</b> (usually a page or asset). Examples: "a manager approves a page before publishing", "every uploaded image gets renditions".</p>
<h4>Step types</h4>
<ul><li><b>Participant Step</b>: waits for a person. It appears in their 🔔 <b>Inbox</b>; they Complete or Reject.</li>
<li><b>Process Step</b>: runs code (Java) automatically, e.g. <i>Activate Page</i>.</li>
<li>Plus OR/AND splits, Goto and more.</li></ul>
<h4>Model: design and runtime</h4>
<pre class="ls-diagram">/conf/global/settings/workflow/models/my-approval     ← design (you edit here)
            │  Sync
            ▼
/var/workflow/models/my-approval                      ← runtime (what actually runs)</pre>
<p>Press <b>Sync</b> after every model change, or the runtime keeps the old version.</p>
<h4>Instances and launchers</h4>
<p>Each run is an <b>instance</b> (Tools → Workflow → Instances) with history. <b>Launchers</b> start workflows automatically on events (like an asset upload).</p>`),
  terms: [['Payload', L('الحاجة اللي الـ workflow بيشتغل عليها.', 'What the workflow runs on.')], ['Participant / Process step', L('خطوة إنسان / خطوة كود.', 'A human step / a code step.')], ['Sync', L('نسخ الـ design model للـ runtime.', 'Copies the design model to runtime.')]],
  real: L('<ul><li>الـ Process steps المخصوصة بتتكتب كـ <code>WorkflowProcess</code> في Java في الـ core module.</li><li>Workflows كتير شغالة على الـ Author ممكن تبطّأه؛ استخدم transient workflows للحاجات الأوتوماتيك.</li></ul>', '<ul><li>Custom process steps are Java <code>WorkflowProcess</code> classes in the core module.</li><li>Many running workflows can slow Author; use transient workflows for automated work.</li></ul>'),
  tasks: [
    { t: L('Sites ← صفحة ← Create ▾ ← <b>Workflow</b> ← Request for Activation', 'Sites → a page → Create ▾ → <b>Workflow</b> → Request for Activation'), ok: () => F('wf:started'), guide: [
      step(`.ci-thumb[data-path="${ABOUT}"]`, 'اختار About.', 'Select About.', { at: '/sites.html/content/wknd/us/en', go: '/sites.html/content/wknd/us/en' }),
      step('.selbar summary.qa ~ Create', 'دوس <b>Create</b> في الشريط.', 'Press <b>Create</b> in the bar.', { at: '/sites.html' }),
      step('[data-act="wfStartDlg"]', 'اختار <b>Workflow</b>.', 'Choose <b>Workflow</b>.', { at: '/sites.html' }),
      step('.modal select[name=model]', 'اختار model <b>Request for Activation</b> (واكتب Title لو حابب).', 'Pick the <b>Request for Activation</b> model (and a title if you like).', { at: '/sites.html', next: true }),
      step('.modal [data-modal=ok]', 'دوس <b>Start</b>. المهمة هتروح للـ Inbox.', 'Press <b>Start</b>. A task goes to the Inbox.', { at: '/sites.html' }),
    ] },
    { t: L('افتح 🔔 <b>Inbox</b> واعمل <b>Complete</b>', 'Open 🔔 <b>Inbox</b> and press <b>Complete</b>'), ok: () => F('wf:completed:request_for_activation'), guide: [step('[data-act="inboxComplete"]', 'دوس <b>Complete</b> على المهمة.', 'Press <b>Complete</b> on the task.', { at: '/aem/inbox', go: '/aem/inbox' }),
      step('.modal [data-modal=ok]', 'اكتب comment لو حابب ودوس <b>Complete</b>: الصفحة هتتنشر.', 'Add a comment if you like and press <b>Complete</b>: the page gets published.', { at: '/aem/inbox' }),
    ] },
    { t: L('Tools ← Workflow ← Models ← <b>Create</b>: model فيه Participant Step و Process Step (Activate Page)', 'Tools → Workflow → Models → <b>Create</b>: a model with a Participant Step and a Process Step (Activate Page)'), ok: customModelWithBothSteps, guide: [
      step('[data-act="wfCreate"]', 'دوس <b>Create</b> واكتب اسم.', 'Press <b>Create</b> and name it.', { at: WF_MODELS_URL, go: WF_MODELS_URL }),
      step('[data-act="wfStepAdd"]', 'ضيف <b>Participant Step</b> و<b>Process Step</b> واختار للـ process <b>Activate Page</b>.', 'Add a <b>Participant Step</b> and a <b>Process Step</b>; set the process to <b>Activate Page</b>.', { at: '/editor.html/conf/global/settings/workflow/models/' }),
    ] },
    { t: L('دوس <b>Sync</b>', 'Press <b>Sync</b>'), why: L('من غير Sync الـ model مش هيظهر في Start Workflow.', 'Without Sync the model won\'t appear in Start Workflow.'), ok: () => F('wf:custom:synced'), guide: [step('[data-act="wfSync"]', 'دوس <b>Sync</b> فوق.', 'Press <b>Sync</b> at the top.', { at: '/editor.html/conf/global/settings/workflow/models/' })] },
    { t: L('شغّل الـ model بتاعك على صفحة لحد ما يخلص', 'Run your model on a page to completion'), ok: () => F('wf:custom:completed') },
    { t: L('افتح Tools ← Workflow ← <b>Instances</b> وشوف الـ History', 'Open Tools → Workflow → <b>Instances</b> and the History'), ok: () => F('visit:wf-instances'), guide: [step('[data-act="wfHistory"]', 'دوس <b>History</b> على أي instance.', 'Press <b>History</b> on any instance.', { at: WF_INSTANCES_URL, go: WF_INSTANCES_URL })] },
  ],
  quiz: [
    { q: L('عدّلت model ومش لاقي التعديل لما تشغّله. ليه؟', 'You edited a model but runs don\'t reflect it. Why?'), a: [L('نسيت Sync', 'You forgot Sync'), L('محتاج restart', 'Needs a restart'), L('الـ Inbox مليان', 'Inbox is full')], c: 0, why: L('الـ runtime نسخة منفصلة بتتحدث بـ Sync.', 'The runtime is a separate copy updated by Sync.') },
    { q: L('خطوة "المدير يوافق" نوعها إيه؟', '"Manager approves" is which step type?'), a: [L('Process', 'Process'), L('Participant', 'Participant'), L('Launcher', 'Launcher')], c: 1, why: L('Participant = إنسان.', 'Participant = a human.') },
  ],
});

lesson({
  id: 'packages', level: 4, num: '4.4', time: 35,
  title: L('Package Manager & content packages', 'Package Manager & content packages'),
  goal: L('هتعمل package وتبنيه وتستعيد منه، وترفع مشروع Maven حقيقي، وتفهم filter modes.', 'You will build and restore a package, upload a real Maven project, and understand filter modes.'),
  learn: L(`
<h4>الـ content package</h4>
<p>ملف <b>.zip</b> بيحمل جزء من الـ JCR (content أو code) عشان ينتقل بين instances. ده الـ format اللي Maven بيطلّعه لمشروعك، واللي الـ deploy بيستخدمه.</p>
<pre class="ls-diagram">about-backup-1.0.zip
├── META-INF/vault/
│   ├── properties.xml     name, group, version
│   └── filter.xml         ← الـ paths اللي الـ package مسؤول عنها
└── jcr_root/
    └── content/wknd/us/en/about/.content.xml   ← الـ nodes كـ XML</pre>
<h4>filter.xml و الـ modes</h4>
<table class="ls-table">
<tr><th>Mode</th><th>بيعمل إيه</th><th>مستخدم في</th></tr>
<tr><td><b>replace</b> (default)</td><td>المحتوى بيبقى زي الـ package بالظبط، وأي حاجة زيادة بتتمسح</td><td>ui.apps (الكود)</td></tr>
<tr><td><b>merge</b></td><td>بيضيف الجديد بس، مابيغيّرش الموجود</td><td>ui.content (محتوى مبدئي)</td></tr>
<tr><td><b>update</b></td><td>بيضيف ويعدّل، مابيمسحش</td><td>حالات خاصة</td></tr>
</table>
<h4>الدورة</h4>
<p><b>Create</b> ← <b>Edit (Filters)</b> ← <b>Build</b> (ياخد snapshot من الـ JCR) ← <b>Download</b> ← على instance تانية <b>Upload</b> ← <b>Install</b>. و<b>Uninstall</b> بيرجّع الحالة اللي قبل الـ install.</p>
<h4>مشروع الـ archetype</h4>
<p><code>mvn clean install</code> بيطلّع <b>wknd.all.zip</b>، وجوّاه sub packages: ui.apps، ui.config، ui.content. ده نفس اللي بيتعمل upload لـ AEM.</p>`, `
<h4>A content package</h4>
<p>A <b>.zip</b> carrying part of the JCR (content or code) between instances. It is what Maven builds for your project and what deployments use.</p>
<pre class="ls-diagram">about-backup-1.0.zip
├── META-INF/vault/
│   ├── properties.xml     name, group, version
│   └── filter.xml         ← the paths the package owns
└── jcr_root/
    └── content/wknd/us/en/about/.content.xml   ← nodes as XML</pre>
<h4>filter.xml and modes</h4>
<table class="ls-table">
<tr><th>Mode</th><th>Effect</th><th>Used in</th></tr>
<tr><td><b>replace</b> (default)</td><td>Content becomes exactly the package; extras are removed</td><td>ui.apps (code)</td></tr>
<tr><td><b>merge</b></td><td>Only adds new nodes, never changes existing ones</td><td>ui.content (starter content)</td></tr>
<tr><td><b>update</b></td><td>Adds and overwrites, never removes</td><td>Special cases</td></tr>
</table>
<h4>The cycle</h4>
<p><b>Create</b> → <b>Edit (Filters)</b> → <b>Build</b> (snapshot the JCR) → <b>Download</b> → on another instance <b>Upload</b> → <b>Install</b>. <b>Uninstall</b> returns to the state before install.</p>
<h4>The archetype project</h4>
<p><code>mvn clean install</code> produces <b>wknd.all.zip</b> with sub packages: ui.apps, ui.config, ui.content — exactly what gets uploaded to AEM.</p>`),
  terms: [['FileVault', L('الـ format والأداة اللي بتحوّل JCR ↔ ملفات.', 'The format/tool converting JCR ↔ files.')], ['filter.xml', L('بيحدد الـ roots والـ mode لكل واحد.', 'Defines roots and a mode for each.')], ['.content.xml', L('الـ node و properties بتاعته كـ XML.', 'A node and its properties as XML.')]],
  real: L('<ul><li>غلطة مشهورة: ui.content بـ <b>replace</b> على <code>/content/wknd</code> = كل deploy بيمسح شغل الـ authors. عشان كده الـ archetype بيستخدم <b>merge</b>.</li><li>في AEM as a Cloud Service الـ deploy بـ <b>Cloud Manager</b> pipeline مش Package Manager، بس الـ packages هي هي.</li><li>الـ packages أداة ممتازة لنقل محتوى من prod لـ local للـ debugging.</li></ul>',
    '<ul><li>Classic mistake: ui.content with <b>replace</b> on <code>/content/wknd</code> wipes authors\' work on every deploy — that is why the archetype uses <b>merge</b>.</li><li>AEM as a Cloud Service deploys through <b>Cloud Manager</b> pipelines, not Package Manager, but the packages are the same.</li><li>Packages are great for copying prod content to local for debugging.</li></ul>'),
  tasks: [
    { t: L('افتح <b>Package Manager</b>', 'Open <b>Package Manager</b>'), ok: () => F('visit:packmgr'), guide: [step('.lab-shortcuts [data-url="/crx/packmgr/index.jsp"]', 'دوس <b>Package Manager</b> (أو اكتب <code>/crx/packmgr/index.jsp</code>).', 'Click <b>Package Manager</b> (or type <code>/crx/packmgr/index.jsp</code>).', { at: '/aem/start.html' })] },
    { t: L('<b>Create Package</b>: <code>about-backup</code> في group <code>my_packages</code>', '<b>Create Package</b>: <code>about-backup</code> in group <code>my_packages</code>'), ok: () => F('pkg:created'), guide: [
      step('[data-act="pkgCreate"]', 'دوس <b>Create Package</b>.', 'Press <b>Create Package</b>.', { at: PKG, go: PKG }),
      step('.modal input[name=name]', 'اكتب <code>about-backup</code>.', 'Type <code>about-backup</code>.', { at: PKG, next: true }),
      step('.modal [data-modal=ok]', 'دوس OK.', 'Press OK.', { at: PKG }),
    ] },
    { t: L('<b>Edit ← Filters</b>: ضيف <code>/content/wknd/us/en/about</code>', '<b>Edit → Filters</b>: add <code>/content/wknd/us/en/about</code>'), ok: () => ((S.pkgs || {}).author || []).some(p => p.filters.some(f => f.root === ABOUT)), guide: [
      step('[data-act="pkgEdit"]', 'دوس <b>Edit</b> على الـ package بتاعك.', 'Press <b>Edit</b> on your package.', { at: PKG, go: PKG }),
      step('.modal .mtab ~ Filters', 'tab <b>Filters</b>.', 'Tab <b>Filters</b>.', { at: PKG }),
      step('.modal .pf-row input', 'اكتب الـ root: <code>/content/wknd/us/en/about</code>', 'Type the root <code>/content/wknd/us/en/about</code>', { at: PKG, next: true }),
      step('.modal [data-modal=ok]', 'احفظ.', 'Save.', { at: PKG }),
    ] },
    { t: L('<b>Build</b> وشوف الـ Activity Log', '<b>Build</b> and read the Activity Log'), ok: () => F('pkg:built'), guide: [step('[data-act="pkgBuild"]', 'دوس <b>Build</b>.', 'Press <b>Build</b>.', { at: PKG, go: PKG }),
      step('.modal [data-modal=ok]', 'أكّد <b>Build</b> وبص على الـ Activity Log تحت.', 'Confirm <b>Build</b> and read the Activity Log below.', { at: PKG }),
    ] },
    { t: L('امسح about من Sites، وبعدين <b>Install</b> للـ package: الصفحة ترجع', 'Delete about in Sites, then <b>Install</b> the package: the page comes back'), ok: () => F('op:delete') && ((S.pkgs || {}).author || []).some(p => p.source === 'created' && p.installed), guide: [
      step(`.ci-thumb[data-path="${ABOUT}"]`, 'اختار About.', 'Select About.', { at: '/sites.html/content/wknd/us/en', go: '/sites.html/content/wknd/us/en' }),
      step('.selbar [data-act="pageDelete"]', 'دوس <b>Delete</b> وأكّد.', 'Press <b>Delete</b> and confirm.', { at: '/sites.html' }),
      step('[data-act="pkgInstall"]', 'في Package Manager دوس <b>Install</b>.', 'In Package Manager press <b>Install</b>.', { at: PKG, go: PKG }),
      step('.modal [data-modal=ok]', 'أكّد <b>Install</b>: صفحة about رجعت.', 'Confirm <b>Install</b>: the about page is back.', { at: PKG }),
    ] },
    { t: L('<b>Download</b> وافتح الـ zip: <code>jcr_root</code> و <code>filter.xml</code>', '<b>Download</b> and open the zip: <code>jcr_root</code> and <code>filter.xml</code>'), ok: () => F('pkg:downloaded'), guide: [step('[data-act="pkgDownload"]', 'دوس <b>Download</b> وافتح الملف على جهازك.', 'Press <b>Download</b> and open the file on your computer.', { at: PKG, go: PKG })] },
    { t: L('<b>Upload</b> مشروعك الحقيقي <code>wknd.all-1.0.0-SNAPSHOT.zip</code> واعمله Install', '<b>Upload</b> your real <code>wknd.all-1.0.0-SNAPSHOT.zip</code> and install it'), hint: L('<code>&lt;project&gt;\\all\\target\\</code> بعد <code>mvn clean install</code>. وUninstall بيرجّع اللاب زي ما كان.', '<code>&lt;project&gt;\\all\\target\\</code> after <code>mvn clean install</code>. Uninstall restores the lab.'), ok: () => !!S.events['pkg:installed:wknd.all'], guide: [step('[data-act="pkgUpload"]', 'دوس <b>Upload Package</b>، اختار الملف، وعلّم Install.', 'Press <b>Upload Package</b>, pick the file and tick Install.', { at: PKG, go: PKG })] },
    { t: L('في <b>wknd.ui.content</b>: خلّي filter <code>/content/wknd</code> <b>replace</b> واعمل Install، وبعدين <b>Uninstall</b>', 'In <b>wknd.ui.content</b> set the <code>/content/wknd</code> filter to <b>replace</b>, install, then <b>Uninstall</b>'), why: L('هتشوف بعينك ليه الـ archetype بيستخدم merge: replace بيمسح صفحات Adventures و Magazine.', 'You will see why the archetype uses merge: replace deletes Adventures and Magazine.'), ok: () => !!S.events['pkg:mode:replace:/content/wknd'] && F('pkg:uninstalled') },
  ],
  quiz: [
    { q: L('ui.content بـ replace على /content/wknd. أي deploy هيعمل إيه؟', 'ui.content with replace on /content/wknd. Every deploy will…'), a: [L('يضيف بس', 'only add'), L('يمسح أي محتوى عمله الـ authors ومش في الـ package', 'remove author content not in the package'), L('مفيش تأثير', 'have no effect')], c: 1, why: L('replace = يطابق الـ package بالظبط.', 'replace = match the package exactly.') },
    { q: L('عملت Create و Filters بس من غير Build. الـ package فيه إيه؟', 'You created a package and filters but did not build. What is in it?'), a: [L('الـ content', 'The content'), L('ولا حاجة لسه', 'Nothing yet'), L('الكود بس', 'Only code')], c: 1, why: L('الـ Build هو اللي بياخد الـ snapshot.', 'Build takes the snapshot.') },
    { q: L('أنهي ملف بيحدد الـ paths في الـ package؟', 'Which file defines a package\'s paths?'), a: [L('properties.xml', 'properties.xml'), L('filter.xml', 'filter.xml'), L('.content.xml', '.content.xml')], c: 1, why: L('META-INF/vault/filter.xml.', 'META-INF/vault/filter.xml.') },
  ],
});

const MAG = SITE_ROOT + '/magazine';
const isMember = (user, group) => { const g = findAuth(AR(), group); return !!g && (g.node.props['rep:members'] || []).includes(user); };
const userMenu = step('.shell-head summary.avatar', 'افتح قايمة المستخدم 👤 فوق على اليمين.', 'Open the 👤 user menu at the top right.');

lesson({
  id: 'security', level: 4, num: '4.5', time: 40,
  title: L('Users, groups & permissions', 'Users, groups & permissions'),
  goal: L('هتعمل user و group، تديهم صلاحيات صح (ACLs)، وتجرّب الموقع بعين الـ user ده بالـ Impersonate.', 'You will create a user and a group, grant correct permissions (ACLs), and try the site through that user\'s eyes with Impersonate.'),
  learn: L(`
<h4>Users و Groups</h4>
<p>كل حد بيدخل AEM ليه <b>user</b> متخزن في <code>/home/users</code>. والـ users بيتجمعوا في <b>groups</b> (<code>/home/groups</code>، والأعضاء في <code>rep:members</code>). الـ group ممكن يبقى عضو في group تاني، وكل users جوه الـ group <code>everyone</code> أوتوماتيك.</p>
<h4>الصلاحيات = ACLs على الـ paths</h4>
<p>كل صلاحية <b>ACE</b> (Access Control Entry) فيها: principal (user أو group) + privileges + allow/deny، ومتخزنة كـ node تحت <code>&lt;path&gt;/rep:policy</code>:</p>
<pre class="ls-diagram">/content/wknd/rep:policy/allow      rep:GrantACE
    rep:principalName = wknd-editors
    rep:privileges    = [jcr:read, rep:write]
/content/wknd/us/en/magazine/rep:policy/deny   rep:DenyACE
    rep:principalName = wknd-editors
    rep:privileges    = [rep:write]</pre>
<h4>أهم الـ privileges</h4>
<table class="ls-table">
<tr><th>Privilege</th><th>يعني</th></tr>
<tr><td><code>jcr:read</code></td><td>يشوف</td></tr>
<tr><td><code>rep:write</code></td><td>= modifyProperties + addChildNodes + removeNode (يعدّل، يعمل، يمسح)</td></tr>
<tr><td><code>crx:replicate</code></td><td>ينشر (Publish)</td></tr>
<tr><td><code>jcr:readAccessControl / jcr:modifyAccessControl</code></td><td>يشوف / يعدّل الصلاحيات نفسها</td></tr>
<tr><td><code>jcr:all</code></td><td>كل حاجة</td></tr></table>
<h4>إزاي AEM بيقرر؟</h4>
<ol><li>الصلاحية <b>بتتورث لتحت</b>: allow على <code>/content/wknd</code> بتشمل كل الصفحات تحته.</li>
<li>الـ entry <b>الأقرب</b> للـ path هو اللي بيكسب: deny على magazine بيغلب allow على wknd.</li>
<li>على نفس الـ node: entry للـ <b>user</b> بيغلب entry للـ group.</li>
<li>مفيش entry خالص = <b>ممنوع</b>.</li>
<li><code>administrators</code> عندهم كل حاجة.</li></ol>
<h4>Impersonate</h4>
<p>الـ admin يقدر يعمل <b>Impersonate as</b> (من قايمة المستخدم) ويشوف AEM زي الـ user بالظبط: الصفحات المخفية مش بتظهر، والزراير الممنوعة بترفض. ده أحسن طريقة تختبر بيها الصلاحيات قبل ما تسلّم.</p>`, `
<h4>Users and groups</h4>
<p>Everyone who signs in to AEM is a <b>user</b> stored under <code>/home/users</code>. Users are collected in <b>groups</b> (<code>/home/groups</code>, members in <code>rep:members</code>). A group can be a member of another group, and every user is automatically in <code>everyone</code>.</p>
<h4>Permissions = ACLs on paths</h4>
<p>Each <b>ACE</b> (Access Control Entry) has a principal (user or group) + privileges + allow/deny, stored as a node under <code>&lt;path&gt;/rep:policy</code>:</p>
<pre class="ls-diagram">/content/wknd/rep:policy/allow      rep:GrantACE
    rep:principalName = wknd-editors
    rep:privileges    = [jcr:read, rep:write]
/content/wknd/us/en/magazine/rep:policy/deny   rep:DenyACE
    rep:principalName = wknd-editors
    rep:privileges    = [rep:write]</pre>
<h4>Key privileges</h4>
<table class="ls-table">
<tr><th>Privilege</th><th>Means</th></tr>
<tr><td><code>jcr:read</code></td><td>See</td></tr>
<tr><td><code>rep:write</code></td><td>= modifyProperties + addChildNodes + removeNode (edit, create, delete)</td></tr>
<tr><td><code>crx:replicate</code></td><td>Publish</td></tr>
<tr><td><code>jcr:readAccessControl / jcr:modifyAccessControl</code></td><td>Read / change permissions themselves</td></tr>
<tr><td><code>jcr:all</code></td><td>Everything</td></tr></table>
<h4>How AEM decides</h4>
<ol><li>Permissions are <b>inherited downwards</b>: allow on <code>/content/wknd</code> covers every page below it.</li>
<li>The entry <b>closest</b> to the path wins: a deny on magazine beats an allow on wknd.</li>
<li>On the same node, a <b>user</b> entry beats a group entry.</li>
<li>No entry at all = <b>denied</b>.</li>
<li><code>administrators</code> can do everything.</li></ol>
<h4>Impersonate</h4>
<p>An admin can <b>Impersonate as</b> (user menu) and see AEM exactly as that user: hidden pages disappear and forbidden actions are refused. The best way to test permissions before a handover.</p>`),
  terms: [['Principal', L('user أو group بتتدي له صلاحية.', 'A user or group that receives permissions.')], ['ACE / ACL', L('entry واحد / القايمة كلها على node.', 'One entry / the whole list on a node.')], ['rep:policy', L('الـ node اللي فيه الـ ACL.', 'The node holding the ACL.')]],
  real: L('<ul><li>اديّ الصلاحيات لـ <b>groups</b> دايماً، والـ users بس أعضاء.</li><li>الـ authors غالباً من غير <code>crx:replicate</code>: النشر بيعدّي على workflow موافقة.</li><li>في AEMaaCS الـ users بيدخلوا بـ Adobe IMS، والـ groups والـ ACLs بتتعمل كـ code بـ <b>Repo Init</b> (OSGi config) في ui.config.</li></ul>', '<ul><li>Always grant permissions to <b>groups</b>; users are just members.</li><li>Authors usually lack <code>crx:replicate</code>: publishing goes through an approval workflow.</li><li>In AEMaaCS users sign in with Adobe IMS, and groups/ACLs are defined as code with <b>Repo Init</b> (an OSGi config) in ui.config.</li></ul>'),
  tasks: [
    { t: L('Tools ← Security ← <b>Users</b>', 'Tools → Security → <b>Users</b>'), ok: () => F('visit:sec:users'), guide: [
      step('.tool-cats [data-cat="Security"]', 'في Tools اختار <b>Security</b>.', 'In Tools choose <b>Security</b>.', { at: '/aem/tools.html', go: '/aem/tools.html' }),
      step('.tool-card ~ Users', 'دوس <b>Users</b>.', 'Click <b>Users</b>.', { at: '/aem/tools.html' }),
    ] },
    { t: L('اعمل user اسمه <code>sara</code>', 'Create a user <code>sara</code>'), ok: () => !!findAuth(AR(), 'sara'), guide: [
      step('[data-act="secUserCreate"]', 'دوس <b>Create</b>.', 'Press <b>Create</b>.', { at: SEC_USERS, go: SEC_USERS }),
      step('.modal input[name=id]', 'ID: <code>sara</code>، و Password أي حاجة، و First name: Sara.', 'ID <code>sara</code>, any password, first name Sara.', { at: SEC_USERS, next: true }),
      step('.modal [data-modal=ok]', '<b>Save &amp; Close</b>.', '<b>Save &amp; Close</b>.', { at: SEC_USERS }),
    ] },
    { t: L('اعمل group اسمه <code>wknd-editors</code>', 'Create a group <code>wknd-editors</code>'), ok: () => !!findAuth(AR(), 'wknd-editors'), guide: [
      step('[data-act="secGroupCreate"]', 'في Groups دوس <b>Create</b>.', 'In Groups press <b>Create</b>.', { at: SEC_GROUPS, go: SEC_GROUPS }),
      step('.modal input[name=id]', 'ID: <code>wknd-editors</code>', 'ID <code>wknd-editors</code>', { at: SEC_GROUPS, next: true }),
      step('.modal [data-modal=ok]', '<b>Save &amp; Close</b>.', '<b>Save &amp; Close</b>.', { at: SEC_GROUPS }),
    ] },
    { t: L('ضيف sara في <code>wknd-editors</code>', 'Add sara to <code>wknd-editors</code>'), ok: () => isMember('sara', 'wknd-editors'), guide: [
      step('#sec-member', 'اختار <code>sara</code> من القايمة.', 'Pick <code>sara</code> from the list.', { at: SEC_GROUPS + '/wknd-editors', go: SEC_GROUPS + '/wknd-editors', next: true }),
      step('[data-act="secAddMember"]', 'دوس <b>Add member</b>.', 'Press <b>Add member</b>.', { at: SEC_GROUPS + '/wknd-editors' }),
    ] },
    { t: L('Permissions: <code>wknd-editors</code> ← allow <code>jcr:read</code> + <code>rep:write</code> على <code>/content/wknd</code>', 'Permissions: <code>wknd-editors</code> → allow <code>jcr:read</code> + <code>rep:write</code> on <code>/content/wknd</code>'), ok: () => can(AR(), 'sara', SITE_ROOT + '/jcr:content', 'jcr:modifyProperties').ok, guide: [
      step('[data-act="secAddAce"]', 'دوس <b>Add ACE</b>.', 'Press <b>Add ACE</b>.', { at: SEC_PERMS, go: SEC_PERMS + '?p=wknd-editors' }),
      step('.modal input[name=path]', 'Path: <code>/content/wknd</code> (موجود)، Type: Allow.', 'Path <code>/content/wknd</code> (prefilled), Type Allow.', { at: SEC_PERMS, next: true }),
      step('.modal input[name=priv][value="jcr:read"]', 'علّم على <b>Read</b> و <b>Write</b>.', 'Tick <b>Read</b> and <b>Write</b>.', { at: SEC_PERMS, next: true }),
      step('.modal [data-modal=ok]', '<b>Add</b>. الـ ACE اتعمل في <code>/content/wknd/rep:policy</code>.', '<b>Add</b>. The ACE is stored in <code>/content/wknd/rep:policy</code>.', { at: SEC_PERMS }),
    ] },
    { t: L('<b>Test Privileges</b> لـ sara على <code>/content/wknd/us/en</code>', '<b>Test Privileges</b> for sara on <code>/content/wknd/us/en</code>'), ok: () => F('sec:test'), guide: [step('[data-act="secTest"]', 'اختار <b>sara</b> من القايمة على الشمال، ودوس <b>Test Privileges</b>. لاحظ Replicate ✘.', 'Pick <b>sara</b> on the left and press <b>Test Privileges</b>. Note Replicate ✘.', { at: SEC_PERMS, go: SEC_PERMS + '?p=sara' })] },
    { t: L('<b>Impersonate as</b> sara وجرّب Quick Publish: هيترفض', '<b>Impersonate as</b> sara and try Quick Publish: refused'), why: L('sara مالهاش <code>crx:replicate</code>. في الشغل الحقيقي بتعمل Request for Activation والمسؤول يوافق.', 'sara has no <code>crx:replicate</code>. At work she uses Request for Activation and an approver publishes.'), ok: () => F('sec:impersonate') && F('sec:denied:crx:replicate'), guide: [
      userMenu,
      step('[data-act="impersonate"]', 'اختار <b>Impersonate as…</b>.', 'Choose <b>Impersonate as…</b>.'),
      step('.modal select[name=u]', 'اختار <code>sara</code>.', 'Choose <code>sara</code>.', { next: true }),
      step('.modal [data-modal=ok]', 'OK: الشريط الأصفر فوق بيقول إنك sara.', 'OK: the yellow bar says you are sara.'),
      step(`.ci-thumb[data-path="${SITE_ROOT}/adventures"]`, 'اختار صفحة Adventures.', 'Select the Adventures page.', { at: '/sites.html', go: '/sites.html' + SITE_ROOT }),
      step('.selbar summary ~ Manage Publication', 'Manage Publication ←', 'Manage Publication →', { at: '/sites.html' }),
      step('[data-act="pagePublish"]', 'Quick Publish: هتلاقي رسالة الرفض.', 'Quick Publish: you get the refusal.', { at: '/sites.html' }),
    ] },
    { t: L('كـ admin: deny <code>rep:write</code> على Magazine لـ wknd-editors، وبعدين impersonate sara وافتح Magazine في الـ editor', 'As admin deny <code>rep:write</code> on Magazine for wknd-editors, then impersonate sara and open Magazine in the editor'), why: L('الـ deny الأقرب بيغلب الـ allow اللي فوق: الصفحة هتفتح read-only.', 'The closer deny beats the allow above: the page opens read only.'), ok: () => !can(AR(), 'sara', MAG + '/jcr:content', 'jcr:modifyProperties').ok && F('sec:readonly'), guide: [
      step('[data-act="secAddAce"]', 'رجّع نفسك admin الأول (Revert to Self)، وبعدين Add ACE لـ wknd-editors.', 'First Revert to Self (admin), then Add ACE for wknd-editors.', { at: SEC_PERMS, go: SEC_PERMS + '?p=wknd-editors' }),
      step('.modal input[name=path]', 'Path: <code>/content/wknd/us/en/magazine</code>، Type: <b>Deny</b>، Privilege: <b>Write</b>.', 'Path <code>/content/wknd/us/en/magazine</code>, Type <b>Deny</b>, privilege <b>Write</b>.', { at: SEC_PERMS, next: true }),
      step('.modal [data-modal=ok]', '<b>Add</b>. بعدين Impersonate as sara وافتح Magazine في الـ editor.', '<b>Add</b>. Then impersonate sara and open Magazine in the editor.', { at: SEC_PERMS }),
    ] },
    { t: L('<b>Revert to Self</b>', '<b>Revert to Self</b>'), ok: () => F('sec:impersonate') && curUser() === 'admin', guide: [step('.imp-bar [data-act="revertSelf"]', 'دوس <b>Revert to Self</b> في الشريط الأصفر.', 'Press <b>Revert to Self</b> in the yellow bar.')] },
  ],
  quiz: [
    { q: L('allow <code>rep:write</code> على /content/wknd و deny <code>rep:write</code> على /content/wknd/us/en/magazine. sara تقدر تعدّل magazine؟', 'Allow write on /content/wknd, deny write on …/magazine. Can sara edit magazine?'), a: [L('أيوه', 'Yes'), L('لأ، الـ entry الأقرب بيكسب', 'No, the closest entry wins'), L('بس تعمل Publish', 'Only publish')], c: 1, why: L('الـ deny على magazine أقرب.', 'The deny on magazine is closer.') },
    { q: L('user جديد مالوش أي group. يشوف إيه في Sites؟', 'A new user with no groups. What does Sites show?'), a: [L('كل حاجة', 'Everything'), L('ولا صفحة: مفيش entry = ممنوع', 'No pages: no entry = denied'), L('الصفحات المنشورة', 'Published pages')], c: 1, why: L('deny by default.', 'Denied by default.') },
    { q: L('الطريقة الصح تدي 30 author نفس الصلاحيات؟', 'The right way to give 30 authors the same permissions?'), a: [L('ACE لكل user', 'An ACE per user'), L('group واحد عليه الـ ACEs وتضيفهم أعضاء', 'One group with the ACEs, add them as members'), L('تخليهم admin', 'Make them admin')], c: 1, why: L('أسهل في الإدارة والمراجعة.', 'Easier to manage and audit.') },
    { q: L('author محتاج ينشر بس من غير ما يدّي <code>crx:replicate</code>. الحل؟', 'An author must publish without having <code>crx:replicate</code>. Solution?'), a: [L('workflow Request for Activation', 'A Request for Activation workflow'), L('يدخل بـ admin', 'Sign in as admin'), L('مستحيل', 'Impossible')], c: 0, why: L('الـ workflow بيعدّي على حد عنده الصلاحية.', 'The workflow passes through someone who has it.') },
  ],
});
