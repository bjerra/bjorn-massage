/**
 * The exercise popup used on /ovningar and in the muscle modal.
 * One dialog, so closing and stacking stay in one place.
 */

export const EXERCISE_PAGE = 8;
export const EXERCISE_NOTE = 'Allmänna förslag. Avbryt om det gör ont.';

const TYPE_LABEL = { stretching: 'Stretch', strengthen: 'Styrka' };
const LEVEL_LABEL = { beginner: 'Nybörjare', intermediate: 'Medel', expert: 'Avancerad' };
const EQUIPMENT_LABEL = {
    'body only': 'Kroppsvikt',
    bands: 'Band',
    dumbbell: 'Hantel',
    kettlebells: 'Kettlebell',
    barbell: 'Skivstång',
    cable: 'Kabel',
    machine: 'Maskin',
    'medicine ball': 'Medicinsboll',
    'exercise ball': 'Boll',
    'foam roll': 'Foamroller',
    'e-z curl bar': 'EZ-stång',
    other: 'Annat'
};

const index = {
    exercises: [],
    byId: new Map(),
    byMuscle: new Map(),
    ready: false,
    failed: false
};

const details = new Map();
let indexPromise = null;
let wired = false;
let request = 0;
let session = null;

function el(tag, attrs, parent) {
    const node = document.createElement(tag);
    if (attrs) {
        Object.keys(attrs).forEach((key) => {
            if (key === 'text') node.textContent = attrs[key];
            else node.setAttribute(key, attrs[key]);
        });
    }
    if (parent) parent.appendChild(node);
    return node;
}

function norm(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
}

function typeLabel(type) {
    return TYPE_LABEL[type] || type;
}

function levelLabel(level) {
    return LEVEL_LABEL[level] || level;
}

function equipmentLabel(equipment) {
    if (!equipment) return '';
    return EQUIPMENT_LABEL[equipment] || equipment;
}

export function exerciseMeta(exercise) {
    const parts = [typeLabel(exercise.type), levelLabel(exercise.level)];
    const equipment = equipmentLabel(exercise.equipment);
    if (equipment) parts.push(equipment);
    return parts.join(' · ');
}

export function latinMuscleName(id) {
    const strings = window.BODYMAP_STRINGS;
    if (strings && strings.muscles && strings.muscles[id]) return strings.muscles[id];
    return String(id || '').replace(/_/g, ' ');
}

export function getExerciseIndex() {
    return index;
}

export function loadExerciseIndex() {
    if (!indexPromise) {
        indexPromise = fetch('/exercises/index.json')
            .then((response) => {
                if (!response.ok) throw new Error(String(response.status));
                return response.json();
            })
            .then((data) => {
                index.exercises = data.exercises || [];
                index.exercises.forEach((exercise, order) => {
                    exercise.order = order;
                    index.byId.set(exercise.id, exercise);
                    details.set(exercise.id, exercise);
                    (exercise.muscleIds || []).forEach((id) => {
                        if (!index.byMuscle.has(id)) index.byMuscle.set(id, []);
                        index.byMuscle.get(id).push(exercise);
                    });
                });
                index.ready = true;
            })
            .catch(() => {
                index.failed = true;
            });
    }
    return indexPromise;
}

export function exercisesForMuscles(ids) {
    const seen = new Set();
    const list = [];
    (ids || []).forEach((id) => {
        (index.byMuscle.get(id) || []).forEach((exercise) => {
            if (seen.has(exercise.id)) return;
            seen.add(exercise.id);
            list.push(exercise);
        });
    });
    list.sort((a, b) => a.order - b.order);
    return list;
}

export function isExerciseDialogOpen() {
    const dialog = document.getElementById('ex-dialog');
    return !!(dialog && dialog.open);
}

export function fillExerciseList(ul, exercises, onOpen) {
    ul.replaceChildren();
    exercises.forEach((exercise) => {
        const li = el('li', null, ul);
        const button = el('button', { type: 'button', class: 'ex-row' }, li);
        el('span', { class: 'ex-name', text: exercise.name_sv }, button);
        el('span', { class: 'ex-meta', text: exerciseMeta(exercise) }, button);
        button.addEventListener('click', () => onOpen(exercise.id, button));
    });
}

export function renderExerciseChoices(container, exercises, options) {
    const shown = options.shown;
    container.replaceChildren();
    if (options.failed) {
        el('p', { class: 'ex-note', text: 'Övningarna kunde inte laddas.' }, container);
        return;
    }
    if (!options.ready) {
        el('p', { class: 'ex-note', text: 'Laddar övningar…' }, container);
        return;
    }
    if (!exercises.length) {
        el('p', { class: 'ex-note', text: options.emptyText }, container);
        return;
    }
    if (options.note) el('p', { class: 'ex-note ex-safety', text: options.note }, container);
    const ul = el('ul', { class: 'ex-list' }, container);
    fillExerciseList(ul, exercises.slice(0, shown), options.onOpen);
    if (exercises.length > EXERCISE_PAGE) {
        const visible = Math.min(shown, exercises.length);
        el('p', { class: 'ex-count', text: 'Visar ' + visible + ' av ' + exercises.length + '.' }, container);
    }
    if (shown < exercises.length) {
        const more = el('button', { type: 'button', class: 'ex-more', text: 'Visa fler' }, container);
        more.addEventListener('click', () => options.onMore(more));
    }
}

