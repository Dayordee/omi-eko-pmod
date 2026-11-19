// ==========================================
// OMI-EKO PMOD - SIGN IN, REGISTRATION AND PROFILE MENU
// ==========================================

import { setRemember } from "./supabaseClient.js";

const THEME_KEY = "omieko-theme";

// ------------------------------------------
// Helpers that do not touch the page
// ------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || "").trim());
}

export function passwordProblems(password) {
  const pw = String(password || "");
  const problems = [];

  if (pw.length < 8) problems.push("at least 8 characters");
  if (!/[A-Za-z]/.test(pw)) problems.push("a letter");
  if (!/\d/.test(pw)) problems.push("a number");

  return problems;
}

export function passwordStrength(password) {
  const pw = String(password || "");

  if (!pw) return { score: 0, label: "" };

  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;

  if (pw.length < 8) score = Math.min(score, 1);

  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];

  return { score, label: labels[score] };
}

export function friendlyError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "That email and password don't match. Check them and try again.";
  }

  if (message.includes("email not confirmed")) {
    return "Your email isn't confirmed yet. Open the confirmation email we sent and click the link.";
  }

  if (message.includes("already registered") || code === "user_already_exists") {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (
    code.includes("rate_limit") ||
    message.includes("rate limit") ||
    message.includes("too many") ||
    error?.status === 429
  ) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  if (code === "weak_password" || message.includes("password should be")) {
    return "That password is too weak. Use at least 8 characters with a letter and a number.";
  }

  if (code === "same_password" || message.includes("different from the old")) {
    return "Choose a password that is different from your current one.";
  }

  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Can't reach the server. Check your internet connection and try again.";
  }

  if (message.includes("expired")) {
    return "That link has expired. Request a new one.";
  }

  return error?.message || "Something went wrong. Please try again.";
}

export function getInitials(name, email) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  const first = String(email || "").trim()[0];
  return first ? first.toUpperCase() : "U";
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ------------------------------------------
// Icons
// ------------------------------------------

const svg = (path, size = 18) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const ICON = {
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svg('<path d="M3 3l18 18"/><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10.6 10.6 0 0 0 4.4-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  signOut: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>', 16),
  check: svg('<path d="M20 6 9 17l-5-5"/>', 14),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', 30),
};

// ------------------------------------------
// Theme (shares the saved choice with the dashboard)
// ------------------------------------------

function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Fall through to the device setting.
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function setTheme(theme, save) {
  document.documentElement.dataset.theme = theme;

  if (save) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore blocked storage.
    }
  }
}

// ------------------------------------------
// Logo (one image: public/images/logo.png)
// ------------------------------------------

const LOGO_SRC = "/images/logo.png";

const logoStrip = `<img class="logo-strip-img" src="${LOGO_SRC}" alt="Omi Eko, with project partners AFD, European Union, European Investment Bank, Lagos State and LASWA">`;

// ------------------------------------------
// Page markup
// ------------------------------------------

function heroArt() {
  return `
  <div class="auth-art" aria-hidden="true">
    <svg class="auth-network" viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke-linecap="round" stroke-width="2.5">
        <path class="route r1" d="M70 540 C 150 430, 230 470, 300 380 S 430 250, 520 190"/>
        <path class="route r2" d="M90 250 C 170 300, 210 220, 300 260 S 420 400, 540 430"/>
        <path class="route r3" d="M120 640 C 200 580, 330 600, 410 520 S 500 420, 560 330"/>
        <path class="route r4" d="M60 380 C 150 350, 190 330, 300 380"/>
      </g>
      <g class="nodes">
        <circle class="node" cx="70" cy="540" r="5"/>
        <circle class="node" cx="300" cy="380" r="6"/>
        <circle class="node" cx="520" cy="190" r="5"/>
        <circle class="node" cx="90" cy="250" r="5"/>
        <circle class="node" cx="300" cy="260" r="5"/>
        <circle class="node" cx="540" cy="430" r="6"/>
        <circle class="node" cx="120" cy="640" r="5"/>
        <circle class="node" cx="410" cy="520" r="5"/>
        <circle class="node" cx="560" cy="330" r="5"/>
        <circle class="node" cx="60" cy="380" r="5"/>
        <circle class="pulse p1" cx="300" cy="380" r="6"/>
        <circle class="pulse p2" cx="520" cy="190" r="5"/>
        <circle class="pulse p3" cx="70" cy="540" r="5"/>
      </g>
    </svg>

    <div class="auth-waves">
      <svg class="wave w1" viewBox="0 0 1600 200" preserveAspectRatio="none"><path d="M0 100 C200 40 600 160 800 100 C1000 40 1400 160 1600 100 L1600 200 L0 200 Z"/></svg>
      <svg class="wave w2" viewBox="0 0 1600 200" preserveAspectRatio="none"><path d="M0 100 C200 40 600 160 800 100 C1000 40 1400 160 1600 100 L1600 200 L0 200 Z"/></svg>
      <svg class="wave w3" viewBox="0 0 1600 200" preserveAspectRatio="none"><path d="M0 100 C200 40 600 160 800 100 C1000 40 1400 160 1600 100 L1600 200 L0 200 Z"/></svg>
    </div>
  </div>`;
}

