import path from 'node:path';

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function slugify(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

export function filenameForPage(page) {
  return `${page.pageid}-${slugify(page.title)}.wiki`;
}

export function parseInfobox(source = '') {
  const match = source.replace(/^\uFEFF/, '').match(/\{\{Infobox\|([\s\S]*?)\}\}/i);
  if (!match) return {};

  const values = {};
  for (const part of match[1].split('|')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim().toLowerCase();
    values[key] = part.slice(separator + 1).trim();
  }
  return values;
}

export function titleFromSource(source, filename) {
  const infoboxTitle = parseInfobox(source).title1;
  if (infoboxTitle && !/^EPISODE_TITLE$/i.test(infoboxTitle)) {
    return infoboxTitle.replaceAll('_', ' ').trim();
  }
  return path.basename(filename, path.extname(filename))
    .replace(/^\d+-/, '')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function extractDreamDate(source = '') {
  const match = source.match(/originally created on\s+([^\n\r<\[]+)/i);
  if (!match) return { iso: '', label: 'Date unknown', timestamp: 0 };

  const raw = match[1].trim().replace(/[.\s]+$/, '');
  let date;
  const numeric = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (numeric) {
    date = new Date(Date.UTC(Number(numeric[3]), Number(numeric[1]) - 1, Number(numeric[2])));
  } else {
    const parsed = Date.parse(`${raw} UTC`);
    if (!Number.isNaN(parsed)) date = new Date(parsed);
  }

  if (!date || Number.isNaN(date.valueOf())) return { iso: '', label: raw, timestamp: 0 };
  const iso = date.toISOString().slice(0, 10);
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric'
  }).format(date);
  return { iso, label, timestamp: date.valueOf() };
}

export function plainText(source = '') {
  return source
    .replace(/^\uFEFF/, '')
    .replace(/\{\{Infobox\|[\s\S]*?\}\}/gi, ' ')
    .replace(/\[\[Category:[^\]]+\]\]/gi, ' ')
    .replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, ' ')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[(https?:\/\/\S+)\s+([^\]]+)\]/g, '$2')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/={2,6}([^=]+)={2,6}/g, '$1')
    .replace(/'{2,3}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\s*#]+/g, ' ')
    .trim();
}

function inlineMarkup(value, linkForTitle) {
  let html = escapeHtml(value);
  html = html.replace(/&#039;&#039;&#039;(.+?)&#039;&#039;&#039;/g, '<strong>$1</strong>');
  html = html.replace(/&#039;&#039;(.+?)&#039;&#039;/g, '<em>$1</em>');
  html = html.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, target, label) =>
    `<a href="${escapeHtml(linkForTitle(target))}">${label}</a>`);
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_, target) =>
    `<a href="${escapeHtml(linkForTitle(target))}">${target}</a>`);
  html = html.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g,
    '<a href="$1" rel="noopener noreferrer">$2</a>');
  html = html.replace(/(^|\s)(https?:\/\/[^\s<]+)/g,
    '$1<a href="$2" rel="noopener noreferrer">$2</a>');
  return html;
}

export function renderWikitext(source = '', linkForTitle = () => '#') {
  const cleaned = source
    .replace(/^\uFEFF/, '')
    .replace(/\{\{Infobox\|[\s\S]*?\}\}/gi, '')
    .replace(/\[\[Category:[^\]]+\]\]/gi, '')
    .replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<youtube[^>]*>[\s\S]*?<\/youtube>/gi, '');

  const lines = cleaned.split(/\r?\n/);
  const parts = [];
  let paragraph = [];
  let listType = '';

  const flushParagraph = () => {
    if (!paragraph.length) return;
    parts.push(`<p>${inlineMarkup(paragraph.join(' '), linkForTitle)}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listType) return;
    parts.push(`</${listType}>`);
    listType = '';
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(/^(={2,6})\s*(.+?)\s*\1$/);
    const list = line.match(/^([*#])\s*(.+)$/);

    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(6, heading[1].length);
      const id = slugify(plainText(heading[2]));
      parts.push(`<h${level} id="${id}">${inlineMarkup(heading[2], linkForTitle)}</h${level}>`);
    } else if (list) {
      flushParagraph();
      const nextType = list[1] === '*' ? 'ul' : 'ol';
      if (listType !== nextType) {
        closeList();
        listType = nextType;
        parts.push(`<${listType}>`);
      }
      parts.push(`<li>${inlineMarkup(list[2], linkForTitle)}</li>`);
    } else if (!line) {
      flushParagraph();
      closeList();
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  closeList();
  return parts.join('\n');
}
