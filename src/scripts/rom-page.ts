import { attachRomAnalysis } from '../data/rom-analysis';
import { installMuscleModal, openMuscleModal } from './muscle-modal';
import {
    buildCatalog,
    movementByQuery,
    movementBySource,
    muscleCommon,
    muscleLatin,
    muscleOffMap,
    paintLists,
    searchMovements,
    type MovementFile,
    type RomCatalog,
    type RomMovement
} from '../data/rom-catalog';

type MapApi = {
    mode: string;
    sel: { type: string; id: string } | null;
    root: HTMLElement;
    data: { muscleViews: Record<string, unknown> };
    t: { muscles?: Record<string, string> };
    groupOf: Record<string, string>;
    muscleEls: { front: Record<string, Element>; back: Record<string, Element> };
    setMode: (mode: string) => void;
    setMovementHighlight: (paint: { prime: string[]; synergist: string[] } | null) => void;
    selectMuscle: (id: string | null) => void;
    clear: (opts?: { scroll?: boolean; history?: boolean }) => void;
    activeView: string;
    setActiveView: (view: string) => void;
    _render: () => void;
};

type State = {
    catalog: RomCatalog | null;
    map: MapApi | null;
    group: string;
    slug: string;
    muscle: string;
    pinnedView: boolean;
    lock: boolean;
    hits: RomMovement[];
    active: number;
    /** Phone list. `moves` replaces the joint list; desktop ignores this. */
    phoneList: 'joints' | 'moves';
};

const state: State = {
    catalog: null,
    map: null,
    group: '',
    slug: '',
    muscle: '',
    pinnedView: false,
    lock: false,
    hits: [],
    active: -1,
    phoneList: 'joints'
};

function phoneLayout(): boolean {
    return window.matchMedia('(max-width: 700px)').matches;
}

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: Record<string, string> | null,
    parent?: Node
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (attrs) {
        for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    }
    if (parent) parent.appendChild(node);
    return node;
}

function text(value: string, parent: Node): Text {
    const node = document.createTextNode(value);
    parent.appendChild(node);
    return node;
}

function getMap(): MapApi | null {
    const root = document.querySelector('[data-bodymap]') as HTMLElement & { __bodymap?: MapApi };
    return root?.__bodymap || null;
}

function waitForMap(): Promise<MapApi | null> {
    return new Promise((resolve) => {
        const found = () => {
            const map = getMap();
            if (!map) return false;
            resolve(map);
            return true;
        };
        if (found()) return;
        const timer = window.setInterval(() => {
            if (found()) window.clearInterval(timer);
        }, 40);
        window.setTimeout(() => {
            window.clearInterval(timer);
            resolve(getMap());
        }, 4000);
    });
}

function currentMovement(): RomMovement | null {
    if (!state.catalog) return null;
    return movementByQuery(state.catalog, state.group, state.slug);
}

function latinName(id: string): string {
    const strings = (window as Window & { BODYMAP_STRINGS?: { muscles?: Record<string, string> } }).BODYMAP_STRINGS;
    return muscleLatin(state.catalog!, id, strings?.muscles?.[id]);
}

function writeUrl(push: boolean) {
    const params = new URLSearchParams();
    if (state.group) params.set('led', state.group);
    if (state.slug) params.set('rorelse', state.slug);
    if (state.muscle) params.set('muskel', state.muscle);
    const query = params.toString();
    const next = location.pathname + (query ? `?${query}` : '') + location.hash;
    const current = location.pathname + location.search + location.hash;
    if (next === current) return;
    const historyState = { led: state.group, rorelse: state.slug, muskel: state.muscle };
    if (push) history.pushState(historyState, '', next);
    else history.replaceState(historyState, '', next);
}

function preferredView(movement: RomMovement): 'front' | 'back' {
    const map = state.map;
    if (!map) return 'front';
    const parts = paintLists(movement.primeMovers, movement.synergists);
    const scores = { front: 0, back: 0 };
    function add(ids: string[], weight: number) {
        ids.forEach((id) => {
            const group = map.groupOf[id] || id;
            if (map.muscleEls.front[group]) scores.front += weight;
            if (map.muscleEls.back[group]) scores.back += weight;
        });
    }
    add(parts.primePaint, 2);
    add(parts.synPaint, 1);
    return scores.back > scores.front ? 'back' : 'front';
}