function pageShell() {
  return `
  <div class="auth-page">

    <section class="auth-hero">
      ${heroArt()}

      <div class="auth-hero-content">
        <div class="auth-hero-logo">${logoStrip}</div>

        <div class="auth-hero-copy">
          <p class="auth-eyebrow">OMI-EKO PMOD</p>
          <h1>Lagos ferry and multimodal transport, mapped and measured.</h1>
          <p>
            Explore terminal accessibility, route suitability and the
            road, rail and BRT network behind every ferry journey.
          </p>
        </div>

        <ul class="auth-points">
          <li>${ICON.check} Ferry terminals and routes</li>
          <li>${ICON.check} Spatial suitability index</li>
          <li>${ICON.check} Roads, rail and BRT</li>
        </ul>
      </div>
    </section>

    <section class="auth-panel">

      <button type="button" class="auth-theme" id="auth-theme" aria-label="Switch to dark mode" title="Dark or light mode">
        <span class="auth-icon-moon">${ICON.moon}</span>
        <span class="auth-icon-sun">${ICON.sun}</span>
      </button>

      <div class="auth-card">

        <div class="auth-brand">${logoStrip}</div>

        <div id="auth-banner" class="auth-banner" role="status" aria-live="polite" hidden></div>

        <div id="auth-view" class="auth-view"></div>

      </div>

      <p class="auth-legal">Passenger Mobility and Multimodal Transport Platform</p>

    </section>

  </div>`;
}

function field({ id, label, type = "text", autocomplete = "", placeholder = "", password = false }) {
  return `
  <div class="auth-field" data-field="${id}">
    <label for="${id}">${label}</label>
    <div class="auth-input-wrap">
      <input id="${id}" name="${id}" type="${type}" autocomplete="${autocomplete}" placeholder="${placeholder}" aria-describedby="${id}-error" spellcheck="false">
      ${
        password
          ? `<button type="button" class="auth-eye" data-target="${id}" aria-label="Show password" aria-pressed="false">${ICON.eye}</button>`
          : ""
      }
    </div>
    <p class="auth-error" id="${id}-error" role="alert"></p>
  </div>`;
}

function submitButton(text) {
  return `
  <button type="submit" class="auth-btn" id="auth-submit">
    <span class="auth-spinner" aria-hidden="true"></span>
    <span class="auth-btn-label">${text}</span>
  </button>`;
}

function strengthMeter() {
  return `
  <div class="auth-strength" id="auth-strength" data-score="0" aria-live="polite">
    <div class="auth-strength-bars"><i></i><i></i><i></i><i></i></div>
    <span id="auth-strength-label"></span>
  </div>
  <p class="auth-hint">Use at least 8 characters with a letter and a number.</p>`;
}

