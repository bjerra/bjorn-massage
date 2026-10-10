/**
 * Exercise lookup for /triggerpunkter.
 * Loads a small index, then one detail file when an exercise is opened.
 * The body-map widget still owns muscle and zone selection.
 */

const PAGE = 8;
const NOTE = 'Allmänna förslag. Avbryt om det gör ont, och fråga Björn vid besöket.';

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

const state = {
    exercises: [],
    byId: new Map(),
    byMuscle: new Map(),
    ready: false,
    failed: false,
    hashReady: false,
    openId: null,
    suspendClose: false,
    returnFocus: null,
    panelType: 'all',
    panelLevel: 'all',
    panelShown: PAGE,
    panelKey: '',
    zoneOpenFor: '',
    searchShown: PAGE
};

const details = new Map();

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

function meta(exercise) {
    const parts = [typeLabel(exercise.type), levelLabel(exercise.level)];
    const equipment = equipmentLabel(exercise.equipment);
    if (equipment) parts.push(equipment);
    return parts.join(' · ');
}

function readHash() {
    const params = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    return {
        muscle: params.get('muscle'),
        zone: params.get('zone'),
        ex: params.get('ex')
    };
}

let restoreOnClose = true;

function writeHash(map) {
    if (!state.hashReady || !map) return;
    const parts = [];
    const sel = map.sel;
    if (sel && sel.type === 'muscle') parts.push('muscle=' + encodeURIComponent(sel.id));
    else if (sel && sel.type === 'zone') parts.push('zone=' + encodeURIComponent(sel.id));
    if (state.openId) parts.push('ex=' + encodeURIComponent(state.openId));
    const next = parts.join('&');
    if (next) {
        if (location.hash !== '#' + next) history.replaceState(null, '', '#' + next);
    } else if (location.hash) {
        history.replaceState(null, '', location.pathname + location.search);
    }
}

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

function mapRoot() {
    return document.querySelector('[data-bodymap]');
}

function getMap() {
    const root = mapRoot();
    return root && root.__bodymap ? root.__bodymap : null;
}

function muscleName(map, id) {
    return map && map.muscleName ? map.muscleName(id) : id;
}

function zoneMuscleIds(map, zoneId) {
    const zone = map.zoneById && map.zoneById[zoneId];
    if (!zone) return [];
    const ids = [];
    zone.entries.forEach((entry) => {
        if (ids.indexOf(entry.muscleId) === -1) ids.push(entry.muscleId);
    });
    return ids;
}

function exercisesForMuscles(ids) {
    const seen = new Set();
    const list = [];
    ids.forEach((id) => {
        (state.byMuscle.get(id) || []).forEach((exercise) => {
            if (seen.has(exercise.id)) return;
            seen.add(exercise.id);
            list.push(exercise);
        });
    });
    list.sort((a, b) => a.order - b.order);
    return list;
}

function applyFilters(list, type, level) {
    return list.filter((exercise) => {
        if (type !== 'all' && exercise.type !== type) return false;
        if (level !== 'all' && exercise.level !== level) return false;
        return true;
    });
}

function muscleSearchText(id) {
    const strings = window.BODYMAP_STRINGS || {};
    const latin = strings.muscles && strings.muscles[id] ? strings.muscles[id] : '';
    const extra = strings.muscleFind && strings.muscleFind[id] ? strings.muscleFind[id] : '';
    return norm(latin + ' ' + extra);
}

function exerciseSearchText(exercise) {
    if (exercise._search) return exercise._search;
    let text = norm(exercise.name_sv) + '\n' + norm(exercise.name);
    exercise.muscleIds.forEach((id) => {
        text += '\n' + muscleSearchText(id);
    });
    exercise._search = text;
    return text;
}

