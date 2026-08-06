# Contributing episodes

Episode pages deliberately use the same wikitext style as the original Dream Anime Wiki.

## In GitHub's web editor

1. Open `content/_templates/dream-anime-episode.wiki`.
2. Choose **Copy raw file**, then create a new file under `content/episodes/` with a descriptive `.wiki` filename.
3. Paste the template, replace the placeholders, and commit to `main`.
4. If needed, upload art to `public/images/` in a second commit and set the matching `image1=` filename.

The deployment workflow validates and publishes the site automatically.

## Source rules

- Keep raw MediaWiki headings such as `==Links==` and `==Notes==`.
- Use `[[Page Title]]` for internal links.
- Keep `[[Category:Dream Anime Episode]]` on every episode.
- Use a parseable creation date in Notes: `Month DD, YYYY` or `MM/DD/YYYY`.
- Do not add YAML front matter. Metadata is derived from the wikitext.
