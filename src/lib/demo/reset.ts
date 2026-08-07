/**
 * Demo session state (presenter progress) and one-click demo data reset.
 * All module stores persist under the `faith-erp:` localStorage namespace and
 * re-seed themselves when their key is absent, so clearing the namespace and
 * reloading restores the pristine seeded dataset.
 */

const SESSION_KEY = "faith-erp:demo:session:v1";
const EVENT = "faith-erp:demo:changed";

export interface DemoSession {
  active: boolean;
  index: number;
  done: string[];
}

const EMPTY: DemoSession = { active: false, index: 0, done: [] };

export function readSession(): DemoSession {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<DemoSession>;
    return {
      active: !!parsed.active,
      index: typeof parsed.index === "number" ? parsed.index : 0,
      done: Array.isArray(parsed.done) ? parsed.done : [],
    };
  } catch {
    return EMPTY;
  }
}

export function writeSession(next: DemoSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

export function updateSession(patch: Partial<DemoSession>) {
  writeSession({ ...readSession(), ...patch });
}

export function subscribeSession(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}

export function endSession() {
  writeSession(EMPTY);
}

/** Restores every module to its seeded demo dataset and reloads the app. */
export function resetDemoData() {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith("faith-erp:")) keys.push(k);
  }
  keys.forEach((k) => window.localStorage.removeItem(k));
  window.setTimeout(() => window.location.reload(), 350);
}
