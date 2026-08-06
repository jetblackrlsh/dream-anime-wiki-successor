import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { filenameForPage, parseInfobox, slugify } from './lib/wiki.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const episodeDir = path.join(root, 'content', 'episodes');
const importedImageDir = path.join(root, 'public', 'images', 'imported');
const catalogPath = path.join(root, 'content', 'import-catalog.json');
const api = 'https://dream-anime.fandom.com/api.php';
const headers = { 'User-Agent': 'DreamAnimeWikiSuccessor/1.0 (public archive migration)' };
const refreshImages = process.argv.includes('--refresh-images');

async function request(params) {
  const url = new URL(api);
  for (const [key, value] of Object.entries({ format: 'json', formatversion: '2', origin: '*', ...params })) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Fandom API ${response.status}: ${response.statusText}`);
  return response.json();
}

async function categoryMembers() {
  const pages = [];
  let cmcontinue = '';
  do {
    const data = await request({
      action: 'query', list: 'categorymembers', cmtitle: 'Category:Dream Anime Episode',
      cmnamespace: '0', cmlimit: '500', ...(cmcontinue ? { cmcontinue } : {})
    });
    pages.push(...data.query.categorymembers);
    cmcontinue = data.continue?.cmcontinue || '';
  } while (cmcontinue);
  return pages;
}

function chunks(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size));
}

function imageKey(name = '') {
  return String(name).replaceAll('_', ' ').trim().toLocaleLowerCase();
}

async function revisions(pages) {
  const results = [];
  for (const batch of chunks(pages, 50)) {
    const data = await request({
      action: 'query', prop: 'revisions', pageids: batch.map((page) => page.pageid).join('|'),
      rvprop: 'ids|timestamp|content', rvslots: 'main'
    });
    results.push(...data.query.pages);
    process.stdout.write(`Fetched ${results.length}/${pages.length} page sources\r`);
  }
  process.stdout.write('\n');
  return results;
}

async function imageInfo(imageNames) {
  const byName = new Map();
  for (const batch of chunks([...new Set(imageNames.filter(Boolean))], 50)) {
    const data = await request({
      action: 'query', prop: 'imageinfo', titles: batch.map((name) => `File:${name}`).join('|'),
      iiprop: 'url|mime|size', iiurlwidth: '1600'
    });
    for (const page of data.query.pages) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const imageName = page.title.replace(/^File:/i, '');
      byName.set(imageKey(imageName), {
        imageName,
        sourceImageUrl: info.thumburl || info.url,
        originalImageUrl: info.url,
        mime: info.mime,
        width: info.width,
        height: info.height,
        size: info.size,
        filePageId: page.pageid
      });
    }
  }
  return byName;
}

function imageFilename(imageName, info) {
  const stem = path.basename(imageName, path.extname(imageName));
  // Fandom's static thumbnail endpoint currently transcodes these responses to WebP.
  return `${info.filePageId}-${slugify(stem)}.webp`;
}

async function downloadImages(images) {
  await mkdir(importedImageDir, { recursive: true });
  const prepared = [...images.values()].map((info) => ({
    ...info,
    localFilename: imageFilename(info.imageName, info)
  }));

  const expected = new Set(prepared.map((image) => image.localFilename));
  for (const existing of await readdir(importedImageDir)) {
    if (!expected.has(existing)) await rm(path.join(importedImageDir, existing));
  }

  let completed = 0;
  for (const batch of chunks(prepared, 8)) {
    await Promise.all(batch.map(async (image) => {
      const target = path.join(importedImageDir, image.localFilename);
      if (!refreshImages) {
        try {
          if ((await stat(target)).size > 0) {
            completed += 1;
            process.stdout.write(`Prepared ${completed}/${prepared.length} page images\r`);
            return;
          }
        } catch {}
      }
      const response = await fetch(image.sourceImageUrl, { headers });
      if (!response.ok) throw new Error(`Image download ${response.status}: ${image.imageName}`);
      await writeFile(target, Buffer.from(await response.arrayBuffer()));
      completed += 1;
      process.stdout.write(`Prepared ${completed}/${prepared.length} page images\r`);
    }));
  }
  process.stdout.write('\n');
  return new Map(prepared.map((image) => [imageKey(image.imageName), image]));
}

await mkdir(episodeDir, { recursive: true });
const members = await categoryMembers();
console.log(`Found ${members.length} Dream Anime Episode pages.`);
const pages = await revisions(members);
const prepared = pages.map((page) => {
  const revision = page.revisions?.[0];
  const source = revision?.slots?.main?.content || '';
  const imageName = parseInfobox(source).image1 || '';
  return { page, revision, source, imageName, filename: filenameForPage(page) };
});
const images = await imageInfo(prepared.map((item) => item.imageName));
const downloadedImages = await downloadImages(images);

const expected = new Set(prepared.map((item) => item.filename));
for (const existing of await readdir(episodeDir)) {
  if (/^\d+-.*\.wiki$/i.test(existing) && !expected.has(existing)) {
    await rm(path.join(episodeDir, existing));
  }
}

const catalog = [];
for (const item of prepared) {
  await writeFile(path.join(episodeDir, item.filename), item.source, 'utf8');
  const image = downloadedImages.get(imageKey(item.imageName));
  catalog.push({
    filename: item.filename,
    title: item.page.title,
    pageid: item.page.pageid,
    revid: item.revision?.revid || null,
    sourceTimestamp: item.revision?.timestamp || null,
    sourceUrl: `https://dream-anime.fandom.com/wiki/${encodeURIComponent(item.page.title.replaceAll(' ', '_'))}`,
    imageName: item.imageName,
    localImagePath: image ? `images/imported/${image.localFilename}` : '',
    sourceImageUrl: image?.sourceImageUrl || '',
    originalImageUrl: image?.originalImageUrl || ''
  });
}

await writeFile(catalogPath, `${JSON.stringify({
  source: 'https://dream-anime.fandom.com/',
  category: 'Dream Anime Episode',
  importedAt: new Date().toISOString(),
  pageCount: catalog.length,
  pages: catalog
}, null, 2)}\n`, 'utf8');

console.log(`Imported ${catalog.length} pages into ${path.relative(root, episodeDir)}.`);