function paint(movement: RomMovement | null) {
    const map = state.map;
    if (!map) return;
    if (!movement) {
        map.setMovementHighlight(null);
        return;
    }
    const parts = paintLists(movement.primeMovers, movement.synergists);
    map.setMovementHighlight({ prime: parts.primePaint, synergist: parts.synPaint });
    if (!state.pinnedView) map.setActiveView(preferredView(movement));
}

function focusMuscle(id: string, push: boolean) {
    const map = state.map;
    state.muscle = id;
    if (!map) return;
    state.lock = true;
    if (id) map.selectMuscle(id);
    else if (map.sel) {
        map.sel = null;
        map._render();
    }
    state.lock = false;
    writeUrl(push);
    render();
    placeRail();
}

function choose(group: string, slug: string, muscle: string, push: boolean) {
    const movement = state.catalog ? movementByQuery(state.catalog, group, slug) : null;
    state.group = movement ? group : group && state.catalog?.groups.some((item) => item.id === group) ? group : '';
    state.slug = movement ? slug : '';
    state.muscle = movement ? muscle : '';
    state.phoneList = state.group ? 'moves' : 'joints';
    if (!movement) state.pinnedView = false;
    hideSuggest();
    const input = document.getElementById('rom-q') as HTMLInputElement | null;
    if (input) input.value = '';
    paint(movement);
    if (!phoneLayout() && movement && state.muscle && state.map) {
        state.lock = true;
        state.map.selectMuscle(state.muscle);
        state.lock = false;
    } else if (state.map?.sel) {
        state.lock = true;
        state.map.sel = null;
        state.map._render();
        state.lock = false;
    }
    writeUrl(push);
    render();
    placeRail();
}

function movementButton(item: RomMovement, parent: HTMLElement) {
    const movement = currentMovement();
    const pressed = movement?.slug === item.slug && movement.groupId === item.groupId;
    const button = el('button', {
        type: 'button',
        class: 'rom-move' + (pressed ? ' is-on' : ''),
        'aria-pressed': pressed ? 'true' : 'false'
    }, parent);
    const term = el('span', { class: 'rom-move-term' }, button);
    text(item.title, term);
    const short = el('span', { class: 'rom-move-short' }, button);
    text(item.term, short);
    if (item.gloss) {
        const gloss = el('span', { class: 'rom-move-gloss' }, button);
        text(item.gloss, gloss);
    }
    button.addEventListener('click', () => {
        state.pinnedView = false;
        choose(item.groupId, item.slug, '', true);
    });
}

function renderPhoneList(rail: HTMLElement, catalog: RomCatalog) {
    const group = catalog.groups.find((item) => item.id === state.group);
    if (!group || state.phoneList !== 'moves') {
        catalog.rail.forEach((item) => {
            const button = el('button', {
                type: 'button',
                class: 'rom-joint' + (item.id === state.group ? ' is-on' : ''),
                'data-joint': item.id
            }, rail);
            text(item.label, button);
            button.addEventListener('click', () => {
                state.pinnedView = false;
                choose(item.id, '', '', true);
            });
        });
        return;
    }
    const back = el('button', { type: 'button', class: 'rom-back-joints' }, rail);
    text('← Leder', back);
    back.addEventListener('click', () => {
        state.pinnedView = false;
        choose('', '', '', true);
    });
    const list = el('ul', { class: 'rom-moves' }, rail);
    catalog.movements.filter((item) => item.groupId === group.id).forEach((item) => {
        const li = el('li', null, list);
        movementButton(item, li);
    });
}

function muscleGroup(id: string): string {
    const map = state.map;
    if (!map) return id;
    return map.groupOf[id] || id;
}

function muscleSides(id: string): { front: boolean; back: boolean } {
    const map = state.map;
    const group = muscleGroup(id);
    if (!map) return { front: false, back: false };
    return {
        front: !!map.muscleEls.front[group],
        back: !!map.muscleEls.back[group]
    };
}

