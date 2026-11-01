/* Headless pages built from Content Fragments, the way big headless AEM projects work:
   a "Page" fragment (Properties / Style / Meta Data / Header / Components / Footer tabs) references one fragment per
   component in page order, and a frontend (Next.js in the real project) renders the page from GraphQL. */

const MYSITE_CFM = '/conf/mysite/settings/dam/cfm/models';
const MYSITE_CF = '/content/dam/mysite/corporate/cf';
const MYSITE_PQ = '/conf/mysite/settings/graphql/persistentQueries';
const MYSITE_PROJECTS = MYSITE_CF + '/page/en/projects';
const MYSITE_HOME = MYSITE_CF + '/page/en/homepage';
const MYSITE_HOME_HERO = MYSITE_CF + '/comp/en/homepage/c_007-hero/c_007-hero';
const MYSITE_HERO_TITLE = 'Where great places begin';
const FRONTEND = '/frontend/mysite';

/* ---------- seed: models, folders and fragments ---------- */

function seedMysiteCF(root) {
  if (JCR.get(root, MYSITE_CFM)) return false;
  at(root, '/conf/mysite', { 'jcr:primaryType': 'sling:Folder', 'jcr:title': 'My Site' });
  at(root, '/conf/mysite/settings', { 'jcr:primaryType': 'sling:Folder' });
  at(root, '/conf/mysite/settings/dam/cfm', { 'jcr:primaryType': 'sling:Folder' });
  at(root, MYSITE_CFM, { 'jcr:primaryType': 'sling:Folder' });

  const model = (name, title, desc, fields) => {
    const m = `${MYSITE_CFM}/${name}`;
    at(root, m, { 'jcr:primaryType': 'cq:Template' });
    at(root, m + '/jcr:content', { 'jcr:title': title, 'jcr:description': desc, status: 'enabled', 'sling:resourceType': 'dam/cfm/models/console/components/data/entity/default', 'cq:lastModified': seedTime(900) });
    at(root, m + '/jcr:content/model', { 'cq:targetPath': '/content/entities' });
    at(root, m + '/jcr:content/model/cq:dialog/content/items', {});
    fields.forEach((p, i) => at(root, `${m}/jcr:content/model/cq:dialog/content/items/f${i}`, p));
    return m;
  };
  const tab = (label, name) => ({ metaType: 'tab', name, fieldLabel: label });
  const text = (label, name, o) => ({ metaType: 'text-single', name, fieldLabel: label, valueType: 'string', ...o });
  const multi = (label, name, o) => ({ metaType: 'text-multi', name, fieldLabel: label, valueType: 'string', ...o });
  const img = (label, name) => ({ metaType: 'reference', name, fieldLabel: label, valueType: 'string', rootPath: '/content/dam/mysite' });
  const ref = (label, name, o) => ({ metaType: 'fragment-reference', name, fieldLabel: label, valueType: 'string', ...o });

  const header = model('header', 'C_002 Header', 'Logo and main navigation', [
    text('Logo Text', 'logoText', { required: true }), text('Menu Items', 'menu', { multiple: true, emptyText: 'Label|page-name' })]);
  const footer = model('footer', 'C_003 Footer', 'Footer text and links', [
    multi('Tagline', 'tagline'), text('Links', 'links', { multiple: true, emptyText: 'Label|page-name' }), text('Copyright', 'copyright')]);
  model('hero', 'C_007 Hero', 'Full-width image with a title and a call to action', [
    text('Title', 'title', { required: true }), multi('Subtitle', 'subtitle'), img('Image', 'image'), text('CTA Label', 'ctaLabel'), text('CTA Link', 'ctaLink', { emptyText: 'page-name' })]);
  model('intro-text-block', 'C069 Intro Text Block', 'An eyebrow, a heading and body text', [
    text('Eyebrow', 'eyebrow'), text('Heading', 'heading', { required: true }), multi('Body', 'body')]);
  model('global-media-banner', 'C_057 Global Media Banner', 'A wide image with a title and caption', [
    text('Title', 'title'), img('Image', 'image'), text('Caption', 'caption')]);
  model('image-accordion', 'C_60 Image + Accordion', 'An image next to expandable questions', [
    text('Title', 'title'), img('Image', 'image'), text('Items', 'items', { multiple: true, emptyText: 'Question|Answer' })]);
  model('card-grid', 'C_006 Card Grid', 'A grid of cards', [
    text('Title', 'title'), text('Cards', 'cards', { multiple: true, emptyText: 'Title|Text' })]);
  const page = model('page', 'Page', 'A page of the headless site: its components are fragments, in page order', [
    tab('Properties', 'tabProperties'),
    ref('Parent Page Path', 'parentPage', { fragmentModel: `${MYSITE_CFM}/page` }), text('Page URL', 'pageUrl'), text('Page Name', 'pageName', { required: true }),
    { metaType: 'boolean', name: 'excludeFromSearch', fieldLabel: 'Exclude from search index', valueType: 'boolean' },
    tab('Style', 'tabStyle'),
    { metaType: 'enumeration', name: 'startingColour', fieldLabel: 'Starting Colour', valueType: 'string', options: ['Light', 'Dark'] },
    { metaType: 'enumeration', name: 'patternType', fieldLabel: 'Pattern Type', valueType: 'string', options: ['None', 'Arches', 'Palms'] },
    text('Accent Color', 'accentColor', { emptyText: '#b5653a' }),
    tab('Meta Data', 'tabMeta'),
    text('SEO Title', 'seoTitle', { required: true }), multi('SEO Description', 'seoDescription'), text('Keywords', 'keywords', { multiple: true }), img('Open Graph Image', 'ogImage'),
    tab('Header', 'tabHeader'),
    ref('Header Section', 'header', { fragmentModel: header }),
    tab('Components', 'tabComponents'),
    ref('Component Section', 'components', { multiple: true, emptyText: 'Select component fragments in page order' }),
    tab('Footer', 'tabFooter'),
    ref('Footer Section', 'footer', { multiple: true, fragmentModel: footer }),
  ]);

  const folder = (p, title) => at(root, p, title ? { 'jcr:primaryType': 'sling:Folder', 'jcr:title': title } : { 'jcr:primaryType': 'sling:Folder' });
  const cf = (p, title, m, data, folderTitle) => {
    const parts = p.split('/');
    for (let i = 4; i < parts.length; i++) {
      const fp = parts.slice(0, i).join('/');
      if (!JCR.get(root, fp)) folder(fp, i === parts.length - 1 && folderTitle ? folderTitle : null);
    }
    at(root, p, { 'jcr:primaryType': 'dam:Asset' });
    at(root, p + '/jcr:content', { 'jcr:primaryType': 'dam:AssetContent', contentFragment: true, 'jcr:title': title, 'jcr:lastModified': seedTime(500), 'jcr:lastModifiedBy': 'admin' });
    at(root, p + '/jcr:content/metadata', { 'dc:title': title, 'dc:format': 'text/html' });
    at(root, p + '/jcr:content/data', { 'cq:model': `${MYSITE_CFM}/${m}` });
    at(root, p + '/jcr:content/data/master', { 'jcr:primaryType': 'nt:unstructured', ...data });
    return p;
  };
  const media = n => `${MYSITE_DAM}/corporate/assets/images/${n}`;
  folder(MYSITE_CF, 'cf');
  folder(MYSITE_CF + '/page', 'page');
  folder(MYSITE_CF + '/comp', 'comp');
  for (const l of ['en', 'ar']) { folder(`${MYSITE_CF}/page/${l}`); folder(`${MYSITE_CF}/comp/${l}`); }
  const C = `${MYSITE_CF}/comp/en`;
  for (const [n, t] of [['header', 'Header'], ['footer', 'Footer'], ['homepage', 'Homepage'], ['about-us', 'About Us'], ['sustainability', 'Sustainability'], ['projects', 'Projects']]) folder(`${C}/${n}`, t);

  // shared header and footer
  const hdr = cf(`${C}/header/c_002-header/c_002-header`, 'C_002 - Header', 'header', { logoText: 'My Site', menu: ['Home|homepage', 'About Us|about-us', 'Sustainability|sustainability', 'Projects|projects'] }, 'C_002 - Header');
  const ftr = cf(`${C}/footer/c_003-footer/c_003-footer`, 'C_003 - Footer', 'footer', {
    tagline: 'Places to live, work and visit, designed around the people who use them.', links: ['About Us|about-us', 'Sustainability|sustainability'],
    copyright: '© 2026 My Site · practice content for the AEM lab',
  }, 'C_003 - Footer');

  // Home: the five components in the order the page shows them
  const home = [
    cf(MYSITE_HOME_HERO, 'C_007 - Hero', 'hero', { title: MYSITE_HERO_TITLE, subtitle: 'Restored old streets, new neighbourhoods and culture in one place.', image: media('homepage/c_001-hero-banner/home-hero.svg'), ctaLabel: 'Discover more', ctaLink: 'about-us' }, 'c_007-hero'),
    cf(`${C}/homepage/c069-intro-text-block/c069-intro-text-block`, 'C069 - Intro Text Block', 'intro-text-block', {
      eyebrow: 'Welcome', heading: 'A place with a past and a future',
      body: 'My Site brings a restored old town together with new homes, hotels, offices and public spaces.\n\nThis page is built from Content Fragments: every block is its own fragment, and the Home page fragment lists them in page order.',
    }, 'C069-Intro-Text-Block'),
    cf(`${C}/homepage/c_057-global-media-banner/c_057-global-media-banner`, 'C_057 - Global Media Banner', 'global-media-banner', { title: 'The old town after sunset', image: media('homepage/c_012-news-cards/news-2.svg'), caption: 'Evening walks through the restored lanes.' }, 'C_057 - Global Media Banner'),
    cf(`${C}/homepage/c_60-image-accordion/c60-image-accordion`, 'C_60 - Image + Accordion', 'image-accordion', {
      title: 'Plan your visit', image: media('header-navigation/c_002-header/menu-banner.svg'),
      items: ['When is the best time to visit?|October to April has the mildest weather.', 'How do I get there?|By metro, bus or car; parking is free at weekends.', 'What should I see first?|The old town, then dinner on the terraces.'],
    }, 'C_60 - Image + Accordion'),
    cf(`${C}/homepage/c_006-card-grid/c_006-card-grid`, 'C_006 - Card Grid', 'card-grid', { title: 'Explore', cards: ['Heritage|Walk the restored old streets.', 'Dining|Local and international restaurants.', 'Living|New homes inspired by traditional architecture.'] }, 'C_006-card-grid'),
  ];
  const about = [
    cf(`${C}/about-us/c_007-hero/c_007-hero`, 'C_007 - Hero', 'hero', { title: 'About us', subtitle: 'Twenty years of building places people love.', image: media('about-us/c_007-hero/about-hero.svg'), ctaLabel: 'Our sustainability goals', ctaLink: 'sustainability' }, 'c_007-hero'),
    cf(`${C}/about-us/c069-intro-text-block/c069-intro-text-block`, 'C069 - Intro Text Block', 'intro-text-block', { eyebrow: 'Our story', heading: 'From one project to a whole community', body: 'We started with a single restored street.\n\nToday the team plans, builds and runs neighbourhoods for culture, hospitality and living.' }, 'C069-Intro-Text-Block'),
  ];
  const green = [
    cf(`${C}/sustainability/c_007-hero/c_007-hero`, 'C_007 - Hero', 'hero', { title: 'Building for the next 300 years', subtitle: 'Traditional techniques and modern standards, side by side.', image: media('sustainability/c_007-hero/sustainability-hero-image.svg') }, 'c_007-hero'),
    cf(`${C}/sustainability/c_057-global-media-banner/c_057-global-media-banner`, 'C_057 - Global Media Banner', 'global-media-banner', { title: 'A green oasis', image: media('sustainability/c_058-image-blue-text/green-oasis.svg'), caption: 'Native planting and shaded walkways keep the streets cool.' }, 'C_057 - Global Media Banner'),
  ];
  const pg = (name, title, comps, extra) => cf(`${MYSITE_CF}/page/en/${name}`, title, 'page', {
    pageName: title, pageUrl: `/en/${name === 'homepage' ? '' : name}`, seoTitle: `${title} | My Site`, startingColour: 'Light', patternType: 'Arches', accentColor: '#b5653a',
    header: hdr, components: comps, footer: [ftr], ...(name === 'homepage' ? {} : { parentPage: MYSITE_HOME }), ...extra,
  });
  pg('homepage', 'Home', home, { seoDescription: 'My Site: heritage, culture and living.', keywords: ['My Site', 'Old town'], ogImage: media('homepage/c_001-hero-banner/home-hero.svg') });
  pg('about-us', 'About Us', about);
  pg('sustainability', 'Sustainability', green, { startingColour: 'Dark' });
  pg('projects', 'Projects', []);

  // Arabic: the same structure under /ar
  const CA = `${MYSITE_CF}/comp/ar`;
  folder(`${CA}/homepage`, 'Homepage');
  const hdrAr = cf(`${CA}/header/c_002-header/c_002-header`, 'C_002 - Header', 'header', { logoText: 'موقعي', menu: ['الرئيسية|homepage'] }, 'C_002 - Header');
  const ftrAr = cf(`${CA}/footer/c_003-footer/c_003-footer`, 'C_003 - Footer', 'footer', { tagline: 'أماكن للعيش والعمل والزيارة، مصممة حول الناس.', copyright: '© 2026 موقعي · محتوى تدريبي' }, 'C_003 - Footer');
  const homeAr = [
    cf(`${CA}/homepage/c_007-hero/c_007-hero`, 'C_007 - Hero', 'hero', { title: 'حيث تبدأ الأماكن المميزة', subtitle: 'شوارع قديمة متجددة وأحياء جديدة وثقافة في مكان واحد.', image: media('homepage/c_001-hero-banner/home-hero.svg'), ctaLabel: 'اكتشف المزيد', ctaLink: 'homepage' }, 'c_007-hero'),
    cf(`${CA}/homepage/c069-intro-text-block/c069-intro-text-block`, 'C069 - Intro Text Block', 'intro-text-block', { eyebrow: 'أهلاً بك', heading: 'مكان له ماضي ومستقبل', body: 'الصفحة دي مبنية من Content Fragments: كل جزء fragment لوحده، وصفحة الرئيسية بتشاور عليهم بالترتيب.' }, 'C069-Intro-Text-Block'),
  ];
  cf(`${MYSITE_CF}/page/ar/homepage`, 'الرئيسية', 'page', { pageName: 'الرئيسية', pageUrl: '/ar/', seoTitle: 'الرئيسية | موقعي', startingColour: 'Light', accentColor: '#b5653a', header: hdrAr, components: homeAr, footer: [ftrAr] });

  // a persisted query the frontend can call: /graphql/execute.json/mysite/page-home
  at(root, MYSITE_PQ, { 'jcr:primaryType': 'sling:Folder' });
  at(root, MYSITE_PQ + '/page-home', { 'jcr:primaryType': 'nt:unstructured', query: frontendQuery(MYSITE_HOME) });
  return !!page;
}

