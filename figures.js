/* Hareket animasyonları: kas haritasıyla aynı stilde, yuvarlak hatlı figürler.
   Her hareket iki pozdan (A = başlangıç, B = bitiş) oluşur; aradaki geçiş yumuşak animasyonla çizilir.
   Koordinatlar: viewBox 0 0 200 140, zemin y = 130, figür sağa bakar. Açılar derece (0 = sağ, 90 = aşağı, -90 = yukarı). */
const FIG = (() => {
  const FLOOR = 130;
  const LEN = { torso: 34, ua: 20, fa: 18, th: 24, sh: 24, ft: 9, neck: 12 };
  const C = { fig: "#c9d0df", far: "#dfe3ec", hi: "#5b7cfa", hiFar: "#a9bbfb", eq: "#9aa3b8", eqSoft: "#cfd5e2", cable: "#b4bbcc", floor: "#dde2ec" };
  const rad = d => d * Math.PI / 180;
  const dir = (a, l) => [Math.cos(rad(a)) * l, Math.sin(rad(a)) * l];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const ang = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
  const lerp = (a, b, t) => a + (b - a) * t;
  const f = n => n.toFixed(1);

  function ik(root, target, a, b, bend) {
    const dx = target[0] - root[0], dy = target[1] - root[1];
    let d = Math.hypot(dx, dy);
    d = Math.min(Math.max(d, Math.abs(a - b) + 0.01), a + b - 0.01);
    const phi = Math.atan2(dy, dx);
    const alpha = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
    const j = [root[0] + a * Math.cos(phi + bend * alpha), root[1] + a * Math.sin(phi + bend * alpha)];
    return [j, add(j, dir(ang(j, target), b))];
  }

  function limb(root, p, tKey, a1, a2, l1, l2, bend) {
    if (p[tKey]) return ik(root, p[tKey], l1, l2, bend);
    const j = add(root, dir(p[a1], l1));
    return [j, add(j, dir(p[a2], l2))];
  }

  function solve(p) {
    const J = {};
    if (p.front) {
      J.H = p.hip; J.S = add(J.H, [0, -LEN.torso]); J.head = add(J.S, [0, -LEN.neck]);
      J.SL = add(J.S, [-13, 2]); J.SR = add(J.S, [13, 2]);
      J.HL = add(J.H, [-7, 0]); J.HR = add(J.H, [7, 0]);
      [J.E, J.W] = ik(J.SL, p.hand, LEN.ua, LEN.fa, p.hb ?? 1);
      [J.E2, J.W2] = ik(J.SR, p.hand2, LEN.ua, LEN.fa, -(p.hb ?? 1));
      [J.K, J.A] = ik(J.HL, p.ankle || add(J.HL, [-2, 48]), LEN.th, LEN.sh, p.kb ?? -1);
      [J.K2, J.A2] = ik(J.HR, p.ankle2 || add(J.HR, [2, 48]), LEN.th, LEN.sh, -(p.kb ?? -1));
      return J;
    }
    J.H = p.hip; J.S = add(J.H, dir(p.torso, LEN.torso)); J.head = add(J.S, dir(p.torso + (p.head || 0), LEN.neck));
    [J.E, J.W] = limb(J.S, p, "hand", "ua", "fa", LEN.ua, LEN.fa, p.hb ?? 1);
    [J.K, J.A] = limb(J.H, p, "ankle", "th", "sh", LEN.th, LEN.sh, p.kb ?? -1);
    J.T = add(J.A, dir(p.ft ?? 0, LEN.ft));
    if (p.hand2) [J.E2, J.W2] = ik(J.S, p.hand2, LEN.ua, LEN.fa, p.hb2 ?? p.hb ?? 1);
    if (p.ankle2) { [J.K2, J.A2] = ik(J.H, p.ankle2, LEN.th, LEN.sh, p.kb2 ?? p.kb ?? -1); J.T2 = add(J.A2, dir(p.ft2 ?? p.ft ?? 0, LEN.ft)); }
    J.torsoAng = p.torso;
    return J;
  }

  // iki pozu karıştır (sayılar ve [x,y] dizileri)
  function mix(a, b, t) {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const va = a[k] ?? b[k], vb = b[k] ?? va;
      if (Array.isArray(va)) o[k] = [lerp(va[0], vb[0], t), lerp(va[1], vb[1], t)];
      else if (typeof va === "number") o[k] = lerp(va, vb, t);
      else o[k] = va;
    }
    return o;
  }

  const line = (a, b, w, c) => `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  const circ = (p, r, c, extra = "") => `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${r}" fill="${c}" ${extra}/>`;

  function pt(ref, J) {
    if (Array.isArray(ref)) return ref;
    const [name, dx = 0, dy = 0] = ref.split(/[:,]/).map((v, i) => i ? Number(v) : v);
    const base = J[name] || [0, 0];
    return [base[0] + dx, base[1] + dy];
  }

  function equip(list, J, layer) {
    let s = "";
    for (const e of list) {
      if ((e.front ? "front" : "back") !== layer) continue;
      switch (e.t) {
        case "floor": s += line([12, FLOOR + 3], [188, FLOOR + 3], 3, C.floor); break;
        case "line": s += line(pt(e.a, J), pt(e.b, J), e.w || 6, e.c === "soft" ? C.eqSoft : C.eq); break;
        case "rect": s += `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${e.r ?? 3}" fill="${e.c === "soft" ? C.eqSoft : C.eq}"/>`; break;
        case "db": { const p = pt(e.at, J); s += circ(p, e.r || 6, C.eq) + circ(p, 2.2, "#fff"); break; }
        case "plate": { const p = pt(e.at, J); s += circ(p, e.r || 11, "none", `stroke="${C.eq}" stroke-width="4"`) + circ(p, 2.5, C.eq); break; }
        case "bar": { const a = pt(e.a, J), b = pt(e.b, J); s += line(a, b, 3, C.eq) + line(add(a, [0, -7]), add(a, [0, 7]), 5, C.eq) + line(add(b, [0, -7]), add(b, [0, 7]), 5, C.eq); break; }
        case "cable": { const a = pt(e.from, J), b = pt(e.to, J); s += circ(a, 4, C.eqSoft) + line(a, b, 1.6, C.cable) + circ(b, 3, C.eq); break; }
        case "pad": { const p = pt(e.at, J); s += circ(p, e.r || 5, C.eq); break; }
        case "platform": { const a = J.A, k = J.K; const g = ang(k, a) + 90; s += line(add(a, dir(g, 12)), add(a, dir(g, -12)), 5, C.eq); break; }
        case "plateBack": { const g = J.torsoAng; const m = [lerp(J.H[0], J.S[0], .7), lerp(J.H[1], J.S[1], .7)]; const c = add(m, dir(g - 90, 9)); s += line(add(c, dir(g, 9)), add(c, dir(g, -9)), 5, C.eq); break; }
      }
    }
    return s;
  }

  function draw(ex, p) {
    const J = solve(p);
    const hi = new Set(ex.hi || []);
    const col = (k, far) => hi.has(k) ? (far ? C.hiFar : C.hi) : (far ? C.far : C.fig);
    let s = equip(ex.eq || [], J, "back");
    if (p.front) {
      s += line(J.HL, J.K, 10, col("th")) + line(J.K, J.A, 8, col("sh"));
      s += line(J.HR, J.K2, 10, col("th")) + line(J.K2, J.A2, 8, col("sh"));
      s += line(J.H, J.S, 22, col("torso"));
      s += line(J.SL, J.SR, 10, col("delt")) + line(J.HL, J.HR, 12, col("glute"));
      s += line(J.SL, J.E, 8, col("ua")) + line(J.E, J.W, 7, col("fa"));
      s += line(J.SR, J.E2, 8, col("ua")) + line(J.E2, J.W2, 7, col("fa"));
      s += circ(J.SL, 5.5, col("delt")) + circ(J.SR, 5.5, col("delt"));
      s += circ(J.head, 8.5, C.fig);
    } else {
      if (J.K2) s += line(J.H, J.K2, 11, col("th", 1)) + line(J.K2, J.A2, 9, col("sh", 1)) + line(J.A2, J.T2, 5, C.far);
      if (J.E2) s += line(J.S, J.E2, 8, col("ua", 1)) + line(J.E2, J.W2, 7, col("fa", 1));
      s += line(J.H, J.S, 15, col("torso"));
      s += circ(J.H, 7.5, col("glute"));
      s += circ(J.head, 8.5, C.fig);
      s += line(J.H, J.K, 11, col("th")) + line(J.K, J.A, 9, col("sh")) + line(J.A, J.T, 5, C.fig);
      s += circ(J.S, 6, col("delt"));
      s += line(J.S, J.E, 8, col("ua")) + line(J.E, J.W, 7, col("fa"));
    }
    s += equip(ex.eq || [], J, "front");
    return s;
  }

  const F = { t: "floor" };
  const standHip = [100, 82];
  /* ---------- hareketler ---------- */
  const EX = {
    wpushup: { hi: ["torso", "ua", "delt"], eq: [F, { t: "rect", x: 120, y: 124, w: 16, h: 6, r: 2, front: true }, { t: "plateBack", front: true }],
      A: { hip: [98, 102], torso: -28, hand: [128, 124], hb: -1, ankle: [55.6, 124.5], kb: 1, ft: 80 },
      B: { hip: [102.6, 114.9], torso: -11.6, hand: [128, 124], hb: -1, ankle: [55.6, 124.5], kb: 1, ft: 80 } },
    row_cs: { hi: ["torso", "ua", "delt"], eq: [F, { t: "line", a: [62, 116], b: [128, 64], w: 7 }, { t: "line", a: [80, 102], b: [80, 130], w: 4, c: "soft" }, { t: "line", a: [118, 72], b: [126, 130], w: 4, c: "soft" }, { t: "db", at: "W", front: true }],
      A: { hip: [79, 92], torso: -40, hand: [108, 112], hb: -1, ankle: [52, 128], kb: 1, ft: 70, head: 25 },
      B: { hip: [79, 92], torso: -40, hand: [96, 86], hb: -1, ankle: [52, 128], kb: 1, ft: 70, head: 25 } },
    incline_db: { hi: ["torso", "ua", "delt"], eq: [F, { t: "line", a: [118, 104], b: [66, 74], w: 7 }, { t: "line", a: [100, 106], b: [100, 130], w: 4, c: "soft" }, { t: "db", at: "W", front: true }],
      A: { hip: [112, 96], torso: -150, hand: [88, 62], hb: -1, ankle: [146, 128], kb: -1, ft: 0, head: 0 },
      B: { hip: [112, 96], torso: -150, hand: [86, 34], hb: -1, ankle: [146, 128], kb: -1, ft: 0 } },
    pulldown: { hi: ["torso", "ua"], eq: [F, { t: "rect", x: 82, y: 98, w: 30, h: 6 }, { t: "line", a: [97, 104], b: [97, 130], w: 4, c: "soft" }, { t: "pad", at: "K:2,-7", r: 4 }, { t: "cable", from: [104, 4], to: "W", front: true }, { t: "line", a: "W:-14,0", b: "W:14,0", w: 3, front: true }],
      A: { hip: [98, 94], torso: -100, hand: [102, 24], hb: 1, ankle: [128, 128], kb: -1 },
      B: { hip: [98, 94], torso: -104, hand: [104, 60], hb: 1, ankle: [128, 128], kb: -1 } },
    lateral: { hi: ["delt"], eq: [F, { t: "db", at: "W", front: true, r: 5 }, { t: "db", at: "W2", front: true, r: 5 }],
      A: { front: true, hip: [100, 82], hand: [84, 88], hand2: [116, 88], hb: -1 },
      B: { front: true, hip: [100, 82], hand: [52, 54], hand2: [148, 54], hb: -1 } },
    ez_curl: { hi: ["ua"], eq: [F, { t: "plate", at: "W", r: 7, front: true }],
      A: { hip: standHip, torso: -90, hand: [104, 88], hb: 1, ankle: [100, 129] },
      B: { hip: standHip, torso: -90, hand: [110, 54], hb: 1, ankle: [100, 129] } },
    pushdown: { hi: ["ua"], eq: [F, { t: "cable", from: [140, 6], to: "W", front: true }],
      A: { hip: standHip, torso: -82, hand: [118, 64], hb: 1, ankle: [100, 129] },
      B: { hip: standHip, torso: -82, hand: [112, 96], hb: 1, ankle: [100, 129] } },
    squat: { hi: ["th", "glute"], eq: [F, { t: "plate", at: "S:-7,-3", r: 10 }],
      A: { hip: standHip, torso: -90, hand: [94, 46], hb: 1, ankle: [100, 129] },
      B: { hip: [78, 106], torso: -58, hand: [92, 76], hb: 1, ankle: [100, 129] } },
    rdl: { hi: ["th", "glute"], eq: [F, { t: "plate", at: "W", r: 11, front: true }],
      A: { hip: standHip, torso: -90, hand: [102, 88], hb: 1, ankle: [100, 129] },
      B: { hip: [86, 84], torso: -18, hand: [117, 112], hb: 1, ankle: [100, 129], head: -15 } },
    leg_press: { hi: ["th", "glute"], eq: [F, { t: "line", a: [84, 112], b: [44, 76], w: 7 }, { t: "rect", x: 64, y: 108, w: 34, h: 6 }, { t: "line", a: [80, 114], b: [80, 130], w: 4, c: "soft" }, { t: "platform", front: true }],
      A: { hip: [82, 102], torso: -142, hand: [90, 104], hb: 1, ankle: [104, 82], kb: -1, ft: -40 },
      B: { hip: [82, 102], torso: -142, hand: [90, 104], hb: 1, ankle: [118, 70], kb: -1, ft: -40 } },
    leg_curl: { hi: ["th"], eq: [F, { t: "rect", x: 44, y: 101, w: 92, h: 7 }, { t: "line", a: [60, 108], b: [60, 130], w: 4, c: "soft" }, { t: "line", a: [120, 108], b: [120, 130], w: 4, c: "soft" }, { t: "pad", at: "A:0,-6", r: 5, front: true }],
      A: { hip: [84, 94], torso: 0, ua: 60, fa: 70, th: 180, sh: 180, ft: 90, head: 20 },
      B: { hip: [84, 94], torso: 0, ua: 60, fa: 70, th: 180, sh: -70, ft: 20, head: 20 } },
    calf_standing: { hi: ["sh"], eq: [F, { t: "rect", x: 96, y: 124, w: 26, h: 9 }, { t: "db", at: "W", front: true }],
      A: { hip: [100, 79], torso: -90, hand: [102, 112], hb: 1, ankle: [100, 127], ft: -18 },
      B: { hip: [100, 70], torso: -90, hand: [102, 103], hb: 1, ankle: [100, 118], ft: 48 } },
    cable_crunch: { hi: ["torso"], eq: [F, { t: "cable", from: [172, 8], to: "W", front: true }],
      A: { hip: [100, 102], torso: -78, hand: "auto", th: 90, sh: 180, ft: 180, head: 0 },
      B: { hip: [100, 102], torso: -12, th: 90, sh: 180, ft: 180, head: 30 } },
    ohp: { hi: ["delt", "ua"], eq: [F, { t: "bar", a: "W:-6,0", b: "W2:6,0", front: true }],
      A: { front: true, hip: [100, 82], hand: [80, 46], hand2: [120, 46], hb: -1 },
      B: { front: true, hip: [100, 82], hand: [86, 10], hand2: [114, 10], hb: -1 } },
    pullup: { hi: ["torso", "ua"], eq: [{ t: "line", a: [40, 18], b: [160, 18], w: 4 }],
      A: { front: true, hip: [100, 92], hand: [76, 18], hand2: [124, 18], hb: -1, ankle: [94, 136], ankle2: [106, 136] },
      B: { front: true, hip: [100, 66], hand: [76, 18], hand2: [124, 18], hb: -1, ankle: [92, 106], ankle2: [108, 106], kb: 1 } },
    db_bench: { hi: ["torso", "ua", "delt"], eq: [F, { t: "rect", x: 58, y: 103, w: 76, h: 7 }, { t: "line", a: [70, 110], b: [70, 130], w: 4, c: "soft" }, { t: "line", a: [124, 110], b: [124, 130], w: 4, c: "soft" }, { t: "db", at: "W", front: true }],
      A: { hip: [120, 96], torso: 180, hand: [88, 82], hb: 1, ankle: [150, 128], kb: -1 },
      B: { hip: [120, 96], torso: 180, hand: [86, 58], hb: 1, ankle: [150, 128], kb: -1 } },
    cable_row: { hi: ["torso", "ua"], eq: [F, { t: "rect", x: 74, y: 108, w: 34, h: 6 }, { t: "rect", x: 154, y: 96, w: 6, h: 32 }, { t: "cable", from: [172, 96], to: "W", front: true }],
      A: { hip: [90, 104], torso: -55, hand: [140, 92], hb: -1, ankle: [152, 112], kb: -1, ft: -70 },
      B: { hip: [90, 104], torso: -96, hand: [108, 92], hb: -1, ankle: [152, 112], kb: -1, ft: -70 } },
    rear_delt: { hi: ["delt", "torso"], eq: [F, { t: "pad", at: "W", r: 4, front: true }, { t: "pad", at: "W2", r: 4, front: true }],
      A: { front: true, hip: [100, 82], hand: [94, 60], hand2: [106, 60], hb: 1 },
      B: { front: true, hip: [100, 82], hand: [56, 52], hand2: [144, 52], hb: 1 } },
    incline_curl: { hi: ["ua"], eq: [F, { t: "line", a: [110, 106], b: [80, 54], w: 7 }, { t: "line", a: [104, 108], b: [104, 130], w: 4, c: "soft" }, { t: "db", at: "W", front: true }],
      A: { hip: [114, 96], torso: -124, hand: [92, 104], hb: 1, ankle: [148, 128], kb: -1 },
      B: { hip: [114, 96], torso: -124, hand: [104, 72], hb: 1, ankle: [148, 128], kb: -1 } },
    oh_tri: { hi: ["ua"], eq: [F, { t: "cable", from: [34, 44], to: "W", front: true }],
      A: { hip: standHip, torso: -68, hand: [100, 34], hb: -1, ankle: [96, 129], ankle2: [114, 129], head: 10 },
      B: { hip: standHip, torso: -68, hand: [146, 24], hb: -1, ankle: [96, 129], ankle2: [114, 129], head: 10 } },
    deadlift: { hi: ["th", "glute", "torso"], eq: [F, { t: "plate", at: "W", r: 11, front: true }],
      A: { hip: [84, 96], torso: -24, hand: [110, 119], hb: 1, ankle: [100, 129], head: -20 },
      B: { hip: standHip, torso: -90, hand: [104, 88], hb: 1, ankle: [100, 129] } },
    bss: { hi: ["th", "glute"], eq: [F, { t: "rect", x: 34, y: 100, w: 30, h: 8 }, { t: "line", a: [49, 108], b: [49, 130], w: 4, c: "soft" }, { t: "db", at: "W", front: true }],
      A: { hip: [96, 82], torso: -88, hand: [99, 116], hb: 1, ankle: [120, 129], ankle2: [56, 100], kb: -1, kb2: 1, ft2: 170 },
      B: { hip: [90, 102], torso: -84, hand: [95, 134], hb: 1, ankle: [120, 129], ankle2: [56, 100], kb: -1, kb2: 1, ft2: 170 } },
    leg_ext: { hi: ["th"], eq: [F, { t: "rect", x: 76, y: 100, w: 46, h: 6 }, { t: "line", a: [80, 106], b: [80, 130], w: 4, c: "soft" }, { t: "line", a: [72, 100], b: [76, 58], w: 7 }, { t: "pad", at: "A:3,-3", r: 5, front: true }],
      A: { hip: [94, 94], torso: -96, hand: [100, 100], hb: 1, th: 0, sh: 92, ft: 10 },
      B: { hip: [94, 94], torso: -96, hand: [100, 100], hb: 1, th: -4, sh: -6, ft: -80 } },
    seated_curl: { hi: ["th"], eq: [F, { t: "rect", x: 76, y: 100, w: 46, h: 6 }, { t: "line", a: [80, 106], b: [80, 130], w: 4, c: "soft" }, { t: "line", a: [72, 100], b: [76, 58], w: 7 }, { t: "pad", at: "A:3,5", r: 5, front: true }],
      A: { hip: [94, 94], torso: -96, hand: [100, 100], hb: 1, th: 0, sh: -4, ft: -80 },
      B: { hip: [94, 94], torso: -96, hand: [100, 100], hb: 1, th: 0, sh: 100, ft: 10 } },
    calf_seated: { hi: ["sh"], eq: [F, { t: "rect", x: 72, y: 100, w: 36, h: 6 }, { t: "line", a: [80, 106], b: [80, 130], w: 4, c: "soft" }, { t: "rect", x: 114, y: 124, w: 22, h: 8 }, { t: "pad", at: "K:-2,-7", r: 5, front: true }],
      A: { hip: [94, 94], torso: -92, hand: [116, 90], hb: 1, th: 0, sh: 90, ft: -18 },
      B: { hip: [94, 88], torso: -92, hand: [116, 84], hb: 1, th: -8, sh: 88, ft: 45 } },
    cable_fly: { hi: ["torso", "delt"], eq: [F, { t: "cable", from: [22, 40], to: "W", front: true }, { t: "cable", from: [178, 40], to: "W2", front: true }],
      A: { front: true, hip: [100, 82], hand: [56, 44], hand2: [144, 44], hb: -1 },
      B: { front: true, hip: [100, 82], hand: [96, 66], hand2: [104, 66], hb: -1 } },
    dips: { hi: ["torso", "ua"], eq: [F, { t: "line", a: [100, 70], b: [134, 70], w: 5 }, { t: "line", a: [128, 72], b: [128, 130], w: 4, c: "soft" }],
      A: { hip: [104, 66], torso: -80, hand: [112, 70], hb: 1, ankle: [92, 104], kb: 1, ft: 60 },
      B: { hip: [99, 88], torso: -74, hand: [112, 70], hb: 1, ankle: [86, 126], kb: 1, ft: 60 } },
    hip_thrust: { hi: ["glute", "th"], eq: [F, { t: "rect", x: 36, y: 92, w: 34, h: 9 }, { t: "line", a: [53, 101], b: [53, 130], w: 4, c: "soft" }, { t: "plate", at: "H:2,-11", r: 10, front: true }],
      A: { hip: [96, 116], torso: -135, hand: [98, 106], hb: 1, ankle: [128, 129], kb: -1, head: 0 },
      B: { hip: [104, 90], torso: 178, hand: [106, 80], hb: 1, ankle: [130, 129], kb: -1, head: -20 } },
    machine_press: { hi: ["torso", "ua", "delt"], eq: [F, { t: "rect", x: 78, y: 98, w: 32, h: 6 }, { t: "line", a: [92, 104], b: [92, 130], w: 4, c: "soft" }, { t: "line", a: [80, 98], b: [86, 46], w: 7 }, { t: "line", a: "W:0,-7", b: "W:0,7", w: 5, front: true }],
      A: { hip: [96, 94], torso: -96, hand: [112, 62], hb: 1, ankle: [128, 129], kb: -1 },
      B: { hip: [96, 94], torso: -96, hand: [140, 60], hb: 1, ankle: [128, 129], kb: -1 } },
    hanging_leg: { hi: ["torso", "th"], eq: [{ t: "line", a: [60, 12], b: [150, 12], w: 4 }],
      A: { hip: [100, 86], torso: -90, ua: -90, fa: -90, th: 92, sh: 90, ft: 10 },
      B: { hip: [100, 86], torso: -90, ua: -90, fa: -90, th: -4, sh: 70, ft: 0 } }
  };
  // otomatik eller: kablo crunch'ta eller başın yanında
  for (const k of ["A", "B"]) { const p = EX.cable_crunch[k]; delete p.hand; }
  EX.cable_crunch.A.ua = -40; EX.cable_crunch.A.fa = -150;
  EX.cable_crunch.B.ua = 20; EX.cable_crunch.B.fa = -80;
  EX.bench = EX.db_bench;
  EX.rope_curl = { hi: ["ua"], eq: [F, { t: "rect", x: 128, y: 120, w: 10, h: 10 }, { t: "cable", from: [133, 120], to: "W", front: true }], A: EX.ez_curl.A, B: EX.ez_curl.B };
  EX.vbar_pushdown = { hi: ["ua"], eq: [F, { t: "cable", from: [140, 6], to: "W", front: true }, { t: "line", a: "W:-4,4", b: "W:4,4", w: 3, front: true }], A: EX.pushdown.A, B: EX.pushdown.B };
  EX.db_curl = { hi: ["ua"], eq: [F, { t: "db", at: "W", front: true }], A: EX.ez_curl.A, B: EX.ez_curl.B };

  function svg(id) {
    const ex = EX[id]; if (!ex) return "";
    return `<svg viewBox="0 0 200 140" role="img" aria-label="Hareketin yapılışı" data-fig="${id}">${draw(ex, ex.A)}</svg>`;
  }

  // animasyon: A → bekle → B → bekle → A
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const CYCLE = 3200;
  function phaseT(ms) {
    const x = (ms % CYCLE) / CYCLE; // 0..1
    if (x < .15) return 0;
    if (x < .5) return ease((x - .15) / .35);
    if (x < .65) return 1;
    return 1 - ease((x - .65) / .35);
  }
  let running = false, last = 0;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function frame(ms) {
    if (ms - last > 33) {
      last = ms;
      const t = phaseT(ms);
      document.querySelectorAll("svg[data-fig]").forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -50 || r.top > innerHeight + 50) return;
        const ex = EX[el.dataset.fig];
        el.innerHTML = draw(ex, mix(ex.A, ex.B, t));
        const lab = el.parentNode.querySelector(".phase");
        if (lab) lab.textContent = t < .5 ? "Başlangıç" : "Bitiş";
      });
    }
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduce) return;
    running = true; requestAnimationFrame(frame);
  }
  return { svg, start, EX, draw, mix };
})();