function aimViewAtMuscle(id: string) {
    const map = state.map;
    if (!map) return;
    const sides = muscleSides(id);
    if (sides.back && !sides.front && map.activeView !== 'back') {
        state.pinnedView = true;
        map.setActiveView('back');
    } else if (sides.front && !sides.back && map.activeView !== 'front') {
        state.pinnedView = true;
        map.setActiveView('front');
    }
}

function markFocus() {
    const root = state.map?.root;
    if (!root || !state.map) return;
    root.querySelectorAll('.rom-focus, .rom-dim').forEach((node) => {
        node.classList.remove('rom-focus', 'rom-dim');
    });
    if (!phoneLayout() || !state.muscle || !currentMovement()) return;
    const group = muscleGroup(state.muscle);
    (['front', 'back'] as const).forEach((view) => {
        state.map?.muscleEls[view][group]?.classList.add('rom-focus');
    });
    root.querySelectorAll('.bm-muscle.bm-prime, .bm-muscle.bm-syn').forEach((node) => {
        if (!node.classList.contains('rom-focus')) node.classList.add('rom-dim');
    });
}

function focusPhoneMuscle(id: string) {
    const movement = currentMovement();
    if (state.muscle === id) {
        state.muscle = '';
        state.pinnedView = false;
        paint(movement);
        writeUrl(true);
        render();
        return;
    }
    state.muscle = id;
    aimViewAtMuscle(id);
    writeUrl(true);
    render();
}

function placeFlip() {
    const root = state.map?.root;
    root?.querySelectorAll('.rom-flip').forEach((node) => node.remove());
    if (!phoneLayout() || !root || !state.map) return;
    const fig = root.querySelector('.bm-fig.bm-view-on') as HTMLElement | null;
    if (!fig) return;
    const toBack = state.map.activeView !== 'back';
    const label = toBack ? 'Baksida' : 'Framsida';
    const button = el('button', { type: 'button', class: 'rom-flip' });
    button.setAttribute('aria-label', toBack ? 'Visa baksidan' : 'Visa framsidan');
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 16 16');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('class', 'rom-flip-icon');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M2 5h8.5M8.5 2.5 11.5 5 8.5 7.5M14 11H5.5M7.5 8.5 4.5 11 7.5 13.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.4');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    icon.appendChild(path);
    button.append(icon, document.createTextNode(label));
    button.addEventListener('click', () => {
        const map = state.map;
        if (!map) return;
        state.pinnedView = true;
        map.setActiveView(map.activeView === 'back' ? 'front' : 'back');
        frameFigure();
    });
    fig.appendChild(button);
    const spot = button.getBoundingClientRect();
    const hits = fig.querySelectorAll('.bm-muscle.rom-focus, .bm-muscle.bm-prime');
    const crowded = [...hits].some((node) => {
        const rect = node.getBoundingClientRect();
        if (!rect.height) return false;
        return rect.left < spot.right && rect.right > spot.left && rect.top < spot.bottom && rect.bottom > spot.top;
    });
    if (crowded) button.classList.add('is-left');
}

function resetFigure(root: HTMLElement) {
    root.querySelectorAll('.bm-svg').forEach((node) => {
        const svg = node as SVGSVGElement;
        svg.style.transform = '';
        svg.style.aspectRatio = '';
        if (svg.dataset.baseView) {
            svg.setAttribute('viewBox', svg.dataset.baseView);
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }
    });
    root.querySelectorAll('.bm-fig').forEach((node) => {
        const fig = node as HTMLElement;
        fig.style.height = '';
        fig.style.overflow = '';
    });
}

