# Dream Anime Wiki

A searchable, GitHub-native archive of Dream Anime episodes. The site keeps episode source in standard MediaWiki wikitext while publishing a fast static wiki through GitHub Pages.

## Why this architecture

- **Agent-friendly:** an agent adds a `.wiki` file and pushes a commit through GitHub.
- **Human-friendly:** pages can be created or edited in GitHub's web editor.
- **No local runner:** GitHub Actions builds and deploys the public site in the cloud.
- **Portable:** the source remains plain MediaWiki wikitext rather than being locked into a database or CMS.
- **Searchable:** the build indexes titles, page contents, and original dream creation dates.

## Add a page

Copy [`content/_templates/dream-anime-episode.wiki`](content/_templates/dream-anime-episode.wiki) into `content/episodes/`, rename it, and fill in the wikitext. If the page has artwork, place it in `public/images/` and use that filename in `image1=`.

```powershell
npm test
npm run build
```

Open `dist/index.html` through a local HTTP server to preview the result. For example:

```powershell
npx serve dist
```

## Import from Fandom

The migration script reads every namespace-0 page in `Category:Dream Anime Episode`, preserves its raw wikitext, and creates an attribution/provenance catalog.

```powershell
npm run import:fandom
```

Imported page images are copied into `public/images/imported/` so the successor does not depend on Fandom to render them. Their original URLs remain in `content/import-catalog.json` for provenance. New images can be stored directly in `public/images/`.

Use `npm run import:fandom -- --refresh-images` when existing imported image files should also be downloaded again.

## Licenses and attribution

Site code is licensed under the MIT License. Imported wiki content remains available under the license stated on its original Fandom page, generally CC BY-SA, and every generated article links back to its source revision for attribution. See `LICENSE-CODE` and `LICENSE-CONTENT`.