/* ---------- publish a fragment with what it references ---------- */

// Fragments and assets a fragment points to, followed recursively (a page → its components → their images)
function cfReferences(r, path) {
  const seen = new Set([path]);
  const out = [];
  const visit = p => {
    const model = cfModelOf(r, p);
    if (!model) return;
    const master = (JCR.get(r, p + '/jcr:content/data/master') || { props: {} }).props;
    for (const f of cfFields(r, model)) {
      if (f.metaType !== 'reference' && f.metaType !== 'fragment-reference') continue;
      for (const x of [].concat(master[f.name] || [])) {
        if (!x || seen.has(x) || !JCR.get(r, x)) continue;
        seen.add(x);
        out.push(x);
        // another page (e.g. Parent Page Path) is listed, but its own components are not followed
        if (isCF(r, x) && !String(cfModelOf(r, x)).endsWith('/page')) visit(x);
      }
    }
  };
  visit(path);
  return out;
}

// Not on Publish yet, or its content on Author differs from the published copy (timestamps ignored)
function needsPublish(r, p) {
  const pub = JCR.get(PR(), p);
  if (!pub) return true;
  const VOLATILE = /^(jcr:lastModified|jcr:lastModifiedBy|cq:lastModified|cq:lastReplicated|cq:lastReplicatedBy|cq:lastReplicationAction)$/;
  const strip = n => JSON.stringify(n, (k, v) => (VOLATILE.test(k) ? undefined : v));
  return strip(JCR.get(r, p)) !== strip(pub);
}

