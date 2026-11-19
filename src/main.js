import "./auth.css";
import { supabase, isConfigured } from "./supabaseClient.js";
import { showAuthScreen, mountProfileMenu } from "./auth.js";

// Read the address before Supabase clears it: reset-password and
// confirmation links arrive with details in the part after "#".

const startHash = window.location.hash || "";
let recoveryMode = /type=recovery/.test(startHash);

const errorMatch = startHash.match(/error_description=([^&]+)/);
const linkError = errorMatch
  ? decodeURIComponent(errorMatch[1].replace(/\+/g, " "))
  : null;

let dashboardStarted = false;

async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch {
    // Reloading below clears the screen either way.
  }

  window.location.reload();
}

function openAuth(options) {
  showAuthScreen({
    supabase,
    configured: isConfigured,
    onAuthenticated: enterDashboard,
    ...options,
  });
}

// The map application only loads after a valid session exists.

async function enterDashboard(session) {
  if (dashboardStarted || !session) return;
  dashboardStarted = true;

  try {
    await import("./dashboard.js");
    mountProfileMenu(session.user, signOut);
  } catch (error) {
    console.error("Dashboard failed to load:", error);
    dashboardStarted = false;

    openAuth({
      initialView: "signin",
      notice: {
        type: "error",
        text: "The dashboard could not be loaded. Refresh the page and try again.",
      },
    });
  }
}

async function start() {
  if (!isConfigured) {
    openAuth({ initialView: "signin" });
    return;
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      recoveryMode = true;
      openAuth({ initialView: "reset" });
      return;
    }

    if (event === "SIGNED_IN" && session && !recoveryMode) {
      enterDashboard(session);
    }

    if (event === "SIGNED_OUT" && dashboardStarted) {
      window.location.reload();
    }
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (startHash) {
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
  }

  if (recoveryMode) {
    openAuth({ initialView: "reset" });
    return;
  }

  if (session) {
    await enterDashboard(session);
    return;
  }

  openAuth({
    initialView: "signin",
    notice: linkError ? { type: "error", text: linkError } : null,
  });
}

start();
