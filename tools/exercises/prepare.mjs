/**
 * Build the public exercise dataset from data/exercises.json.
 *
 * The source file is the original app export and is never modified.
 * Re-run this script to regenerate public/exercises (index, per-exercise
 * detail, and optimised WebP images). `npm run build` does not download
 * anything; it serves the files this script writes.
 *
 *   node tools/exercises/prepare.mjs
 *   node tools/exercises/prepare.mjs --skip-images
 *
 * Filter (Björn, 2026-10-10)
 * ---------------------------
 * 1. Keep every exercise with type "stretching".
 * 2. Keep type "strengthen" only when level is beginner or intermediate
 *    AND equipment is one of: body only, bands, dumbbell, kettlebells.
 * 3. From that strength set, drop Olympic and ballistic lifts that are
 *    not sensible home exercises for massage clients. A name matches when
 *    it contains, as a word or phrase:
 *      Clean, Jerk, Snatch, Thruster,
 *      Power Partials, Iron Cross, Pirate Ships,
 *      or Swing / Swings (kettlebell swings and swing-to-press style
 *      power moves such as Vertical Swing).
 *    Stretches are never dropped by this name rule. "Iron Crosses (stretch)"
 *    stays. Cable, barbell and machine work never reaches this step,
 *    because the equipment rule already removed it.
 *
 * Rotator cuff
 * ------------
 * supraspinatus, infraspinatus, subscapularis and teres_minor are stripped
 * from every kept exercise, then added back only for the movements below.
 * Other muscles (deltoideus and the rest) are left as they are.
 *
 * supraspinatus — scaption, empty-can / full-can style, and lateral raises
 * whose job is initial abduction (arm lifting out to the side, including
 * the "pouring water" empty-can cue and thumbs-up scaption):
 *   Alternating Deltoid Raise
 *   Dumbbell Scaption
 *   Lateral Raise - With Bands
 *   One-Arm Incline Lateral Raise
 *   One-Arm Side Laterals
 *   Seated Side Lateral Raise
 *   Side Lateral Raise
 *   Side Laterals to Front Raise
 *
 * Not supraspinatus, despite a similar name: prone "lateral" raises and
 * rear-delt raises are horizontal abduction, and Dumbbell Raise is an
 * upright-row pattern. Power Partials is a side raise but is dropped above.
 *
 * infraspinatus + teres_minor — external rotation, the reverse fly that
 * adds external rotation, band pull-apart, Cuban press, and the posterior
 * cuff stretch (cross-body). There is no sleeper stretch in the source.
 *   External Rotation
 *   External Rotation with Band
 *   Reverse Flyes With External Rotation
 *   Band Pull Apart
 *   Cuban Press
 *   Shoulder Stretch          (arm reaches across the body)
 *
 * Plain reverse flyes and rear-delt raises stay on deltoideus only.
 * Side Wrist Pull crosses the body, but its cue says to feel it in the
 * back rather than the shoulder, so it is not tagged as cuff.
 *
 * subscapularis — internal rotation. No stretch in the kept set clearly
 * lengthens subscapularis (the anterior shoulder stretches are pec,
 * biceps or front deltoid).
 *   Internal Rotation with Band
 *
 * Cable lateral raises and cable internal/external rotation exist in the
 * source but are excluded by the equipment rule.
 *
 * Images
 * ------
 * Photos are the public-domain JPEGs from yuhonas/free-exercise-db
 * (The Unlicense). They are fetched from
 * https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<id>/<n>.jpg
 * scaled to 640px wide and encoded as WebP. The licence does not require
 * attribution. A one-line source note is still shown next to the photos.
 *
 * Swedish overrides
 * -----------------
 * data/exercise-overrides.sv.json is applied after the filter, keyed by
 * exercise id. Each entry may set name_sv and cue_sv. The source export
 * is not edited, so a fresh export can be dropped in and these corrections
 * still apply. An override for an id that is not kept, an unknown field,
 * or an entry that changes nothing is an error. Swedish titles must be
 * unique after the overrides are applied.
 */

import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePath = join(root, 'data/exercises.json');
const outDir = join(root, 'public/exercises');
const detailDir = join(outDir, 'd');
const imgDir = join(outDir, 'img');
const reportPath = join(root, 'tools/exercises/filter-report.json');
const overridePath = join(root, 'data/exercise-overrides.sv.json');
const skipImages = process.argv.includes('--skip-images');

const EQUIPMENT = new Set(['body only', 'bands', 'dumbbell', 'kettlebells']);
const LEVELS = new Set(['beginner', 'intermediate']);
const CUFF = ['supraspinatus', 'infraspinatus', 'subscapularis', 'teres_minor'];

