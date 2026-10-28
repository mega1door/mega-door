export type LoadStatus = "loading" | "ready" | "error";

/** Shared read state for models/categories: no seeded records on loading or failure. */
export function createRemoteCollection<T>(load: () => Promise<T[]>) {
  let state: { items: T[]; status: LoadStatus } = { items: [], status: "loading" };
  const listeners = new Set<() => void>();
  let pending: Promise<void> | undefined;
  function update(items: T[], status: LoadStatus) {
    state = { items, status };
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh(): Promise<void> {
      if (pending) return pending;
      update(state.items, "loading");
      pending = (async () => {
        try { update(await load(), "ready"); }
        catch { update(state.items, "error"); }
        finally { pending = undefined; }
      })();
      return pending;
    },
  };
}