function renderDialog(detail) {
    const body = document.getElementById('ex-dialog-body');
    const dialog = document.getElementById('ex-dialog');
    const muscleName = (session && session.muscleName) || latinMuscleName;
    body.replaceChildren();
    el('p', { class: 'ex-kicker', text: typeLabel(detail.type) }, body);
    const title = el('h2', { id: 'ex-dialog-title', text: detail.name_sv }, body);
    dialog.setAttribute('aria-labelledby', 'ex-dialog-title');
    if (detail.name && norm(detail.name) !== norm(detail.name_sv)) {
        el('p', { class: 'ex-en', text: detail.name }, body);
    }
    el('p', { class: 'ex-meta', text: exerciseMeta(detail) }, body);
    if (detail.images && detail.images.length) {
        const photos = el('div', { class: 'ex-photos' }, body);
        detail.images.forEach((src, imageIndex) => {
            const frame = el('div', { class: 'ex-photo' }, photos);
            const img = el(
                'img',
                {
                    alt: detail.name_sv + ', bild ' + (imageIndex + 1),
                    width: '640',
                    height: '426',
                    decoding: 'async',
                    loading: 'lazy'
                },
                frame
            );
            const ready = () => img.classList.add('is-ready');
            img.addEventListener('load', ready);
            img.addEventListener('error', () => img.remove());
            img.src = src;
            if (img.complete && img.naturalWidth) ready();
        });
    }
    el('h3', { text: 'Så gör du' }, body);
    const cues = detail.cue_sv && detail.cue_sv.length ? detail.cue_sv : [];
    if (cues.length) {
        const list = el('ol', { class: 'ex-steps' }, body);
        cues.forEach((step) => el('li', { text: step }, list));
    } else if (detail.cue && detail.cue.length) {
        el('p', { class: 'ex-note', text: 'Stegen finns bara på engelska för den här övningen.' }, body);
        const list = el('ol', { class: 'ex-steps' }, body);
        detail.cue.forEach((step) => el('li', { text: step }, list));
    } else {
        el('p', { class: 'ex-note', text: 'Instruktioner saknas för den här övningen.' }, body);
    }
    if (detail.muscleIds && detail.muscleIds.length) {
        el('h3', { text: 'Muskler' }, body);
        const muscles = el('ul', { class: 'ex-muscles' }, body);
        detail.muscleIds.forEach((id) => {
            const li = el('li', null, muscles);
            const button = el('button', { type: 'button', class: 'ex-muscle', text: muscleName(id) }, li);
            button.addEventListener('click', () => {
                if (session && session.onMuscle) session.onMuscle(id);
            });
        });
    }
    el('p', { class: 'ex-note', text: EXERCISE_NOTE }, body);
    el('p', { class: 'ex-source', text: 'Bilderna kommer från free-exercise-db (public domain).' }, body);
    title.tabIndex = -1;
}

export function ensureExerciseDialog() {
    let dialog = document.getElementById('ex-dialog');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'ex-dialog';
        dialog.className = 'ex-dialog';
        dialog.setAttribute('aria-labelledby', 'ex-dialog-title');
        const top = el('div', { class: 'ex-dialog-top' }, dialog);
        el('button', { type: 'button', class: 'ex-close', text: 'Stäng' }, top);
        el('div', { id: 'ex-dialog-body', class: 'ex-dialog-body' }, dialog);
        document.body.appendChild(dialog);
    }
    if (wired) return dialog;
    wired = true;
    dialog.addEventListener('close', () => {
        const current = session;
        session = null;
        if (current && current.onClose) current.onClose();
        const opener = current && current.opener;
        if (current && current.restoreFocus !== false && opener && opener.isConnected && opener.focus) opener.focus();
    });
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
    });
    const close = dialog.querySelector('.ex-close');
    if (close) close.addEventListener('click', () => dialog.close());
    return dialog;
}

export function closeExerciseDialog(options = {}) {
    const dialog = document.getElementById('ex-dialog');
    if (!dialog || !dialog.open) return;
    if (session) {
        if (options.restoreFocus === false) session.restoreFocus = false;
    }
    dialog.close();
}

async function detailFor(id) {
    await loadExerciseIndex();
    if (details.has(id) && details.get(id).images) return details.get(id);
    const response = await fetch('/exercises/d/' + encodeURIComponent(id) + '.json');
    if (!response.ok) throw new Error(String(response.status));
    const detail = await response.json();
    details.set(id, detail);
    return detail;
}

export async function openExerciseDialog(id, options = {}) {
    const token = ++request;
    session = {
        id,
        token,
        opener: options.opener || null,
        onClose: options.onClose || null,
        onMuscle: options.onMuscle || null,
        muscleName: options.muscleName || latinMuscleName,
        restoreFocus: true
    };
    let detail;
    try {
        detail = await detailFor(id);
    } catch {
        if (!session || session.token !== token) return 'stale';
        const dialog = ensureExerciseDialog();
        const body = document.getElementById('ex-dialog-body');
        body.replaceChildren();
        el('p', { text: 'Övningen kunde inte hämtas.' }, body);
        if (!dialog.open) dialog.showModal();
        return 'error';
    }
    if (!session || session.token !== token) return 'stale';
    const dialog = ensureExerciseDialog();
    const indexEntry = index.byId.get(id) || detail;
    if (options.beforeRender) options.beforeRender(detail, indexEntry);
    if (!session || session.token !== token) return 'stale';
    renderDialog(detail);
    if (!dialog.open) dialog.showModal();
    const title = document.getElementById('ex-dialog-title');
    if (title) title.focus();
    return 'ok';
}