const VIEWS = {
  signin: () => `
    <h2>Welcome back</h2>
    <p class="auth-sub">Sign in to open the Lagos transport dashboard.</p>

    <form id="auth-form" novalidate>
      <fieldset class="auth-fieldset">
        ${field({ id: "email", label: "Email address", type: "email", autocomplete: "email", placeholder: "you@example.com" })}
        ${field({ id: "password", label: "Password", type: "password", autocomplete: "current-password", placeholder: "Enter your password", password: true })}

        <div class="auth-row">
          <label class="auth-check">
            <input type="checkbox" id="remember" checked>
            <span>Remember me</span>
          </label>
          <button type="button" class="auth-link" data-go="forgot">Forgot password?</button>
        </div>

        ${submitButton("Sign in")}
      </fieldset>
    </form>

    <p class="auth-switch">New here? <button type="button" class="auth-link" data-go="signup">Create an account</button></p>`,

  signup: () => `
    <h2>Create your account</h2>
    <p class="auth-sub">Register to explore terminals, routes and suitability analysis.</p>

    <form id="auth-form" novalidate>
      <fieldset class="auth-fieldset">
        ${field({ id: "name", label: "Full name", autocomplete: "name", placeholder: "Your name" })}
        ${field({ id: "email", label: "Email address", type: "email", autocomplete: "email", placeholder: "you@example.com" })}
        ${field({ id: "password", label: "Password", type: "password", autocomplete: "new-password", placeholder: "Create a password", password: true })}
        ${strengthMeter()}
        ${field({ id: "confirm", label: "Confirm password", type: "password", autocomplete: "new-password", placeholder: "Repeat the password", password: true })}

        ${submitButton("Create account")}
      </fieldset>
    </form>

    <p class="auth-switch">Already registered? <button type="button" class="auth-link" data-go="signin">Sign in</button></p>`,

  forgot: () => `
    <h2>Reset your password</h2>
    <p class="auth-sub">Enter your email and we'll send you a link to choose a new password.</p>

    <form id="auth-form" novalidate>
      <fieldset class="auth-fieldset">
        ${field({ id: "email", label: "Email address", type: "email", autocomplete: "email", placeholder: "you@example.com" })}
        ${submitButton("Send reset link")}
      </fieldset>
    </form>

    <p class="auth-switch"><button type="button" class="auth-link" data-go="signin">Back to sign in</button></p>`,

  reset: () => `
    <h2>Choose a new password</h2>
    <p class="auth-sub">Pick a password you haven't used here before.</p>

    <form id="auth-form" novalidate>
      <fieldset class="auth-fieldset">
        ${field({ id: "password", label: "New password", type: "password", autocomplete: "new-password", placeholder: "New password", password: true })}
        ${strengthMeter()}
        ${field({ id: "confirm", label: "Confirm new password", type: "password", autocomplete: "new-password", placeholder: "Repeat the password", password: true })}
        ${submitButton("Update password")}
      </fieldset>
    </form>`,

  checkemail: (email) => `
    <div class="auth-sent">
      <span class="auth-sent-icon">${ICON.mail}</span>
      <h2>Check your email</h2>
      <p class="auth-sub">
        We sent a confirmation link to <strong>${esc(email)}</strong>.
        Open it to activate your account, then come back and sign in.
      </p>

      <button type="button" class="auth-btn auth-btn-ghost" id="auth-resend">
        <span class="auth-spinner" aria-hidden="true"></span>
        <span class="auth-btn-label">Resend email</span>
      </button>

      <p class="auth-switch"><button type="button" class="auth-link" data-go="signin">Back to sign in</button></p>
    </div>`,
};

// ------------------------------------------
// The sign-in screen
// ------------------------------------------

