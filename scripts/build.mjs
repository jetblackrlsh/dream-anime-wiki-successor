import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  escapeHtml, extractDreamDate, parseInfobox, plainText, renderWikitext, slugify, titleFromSource
} from './lib/wiki.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'content', 'episodes');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const rawBase = process.env.BASE_PATH ?? (repositoryName ? `/${repositoryName}` : '');
const base = rawBase.replace(/\/$/, '');
const homeUrl = `${base}/` || '/';
const repo = process.env.GITHUB_REPOSITORY || 'jetblackrlsh/dream-anime-wiki-successor';

function siteUrl(value = '') {
  return `${base}/${String(value).replace(/^\//, '')}`;
}

async function readCatalog() {
  try {
    const parsed = JSON.parse(await readFile(path.join(root, 'content', 'import-catalog.json'), 'utf8'));
    return new Map(parsed.pages.map((page) => [page.filename, page]));
  } catch {
    return new Map();
  }
}

function localImageUrl(name) {
  if (!name) return '';
  return siteUrl(`images/${encodeURIComponent(name).replaceAll('%2F', '/')}`);
}

function shell({ title, description, body, pageClass = '', canonicalPath = '', structuredData = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#05030b">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)} · Dream Anime Wiki</title>
  <link rel="canonical" href="${escapeHtml(canonicalPath)}">
  <link rel="icon" href="${siteUrl('favicon.svg')}" type="image/svg+xml">
  <link rel="stylesheet" href="${siteUrl('styles.css')}">
  ${structuredData}
</head>
<body class="${pageClass}">
  <canvas id="starfield" aria-hidden="true"></canvas>
  <div class="aurora aurora-one" aria-hidden="true"></div>
  <div class="aurora aurora-two" aria-hidden="true"></div>
  <header class="site-header">
    <a class="brand" href="${homeUrl}" aria-label="Dream Anime Wiki home">
      <span class="brand-mark" aria-hidden="true">✦</span>
      <span>Dream Anime Wiki</span>
    </a>
    <nav aria-label="Primary navigation">
      <a href="${homeUrl}#episodes">Episodes</a>
      <a href="https://github.com/${repo}/tree/main/content/episodes">Source</a>
    </nav>
  </header>
  <main>${body}</main>
  <footer>
    <span>Dream Anime Wiki · A living archive of dreamed worlds</span>
    <span>Source preserved as MediaWiki wikitext on <a href="https://github.com/${repo}">GitHub</a></span>
  </footer>
  <script>window.DREAM_WIKI_BASE=${JSON.stringify(base)};</script>
  <script src="${siteUrl('site.js')}" defer></script>
</body>
</html>`;
}

function episodeRow(episode) {
  return `<article class="episode-row" data-episode-row>
    <a href="${episode.url}">
      <span class="episode-date">${escapeHtml(episode.date.label)}</span>
      <h3>${escapeHtml(episode.title)}</h3>
      <p>${escapeHtml(episode.summary)}</p>
      <span class="read-link">Enter this dream <span aria-hidden="true">↗</span></span>
    </a>
  </article>`;
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await cp(publicDir, distDir, { recursive: true });

const catalog = await readCatalog();
const files = (await readdir(contentDir)).filter((name) => name.endsWith('.wiki')).sort();
const drafts = [];

for (const filename of files) {
  const source = await readFile(path.join(contentDir, filename), 'utf8');
  if (!/\[\[Category:Dream Anime Episode\]\]/i.test(source)) continue;
  const imported = catalog.get(filename);
  const title = imported?.title || titleFromSource(source, filename);
  const slug = slugify(title);
  const text = plainText(source);
  const date = extractDreamDate(source);
  const infobox = parseInfobox(source);
  const summarySource = text
    .replace(/^Original Dream Journal Entry That Inspired The Episode\s*/i, '')
    .replace(/\s+Links\s+Episode Link:[\s\S]*$/i, '');
  const summary = summarySource.length > 190 ? `${summarySource.slice(0, 187).trim()}…` : summarySource;
  const imageName = infobox.image1 || imported?.imageName || '';
  const imageUrl = imported?.localImagePath ? siteUrl(imported.localImagePath) : localImageUrl(imageName);
  drafts.push({ filename, source, imported, title, slug, text, date, summary, imageName, imageUrl });
}

const titleToSlug = new Map(drafts.map((episode) => [episode.title.toLowerCase(), episode.slug]));
const episodes = drafts.map((episode) => {
  const url = siteUrl(`wiki/${episode.slug}/`);
  const linkForTitle = (target) => {
    const targetSlug = titleToSlug.get(String(target).replaceAll('_', ' ').toLowerCase()) || slugify(target);
    return siteUrl(`wiki/${targetSlug}/`);
  };
  return { ...episode, url, html: renderWikitext(episode.source, linkForTitle) };
});

episodes.sort((a, b) => b.date.timestamp - a.date.timestamp || a.title.localeCompare(b.title));

for (const episode of episodes) {
  const directory = path.join(distDir, 'wiki', episode.slug);
  await mkdir(directory, { recursive: true });
  const image = episode.imageUrl ? `<figure class="episode-art">
      <img src="${escapeHtml(episode.imageUrl)}" alt="Artwork for ${escapeHtml(episode.title)}" loading="eager">
    </figure>` : '';
  const sourceLink = `https://github.com/${repo}/blob/main/content/episodes/${encodeURIComponent(episode.filename)}`;
  const attribution = episode.imported?.sourceUrl
    ? `<a href="${escapeHtml(episode.imported.sourceUrl)}">Original Fandom page</a><span aria-hidden="true">·</span>` : '';
  const body = `<section class="article-hero">
      <a class="eyebrow back-link" href="${homeUrl}#episodes">← All dream episodes</a>
      <p class="eyebrow">Dream Anime Episode · ${escapeHtml(episode.date.label)}</p>
      <h1 class="neon-title">${escapeHtml(episode.title)}</h1>
    </section>
    <div class="article-layout">
      ${image}
      <article class="wiki-article">${episode.html}</article>
      <aside class="source-panel" aria-label="Page source">
        <p class="eyebrow">Open source dream</p>
        <p>This page is generated from ordinary MediaWiki wikitext.</p>
        <div class="source-actions">${attribution}<a href="${sourceLink}">View source</a></div>
        <details>
          <summary>Read raw wikitext</summary>
          <pre>${escapeHtml(episode.source)}</pre>
        </details>
      </aside>
    </div>`;
  const structuredData = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CreativeWork', name: episode.title,
    dateCreated: episode.date.iso || undefined, description: episode.summary,
    url: episode.url
  }).replaceAll('<', '\\u003c')}</script>`;
  await writeFile(path.join(directory, 'index.html'), shell({
    title: episode.title,
    description: episode.summary,
    body,
    pageClass: 'article-page',
    canonicalPath: episode.url,
    structuredData
  }));
}

const newest = episodes.slice(0, 18).map(episodeRow).join('\n');
const body = `<section class="hero">
    <div class="hero-orbit" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="hero-copy">
      <p class="eyebrow reveal-one">The public archive of dreamed worlds</p>
      <h1 class="reveal-two"><span class="neon-title">Dream Anime</span><br><span class="gold-shimmer">Wiki</span></h1>
      <p class="hero-intro reveal-three">Every night opens another universe. Search ${episodes.length.toLocaleString('en-US')} dream episodes by title, story, or the day they were born.</p>
      <a class="hero-cta reveal-three" href="#episodes">Explore the archive <span aria-hidden="true">↓</span></a>
    </div>
    <p class="hero-coordinate" aria-hidden="true">ARCHIVE / ${String(episodes.length).padStart(4, '0')} DREAMS / STILL GROWING</p>
  </section>
  <section class="archive" id="episodes">
    <div class="archive-heading">
      <div>
        <p class="eyebrow">Celestial index</p>
        <h2>Find a dream</h2>
      </div>
      <p>Search every title and every word, or travel to a specific creation date.</p>
    </div>
    <form class="search-controls" id="search-form" role="search">
      <label class="search-field">
        <span>Search the archive</span>
        <input id="search-input" name="q" type="search" placeholder="Try “Lucid Light” or “dragon”…" autocomplete="off">
      </label>
      <label class="date-field">
        <span>Dream creation date</span>
        <input id="date-input" name="date" type="date">
      </label>
      <label class="sort-field">
        <span>Order</span>
        <select id="sort-input" name="sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
        </select>
      </label>
    </form>
    <div class="result-summary" aria-live="polite"><span id="result-count">Latest ${Math.min(18, episodes.length)} episodes</span><button id="clear-search" type="button" hidden>Clear search</button></div>
    <div class="episode-list" id="episode-list">${newest}</div>
    <noscript><p>JavaScript enables full-text search. The newest episodes remain available above.</p></noscript>
  </section>
  <section class="contribute">
    <p class="eyebrow">Agent-managed archive</p>
    <h2>New dreams arrive through the cloud pipeline.</h2>
    <p>Episodes are published by Jet's authorized ChatGPT Work agent. The public repository preserves readable source, but this site does not accept public or manual page submissions.</p>
  </section>`;

await writeFile(path.join(distDir, 'index.html'), shell({
  title: 'Home',
  description: `Search ${episodes.length} Dream Anime episodes by title, content, and dream creation date.`,
  body,
  pageClass: 'home-page',
  canonicalPath: homeUrl
}));

const searchIndex = episodes.map((episode) => ({
  title: episode.title,
  url: episode.url,
  date: episode.date.iso,
  dateLabel: episode.date.label,
  timestamp: episode.date.timestamp,
  summary: episode.summary,
  text: episode.text
}));
await writeFile(path.join(distDir, 'search-index.json'), JSON.stringify(searchIndex));
await writeFile(path.join(distDir, '.nojekyll'), '');
await writeFile(path.join(distDir, '404.html'), shell({
  title: 'Dream not found',
  description: 'This dream could not be found in the archive.',
  body: `<section class="not-found"><p class="eyebrow">Lost between worlds</p><h1 class="neon-title">Dream not found</h1><p>The page may have moved to another universe.</p><a class="hero-cta" href="${homeUrl}">Return to the archive</a></section>`,
  pageClass: 'article-page',
  canonicalPath: siteUrl('404.html')
}));

console.log(`Built ${episodes.length} episode pages in ${path.relative(root, distDir)}.`);
