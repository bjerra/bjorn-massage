const WRIST = {
    flexor_carpi_radialis: 'forearm_flexors',
    flexor_carpi_ulnaris: 'forearm_flexors',
    extensor_carpi_radialis_longus: 'forearm_extensors',
    extensor_carpi_ulnaris: 'forearm_extensors'
};

const JOINT_EXTRA = {
    Cervical: ['nacke', 'nack', 'hals', 'halsrygg', 'cervical', 'cervicalspine'],
    Thoracic: ['brost', 'brostrygg', 'thoracic', 'thoracicspine'],
    Lumbar: ['land', 'landrygg', 'lumbar', 'lumbarspine'],
    Scapula: ['skulderblad', 'scapula'],
    Shoulder: ['axel', 'axelled', 'shoulder'],
    Elbow: ['armbage', 'armbagsled', 'elbow'],
    Forearm: ['underarm', 'forearm', 'radioulnar'],
    Wrist: ['handled', 'wrist'],
    Hip: ['hoft', 'hoftled', 'hip'],
    Knee: ['kna', 'knaled', 'knee'],
    Ankle: ['fotled', 'ankle'],
    Foot: ['fot', 'foot'],
    Mandible: ['kake', 'kakled', 'jaw', 'tmj', 'mandible']
};

const MOVE_EXTRA = {
    IpsilateralRotation: ['rotation'],
    ContralateralRotation: ['rotation'],
    ExternalRotation: ['rotation', 'utatrotation'],
    InternalRotation: ['rotation', 'inatrotation'],
    UpwardRotation: ['rotation'],
    DownwardRotation: ['rotation']
};

const SIDE =
    'Sidorna gäller muskeln, inte en vald kroppshalva. Rotation av huvudet åt vänster använder vänstersidans muskler för ”åt samma sida” och högersidans muskler för ”åt motsatt sida”. Kartan ritar vänster och höger som en spegling av samma form, så markeringen gäller hela muskeln.';

const state = {
    data: null,
    byId: new Map(),
    items: [],
    joint: '',
    movement: '',
    active: -1,
    hits: []
};

function norm(value) {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function unique(list) {
    const seen = new Set();
    const out = [];
    list.forEach((item) => {
        if (!item || seen.has(item)) return;
        seen.add(item);
        out.push(item);
    });
    return out;
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

function getMap() {
    const node = document.querySelector('[data-bodymap]');
    return node && node.__bodymap;
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
        setTimeout(() => {
            clearInterval(timer);
            resolve(getMap());
        }, 3000);
    });
}

function movementName(joint, id) {
    const over = state.data.labels.jointMovementOverridesSv[joint + '.' + id];
    if (over) return over;
    const label = state.data.labels.movements[id];
    return label ? label.sv : id;
}

function movementTitle(joint, id) {
    const over = state.data.labels.jointMovementOverridesSv[joint + '.' + id];
    const jointSv = state.data.labels.joints[joint].sv;
    if (over) return jointSv + ': ' + over;
    return state.data.movements[joint][id].labelSv;
}

function isLateral(id) {
    return id.indexOf('Ipsilateral') !== -1 || id.indexOf('Contralateral') !== -1;
}

function partition(prime, syn) {
    const hide = new Set();
    prime.concat(syn).forEach((id) => {
        if (WRIST[id]) hide.add(WRIST[id]);
    });
    const paint = new Map();
    function add(ids, rank) {
        ids.forEach((id) => {
            const target = WRIST[id] || id;
            if ((paint.get(target) || 0) < rank) paint.set(target, rank);
        });
    }
    add(prime, 2);
    add(syn, 1);
    const primePaint = [];
    const synPaint = [];
    paint.forEach((rank, id) => {
        if (rank === 2) primePaint.push(id);
        else synPaint.push(id);
    });
    return {
        listPrime: prime.filter((id) => !hide.has(id)),
        listSyn: syn.filter((id) => !hide.has(id)),
        primePaint,
        synPaint
    };
}

