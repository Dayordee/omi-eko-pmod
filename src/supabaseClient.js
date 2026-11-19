import { createClient } from "@supabase/supabase-js";

// The two values below come from your .env.local file (never hard-code them).
// The anon key is designed to be public; Row Level Security protects the data.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const REMEMBER_KEY = "omieko-remember";

function looksValid(value, mustBeUrl) {
  if (!value || String(value).includes("PASTE_") || String(value).includes("YOUR-")) {
    return false;
  }

  if (!mustBeUrl) return true;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export const isConfigured = looksValid(url, true) && looksValid(key, false);

// "Remember me" ticked  -> the session is kept in localStorage (survives closing the browser).
// "Remember me" cleared -> the session lives in sessionStorage (ends when the browser closes).

export function setRemember(remember) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  } catch {
    // Storage blocked: the session will simply not persist.
  }
}

function wantsRemember() {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

const memory = new Map();

function safe(action, fallback) {
  try {
    return action();
  } catch {
    return fallback;
  }
}

const hybridStorage = {
  getItem(name) {
    const found =
      safe(() => sessionStorage.getItem(name), null) ??
      safe(() => localStorage.getItem(name), null);

    return found ?? memory.get(name) ?? null;
  },

  setItem(name, value) {
    memory.set(name, value);

    const keep = wantsRemember();
    const primary = keep ? localStorage : sessionStorage;
    const other = keep ? sessionStorage : localStorage;

    safe(() => primary.setItem(name, value));
    safe(() => other.removeItem(name));
  },

  removeItem(name) {
    memory.delete(name);
    safe(() => sessionStorage.removeItem(name));
    safe(() => localStorage.removeItem(name));
  },
};

export const supabase = isConfigured
  ? createClient(url, key, {
      auth: {
        storage: hybridStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
