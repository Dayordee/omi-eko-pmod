// Entry point. Shows the sign-in gate first, then loads the dashboard (main.js).
import { requireAuth, authConfigured, getCurrentUser, signOut } from "./auth.js";

const app = document.querySelector("#app");

function addAccountControls() {
  const nav = document.querySelector(".topbar-actions");
  if (!nav || !authConfigured) return;

  const user = getCurrentUser();
  const meta = user?.user_metadata || {};
  const label = (meta.full_name || user?.email || "Account").split(/\s+/)[0];

  const divider = document.createElement("span");
  divider.className = "nav-divider";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "nav-btn";
  button.id = "signout-btn";
  button.title = user?.email ? `Signed in as ${user.email}. Click to sign out.` : "Sign out";
  button.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg><span></span>';
  button.querySelector("span").textContent = `Sign out (${label})`;
  button.addEventListener("click", signOut);

  nav.append(divider, button);
}

(async () => {
  await requireAuth(app);
  await import("./main.js");
  addAccountControls();
})();
