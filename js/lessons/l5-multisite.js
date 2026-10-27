/* Level 5 · Multi-site & languages */

const LM = '/content/wknd/language-masters';
const createMenu = (ar, en, at) => step('.titlebar summary.btn.primary', ar, en, { at: '/sites.html' + at, go: '/sites.html' + at });

lesson({
  id: 'msm', level: 5, num: '5.1', video: '#8', time: 40,
  title: L('Multi Site Manager: blueprints, live copies, rollout', 'Multi Site Manager: blueprints, live copies, rollout'),
  goal: L('هتعمل موقع بلد جديد كـ live copy، تعمل rollout للتعديلات، وتكسر الوراثة لما تحتاج.', 'You will create a country site as a live copy, roll out changes, and break inheritance when needed.'),
  learn: L(`
<h4>المشكلة</h4>
<p>شركة عندها موقع لـ 20 بلد بنفس الشكل والمحتوى تقريباً. لو كل موقع نسخة عادية، أي تعديل لازم يتعمل 20 مرة.</p>
<h4>MSM</h4>
<p>الـ <b>Multi Site Manager</b> بيخلّيك تعمل <b>live copy</b>: نسخة "حية" مربوطة بالأصل (الـ <b>blueprint</b> / source). التعديل يتعمل في الأصل مرة، وبعدين <b>Rollout</b> يوصّله لكل النسخ.</p>
<pre class="ls-diagram">/content/wknd/language-masters/en      ← Blueprint (المصدر)
        │  rollout
        ├──▶ /content/wknd/ca/en          ← Live copy (Canada)
        └──▶ /content/wknd/ae/en          ← Live copy (UAE)</pre>
<h4>إزاي بيتخزن؟</h4>
<p>الـ live copy عليها mixin <code>cq:LiveSync</code> و node <code>cq:LiveSyncConfig</code> فيه <code>cq:master</code> (المصدر) و<code>cq:rolloutConfigs</code>.</p>
<h4>Rollout configs (إمتى وإزاي)</h4>
<table class="ls-table">
<tr><th>Config</th><th>Trigger</th><th>بيعمل</th></tr>
<tr><td>Standard rollout config</td><td>Rollout يدوي</td><td>ينسخ المحتوى ويرتّب ويحدّث الـ references</td></tr>
<tr><td>Push on modify</td><td>أي تعديل في الأصل</td><td>rollout أوتوماتيك</td></tr>
<tr><td>Activate on Blueprint activation</td><td>نشر الأصل</td><td>ينشر الـ live copy معاه</td></tr>
</table>
<h4>كسر الوراثة</h4>
<p>كل component في الـ live copy عليه 🔒 (موروث). لو بلد محتاجة نص مختلف: <b>Cancel Inheritance</b> للـ component ده بس، فالـ rollout الجاي مش هيلمسه. و<b>Re-enable</b> بيرجّعه للأصل. وتقدر تعمل <b>Suspend</b> أو <b>Detach</b> للصفحة كلها.</p>
<h4>Site wizard</h4>
<p>Create ← <b>Site</b> بيعمل موقع بلد كامل من <b>Blueprint configuration</b> (<code>/apps/msm/wknd_blueprint</code>) وتختار اللغات والـ chapters.</p>`, `
<h4>The problem</h4>
<p>A company runs sites for 20 countries with nearly the same layout and content. With plain copies every change is made 20 times.</p>
<h4>MSM</h4>
<p>The <b>Multi Site Manager</b> creates a <b>live copy</b>: a copy linked to its source (the <b>blueprint</b>). Change the source once, then <b>Rollout</b> pushes it to every copy.</p>
<pre class="ls-diagram">/content/wknd/language-masters/en      ← Blueprint (source)
        │  rollout
        ├──▶ /content/wknd/ca/en          ← Live copy (Canada)
        └──▶ /content/wknd/ae/en          ← Live copy (UAE)</pre>
<h4>How it is stored</h4>
<p>A live copy has the <code>cq:LiveSync</code> mixin and a <code>cq:LiveSyncConfig</code> node with <code>cq:master</code> (the source) and <code>cq:rolloutConfigs</code>.</p>
<h4>Rollout configs (when and how)</h4>
<table class="ls-table">
<tr><th>Config</th><th>Trigger</th><th>Does</th></tr>
<tr><td>Standard rollout config</td><td>Manual rollout</td><td>Copies content, orders children, updates references</td></tr>
<tr><td>Push on modify</td><td>Any change in the source</td><td>Automatic rollout</td></tr>
<tr><td>Activate on Blueprint activation</td><td>Publishing the source</td><td>Publishes the live copy too</td></tr>
</table>
<h4>Breaking inheritance</h4>
<p>Every component in a live copy is 🔒 (inherited). If a country needs different text: <b>Cancel Inheritance</b> on that component only — the next rollout leaves it alone. <b>Re-enable</b> restores it. You can also <b>Suspend</b> or <b>Detach</b> the whole page.</p>
<h4>Site wizard</h4>
<p>Create → <b>Site</b> builds a full country site from a <b>Blueprint configuration</b> (<code>/apps/msm/wknd_blueprint</code>), choosing languages and chapters.</p>`),
  terms: [['Blueprint', L('المصدر اللي الـ live copies بتورث منه.', 'The source live copies inherit from.')], ['Live copy', L('نسخة مربوطة بالمصدر وبتتحدث بالـ rollout.', 'A copy linked to its source, updated by rollout.')], ['Rollout', L('نقل التعديلات من المصدر للنسخ.', 'Pushing source changes to copies.')], ['cq:master', L('path المصدر في cq:LiveSyncConfig.', 'The source path in cq:LiveSyncConfig.')]],
  real: L('<ul><li>الشكل المعتاد: <b>language masters</b> (en, ar…) ← live copies لكل بلد. والترجمة بتتعمل على الـ language masters.</li><li>متكسرش الوراثة كتير؛ كل cancel بيبعد النسخة عن الأصل ويصعّب الصيانة.</li><li>مشروع Diriyah بلغتين (ar/en) غالباً هيستخدم language copies + MSM.</li></ul>', '<ul><li>Typical setup: <b>language masters</b> (en, ar…) → a live copy per country; translation happens on the language masters.</li><li>Don\'t break inheritance often — each cancel drifts the copy from the source.</li><li>A bilingual project (ar/en) usually combines language copies and MSM.</li></ul>'),
  tasks: [
    { t: L('<code>/content/wknd</code> ← Create ← <b>Site</b>: موقع <b>Canada</b> (<code>ca</code>) من WKND Site Blueprint', '<code>/content/wknd</code> → Create → <b>Site</b>: <b>Canada</b> (<code>ca</code>) from the WKND Site Blueprint'), ok: () => F('msm:site'), guide: [
      createMenu('دوس <b>Create</b>.', 'Press <b>Create</b>.', '/content/wknd'),
      step('.create-menu [data-act="siteCreate"]', 'اختار <b>Site</b>.', 'Choose <b>Site</b>.', { at: '/sites.html' }),
      step('[data-act="wizBp"]', 'اختار <b>WKND Site Blueprint</b>.', 'Pick <b>WKND Site Blueprint</b>.', { at: '/mnt/overlay/wcm/core/content/sites/createsitewizard.html' }),
      step('[data-act="wizNext"]', 'دوس <b>Next</b>.', 'Press <b>Next</b>.', { at: '/mnt/overlay/wcm/core/content/sites/createsitewizard.html' }),
      step('[data-wiz="title"]', 'اكتب Title <code>Canada</code> و Name <code>ca</code> و Site Owner <code>admin</code>، وخلّي Live Copy متعلّم.', 'Title <code>Canada</code>, Name <code>ca</code>, Site Owner <code>admin</code>; keep Live Copy ticked.', { at: '/mnt/overlay/wcm/core/content/sites/createsitewizard.html', next: true }),
      step('#wiz-create', 'دوس <b>Create</b>.', 'Press <b>Create</b>.', { at: '/mnt/overlay/wcm/core/content/sites/createsitewizard.html' }),
    ] },
    { t: L('عدّل نص في <code>language-masters/en</code> واعمل <b>Rollout</b>، وشوفه في <code>/content/wknd/ca/en</code>', 'Change a text in <code>language-masters/en</code>, <b>Rollout</b>, and see it in <code>/content/wknd/ca/en</code>'), ok: () => F('msm:rollout'), guide: [
      step('frame:[data-cmp*="/title"]', 'اختار الـ Title ودوس 🔧 وغيّر النص.', 'Select the Title, press 🔧 and change it.', { at: '/editor.html' + LM + '/en', go: '/editor.html' + LM + '/en.html', prep: editMode }),
      step('.ed-bar summary[title="Page Information"]', 'Page Information ←', 'Page Information →', { at: '/editor.html' + LM }),
      step('[data-act="edRollout"]', 'اختار <b>Rollout Page</b>.', 'Choose <b>Rollout Page</b>.', { at: '/editor.html' + LM }),
      step('.modal [data-modal=ok]', 'بص على الـ live copies اللي هتتحدث ودوس <b>Rollout</b>.', 'Check the live copies to update and press <b>Rollout</b>.', { at: '/editor.html' + LM }),
    ] },
    { t: L('في live copy: <b>Cancel Inheritance</b> لـ component وعدّله', 'In a live copy <b>Cancel Inheritance</b> on a component and edit it'), ok: () => F('msm:cancel'), guide: [
      step('frame:[data-cmp*="/title"]', 'اختار الـ Title: هتلاقيه 🔒 موروث.', 'Select the Title: it is 🔒 inherited.', { at: '/editor.html/content/wknd/ca', go: '/editor.html/content/wknd/ca/en.html', prep: editMode }),
      step('frame:#lab-tb [data-tb="msmCancel"]', 'دوس القفل (<b>Cancel Inheritance</b>)، وبعدين 🔧 وعدّل.', 'Press the lock (<b>Cancel Inheritance</b>), then 🔧 and edit.', { at: '/editor.html/content/wknd/ca' }),
    ] },
    { t: L('Create ← <b>Live Copy</b>: live copy لأي صفحة', 'Create → <b>Live Copy</b> of any page'), ok: () => F('msm:livecopy'), guide: [
      createMenu('دوس <b>Create</b>.', 'Press <b>Create</b>.', '/content/wknd'),
      step('.create-menu [data-act="liveCopyCreate"]', 'اختار <b>Live Copy</b>.', 'Choose <b>Live Copy</b>.', { at: '/sites.html' }),
      step('.lcv-cols .ci-thumb', 'في <b>Live Copy From</b>: افتح العمود ودوس على <b>صورة</b> الصفحة اللي عايزها كمصدر، وبعدين Next.', 'In <b>Live Copy From</b> open the columns and click the <b>picture</b> of the source page, then Next.', { at: '/mnt/overlay/wcm/core/content/sites/createlivecopywizard.html', next: true }),
      step('[data-act="lcvNext"]', 'Destination ← Next، واكتب Title ← Create.', 'Destination → Next, type a Title → Create.', { at: '/mnt/overlay/wcm/core/content/sites/createlivecopywizard.html', next: true }),
    ] },
    { t: L('Site بـ Rollout Config <b>Push on modify</b> أو <b>Activate on Blueprint activation</b>، وشوف الـ live copy بيتغير لوحده', 'A site with <b>Push on modify</b> or <b>Activate on Blueprint activation</b>; watch the live copy change by itself'), hint: L('Tools ← Sites ← Rollout Configurations بيوريك كل config بيعمل إيه', 'Tools → Sites → Rollout Configurations shows what each config does'), ok: () => F('msm:pushonmodify') || F('msm:targetActivate') || F('msm:targetDeactivate') },
  ],
  quiz: [
    { q: L('عدّلت الـ blueprint ومش ظاهر في الـ live copy (Standard config). ناقص؟', 'You changed the blueprint but the live copy (Standard config) didn\'t change. Missing?'), a: [L('Rollout', 'A rollout'), L('Publish', 'Publish'), L('Restart', 'A restart')], c: 0, why: L('الـ Standard config بيتنفذ بالـ rollout اليدوي بس.', 'The Standard config runs on manual rollout only.') },
    { q: L('بلد محتاجة عنوان مختلف وباقي الصفحة يفضل يتحدث. تعمل إيه؟', 'A country needs a different title but the rest should keep updating. You…'), a: [L('Detach للصفحة', 'Detach the page'), L('Cancel Inheritance للـ Title بس', 'Cancel inheritance on the Title only'), L('تمسح الـ live copy', 'Delete the live copy')], c: 1, why: L('بتكسر الوراثة لأصغر حاجة ممكنة.', 'Break inheritance on the smallest possible piece.') },
    { q: L('المصدر متسجل فين في الـ live copy؟', 'Where does a live copy record its source?'), a: [L('cq:template', 'cq:template'), L('cq:master في cq:LiveSyncConfig', 'cq:master in cq:LiveSyncConfig'), L('jcr:title', 'jcr:title')], c: 1, why: L('وجنبه cq:rolloutConfigs.', 'Next to cq:rolloutConfigs.') },
  ],
});