function buildIndex() {
    const items = [];
    Object.keys(state.data.movements).forEach((joint) => {
        const jointLabel = state.data.labels.joints[joint];
        const jointAliases = unique(
            [norm(jointLabel.sv), norm(jointLabel.en)].concat(JOINT_EXTRA[joint] || []).map(norm)
        );
        Object.keys(state.data.movements[joint]).forEach((movement) => {
            const entry = state.data.movements[joint][movement];
            const moveLabel = state.data.labels.movements[movement] || { sv: movement, en: movement };
            const over = state.data.labels.jointMovementOverridesSv[joint + '.' + movement] || '';
            const moveAliases = unique(
                [norm(moveLabel.sv), norm(moveLabel.en), norm(over)].concat(MOVE_EXTRA[movement] || []).map(norm)
            );
            const keys = unique(
                [
                    norm(entry.labelSv),
                    norm(entry.labelEn),
                    norm(jointLabel.sv + ' ' + (over || moveLabel.sv)),
                    norm(jointLabel.en + ' ' + moveLabel.en)
                ].map(norm)
            );
            items.push({
                joint,
                movement,
                title: movementTitle(joint, movement),
                jointAliases,
                moveAliases,
                keys
            });
        });
    });
    state.items = items;
}

function scoreItem(query, item) {
    if (query.length < 3) return 0;
    if (item.keys.some((key) => key === query)) return 100;
    let best = 0;
    item.jointAliases.forEach((jointAlias) => {
        item.moveAliases.forEach((moveAlias) => {
            if (!jointAlias || !moveAlias) return;
            const both = jointAlias + moveAlias;
            if (both.length < 6) return;
            if (query === both) best = Math.max(best, 96);
            else if (query.includes(both) || both.includes(query)) best = Math.max(best, 88);
        });
    });
    if (item.keys.some((key) => key.includes(query))) best = Math.max(best, 70);
    return best;
}

function applyNames(map) {
    window.BODYMAP_NO_SVG = window.BODYMAP_NO_SVG || {};
    const strings = window.BODYMAP_STRINGS || {};
    strings.muscleFind = strings.muscleFind || {};
    state.data.muscles.forEach((muscle) => {
        const latin = muscle.latinName || muscle.nameSv;
        if (latin) map.t.muscles[muscle.id] = latin;
        if (muscle.noSvg) window.BODYMAP_NO_SVG[muscle.id] = true;
        if (muscle.commonNameSv) {
            const current = strings.muscleFind[muscle.id] || '';
            if (current.indexOf(muscle.commonNameSv) === -1) {
                strings.muscleFind[muscle.id] = (current + ' ' + muscle.commonNameSv).trim();
            }
        }
    });
    map.allMuscles.sort((a, b) => map.muscleName(a).localeCompare(map.muscleName(b), 'sv'));
    window.dispatchEvent(new Event('bodymap-strings'));
}

function fillJoints() {
    const joint = document.getElementById('mv-joint');
    if (!joint) return;
    const current = joint.value;
    joint.replaceChildren();
    el('option', { value: '', text: 'Välj led' }, joint);
    Object.keys(state.data.labels.joints).forEach((id) => {
        el('option', { value: id, text: state.data.labels.joints[id].sv }, joint);
    });
    joint.value = current;
}

function fillMovements() {
    const movement = document.getElementById('mv-movement');
    if (!movement) return;
    const joint = state.joint;
    movement.replaceChildren();
    el('option', { value: '', text: 'Välj rörelse' }, movement);
    if (joint && state.data.movements[joint]) {
        Object.keys(state.data.movements[joint]).forEach((id) => {
            el('option', { value: id, text: movementName(joint, id) }, movement);
        });
    }
    movement.disabled = !joint;
    movement.value = state.movement && movement.querySelector('option[value="' + state.movement + '"]') ? state.movement : '';
    if (movement.value !== state.movement) state.movement = movement.value;
}

function syncForm(map) {
    document.querySelectorAll('[data-mv-toggle="mode"]').forEach((node) => {
        node.hidden = !map || map.mode !== 'movements';
    });
}