export function showAuthScreen({
  supabase,
  configured = true,
  initialView = "signin",
  notice = null,
  onAuthenticated = () => {},
}) {
  const root = document.querySelector("#app");

  setTheme(readTheme(), false);
  root.innerHTML = pageShell();

  const viewBox = root.querySelector("#auth-view");
  const banner = root.querySelector("#auth-banner");
  const themeButton = root.querySelector("#auth-theme");

  let currentView = initialView;
  let pendingEmail = "";
  let busy = false;

  // --- theme button ---

  function syncThemeButton() {
    const dark = document.documentElement.dataset.theme === "dark";
    themeButton.setAttribute(
      "aria-label",
      dark ? "Switch to light mode" : "Switch to dark mode"
    );
  }

  themeButton.addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme === "dark";
    setTheme(dark ? "light" : "dark", true);
    syncThemeButton();
  });

  syncThemeButton();

  // --- banner ---

  function showBanner(type, text) {
    banner.className = `auth-banner is-${type}`;
    banner.textContent = text;
    banner.hidden = false;
  }

  function clearBanner() {
    banner.hidden = true;
    banner.textContent = "";
  }

  // --- field helpers ---

  const input = (id) => viewBox.querySelector(`#${id}`);
  const value = (id) => input(id)?.value ?? "";

  function setFieldError(id, message) {
    const box = viewBox.querySelector(`[data-field="${id}"]`);
    const out = viewBox.querySelector(`#${id}-error`);
    const el = input(id);

    if (!box || !out || !el) return;

    out.textContent = message || "";
    box.classList.toggle("has-error", Boolean(message));
    el.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function clearErrors() {
    viewBox.querySelectorAll("[data-field]").forEach((box) => {
      setFieldError(box.dataset.field, "");
    });
  }

  function focusFirstError() {
    const bad = viewBox.querySelector(".has-error input");
    if (bad) bad.focus();
  }

  function setBusy(on, label) {
    busy = on;

    const button = viewBox.querySelector("#auth-submit");
    const fieldset = viewBox.querySelector(".auth-fieldset");

    if (fieldset) fieldset.disabled = on;

    if (button) {
      button.classList.toggle("is-loading", on);

      const text = button.querySelector(".auth-btn-label");
      if (text) {
        if (on) {
          button.dataset.label = text.textContent;
          text.textContent = label || "Please wait...";
        } else if (button.dataset.label) {
          text.textContent = button.dataset.label;
        }
      }
    }
  }

  // --- rendering ---

  function render(view, extra) {
    currentView = view;
    viewBox.innerHTML = VIEWS[view](extra);
    viewBox.classList.remove("is-entering");
    void viewBox.offsetWidth; // restart the entrance animation
    viewBox.classList.add("is-entering");

    bindCommon();

    if (!configured) {
      viewBox.querySelectorAll("input, button").forEach((el) => {
        el.disabled = true;
      });
    } else {
      const first = viewBox.querySelector("input:not([type=checkbox])");
      if (first) first.focus({ preventScroll: true });
    }
  }

  function go(view, extra) {
    if (busy) return;
    clearBanner();
    render(view, extra);
  }

  function bindCommon() {
    viewBox.querySelectorAll("[data-go]").forEach((button) => {
      button.addEventListener("click", () => go(button.dataset.go));
    });

    viewBox.querySelectorAll(".auth-eye").forEach((button) => {
      button.addEventListener("click", () => {
        const target = input(button.dataset.target);
        const show = target.type === "password";

        target.type = show ? "text" : "password";
        button.innerHTML = show ? ICON.eyeOff : ICON.eye;
        button.setAttribute("aria-pressed", String(show));
        button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      });
    });

    viewBox.querySelectorAll(".auth-input-wrap input").forEach((el) => {
      el.addEventListener("input", () => setFieldError(el.id, ""));
    });

    const strength = viewBox.querySelector("#auth-strength");
    const pw = input("password");

    if (strength && pw) {
      pw.addEventListener("input", () => {
        const result = passwordStrength(pw.value);
        strength.dataset.score = String(result.score);
        viewBox.querySelector("#auth-strength-label").textContent = result.label;
      });
    }

    const form = viewBox.querySelector("#auth-form");
    if (form) form.addEventListener("submit", onSubmit);

    const resend = viewBox.querySelector("#auth-resend");
    if (resend) resend.addEventListener("click", onResend);
  }

  // --- validation shared by the forms ---

  function checkEmail() {
    const email = value("email").trim();

    if (!email) {
      setFieldError("email", "Enter your email address.");
      return false;
    }

    if (!isValidEmail(email)) {
      setFieldError("email", "That doesn't look like a valid email address.");
      return false;
    }

    return true;
  }

  function checkNewPassword() {
    const problems = passwordProblems(value("password"));
    let ok = true;

    if (problems.length) {
      setFieldError("password", `Password needs ${problems.join(", ")}.`);
      ok = false;
    }

    if (!value("confirm")) {
      setFieldError("confirm", "Repeat the password.");
      ok = false;
    } else if (value("confirm") !== value("password")) {
      setFieldError("confirm", "The passwords don't match.");
      ok = false;
    }

    return ok;
  }

  // --- submit handlers ---

  async function onSubmit(event) {
    event.preventDefault();
    if (busy || !configured) return;

    clearBanner();
    clearErrors();

    try {
      if (currentView === "signin") await doSignIn();
      else if (currentView === "signup") await doSignUp();
      else if (currentView === "forgot") await doForgot();
      else if (currentView === "reset") await doReset();
    } catch (error) {
      setBusy(false);
      showBanner("error", friendlyError(error));
    }
  }

  async function doSignIn() {
    let ok = checkEmail();

    if (!value("password")) {
      setFieldError("password", "Enter your password.");
      ok = false;
    }

    if (!ok) return focusFirstError();

    setRemember(input("remember").checked);
    setBusy(true, "Signing in...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: value("email").trim(),
      password: value("password"),
    });

    if (error) {
      setBusy(false);
      showBanner("error", friendlyError(error));
      return;
    }

    setBusy(true, "Opening dashboard...");
    await onAuthenticated(data.session);
  }

  async function doSignUp() {
    let ok = true;

    if (value("name").trim().length < 2) {
      setFieldError("name", "Enter your full name.");
      ok = false;
    }

    if (!checkEmail()) ok = false;
    if (!checkNewPassword()) ok = false;

    if (!ok) return focusFirstError();

    const email = value("email").trim();

    setBusy(true, "Creating account...");

    const { data, error } = await supabase.auth.signUp({
      email,
      password: value("password"),
      options: {
        data: { full_name: value("name").trim() },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setBusy(false);
      showBanner("error", friendlyError(error));
      return;
    }

    if (data.session) {
      setBusy(true, "Opening dashboard...");
      await onAuthenticated(data.session);
      return;
    }

    // With email confirmation on, an address that is already registered
    // comes back without an error but with no identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setBusy(false);
      showBanner(
        "warn",
        "An account with this email may already exist. Try signing in, or reset your password."
      );
      return;
    }

    pendingEmail = email;
    setBusy(false);
    go("checkemail", email);
  }

  async function doForgot() {
    if (!checkEmail()) return focusFirstError();

    const email = value("email").trim();

    setBusy(true, "Sending link...");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    setBusy(false);

    if (error) {
      showBanner("error", friendlyError(error));
      return;
    }

    showBanner(
      "success",
      `If an account exists for ${email}, a reset link is on its way. Check your inbox and spam folder.`
    );
  }

  async function doReset() {
    if (!checkNewPassword()) return focusFirstError();

    setBusy(true, "Updating password...");

    const { error } = await supabase.auth.updateUser({
      password: value("password"),
    });

    if (error) {
      setBusy(false);
      showBanner("error", friendlyError(error));
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      setBusy(true, "Opening dashboard...");
      await onAuthenticated(session);
    } else {
      setBusy(false);
      go("signin");
      showBanner("success", "Password updated. Please sign in with your new password.");
    }
  }

  async function onResend() {
    if (busy || !pendingEmail) return;

    const button = viewBox.querySelector("#auth-resend");
    const label = button.querySelector(".auth-btn-label");

    busy = true;
    button.disabled = true;
    button.classList.add("is-loading");
    label.textContent = "Sending...";

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: { emailRedirectTo: window.location.origin },
      });

      if (error) throw error;

      showBanner("success", "Confirmation email sent again.");
    } catch (error) {
      showBanner("error", friendlyError(error));
    }

    busy = false;
    button.classList.remove("is-loading");
    label.textContent = "Resend email";

    // Short pause so the button can't be hammered.
    setTimeout(() => {
      button.disabled = false;
    }, 30000);
  }

  // --- start ---

  render(currentView);

  if (!configured) {
    showBanner(
      "warn",
      "Sign-in isn't set up yet. Add your Supabase URL and anon key to .env.local, then restart the dev server."
    );
  } else if (notice) {
    showBanner(notice.type || "info", notice.text);
  }
}

