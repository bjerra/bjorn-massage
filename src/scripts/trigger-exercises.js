/**
 * Exercise lookup for /ovningar.
 * Loads a small index, then one detail file when an exercise is opened.
 * The body-map widget still owns muscle and zone selection.
 */
import { installMuscleModal, openMuscleModal } from './muscle-modal.ts';
import { readModalMuscle } from '../data/muscle-modal-url.ts';
import {
    EXERCISE_NOTE,
    closeExerciseDialog,
    ensureExerciseDialog,
    fillExerciseList,
    getExerciseIndex,
    loadExerciseIndex,
    openExerciseDialog
} from './exercise-dialog.js';

const PAGE = 8;
const NOTE = EXERCISE_NOTE;

const state = {
    exercises: [],
    byId: new Map(),
    byMuscle: new Map(),
    ready: false,
    failed: false,
    hashReady: false,
    openId: null,
    suspendClose: false,
    panelType: 'all',
    panelLevel: 'all',
    panelShown: PAGE,
    panelKey: '',
    zoneOpenFor: '',
    searchShown: PAGE
};

function norm(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
}

function readHash() {
    const params = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    return {
        muscle: params.get('muscle'),
        zone: params.get('zone'),
        ex: params.get('ex')
    };
}

function readDeepLink() {
    const hash = readHash();
    if (!window.EXERCISE_PAGE) return hash;
    const params = new URLSearchParams(location.search);
    return {
        muscle: params.get('muskel') || hash.muscle,
        zone: hash.zone,
        ex: params.get('ovning') || hash.ex
    };
}