function writeMovementHash() {
    if (!state.joint || !state.movement) {
        if (/^#movement=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
        return;
    }
    const next = '#movement=' + state.joint + '.' + state.movement;
    if (location.hash !== next) history.replaceState(null, '', next);
}

function countLabel(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
}

function muscleButton(id) {
    const muscle = state.byId.get(id);
    const name = (muscle && (muscle.latinName || muscle.nameSv)) || id.replace(/_/g, ' ');
    const button = el('button', { type: 'button', class: 'bm-item' });
    el('span', { class: 'bm-item-name', text: name }, button);
    if (muscle && muscle.noSvg) el('span', { class: 'mv-offmap', text: 'Visas ej på kartan.' }, button);
    button.addEventListener('click', () => {
        const map = getMap();
        if (map) map.selectMuscle(id);
    });
    return button;
}

function renderRole(body, heading, ids) {
    el('h4', { class: 'bm-h', text: heading }, body);
    if (!ids.length) {
        el('p', { class: 'bm-muted', text: 'Inga i underlaget.' }, body);
        return;
    }
    const ul = el('ul', { class: 'bm-list' }, body);
    ids.forEach((id) => {
        const li = el('li', null, ul);
        li.appendChild(muscleButton(id));
    });
}

function paintMovement(map) {
    syncForm(map);
    if (!map || map.mode !== 'movements' || map.sel) return;
    const status = document.getElementById('mv-status');
    if (!state.joint || !state.movement || !state.data.movements[state.joint]) {
        map.setMovementHighlight(null);
        if (status) status.textContent = '';
        writeMovementHash();
        return;
    }
    const entry = state.data.movements[state.joint][state.movement];
    if (!entry) return;
    const parts = partition(entry.primeMovers || [], entry.synergists || []);
    map.setMovementHighlight({ prime: parts.primePaint, synergist: parts.synPaint });
    const body = map.panel.querySelector('.bm-panel-body');
    if (!body) return;
    body.replaceChildren();
    map.panel.classList.add('bm-panel-active');
    const title = movementTitle(state.joint, state.movement);
    const head = el('div', { class: 'bm-panel-head' }, body);
    const titles = el('div', null, head);
    el('div', { class: 'bm-kicker', text: 'Rörelse' }, titles);
    el('h3', { class: 'bm-panel-title', id: 'mv-result-title', text: title }, titles);
    el('p', {
        class: 'mv-note',
        text: 'Muskler som vanligtvis arbetar i rörelsen. Listan är ingen undersökning.'
    }, body);
    const key = el('p', { class: 'mv-key' }, body);
    const primeKey = el('span', null, key);
    el('i', { class: 'mv-swatch mv-swatch-prime', 'aria-hidden': 'true' }, primeKey);
    primeKey.appendChild(document.createTextNode('Primära'));
    const synKey = el('span', null, key);
    el('i', { class: 'mv-swatch mv-swatch-syn', 'aria-hidden': 'true' }, synKey);
    synKey.appendChild(document.createTextNode('Synergister'));
    if (isLateral(state.movement)) el('p', { class: 'mv-side', text: SIDE }, body);
    renderRole(body, 'Primära', parts.listPrime);
    renderRole(body, 'Synergister', parts.listSyn);
    if (status) {
        status.textContent =
            title +
            '. ' +
            countLabel(parts.listPrime.length, 'primär', 'primära') +
            ', ' +
            countLabel(parts.listSyn.length, 'synergist', 'synergister') +
            '.';
    }
    writeMovementHash();
}

function hook(map) {
    if (!map || map.__movementHook) return;
    map.__movementHook = true;
    const prev = map._renderPanel.bind(map);
    map._renderPanel = function () {
        prev();
        paintMovement(map);
    };
}

function refresh() {
    const map = getMap();
    if (!map) return;
    if (state.joint && state.movement && map.mode !== 'movements') {
        map.setMode('movements');
        return;
    }
    map._render();
}

function choose(joint, movement) {
    state.joint = joint;
    state.movement = movement;
    const jointEl = document.getElementById('mv-joint');
    if (jointEl) jointEl.value = joint;
    fillMovements();
    const movementEl = document.getElementById('mv-movement');
    if (movementEl && movement) movementEl.value = movement;
    hideSuggest();
    const input = document.getElementById('mv-q');
    if (input) {
        input.value = '';
        input.setAttribute('aria-expanded', 'false');
    }
    refresh();
}

function clearSelection() {
    state.joint = '';
    state.movement = '';
    const jointEl = document.getElementById('mv-joint');
    if (jointEl) jointEl.value = '';
    fillMovements();
    hideSuggest();
    const input = document.getElementById('mv-q');
    if (input) input.value = '';
    refresh();
}

function hideSuggest() {
    const list = document.getElementById('mv-suggest');
    const input = document.getElementById('mv-q');
    state.active = -1;
    state.hits = [];
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
    const input = document.getElementById('mv-q');
    const list = document.getElementById('mv-suggest');
    if (!input || !list) return;
    const query = norm(input.value);
    if (query.length < 3) {
        hideSuggest();
        return;
    }
    const hits = state.items
        .map((item) => ({ item, score: scoreItem(query, item) }))
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'sv'))
        .slice(0, 8)
        .map((row) => row.item);
    state.hits = hits;
    state.active = hits.length ? 0 : -1;
    list.replaceChildren();
    if (!hits.length) {
        list.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        return;
    }
    hits.forEach((item, index) => {
        const li = el('li', { role: 'presentation' }, list);
        const button = el('button', {
            type: 'button',
            role: 'option',
            id: 'mv-opt-' + index,
            text: item.title
        }, li);
        button.setAttribute('aria-selected', index === state.active ? 'true' : 'false');
        button.addEventListener('click', () => choose(item.joint, item.movement));
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    markActive();
}

function markActive() {
    const input = document.getElementById('mv-q');
    const buttons = document.querySelectorAll('#mv-suggest [role="option"]');
    buttons.forEach((button, index) => {
        const on = index === state.active;
        button.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on && input) input.setAttribute('aria-activedescendant', button.id);
    });
}