lesson({
  id: 'launches', level: 5, num: '5.2', time: 25,
  title: L('Launches, Language Copies & reports', 'Launches, Language Copies & reports'),
  goal: L('هتجهّز إصدار مستقبلي بـ Launch، تعمل نسخة لغة تانية، وتطلّع تقرير.', 'You will prepare a future release with a Launch, create a language copy, and export a report.'),
  learn: L(`
<h4>Launch</h4>
<p>عايز تجهّز صفحات "عرض رمضان" من دلوقتي من غير ما تأثر على الموقع الحالي؟ الـ <b>Launch</b> نسخة من الصفحات في <code>/content/launches/…</code> بتعدّل فيها براحتك، ولما ييجي الوقت <b>Promote</b> بيرجّع التعديلات للصفحات الأصلية (وممكن ينشرها).</p>
<pre class="ls-diagram">/content/wknd/us/en/about           ← الحالي (live)
/content/launches/2026/…/about      ← Launch: تعديلات رمضان
            │ Promote
            ▼
/content/wknd/us/en/about           ← بقى فيه التعديلات</pre>
<h4>Language Copy</h4>
<p>Create ← <b>Language Copy</b> بيعمل نفس شجرة الصفحات في <b>language root</b> تاني (مثلاً <code>/content/wknd/language-masters/ar</code>). ممكن "structure only" (من غير ترجمة) أو بـ <b>translation project</b> مربوط بخدمة ترجمة (Microsoft Translator، أو وكالة).</p>
<h4>Language roots</h4>
<p>AEM بيعرف لغة الصفحة من اسم الـ language root (<code>en</code>، <code>ar</code>، <code>fr_ca</code>…) أو من <code>jcr:language</code>.</p>
<h4>CSV Report</h4>
<p>بيطلّع جدول بالصفحات وأعمدة تختارها (Title، Template، Published…) — مفيد للـ audits وقبل الـ migrations.</p>`, `
<h4>Launch</h4>
<p>Want to prepare "Ramadan offer" pages now without touching the live site? A <b>Launch</b> copies pages to <code>/content/launches/…</code>; edit freely, and when it's time <b>Promote</b> pushes the changes back to the real pages (optionally publishing them).</p>
<pre class="ls-diagram">/content/wknd/us/en/about           ← current (live)
/content/launches/2026/…/about      ← Launch: Ramadan changes
            │ Promote
            ▼
/content/wknd/us/en/about           ← now has the changes</pre>
<h4>Language Copy</h4>
<p>Create → <b>Language Copy</b> creates the same page tree in another <b>language root</b> (e.g. <code>/content/wknd/language-masters/ar</code>), either "structure only" or with a <b>translation project</b> tied to a translation service (Microsoft Translator, an agency).</p>
<h4>Language roots</h4>
<p>AEM derives a page's language from the language root name (<code>en</code>, <code>ar</code>, <code>fr_ca</code>…) or from <code>jcr:language</code>.</p>
<h4>CSV Report</h4>
<p>Exports pages with chosen columns (Title, Template, Published…) — handy for audits and before migrations.</p>`),
  terms: [['Promote', L('نقل تعديلات الـ Launch للصفحات الأصلية.', 'Pushing Launch changes into the real pages.')], ['Language root', L('الصفحة اللي اسمها كود لغة وتحتها الموقع بتلك اللغة.', 'A page named with a language code, holding that language\'s site.')]],
  real: L('<ul><li>الـ Launches ممتازة للـ campaigns والمواسم (رمضان، اليوم الوطني).</li><li>للمواقع العربي/إنجليزي: خلّي <code>jcr:language</code> صح عشان الـ <code>lang</code> و<code>dir</code> في الـ HTML.</li></ul>', '<ul><li>Launches are ideal for campaigns and seasons (Ramadan, National Day).</li><li>For Arabic/English sites keep <code>jcr:language</code> right so HTML <code>lang</code>/<code>dir</code> are correct.</li></ul>'),
  tasks: [
    { t: L('اختار صفحة ← Create ← <b>Launch</b>، عدّل الـ launch، وبعدين <b>Promote</b>', 'Select a page → Create → <b>Launch</b>, edit the launch, then <b>Promote</b>'), ok: () => F('launch:created') && F('launch:promoted'), guide: [
      createMenu('من <code>/content/wknd/us/en</code> دوس <b>Create</b>.', 'From <code>/content/wknd/us/en</code> press <b>Create</b>.', '/content/wknd/us/en'),
      step('.create-menu [data-act="launchCreate"]', 'اختار <b>Launch</b>.', 'Choose <b>Launch</b>.', { at: '/sites.html' }),
      step('.modal input[name=title]', 'اكتب Launch Title (مثلاً <code>Ramadan</code>).', 'Type a Launch Title (e.g. <code>Ramadan</code>).', { at: '/sites.html', next: true }),
      step('.modal [data-modal=ok]', 'دوس <b>Create</b>، وبعدين افتح صفحة من الـ launch وعدّل فيها.', 'Press <b>Create</b>, then open a launch page and change it.', { at: '/sites.html' }),
      step('[data-act="launchSel"]', 'بعد ما تعدّل صفحة في الـ launch: من Tools ← Sites ← Launches اختار الـ launch.', 'After editing a launch page: Tools → Sites → Launches, select the launch.', { at: '/libs/launches/content/launches.html', go: '/libs/launches/content/launches.html' }),
      step('.selbar [data-act="launchPromote"]', 'دوس <b>Promote</b>.', 'Press <b>Promote</b>.', { at: '/libs/launches/content/launches.html' }),
      step('.modal [data-modal=ok]', 'دوس <b>Promote</b>: التعديلات رجعت للصفحات الأصلية.', 'Press <b>Promote</b>: the changes go back into the real pages.', { at: '/libs/launches/content/launches.html' }),
    ] },
    { t: L('Create ← <b>Language Copy</b>: من <code>language-masters/en</code> للغة جديدة (مثلاً German)، structure only', 'Create → <b>Language Copy</b>: from <code>language-masters/en</code> to a new language (e.g. German), structure only'), ok: () => F('langcopy:created'), guide: [
      createMenu('من <code>/content/wknd/language-masters</code> دوس <b>Create</b>.', 'From <code>/content/wknd/language-masters</code> press <b>Create</b>.', LM),
      step('.create-menu [data-act="langCopyCreate"]', 'اختار <b>Language Copy</b>.', 'Choose <b>Language Copy</b>.', { at: '/sites.html' }),
      step('[data-act="lcwAdd"]', 'دوس <b>Add Pages</b>.', 'Press <b>Add Pages</b>.', { at: '/mnt/overlay/wcm/core/content/sites/createlanguagecopywizard.html' }),
      step('[data-pk-sel="/content/wknd/language-masters/en"]', 'في الـ picker دوس على <b>صورة</b> <code>en</code> عشان تختارها.', 'In the picker click the <b>picture</b> of <code>en</code> to select it.', { at: '/mnt/overlay/wcm/core/content/sites/createlanguagecopywizard.html' }),
      step('[data-pk="select"]', 'دوس <b>Select</b>.', 'Press <b>Select</b>.', { at: '/mnt/overlay/wcm/core/content/sites/createlanguagecopywizard.html' }),
      step('[data-act="lcwNext"]', 'دوس <b>Next</b>.', 'Press <b>Next</b>.', { at: '/mnt/overlay/wcm/core/content/sites/createlanguagecopywizard.html' }),
      step('[data-lcwadd="langs"]', 'اختار لغة من <b>Target Language(s)</b> (مثلاً German).', 'Pick a language in <b>Target Language(s)</b> (e.g. German).', { at: '/mnt/overlay/wcm/core/content/sites/createlanguagecopywizard.html', next: true }),
      step('[data-act="lcwNext"]', 'دوس <b>Next</b>.', 'Press <b>Next</b>.', { at: '/mnt/overlay/wcm/core/content/sites/createlanguagecopywizard.html' }),
      step('[data-act="lcwCreate"]', 'سيب "Create structure only" ودوس <b>Create</b>.', 'Keep "Create structure only" and press <b>Create</b>.', { at: '/mnt/overlay/wcm/core/content/sites/createlanguagecopywizard.html' }),
    ] },
    { t: L('Create ← <b>CSV Report</b> ونزّل التقرير', 'Create → <b>CSV Report</b> and download it'), ok: () => F('csv:report'), guide: [
      createMenu('دوس <b>Create</b>.', 'Press <b>Create</b>.', '/content/wknd/us/en'),
      step('.create-menu [data-act="csvReport"]', 'اختار <b>CSV Report</b>.', 'Choose <b>CSV Report</b>.', { at: '/sites.html' }),
      step('.modal [data-modal=ok]', 'اختار الأعمدة اللي عايزها ودوس <b>Create</b>: الملف هيتنزّل.', 'Pick the columns and press <b>Create</b>: the file downloads.', { at: '/sites.html' }),
    ] },
    { t: L('جرّب <b>Select All</b> والـ actions الجماعية', 'Try <b>Select All</b> and bulk actions'), ok: () => F('sites:selectAll'), guide: [step('[data-act="sitesSelectAll"]', 'دوس <b>Select All</b>.', 'Press <b>Select All</b>.', { at: '/sites.html', go: '/sites.html/content/wknd/us/en' })] },
  ],
  quiz: [
    { q: L('عايز تجهّز تعديلات لعرض الشهر الجاي من غير ما تأثر على الموقع. تستخدم؟', 'You want next month\'s campaign changes ready without affecting the site. Use…'), a: [L('Live copy', 'A live copy'), L('Launch', 'A Launch'), L('Version', 'A version')], c: 1, why: L('الـ Launch معمول للإصدارات المستقبلية.', 'Launches are for future releases.') },
    { q: L('Language copy "structure only" يعني؟', 'A "structure only" language copy means…'), a: [L('الصفحات اتعملت بس من غير ترجمة', 'Pages created, not translated'), L('ترجمة أوتوماتيك', 'Machine translation'), L('بيتعمل live copy', 'A live copy')], c: 0, why: L('الترجمة بتتعمل بعدين يدوي أو بـ translation project.', 'Translation happens later manually or via a project.') },
  ],
});
