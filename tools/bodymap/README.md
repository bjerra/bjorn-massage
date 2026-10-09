# Body map data

Source data for the trigger-point map on `/triggerpunkter`. It comes from Björn's iOS app (`src/bodyPaths.ts`, `src/referralZones.ts`). `src/musclePathsOld.ts` is the previous path set and is not read by the build.

The widget itself is dependency-free and is served as static files from `public/bodymap/` (`bodymap.js`, `bodymap.css`, `bodymap-zones.js`, plus the generated data). Astro does not bundle them.

Regenerate the data files after editing the TypeScript sources:

```bash
npm run bodymap
```

That runs `tools/bodymap/build-data.mjs` (Node 18+, no dependencies) and writes:

- `public/bodymap/bodymap-data.js`
- `public/bodymap/bodymap-data.json`
- `tools/bodymap/data-report.md` (duplicates, missing ids, location conflicts)

Zone shapes are hand-edited in `public/bodymap/bodymap-zones.js`. The script does not touch `bodymap.js` or `bodymap.css`.

UI strings are Swedish and live in `src/pages/triggerpunkter.astro` (`window.BODYMAP_STRINGS`). The short trigger-point location lines inside the data stay in English.
