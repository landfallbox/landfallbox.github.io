# Astro Starter Kit: Blog

https://landfallbox.github.io/

```sh
npm create astro@latest -- --template blog
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and Open Graph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run sync:dl`         | Sync deep learning notes into the blog series    |
| `npm run sync:dl:check`   | Check whether deep learning notes need syncing   |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Content Sync

The `深度学习简史` series is synced from `../zhihu_series_scraper/notes/dl` by a deterministic local script.

When a note is ready to publish:

1. Save the note as a numbered Markdown file in the source directory, for example `009_GPT-3.md`.
2. Run `npm run sync:dl`.
3. Run `npm run build` before publishing.

The sync script scans all numbered Markdown files in `DL_NOTES_DIR`, matches existing blog posts by their numeric prefix, preserves existing frontmatter, converts note headings for the blog layout, updates `src/content/series/deep-learning-basics.md`, and copies images from the source `images` folder. For a brand-new note, it derives the slug/title/date from the source note, generates `description` through `DL_DESCRIPTION_COMMAND`, and generates `tags` through `DL_TAGS_COMMAND`; edit the generated blog frontmatter if you want to customize it, and future syncs will preserve that metadata. `DL_NOTES_DIR` is required and should be set in `.env` or the process environment.

`DL_DESCRIPTION_COMMAND` should be a local model command that reads JSON from stdin and writes one description line to stdout. The JSON payload includes `title`, `slug`, `markdown`, and `instruction`. If a brand-new post needs a description and this command is not set, sync fails instead of extracting a paragraph from the article.

`DL_TAGS_COMMAND` should be a local model command that reads JSON from stdin and writes a JSON string array to stdout, for example `["自然语言处理", "深度学习"]`. The JSON payload includes `title`, `slug`, `markdown`, `existingTags`, and `instruction`; the model should prefer `existingTags` and add new tags only when needed.

This repository includes OpenAI-compatible wrappers for those commands:

```powershell
Copy-Item .env.example .env
# Fill provider API keys, models, and base URLs in .env, then run:
npm run sync:dl
```

Model providers are tried in `OPENAI_PROVIDER_ORDER`, a comma-separated list such as `primary,fallback`. If `OPENAI_PROVIDER_ORDER` is empty, providers are tried in the order their `OPENAI_PROVIDER_*` keys appear in `.env`. Each provider reads its own settings from `OPENAI_PROVIDER_<NAME>_API_KEY`, `OPENAI_PROVIDER_<NAME>_MODEL`, and `OPENAI_PROVIDER_<NAME>_BASE_URL`. Provider names are uppercased and non-alphanumeric characters become underscores, so `my-local` uses `OPENAI_PROVIDER_MY_LOCAL_*`. Sync validates this configuration at startup: at least one provider in the resolved provider order must define all three values, otherwise sync fails before trying to generate metadata.

Each provider `BASE_URL` may point to any OpenAI-compatible endpoint. If it already ends with `/v1`, the scripts will not append another `/v1`. For local compatible services that do not require a key, leave that provider's `API_KEY` empty and set its `BASE_URL` to the local service URL. The legacy single-provider variables `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_BASE_URL` still work when `OPENAI_PROVIDER_ORDER` is not set. `OPENAI_METADATA_MAX_CHARS` can be set to limit how much Markdown is sent to the model; the default is `24000` characters.

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
