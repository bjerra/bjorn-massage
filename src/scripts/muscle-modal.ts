import { buildCatalog, muscleFacts, type MovementFile, type RomCatalog } from '../data/rom-catalog';
import { hashWithModal, readModalMuscle } from '../data/muscle-modal-url';
import {
    EXERCISE_NOTE,
    EXERCISE_PAGE,
    closeExerciseDialog,
    getExerciseIndex,
    isExerciseDialogOpen,
    latinMuscleName,
    loadExerciseIndex,
    openExerciseDialog,
    renderExerciseChoices
} from './exercise-dialog.js';

type MapApi = {
    selectMuscle: (id: string | null) => void;
    setActiveView: (view: string) => void;
    groupOf: Record<string, string>;
    muscleEls: { front: Record<string, unknown>; back: Record<string, unknown> };
    _applyingHash?: boolean;
};

type TriggerPoint = { n: number; location?: string };
type Zone = { id: string; entries: Array<{ muscleId: string; tp: number }> };

type Strings = {
    locations?: Record<string, string>;
    zones?: Record<string, string>;
    disclaimer?: string;
};

const CAUTION =
    'Ingen undersökning. Kartan säger inte vad just din smärta beror på. Vid svår, ihållande eller oförklarad smärta, kontakta vården.';

let catalog: RomCatalog | null = null;
let ready: Promise<void> | null = null;
let dialog: HTMLDialogElement | null = null;
let figureHost: HTMLElement | null = null;
let figureMap: MapApi | null = null;
let currentId = '';
let pushed = false;
let opener: HTMLElement | null = null;
let scrollY = 0;
let closingFromHistory = false;
let installed = false;
let exercisePaint = 0;

function strings(): Strings {
    return (window as Window & { BODYMAP_STRINGS?: Strings }).BODYMAP_STRINGS || {};
}

function pageMap(): (HTMLElement & { __bodymap?: MapApi }) | null {
    return document.querySelector('[data-bodymap]') as (HTMLElement & { __bodymap?: MapApi }) | null;
}

function el(tag: string, className?: string): HTMLElement {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
}

function loadCatalog(): Promise<void> {
    if (!ready) {
        ready = fetch('/movements/data.json')
            .then((response) => {
                if (!response.ok) throw new Error(String(response.status));
                return response.json() as Promise<MovementFile>;
            })
            .then((data) => {
                catalog = buildCatalog(data);
            })
            .catch(() => {
                catalog = null;
            });
    }
    return ready;
}

function ensureDialog(): HTMLDialogElement {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'mm-dialog';
    dialog.addEventListener('close', () => {
        if (isExerciseDialogOpen()) closeExerciseDialog({ restoreFocus: false });
        const fromHistory = closingFromHistory;
        closingFromHistory = false;
        unlockPage();
        currentId = '';
        if (fromHistory) return;
        if (pushed) {
            pushed = false;
            history.back();
        } else if (readModalMuscle(location.hash)) {
            const next = location.pathname + location.search + hashWithModal(location.hash, null);
            history.replaceState(history.state, '', next);
        }
        const returnTo = opener;
        opener = null;
        if (returnTo && document.contains(returnTo)) returnTo.focus();
    });
    dialog.addEventListener('click', (event) => {
        if (isExerciseDialogOpen()) return;
        if (event.target === dialog) dialog?.close();
    });
    dialog.addEventListener('cancel', (event) => {
        if (isExerciseDialogOpen()) {
            event.preventDefault();
            closeExerciseDialog();
            return;
        }
        event.preventDefault();
        dialog?.close();
    });
    document.body.appendChild(dialog);
    return dialog;
}

function swedishLocation(raw: string | undefined): string {
    if (!raw) return '';
    return strings().locations?.[raw] || '';
}

function zoneName(id: string): string {
    return strings().zones?.[id] || '';
}

function referralFor(muscleId: string, tp: number): string[] {
    const data = (window as Window & { BODYMAP_DATA?: { zones?: Zone[] } }).BODYMAP_DATA;
    const names: string[] = [];
    (data?.zones || []).forEach((zone) => {
        if (zone.entries.some((entry) => entry.muscleId === muscleId && entry.tp === tp)) {
            const name = zoneName(zone.id);
            if (name && !names.includes(name)) names.push(name);
        }
    });
    return names;
}

