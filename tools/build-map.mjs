// Builds src/js/mapdata.js from tools/geo-source.mjs.
// Usage: node tools/build-map.mjs   (needs d3-delaunay; path below or NODE_PATH)
import { Delaunay } from '/opt/npm-tools/node_modules/d3-delaunay/src/index.js';
import { BOUNDS, SEA, ISLANDS, LAKES, RIVERS, REGIONS, PROVINCES } from './geo-source.mjs';
import { writeFileSync } from 'fs';

const K = 40;                                      // map units per degree of latitude
const COS = Math.cos(((BOUNDS.latMin + BOUNDS.latMax) / 2) * Math.PI / 180);
const P = ([lon, lat]) => [+(((lon - BOUNDS.lonMin) * COS) * K).toFixed(1), +((BOUNDS.latMax - lat) * K).toFixed(1)];
const W = Math.round((BOUNDS.lonMax - BOUNDS.lonMin) * COS * K), H = Math.round((BOUNDS.latMax - BOUNDS.latMin) * K);
const path = pts => 'M' + pts.map(p => P(p).join(',')).join('L') + 'Z';
const line = pts => 'M' + pts.map(p => P(p).join(',')).join('L');

const inPoly = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
  const [xi, yi] = poly[i], [xj, yj] = poly[j];
  if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
const water = ll => (inPoly(ll, SEA) && !Object.values(ISLANDS).some(r => inPoly(ll, r))) || Object.values(LAKES).some(r => inPoly(ll, r));

// regions
const regs = REGIONS.map(([id, n, lat, lon, owner, tier]) => { const [x, y] = P([lon, lat]); return { id, n, x, y, lon, lat, owner, tier }; });
const ids = new Set(); for (const r of regs) { if (ids.has(r.id)) throw new Error('dup ' + r.id); ids.add(r.id); }
const wet = regs.filter(r => water([r.lon, r.lat]));
if (wet.length) console.warn('WARNING regions in water:', wet.map(r => r.id).join(', '));

// adjacency from Delaunay, classified as land or sea route
const del = Delaunay.from(regs.map(r => [r.x, r.y]));
const adj = []; const seen = new Set();
for (let e = 0; e < del.halfedges.length; e++) {
  const i = del.triangles[e], j = del.triangles[e % 3 === 2 ? e - 2 : e + 1];
  const k = i < j ? i + '-' + j : j + '-' + i; if (seen.has(k)) continue; seen.add(k);
  const a = regs[i], b = regs[j];
  const deg = Math.hypot((a.lon - b.lon) * COS, a.lat - b.lat);
  let wetN = 0; const N = 12;
  for (let s = 1; s < N; s++) { const t = s / N; if (water([a.lon + (b.lon - a.lon) * t, a.lat + (b.lat - a.lat) * t])) wetN++; }
  const sea = wetN / (N - 1) > 0.25;
  if (!sea && deg > 6.5) continue;                  // very long land links make no sense
  if (sea && deg > 7.5) continue;                   // nor very long sea crossings
  if (!sea && wetN > 0 && deg > 4) continue;        // land link skimming across a bay
  adj.push([a.id, b.id, sea ? 1 : 0]);
}
// manual fixes after looking at the result
const DROP = [['rome','sardi'],['corsi','genoa'],['cypr','alex'],['crete','alex'],['crete','barca'],['balea','sardi'],['mahd','sardi'],['tripo','paler'],
  ['cork','bret'],['cork','corn']];
const ADD = [['dover_fix','',0]].filter(() => false);
const key = (a, b) => [a, b].sort().join('|');
const drop = new Set(DROP.map(([a, b]) => key(a, b)));
const ADJ = adj.filter(([a, b]) => !drop.has(key(a, b))).concat(ADD);

