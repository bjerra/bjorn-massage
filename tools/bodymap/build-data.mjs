#!/usr/bin/env node
/**
 * build-data.mjs — converts the iOS app's TypeScript data files into a
 * plain browser data file for the body-map widget. No dependencies (Node ≥ 18).
 *
 *   node tools/bodymap/build-data.mjs
 *
 * Reads:  tools/bodymap/src/bodyPaths.ts, referralZones.ts
 * Writes: public/bodymap/bodymap-data.js   (window.BODYMAP_DATA = {...})
 *         public/bodymap/bodymap-data.json (same object, for other tooling)
 *         tools/bodymap/data-report.md     (validation report)
 *
 * Zone *shapes* are NOT generated: they live in public/bodymap/bodymap-zones.js
 * and are edited by hand. bodymap.js and bodymap.css are not regenerated here.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const DIST = path.resolve(ROOT, '../../public/bodymap');

/** Load a data-only TS module by stripping type syntax and evaluating it in a sandbox. */
function loadTs(file) {
  let src = fs.readFileSync(file, 'utf8');
  src = src.replace(/export\s+interface\s+\w+\s*\{[^}]*\}/g, '');
  src = src.replace(/export\s+type\s+[^;]+;/g, '');
  src = src.replace(/export\s+const\s+(\w+)\s*(:[^=]+)?=/g, (m, n) => `__exports.${n} =`);
  const ctx = { __exports: {} };
  vm.runInNewContext(src, ctx, { filename: file });
  return { raw: fs.readFileSync(file, 'utf8'), ...ctx.__exports };
}

const B = loadTs(path.join(SRC, 'bodyPaths.ts'));
const Z = loadTs(path.join(SRC, 'referralZones.ts'));
const issues = [];
const note = (cat, msg) => issues.push({ cat, msg });

// ── Views ────────────────────────────────────────────────────────────────────
// Body centre lines (x) measured from the paired paths / outline bboxes:
//   front ≈ 364.2 (= 728.4/2, matches most front mirrorX values)
//   back  ≈ 1083.5 (= 2167/2, matches the back mirrorX values)
const DEFAULT_MIRROR = { front: 728.4, back: 2167.0 };
const VIEWBOX = { w: B.VIEWBOX_W, h: B.VIEWBOX_H };

function buildView(view, bodyRec, landmarkRec) {
  const muscles = [];
  const byGeom = new Map();
  for (const [id, m] of Object.entries(bodyRec)) {
    const entry = { id };
    if (m.mirrorX) {
      // left/right hold the same (or near-identical) drawn side; second side is mirrored.
      entry.paths = m.left.slice();
      entry.mirrorX = m.mirrorX;
      if (JSON.stringify(m.left) !== JSON.stringify(m.right))
        note('geometry', `${view}/${id}: mirrorX is set but left/right path strings differ slightly — used \`left\` and mirrored it.`);
    } else {
      entry.paths = m.left.concat(m.right);
      if (m.left.length !== m.right.length) note('geometry', `${view}/${id}: left has ${m.left.length} paths, right has ${m.right.length}.`);
    }
    const key = JSON.stringify([entry.paths, entry.mirrorX || 0]);
    if (byGeom.has(key)) {
      const primary = byGeom.get(key);
      primary.shared = primary.shared || [primary.id];
      primary.shared.push(id);
      continue; // geometry rendered once, by the primary
    }
    byGeom.set(key, entry);
    muscles.push(entry);
  }
  for (const m of muscles) if (m.shared) note('shared', `${view}: ${m.shared.join(', ')} share one outline — rendered once, clicking selects "${m.shared[0]}" and the panel offers the others.`);
  const landmarks = [];
  for (const [id, m] of Object.entries(landmarkRec)) {
    const same = JSON.stringify(m.left) === JSON.stringify(m.right);
    landmarks.push({ id, paths: same ? m.left.slice() : m.left.concat(m.right) });
  }
  return { muscles, landmarks };
}

const views = {
  front: { viewBox: [30, 80, 668, 1290], centerX: DEFAULT_MIRROR.front / 2, outline: B.OUTLINE_FRONT, ...buildView('front', B.BODY_FRONT, B.NON_MUSCLES_FRONT) },
  back:  { viewBox: [750, 80, 668, 1290], centerX: DEFAULT_MIRROR.back / 2,  outline: B.OUTLINE_BACK,  ...buildView('back',  B.BODY_BACK,  B.NON_MUSCLES_BACK) },
};
const muscleViews = {};
for (const v of ['front', 'back']) {
  const rec = v === 'front' ? B.BODY_FRONT : B.BODY_BACK;
  for (const id of Object.keys(rec)) (muscleViews[id] = muscleViews[id] || []).push(v);
}

// ── Trigger points ──────────────────────────────────────────────────────────
// Pull the trailing "// TP1 lateral border…" comments as fallback descriptions.
const tpComments = {};
for (const m of B.raw.matchAll(/id:\s*"([^"]+)"[^}]*\}\s*,?\s*\/\/\s*(.+)$/gm))
  tpComments[m[1]] = m[2].replace(/^TP\d+\s*/, '').trim();