function triggerPoints(muscleId: string): TriggerPoint[] {
    const data = (window as Window & { BODYMAP_DATA?: { triggerPoints?: Record<string, TriggerPoint[]> } }).BODYMAP_DATA;
    return data?.triggerPoints?.[muscleId] || [];
}

function lockPage() {
    scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
}

function unlockPage() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, scrollY);
}

function ensureFigure(parent: HTMLElement, id: string) {
    if (!figureHost) {
        figureHost = el('div', 'mm-figure');
        figureHost.setAttribute('data-bodymap', '');
        figureHost.setAttribute('data-keep-movement', '');
        figureHost.setAttribute('data-single-view', '');
    }
    parent.appendChild(figureHost);
    const BodyMap = (window as Window & { BodyMap?: { mount: (el: HTMLElement, opts: { mode: string; keepMovement: boolean; singleView: boolean }) => MapApi } }).BodyMap;
    const data = (window as Window & { BODYMAP_DATA?: unknown }).BODYMAP_DATA;
    if (!figureMap && BodyMap && data) {
        figureMap = BodyMap.mount(figureHost, { mode: 'muscles', keepMovement: true, singleView: true });
        figureHost.querySelector('.bm-figs')?.setAttribute('inert', '');
        figureHost.querySelector('.bm-hint')?.remove();
    }
    if (!figureMap) {
        if (!figureHost.querySelector('.mm-muted')) {
            const note = el('p', 'mm-muted');
            note.textContent = 'Figuren kunde inte visas.';
            figureHost.appendChild(note);
        }
        return;
    }
    figureMap._applyingHash = true;
    figureMap.selectMuscle(id);
    figureMap._applyingHash = false;
}

function render(id: string) {
    const box = ensureDialog();
    box.replaceChildren();
    const scroll = el('div', 'mm-scroll');
    box.appendChild(scroll);
    const facts = catalog ? muscleFacts(catalog, id) : null;
    const latin = facts?.latin || id.replace(/_/g, ' ');

    const top = el('div', 'mm-top');
    const titles = el('div');
    const kicker = el('p', 'mm-kicker');
    kicker.textContent = 'Muskel';
    const title = el('h2');
    title.id = 'mm-title';
    title.textContent = latin;
    titles.append(kicker, title);
    if (facts?.common) {
        const common = el('p', 'mm-common');
        common.textContent = facts.common;
        titles.append(common);
    }
    const close = el('button', 'mm-close') as HTMLButtonElement;
    close.type = 'button';
    close.textContent = 'Stäng';
    close.addEventListener('click', () => box.close());
    top.append(titles, close);
    scroll.append(top);
    box.setAttribute('aria-labelledby', 'mm-title');

    if (facts?.description) {
        const section = el('section', 'mm-section');
        const text = el('p');
        text.textContent = facts.description;
        section.append(text);
        scroll.append(section);
    }
    if (facts?.origin || facts?.insertion) {
        const section = el('section', 'mm-section');
        const heading = el('h3');
        heading.textContent = 'Ursprung och fäste';
        section.append(heading);
        if (facts.origin) {
            const line = el('p');
            line.textContent = `Ursprung: ${facts.origin}`;
            section.append(line);
        }
        if (facts.insertion) {
            const line = el('p');
            line.textContent = `Fäste: ${facts.insertion}`;
            section.append(line);
        }
        scroll.append(section);
    }
    if (facts && facts.functions.length) {
        const section = el('section', 'mm-section');
        const heading = el('h3');
        heading.textContent = 'Funktion';
        const list = el('ul', 'mm-list');
        facts.functions.forEach((line) => {
            const item = el('li');
            item.textContent = line;
            list.append(item);
        });
        section.append(heading, list);
        scroll.append(section);
    }

    ensureFigure(scroll, id);
    if (catalog?.musclesById.get(id)?.noSvg) {
        const off = el('p', 'mm-muted');
        off.textContent = 'Visas inte på figuren.';
        scroll.append(off);
    }

    const points = triggerPoints(id).filter((tp) => swedishLocation(tp.location) || referralFor(id, tp.n).length);
    if (points.length) {
        const section = el('section', 'mm-section');
        const heading = el('h3');
        heading.textContent = 'Triggerpunkter';
        const list = el('ul', 'mm-list');
        points.forEach((tp) => {
            const item = el('li');
            const name = el('div', 'mm-tp-name');
            const place = swedishLocation(tp.location);
            name.textContent = place ? `TP${tp.n} ${place}` : `TP${tp.n}`;
            item.append(name);
            const areas = referralFor(id, tp.n);
            if (areas.length) {
                const where = el('div', 'mm-muted');
                where.textContent = `I litteraturen: ${areas.join(' · ')}`;
                item.append(where);
            }
            list.append(item);
        });
        section.append(heading, list);
        scroll.append(section);
    }

    mountExercises(scroll, id);

    const links = el('div', 'mm-links');
    const mapLink = el('a') as HTMLAnchorElement;
    mapLink.href = `/muskelkarta#muscle=${encodeURIComponent(id)}`;
    mapLink.textContent = 'Visa på muskelkartan';
    links.append(mapLink);
    scroll.append(links);

    const caution = el('p', 'mm-caution');
    caution.textContent = strings().disclaimer || CAUTION;
    scroll.append(caution);
    close.focus();
}