function moveActive(dir) {
    if (!state.hits.length) return;
    const next = state.active + dir;
    if (next < 0) state.active = state.hits.length - 1;
    else if (next >= state.hits.length) state.active = 0;
    else state.active = next;
    markActive();
}

function movementFromHash() {
    if (!state.data) return null;
    const params = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    if (params.get('muscle') || params.get('zone')) return null;
    const raw = params.get('movement');
    if (!raw) return null;
    const dot = raw.indexOf('.');
    if (dot < 1) return null;
    const joint = raw.slice(0, dot);
    const movement = raw.slice(dot + 1);
    if (!state.data.movements[joint] || !state.data.movements[joint][movement]) return null;
    return { joint, movement };
}

function wire() {
    const form = document.getElementById('mv-form');
    const input = document.getElementById('mv-q');
    const joint = document.getElementById('mv-joint');
    const movement = document.getElementById('mv-movement');
    const clear = document.getElementById('mv-clear');
    const suggest = document.getElementById('mv-suggest');
    if (!form || !input || !joint || !movement) return;
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (state.hits.length) {
            const item = state.hits[state.active >= 0 ? state.active : 0];
            choose(item.joint, item.movement);
        }
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
        } else if (event.key === 'Escape') {
            hideSuggest();
        } else if (event.key === 'Enter' && state.hits.length) {
            event.preventDefault();
            const item = state.hits[state.active >= 0 ? state.active : 0];
            choose(item.joint, item.movement);
        }
    });
    if (suggest) suggest.addEventListener('mousedown', (event) => event.preventDefault());
    joint.addEventListener('change', () => {
        state.joint = joint.value;
        const previous = state.movement;
        state.movement = '';
        fillMovements();
        if (previous && state.data.movements[state.joint] && state.data.movements[state.joint][previous]) {
            state.movement = previous;
            movement.value = previous;
        }
        refresh();
    });
    movement.addEventListener('change', () => {
        state.movement = movement.value;
        refresh();
    });
    if (clear) clear.addEventListener('click', () => clearSelection());
}

async function start() {
    if (!document.getElementById('mv-form')) return;
    const mapPromise = waitForMap();
    let data;
    try {
        const response = await fetch('/movements/data.json');
        if (!response.ok) throw new Error(String(response.status));
        data = await response.json();
    } catch {
        const status = document.getElementById('mv-status');
        if (status) status.textContent = 'Rörelserna kunde inte laddas.';
        return;
    }
    state.data = data;
    state.byId = new Map(data.muscles.map((muscle) => [muscle.id, muscle]));
    buildIndex();
    fillJoints();
    fillMovements();
    wire();
    const map = await mapPromise;
    if (!map) return;
    applyNames(map);
    hook(map);
    const fromHash = movementFromHash();
    if (fromHash) choose(fromHash.joint, fromHash.movement);
    else syncForm(map);
    window.addEventListener('hashchange', () => {
        const next = movementFromHash();
        const live = getMap();
        if (!next || !live) return;
        if (state.joint === next.joint && state.movement === next.movement && live.mode === 'movements' && !live.sel) return;
        choose(next.joint, next.movement);
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
