/**
 * On /muskelkarta, a selected muscle links to its exercises.
 * The exercise list itself lives on /ovningar.
 */

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

function paint(map) {
    const body = map.panel && map.panel.querySelector('.bm-panel-body');
    if (!body) return;
    body.querySelectorAll('.ex-map-link').forEach((node) => node.remove());
    if (!map.sel || map.sel.type !== 'muscle' || !map.sel.id) return;
    const paragraph = el('p', { class: 'ex-map-link' });
    el(
        'a',
        {
            href: '/ovningar?muskel=' + encodeURIComponent(map.sel.id),
            text: 'Övningar för den här muskeln'
        },
        paragraph
    );
    const disclaimer = body.querySelector('.bm-disclaimer');
    if (disclaimer) body.insertBefore(paragraph, disclaimer);
    else body.appendChild(paragraph);
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
    if (found()) return;
    const timer = setInterval(() => {
        if (found()) clearInterval(timer);
    }, 40);
    setTimeout(() => clearInterval(timer), 3000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