const SUPRASPINATUS = [
    'Alternating Deltoid Raise',
    'Dumbbell Scaption',
    'Lateral Raise - With Bands',
    'One-Arm Incline Lateral Raise',
    'One-Arm Side Laterals',
    'Seated Side Lateral Raise',
    'Side Lateral Raise',
    'Side Laterals to Front Raise'
];

const POSTERIOR_CUFF = [
    'External Rotation',
    'External Rotation with Band',
    'Reverse Flyes With External Rotation',
    'Band Pull Apart',
    'Cuban Press',
    'Shoulder Stretch'
];

const SUBSCAPULARIS = ['Internal Rotation with Band'];

const DROP_RULES = [
    { reason: 'Clean', test: (n) => /\bclean\b/i.test(n) },
    { reason: 'Jerk', test: (n) => /\bjerk\b/i.test(n) },
    { reason: 'Snatch', test: (n) => /\bsnatch\b/i.test(n) },
    { reason: 'Thruster', test: (n) => /\bthruster\b/i.test(n) },
    { reason: 'Power Partials', test: (n) => /power partials/i.test(n) },
    { reason: 'Iron Cross', test: (n) => /^iron cross$/i.test(n) },
    { reason: 'Pirate Ships', test: (n) => /pirate ships/i.test(n) },
    { reason: 'Swing power move', test: (n) => /\bswings?\b/i.test(n) }
];

const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

function dropReasons(name) {
    return DROP_RULES.filter((rule) => rule.test(name)).map((rule) => rule.reason);
}

function cuffFor(name) {
    const add = [];
    if (SUPRASPINATUS.includes(name)) add.push('supraspinatus');
    if (POSTERIOR_CUFF.includes(name)) add.push('infraspinatus', 'teres_minor');
    if (SUBSCAPULARIS.includes(name)) add.push('subscapularis');
    return add;
}

function remapMuscles(exercise) {
    const kept = exercise.muscleIds.filter((id) => !CUFF.includes(id));
    const extra = cuffFor(exercise.name).filter((id) => !kept.includes(id));
    return kept.concat(extra);
}

