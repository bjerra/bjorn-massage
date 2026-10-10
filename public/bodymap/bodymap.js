/*!
 * bodymap.js — interactive trigger-point body map (vanilla JS, no dependencies)
 * Requires: bodymap-data.js (generated) + bodymap-zones.js (hand-edited) + bodymap.css
 *
 * Usage:  <div data-bodymap></div>          → auto-mounted on DOMContentLoaded
 *    or:  const map = BodyMap.mount(el, { mode: 'zones', strings: {...} });
 *         map.selectZone('lumbar'); map.selectMuscle('quadratus_lumborum');
 *         map.setMode('muscles'); map.clear();
 * Deep links: page.html#zone=lumbar  or  #muscle=quadratus_lumborum
 */
(function () {
  'use strict';

  // ── All UI text (English). Translate by passing { strings: {...} } to mount()
  //    or by defining window.BODYMAP_STRINGS before this file loads. ───────────
  var STRINGS = {
    title: 'Trigger point body map',
    modeLabel: 'Choose how to use the map',
    modeZones: 'Where does it hurt?',
    modeMuscles: 'Explore muscles',
    hintZones: 'Tap the area where you feel pain. The map shows which muscles commonly refer pain there.',
    hintMuscles: 'Tap a muscle to see its trigger points and where they typically refer pain.',
    front: 'Front',
    back: 'Back',
    frontAria: 'Body seen from the front',
    backAria: 'Body seen from the back',
    pickZone: 'Or pick an area from the list…',
    pickMuscle: 'Or pick a muscle from the list…',
    emptyZonesTitle: 'Where does it hurt?',
    emptyZonesText: 'Select a highlighted area on the body (front or back) to see which muscles may be referring pain to it.',
    emptyMusclesTitle: 'Explore muscles',
    emptyMusclesText: 'Select a muscle on the body to see its trigger points and their typical referral pattern.',
    zoneKicker: 'Pain area',
    muscleKicker: 'Muscle',
    zoneMusclesHeading: 'Muscles whose trigger points commonly refer here',
    zoneMusclesNone: 'No muscles recorded for this area yet.',
    muscleTpsHeading: 'Trigger points',
    muscleZonesHeading: 'Typical referral areas',
    muscleZonesNone: 'No referral areas recorded for this muscle yet.',
    tpShort: 'TP',
    tpUnnamed: 'Additional trigger point',
    refersTo: 'Refers to',
    sharedHeading: 'Shares this spot on the map with',
    seeMuscle: 'Explore this muscle',
    seeZone: 'Show this pain area',
    clear: 'Clear',
    showDetails: 'Details',
    clearAria: 'Clear selection',
    legendZone: 'Referral area',
    legendMuscle: 'Muscle with trigger points',
    legendTp: 'Trigger point',
    countMuscles: function (n) { return n === 1 ? '1 muscle' : n + ' muscles'; },
    sideAndView: function (v) { return v === 'front' ? 'front view' : 'back view'; },
    disclaimer: 'Referral patterns shown are typical maps from the trigger point literature (Travell & Simons). Pain can have many other causes – please see a doctor for severe, persistent or unexplained pain.',
    muscles: {
      masseter: 'Masseter',
      lateral_pterygoid: 'Pterygoideus lateralis',
      medial_pterygoid: 'Pterygoideus medialis',
      temporalis: 'Temporalis',
      sternocleidomastoideus: 'Sternocleidomastoideus',
      scaleni: 'Scaleni',
      suboccipitals: 'Suboccipitales',
      trapezius_desc: 'Trapezius pars descendens',
      trapezius_trans: 'Trapezius pars transversa',
      trapezius_asc: 'Trapezius pars ascendens',
      levator_scapulae: 'Levator scapulae',
      rhomboids: 'Rhomboidei',
      supraspinatus: 'Supraspinatus',
      infraspinatus: 'Infraspinatus',
      subscapularis: 'Subscapularis',
      teres_major: 'Teres major',
      teres_minor: 'Teres minor',
      latissimus_dorsi: 'Latissimus dorsi',
      deltoideus: 'Deltoideus',
      pectoralis_major: 'Pectoralis major',
      pectoralis_minor: 'Pectoralis minor',
      serratus_anterior: 'Serratus anterior',
      biceps_brachii: 'Biceps brachii',
      triceps_brachii: 'Triceps brachii',
      forearm_flexors: 'Flexores antebrachii',
      forearm_extensors: 'Extensores antebrachii',
      rectus_abdominis: 'Rectus abdominis',
      external_oblique: 'Obliquus externus abdominis',
      erector_spinae: 'Erector spinae',
      multifidus: 'Multifidus',
      quadratus_lumborum: 'Quadratus lumborum',
      iliopsoas: 'Iliopsoas',
      gluteus_maximus: 'Gluteus maximus',
      gluteus_medius: 'Gluteus medius',
      gluteus_minimus: 'Gluteus minimus',
      piriformis: 'Piriformis',
      tensor_fasciae_latae: 'Tensor fasciae latae',
      sartorius: 'Sartorius',
      rectus_femoris: 'Rectus femoris',
      vastus_lateralis: 'Vastus lateralis',
      vastus_medialis: 'Vastus medialis',
      adductor_longus: 'Adductor longus',
      adductor_magnus: 'Adductor magnus',
      gracilis: 'Gracilis',
      hamstrings: 'Ischiocrurales',
      gastrocnemius: 'Gastrocnemius',
      soleus: 'Soleus',
      tibialis_anterior: 'Tibialis anterior',
      peroneus_longus: 'Fibularis longus',
      peroneus_brevis: 'Fibularis brevis'
    },
    // Zone + region labels default to the data file; override here to translate.
    zones: {},
    regions: {}
  };

  var SVGNS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  function merge(base, over) {
    var out = {}, k;
    for (k in base) out[k] = base[k];
    if (over) for (k in over) {
      out[k] = (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && typeof base[k] === 'object')
        ? merge(base[k], over[k]) : over[k];
    }
    return out;
  }
  function svg(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function h(tag, attrs, parent, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k]);
    }
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function ellipseArea(s) { return s.d ? 1e9 : Math.PI * s.rx * s.ry; }

  function BodyMap(root, opts) {
    opts = opts || {};
    this.root = root;
    this.data = opts.data || window.BODYMAP_DATA;
    this.shapes = opts.zoneShapes || window.BODYMAP_ZONE_SHAPES || {};
    this.t = merge(merge(STRINGS, window.BODYMAP_STRINGS), opts.strings);
    this.id = 'bm' + (++uid);
    this.mode = opts.mode === 'muscles' ? 'muscles' : 'zones';
    this.sel = null; // { type: 'zone'|'muscle', id }
    this.focusTp = null;
    if (!this.data) { root.textContent = 'Body map data missing (bodymap-data.js).'; return; }
    this._index();
    this._build();
    this.setMode(this.mode);
    this._fromHash();
  }

  BodyMap.prototype._index = function () {
    var d = this.data, self = this;
    this.zoneById = {};
    d.zones.forEach(function (z) { self.zoneById[z.id] = z; });
    // geometry group per muscle (shared outlines) — key = primary id
    this.groupOf = {};      // muscleId -> primary id (per view irrelevant: same members)
    this.groupMembers = {}; // primary -> [ids]
    ['front', 'back'].forEach(function (v) {
      d.views[v].muscles.forEach(function (m) {
        var members = m.shared || [m.id];
        members.forEach(function (id) { self.groupOf[id] = m.id; });
        self.groupMembers[m.id] = members;
      });
    });
    this.zonesByMuscle = {};
    d.zones.forEach(function (z) {
      z.entries.forEach(function (e) {
        (self.zonesByMuscle[e.muscleId] = self.zonesByMuscle[e.muscleId] || []).push({ zone: z, tp: e.tp, location: e.location });
      });
    });
    this.allMuscles = Object.keys(d.muscleViews).sort(function (a, b) {
      return self.muscleName(a).localeCompare(self.muscleName(b));
    });
  };

  BodyMap.prototype.muscleName = function (id) { return this.t.muscles[id] || id.replace(/_/g, ' '); };
  BodyMap.prototype.zoneName = function (id) { return this.t.zones[id] || (this.zoneById[id] && this.zoneById[id].label) || id; };
  BodyMap.prototype.regionName = function (id) { return this.t.regions[id] || this.data.regionLabels[id] || id; };

  // ── DOM construction ───────────────────────────────────────────────────────
  BodyMap.prototype._build = function () {
    var self = this, t = this.t, root = this.root;
    root.classList.add('bm');
    root.innerHTML = '';

    var bar = h('div', { class: 'bm-bar' }, root);
    var seg = h('div', { class: 'bm-seg', role: 'radiogroup', 'aria-label': t.modeLabel }, bar);
    this.modeBtns = {};
    [['zones', t.modeZones], ['muscles', t.modeMuscles]].forEach(function (m) {
      var b = h('button', { type: 'button', class: 'bm-seg-btn', role: 'radio', 'data-mode': m[0] }, seg, m[1]);
      b.addEventListener('click', function () { self.setMode(m[0]); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          var next = self.mode === 'zones' ? 'muscles' : 'zones';
          self.setMode(next); self.modeBtns[next].focus();
        }
      });
      self.modeBtns[m[0]] = b;
    });
    var pickWrap = h('div', { class: 'bm-pick' }, bar);
    this.picker = h('select', { class: 'bm-select', 'aria-label': t.pickZone }, pickWrap);
    this.picker.addEventListener('change', function () {
      var v = self.picker.value; if (!v) { self.clear(); return; }
      if (self.mode === 'zones') self.selectZone(v); else self.selectMuscle(v);
    });
    this.hint = h('p', { class: 'bm-hint' }, root);

    var main = h('div', { class: 'bm-main' }, root);
    var figs = h('div', { class: 'bm-figs' }, main);
    this.svgs = {};
    this.muscleEls = { front: {}, back: {} };
    this.zoneEls = { front: {}, back: {} };
    this.tpLayer = {};
    ['front', 'back'].forEach(function (v) { self._buildView(v, h('figure', { class: 'bm-fig bm-fig-' + v }, figs)); });

    var legend = h('div', { class: 'bm-legend', 'aria-hidden': 'true' }, figs);
    [['zone', t.legendZone], ['muscle', t.legendMuscle], ['tp', t.legendTp]].forEach(function (l) {
      var s = h('span', { class: 'bm-leg bm-leg-' + l[0] }, legend); h('i', null, s); h('span', null, s, l[1]);
    });

    this.panel = h('aside', { class: 'bm-panel', 'aria-live': 'polite' }, main);
    this.tip = h('div', { class: 'bm-tip', role: 'presentation' }, root);

    // Small-screen helper: a slim sticky bar that jumps to the details panel
    this.peek = h('button', { type: 'button', class: 'bm-peekbar', 'aria-hidden': 'true', tabindex: '-1' }, root);
    this.peekText = h('span', { class: 'bm-peek-text' }, this.peek);
    h('span', { class: 'bm-peek-go' }, this.peek, t.showDetails + ' ↓');
    this.peek.addEventListener('click', function () { self.panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    this.panelVisible = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        self.panelVisible = en[0].isIntersecting; self._updatePeek();
      }, { threshold: 0.15 }).observe(this.panel);
    }

    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && self.sel) { self.clear(); } });
  };

  BodyMap.prototype._buildView = function (v, fig) {
    var self = this, d = this.data, view = d.views[v], t = this.t;
    var s = svg('svg', { viewBox: view.viewBox.join(' '), class: 'bm-svg', role: 'group', 'aria-label': v === 'front' ? t.frontAria : t.backAria, focusable: 'false' }, fig);
    h('figcaption', { class: 'bm-cap' }, fig, v === 'front' ? t.front : t.back);
    this.svgs[v] = s;
    var defs = svg('defs', null, s);
    var clipId = this.id + '-clip-' + v;
    // clip = body outline ∪ head/hair (the outline path stops at the neck/ears)
    var clip = svg('clipPath', { id: clipId }, defs);
    svg('path', { d: view.outline }, clip);
    view.landmarks.forEach(function (l) { if (l.id === 'head' || l.id === 'hair') l.paths.forEach(function (p) { svg('path', { d: p }, clip); }); });
    var f = svg('filter', { id: this.id + '-soft', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
    svg('feGaussianBlur', { stdDeviation: 5 }, f);

    svg('path', { d: view.outline, class: 'bm-outline' }, s);
    var lm = svg('g', { class: 'bm-landmarks', 'aria-hidden': 'true' }, s);
    view.landmarks.forEach(function (l) { l.paths.forEach(function (p) { svg('path', { d: p, class: 'bm-lm bm-lm-' + l.id }, lm); }); });

    var mg = svg('g', { class: 'bm-muscles' }, s);
    view.muscles.forEach(function (m) {
      var members = m.shared || [m.id];
      var label = members.map(function (id) { return self.muscleName(id); }).join(' / ');
      var g = svg('g', { class: 'bm-muscle', 'data-muscle': m.id, role: 'button', 'aria-label': label + ' (' + t.sideAndView(v) + ')' }, mg);
      svg('title', null, g).textContent = label;
      m.paths.forEach(function (p) { svg('path', { d: p }, g); });
      if (m.mirrorX) {
        var mir = svg('g', { transform: 'translate(' + m.mirrorX + ',0) scale(-1,1)' }, g);
        m.paths.forEach(function (p) { svg('path', { d: p }, mir); });
      }
      self.muscleEls[v][m.id] = g;
      self._interactive(g, 'muscle', m.id, label);
    });

    var zc = svg('g', { class: 'bm-zones', 'clip-path': 'url(#' + clipId + ')' }, s);
    var list = [];
    d.zones.forEach(function (z) {
      var sh = self.shapes[z.id];
      if (!sh || !sh[v] || !sh[v].length) return;
      list.push({ z: z, shapes: sh[v], area: sh[v].reduce(function (a, x) { return a + ellipseArea(x); }, 0) });
    });
    list.sort(function (a, b) { return b.area - a.area; }); // big first → small ones on top
    list.forEach(function (it) {
      var label = self.zoneName(it.z.id);
      var g = svg('g', { class: 'bm-zone', 'data-zone': it.z.id, role: 'button', 'aria-label': label + ' (' + t.sideAndView(v) + ')' }, zc);
      svg('title', null, g).textContent = label;
      var inner = svg('g', { class: 'bm-zone-fill' }, g);
      it.shapes.forEach(function (sp) {
        var els = [];
        els.push(shapeEl(sp, inner));
        if (sp.mirror !== false) {
          var mg2 = svg('g', { transform: 'translate(' + (2 * view.centerX) + ',0) scale(-1,1)' }, inner);
          els.push(shapeEl(sp, mg2));
        }
      });
      self.zoneEls[v][it.z.id] = g;
      self._interactive(g, 'zone', it.z.id, label);
    });

    this.tpLayer[v] = svg('g', { class: 'bm-tps', 'aria-hidden': 'true' }, s);

    if (/[?&]debug\b/.test(location.search)) {
      var dbg = svg('g', { class: 'bm-debug' }, s), vb = view.viewBox;
      for (var x = Math.ceil(vb[0] / 50) * 50; x < vb[0] + vb[2]; x += 50) {
        svg('line', { x1: x, x2: x, y1: vb[1], y2: vb[1] + vb[3] }, dbg);
        svg('text', { x: x + 2, y: vb[1] + 12 }, dbg).textContent = x;
      }
      for (var y = Math.ceil(vb[1] / 50) * 50; y < vb[1] + vb[3]; y += 50) {
        svg('line', { x1: vb[0], x2: vb[0] + vb[2], y1: y, y2: y }, dbg);
        svg('text', { x: vb[0] + 2, y: y - 2 }, dbg).textContent = y;
      }
    }
  };

  function shapeEl(sp, parent) {
    if (sp.d) return svg('path', { d: sp.d }, parent);
    return svg('ellipse', { cx: sp.cx, cy: sp.cy, rx: sp.rx, ry: sp.ry,
      transform: sp.rot ? 'rotate(' + sp.rot + ' ' + sp.cx + ' ' + sp.cy + ')' : null }, parent);
  }

  BodyMap.prototype._interactive = function (g, type, id, label) {
    var self = this;
    g.addEventListener('click', function () {
      if (type === 'zone') self.selectZone(self.sel && self.sel.type === 'zone' && self.sel.id === id ? null : id);
      else self.selectMuscle(self.sel && self.sel.type === 'muscle' && self.groupOf[self.sel.id] === id ? null : id);
    });
    g.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.dispatchEvent(new MouseEvent('click')); }
    });
    g.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') self._showTip(label, e); });
    g.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') self._moveTip(e); });
    g.addEventListener('pointerleave', function () { self._hideTip(); });
  };

  BodyMap.prototype._showTip = function (text, e) { this.tip.textContent = text; this.tip.classList.add('bm-on'); this._moveTip(e); };
  BodyMap.prototype._moveTip = function (e) {
    var r = this.root.getBoundingClientRect();
    this.tip.style.transform = 'translate(' + Math.round(e.clientX - r.left + 14) + 'px,' + Math.round(e.clientY - r.top + 16) + 'px)';
  };
  BodyMap.prototype._hideTip = function () { this.tip.classList.remove('bm-on'); };

  // ── State ─────────────────────────────────────────────────────────────────
  BodyMap.prototype.setMode = function (mode) {
    var self = this, t = this.t;
    this.mode = mode === 'muscles' ? 'muscles' : 'zones';
    this.root.setAttribute('data-mode', this.mode);
    for (var k in this.modeBtns) {
      var on = k === this.mode;
      this.modeBtns[k].setAttribute('aria-checked', on ? 'true' : 'false');
      this.modeBtns[k].tabIndex = on ? 0 : -1;
    }
    this.hint.textContent = this.mode === 'zones' ? t.hintZones : t.hintMuscles;
    // tab stops: only the active layer is focusable
    ['front', 'back'].forEach(function (v) {
      var id;
      for (id in self.zoneEls[v]) self.zoneEls[v][id].setAttribute('tabindex', self.mode === 'zones' ? '0' : '-1');
      for (id in self.muscleEls[v]) self.muscleEls[v][id].setAttribute('tabindex', self.mode === 'muscles' ? '0' : '-1');
    });
    this._fillPicker();
    if (this.sel && ((this.sel.type === 'zone') !== (this.mode === 'zones'))) this.sel = null;
    this._render();
  };

  BodyMap.prototype._fillPicker = function () {
    var self = this, p = this.picker, t = this.t;
    p.innerHTML = '';
    h('option', { value: '' }, p, this.mode === 'zones' ? t.pickZone : t.pickMuscle);
    p.setAttribute('aria-label', this.mode === 'zones' ? t.pickZone : t.pickMuscle);
    if (this.mode === 'zones') {
      var byRegion = {}, order = [];
      this.data.zones.forEach(function (z) {
        if (!byRegion[z.region]) { byRegion[z.region] = []; order.push(z.region); }
        byRegion[z.region].push(z);
      });
      order.forEach(function (r) {
        var og = h('optgroup', { label: self.regionName(r) }, p);
        byRegion[r].forEach(function (z) { h('option', { value: z.id }, og, self.zoneName(z.id)); });
      });
    } else {
      this.allMuscles.forEach(function (id) { h('option', { value: id }, p, self.muscleName(id)); });
    }
  };

  BodyMap.prototype.selectZone = function (id) {
    if (id && !this.zoneById[id]) return;
    if (this.mode !== 'zones') this.setMode('zones');
    this.sel = id ? { type: 'zone', id: id } : null; this.focusTp = null; this._render();
  };
  BodyMap.prototype.selectMuscle = function (id) {
    if (id && !this.data.muscleViews[id]) return;
    if (this.mode !== 'muscles') this.setMode('muscles');
    this.sel = id ? { type: 'muscle', id: id } : null; this.focusTp = null; this._render();
  };
  BodyMap.prototype.clear = function () { this.sel = null; this.focusTp = null; this._render(); };

  BodyMap.prototype._fromHash = function () {
    var m = /(zone|muscle)=([\w-]+)/.exec(location.hash || '');
    if (!m) return;
    if (m[1] === 'zone') this.selectZone(m[2]); else this.selectMuscle(m[2]);
  };

  // ── Rendering of the current state ─────────────────────────────────────────
  BodyMap.prototype._render = function () {
    var self = this, sel = this.sel;
    var hlMuscles = {}, hlZones = {}, tps = []; // tps: [{muscleId, tp}]
    if (sel && sel.type === 'zone') {
      this.zoneById[sel.id].entries.forEach(function (e) {
        hlMuscles[self.groupOf[e.muscleId] || e.muscleId] = true;
        var list = self.data.triggerPoints[e.muscleId] || [];
        if (list[e.tp - 1]) tps.push({ m: e.muscleId, tp: list[e.tp - 1] });
      });
      hlZones[sel.id] = 'sel';
    } else if (sel && sel.type === 'muscle') {
      hlMuscles[this.groupOf[sel.id] || sel.id] = 'sel';
      (this.zonesByMuscle[sel.id] || []).forEach(function (r) {
        if (self.focusTp == null || self.focusTp === r.tp) hlZones[r.zone.id] = 'ref';
      });
      (this.data.triggerPoints[sel.id] || []).forEach(function (tp) { tps.push({ m: sel.id, tp: tp }); });
    }
    this.root.classList.toggle('bm-has-sel', !!sel);
    ['front', 'back'].forEach(function (v) {
      var id, el;
      for (id in self.muscleEls[v]) {
        el = self.muscleEls[v][id];
        el.classList.toggle('bm-hl', !!hlMuscles[id]);
        el.classList.toggle('bm-sel', hlMuscles[id] === 'sel');
        el.setAttribute('aria-pressed', hlMuscles[id] === 'sel' ? 'true' : 'false');
      }
      for (id in self.zoneEls[v]) {
        el = self.zoneEls[v][id];
        el.classList.toggle('bm-sel', hlZones[id] === 'sel');
        el.classList.toggle('bm-ref', hlZones[id] === 'ref');
        el.setAttribute('aria-pressed', hlZones[id] === 'sel' ? 'true' : 'false');
        var fill = el.firstChild && el.firstChild.nextSibling; // after <title>
        if (fill) { if (hlZones[id] === 'ref') fill.setAttribute('filter', 'url(#' + self.id + '-soft)'); else fill.removeAttribute('filter'); }
      }
      // trigger point dots (both sides)
      var layer = self.tpLayer[v];
      while (layer.firstChild) layer.removeChild(layer.firstChild);
      tps.forEach(function (o) {
        if (o.tp.view !== v) return;
        var focus = self.focusTp != null && self.focusTp === o.tp.n && sel.type === 'muscle';
        var dim = self.focusTp != null && !focus && sel.type === 'muscle';
        [o.tp.x, o.tp.mx].forEach(function (x) {
          var g = svg('g', { class: 'bm-tp' + (focus ? ' bm-tp-focus' : '') + (dim ? ' bm-tp-dim' : ''), transform: 'translate(' + x + ' ' + o.tp.y + ')' }, layer);
          svg('circle', { r: 16, class: 'bm-tp-halo' }, g);
          svg('circle', { r: 8.5, class: 'bm-tp-dot' }, g);
        });
      });
    });
    this.picker.value = sel ? sel.id : '';
    this._renderPanel();
    this._updatePeek();
  };

  BodyMap.prototype._updatePeek = function () {
    var sel = this.sel, txt = '';
    if (sel && sel.type === 'zone') {
      var n = {}; this.zoneById[sel.id].entries.forEach(function (e) { n[e.muscleId] = 1; });
      txt = this.zoneName(sel.id) + ' · ' + this.t.countMuscles(Object.keys(n).length);
    } else if (sel) txt = this.muscleName(sel.id);
    this.peekText.textContent = txt;
    this.peek.classList.toggle('bm-on', !!sel && !this.panelVisible);
  };

  BodyMap.prototype._renderPanel = function () {
    var self = this, t = this.t, p = this.panel, sel = this.sel;
    p.innerHTML = '';
    var body = h('div', { class: 'bm-panel-body' }, p);
    if (!sel) {
      p.classList.remove('bm-panel-active');
      h('h3', { class: 'bm-panel-title' }, body, this.mode === 'zones' ? t.emptyZonesTitle : t.emptyMusclesTitle);
      h('p', { class: 'bm-muted' }, body, this.mode === 'zones' ? t.emptyZonesText : t.emptyMusclesText);
    } else if (sel.type === 'zone') {
      p.classList.add('bm-panel-active');
      var z = this.zoneById[sel.id];
      this._panelHead(body, t.zoneKicker + ' · ' + this.regionName(z.region), this.zoneName(z.id));
      h('h4', { class: 'bm-h' }, body, t.zoneMusclesHeading);
      // group entries by muscle
      var order = [], by = {};
      z.entries.forEach(function (e) { if (!by[e.muscleId]) { by[e.muscleId] = []; order.push(e.muscleId); } by[e.muscleId].push(e); });
      if (!order.length) h('p', { class: 'bm-muted' }, body, t.zoneMusclesNone);
      var ul = h('ul', { class: 'bm-list' }, body);
      order.forEach(function (mid) {
        var li = h('li', null, ul);
        var b = h('button', { type: 'button', class: 'bm-item', title: t.seeMuscle }, li);
        h('span', { class: 'bm-item-name' }, b, self.muscleName(mid));
        by[mid].forEach(function (e) {
          var r = h('span', { class: 'bm-item-sub' }, b);
          h('span', { class: 'bm-badge' }, r, t.tpShort + e.tp);
          h('span', null, r, e.location);
        });
        h('span', { class: 'bm-chev', 'aria-hidden': 'true' }, b, '›');
        b.addEventListener('click', function () { self.selectMuscle(mid); });
        b.addEventListener('mouseenter', function () { self._peekMuscle(mid, true); });
        b.addEventListener('mouseleave', function () { self._peekMuscle(mid, false); });
      });
    } else {
      p.classList.add('bm-panel-active');
      var mid = sel.id;
      this._panelHead(body, t.muscleKicker, this.muscleName(mid));
      var members = this.groupMembers[this.groupOf[mid] || mid] || [mid];
      if (members.length > 1) {
        var sh = h('div', { class: 'bm-shared' }, body);
        h('span', { class: 'bm-shared-label' }, sh, t.sharedHeading + ':');
        members.forEach(function (o) {
          var c = h('button', { type: 'button', class: 'bm-chip' + (o === mid ? ' bm-chip-on' : ''), 'aria-pressed': o === mid ? 'true' : 'false' }, sh, self.muscleName(o));
          c.addEventListener('click', function () { self.selectMuscle(o); });
        });
      }
      var tpList = this.data.triggerPoints[mid] || [];
      var refs = this.zonesByMuscle[mid] || [];
      h('h4', { class: 'bm-h' }, body, t.muscleTpsHeading);
      var ul2 = h('ul', { class: 'bm-list bm-tplist' }, body);
      tpList.forEach(function (tp) {
        var zs = refs.filter(function (r) { return r.tp === tp.n; });
        var li = h('li', null, ul2);
        var b = h('button', { type: 'button', class: 'bm-item bm-tpitem' + (self.focusTp === tp.n ? ' bm-on' : ''), 'aria-pressed': self.focusTp === tp.n ? 'true' : 'false' }, li);
        var top = h('span', { class: 'bm-item-name' }, b);
        h('span', { class: 'bm-badge' }, top, t.tpShort + tp.n);
        h('span', null, top, tp.location || t.tpUnnamed);
        if (zs.length) h('span', { class: 'bm-item-sub' }, b, t.refersTo + ': ' + zs.map(function (r) { return self.zoneName(r.zone.id); }).join(' · '));
        b.addEventListener('click', function () { self.focusTp = self.focusTp === tp.n ? null : tp.n; self._render(); });
      });
      h('h4', { class: 'bm-h' }, body, t.muscleZonesHeading);
      var seen = {}, zl = [];
      refs.forEach(function (r) { if (!seen[r.zone.id]) { seen[r.zone.id] = true; zl.push(r.zone); } });
      if (!zl.length) h('p', { class: 'bm-muted' }, body, t.muscleZonesNone);
      var ul3 = h('ul', { class: 'bm-tags' }, body);
      zl.forEach(function (z) {
        var li = h('li', null, ul3);
        var b = h('button', { type: 'button', class: 'bm-tag', title: t.seeZone }, li, self.zoneName(z.id));
        b.addEventListener('click', function () { self.selectZone(z.id); });
      });
    }
    h('p', { class: 'bm-disclaimer' }, body, t.disclaimer);
  };

  BodyMap.prototype._panelHead = function (body, kicker, title) {
    var self = this;
    var head = h('div', { class: 'bm-panel-head' }, body);
    var tt = h('div', null, head);
    h('div', { class: 'bm-kicker' }, tt, kicker);
    h('h3', { class: 'bm-panel-title' }, tt, title);
    var c = h('button', { type: 'button', class: 'bm-close', 'aria-label': this.t.clearAria, title: this.t.clear }, head, '×');
    c.addEventListener('click', function () { self.clear(); });
  };

  BodyMap.prototype._peekMuscle = function (mid, on) {
    var g = this.groupOf[mid] || mid;
    ['front', 'back'].forEach(function (v) {
      var el = this.muscleEls[v][g]; if (el) el.classList.toggle('bm-peek', on);
    }, this);
  };

  // ── Public API ────────────────────────────────────────────────────────────
  window.BodyMap = {
    strings: STRINGS,
    mount: function (el, opts) { return (el.__bodymap = new BodyMap(el, opts)); }
  };
  function auto() {
    var els = document.querySelectorAll('[data-bodymap]');
    for (var i = 0; i < els.length; i++) if (!els[i].__bodymap) window.BodyMap.mount(els[i], { mode: els[i].getAttribute('data-mode') || undefined });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
