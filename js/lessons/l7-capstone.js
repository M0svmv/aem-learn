/* Level 7 · Capstone: one campaign, end to end */

const CAMP = SITE_ROOT + '/summer-season';
const campNodes = () => JCR.find(AR(), CAMP + '/jcr:content', n => !!n.props['sling:resourceType']).map(x => x.node);
const campHas = rt => campNodes().some(n => String(n.props['sling:resourceType']).endsWith('/' + rt));
const campWidths = () => JCR.find(AR(), CAMP + '/jcr:content', (n, p) => /\/cq:responsive\/default$/.test(p) && String(n.props.width) === '6').length;

lesson({
  id: 'capstone', level: 7, num: '7.1', time: 90,
  title: L('Capstone: the "Summer Season" campaign', 'Capstone: the "Summer Season" campaign'),
  goal: L('هتبني campaign حقيقية من الأول للآخر وتستخدم كل اللي اتعلمته: صفحة، layout، XF، targeting، content fragment، نشر، cache، و package.', 'You will build a real campaign end to end using everything you learned: page, layout, XF, targeting, a content fragment, publishing, cache and a package.'),
  learn: L(`
<h4>الـ brief</h4>
<p>فريق الـ marketing عايز صفحة campaign اسمها <b>Summer Season</b> تحت WKND Adventures:</p>
<ul><li>عنوان كبير، نص تعريفي، وصورة <b>جنب بعض</b> على الـ desktop وفوق بعض على الموبايل.</li>
<li>بانر الـ promo (Experience Fragment) اللي بيتكرر في الموقع.</li>
<li>النص يتغيّر للزوار في الشتا (audience <b>Winter</b>).</li>
<li>تجربة جديدة "City Night Walk" كـ <b>Content Fragment</b> عشان تطبيق Next.js يعرضها.</li>
<li>الصفحة تتنشر وتتعمل لها cache، وتتسلّم كـ <b>package</b> للبيئة التانية.</li></ul>
<h4>اتبع الترتيب ده</h4>
<pre class="ls-diagram">1 Page      Create ← Page (Page Content)            → /content/wknd/us/en/summer-season
2 Content   Title + Text + Image                    → درس 2.1
3 Layout    Text 6/12 + Image 6/12                  → درس 2.2
4 XF        Experience Fragment → promo/master      → درس 2.4
5 Target    Text → Winter experience                → درس 2.2
6 CF        Adventure "City Night Walk"           → درس 2.5
7 Publish   الصفحة + الـ XF + الصورة                 → درس 4.2
8 Verify    افتحها على Publish و Dispatcher          → درس 4.2
9 Package   filter = الصفحة، Build                  → درس 4.4</pre>
<p>كل مهمة في التطبيق بتتعلّم لوحدها لما الحالة في الـ lab تبقى صح. مفيش "وريني" هنا عن قصد: ده الامتحان العملي. لو وقفت، ارجع للدرس المكتوب جنب كل خطوة.</p>`, `
<h4>The brief</h4>
<p>Marketing wants a campaign page <b>Summer Season</b> under WKND Adventures:</p>
<ul><li>A big heading, an intro text and an image <b>side by side</b> on desktop, stacked on mobile.</li>
<li>The site-wide promo banner (Experience Fragment).</li>
<li>The text changes for winter visitors (the <b>Winter</b> audience).</li>
<li>A new experience "City Night Walk" as a <b>Content Fragment</b> for the Next.js app.</li>
<li>The page is published, cached, and handed over as a <b>package</b> to another environment.</li></ul>
<h4>Follow this order</h4>
<pre class="ls-diagram">1 Page      Create → Page (Page Content)            → /content/wknd/us/en/summer-season
2 Content   Title + Text + Image                    → lesson 2.1
3 Layout    Text 6/12 + Image 6/12                  → lesson 2.2
4 XF        Experience Fragment → promo/master      → lesson 2.4
5 Target    Text → Winter experience                → lesson 2.2
6 CF        Adventure "City Night Walk"           → lesson 2.5
7 Publish   the page + the XF + the image           → lesson 4.2
8 Verify    open it on Publish and the Dispatcher   → lesson 4.2
9 Package   filter = the page, Build                → lesson 4.4</pre>
<p>Each task ticks itself when the lab state is right. There is deliberately no "Show me" here: this is the practical exam. If you get stuck, revisit the lesson listed next to the step.</p>`),
  real: L('<ul><li>ده بالظبط شكل شغلك اليومي على مشروع AEM: brief من الـ marketing ← templates و components موجودة ← authoring ← publishing ← handover.</li><li>لو خلصت ده لوحدك، إنت فاهم الصورة الكاملة لـ AEM كـ author و developer.</li></ul>', '<ul><li>This is what daily AEM work looks like: a marketing brief → existing templates and components → authoring → publishing → handover.</li><li>Finish this on your own and you understand the whole of AEM as both author and developer.</li></ul>'),
  tasks: [
    { t: L('صفحة <code>summer-season</code> (Title: Summer Season) تحت WKND Adventures', 'A page <code>summer-season</code> (Title: Summer Season) under WKND Adventures'), hint: L('درس 1.4', 'Lesson 1.4'), ok: () => isPage(AR(), CAMP) },
    { t: L('فيها Title و Text و Image', 'It has a Title, a Text and an Image'), hint: L('درس 2.1', 'Lesson 2.1'), ok: () => campHas('title') && campHas('text') && campHas('image') },
    { t: L('في Layout: اتنين components عرض كل واحد <b>6/12</b> على desktop', 'In Layout, two components each <b>6/12</b> on desktop'), hint: L('درس 2.2', 'Lesson 2.2'), ok: () => campWidths() >= 2 },
    { t: L('فيها Experience Fragment بيشاور على الـ promo', 'It includes an Experience Fragment pointing at the promo'), hint: L('درس 2.4', 'Lesson 2.4'), ok: () => campNodes().some(n => String(n.props['sling:resourceType']).endsWith('/experiencefragment') && !!n.props.fragmentVariationPath) },
    { t: L('الـ Text عليه Targeting بنسخة لـ <b>Winter</b>', 'The Text is targeted with a <b>Winter</b> experience'), hint: L('درس 2.2', 'Lesson 2.2'), ok: () => JCR.find(AR(), CAMP + '/jcr:content', (n, p) => /\/cq:experiences\/winter$/.test(p)).length > 0 },
    { t: L('Content Fragment "City Night Walk" من model Adventure', 'A Content Fragment "City Night Walk" from the Adventure model'), hint: L('درس 2.5', 'Lesson 2.5'), ok: () => JCR.find(AR(), '/content/dam', (n, p) => /night-walk/i.test(n.name) || /night walk/i.test(String((JCR.get(n, 'jcr:content') || { props: {} }).props['jcr:title'] || ''))).length > 0 },
    { t: L('الصفحة منشورة على Publish', 'The page is published'), hint: L('درس 4.2', 'Lesson 4.2'), ok: () => !!JCR.get(PR(), CAMP) },
    { t: L('اتفتحت على تاب Publish', 'Opened in the Publish tab'), ok: () => !!S.events['viewpub:' + CAMP] },
    { t: L('Package فيه filter على الصفحة ومتعمله Build', 'A package with a filter on the page, built'), hint: L('درس 4.4', 'Lesson 4.4'), ok: () => ((S.pkgs || {}).author || []).some(p => p.built && p.filters.some(f => f.root === CAMP)) },
  ],
  quiz: [
    { q: L('عايز البانر يتغيّر في 300 صفحة بتعديل واحد. تستخدم؟', 'You want a banner to change on 300 pages with one edit. Use…'), a: [L('Copy/Paste', 'Copy/Paste'), L('Experience Fragment', 'An Experience Fragment'), L('Launch', 'A Launch')], c: 1, why: L('XF = مكان واحد لمحتوى بيتكرر.', 'An XF is one place for repeated content.') },
    { q: L('الصفحة منشورة بس الزوار شايفين النسخة القديمة. أول خطوة؟', 'Published, but visitors see the old version. First step?'), a: [L('تعيد بناء الـ template', 'Rebuild the template'), L('تتأكد من الـ flush/cache في الـ Dispatcher', 'Check the Dispatcher flush/cache'), L('restart للـ Author', 'Restart Author')], c: 1, why: L('Publish صح؟ يبقى الـ cache.', 'If Publish is right, it is the cache.') },
    { q: L('تطبيق Next.js محتاج بيانات التجارب. أنسب طريقة؟', 'A Next.js app needs the experiences data. Best way?'), a: [L('Content Fragments + GraphQL persisted query', 'Content Fragments + a GraphQL persisted query'), L('scraping للـ HTML', 'Scraping the HTML'), L('.infinity.json من الـ Dispatcher', '.infinity.json through the Dispatcher')], c: 0, why: L('JSON نضيف ومتعمله cache، و.infinity.json ممنوع أصلاً.', 'Clean, cacheable JSON; .infinity.json is blocked anyway.') },
    { q: L('محتاج تسلّم الصفحة لبيئة تانية. الطريقة؟', 'You must hand the page to another environment. How?'), a: [L('Content package (filter + build + download)', 'A content package (filter + build + download)'), L('screenshot', 'A screenshot'), L('Live copy', 'A live copy')], c: 0, why: L('وفي المشاريع الكبيرة الكود بيروح بالـ pipeline والمحتوى بالـ packages أو content transfer.', 'In big projects code goes via the pipeline, content via packages or content transfer.') },
    { q: L('Text 6/12 + Image 6/12 على الـ desktop، وعايزهم فوق بعض على الموبايل. تعمل إيه؟', 'Text 6/12 + Image 6/12 on desktop, stacked on mobile. You…'), a: [L('template جديد للموبايل', 'A mobile template'), L('Layout mode ← Phone ← كل واحد 12/12', 'Layout mode → Phone → each 12/12'), L('CSS في الصفحة', 'Page CSS')], c: 1, why: L('كل breakpoint ليه layout مستقل.', 'Each breakpoint has its own layout.') },
  ],
});