function mountExercises(scroll: HTMLElement, id: string) {
    const section = el('section', 'mm-section mm-exercises');
    section.setAttribute('aria-labelledby', 'mm-exercises-title');
    const heading = el('h3');
    heading.id = 'mm-exercises-title';
    heading.textContent = 'Övningar';
    const choices = el('div');
    section.append(heading, choices);
    scroll.append(section);

    const paintId = ++exercisePaint;
    let shown = EXERCISE_PAGE;
    const paint = () => {
        if (paintId !== exercisePaint || currentId !== id || !section.isConnected) return;
        const data = getExerciseIndex();
        const list = data.byMuscle.get(id) || [];
        renderExerciseChoices(choices, list, {
            shown,
            ready: data.ready,
            failed: data.failed,
            note: EXERCISE_NOTE,
            emptyText: 'Inga övningar är kopplade till den här muskeln.',
            onOpen: (exerciseId: string, opener: HTMLElement) => {
                void openExerciseDialog(exerciseId, {
                    opener,
                    muscleName: latinMuscleName,
                    onMuscle: (muscleId: string) => {
                        closeExerciseDialog({ restoreFocus: false });
                        void openMuscleModal(muscleId, { push: true });
                    }
                });
            },
            onMore: () => {
                shown += EXERCISE_PAGE;
                paint();
                const next = choices.querySelector('.ex-more');
                if (next instanceof HTMLElement) next.focus();
            }
        });
    };
    paint();
    if (!dataReady()) void loadExerciseIndex().then(paint);
}

function dataReady() {
    const data = getExerciseIndex();
    return data.ready || data.failed;
}

function selectBehindModal(id: string) {
    if (document.querySelector('[data-rom]')) return;
    const map = pageMap()?.__bodymap;
    if (!map || (map as MapApi & { sel?: { id: string } }).sel?.id === id) return;
    map._applyingHash = true;
    map.selectMuscle(id);
    map._applyingHash = false;
}

export async function openMuscleModal(id: string, options?: { push?: boolean; opener?: HTMLElement }) {
    if (!id) return;
    await loadCatalog();
    const push = options?.push !== false;
    if (options?.opener) opener = options.opener;
    else if (!dialog?.open) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog?.open) lockPage();
    currentId = id;
    render(id);
    const box = ensureDialog();
    if (!box.open) box.showModal();
    if (push && readModalMuscle(location.hash) !== id) {
        const next = location.pathname + location.search + hashWithModal(location.hash, id);
        history.pushState({ muscleModal: id }, '', next);
        pushed = true;
    }
    selectBehindModal(id);
}

function onPop() {
    const id = readModalMuscle(location.hash);
    if (id) {
        pushed = false;
        void openMuscleModal(id, { push: false });
        return;
    }
    if (dialog?.open) {
        closingFromHistory = true;
        dialog.close();
        currentId = '';
    }
}

export function installMuscleModal() {
    if (installed) return;
    installed = true;
    const box = ensureDialog();
    window.addEventListener(
        'keydown',
        (event) => {
            if (event.key !== 'Escape' || event.repeat) return;
            if (!box.open || !isExerciseDialogOpen()) return;
            event.preventDefault();
            event.stopPropagation();
            closeExerciseDialog();
        },
        true
    );
    window.addEventListener('popstate', onPop);
    const start = () => {
        const id = readModalMuscle(location.hash);
        if (id) void openMuscleModal(id, { push: false });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
}