function cfPublishFlow(path) {
  const r = AR();
  const model = cfModelOf(r, path);
  const refs = cfReferences(r, path).filter(x => needsPublish(r, x));
  if (model && !JCR.get(PR(), model)) refs.unshift(model);
  const done = list => {
    queueReplication('Activate', [path, ...list]);
    flag('asset:published');
    flag('cf:published');
    toast(`Publishing <code>${esc(JCR.name(path))}</code>${list.length ? ` and ${list.length} reference(s)` : ''}…`);
    commit();
  };
  if (!refs.length) return done([]);
  openModal({
    title: 'Publish',
    okLabel: 'Publish',
    wide: true,
    body: `<p>This fragment references items that are <b>not published</b> (or changed since). Publish them too, or the frontend on Publish will miss those blocks.</p>
      <div class="ref-pick">${refs.map(x => `<label class="check"><input type="checkbox" name="ref" data-multi="1" value="${esc(x)}" checked>
        ${icon(isCF(r, x) ? 'DocumentFragment' : x.startsWith('/conf/') ? 'Table' : 'Image', 14)} <span><b>${esc(x.startsWith('/conf/') ? 'Model: ' + titleOf(r, x) : damTitle(r, x))}</b> <code>${esc(x)}</code></span></label>`).join('')}</div>`,
    ok: b => {
      const picked = formData(b).ref || [];
      if (picked.length === refs.length) flag('cf:published:refs');
      done(picked);
    },
  });
}