function searchHits() {
    const input = document.getElementById('ex-q');
    const query = norm(input ? input.value : '');
    const typed = query.length >= 2;
    const type = chipValue('ex-search-types');
    const level = selectValue('ex-search-level');
    if (!typed && type === 'all' && level === 'all') return { list: [], idle: true };
    const list = state.exercises.filter((exercise) => {
        if (type !== 'all' && exercise.type !== type) return false;
        if (level !== 'all' && exercise.level !== level) return false;
        if (!typed) return true;
        return exerciseSearchText(exercise).includes(query);
    });
    return { list, idle: false };
}

function chipValue(groupId) {
    const pressed = document.querySelector('#' + groupId + ' [aria-pressed="true"]');
    return pressed ? pressed.getAttribute('data-value') : 'all';
}

function selectValue(id) {
    const node = document.getElementById(id);
    return node ? node.value : 'all';
}

function setChips(group, value, onChange) {
    group.querySelectorAll('[data-value]').forEach((button) => {
        button.setAttribute('aria-pressed', button.getAttribute('data-value') === value ? 'true' : 'false');
        button.onclick = () => {
            group.querySelectorAll('[data-value]').forEach((other) => {
                other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
            });
            onChange();
        };
    });
}

function fillList(ul, exercises, shown) {
    ul.replaceChildren();
    exercises.slice(0, shown).forEach((exercise) => {
        const li = el('li', null, ul);
        const button = el('button', { type: 'button', class: 'ex-row' }, li);
        el('span', { class: 'ex-name', text: exercise.name_sv }, button);
        el('span', { class: 'ex-meta', text: meta(exercise) }, button);
        button.addEventListener('click', () => openExercise(exercise.id, button));
    });
}

function renderSearch() {
    const status = document.getElementById('ex-search-status');
    const list = document.getElementById('ex-search-list');
    const more = document.getElementById('ex-search-more');
    if (!status || !list || !more) return;
    if (state.failed) {
        status.textContent = 'Övningarna kunde inte laddas.';
        list.replaceChildren();
        more.hidden = true;
        return;
    }
    if (!state.ready) {
        status.textContent = 'Laddar övningar…';
        return;
    }
    const hits = searchHits();
    if (hits.idle) {
        status.textContent = 'Sök på latin, svenska eller engelska, eller välj stretch eller styrka.';
        list.replaceChildren();
        more.hidden = true;
        return;
    }
    if (!hits.list.length) {
        status.textContent = 'Inga övningar matchar.';
        list.replaceChildren();
        more.hidden = true;
        return;
    }
    const shown = Math.min(state.searchShown, hits.list.length);
    status.textContent = 'Visar ' + shown + ' av ' + hits.list.length + '.';
    fillList(list, hits.list, shown);
    more.hidden = shown >= hits.list.length;
}

function filters(parent, type, level, onChange) {
    const wrap = el('div', { class: 'ex-filters' }, parent);
    const chips = el('div', { class: 'ex-chips', role: 'group', 'aria-label': 'Typ av övning' }, wrap);
    [
        ['all', 'Alla'],
        ['stretching', 'Stretch'],
        ['strengthen', 'Styrka']
    ].forEach(([value, label]) => {
        const button = el('button', { type: 'button', class: 'ex-chip', 'data-value': value, text: label }, chips);
        button.setAttribute('aria-pressed', value === type ? 'true' : 'false');
        button.addEventListener('click', () => {
            state.panelType = value;
            state.panelShown = PAGE;
            onChange();
            const pressed = getMap() && getMap().panel.querySelector('.ex-block .ex-chip[aria-pressed="true"]');
            if (pressed) pressed.focus();
        });
    });
    const levelLabelNode = el('label', { class: 'ex-level' }, wrap);
    el('span', { text: 'Nivå' }, levelLabelNode);
    const select = el('select', null, levelLabelNode);
    [
        ['all', 'Alla'],
        ['beginner', 'Nybörjare'],
        ['intermediate', 'Medel'],
        ['expert', 'Avancerad']
    ].forEach(([value, label]) => {
        const option = el('option', { value, text: label }, select);
        if (value === level) option.selected = true;
    });
    select.addEventListener('change', () => {
        state.panelLevel = select.value;
        state.panelShown = PAGE;
        onChange();
        const next = getMap() && getMap().panel.querySelector('.ex-block select');
        if (next) next.focus();
    });
    return wrap;
}