/** Show the full figure, or the top half of that height with the highlighted muscles centred. */
function frameFigure() {
    const root = state.map?.root;
    if (!root) return;
    resetFigure(root);
    placeFlip();
    if (!phoneLayout() || !currentMovement()) return;
    if (state.muscle) aimViewAtMuscle(state.muscle);
    markFocus();
    const fig = root.querySelector('.bm-fig.bm-view-on') as HTMLElement | null;
    const svg = fig?.querySelector('.bm-svg') as SVGSVGElement | null;
    if (!fig || !svg) return;
    const fullBox = svg.getBoundingClientRect();
    const full = fullBox.height;
    if (!full) return;
    const focus = svg.querySelectorAll('.bm-muscle.rom-focus');
    const primes = svg.querySelectorAll('.bm-muscle.bm-prime');
    const nodes = focus.length ? focus : primes.length ? primes : svg.querySelectorAll('.bm-muscle.bm-syn');
    if (!nodes.length) return;
    let min = Infinity;
    let max = -Infinity;
    nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (!rect.height) return;
        min = Math.min(min, rect.top);
        max = Math.max(max, rect.bottom);
    });
    if (!Number.isFinite(min) || max <= min) return;
    const windowH = full * 0.5;
    const center = (min + max) / 2 - fullBox.top;
    const offset = Math.max(windowH - full, Math.min(0, windowH / 2 - center));
    fig.style.height = `${windowH}px`;
    fig.style.overflow = 'hidden';
    svg.style.transform = `translateY(${offset}px)`;
    placeFlip();
}

function paintPhoneKey(movement: RomMovement | null) {
    const slot = document.querySelector('[data-rom-key]');
    if (!slot) return;
    slot.replaceChildren();
    if (!phoneLayout() || !movement) {
        slot.setAttribute('hidden', '');
        return;
    }
    slot.removeAttribute('hidden');
    const primeKey = el('span', null, slot);
    el('i', { class: 'rom-swatch rom-swatch-prime', 'aria-hidden': 'true' }, primeKey);
    text('Primära', primeKey);
    const synKey = el('span', null, slot);
    el('i', { class: 'rom-swatch rom-swatch-syn', 'aria-hidden': 'true' }, synKey);
    text('Synergister', synKey);
}

function paintPhoneMuscles(movement: RomMovement | null) {
    const slot = document.querySelector('[data-rom-phone-muscles]');
    if (!slot) return;
    slot.replaceChildren();
    if (!phoneLayout() || !movement) {
        slot.setAttribute('hidden', '');
        return;
    }
    slot.removeAttribute('hidden');
    const parts = paintLists(movement.primeMovers, movement.synergists);
    const list = el('ul', { class: 'rom-muscles' }, slot);
    const add = (id: string, tone: 'prime' | 'syn') => {
        const li = el('li', { class: 'rom-muscle-row' }, list);
        muscleButton(id, li);
        li.querySelector('button')?.classList.add(tone === 'prime' ? 'rom-muscle-prime' : 'rom-muscle-syn');
    };
    parts.listPrime.forEach((id) => add(id, 'prime'));
    parts.listSyn.forEach((id) => add(id, 'syn'));
}

function renderRail() {
    const rail = document.querySelector('[data-rom-rail]');
    const catalog = state.catalog;
    if (!rail || !catalog) return;
    rail.replaceChildren();
    if (phoneLayout()) {
        renderPhoneList(rail, catalog);
        return;
    }
    catalog.rail.forEach((group) => {
        const button = el('button', {
            type: 'button',
            class: 'rom-joint' + (group.id === state.group ? ' is-on' : ''),
            'data-joint': group.id,
            'aria-expanded': group.id === state.group ? 'true' : 'false'
        });
        button.style.top = `${group.anchor * 100}%`;
        text(group.label, button);
        button.addEventListener('click', () => {
            if (state.group === group.id && !state.slug) {
                choose('', '', '', true);
                return;
            }
            const movement = currentMovement();
            if (movement && movement.groupId === group.id) return;
            state.pinnedView = false;
            choose(group.id, '', '', true);
        });
        rail.appendChild(button);
    });
}

function muscleButton(id: string, parent: HTMLElement) {
    const catalog = state.catalog!;
    const onPhone = phoneLayout() && parent.closest('[data-rom-phone-muscles]');
    const button = el('button', {
        type: 'button',
        class: 'rom-muscle' + (state.muscle === id ? ' is-on' : ''),
        'aria-pressed': onPhone && state.muscle === id ? 'true' : 'false'
    }, parent);
    if (!onPhone) button.setAttribute('aria-haspopup', 'dialog');
    const name = el('span', { class: 'rom-muscle-name' }, button);
    text(latinName(id), name);
    const common = muscleCommon(catalog, id);
    if (common) {
        const line = el('span', { class: 'rom-muscle-sv' }, button);
        text(common, line);
    }
    if (muscleOffMap(catalog, id)) {
        const note = el('span', { class: 'rom-offmap' }, button);
        text('Visas inte på figuren.', note);
    }
    if (onPhone) {
        button.addEventListener('click', () => focusPhoneMuscle(id));
        const info = el('button', { type: 'button', class: 'rom-muscle-info', 'aria-label': 'Om muskeln' }, parent);
        info.setAttribute('aria-haspopup', 'dialog');
        text('›', info);
        info.addEventListener('click', () => {
            void openMuscleModal(id, { opener: info });
        });
        return;
    }
    button.addEventListener('click', () => {
        void openMuscleModal(id, { opener: button });
    });
}