function writeHash(map) {
    if (!state.hashReady || !map) return;
    const parts = [];
    const sel = map.sel;
    if (sel && sel.type === 'muscle') parts.push('muscle=' + encodeURIComponent(sel.id));
    else if (sel && sel.type === 'zone') parts.push('zone=' + encodeURIComponent(sel.id));
    if (state.openId) parts.push('ex=' + encodeURIComponent(state.openId));
    const modalId = readModalMuscle(location.hash);
    if (modalId) parts.push('muskel=' + encodeURIComponent(modalId));
    const hash = parts.length ? '#' + parts.join('&') : '';
    let search = location.search;
    if (window.EXERCISE_PAGE) {
        const params = new URLSearchParams(location.search);
        if (sel && sel.type === 'muscle') params.set('muskel', sel.id);
        else params.delete('muskel');
        if (state.openId) params.set('ovning', state.openId);
        else params.delete('ovning');
        const query = params.toString();
        search = query ? '?' + query : '';
    }
    if (!hash && location.hash && /^#movement=/.test(location.hash)) return;
    const next = location.pathname + search + (hash || (/^#movement=/.test(location.hash) ? location.hash : ''));
    const current = location.pathname + location.search + location.hash;
    if (next !== current) history.replaceState(null, '', next);
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
    fillExerciseList(ul, exercises.slice(0, shown), (id, button) => openExercise(id, button));
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

function hideMuscleTriggerMarks(map) {
    if (!map.sel || map.sel.type !== 'muscle') return;
    map.root.querySelectorAll('.bm-tp').forEach((node) => node.remove());
    map.root.querySelectorAll('.bm-zone.bm-ref').forEach((node) => {
        node.classList.remove('bm-ref');
        node.querySelectorAll('[filter]').forEach((shape) => shape.removeAttribute('filter'));
    });
}

function paintMuscleExercises(map, body) {
    body.replaceChildren();
    const head = el('div', { class: 'bm-panel-head' }, body);
    const titles = el('div', null, head);
    el('div', { class: 'bm-kicker', text: 'Muskel' }, titles);
    el('h3', { class: 'bm-panel-title', text: map.muscleName(map.sel.id) }, titles);
    const common = map.commonName ? map.commonName(map.sel.id) : '';
    if (common) el('p', { class: 'bm-common', text: common }, titles);
    const tools = el('div', { class: 'ex-muscle-tools' }, head);
    const about = el('button', { type: 'button', class: 'ex-about', text: 'Om muskeln', 'aria-haspopup': 'dialog' }, tools);
    about.addEventListener('click', () => {
        void openMuscleModal(map.sel.id, { opener: about });
    });
    const clear = el('button', { type: 'button', class: 'bm-clear', text: map.t.clear || 'Rensa' }, tools);
    clear.setAttribute('aria-label', map.t.clearAria || 'Rensa val');
    clear.addEventListener('click', () => map.clear({ scroll: true }));

    const section = el('section', { class: 'ex-block', 'aria-labelledby': 'ex-panel-title' }, body);
    el('h4', { class: 'bm-h', id: 'ex-panel-title', text: 'Övningar' }, section);
    if (!state.ready) {
        el('p', { class: 'ex-note', text: state.failed ? 'Övningarna kunde inte laddas.' : 'Laddar övningar…' }, section);
        return;
    }
    el('p', { class: 'ex-note ex-safety', text: NOTE }, section);
    const key = 'muscle:' + map.sel.id;
    if (state.panelKey !== key) {
        state.panelKey = key;
        state.panelShown = PAGE;
    }
    renderExerciseBlock(
        section,
        state.byMuscle.get(map.sel.id) || [],
        'Inga övningar är kopplade till den här muskeln.',
        'Inga övningar med de här filtren.'
    );
}

function paintPanel(map) {
    const body = map.panel && map.panel.querySelector('.bm-panel-body');
    if (!body) return;
    hideMuscleTriggerMarks(map);
    if (map.sel && map.sel.type === 'muscle') {
        paintMuscleExercises(map, body);
        return;
    }
    body.querySelectorAll('.ex-block').forEach((node) => node.remove());
    if (!map.sel) {
        const caution = body.querySelector('.bm-caution');
        if (caution) caution.remove();
        const empty = body.querySelector('.bm-muted');
        if (empty && !empty.textContent.trim()) empty.remove();
        return;
    }
    const disclaimer = body.querySelector('.bm-disclaimer') || body.querySelector('.bm-caution');
    const section = el('section', { class: 'ex-block', 'aria-labelledby': 'ex-panel-title' });
    el('h4', { class: 'bm-h', id: 'ex-panel-title', text: 'Övningar' }, section);
    if (!state.ready) {
        el('p', { class: 'ex-note', text: state.failed ? 'Övningarna kunde inte laddas.' : 'Laddar övningar…' }, section);
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
    }
    if (disclaimer) disclaimer.insertAdjacentElement('afterend', section);
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
    const hash = readDeepLink();
    if (hash.muscle && exercise.muscleIds.indexOf(hash.muscle) !== -1) return hash.muscle;
    return exercise.muscleIds[0] || null;
}

async function openExercise(id, opener) {
    state.openId = id;
    const result = await openExerciseDialog(id, {
        opener: opener || (document.activeElement instanceof HTMLElement ? document.activeElement : null),
        muscleName: (muscleId) => muscleName(getMap(), muscleId),
        onMuscle: (muscleId) => jumpToMuscle(muscleId),
        onClose: () => {
            state.openId = null;
            writeHash(getMap());
        },
        beforeRender: (_detail, indexEntry) => {
            const live = getMap();
            const muscleId = contextMuscle(live, indexEntry);
            if (live && muscleId && (!live.sel || live.sel.type !== 'muscle' || live.sel.id !== muscleId)) {
                state.suspendClose = true;
                live.selectMuscle(muscleId);
                state.suspendClose = false;
            }
        }
    });
    if (result === 'ok' && state.openId === id) {
        state.hashReady = true;
        writeHash(getMap());
    }
}

function jumpToMuscle(id) {
    const map = getMap();
    closeExerciseDialog({ restoreFocus: false });
    if (map) map.selectMuscle(id);
    const root = mapRoot();
    if (root) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
}

function wireDialog() {
    ensureExerciseDialog();
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
            closeExerciseDialog({ restoreFocus: false });
        }
        paintPanel(map);
        writeHash(map);
    };
    paintPanel(map);
}

async function loadIndex() {
    await loadExerciseIndex();
    const data = getExerciseIndex();
    state.exercises = data.exercises;
    state.byId = data.byId;
    state.byMuscle = data.byMuscle;
    state.ready = data.ready;
    state.failed = data.failed;
    if (data.failed) throw new Error('index');
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

function revealExercises() {
    const block = document.querySelector('.ex-block');
    if (!block) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    block.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
}

async function start() {
    installMuscleModal();
    wireSearch();
    wireDialog();
    const early = readDeepLink();
    if (early.zone) state.zoneOpenFor = early.zone;
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
    const hash = readDeepLink();
    if (hash.zone || hash.muscle) revealExercises();
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
        const next = readDeepLink();
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

window.addEventListener('bodymap-strings', () => {
    state.exercises.forEach((exercise) => {
        delete exercise._search;
    });
    if (state.ready) renderSearch();
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