async function main() {
    const sourceBytes = await readFile(sourcePath);
    const all = JSON.parse(sourceBytes.toString('utf8'));
    if (!Array.isArray(all)) throw new Error('data/exercises.json is not an array');

    const ids = new Set();
    const names = new Set();
    for (const exercise of all) {
        if (ids.has(exercise.id)) throw new Error('Duplicate id ' + exercise.id);
        if (names.has(exercise.name)) throw new Error('Duplicate name ' + exercise.name);
        ids.add(exercise.id);
        names.add(exercise.name);
    }

    const stretches = all.filter((exercise) => exercise.type === 'stretching');
    const strengthPool = all.filter(
        (exercise) =>
            exercise.type === 'strengthen' &&
            LEVELS.has(exercise.level) &&
            EQUIPMENT.has(exercise.equipment)
    );
    if (stretches.length !== 123) {
        throw new Error('Expected 123 stretching exercises, found ' + stretches.length);
    }
    if (strengthPool.length !== 272) {
        throw new Error('Expected 272 strength exercises before the name filter, found ' + strengthPool.length);
    }

    const dropped = [];
    const strength = [];
    for (const exercise of strengthPool) {
        const reasons = dropReasons(exercise.name);
        if (reasons.length) dropped.push({ name: exercise.name, id: exercise.id, reasons });
        else strength.push(exercise);
    }
    dropped.sort((a, b) => a.name.localeCompare(b.name, 'en'));

    const cuffNames = new Set([...SUPRASPINATUS, ...POSTERIOR_CUFF, ...SUBSCAPULARIS]);
    for (const name of cuffNames) {
        const exercise = [...stretches, ...strength].find((item) => item.name === name);
        if (!exercise) throw new Error('Cuff list names an exercise that was not kept: ' + name);
    }

    const kept = [...stretches, ...strength].map((exercise) => {
        const muscleIds = remapMuscles(exercise);
        return {
            id: exercise.id,
            name: exercise.name,
            name_sv: exercise.name_sv,
            type: exercise.type,
            level: exercise.level,
            equipment: exercise.equipment || null,
            muscleIds,
            cue_sv: (exercise.cue_sv || []).map((line) => String(line).trim()).filter(Boolean),
            cue: (exercise.cue || []).map((line) => String(line).trim()).filter(Boolean),
            images: exercise.images || []
        };
    });

    const overrides = JSON.parse(await readFile(overridePath, 'utf8'));
    if (overrides == null || typeof overrides !== 'object' || Array.isArray(overrides)) {
        throw new Error('data/exercise-overrides.sv.json must be an object keyed by exercise id');
    }
    const keptById = new Map(kept.map((exercise) => [exercise.id, exercise]));
    const titleChanges = [];
    const cueOverrides = [];
    for (const [id, over] of Object.entries(overrides)) {
        const exercise = keptById.get(id);
        if (!exercise) throw new Error('Override for an exercise that is not kept: ' + id);
        if (over == null || typeof over !== 'object' || Array.isArray(over)) {
            throw new Error('Override for ' + id + ' must be an object');
        }
        for (const key of Object.keys(over)) {
            if (key !== 'name_sv' && key !== 'cue_sv') {
                throw new Error('Unknown override field ' + key + ' on ' + id);
            }
        }
        let changed = false;
        if (over.name_sv != null) {
            if (typeof over.name_sv !== 'string') throw new Error('name_sv override must be a string for ' + id);
            const next = over.name_sv.trim();
            if (!next) throw new Error('Empty name_sv override for ' + id);
            if (next !== exercise.name_sv) {
                titleChanges.push({ id, name: exercise.name, from: exercise.name_sv, to: next });
                exercise.name_sv = next;
                changed = true;
            }
        }
        if (over.cue_sv != null) {
            if (
                !Array.isArray(over.cue_sv) ||
                over.cue_sv.some((line) => typeof line !== 'string' || !line.trim())
            ) {
                throw new Error('cue_sv override must be non-empty strings for ' + id);
            }
            const nextCue = over.cue_sv.map((line) => line.trim());
            if (JSON.stringify(nextCue) !== JSON.stringify(exercise.cue_sv)) {
                exercise.cue_sv = nextCue;
                cueOverrides.push(id);
                changed = true;
            }
        }
        if (!changed) throw new Error('Override changes nothing for ' + id);
    }
    titleChanges.sort((a, b) => a.from.localeCompare(b.from, 'sv') || a.id.localeCompare(b.id, 'en'));
    cueOverrides.sort((a, b) => a.localeCompare(b, 'en'));

    const svNames = new Map();
    for (const exercise of kept) {
        const previous = svNames.get(exercise.name_sv);
        if (previous) {
            throw new Error(
                'Duplicate Swedish title "' + exercise.name_sv + '" on ' + previous + ' and ' + exercise.id
            );
        }
        svNames.set(exercise.name_sv, exercise.id);
    }

    kept.sort((a, b) => {
        const typeRank = a.type === 'stretching' ? 0 : 1;
        const typeRankB = b.type === 'stretching' ? 0 : 1;
        const levelRank = { beginner: 0, intermediate: 1, expert: 2 };
        return (
            typeRank - typeRankB ||
            (levelRank[a.level] ?? 9) - (levelRank[b.level] ?? 9) ||
            a.name_sv.localeCompare(b.name_sv, 'sv')
        );
    });

    await mkdir(detailDir, { recursive: true });
    await mkdir(imgDir, { recursive: true });

    const index = kept.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        name_sv: exercise.name_sv,
        type: exercise.type,
        level: exercise.level,
        equipment: exercise.equipment,
        muscleIds: exercise.muscleIds
    }));
    await writeFile(join(outDir, 'index.json'), JSON.stringify({ exercises: index }));

    const expectedDetails = new Set();
    const expectedImages = new Set();
    const imageJobs = [];

    for (const exercise of kept) {
        const images = [];
        exercise.images.forEach((rel, i) => {
            const file = exercise.id + '-' + i + '.webp';
            images.push('/exercises/img/' + file);
            expectedImages.add(file);
            imageJobs.push({ rel, file });
        });
        const detail = {
            id: exercise.id,
            name: exercise.name,
            name_sv: exercise.name_sv,
            type: exercise.type,
            level: exercise.level,
            equipment: exercise.equipment,
            muscleIds: exercise.muscleIds,
            cue_sv: exercise.cue_sv,
            images
        };
        if (!exercise.cue_sv.length && exercise.cue.length) detail.cue = exercise.cue;
        expectedDetails.add(exercise.id + '.json');
        await writeFile(join(detailDir, exercise.id + '.json'), JSON.stringify(detail));
    }

    await prune(detailDir, expectedDetails);
    if (!skipImages) {
        await downloadImages(imageJobs);
        await prune(imgDir, expectedImages);
    }

    const assign = (namesInList, muscleId) =>
        namesInList.map((name) => {
            const exercise = kept.find((item) => item.name === name);
            return {
                name: exercise.name,
                name_sv: exercise.name_sv,
                id: exercise.id,
                type: exercise.type,
                muscleIds: exercise.muscleIds
            };
        });

    const report = {
        source: 'data/exercises.json',
        sourceCount: all.length,
        stretching: stretches.length,
        strengthenBeforeNameFilter: strengthPool.length,
        dropped: dropped,
        strengthenKept: strength.length,
        totalKept: kept.length,
        titleChanges,
        cueOverrides,
        missingSwedishCues: kept.filter((exercise) => !exercise.cue_sv.length).map((exercise) => exercise.name),
        supraspinatus: assign(SUPRASPINATUS),
        infraspinatus: assign(POSTERIOR_CUFF),
        teres_minor: assign(POSTERIOR_CUFF),
        subscapularis: assign(SUBSCAPULARIS),
        notes: [
            'infraspinatus and teres_minor are assigned together.',
            'No exercise in the source is named Empty Can, Full Can, or Sleeper Stretch.',
            'Dumbbell Scaption is thumbs-up abduction in the scapular plane.',
            'One-Arm Side Laterals, Seated Side Lateral Raise, Side Lateral Raise and Lateral Raise - With Bands use the pouring-water (empty-can) cue.',
            'Lying One-Arm Lateral Raise, Dumbbell Lying Rear Lateral Raise, Lying Rear Delt Raise and the other rear-delt raises are horizontal abduction and are not tagged as cuff muscles.',
            'Reverse Flyes (without external rotation) stays on deltoideus only. Reverse Flyes With External Rotation is tagged infraspinatus and teres_minor.',
            'Shoulder Stretch is the cross-body posterior cuff stretch.',
            'Side Wrist Pull crosses the midline, but the cue says to feel the stretch in the back, so it is not tagged.',
            'No kept stretch clearly lengthens subscapularis.',
            'Cable Internal Rotation, Cable Seated Lateral Raise and External Rotation with Cable are in the source and were excluded by the equipment rule.'
        ]
    };
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');

    const after = await readFile(sourcePath);
    if (!sourceBytes.equals(after)) throw new Error('data/exercises.json was modified');

    console.log(
        'Kept ' +
            kept.length +
            ' exercises (' +
            stretches.length +
            ' stretching, ' +
            strength.length +
            ' strengthen). Dropped ' +
            dropped.length +
            '.'
    );
    for (const item of dropped) console.log('  drop [' + item.reasons.join(', ') + '] ' + item.name);
    console.log('Swedish title overrides: ' + titleChanges.length);
    for (const change of titleChanges) console.log('  ' + change.from + ' → ' + change.to);
    if (cueOverrides.length) console.log('Swedish step overrides: ' + cueOverrides.join(', '));
    console.log('Report: tools/exercises/filter-report.json');
}

