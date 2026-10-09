# Astro on Netlify Platform Starter

[Live Demo](https://astro-platform-starter.netlify.app/)

A modern starter based on Astro.js, Tailwind, and [Netlify Core Primitives](https://docs.netlify.com/core/overview/#develop) (Edge Functions, Image CDN, Blobs).

## Massage prices from Bokadirekt

The service cards on the homepage are built from Björn's listing at Neoskin (Bokadirekt place `39252`, employee `315850`). There is no public API. Each production build makes one request to the place page, reads `window.__PRELOADED_STATE__`, and keeps Björn's active services in Bokadirekt's category order.

`src/data/services.json` is the committed snapshot. If the request fails, times out after 10 seconds, or the page no longer contains his services, the build logs a warning and uses that file. The list is never left empty because of a failed fetch. Run `npm run services` to refresh the snapshot locally and commit it when the prices change and you want the fallback updated.

A campaign is included only when its status is active and the build time is inside `[startDate, endDate)`. The sale price is Bokadirekt's `discountPrice`, or the ordinary price with the discount percent rounded half up. The badge date is the end instant in Europe/Stockholm (`till 25 okt`). If the place page prints a different `Kampanjpris till …` label, that text is used. The snapshot stores the start and end timestamps, and a small script on the page hides the sale and restores the ordinary price outside that window, so a daily rebuild that is a few hours late does not keep an expired price on screen.

`npm run build` runs the fetch once, via the `bokadirekt-services` Astro integration, before the pages are rendered. `npm run dev` does not call Bokadirekt; it uses the snapshot.

### Daily rebuild

Prices change on Bokadirekt, not in git. A scheduled Netlify function, `netlify/functions/scheduled-rebuild.ts`, runs `@daily` (midnight UTC) and POSTs to the build hook in `BUILD_HOOK_URL`. That starts a normal production build, which fetches the listing again. The hook URL is a secret. It is not in the repo.

What to set up in Netlify, after this branch is deployed to the production site:

1. Open the site in Netlify. Go to **Site configuration → Build & deploy → Continuous deployment → Build hooks**.
2. Add a build hook named `Daily service refresh`. Copy the URL. It looks like `https://api.netlify.com/build_hooks/…`. Anyone with that URL can start a build, so treat it as a secret.
3. Go to **Site configuration → Environment variables**. Add `BUILD_HOOK_URL` and paste the hook URL. Leave the scope on all, or include **Functions**. A variable limited to builds is not visible to the scheduled function. Do not commit the value.
4. Confirm the production build command is `npm run build` or `astro build`. Both run the fetch. If the Netlify UI has its own build command, set it to `npm run build`.
5. Deploy the site. Under **Functions**, `scheduled-rebuild` should show a daily schedule. Scheduled functions run on the production deploy, and only on plans that include them. If the schedule is missing, check the plan.
6. Optional check: in the functions list, run `scheduled-rebuild` once. The site should start a new build without you pushing a commit.

## Astro Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Deploying to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/netlify-templates/astro-platform-starter)

## Developing Locally

| Prerequisites                                                                |
| :--------------------------------------------------------------------------- |
| [Node.js](https://nodejs.org/) v18.20.8+.                                    |
| (optional) [nvm](https://github.com/nvm-sh/nvm) for Node version management. |

1. Clone this repository, then run `npm install` in its root directory.

2. Recommended: link your local repository to a Netlify project. This will ensure you're using the same runtime version for both local development and your deployed project.

```
netlify link
```

3. Run the Astro.js development server:

```
npm run dev
```
