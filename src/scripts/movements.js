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

// Joint height on the body drawing, in the shared viewBox (y starts at 80).
// front/back are the point the leader line aims at on that view.
const ANCHOR = {
    Mandible: { y: 219, front: [400, 219], back: [1130, 240] },
    Cervical: { y: 286, front: [395, 286], back: [1132, 270] },
    Shoulder: { y: 350, front: [510, 350], back: [1232, 354] },
    Scapula: { y: 368, front: [470, 360], back: [1170, 368] },
    Thoracic: { y: 470, front: [410, 470], back: [1128, 460] },
    Elbow: { y: 512, front: [530, 508], back: [1248, 520] },
    Forearm: { y: 595, front: [570, 592], back: [1285, 603] },
    Lumbar: { y: 640, front: [400, 650], back: [1122, 620] },
    Wrist: { y: 700, front: [560, 690], back: [1275, 700] },
    Hip: { y: 735, front: [450, 730], back: [1175, 710] },
    Knee: { y: 980, front: [455, 970], back: [1185, 990] },
    Ankle: { y: 1235, front: [455, 1225], back: [1165, 1245] },
    Foot: { y: 1325, front: [445, 1320], back: [1150, 1330] }
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const STACK_MQ = '(max-width: 1100px)';

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
        document.querySelectorAll('.bm-fig').forEach((fig) => fig.classList.remove('mv-view-on'));
        if (status) status.textContent = '';
        writeMovementHash();
        scheduleLayout();
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
    const where = viewSentence(map, parts);
    if (status) {
        status.textContent =
            title +
            '. ' +
            countLabel(parts.listPrime.length, 'primär', 'primära') +
            ', ' +
            countLabel(parts.listSyn.length, 'synergist', 'synergister') +
            '. ' +
            where;
    }
    writeMovementHash();
    scheduleLayout();
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
    syncRail();
    refresh();
    requestAnimationFrame(() => revealPrimary());
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
    syncRail();
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

function jointOrder() {
    return Object.keys(state.data.labels.joints).sort((a, b) => {
        const ay = ANCHOR[a] ? ANCHOR[a].y : 9999;
        const by = ANCHOR[b] ? ANCHOR[b].y : 9999;
        return ay - by || a.localeCompare(b);
    });
}

function syncClear() {
    const clear = document.getElementById('mv-clear');
    if (!clear || clear.closest('#mv-form')) return;
    clear.disabled = !(state.joint && state.movement);
}

function setOpenJoint(id) {
    document.querySelectorAll('.mv-joint').forEach((item) => {
        const jid = item.getAttribute('data-joint');
        const btn = item.querySelector('.mv-joint-btn');
        const panel = item.querySelector('.mv-moves');
        const on = !!id && jid === id;
        if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (panel) panel.hidden = !on;
        item.classList.toggle('is-open', on);
    });
    scheduleLayout();
}

function syncRail() {
    if (!document.getElementById('mv-rail')) {
        syncClear();
        return;
    }
    document.querySelectorAll('.mv-joint').forEach((item) => {
        const jid = item.getAttribute('data-joint');
        item.classList.toggle('is-current', jid === state.joint);
        item.querySelectorAll('.mv-move').forEach((btn) => {
            const on = jid === state.joint && btn.getAttribute('data-movement') === state.movement;
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    });
    setOpenJoint(state.joint || '');
    syncClear();
}

function onJointKey(event) {
    const buttons = [...document.querySelectorAll('.mv-joint-btn')];
    const index = buttons.indexOf(event.currentTarget);
    if (index < 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const dir = event.key === 'ArrowDown' ? 1 : -1;
        buttons[(index + dir + buttons.length) % buttons.length].focus();
    } else if (event.key === 'Home') {
        event.preventDefault();
        buttons[0].focus();
    } else if (event.key === 'End') {
        event.preventDefault();
        buttons[buttons.length - 1].focus();
    } else if (event.key === 'Escape' && event.currentTarget.getAttribute('aria-expanded') === 'true') {
        event.preventDefault();
        setOpenJoint('');
        event.currentTarget.focus();
    }
}

function buildRail() {
    const rail = document.getElementById('mv-rail');
    if (!rail) return;
    rail.replaceChildren();
    rail.setAttribute('aria-labelledby', 'mv-title');
    const list = el('div', { class: 'mv-joints' }, rail);
    jointOrder().forEach((id) => {
        const label = state.data.labels.joints[id].sv;
        const item = el('div', { class: 'mv-joint', 'data-joint': id }, list);
        const btn = el('button', {
            type: 'button',
            class: 'mv-joint-btn',
            id: 'mv-joint-' + id,
            'aria-expanded': 'false',
            'aria-controls': 'mv-moves-' + id,
            text: label
        }, item);
        const panel = el('div', {
            class: 'mv-moves',
            id: 'mv-moves-' + id,
            role: 'group',
            'aria-labelledby': 'mv-joint-' + id
        }, item);
        panel.hidden = true;
        Object.keys(state.data.movements[id] || {}).forEach((movement) => {
            const option = el('button', {
                type: 'button',
                class: 'mv-move',
                'data-movement': movement,
                'aria-pressed': 'false',
                text: movementName(id, movement)
            }, panel);
            option.addEventListener('click', () => choose(id, movement));
        });
        btn.addEventListener('click', () => {
            const open = btn.getAttribute('aria-expanded') === 'true';
            setOpenJoint(open ? '' : id);
        });
        btn.addEventListener('keydown', onJointKey);
    });
}

function placeRail(map) {
    const rail = document.getElementById('mv-rail');
    const main = map.root.querySelector('.bm-main');
    if (!rail || !main) return;
    map.root.classList.add('mv-host');
    if (rail.parentElement !== main) main.insertBefore(rail, map.panel);
    rail.hidden = false;
    if (!main.querySelector('.mv-leaders')) {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 'mv-leaders');
        svg.setAttribute('aria-hidden', 'true');
        main.insertBefore(svg, main.firstChild);
    }
    if (!map.__mvLayout) {
        map.__mvLayout = true;
        const observer = new ResizeObserver(() => layoutRail());
        observer.observe(map.figs);
        window.addEventListener('resize', () => layoutRail());
    }
}

function primaryFigure(map) {
    return map.root.querySelector('.bm-fig');
}

function scheduleLayout() {
    requestAnimationFrame(() => layoutRail());
}

function placeForViewport(map, rail) {
    const main = map.root.querySelector('.bm-main');
    const mobile = window.matchMedia(STACK_MQ).matches;
    if (!main) return mobile;
    if (mobile) {
        const fig = primaryFigure(map);
        if (fig && rail.previousElementSibling !== fig) fig.after(rail);
    } else if (rail.parentElement !== main || rail.nextElementSibling !== map.panel) {
        main.insertBefore(rail, map.panel);
    }
    return mobile;
}

function layoutRail() {
    const rail = document.getElementById('mv-rail');
    const map = getMap();
    if (!rail || !map || !map.root.classList.contains('mv-host')) return;
    const leaders = map.root.querySelector('.mv-leaders');
    const mobile = placeForViewport(map, rail);
    if (mobile) {
        rail.style.height = '';
        rail.querySelectorAll('.mv-joint').forEach((item) => {
            item.style.position = '';
            item.style.top = '';
            item.style.left = '';
            item.style.right = '';
        });
        if (leaders) leaders.replaceChildren();
        rail.querySelectorAll('.mv-moves').forEach((panel) => {
            panel.style.maxHeight = '';
        });
        return;
    }
    const fig = primaryFigure(map);
    const svg = fig && fig.querySelector('svg');
    if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    const vb = svg.viewBox.baseVal;
    const svgRect = svg.getBoundingClientRect();
    if (svgRect.height < 40) return;
    rail.style.height = Math.round(svgRect.height) + 'px';
    const placedSvg = svg.getBoundingClientRect();
    const railRect = rail.getBoundingClientRect();
    const scale = placedSvg.height / vb.height;
    const offset = placedSvg.top - railRect.top;
    const view = fig.classList.contains('bm-fig-back') ? 'back' : 'front';
    const items = [...rail.querySelectorAll('.mv-joint')];
    const gap = 4;
    let cursor = 0;
    const railHeight = placedSvg.height;
    items.forEach((item) => {
        const id = item.getAttribute('data-joint');
        const anchor = ANCHOR[id];
        const y = anchor ? anchor.y : vb.y + vb.height / 2;
        const header = item.querySelector('.mv-joint-btn');
        const headerH = header ? header.offsetHeight : 44;
        const ideal = offset + (y - vb.y) * scale - headerH / 2;
        const top = Math.max(0, Math.max(ideal, cursor));
        item.style.position = 'absolute';
        item.style.left = '0';
        item.style.right = '0';
        item.style.top = Math.round(top) + 'px';
        cursor = top + headerH + gap;
    });
    const used = Math.max(railHeight, cursor);
    rail.style.height = Math.round(used) + 'px';
    items.forEach((item) => placeMoves(item, parseFloat(item.style.top) || 0, used));
    drawLeaders(map, svg, view, leaders);
}

function placeMoves(item, top, railHeight) {
    const panel = item.querySelector('.mv-moves');
    if (!panel) return;
    panel.style.maxHeight = '';
    if (panel.hidden) return;
    const space = railHeight - top - 8;
    if (panel.scrollHeight > space) panel.style.maxHeight = Math.max(160, space) + 'px';
}

function drawLeaders(map, svg, view, leaders) {
    if (!leaders) return;
    const main = map.root.querySelector('.bm-main');
    const ctm = svg.getScreenCTM();
    leaders.replaceChildren();
    if (!main || !ctm) return;
    const mainRect = main.getBoundingClientRect();
    const width = Math.max(1, mainRect.width);
    const height = Math.max(1, mainRect.height);
    leaders.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    leaders.setAttribute('width', String(width));
    leaders.setAttribute('height', String(height));
    railJoints().forEach((item) => {
        const id = item.getAttribute('data-joint');
        const anchor = ANCHOR[id];
        const point = anchor && (anchor[view] || [anchor.front[0], anchor.y]);
        const header = item.querySelector('.mv-joint-btn');
        if (!point || !header) return;
        const pt = svg.createSVGPoint();
        pt.x = point[0];
        pt.y = point[1];
        const screen = pt.matrixTransform(ctm);
        const box = header.getBoundingClientRect();
        const x1 = screen.x - mainRect.left;
        const y1 = screen.y - mainRect.top;
        const x2 = box.left - mainRect.left;
        const y2 = box.top + box.height / 2 - mainRect.top;
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', String(x1));
        line.setAttribute('y1', String(y1));
        line.setAttribute('x2', String(x2));
        line.setAttribute('y2', String(y2));
        line.setAttribute('class', 'mv-leader');
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', String(x1));
        dot.setAttribute('cy', String(y1));
        dot.setAttribute('r', '3');
        dot.setAttribute('class', 'mv-leader-dot');
        leaders.append(line, dot);
    });
}

function railJoints() {
    return [...document.querySelectorAll('#mv-rail .mv-joint')];
}

function viewSentence(map, parts) {
    const scores = { front: 0, back: 0 };
    function add(ids, weight) {
        ids.forEach((id) => {
            const group = map.groupOf[id] || id;
            if (map.muscleEls.front[group]) scores.front += weight;
            if (map.muscleEls.back[group]) scores.back += weight;
        });
    }
    add(parts.primePaint, 2);
    add(parts.synPaint, 1);
    document.querySelectorAll('.bm-fig').forEach((fig) => fig.classList.remove('mv-view-on'));
    if (scores.front + scores.back === 0) return '';
    if (scores.back > scores.front) {
        const fig = document.querySelector('.bm-fig-back');
        if (fig) fig.classList.add('mv-view-on');
        return 'Musklerna är markerade på baksidan.';
    }
    if (scores.front > scores.back) {
        const fig = document.querySelector('.bm-fig-front');
        if (fig) fig.classList.add('mv-view-on');
        return 'Musklerna är markerade på framsidan.';
    }
    document.querySelectorAll('.bm-fig').forEach((fig) => fig.classList.add('mv-view-on'));
    return 'Musklerna är markerade på fram- och baksidan.';
}

function revealPrimary() {
    if (!window.matchMedia(STACK_MQ).matches) return;
    const fig = document.querySelector('.bm-fig.mv-view-on') || document.querySelector('.bm-fig');
    if (!fig) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fig.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
}

async function start() {
    const rail = document.getElementById('mv-rail');
    const form = document.getElementById('mv-form');
    if (!rail && !form) return;
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
    if (rail) {
        buildRail();
        const clear = document.getElementById('mv-clear');
        if (clear) clear.addEventListener('click', () => clearSelection());
    } else {
        fillJoints();
        fillMovements();
        wire();
    }
    const map = await mapPromise;
    if (!map) {
        if (rail) rail.hidden = false;
        return;
    }
    applyNames(map);
    hook(map);
    if (rail) placeRail(map);
    const fromHash = movementFromHash();
    if (fromHash) choose(fromHash.joint, fromHash.movement);
    else {
        syncForm(map);
        syncClear();
        scheduleLayout();
    }
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
