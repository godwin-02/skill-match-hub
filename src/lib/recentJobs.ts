// Tracks recently viewed jobs in localStorage (per browser, no auth needed)
const KEY = "skillsync.recentJobs";
const MAX = 8;

export function pushRecentJob(id: string) {
  try {
    const raw = localStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [id, ...list.filter((x) => x !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function getRecentJobIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function clearRecentJobs() {
  try { localStorage.removeItem(KEY); } catch {}
}
