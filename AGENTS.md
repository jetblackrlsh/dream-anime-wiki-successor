# Dream Anime Wiki agent guide

This repository is the GitHub-native successor to the Dream Anime Wiki.

## Adding an episode

1. Create one UTF-8 `.wiki` file in `content/episodes/`.
2. Use ordinary MediaWiki wikitext. Start from `content/_templates/dream-anime-episode.wiki`.
3. Include `[[Category:Dream Anime Episode]]` exactly.
4. Include a Notes sentence in this form so date search works:
   `This dream anime episode was originally created on Month DD, YYYY`
5. Put new images in `public/images/` and reference the exact filename with `image1=` in the Infobox.
6. Run `npm test` and `npm run build` before committing.

Do not hand-edit `content/import-catalog.json`; it records the one-time Fandom migration. New pages do not need catalog entries.

## Delivery

Commits pushed to `main` deploy automatically to GitHub Pages. Keep page-source changes narrow: normally one `.wiki` file plus any images it needs.
