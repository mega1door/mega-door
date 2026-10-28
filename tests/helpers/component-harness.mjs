/** Small deterministic hook/JSX harness; all module imports are supplied explicitly. */
export function componentHarness() {
  const slots = [];
  let cursor = 0, effects = [];
  const effect = (callback, deps) => {
    const index = cursor++;
    const previous = slots[index];
    if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps?.[i]))) {
      effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: callback() }; });
    }
  };
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useEffect: effect, useLayoutEffect: effect,
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  return { hooks, jsxRuntime: { jsx, jsxs: jsx }, render(Component, props = {}) {
    cursor = 0; effects = []; const tree = Component(props); effects.forEach(run => run()); return tree;
  } };
}

export function nodes(value, predicate, found = []) {
  if (Array.isArray(value)) value.forEach(child => nodes(child, predicate, found));
  else if (value && typeof value === "object") { if (predicate(value)) found.push(value); nodes(value.props?.children, predicate, found); }
  return found;
}

export function text(value) {
  if (Array.isArray(value)) return value.map(text).join("");
  if (value && typeof value === "object") return text(value.props?.children);
  return value == null || typeof value === "boolean" ? "" : String(value);
}