const triggerPoints = {};
for (const [muscleId, list] of Object.entries(B.TRIGGER_POINTS)) {
  if (!muscleViews[muscleId]) note('tp', `TRIGGER_POINTS has "${muscleId}" but no body path exists for it.`);
  triggerPoints[muscleId] = list.map((tp, i) => {
    const view = tp.x >= VIEWBOX.w ? 'back' : 'front';
    const geo = (view === 'front' ? B.BODY_FRONT : B.BODY_BACK)[muscleId];
    if (!geo) note('tp', `${tp.id} (${muscleId}) lies in the ${view} view, but ${muscleId} has no ${view} path.`);
    const mirrorX = (geo && geo.mirrorX) || DEFAULT_MIRROR[view];
    return { id: tp.id, n: i + 1, view, x: tp.x, y: tp.y, mx: +(mirrorX - tp.x).toFixed(2), note: tpComments[tp.id] || '' };
  });
}
for (const id of Object.keys(muscleViews)) if (!triggerPoints[id]) note('tp', `Muscle "${id}" has a path but no trigger points.`);

// ── Referral zones ──────────────────────────────────────────────────────────
const tpLocation = {}; // muscleId:n -> first location text seen
const zones = Z.REFERRAL_ZONES.map(z => {
  const seen = new Map();
  const entries = [];
  for (const e of z.entries) {
    const n = parseInt(String(e.tpId).replace(/\D/g, ''), 10);
    const key = `${e.muscleId}:${n}`;
    if (seen.has(key)) {
      const prev = seen.get(key);
      note('duplicate', `${z.id}: duplicate entry ${e.muscleId} ${e.tpId} ("${e.location}")${prev.location !== e.location ? ` — kept first location "${prev.location}"` : ''} — removed.`);
      continue;
    }
    if (!muscleViews[e.muscleId]) note('missing', `${z.id}: muscle "${e.muscleId}" has no body path.`);
    const tps = triggerPoints[e.muscleId];
    if (!tps) note('missing', `${z.id}: muscle "${e.muscleId}" has no TRIGGER_POINTS.`);
    else if (!(n >= 1 && n <= tps.length)) note('range', `${z.id}: ${e.muscleId} ${e.tpId} out of range (muscle has ${tps.length} TPs).`);
    const loc = tpLocation[key];
    if (loc === undefined) tpLocation[key] = e.location;
    else if (loc !== e.location) note('location', `${e.muscleId} ${e.tpId}: location text differs between zones ("${loc}" vs "${e.location}" in ${z.id}). First one is used as the TP name.`);
    const entry = { muscleId: e.muscleId, tp: n, location: e.location };
    seen.set(key, entry);
    entries.push(entry);
  }
  return { id: z.id, label: z.label, region: z.region, view: z.view, entries };
});
// Attach canonical location text to each TP
for (const [mid, tps] of Object.entries(triggerPoints)) for (const tp of tps) {
  const loc = tpLocation[`${mid}:${tp.n}`];
  tp.location = loc || (tp.note ? tp.note[0].toUpperCase() + tp.note.slice(1) : '');
  tp.referenced = !!loc;
  if (!loc) note('unreferenced', `${tp.id} (${mid} TP${tp.n}) is not referenced by any referral zone${tp.note ? ` (source comment: "${tp.note}")` : ''}.`);
  delete tp.note;
}
const zoneMuscles = new Set(zones.flatMap(z => z.entries.map(e => e.muscleId)));
for (const id of Object.keys(muscleViews)) if (!zoneMuscles.has(id)) note('unreferenced', `Muscle "${id}" is not referenced by any referral zone.`);

const data = {
  version: 1,
  generated: new Date().toISOString(),
  viewBox: VIEWBOX,
  views, muscleViews, triggerPoints, zones,
  regionLabels: Z.REGION_LABELS,
};

fs.mkdirSync(DIST, { recursive: true });
const json = JSON.stringify(data);
fs.writeFileSync(path.join(DIST, 'bodymap-data.json'), json);
fs.writeFileSync(path.join(DIST, 'bodymap-data.js'),
  `/* Generated by build-data.mjs from src/*.ts — do not edit by hand. */\nwindow.BODYMAP_DATA=${json};\n`);

const cats = { missing: 'Missing muscle ids', range: 'TP index out of range', duplicate: 'Duplicate zone entries (removed)', location: 'Conflicting TP location texts', tp: 'Trigger-point problems', unreferenced: 'Not referenced by any zone', shared: 'Shared outlines', geometry: 'Geometry notes' };
let md = `# Body-map data report\n\nGenerated ${data.generated} by build-data.mjs\n\n`;
for (const [c, title] of Object.entries(cats)) {
  const list = issues.filter(i => i.cat === c);
  md += `## ${title} (${list.length})\n\n` + (list.length ? list.map(i => `- ${i.msg}`).join('\n') : '- none') + '\n\n';
}
fs.writeFileSync(path.join(ROOT, 'data-report.md'), md);
console.log(`Wrote public/bodymap/bodymap-data.js (${(json.length / 1024).toFixed(0)} KB), ${zones.length} zones, ${Object.keys(triggerPoints).length} muscles with TPs. ${issues.length} report items → tools/bodymap/data-report.md`);