function render() {
    const detail = document.querySelector('[data-rom-detail]');
    const catalog = state.catalog;
    if (!detail || !catalog) return;
    detail.replaceChildren();
    const movement = currentMovement();
    const group = catalog.groups.find((item) => item.id === state.group);

    const movesWrap = el('div', { class: 'rom-moves-wrap' }, detail);
    if (!group) {
        const lead = el('p', { class: 'rom-empty' }, movesWrap);
        text('Välj en led.', lead);
    } else {
        const heading = el('h2', null, movesWrap);
        text(group.label, heading);
        const list = el('ul', { class: 'rom-moves' }, movesWrap);
        catalog.movements
            .filter((item) => item.groupId === group.id)
            .forEach((item) => {
                const li = el('li', null, list);
                const button = el('button', {
                    type: 'button',
                    class: 'rom-move' + (movement?.slug === item.slug ? ' is-on' : ''),
                    'aria-pressed': movement?.slug === item.slug ? 'true' : 'false'
                }, li);
                const term = el('span', { class: 'rom-move-term' }, button);
                text(item.title, term);
                const short = el('span', { class: 'rom-move-short' }, button);
                text(item.term, short);
                if (item.gloss) {
                    const gloss = el('span', { class: 'rom-move-gloss' }, button);
                    text(item.gloss, gloss);
                }
                button.addEventListener('click', () => {
                    state.pinnedView = false;
                    choose(item.groupId, item.slug, '', true);
                });
            });
    }

    if (movement) {
        const result = el('section', { class: 'rom-result', 'aria-live': 'polite' }, detail);
        const kicker = el('p', { class: 'rom-kicker' }, result);
        text(movement.groupLabel, kicker);
        const title = el('h3', null, result);
        text(`${movement.term} – ${movement.gloss}`, title);
        const caution = el('p', { class: 'rom-caution' }, result);
        text('Muskler som vanligtvis arbetar i rörelsen. Listan är ingen undersökning.', caution);
        const key = el('p', { class: 'rom-key' }, result);
        const primeKey = el('span', null, key);
        el('i', { class: 'rom-swatch rom-swatch-prime', 'aria-hidden': 'true' }, primeKey);
        text('Primära', primeKey);
        const synKey = el('span', null, key);
        el('i', { class: 'rom-swatch rom-swatch-syn', 'aria-hidden': 'true' }, synKey);
        text('Synergister', synKey);

        const parts = paintLists(movement.primeMovers, movement.synergists);
        renderRole(result, 'Primära', parts.listPrime, 'prime');
        renderRole(result, 'Synergister', parts.listSyn, 'syn');

        if (state.muscle) {
            const picked = el('div', { class: 'rom-picked' }, result);
            const label = el('p', { class: 'rom-kicker' }, picked);
            text('Vald muskel', label);
            const name = el('p', { class: 'rom-picked-name' }, picked);
            text(latinName(state.muscle), name);
            const common = muscleCommon(catalog, state.muscle);
            if (common) {
                const line = el('p', { class: 'rom-muscle-sv' }, picked);
                text(common, line);
            }
            if (muscleOffMap(catalog, state.muscle)) {
                const off = el('p', { class: 'rom-offmap' }, picked);
                text('Visas inte på figuren.', off);
            }
            const link = el('a', { href: `/muskelkarta#muscle=${encodeURIComponent(state.muscle)}` }, picked);
            text('Öppna muskeln på muskelkartan', link);
            const back = el('button', { type: 'button', class: 'rom-back' }, picked);
            text('Tillbaka till rörelsen', back);
            back.addEventListener('click', () => focusMuscle('', true));
        }
    }

    const slot = el('div', { 'data-rom-analysis': '' }, detail);
    attachRomAnalysis(slot, {
        jointId: movement ? movement.source : '',
        movementId: movement ? movement.movementId : '',
        measurements: []
    });

    const status = document.getElementById('rom-status');
    if (status) {
        status.textContent = movement
            ? `${movement.groupLabel}: ${movement.term}, ${movement.gloss}.`
            : group
              ? `${group.label}. Välj en rörelse.`
              : '';
    }
    renderRail();
    paintPhoneKey(movement);
    paintPhoneMuscles(movement);
    frameFigure();
}