async function prune(dir, expected) {
    let existing = [];
    try {
        existing = await readdir(dir);
    } catch {
        return;
    }
    await Promise.all(
        existing
            .filter((name) => !expected.has(name))
            .map((name) => rm(join(dir, name), { force: true }))
    );
}

async function downloadImages(jobs) {
    let done = 0;
    const failed = [];
    async function worker(job) {
        const dest = join(imgDir, job.file);
        try {
            await statSize(dest);
            done += 1;
            return;
        } catch {
            /* download */
        }
        const url = IMAGE_BASE + job.rel.split('/').map(encodeURIComponent).join('/');
        const jpeg = dest + '.jpg';
        try {
            await fetchToFile(url, jpeg);
            await toWebp(jpeg, dest);
            await rm(jpeg, { force: true });
        } catch (error) {
            await rm(jpeg, { force: true });
            failed.push(job.file + ': ' + error.message);
        }
        done += 1;
        if (done % 40 === 0 || done === jobs.length) console.log('images ' + done + '/' + jobs.length);
    }
    await pool(jobs, 8, worker);
    if (failed.length) {
        throw new Error('Image failures:\n' + failed.join('\n'));
    }
}

async function statSize(file) {
    const { stat } = await import('node:fs/promises');
    const info = await stat(file);
    if (info.size < 500) throw new Error('too small');
}

async function fetchToFile(url, dest) {
    let last = 'failed';
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            const response = await fetch(url, {
                headers: { 'user-agent': 'bjornmassage-exercise-build' }
            });
            if (!response.ok) throw new Error(response.status + ' ' + url);
            const bytes = Buffer.from(await response.arrayBuffer());
            if (bytes.length < 500) throw new Error('short response ' + url);
            await writeFile(dest, bytes);
            return;
        } catch (error) {
            last = error.message;
            await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        }
    }
    throw new Error(last);
}

function toWebp(jpeg, dest) {
    return new Promise((resolve, reject) => {
        const proc = spawn(
            'ffmpeg',
            ['-y', '-i', jpeg, '-vf', 'scale=640:-2', '-c:v', 'libwebp', '-quality', '68', '-an', dest],
            { stdio: ['ignore', 'ignore', 'pipe'] }
        );
        let err = '';
        proc.stderr.on('data', (chunk) => {
            err += chunk;
        });
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(err.slice(-300)));
        });
    });
}

async function pool(items, size, fn) {
    let cursor = 0;
    async function run() {
        while (cursor < items.length) {
            const index = cursor;
            cursor += 1;
            await fn(items[index]);
        }
    }
    await Promise.all(Array.from({ length: size }, run));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
