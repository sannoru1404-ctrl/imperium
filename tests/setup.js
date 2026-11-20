// Minimal fake browser environment so game modules can run in Node.
const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) });
const el = () => ({
  style: {}, innerHTML: '', textContent: '', clientWidth: 400, clientHeight: 700, disabled: false,
  appendChild() {}, remove() {}, addEventListener() {}, setPointerCapture() {}, setAttribute() {},
  classList: { toggle() {}, add() {}, remove() {} },
  querySelector: () => el(), getContext: () => ctx2d,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 700 }),
});
const els = {};
globalThis.document = { getElementById: id => els[id] || (els[id] = el()), querySelector: () => null, createElement: el };
globalThis.window = globalThis;
globalThis.devicePixelRatio = 2;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
};
// Run timers instantly so AI "pauses" don't slow tests down.
globalThis.setTimeout = (f, _ms, ...a) => { queueMicrotask(() => f(...a)); return 0; };
// Frame loop is driven manually by tests via globalThis.__raf
globalThis.requestAnimationFrame = f => { globalThis.__raf = f; return 1; };
globalThis.cancelAnimationFrame = () => {};
export const elements = els;
