/**
 * On /muskelkarta, a selected muscle or zone lists its exercises in the panel.
 * Choosing one opens the same exercise popup as /ovningar.
 */
import {
    EXERCISE_NOTE,
    EXERCISE_PAGE,
    closeExerciseDialog,
    exercisesForMuscles,
    getExerciseIndex,
    latinMuscleName,
    loadExerciseIndex,
    openExerciseDialog,
    renderExerciseChoices
} from './exercise-dialog.js';

let shownFor = '';
let shown = EXERCISE_PAGE;

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

function zoneMuscleIds(map, zoneId) {
    const zone = map.zoneById && map.zoneById[zoneId];
    if (!zone) return [];
    const ids = [];
    zone.entries.forEach((entry) => {
        if (ids.indexOf(entry.muscleId) === -1) ids.push(entry.muscleId);
    });
    return ids;
}

function paint(map) {
    const body = map.panel && map.panel.querySelector('.bm-panel-body');
    if (!body) return;
    body.querySelectorAll('.ex-inline, .ex-map-link').forEach((node) => node.remove());
    if (!map.sel || !map.sel.id || (map.sel.type !== 'muscle' && map.sel.type !== 'zone')) return;

    const zone = map.sel.type === 'zone';
    const key = map.sel.type + ':' + map.sel.id;
    if (shownFor !== key) {
        shownFor = key;
        shown = EXERCISE_PAGE;
    }
    const ids = zone ? zoneMuscleIds(map, map.sel.id) : [map.sel.id];
    const data = getExerciseIndex();
    const exercises = data.ready ? exercisesForMuscles(ids) : [];
    const section = el('section', { class: 'ex-inline', 'aria-labelledby': 'ex-map-title' });
    el('h4', { class: 'bm-h', id: 'ex-map-title', text: 'Övningar' }, section);
    const choices = el('div', null, section);
    renderExerciseChoices(choices, exercises, {
        shown,
        ready: data.ready,
        failed: data.failed,
        note: EXERCISE_NOTE,
        emptyText: zone
            ? 'Inga övningar är kopplade till musklerna för det här området.'
            : 'Inga övningar är kopplade till den här muskeln.',
        onOpen: (id, opener) => {
            void openExerciseDialog(id, {
                opener,
                muscleName: (muscleId) => (map.muscleName ? map.muscleName(muscleId) : latinMuscleName(muscleId)),
                onMuscle: (muscleId) => {
                    closeExerciseDialog({ restoreFocus: false });
                    if (map.selectMuscle) map.selectMuscle(muscleId);
                }
            });
        },
        onMore: () => {
            shown += EXERCISE_PAGE;
            paint(map);
            const next = map.panel && map.panel.querySelector('.ex-inline .ex-more');
            if (next) next.focus();
        }
    });
    const caution = body.querySelector('.bm-caution');
    if (caution) caution.insertAdjacentElement('afterend', section);
    else body.appendChild(section);
}

function hook(map) {
    if (!map || map.__exerciseLink) return;
    map.__exerciseLink = true;
    const previous = map._renderPanel.bind(map);
    map._renderPanel = function () {
        previous();
        paint(map);
    };
    paint(map);
}

function start() {
    const root = document.querySelector('[data-bodymap]');
    if (!root) return;
    const found = () => {
        if (!root.__bodymap) return false;
        hook(root.__bodymap);
        return true;
    };
    void loadExerciseIndex().then(() => {
        if (root.__bodymap) paint(root.__bodymap);
    });
    if (found()) return;
    const timer = setInterval(() => {
        if (found()) clearInterval(timer);
    }, 40);
    setTimeout(() => clearInterval(timer), 3000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