// territory cells: Voronoi clipped to a circle around each region
const vor = del.voronoi([-200, -200, W + 200, H + 200]);
const R = 3.0 * K;
function clipCircle(poly, cx, cy) {
  const n = 20, circ = Array.from({ length: n }, (_, i) => [cx + R * Math.cos(i / n * 2 * Math.PI), cy + R * Math.sin(i / n * 2 * Math.PI)]);
  let out = poly;
  for (let i = 0; i < n; i++) {
    const A = circ[i], B = circ[(i + 1) % n], inp = out; out = [];
    const side = p => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]);
    for (let j = 0; j < inp.length; j++) {
      const P1 = inp[j], P2 = inp[(j + 1) % inp.length], s1 = side(P1), s2 = side(P2);
      if (s1 >= 0) out.push(P1);
      if ((s1 >= 0) !== (s2 >= 0)) { const t = s1 / (s1 - s2); out.push([P1[0] + (P2[0] - P1[0]) * t, P1[1] + (P2[1] - P1[1]) * t]); }
    }
    if (!out.length) break;
  }
  return out;
}
const CELLS = {};
regs.forEach((r, i) => { const poly = vor.cellPolygon(i); if (!poly) return;
  const c = clipCircle(poly.slice(0, -1), r.x, r.y); CELLS[r.id] = 'M' + c.map(p => p[0].toFixed(0) + ',' + p[1].toFixed(0)).join('L') + 'Z'; });

// provinces: every region in exactly one province
const pvOf = {};
for (const [pid, , rs] of PROVINCES) for (const r of rs) {
  if (!ids.has(r)) throw new Error('province ' + pid + ': unknown region ' + r);
  if (pvOf[r]) throw new Error('region ' + r + ' in two provinces'); pvOf[r] = pid; }
const loose = regs.filter(r => !pvOf[r.id]); if (loose.length) throw new Error('regions without a province: ' + loose.map(r => r.id));
// province borders: cell edges shared by two regions of different provinces
const edgeKey = (p, q) => { const a = p.join(','), b = q.join(','); return a < b ? a + '|' + b : b + '|' + a; };
const edges = new Map();
for (const r of regs) { const d = CELLS[r.id]; if (!d) continue;
  const pts = d.slice(1, -1).split('L').map(s => s.split(',').map(Number));
  for (let i = 0; i < pts.length; i++) { const k = edgeKey(pts[i], pts[(i + 1) % pts.length]);
    if (!edges.has(k)) edges.set(k, []); edges.get(k).push(r.id); } }
let border = '';
for (const [k, rs] of edges) if (rs.length === 2 && pvOf[rs[0]] !== pvOf[rs[1]]) { const [a, b] = k.split('|'); border += 'M' + a + 'L' + b; }

const out = `// GENERATED by tools/build-map.mjs from tools/geo-source.mjs — do not edit by hand.
export const MAP_W=${W}, MAP_H=${H};
export const SEA_PATH=${JSON.stringify(path(SEA))};
export const ISLAND_PATHS=${JSON.stringify(Object.values(ISLANDS).map(path))};
export const LAKE_PATHS=${JSON.stringify(Object.values(LAKES).map(path))};
export const RIVER_PATHS=${JSON.stringify(Object.values(RIVERS).map(line))};
// [id, name, x, y, owner, tier]
export const REGION_DEF=${JSON.stringify(regs.map(r => [r.id, r.n, r.x, r.y, r.owner, r.tier]))};
// [a, b, sea]
export const ADJ_DEF=${JSON.stringify(ADJ)};
export const CELLS=${JSON.stringify(CELLS)};
// [id, name, [regions]] — the first region is the provincial capital
export const PROVINCE_DEF=${JSON.stringify(PROVINCES)};
export const PROVINCE_BORDERS=${JSON.stringify(border)};
`;
writeFileSync(new URL('../src/js/mapdata.js', import.meta.url), out);
console.log(`provinces ${PROVINCES.length}, sizes ${[1,2,3,4].map(n=>n+':'+PROVINCES.filter(p=>p[2].length===n).length).join(' ')}`);
console.log(`map ${W}x${H}, regions ${regs.length}, links ${ADJ.length} (sea ${ADJ.filter(a => a[2]).length}), file ${(out.length / 1024).toFixed(0)} KB`);
// connectivity check
const g = new Map(regs.map(r => [r.id, []])); ADJ.forEach(([a, b]) => { g.get(a).push(b); g.get(b).push(a); });
const iso = regs.filter(r => !g.get(r.id).length); if (iso.length) console.warn('isolated:', iso.map(r => r.id));
const vis = new Set(['kiev']); const q = ['kiev']; while (q.length) for (const n of g.get(q.shift())) if (!vis.has(n)) { vis.add(n); q.push(n); }
if (vis.size !== regs.length) console.warn('unreachable from Kiev:', regs.filter(r => !vis.has(r.id)).map(r => r.id));
