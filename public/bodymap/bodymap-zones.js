/*
 * bodymap-zones.js — hand-editable SHAPES of the 30 referral zones.
 * ---------------------------------------------------------------------------
 * Coordinates use the same system as the body paths (from the iOS app):
 *   front view: x 0–724, y 0–1448   (body centre line x ≈ 364)
 *   back view:  x 724–1448, y 0–1448 (body centre line x ≈ 1083.5)
 * The silhouette is drawn facing the viewer, so in the FRONT view the
 * image-right half is the person's LEFT side; in the BACK view image-right is
 * the person's RIGHT side.
 *
 * Each zone id (must match referralZones.ts) maps to { front: [...], back: [...] }.
 * Every list item is one shape:
 *   { cx, cy, rx, ry, rot }  → ellipse (rot = rotation in degrees, clockwise)
 *   { d: "M … Z" }           → any SVG path
 * Shapes are drawn on the image-RIGHT side and automatically mirrored to the
 * other side about the body centre line. Add  mirror: false  for a shape that
 * already straddles the midline (spine, abdomen, back of head …).
 * Everything is clipped to the body outline, so shapes may overhang the edge.
 * Smaller zones are drawn on top of larger ones so they stay tappable.
 *
 * Tip: open index.html?debug in a browser to see the coordinate grid.
 */
window.BODYMAP_ZONE_SHAPES = {
  // ── Head / face / neck ───────────────────────────────────────────────────
  head_temporal:       { front: [{ cx: 405, cy: 160, rx: 13, ry: 22, rot: 8 }] },
  head_eye:            { front: [{ cx: 387, cy: 178, rx: 14, ry: 9 }] },
  face_jaw:            { front: [{ cx: 392, cy: 218, rx: 16, ry: 25, rot: -8 }] },
  head_occipital:      { back:  [{ cx: 1084, cy: 188, rx: 44, ry: 22, mirror: false }] },
  neck_posterior:      { back:  [{ cx: 1084, cy: 252, rx: 30, ry: 36, mirror: false }] },
  neck_lateral:        { front: [{ cx: 393, cy: 268, rx: 11, ry: 28, rot: -18 }] },

  // ── Shoulder / arm / hand ────────────────────────────────────────────────
  shoulder_anterior:   { front: [{ cx: 478, cy: 340, rx: 27, ry: 38, rot: -10 }] },
  shoulder_posterior:  { back:  [{ cx: 1198, cy: 330, rx: 42, ry: 34, rot: 10 }] },
  arm_anterior:        { front: [{ cx: 524, cy: 450, rx: 19, ry: 50, rot: -22 }] },
  arm_posterior:       { back:  [{ cx: 1238, cy: 462, rx: 22, ry: 66, rot: -20 }] },
  elbow_anterior:      { front: [{ cx: 538, cy: 510, rx: 22, ry: 18, rot: -25 }] },
  elbow_posterior:     { back:  [{ cx: 1272, cy: 535, rx: 21, ry: 21 }] },
  wrist_hand_anterior: { front: [{ cx: 610, cy: 742, rx: 40, ry: 78, rot: -25 }] },
  wrist_hand_posterior:{ back:  [{ cx: 1330, cy: 742, rx: 40, ry: 78, rot: -25 }] },

  // ── Trunk ────────────────────────────────────────────────────────────────
  chest:               { front: [{ cx: 408, cy: 378, rx: 50, ry: 50 }] },
  abdomen_region:      { front: [{ cx: 364, cy: 565, rx: 70, ry: 95, mirror: false }] },
  scapula_medial:      { back:  [{ cx: 1124, cy: 352, rx: 17, ry: 52, rot: -6 }] },
  thoracic_spine:      { back:  [{ cx: 1084, cy: 425, rx: 26, ry: 90, mirror: false }] },
  lumbar:              { back:  [{ cx: 1084, cy: 585, rx: 62, ry: 48, mirror: false }] },
  sacral_gluteal:      { back:  [{ cx: 1128, cy: 700, rx: 48, ry: 56, rot: -8 }] },

  // ── Hip / leg / foot ─────────────────────────────────────────────────────
  hip_lateral:         { back:  [{ cx: 1200, cy: 718, rx: 22, ry: 46 }],
                         front: [{ cx: 482, cy: 718, rx: 22, ry: 46 }] },
  groin_inner_thigh:   { front: [{ cx: 397, cy: 775, rx: 24, ry: 72, rot: -6 }] },
  thigh_anterior:      { front: [{ cx: 452, cy: 805, rx: 32, ry: 118, rot: 6 }] },
  thigh_posterior:     { back:  [{ cx: 1160, cy: 865, rx: 38, ry: 112, rot: -4 }] },
  knee_anterior:       { front: [{ cx: 440, cy: 982, rx: 27, ry: 33 }] },
  knee_posterior:      { back:  [{ cx: 1160, cy: 985, rx: 30, ry: 26 }] },
  lower_leg_anterior:  { front: [{ cx: 452, cy: 1105, rx: 20, ry: 92, rot: 3 }] },
  lower_leg_posterior: { back:  [{ cx: 1160, cy: 1122, rx: 34, ry: 108 }] },
  foot_ankle_anterior: { front: [{ cx: 442, cy: 1295, rx: 34, ry: 56 }] },
  foot_ankle_posterior:{ back:  [{ cx: 1161, cy: 1305, rx: 24, ry: 30 }] },
};