A.cfPublishPath = d => cfPublishFlow(d.p);
A.cfPreview = d => {
  const m = d.p.match(/\/cf\/page\/([^/]+)\/([^/]+)$/);
  if (m) go(`${FRONTEND}/${m[1]}/${m[2]}`, 'author');
};

/* ---------- the headless frontend (what Next.js does in the real project) ---------- */

function frontendQuery(cfPath) {
  return `{
  pageByPath(_path: "${cfPath}") {
    item {
      _path
      pageName
      seoTitle
      startingColour
      patternType
      accentColor
      header { logoText menu }
      components {
        __typename
        _path
        ... on HeroModel { title subtitle { plaintext } image { ... on ImageRef { _path } } ctaLabel ctaLink }
        ... on IntroTextBlockModel { eyebrow heading body { plaintext } }
        ... on GlobalMediaBannerModel { title caption image { ... on ImageRef { _path } } }
        ... on ImageAccordionModel { title items image { ... on ImageRef { _path } } }
        ... on CardGridModel { title cards }
      }
      footer { tagline { plaintext } links copyright }
    }
  }
}`;
}

const FRONT_CSS = `
:root { --accent: #b5653a; --bg: #f6f0e7; --ink: #2a2019; --muted: #6b5a4c; --card: #fffaf3; }
body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; background: var(--bg); color: var(--ink); line-height: 1.65; }
body.dark { --bg: #1d1712; --ink: #f4ece1; --muted: #c9b8a6; --card: #2a221b; }
h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; font-weight: 400; line-height: 1.15; margin: 0 0 .4em; }
a { color: inherit; }
.d-head { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px 40px; flex-wrap: wrap; }
.d-logo { font-family: Georgia, serif; font-size: 24px; letter-spacing: .2em; text-transform: uppercase; text-decoration: none; }
.d-nav { display: flex; gap: 22px; flex-wrap: wrap; }
.d-nav a { text-decoration: none; font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); padding-bottom: 4px; border-bottom: 2px solid transparent; }
.d-nav a.on, .d-nav a:hover { color: var(--ink); border-color: var(--accent); }
.d-hero { position: relative; min-height: 420px; display: flex; align-items: flex-end; background: #c9a27a center/cover no-repeat; color: #fff; }
.d-hero::before { content: ""; position: absolute; inset: 0; background: linear-gradient(transparent 30%, rgba(30, 20, 12, .7)); }
.d-hero-in { position: relative; padding: 48px 40px; max-width: 720px; }
.d-hero h1 { font-size: clamp(34px, 5vw, 56px); }
.d-hero p { font-size: 18px; opacity: .92; }
.d-btn { display: inline-block; margin-top: 10px; padding: 12px 26px; background: var(--accent); color: #fff; text-decoration: none; font-size: 13px; letter-spacing: .1em; text-transform: uppercase; }
.d-sec { padding: 56px 40px; max-width: 1080px; margin: 0 auto; }
.d-eyebrow { color: var(--accent); font-size: 12px; letter-spacing: .2em; text-transform: uppercase; margin-bottom: 8px; }
.d-intro h2 { font-size: clamp(28px, 3.6vw, 40px); max-width: 640px; }
.d-intro p { color: var(--muted); max-width: 680px; font-size: 17px; }
.d-banner img { display: block; width: 100%; height: auto; }
.d-banner figcaption { padding: 14px 40px; color: var(--muted); font-size: 14px; }
.d-banner h2 { padding: 0 40px; margin-top: 24px; }
.d-acc { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
.d-acc img { width: 100%; height: auto; display: block; }
.d-acc details { border-bottom: 1px solid color-mix(in srgb, var(--ink) 18%, transparent); padding: 14px 0; }
.d-acc summary { cursor: pointer; font-size: 18px; font-family: Georgia, serif; }
.d-acc details p { color: var(--muted); margin: 8px 0 0; }
.d-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-top: 20px; }
.d-card { background: var(--card); padding: 24px; border-top: 3px solid var(--accent); }
.d-card h3 { font-size: 22px; }
.d-card p { color: var(--muted); margin: 0; }
.d-missing { margin: 20px 40px; padding: 16px; border: 1px dashed #c0392b; color: #c0392b; font-size: 14px; }
.d-foot { margin-top: 40px; padding: 40px; background: #2a2019; color: #e9dccb; display: flex; justify-content: space-between; gap: 30px; flex-wrap: wrap; font-size: 14px; }
.d-foot nav { display: flex; gap: 18px; }
.d-foot small { display: block; margin-top: 14px; opacity: .7; }
[dir=rtl] .d-hero-in { text-align: right; }
@media (max-width: 700px) { .d-acc { grid-template-columns: 1fr; } .d-head, .d-sec, .d-hero-in { padding-left: 20px; padding-right: 20px; } }
`;

