# Dream Anime Wiki

A searchable, GitHub-native archive of Dream Anime episodes. The site keeps episode source in standard MediaWiki wikitext while publishing a fast static wiki through GitHub Pages.

## Why this architecture

- **Agent-managed:** Jet's authorized ChatGPT Work cloud pipeline publishes each `.wiki` file and cover through GitHub.
- **Read-only for visitors:** the public repository exposes source for transparency, but the site does not offer public or manual page submission controls.
- **No local runner:** GitHub Actions builds and deploys the public site in the cloud.
- **Portable:** the source remains plain MediaWiki wikitext rather than being locked into a database or CMS.
- **Searchable:** the build indexes titles, page contents, and original dream creation dates.

## Publishing policy

New episodes are published only through the private `dream-pipeline-work-web` skill running in ChatGPT Work. The cloud agent retrieves the canonical Dream Journal, generates the cover, creates the MediaWiki source, commits both files, and verifies the GitHub Pages deployment.

Public visitors can read the repository and may technically fork it under GitHub's public-repository model, but they cannot push changes to this repository or publish pages to the production site without authenticated write access granted by the owner. Pull requests from outside contributors are not an accepted publishing route.

Repository maintainers can validate the site build with:

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
