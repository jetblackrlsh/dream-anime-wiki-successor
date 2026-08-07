import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDreamDate, parseInfobox, plainText, renderWikitext, slugify } from '../scripts/lib/wiki.mjs';
import { buildRss } from '../scripts/lib/rss.mjs';

const sample = `\uFEFF{{Infobox|title1=Lucid_Test|image1=Lucid-Test.png}}

==Original Dream Journal Entry That Inspired The Episode==

I crossed a [[Golden Portal|gold portal]] into the stars.

==Notes==

This dream anime episode was originally created on April 13, 2026

[[Category:Dream Anime Episode]]`;

test('parses the existing Dream Anime infobox format', () => {
  assert.deepEqual(parseInfobox(sample), { title1: 'Lucid_Test', image1: 'Lucid-Test.png' });
});

test('extracts and normalizes dream creation dates', () => {
  assert.deepEqual(extractDreamDate(sample), {
    iso: '2026-04-13', label: 'April 13, 2026', timestamp: Date.UTC(2026, 3, 13)
  });
  assert.equal(extractDreamDate('originally created on 01/11/2025.').iso, '2025-01-11');
  assert.equal(extractDreamDate('originally created on October 23, 2025 [[Category:Dream Anime Episode]]').iso, '2025-10-23');
});

test('renders headings and internal wiki links', () => {
  const html = renderWikitext(sample, (title) => `/wiki/${slugify(title)}/`);
  assert.match(html, /<h2 id="original-dream-journal-entry-that-inspired-the-episode">/);
  assert.match(html, /href="\/wiki\/golden-portal\/">gold portal<\/a>/);
  assert.doesNotMatch(html, /Category:/);
});

test('plain text is suitable for full-text search', () => {
  const text = plainText(sample);
  assert.match(text, /gold portal/);
  assert.doesNotMatch(text, /Infobox|Category:/);
});

test('builds a standards-friendly RSS feed with absolute episode links', () => {
  const rss = buildRss({
    siteBase: 'https://example.com/dream-wiki/',
    episodes: [{
      title: 'Stars & Dreams',
      slug: 'stars-dreams',
      summary: 'A <bright> dream.',
      date: { timestamp: Date.UTC(2026, 7, 6) }
    }]
  });

  assert.match(rss, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(rss, /<atom:link href="https:\/\/example\.com\/dream-wiki\/rss\.xml"/);
  assert.match(rss, /<title>Stars &amp; Dreams<\/title>/);
  assert.match(rss, /<link>https:\/\/example\.com\/dream-wiki\/wiki\/stars-dreams\/<\/link>/);
  assert.match(rss, /<pubDate>Thu, 06 Aug 2026 00:00:00 GMT<\/pubDate>/);
  assert.match(rss, /<description>A &lt;bright&gt; dream\.<\/description>/);
});
