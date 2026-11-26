import { buildCatalog, muscleFacts, type MovementFile, type RomCatalog } from '../data/rom-catalog';

type Sel = { type: string; id: string };

type MapApi = {
    sel: Sel | null;
    clear: (opts?: { scroll?: boolean; history?: boolean }) => void;
    selectMuscle: (id: string | null) => void;
    groupMembers: Record<string, string[]>;
    groupOf: Record<string, string>;
    muscleName: (id: string) => string;
    muscleEls: { front: Record<string, unknown>; back: Record<string, unknown> };
    t: { disclaimer?: string; clear?: string; clearAria?: string; sharedHeading?: string };
};

type MapRoot = HTMLElement & { __bodymap?: MapApi };

let catalog: RomCatalog | null = null;

function el(tag: string, className?: string, text?: string) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

function mapRoot(): MapRoot | null {
    return document.querySelector('.muscle-page [data-bodymap]');
}

function syncQuery(id: string) {
    const params = new URLSearchParams(location.search);
    if (id) params.set('muskel', id);
    else params.delete('muskel');
    const query = params.toString();
    const next = location.pathname + (query ? '?' + query : '') + location.hash;
    const current = location.pathname + location.search + location.hash;
    if (next !== current) history.replaceState(history.state, '', next);
}

function paint(map: MapApi) {
    const id = map.sel?.type === 'muscle' ? map.sel.id : '';
    syncQuery(id);
    const body = document.querySelector('.muscle-page .bm-panel-body');
    if (!(body instanceof HTMLElement) || !id || !catalog) return;

    const facts = muscleFacts(catalog, id);
    const muscle = catalog.musclesById.get(id);
    body.replaceChildren();

    const head = el('div', 'bm-panel-head');
    const titles = el('div');
    titles.append(el('div', 'bm-kicker', 'Muskel'));
    titles.append(el('h3', 'bm-panel-title', facts.latin));
    if (facts.common) titles.append(el('p', 'bm-common', facts.common));
    const clear = el('button', 'bm-clear', map.t.clear || 'Rensa') as HTMLButtonElement;
    clear.type = 'button';
    clear.setAttribute('aria-label', map.t.clearAria || 'Rensa val');
    clear.addEventListener('click', () => map.clear({ scroll: true }));
    head.append(titles, clear);
    body.append(head);

    const primary = map.groupOf[id] || id;
    const members = map.groupMembers[primary] || [id];
    if (members.length > 1) {
        const shared = el('div', 'bm-shared');
        shared.append(el('span', 'bm-shared-label', `${map.t.sharedHeading || 'Delar den här platsen på kartan med'}:`));
        members.forEach((member) => {
            const chip = el(
                'button',
                'bm-chip' + (member === id ? ' bm-chip-on' : ''),
                map.muscleName(member)
            ) as HTMLButtonElement;
            chip.type = 'button';
            chip.setAttribute('aria-pressed', member === id ? 'true' : 'false');
            chip.addEventListener('click', () => map.selectMuscle(member));
            shared.append(chip);
        });
        body.append(shared);
    }

    if (muscle?.regionSv) body.append(el('p', 'mf-region', `Område: ${muscle.regionSv}.`));

    if (facts.origin || facts.insertion) {
        const section = el('section', 'mf-section');
        section.append(el('h4', 'mf-h', 'Ursprung och fäste'));
        if (facts.origin) section.append(el('p', 'mf-line', `Ursprung: ${facts.origin}`));
        if (facts.insertion) section.append(el('p', 'mf-line', `Fäste: ${facts.insertion}`));
        body.append(section);
    }

    if (facts.functions.length) {
        const section = el('section', 'mf-section');
        section.append(el('h4', 'mf-h', 'Funktion'));
        const list = el('ul', 'mf-list');
        facts.functions.forEach((line) => list.append(el('li', undefined, line)));
        section.append(list);
        body.append(section);
    }

    const drawn =
        map.muscleEls.front[primary] ||
        map.muscleEls.back[primary] ||
        map.muscleEls.front[id] ||
        map.muscleEls.back[id];
    if (!drawn) body.append(el('p', 'bm-muted', 'Visas inte på figuren.'));

    if (map.t.disclaimer) body.append(el('p', 'bm-caution', map.t.disclaimer));
    body.closest('.bm-panel')?.classList.add('bm-panel-active');
}

export function startMusclePage() {
    const root = mapRoot();
    if (!root) return;
    const onChange = () => {
        if (root.__bodymap) paint(root.__bodymap);
    };
    root.addEventListener('bodymap-change', onChange);
    fetch('/movements/data.json')
        .then((response) => {
            if (!response.ok) throw new Error(String(response.status));
            return response.json() as Promise<MovementFile>;
        })
        .then((data) => {
            catalog = buildCatalog(data);
            onChange();
        })
        .catch(() => {
            catalog = null;
        });
}