function renderRole(parent: HTMLElement, heading: string, ids: string[], tone: 'prime' | 'syn') {
    const title = el('h4', null, parent);
    text(heading, title);
    if (!ids.length) {
        const empty = el('p', { class: 'rom-muted' }, parent);
        text('Inga i underlaget.', empty);
        return;
    }
    const list = el('ul', { class: 'rom-muscles' }, parent);
    ids.forEach((id) => {
        const li = el('li', null, list);
        muscleButton(id, li);
        const button = li.querySelector('button');
        if (button) button.classList.add(tone === 'prime' ? 'rom-muscle-prime' : 'rom-muscle-syn');
    });
}

function hideSuggest() {
    const list = document.getElementById('rom-suggest');
    const input = document.getElementById('rom-q');
    state.hits = [];
    state.active = -1;
    if (list) {
        list.replaceChildren();
        list.hidden = true;
    }
    if (input) {
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
    }
}

function renderSuggest() {
    const input = document.getElementById('rom-q') as HTMLInputElement | null;
    const list = document.getElementById('rom-suggest');
    if (!input || !list || !state.catalog) return;
    const hits = searchMovements(state.catalog, input.value);
    state.hits = hits;
    state.active = hits.length ? 0 : -1;
    list.replaceChildren();
    if (!hits.length) {
        list.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        return;
    }
    hits.forEach((item, index) => {
        const li = el('li', null, list);
        const button = el('button', { type: 'button', role: 'option', id: `rom-opt-${index}` }, li);
        button.setAttribute('aria-selected', index === state.active ? 'true' : 'false');
        text(`${item.groupLabel}: ${item.term} – ${item.gloss}`, button);
        button.addEventListener('click', () => {
            state.pinnedView = false;
            choose(item.groupId, item.slug, '', true);
        });
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    markActive();
}

function markActive() {
    const input = document.getElementById('rom-q');
    document.querySelectorAll('#rom-suggest [role="option"]').forEach((button, index) => {
        const on = index === state.active;
        button.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on && input) input.setAttribute('aria-activedescendant', button.id);
    });
}

function moveActive(dir: number) {
    if (!state.hits.length) return;
    const next = state.active + dir;
    if (next < 0) state.active = state.hits.length - 1;
    else if (next >= state.hits.length) state.active = 0;
    else state.active = next;
    markActive();
}

function wireSearch() {
    const form = document.getElementById('rom-form');
    const input = document.getElementById('rom-q');
    const suggest = document.getElementById('rom-suggest');
    if (!form || !input || !suggest) return;
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!state.hits.length) return;
        const item = state.hits[state.active >= 0 ? state.active : 0];
        state.pinnedView = false;
        choose(item.groupId, item.slug, '', true);
    });
    input.addEventListener('input', () => renderSuggest());
    input.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (suggest.hidden) renderSuggest();
            else moveActive(1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (suggest.hidden) renderSuggest();
            else moveActive(-1);
        } else if (event.key === 'Escape') hideSuggest();
        else if (event.key === 'Enter' && state.hits.length) {
            event.preventDefault();
            const item = state.hits[state.active >= 0 ? state.active : 0];
            state.pinnedView = false;
            choose(item.groupId, item.slug, '', true);
        }
    });
    suggest.addEventListener('mousedown', (event) => event.preventDefault());
}