// ------------------------------------------
// Profile menu in the dashboard navigation bar
// ------------------------------------------

export function mountProfileMenu(user, onSignOut) {
  const bar = document.querySelector(".topbar-actions");
  if (!bar || !user) return;

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    String(user.email || "").split("@")[0] ||
    "Account";

  const initials = getInitials(user.user_metadata?.full_name, user.email);

  const divider = document.createElement("span");
  divider.className = "nav-divider";

  const wrap = document.createElement("div");
  wrap.className = "profile-menu";
  wrap.innerHTML = `
    <button type="button" class="profile-btn" id="profile-btn" aria-haspopup="true" aria-expanded="false" aria-label="Account menu" title="${esc(name)}">
      ${esc(initials)}
    </button>

    <div class="profile-dropdown" id="profile-dropdown" role="menu">
      <div class="profile-head">
        <span class="profile-avatar">${esc(initials)}</span>
        <div>
          <strong>${esc(name)}</strong>
          <span>${esc(user.email || "")}</span>
        </div>
      </div>
      <button type="button" class="profile-signout" id="profile-signout" role="menuitem">
        ${ICON.signOut}
        <span>Sign out</span>
      </button>
    </div>`;

  bar.append(divider, wrap);

  const button = wrap.querySelector("#profile-btn");

  function setOpen(open) {
    wrap.classList.toggle("open", open);
    button.setAttribute("aria-expanded", String(open));
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(!wrap.classList.contains("open"));
  });

  document.addEventListener("click", (event) => {
    if (!wrap.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  wrap.querySelector("#profile-signout").addEventListener("click", async () => {
    const label = wrap.querySelector("#profile-signout span");
    label.textContent = "Signing out...";
    await onSignOut();
  });
}
