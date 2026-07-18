import { useEffect, useState } from "react";
import type { Role } from "./types";
import { getState } from "./store";

const KEY = "aarika.session";

export type Session = { role: Role; startedAt: string } | null;

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export function getSession(): Session {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function tryLogin(passcode: string): Role | null {
  const { settings } = getState();
  let role: Role | null = null;
  if (passcode === settings.ownerPasscode) role = "owner";
  else if (passcode === settings.staffPasscode) role = "staff";
  if (role) {
    localStorage.setItem(KEY, JSON.stringify({ role, startedAt: new Date().toISOString() }));
    emit();
  }
  return role;
}

export function logout() {
  localStorage.removeItem(KEY);
  emit();
}

export function useSession(): Session {
  const [s, setS] = useState<Session>(null);
  useEffect(() => {
    setS(getSession());
    const l = () => setS(getSession());
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return s;
}