function readInitial() {
    const params = new URLSearchParams(location.search);
    const source = params.get('kalla') || '';
    const hash = /^#movement=([A-Za-z]+)\.([A-Za-z]+)/.exec(location.hash || '');
    const raw = source || (hash ? `${hash[1]}.${hash[2]}` : '');
    if (raw && state.catalog) {
        const dot = raw.indexOf('.');
        const found = dot > 0 ? movementBySource(state.catalog, raw.slice(0, dot), raw.slice(dot + 1)) : null;
        if (found) {
            state.group = found.groupId;
            state.slug = found.slug;
            state.muscle = '';
            state.phoneList = 'moves';
            return;
        }
    }
    state.group = params.get('led') || '';
    state.slug = params.get('rorelse') || '';
    state.muscle = params.get('muskel') || '';
    if (!movementByQuery(state.catalog!, state.group, state.slug)) {
        if (!state.catalog!.groups.some((group) => group.id === state.group)) state.group = '';
        state.slug = '';
        state.muscle = '';
    }
    state.phoneList = state.group ? 'moves' : 'joints';
}

function placeRail() {
    const rail = document.querySelector('[data-rom-rail]') as HTMLElement | null;
    const stage = document.querySelector('.rom-figure');
    const map = state.map;
    if (!rail || !stage || !map) return;
    if (window.matchMedia('(max-width: 700px)').matches) {
        rail.style.top = '';
        rail.style.height = '';
        return;
    }
    const svg =
        map.root.querySelector('.bm-fig.bm-view-on .bm-svg') || map.root.querySelector('.bm-svg');
    if (!svg) return;
    const stageBox = stage.getBoundingClientRect();
    const svgBox = svg.getBoundingClientRect();
    rail.style.top = `${svgBox.top - stageBox.top}px`;
    rail.style.height = `${Math.round(svgBox.height)}px`;
}

export async function startRom() {
    const root = document.querySelector('[data-rom]');
    if (!root) return;
    let data: MovementFile;
    try {
        const response = await fetch('/movements/data.json');
        if (!response.ok) throw new Error(String(response.status));
        data = (await response.json()) as MovementFile;
    } catch {
        const status = document.getElementById('rom-status');
        if (status) status.textContent = 'Rörelserna kunde inte laddas.';
        return;
    }
    state.catalog = buildCatalog(data);
    installMuscleModal();
    wireSearch();
    const map = await waitForMap();
    if (!map) return;
    state.map = map;
    if (map.mode !== 'movements') map.setMode('movements');
    readInitial();
    const movement = currentMovement();
    paint(movement);
    if (!phoneLayout() && movement && state.muscle) {
        state.lock = true;
        map.selectMuscle(state.muscle);
        state.lock = false;
    }
    writeUrl(false);
    render();
    map.root.addEventListener('bodymap-change', () => {
        if (state.lock || !state.map) return;
        const id = state.map.sel && state.map.sel.type === 'muscle' ? state.map.sel.id : '';
        if (id === state.muscle) return;
        state.muscle = id;
        writeUrl(true);
        render();
        placeRail();
    });
    map.root.querySelector('.bm-views')?.addEventListener('click', () => {
        state.pinnedView = true;
        requestAnimationFrame(() => frameFigure());
    });
    window.addEventListener('popstate', () => {
        const prev = `${state.group}|${state.slug}|${state.muscle}`;
        readInitial();
        if (`${state.group}|${state.slug}|${state.muscle}` === prev) return;
        state.pinnedView = false;
        const next = currentMovement();
        paint(next);
        if (!phoneLayout() && next && state.muscle && state.map) {
            state.lock = true;
            state.map.selectMuscle(state.muscle);
            state.lock = false;
        } else if (state.map?.sel) {
            state.lock = true;
            state.map.sel = null;
            state.map._render();
            state.lock = false;
        }
        render();
        placeRail();
    });
    const svg = map.root.querySelector('.bm-svg');
    if (svg && 'ResizeObserver' in window) new ResizeObserver(() => placeRail()).observe(svg);
    window.addEventListener('resize', () => placeRail());
    const phoneQuery = window.matchMedia('(max-width: 700px)');
    phoneQuery.addEventListener('change', () => {
        render();
        placeRail();
    });
    requestAnimationFrame(() => placeRail());
}