function frontendBody(r, item, lang) {
  const img = x => (x && x._path && assetSrc(r, x._path)) || '';
  const link = n => `${FRONTEND}/${lang}/${n || 'homepage'}`;
  const pair = s => String(s || '').split('|');
  const paras = t => String((t && t.plaintext) || '').split(/\n\s*\n/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
  const RENDER = {
    HeroModel: c => `<section class="d-hero" style="background-image:url('${img(c.image)}')"><div class="d-hero-in"><h1>${esc(c.title || '')}</h1>${paras(c.subtitle)}
      ${c.ctaLabel ? `<a class="d-btn" href="${link(c.ctaLink)}">${esc(c.ctaLabel)}</a>` : ''}</div></section>`,
    IntroTextBlockModel: c => `<section class="d-sec d-intro">${c.eyebrow ? `<div class="d-eyebrow">${esc(c.eyebrow)}</div>` : ''}<h2>${esc(c.heading || '')}</h2>${paras(c.body)}</section>`,
    GlobalMediaBannerModel: c => `<figure class="d-banner" style="margin:0">${c.title ? `<h2>${esc(c.title)}</h2>` : ''}${img(c.image) ? `<img src="${img(c.image)}" alt="">` : ''}${c.caption ? `<figcaption>${esc(c.caption)}</figcaption>` : ''}</figure>`,
    ImageAccordionModel: c => `<section class="d-sec"><div class="d-acc">${img(c.image) ? `<img src="${img(c.image)}" alt="">` : '<div></div>'}<div><h2>${esc(c.title || '')}</h2>
      ${[].concat(c.items || []).map(s => { const [q, a] = pair(s); return `<details><summary>${esc(q)}</summary><p>${esc(a || '')}</p></details>`; }).join('')}</div></div></section>`,
    CardGridModel: c => `<section class="d-sec"><h2>${esc(c.title || '')}</h2><div class="d-cards">${[].concat(c.cards || []).map(s => { const [t, x] = pair(s); return `<div class="d-card"><h3>${esc(t)}</h3><p>${esc(x || '')}</p></div>`; }).join('')}</div></section>`,
  };
  const h = item.header;
  const page = (item._path || '').split('/').pop();
  const head = h ? `<header class="d-head"><a class="d-logo" href="${link('homepage')}">${esc(h.logoText || '')}</a><nav class="d-nav">${[].concat(h.menu || []).map(s => { const [l, n] = pair(s); return `<a href="${link(n)}" class="${n === page ? 'on' : ''}">${esc(l)}</a>`; }).join('')}</nav></header>` : '';
  const comps = [].concat(item.components || []).map(c => (RENDER[c.__typename] ? RENDER[c.__typename](c) : `<div class="d-missing">The frontend has no renderer for <b>${esc(c.__typename)}</b> (<code>${esc(c._path)}</code>). A developer adds one per component model.</div>`)).join('')
    || '<div class="d-missing">This page has no components yet. Add fragments in its <b>Components</b> tab.</div>';
  const foot = [].concat(item.footer || []).map(f => `<footer class="d-foot"><div>${paras(f.tagline)}<small>${esc(f.copyright || '')}</small></div>
    <nav>${[].concat(f.links || []).map(s => { const [l, n] = pair(s); return `<a href="${link(n)}">${esc(l)}</a>`; }).join('')}</nav></footer>`).join('');
  return `${head}${comps}${foot}`;
}

function frontendRoute(k, path) {
  const r = S.repos[k];
  const m = path.match(/^\/frontend\/mysite\/([a-z]{2})(?:\/([^/?#.]*))?/);
  const lang = m ? m[1] : 'en';
  const name = (m && m[2]) || 'homepage';
  const cfPath = `${MYSITE_CF}/page/${lang}/${name}`;
  const src = k === 'publish' ? 'Publish (the live site)' : 'Author (preview)';
  const head = extra => `<div class="disp-strip fe-strip"><b>My Site frontend</b><span>a Next.js-style app · reads <b>${src}</b> with GraphQL <code>pageByPath</code></span>${extra || ''}<span class="spacer"></span>
    <button class="btn small quiet" data-act="feQuery">${S.ui.feQuery ? 'Hide' : 'Show'} query &amp; JSON</button></div>`;
  if (!m || !JCR.get(r, cfPath) || !isCF(r, cfPath)) {
    const onAuthor = k === 'publish' && JCR.get(AR(), cfPath);
    return `${head()}<div class="sling-err"><h1>404 · page not found</h1><p>The frontend looked for the page fragment <code>${esc(cfPath)}</code> on ${esc(k)}.</p>
      ${onAuthor ? '<p><b>It exists on Author</b> but is not published. Publish it together with its references.</p>' : ''}</div>`;
  }
  const q = frontendQuery(cfPath);
  const res = GQL.execute(r, q);
  const item = res.data && res.data.pageByPath && res.data.pageByPath.item;
  flag('headless:' + k);
  flag(`headless:${k}:${name}`);
  // references the page lists but this instance can't resolve (usually: not published)
  const listed = [].concat((JCR.get(r, cfPath + '/jcr:content/data/master') || { props: {} }).props.components || []).filter(Boolean);
  const missing = listed.filter(x => !JCR.get(r, x));
  const warn = missing.length ? `<span class="warn">⚠ ${missing.length} component fragment(s) are missing on ${esc(k)}${k === 'publish' ? ' — publish the page with its references' : ''}</span>` : '';
  const panel = S.ui.feQuery ? `<div class="fe-json"><div><b>Query</b><pre>${esc(q)}</pre></div><div><b>Response</b><pre>${esc(JSON.stringify(res, null, 2))}</pre></div></div>` : '';
  if (!item) return `${head(warn)}${panel}<div class="sling-err"><h1>GraphQL error</h1><pre>${esc(JSON.stringify(res.errors || res, null, 2))}</pre></div>`;
  const dark = item.startingColour === 'Dark';
  const accent = /^#[0-9a-f]{3,8}$/i.test(item.accentColor || '') ? item.accentColor : '#b5653a';
  const doc = docShell(item.seoTitle || item.pageName || 'My Site', lang, FRONT_CSS + `:root{--accent:${accent}}`, frontendBody(r, item, lang), false)
    .replace('<body class="page basicpage"', `<body class="${dark ? 'dark' : ''}" ${lang === 'ar' ? 'dir="rtl"' : ''}`);
  mountFrame(doc, d => wireViewLinks(d));
  return `<div class="pageview with-strip">${head(warn)}${panel}${frameHtml()}</div>`;
}

A.feQuery = () => {
  S.ui.feQuery = !S.ui.feQuery;
  commit();
};
