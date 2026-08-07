function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function buildRss({ episodes, siteBase, feedPath = 'rss.xml', limit = 50 }) {
  const normalizedBase = String(siteBase).replace(/\/$/, '');
  const feedUrl = `${normalizedBase}/${feedPath.replace(/^\//, '')}`;
  const items = episodes.slice(0, limit).map((episode) => {
    const url = `${normalizedBase}/wiki/${episode.slug}/`;
    const pubDate = episode.date?.timestamp
      ? new Date(episode.date.timestamp).toUTCString()
      : new Date(0).toUTCString();
    return `    <item>
      <title>${escapeXml(episode.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <description>${escapeXml(episode.summary)}</description>
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Dream Anime Wiki</title>
    <link>${escapeXml(`${normalizedBase}/`)}</link>
    <description>The latest dream anime episodes from Jet's living archive of dreamed worlds.</description>
    <language>en-us</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}