function renderExerciseBlock(parent, exercises, emptyAll, emptyFiltered) {
    const filtered = applyFilters(exercises, state.panelType, state.panelLevel);
    if (!exercises.length) {
        el('p', { class: 'ex-note', text: emptyAll }, parent);
        return;
    }
    filters(parent, state.panelType, state.panelLevel, () => {
        const map = getMap();
        if (map) paintPanel(map);
    });
    if (!filtered.length) {
        el('p', { class: 'ex-note', text: emptyFiltered }, parent);
        return;
    }
    const ul = el('ul', { class: 'ex-list' }, parent);
    fillList(ul, filtered, state.panelShown);
    const shown = Math.min(state.panelShown, filtered.length);
    el('p', { class: 'ex-count', text: 'Visar ' + shown + ' av ' + filtered.length + '.' }, parent);
    if (shown < filtered.length) {
        const more = el('button', { type: 'button', class: 'ex-more', text: 'Visa fler' }, parent);
        more.addEventListener('click', () => {
            state.panelShown += PAGE;
            const map = getMap();
            if (map) paintPanel(map);
            const next = map && map.panel.querySelector('.ex-block .ex-more');
            if (next) next.focus();
        });
    }
}

function paintPanel(map) {
    const body = map.panel && map.panel.querySelector('.bm-panel-body');
    if (!body) return;
    body.querySelectorAll('.ex-block').forEach((node) => node.remove());
    const disclaimer = body.querySelector('.bm-disclaimer');
    const section = el('section', { class: 'ex-block', 'aria-labelledby': 'ex-panel-title' });
    el('h4', { class: 'bm-h', id: 'ex-panel-title', text: 'Övningar' }, section);
    if (!state.ready) {
        el('p', { class: 'ex-note', text: state.failed ? 'Övningarna kunde inte laddas.' : 'Laddar övningar…' }, section);
    } else if (!map.sel) {
        section.remove();
        return;
    } else if (map.sel.type === 'zone') {
        const ids = zoneMuscleIds(map, map.sel.id);
        const exercises = exercisesForMuscles(ids);
        const key = 'zone:' + map.sel.id;
        if (state.panelKey !== key) {
            state.panelKey = key;
            state.panelShown = PAGE;
        }
        if (!exercises.length) {
            el('p', { class: 'ex-note', text: 'Inga övningar är kopplade till musklerna för det här området.' }, section);
        } else {
            const open = state.zoneOpenFor === map.sel.id;
            const toggle = el('button', {
                type: 'button',
                class: 'ex-zone-link',
                text: (open ? 'Dölj övningar' : 'Visa övningar') + ' för de här musklerna (' + exercises.length + ')'
            }, section);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-controls', 'ex-zone-list');
            const region = el('div', { id: 'ex-zone-list' }, section);
            if (!open) region.hidden = true;
            else {
                el('p', { class: 'ex-note', text: NOTE + ' Stretch kommer först.' }, region);
                renderExerciseBlock(
                    region,
                    exercises,
                    'Inga övningar är kopplade till musklerna för det här området.',
                    'Inga övningar med de här filtren.'
                );
            }
            toggle.addEventListener('click', () => {
                state.zoneOpenFor = open ? '' : map.sel.id;
                state.panelShown = PAGE;
                paintPanel(map);
                const next = map.panel.querySelector('.ex-zone-link');
                if (next) next.focus();
            });
        }
    } else {
        const key = 'muscle:' + map.sel.id;
        if (state.panelKey !== key) {
            state.panelKey = key;
            state.panelShown = PAGE;
        }
        el('p', { class: 'ex-note', text: NOTE }, section);
        const exercises = state.byMuscle.get(map.sel.id) || [];
        renderExerciseBlock(
            section,
            exercises,
            'Inga övningar är kopplade till den här muskeln.',
            'Inga övningar med de här filtren.'
        );
    }
    if (disclaimer) body.insertBefore(section, disclaimer);
    else body.appendChild(section);
}

