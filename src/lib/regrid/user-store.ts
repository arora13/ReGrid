export interface UserActivity {
  id: string;
  type: "search" | "analysis" | "optimize";
  text: string;
  score?: number;
  createdAt: number;
}

export interface RegridUser {
  email: string;
  password: string;
  provider?: "local" | "google";
  displayName?: string;
  createdAt: number;
  activity: UserActivity[];
}

const USERS_KEY = "regrid:users:v1";
const SESSION_KEY = "regrid:session:v1";

function loadUsers(): RegridUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RegridUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users: RegridUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSessionEmail(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function logoutUser() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function loginOrSignup(
  email: string,
  password: string,
): { ok: true } | { ok: false; message: string } {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return { ok: false, message: "Use a valid email." };
  if (password.length < 4) return { ok: false, message: "Password must be at least 4 chars." };

  const users = loadUsers();
  const existing = users.find((u) => u.email === normalized);
  if (existing) {
    if (existing.password !== password)
      return { ok: false, message: "Wrong password for this email." };
    localStorage.setItem(SESSION_KEY, normalized);
    return { ok: true };
  }

  users.push({
    email: normalized,
    password,
    provider: "local",
    createdAt: Date.now(),
    activity: [],
  });
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, normalized);
  return { ok: true };
}

export function loginWithGoogle(
  email: string,
  displayName?: string,
): { ok: true } | { ok: false; message: string } {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return { ok: false, message: "Google account email missing." };
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === normalized);
  if (idx >= 0) {
    users[idx].provider = "google";
    users[idx].displayName = displayName ?? users[idx].displayName;
  } else {
    users.push({
      email: normalized,
      password: "",
      provider: "google",
      displayName,
      createdAt: Date.now(),
      activity: [],
    });
  }
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, normalized);
  return { ok: true };
}

export function getUserActivity(email: string): UserActivity[] {
  const user = loadUsers().find((u) => u.email === email.trim().toLowerCase());
  return user?.activity ?? [];
}

export function addUserActivity(email: string, item: Omit<UserActivity, "id" | "createdAt">) {
  const normalized = email.trim().toLowerCase();
  const users = loadUsers();
  const idx = users.findIndex((u) => u.email === normalized);
  if (idx < 0) return;
  const next: UserActivity = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const existing = users[idx].activity ?? [];
  users[idx].activity = [next, ...existing].slice(0, 40);
  saveUsers(users);
}
