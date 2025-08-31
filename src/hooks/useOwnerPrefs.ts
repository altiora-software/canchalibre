const KEY = "owner:prefs:v1";
type Prefs = { lastComplexId?: string; dashboardTab?: string; dateFrom?: string; dateTo?: string; };

function read(): Prefs { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
function write(p: Prefs) { localStorage.setItem(KEY, JSON.stringify(p)); }

export function useOwnerPrefs() {
  const get = () => read();
  const set = (patch: Partial<Prefs>) => write({ ...read(), ...patch });
  const clear = () => localStorage.removeItem(KEY);
  return { get, set, clear };
}