function contextMuscle(map, exercise) {
    const sel = map && map.sel;
    if (sel && sel.type === 'muscle' && exercise.muscleIds.indexOf(sel.id) !== -1) return sel.id;
    if (sel && sel.type === 'zone') {
        const ids = zoneMuscleIds(map, sel.id);
        const hit = exercise.muscleIds.find((id) => ids.indexOf(id) !== -1);
        if (hit) return hit;
    }
    const hash = readHash();
    if (hash.muscle && exercise.muscleIds.indexOf(hash.muscle) !== -1) return hash.muscle;
    return exercise.muscleIds[0] || null;
}

async function openExercise(id, opener) {
    const map = getMap();
    const dialog = document.getElementById('ex-dialog');
    const body = document.getElementById('ex-dialog-body');
    if (!dialog || !body) return;
    state.returnFocus = opener || document.activeElement;
    state.openId = id;
    body.replaceChildren();
    el('p', { class: 'ex-note', text: 'Laddar…' }, body);
    if (!dialog.open) dialog.showModal();
    let detail = details.get(id);
    if (!detail) {
        try {
            const response = await fetch('/exercises/d/' + encodeURIComponent(id) + '.json');
            if (!response.ok) throw new Error(String(response.status));
            detail = await response.json();
            details.set(id, detail);
        } catch {
            body.replaceChildren();
            el('p', { text: 'Övningen kunde inte hämtas.' }, body);
            return;
        }
    }
    if (state.openId !== id) return;
    const indexEntry = state.byId.get(id) || detail;
    const muscleId = contextMuscle(map, indexEntry);
    if (map && muscleId && (!map.sel || map.sel.type !== 'muscle' || map.sel.id !== muscleId)) {
        state.suspendClose = true;
        map.selectMuscle(muscleId);
        state.suspendClose = false;
    }
    renderDialog(detail, map);
    state.hashReady = true;
    writeHash(map);
}

function renderDialog(detail, map) {
    const body = document.getElementById('ex-dialog-body');
    const dialog = document.getElementById('ex-dialog');
    body.replaceChildren();
    el('p', { class: 'ex-kicker', text: typeLabel(detail.type) }, body);
    const title = el('h2', { id: 'ex-dialog-title', text: detail.name_sv }, body);
    dialog.setAttribute('aria-labelledby', 'ex-dialog-title');
    if (detail.name && norm(detail.name) !== norm(detail.name_sv)) {
        el('p', { class: 'ex-en', text: detail.name }, body);
    }
    el('p', { class: 'ex-meta', text: meta(detail) }, body);
    if (detail.images && detail.images.length) {
        const photos = el('div', { class: 'ex-photos' }, body);
        detail.images.forEach((src, index) => {
            const img = el('img', {
                alt: detail.name_sv + ', bild ' + (index + 1),
                width: '640',
                height: '426',
                decoding: 'async',
                loading: 'lazy'
            }, photos);
            img.src = src;
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
            const button = el('button', { type: 'button', class: 'ex-muscle', text: muscleName(map, id) }, li);
            button.addEventListener('click', () => jumpToMuscle(id));
        });
    }
    el('p', { class: 'ex-note', text: NOTE }, body);
    el('p', { class: 'ex-source', text: 'Bilderna kommer från free-exercise-db (public domain).' }, body);
    title.tabIndex = -1;
    title.focus();
}

function jumpToMuscle(id) {
    const map = getMap();
    const dialog = document.getElementById('ex-dialog');
    state.openId = null;
    if (dialog && dialog.open) dialog.close();
    if (map) map.selectMuscle(id);
    const root = mapRoot();
    if (root) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
}

function wireDialog() {
    const dialog = document.getElementById('ex-dialog');
    if (!dialog) return;
    dialog.addEventListener('close', () => {
        state.openId = null;
        writeHash(getMap());
        if (restoreOnClose && state.returnFocus && state.returnFocus.focus) state.returnFocus.focus();
        restoreOnClose = true;
    });
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
    });
    const close = dialog.querySelector('.ex-close');
    if (close) close.addEventListener('click', () => dialog.close());
}

function wireSearch() {
    const form = document.getElementById('ex-search-form');
    const input = document.getElementById('ex-q');
    const more = document.getElementById('ex-search-more');
    const types = document.getElementById('ex-search-types');
    if (!form || !input || !more || !types) return;
    form.addEventListener('submit', (event) => event.preventDefault());
    input.addEventListener('input', () => {
        state.searchShown = PAGE;
        renderSearch();
    });
    setChips(types, 'all', () => {
        state.searchShown = PAGE;
        renderSearch();
    });
    const level = document.getElementById('ex-search-level');
    if (level) {
        level.addEventListener('change', () => {
            state.searchShown = PAGE;
            renderSearch();
        });
    }
    more.addEventListener('click', () => {
        state.searchShown += PAGE;
        renderSearch();
        if (!more.hidden) more.focus();
        else {
            const rows = document.querySelectorAll('#ex-search-list .ex-row');
            const last = rows[rows.length - 1];
            if (last) last.focus();
        }
    });
}

function hookMap(map) {
    const original = map._renderPanel.bind(map);
    map._renderPanel = function () {
        original();
        const sel = map.sel;
        const exercise = state.openId ? state.byId.get(state.openId) : null;
        const stillHere =
            exercise && sel && sel.type === 'muscle' && exercise.muscleIds.indexOf(sel.id) !== -1;
        if (!state.suspendClose && state.openId && !stillHere) {
            state.openId = null;
            restoreOnClose = false;
            const dialog = document.getElementById('ex-dialog');
            if (dialog && dialog.open) dialog.close();
        }
        paintPanel(map);
        writeHash(map);
    };
    paintPanel(map);
}

async function loadIndex() {
    const response = await fetch('/exercises/index.json');
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    state.exercises = data.exercises || [];
    state.exercises.forEach((exercise, index) => {
        exercise.order = index;
        state.byId.set(exercise.id, exercise);
        exercise.muscleIds.forEach((id) => {
            if (!state.byMuscle.has(id)) state.byMuscle.set(id, []);
            state.byMuscle.get(id).push(exercise);
        });
    });
    state.ready = true;
}

function waitForMap() {
    return new Promise((resolve) => {
        const found = () => {
            const map = getMap();
            if (!map) return false;
            resolve(map);
            return true;
        };
        if (found()) return;
        const timer = setInterval(() => {
            if (found()) clearInterval(timer);
        }, 40);
        window.addEventListener('DOMContentLoaded', () => {
            if (found()) clearInterval(timer);
        });
        setTimeout(() => {
            clearInterval(timer);
            resolve(getMap());
        }, 3000);
    });
}

async function start() {
    wireSearch();
    wireDialog();
    const map = await waitForMap();
    if (map) hookMap(map);
    try {
        await loadIndex();
    } catch {
        state.failed = true;
    }
    renderSearch();
    const current = getMap();
    if (current) paintPanel(current);
    const hash = readHash();
    const moved =
        hash.muscle &&
        current &&
        current.sel &&
        current.sel.type === 'muscle' &&
        current.sel.id !== hash.muscle;
    if (hash.ex && !moved && state.ready) await openExercise(hash.ex, null);
    state.hashReady = true;
    writeHash(current);
    window.addEventListener('hashchange', () => {
        const next = readHash();
        const live = getMap();
        if (!live) return;
        if (next.zone) {
            if (!live.sel || live.sel.type !== 'zone' || live.sel.id !== next.zone) live.selectZone(next.zone);
        } else if (next.muscle) {
            if (!live.sel || live.sel.type !== 'muscle' || live.sel.id !== next.muscle) live.selectMuscle(next.muscle);
        }
        if (next.ex && next.ex !== state.openId) openExercise(next.ex, null);
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
